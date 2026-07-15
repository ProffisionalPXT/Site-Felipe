"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatBRL, formatDateLongBR } from "@/lib/format";

type AthleteReg = {
  id: string;
  full_name: string;
  cpf_masked: string;
  category: string;
  shirt_size: string;
  status: string;
  status_label: string;
  payment_method: string | null;
  amount_cents: number;
  amount_label: string;
  created_at: string;
  event_name: string;
  event_date: string;
  location: string;
  city: string;
  has_receipt: boolean;
  can_pay?: boolean;
};

type Session = { cpf: string; password: string };
const SESSION_KEY = "athlete_session";

export default function AtletaPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [regs, setRegs] = useState<AthleteReg[] | null>(null);
  const [cpfMasked, setCpfMasked] = useState("");
  const [selected, setSelected] = useState<AthleteReg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  async function doLogin(cpf: string, password: string) {
    setError(null);
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
      setCpfMasked(data.cpf_masked || "");
      setSelected(list.length === 1 ? list[0] : null);
      const sess = { cpf: cpf.replace(/\D/g, ""), password };
      setSession(sess);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      } catch {
        /* */
      }
    } catch (err) {
      setSession(null);
      setRegs(null);
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoggingIn(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Session;
        if (s.cpf && s.password) {
          void doLogin(s.cpf, s.password);
          return;
        }
      }
    } catch {
      /* */
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    void doLogin(String(fd.get("cpf") || ""), String(fd.get("password") || ""));
  }

  function logout() {
    setSession(null);
    setRegs(null);
    setSelected(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* */
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-background text-foreground">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 pb-16">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao evento
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">
          Meu ingresso
        </h1>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Acesso só para quem <strong className="text-foreground">já se inscreveu</strong>:
          CPF + senha criados na inscrição. Quem não cadastrou não entra.
        </p>

        {loading && <p className="mt-8 text-muted">Carregando…</p>}

        {!loading && !session && (
          <form
            onSubmit={onLogin}
            className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm"
          >
            <label className="block">
              <span className="text-sm font-medium">CPF</span>
              <input
                name="cpf"
                required
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-border bg-card-2 px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Senha de acesso</span>
              <input
                name="password"
                type="password"
                required
                minLength={4}
                className="mt-1.5 w-full rounded-xl border border-border bg-card-2 px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
              />
            </label>
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loggingIn ? "Entrando…" : "Entrar"}
            </button>
            <p className="text-center text-xs text-muted">
              Ainda não tem inscrição?{" "}
              <Link href="/inscrever" className="text-brand-soft underline">
                Fazer inscrição
              </Link>
            </p>
          </form>
        )}

        {!loading && session && regs && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <p className="text-muted">
                CPF {cpfMasked}
                {regs[0] && (
                  <>
                    {" · "}
                    <span className="text-foreground font-medium">
                      {regs[0].full_name}
                    </span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={logout}
                className="text-xs underline text-muted hover:text-foreground"
              >
                Sair
              </button>
            </div>

            {regs.length === 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
                Nenhuma inscrição.{" "}
                <Link href="/inscrever" className="underline text-brand-soft">
                  Inscrever-se
                </Link>
              </div>
            )}

            {regs.length > 1 && !selected && (
              <div className="space-y-3">
                <p className="text-sm text-muted">Escolha uma inscrição:</p>
                {regs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(r)}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left hover:border-brand/50"
                  >
                    <p className="font-bold">{r.event_name}</p>
                    <p className="text-xs text-muted">
                      {r.category} · {r.status_label}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <>
                {regs.length > 1 && (
                  <button
                    type="button"
                    className="text-sm text-muted"
                    onClick={() => setSelected(null)}
                  >
                    ← Outras inscrições
                  </button>
                )}
                <ReceiptCard reg={selected} />
                <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                  {selected.can_pay !== false &&
                    selected.status === "pending" && (
                      <Link
                        href="/comprar"
                        className="flex-1 inline-flex justify-center rounded-xl bg-brand py-3 font-bold text-white"
                      >
                        Comprar / pagar
                      </Link>
                    )}
                  {selected.has_receipt && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
                    >
                      Imprimir comprovante
                    </button>
                  )}
                </div>
              </>
            )}

            {regs.length === 1 && !selected && regs[0] && (
              <>
                <ReceiptCard reg={regs[0]} />
                <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                  {regs[0].status === "pending" && (
                    <Link
                      href="/comprar"
                      className="flex-1 inline-flex justify-center rounded-xl bg-brand py-3 font-bold text-white"
                    >
                      Comprar / pagar
                    </Link>
                  )}
                  {regs[0].has_receipt && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold"
                    >
                      Imprimir comprovante
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ReceiptCard({ reg }: { reg: AthleteReg }) {
  const methodLabel =
    reg.payment_method === "pix"
      ? "Pix"
      : reg.payment_method === "card"
        ? "Cartão"
        : reg.payment_method || "—";
  const paid = reg.status === "paid";

  return (
    <article className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-lg print:shadow-none">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            {paid ? "Comprovante" : "Inscrição"}
          </p>
          <h2 className="text-xl font-black mt-1">{reg.event_name}</h2>
        </div>
        <span
          className={
            paid
              ? "rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300"
              : "rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-200"
          }
        >
          {reg.status_label}
        </span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label="Atleta" value={reg.full_name} />
        <Row label="CPF" value={reg.cpf_masked} />
        <Row
          label="Data do evento"
          value={reg.event_date ? formatDateLongBR(reg.event_date) : "—"}
        />
        <Row
          label="Local"
          value={[reg.location, reg.city].filter(Boolean).join(" · ") || "—"}
        />
        <Row label="Categoria" value={reg.category} />
        <Row label="Camiseta" value={reg.shirt_size} />
        <Row label="Valor" value={reg.amount_label || formatBRL(reg.amount_cents)} />
        <Row label="Pagamento" value={methodLabel} />
      </dl>
      <div className="mt-5 rounded-xl bg-card-2 border border-border px-3 py-2">
        <p className="text-[10px] uppercase text-muted">Código</p>
        <p className="font-mono text-xs break-all mt-0.5">{reg.id}</p>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
