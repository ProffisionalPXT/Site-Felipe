"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
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

type Session = { cpf: string; password: string };
const SESSION_KEY = "athlete_session";

/**
 * Comprar ingresso (sem aba no menu).
 * Logado: só categoria, tamanho e forma de pagamento.
 * Não logado: CPF + senha (só quem se inscreveu).
 */
export default function ComprarPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [regs, setRegs] = useState<AthleteReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptCard, setAcceptCard] = useState(true);
  const [cardFeePercent, setCardFeePercent] = useState(5);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [shirtSize, setShirtSize] = useState("");

  const loginWith = useCallback(async (cpf: string, password: string) => {
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/atleta/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, password }),
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
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      } catch {
        /* */
      }
    } catch (e) {
      setSession(null);
      setRegs([]);
      setLoginError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoggingIn(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/event")
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
      .finally(() => {
        try {
          const raw = sessionStorage.getItem(SESSION_KEY);
          if (raw) {
            const s = JSON.parse(raw) as Session;
            if (s.cpf && s.password) {
              void loginWith(s.cpf, s.password);
              return;
            }
          }
        } catch {
          /* */
        }
        setLoading(false);
      });
  }, [loginWith]);

  async function onLoginForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await loginWith(String(fd.get("cpf") || ""), String(fd.get("password") || ""));
  }

  function logout() {
    setSession(null);
    setRegs([]);
    setSelectedId(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* */
    }
  }

  const selected = regs.find((r) => r.id === selectedId) || null;
  const base =
    selected?.amount_cents ?? event?.price_cents ?? 0;
  const cardTotal = applyCardFeeCents(base, cardFeePercent);
  const payTotal = payMethod === "card" ? cardTotal : base;

  async function startPay() {
    if (!selected?.can_pay || !session) return;
    setPaying(true);
    setPayError(null);
    try {
      // Atualiza categoria e tamanho antes de pagar
      const up = await fetch(`/api/inscricoes/${selected.id}/pay-options`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: session.cpf,
          password: session.password,
          category,
          shirt_size: shirtSize,
        }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Não foi possível salvar opções");

      const payRes = await fetch("/api/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: selected.id,
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
          id: selected.id,
          method: payMethod,
          amount: String(payData.amount_cents ?? payTotal),
        });
        router.push(`/pagar?${qs.toString()}`);
        return;
      }

      router.push(
        `/confirmacao?id=${selected.id}&status=pending&method=${payMethod}`
      );
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Erro no pagamento");
      setPaying(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 pb-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao evento
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">
          Comprar ingresso
        </h1>
        <p className="text-sm text-muted mt-1">
          {session
            ? "Escolha categoria, tamanho e forma de pagamento."
            : "Entre com CPF e senha da inscrição. Quem não se cadastrou não acessa."}
        </p>

        {loading && <p className="mt-8 text-muted">Carregando…</p>}

        {/* —— Não logado: só login —— */}
        {!loading && !session && (
          <form
            onSubmit={onLoginForm}
            className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <p className="text-sm font-bold">Entrar</p>
            <label className="block text-sm">
              <span className="font-medium">CPF</span>
              <input
                name="cpf"
                required
                placeholder="000.000.000-00"
                className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Senha de acesso</span>
              <input
                name="password"
                type="password"
                required
                minLength={4}
                className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
              />
            </label>
            {loginError && (
              <p className="text-sm text-red-400 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white disabled:opacity-60"
            >
              {loggingIn ? "Entrando…" : "Continuar"}
            </button>
            <p className="text-center text-xs text-muted">
              Ainda não se inscreveu?{" "}
              <Link href="/inscrever" className="text-brand-soft underline">
                Fazer inscrição
              </Link>
            </p>
          </form>
        )}

        {/* —— Logado: só categoria, tamanho e pagamento —— */}
        {!loading && session && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                <span className="text-foreground font-medium">
                  {regs[0]?.full_name || "Atleta"}
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
                Nenhuma inscrição.{" "}
                <Link href="/inscrever" className="underline text-brand-soft">
                  Fazer inscrição
                </Link>
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
                <p className="text-sm text-muted">
                  {selected.event_name} · {selected.category}
                </p>
                <Link
                  href="/atleta"
                  className="inline-flex text-sm text-brand-soft underline"
                >
                  Ver em Meu ingresso
                </Link>
              </div>
            )}

            {selected?.can_pay && event && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <p className="text-xs uppercase text-muted font-semibold">
                  Opções do ingresso
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Categoria
                  </label>
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
                        <p className="text-sm text-brand-soft mt-1">
                          {formatBRL(base)}
                        </p>
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
                            <span className="text-xs text-muted">
                              {" "}
                              (+{cardFeePercent}%)
                            </span>
                          )}
                        </p>
                      </button>
                    )}
                  </div>
                </div>

                {payError && (
                  <p className="text-sm text-red-400">{payError}</p>
                )}

                <button
                  type="button"
                  disabled={paying || (!acceptPix && !acceptCard)}
                  onClick={() => void startPay()}
                  className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {paying
                    ? "Abrindo pagamento…"
                    : `Pagar · ${formatBRL(payTotal)}`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
