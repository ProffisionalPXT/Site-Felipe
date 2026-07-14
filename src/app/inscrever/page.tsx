"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatBRL, formatDateBR } from "@/lib/format";
import { applyCardFeeCents } from "@/lib/payment-settings";
import type { EventPublic } from "@/lib/types";

type PayMethod = "pix" | "card";

export default function InscreverPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptCard, setAcceptCard] = useState(true);
  const [cardFeePercent, setCardFeePercent] = useState(5);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    percent: number;
    original: number;
    discount: number;
    final: number;
    label: string;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/event")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro");
        setEvent(data.event);
        const pixOk = data.payment?.accept_pix !== false;
        const cardOk = data.payment?.accept_card !== false;
        setAcceptPix(pixOk);
        setAcceptCard(cardOk);
        const fee =
          typeof data.payment?.card_fee_percent === "number"
            ? data.payment.card_fee_percent
            : 5;
        setCardFeePercent(fee);
        if (!pixOk && cardOk) setPayMethod("card");
        else if (pixOk) setPayMethod("pix");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      full_name: String(fd.get("full_name") || ""),
      cpf: String(fd.get("cpf") || ""),
      birth_date: String(fd.get("birth_date") || "") || null,
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      shirt_size: String(fd.get("shirt_size") || ""),
      category: String(fd.get("category") || ""),
      payment_method: payMethod,
      coupon_code: couponApplied?.code || couponInput.trim() || null,
    };

    try {
      const res = await fetch("/api/inscricoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na inscrição");

      const regId = data.registration.id as string;

      // Tenta Mercado Pago real (quando configurado)
      const payRes = await fetch("/api/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: regId,
          payment_method: payMethod,
        }),
      });
      const payData = await payRes.json();

      if (payRes.ok && (payData.init_point || payData.sandbox_init_point)) {
        const url = payData.init_point || payData.sandbox_init_point;
        window.location.href = url;
        return;
      }

      const finalPrice =
        data.pricing?.final_cents ??
        couponApplied?.final ??
        event?.price_cents ??
        0;

      // Demo / sem MP: tela de pagamento simulada
      if (payData.demo || payData.manual || !payRes.ok) {
        const qs = new URLSearchParams({
          id: regId,
          method: payMethod,
          amount: String(finalPrice),
        });
        if (data.pricing?.coupon_code) {
          qs.set("coupon", String(data.pricing.coupon_code));
          qs.set("discount", String(data.pricing.discount_cents || 0));
          qs.set("original", String(data.pricing.original_cents || finalPrice));
        }
        router.push(`/pagar?${qs.toString()}`);
        return;
      }

      router.push(`/confirmacao?id=${regId}&status=pending&method=${payMethod}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao inscrever");
      setSubmitting(false);
    }
  }

  async function applyCoupon() {
    if (!event) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput,
          price_cents: event.price_cents,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCouponApplied(null);
        throw new Error(data.error || "Cupom inválido");
      }
      setCouponApplied({
        code: data.code,
        percent: data.discount_percent,
        original: data.original_cents,
        discount: data.discount_cents,
        final: data.final_cents,
        label: data.label,
      });
      setCouponMsg(`Cupom ${data.code} aplicado: ${data.discount_percent}% off`);
    } catch (e) {
      setCouponMsg(e instanceof Error ? e.message : "Erro no cupom");
    } finally {
      setCouponBusy(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 pb-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao evento
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Inscrição</h1>
        <p className="text-sm text-muted mt-1">
          Preencha os dados do atleta e escolha a forma de pagamento. Já se
          inscreveu?{" "}
          <Link href="/atleta" className="text-brand-soft underline font-medium">
            Consulte pelo CPF
          </Link>
          .
        </p>

        {loading && <p className="mt-8 text-muted">Carregando…</p>}
        {error && (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            {error}
          </p>
        )}

        {event && (
          <>
            {(() => {
              const base = couponApplied?.final ?? event.price_cents;
              const cardTotal = applyCardFeeCents(base, cardFeePercent);
              const cardExtra = cardTotal - base;
              const payTotal = payMethod === "card" ? cardTotal : base;
              return (
            <>
            <div className="mt-6 rounded-2xl border border-border bg-card p-4 flex gap-4">
              {event.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.cover_image_url}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-card-2 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold truncate">{event.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {formatDateBR(event.event_date)} · {event.start_time}
                </p>
                <p className="text-brand-soft font-bold mt-1">
                  {formatBRL(payTotal)}
                  {payMethod === "card" && cardFeePercent > 0 && (
                    <span className="text-xs font-normal text-muted ml-1">
                      (com taxa cartão)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {event.slots_remaining} vagas restantes
                </p>
              </div>
            </div>

            {!event.registration_open || event.slots_remaining <= 0 ? (
              <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                Não é possível se inscrever no momento.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Nome completo" name="full_name" required />
                <Field label="CPF" name="cpf" required placeholder="000.000.000-00" />
                <Field label="Data de nascimento" name="birth_date" type="date" />
                <Field
                  label="WhatsApp"
                  name="phone"
                  required
                  placeholder="(00) 00000-0000"
                />
                <Field label="E-mail" name="email" type="email" required />

                <div>
                  <label className="block text-sm font-medium mb-1.5">Categoria</label>
                  <select
                    name="category"
                    required
                    defaultValue={event.categories[0] || ""}
                    className="w-full rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    {event.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Tamanho da camiseta
                  </label>
                  <select
                    name="shirt_size"
                    required
                    defaultValue={
                      event.shirt_sizes.includes("M") ? "M" : event.shirt_sizes[0]
                    }
                    className="w-full rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    {event.shirt_sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cupom de desconto (lojas parceiras) */}
                <div className="rounded-2xl border border-border bg-card-2/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Cupom de desconto</p>
                  <p className="text-xs text-muted">
                    Tem código da loja parceira? Ex.: MODAPRAIA10
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponApplied(null);
                        setCouponMsg(null);
                      }}
                      placeholder="MODAPRAIA10"
                      className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <button
                      type="button"
                      disabled={couponBusy || !couponInput.trim()}
                      onClick={() => void applyCoupon()}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
                    >
                      {couponBusy ? "…" : "Aplicar"}
                    </button>
                  </div>
                  {couponMsg && (
                    <p
                      className={
                        couponApplied
                          ? "text-xs text-emerald-400"
                          : "text-xs text-red-400"
                      }
                    >
                      {couponMsg}
                    </p>
                  )}
                  {couponApplied && (
                    <div className="text-sm space-y-0.5 pt-1">
                      <p className="text-muted line-through">
                        De {formatBRL(couponApplied.original)}
                      </p>
                      <p className="text-brand-soft font-bold text-lg">
                        Por {formatBRL(couponApplied.final)}{" "}
                        <span className="text-xs font-normal text-muted">
                          (−{couponApplied.percent}%)
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Forma de pagamento (conforme o organizador liberou no admin) */}
                <div>
                  <p className="block text-sm font-medium mb-2">
                    Forma de pagamento *
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {acceptPix && (
                      <PayCard
                        selected={payMethod === "pix"}
                        onClick={() => setPayMethod("pix")}
                        title="Pix"
                        subtitle={formatBRL(base)}
                        icon="⚡"
                      />
                    )}
                    {acceptCard && (
                      <PayCard
                        selected={payMethod === "card"}
                        onClick={() => setPayMethod("card")}
                        title="Cartão"
                        subtitle={
                          cardFeePercent > 0
                            ? `${formatBRL(cardTotal)} (+${cardFeePercent}%)`
                            : formatBRL(cardTotal)
                        }
                        icon="💳"
                      />
                    )}
                  </div>
                  {!acceptPix && !acceptCard && (
                    <p className="mt-2 text-sm text-red-400">
                      Formas de pagamento indisponíveis. Fale com o organizador.
                    </p>
                  )}
                  {(acceptPix || acceptCard) && (
                    <p className="mt-2 text-xs text-muted">
                      {payMethod === "pix"
                        ? "Você verá o QR Code / código Pix na próxima tela."
                        : cardFeePercent > 0
                          ? `Cartão inclui taxa de ${cardFeePercent}% (R$ ${(cardExtra / 100).toFixed(2).replace(".", ",")} a mais).`
                          : "Você preenche os dados do cartão na próxima tela."}
                    </p>
                  )}
                  {payMethod === "card" && cardFeePercent > 0 && (
                    <div className="mt-3 rounded-xl border border-border bg-card-2/40 px-3 py-2 text-sm space-y-0.5">
                      <p className="flex justify-between text-muted">
                        <span>Ingresso</span>
                        <span>{formatBRL(base)}</span>
                      </p>
                      <p className="flex justify-between text-muted">
                        <span>Taxa cartão ({cardFeePercent}%)</span>
                        <span>{formatBRL(cardExtra)}</span>
                      </p>
                      <p className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                        <span>Total no cartão</span>
                        <span className="text-brand-soft">{formatBRL(cardTotal)}</span>
                      </p>
                    </div>
                  )}
                </div>

                {formError && (
                  <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60 transition"
                >
                  {submitting
                    ? "Processando…"
                    : payMethod === "pix"
                      ? `Pagar com Pix · ${formatBRL(base)}`
                      : `Pagar com cartão · ${formatBRL(cardTotal)}`}
                </button>
              </form>
            )}
          </>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}

function PayCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-2xl border-2 border-brand bg-brand/10 p-4 text-left transition"
          : "rounded-2xl border border-border bg-card p-4 text-left hover:border-slate-500 transition"
      }
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-2 font-bold">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
      {selected && (
        <p className="mt-2 text-[11px] font-semibold text-brand-soft">Selecionado</p>
      )}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>
  );
}
