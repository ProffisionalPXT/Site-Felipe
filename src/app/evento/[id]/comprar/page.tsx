"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ATHLETE_SESSION_KEY,
  clearTimedSession,
  loadTimedSession,
  saveTimedSession,
  touchTimedSession,
} from "@/lib/client-session";
import { formatBRL } from "@/lib/format";
import { applyCardFeeCents } from "@/lib/payment-settings";
import type { EventPublic } from "@/lib/types";

type PayMethod = "pix" | "card";

type AthleteReg = {
  id: string;
  full_name: string;
  category: string;
  shirt_size: string;
  status: string;
  status_label: string;
  amount_cents: number;
  amount_label: string;
  can_pay: boolean;
  has_receipt: boolean;
  event_name: string;
};

type AthleteSession = { cpf: string; password: string; exp?: number };

export default function ComprarPageWrapper() {
  return (
    <Suspense>
      <ComprarContent />
    </Suspense>
  );
}

function ComprarContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [session, setSession] = useState<AthleteSession | null>(null);
  const [regs, setRegs] = useState<AthleteReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptCard, setAcceptCard] = useState(true);
  const [cardFeePercent, setCardFeePercent] = useState(5);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  
  const [couponInput, setCouponInput] = useState("");
  const [couponVal, setCouponVal] = useState<{ ok: boolean; error?: string; code?: string; final_cents?: number; label?: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const loginWith = useCallback(async (cpf: string, password: string) => {
    const res = await fetch("/api/atleta/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, cpf, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no acesso");
    const list = (data.registrations || []) as AthleteReg[];
    setRegs(list);
    const pending = list.find((r) => r.can_pay) || list[0];
    setSelectedId(pending?.id || null);
    if (pending) {
      setCategory(pending.category || "");
      setShirtSize(pending.shirt_size || "");
    }
    const sess = { cpf: cpf.replace(/\D/g, ""), password };
    setSession(sess);
    saveTimedSession(ATHLETE_SESSION_KEY, sess);
    return list;
  }, [eventId]);

  async function applyCoupon() {
    if (!couponInput) {
      setCouponVal(null);
      return;
    }
    setApplyingCoupon(true);
    setCouponVal(null);
    try {
      const selected = regs.find((r) => r.id === selectedId) || null;
      const p = selected?.amount_cents ?? event?.price_cents ?? 0;
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, price_cents: p }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Cupom inválido");
      setCouponVal({ ok: true, code: data.code, final_cents: data.final_cents, label: data.label });
    } catch (err) {
      setCouponVal({ ok: false, error: err instanceof Error ? err.message : "Erro no cupom" });
    } finally {
      setApplyingCoupon(false);
    }
  }

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/event?id=${eventId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.event) {
          setEvent(d.event);
          setCategory(d.event.categories?.[0] || "");
          setShirtSize(
            d.event.shirt_sizes?.includes("M")
              ? "M"
              : d.event.shirt_sizes?.[0] || ""
          );
        }
        const pixOk = d.payment?.accept_pix !== false;
        const cardOk = d.payment?.accept_card !== false;
        setAcceptPix(pixOk);
        setAcceptCard(cardOk);
        setCardFeePercent(
          typeof d.payment?.card_fee_percent === "number"
            ? d.payment.card_fee_percent
            : 5
        );
        if (!pixOk && cardOk) setPayMethod("card");
      })
      .catch(() => {})
      .finally(async () => {
        const saved = loadTimedSession<AthleteSession>(ATHLETE_SESSION_KEY);
        if (saved?.cpf && saved?.password) {
          try {
            await loginWith(saved.cpf, saved.password);
          } catch {
            clearTimedSession(ATHLETE_SESSION_KEY);
            setSession(null);
          }
        }
        setLoading(false);
      });
  }, [eventId, loginWith]);

  function logout() {
    setSession(null);
    setRegs([]);
    setSelectedId(null);
    clearTimedSession(ATHLETE_SESSION_KEY);
  }

  const selected = regs.find((r) => r.id === selectedId) || null;
  const base = couponVal?.ok ? couponVal.final_cents! : (selected?.amount_cents ?? event?.price_cents ?? 0);
  const cardTotal = applyCardFeeCents(base, cardFeePercent);
  const payTotal = payMethod === "card" ? cardTotal : base;

  async function runPayment(registrationId: string) {
    const payRes = await fetch("/api/pagamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registration_id: registrationId,
        payment_method: payMethod,
      }),
    });
    const payData = await payRes.json();

    if (payRes.ok && (payData.init_point || payData.sandbox_init_point)) {
      window.location.href = payData.init_point || payData.sandbox_init_point;
      return;
    }

    if (payData.demo || payData.manual || !payRes.ok) {
      const qs = new URLSearchParams({
        id: registrationId,
        method: payMethod,
        amount: String(payData.amount_cents ?? payTotal),
      });
      router.push(`/pagar?${qs.toString()}`);
      return;
    }

    router.push(
      `/evento/${eventId}/confirmacao?id=${registrationId}&status=pending&method=${payMethod}`
    );
  }

  async function startPayLogged() {
    if (!selected?.can_pay || !session) return;
    setPaying(true);
    setPayError(null);
    try {
      touchTimedSession(ATHLETE_SESSION_KEY);
      const up = await fetch(`/api/inscricoes/${selected.id}/pay-options`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: session.cpf,
          password: session.password,
          category,
          shirt_size: shirtSize,
          coupon_code: couponVal?.ok ? couponVal.code : undefined,
        }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Não foi possível salvar opções");
      await runPayment(selected.id);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erro no pagamento");
      setPaying(false);
    }
  }

  async function onGuestSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    setPayError(null);
    setGuestSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const cpfRaw = String(fd.get("cpf") || "");
    const password = cpfRaw.replace(/\D/g, "");
    const payload = {
      event_id: eventId,
      full_name: String(fd.get("full_name") || ""),
      cpf: String(fd.get("cpf") || ""),
      birth_date: String(fd.get("birth_date") || "") || null,
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      shirt_size: shirtSize,
      category,
      access_password: password,
      coupon_code: couponVal?.ok ? couponVal.code : undefined,
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
      const cpfDigits = payload.cpf.replace(/\D/g, "");
      saveTimedSession(ATHLETE_SESSION_KEY, {
        cpf: cpfDigits,
        password,
      });
      setSession({ cpf: cpfDigits, password });

      await runPayment(regId);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Erro");
      setGuestSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 pb-16">
        <Link href={`/evento/${eventId}`} className="text-sm text-muted hover:text-foreground">
          ← Voltar ao evento
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">
          Comprar ingresso
        </h1>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          {session
            ? "Você já está logado: escolha modalidade, camisa e pagamento."
            : "Preencha todos os dados e pague. Se já tem inscrição, entre em Meu ingresso."}
        </p>

        {loading && <p className="mt-8 text-muted">Carregando…</p>}

        {!loading && session && event && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                Logado ·{" "}
                <span className="text-foreground font-medium">
                  {regs[0]?.full_name || "Atleta"}
                </span>
                <span className="text-xs text-muted block sm:inline sm:ml-1">
                  (sessão 6h)
                </span>
              </p>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-muted underline hover:text-foreground"
              >
                Sair
              </button>
            </div>

            {regs.length === 0 && (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                Nenhuma inscrição. Use o formulário completo abaixo após sair.
              </p>
            )}

            {regs.length > 1 && (
              <label className="block text-sm">
                <span className="font-medium">Inscrição</span>
                <select
                  value={selectedId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedId(id);
                    const r = regs.find((x) => x.id === id);
                    if (r) {
                      setCategory(r.category);
                      setShirtSize(r.shirt_size);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-3"
                >
                  {regs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.category} · {r.status_label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selected && !selected.can_pay && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                <p className="font-bold text-emerald-400">
                  {selected.has_receipt ? "Já está pago" : selected.status_label}
                </p>
                <Link href={`/evento/${eventId}/atleta`} className="text-sm text-brand-soft underline">
                  Ver em Meu ingresso
                </Link>
              </div>
            )}

            {selected?.can_pay && (
              <ExistingRegForm
                event={event}
                category={category}
                setCategory={setCategory}
                shirtSize={shirtSize}
                setShirtSize={setShirtSize}
                payMethod={payMethod}
                setPayMethod={setPayMethod}
                acceptPix={acceptPix}
                acceptCard={acceptCard}
                base={base}
                cardTotal={cardTotal}
                cardFeePercent={cardFeePercent}
                payTotal={payTotal}
                paying={paying}
                payError={payError}
                onPay={startPayLogged}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                applyCoupon={applyCoupon}
                applyingCoupon={applyingCoupon}
                couponVal={couponVal}
              />
            )}
          </div>
        )}

        {!loading && !session && event && (
          <form
            onSubmit={onGuestSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-sm font-bold text-white">Dados da inscrição</p>

            <Field label="Nome completo" name="full_name" required />
            <Field
              label="CPF"
              name="cpf"
              required
              placeholder="000.000.000-00"
            />
            <Field label="Data de nascimento" name="birth_date" type="date" />
            <Field
              label="WhatsApp"
              name="phone"
              required
              placeholder="(00) 00000-0000"
            />
            <Field label="E-mail" name="email" type="email" required />

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Modalidade / categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card-2 px-3 py-3"
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
                value={shirtSize}
                onChange={(e) => setShirtSize(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card-2 px-3 py-3"
              >
                {event.shirt_sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <CouponSection
              couponInput={couponInput}
              setCouponInput={setCouponInput}
              applyCoupon={applyCoupon}
              applyingCoupon={applyingCoupon}
              couponVal={couponVal}
            />

            <PayMethodOnly
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              acceptPix={acceptPix}
              acceptCard={acceptCard}
              base={base}
              cardTotal={cardTotal}
              cardFeePercent={cardFeePercent}
            />

            {payError && (
              <p className="text-sm text-red-400 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                {payError}
              </p>
            )}

            <button
              type="submit"
              disabled={guestSubmitting || (!acceptPix && !acceptCard)}
              className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-60"
            >
              {guestSubmitting
                ? "Processando…"
                : `Confirmar e pagar · ${formatBRL(
                    payMethod === "card"
                      ? applyCardFeeCents(base, cardFeePercent)
                      : base
                  )}`}
            </button>

            <p className="text-center text-xs text-muted">
              Já tem inscrição?{" "}
              <Link href={`/evento/${eventId}/atleta`} className="text-brand-soft underline">
                Meu ingresso (login)
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function ExistingRegForm({
  event,
  category,
  setCategory,
  shirtSize,
  setShirtSize,
  payMethod,
  setPayMethod,
  acceptPix,
  acceptCard,
  base,
  cardTotal,
  cardFeePercent,
  payTotal,
  paying,
  payError,
  onPay,
  couponInput,
  setCouponInput,
  applyCoupon,
  applyingCoupon,
  couponVal,
}: {
  event: EventPublic;
  category: string;
  setCategory: (v: string) => void;
  shirtSize: string;
  setShirtSize: (v: string) => void;
  payMethod: PayMethod;
  setPayMethod: (v: PayMethod) => void;
  acceptPix: boolean;
  acceptCard: boolean;
  base: number;
  cardTotal: number;
  cardFeePercent: number;
  payTotal: number;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  applyingCoupon: boolean;
  couponVal: { ok: boolean; error?: string; label?: string; code?: string; final_cents?: number } | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs uppercase text-muted font-semibold">
        Modalidade, camisa e pagamento
      </p>

      <div>
        <label className="block text-sm font-medium mb-1.5">Modalidade</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-border bg-card-2 px-3 py-3"
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
          value={shirtSize}
          onChange={(e) => setShirtSize(e.target.value)}
          className="w-full rounded-xl border border-border bg-card-2 px-3 py-3"
        >
          {event.shirt_sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <CouponSection
        couponInput={couponInput}
        setCouponInput={setCouponInput}
        applyCoupon={applyCoupon}
        applyingCoupon={applyingCoupon}
        couponVal={couponVal}
      />

      <PayMethodOnly
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        acceptPix={acceptPix}
        acceptCard={acceptCard}
        base={base}
        cardTotal={cardTotal}
        cardFeePercent={cardFeePercent}
      />

      {payError && <p className="text-sm text-red-400">{payError}</p>}

      <button
        type="button"
        disabled={paying || (!acceptPix && !acceptCard)}
        onClick={onPay}
        className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {paying ? "Abrindo pagamento…" : `Pagar · ${formatBRL(payTotal)}`}
      </button>
    </div>
  );
}

function PayMethodOnly({
  payMethod,
  setPayMethod,
  acceptPix,
  acceptCard,
  base,
  cardTotal,
  cardFeePercent,
}: {
  payMethod: PayMethod;
  setPayMethod: (v: PayMethod) => void;
  acceptPix: boolean;
  acceptCard: boolean;
  base: number;
  cardTotal: number;
  cardFeePercent: number;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Forma de pagamento</p>
      <div className="grid grid-cols-2 gap-3">
        {acceptPix && (
          <button
            type="button"
            onClick={() => setPayMethod("pix")}
            className={
              payMethod === "pix"
                ? "rounded-2xl border-2 border-brand bg-brand/10 p-4 text-left"
                : "rounded-2xl border border-border p-4 text-left"
            }
          >
            <p className="font-bold">Pix</p>
            <p className="text-sm text-brand-soft mt-1">{formatBRL(base)}</p>
          </button>
        )}
        {acceptCard && (
          <button
            type="button"
            onClick={() => setPayMethod("card")}
            className={
              payMethod === "card"
                ? "rounded-2xl border-2 border-brand bg-brand/10 p-4 text-left"
                : "rounded-2xl border border-border p-4 text-left"
            }
          >
            <p className="font-bold">Cartão</p>
            <p className="text-sm text-brand-soft mt-1">
              {formatBRL(cardTotal)}
              {cardFeePercent > 0 && (
                <span className="text-xs text-muted"> (+{cardFeePercent}%)</span>
              )}
            </p>
          </button>
        )}
      </div>
    </div>
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
        type={type}
        name={name}
        id={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card-2 px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>
  );
}

function CouponSection({
  couponInput,
  setCouponInput,
  applyCoupon,
  applyingCoupon,
  couponVal,
}: {
  couponInput: string;
  setCouponInput: (v: string) => void;
  applyCoupon: () => void;
  applyingCoupon: boolean;
  couponVal: { ok: boolean; error?: string; label?: string } | null;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">Cupom de desconto</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value)}
          placeholder="Ex: PROMO10"
          className="flex-1 rounded-xl border border-border bg-card-2 px-3 py-3 uppercase"
        />
        <button
          type="button"
          onClick={applyCoupon}
          disabled={applyingCoupon || !couponInput}
          className="rounded-xl bg-white/10 px-4 py-3 font-medium hover:bg-white/20 disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
      {couponVal && (
        <p className={`mt-2 text-sm ${couponVal.ok ? "text-green-400" : "text-red-400"}`}>
          {couponVal.ok ? couponVal.label : couponVal.error}
        </p>
      )}
    </div>
  );
}
