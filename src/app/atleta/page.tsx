"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatBRL, formatDateBR, formatDateLongBR } from "@/lib/format";

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
};

export default function AtletaPage() {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regs, setRegs] = useState<AthleteReg[] | null>(null);
  const [cpfMasked, setCpfMasked] = useState("");
  const [selected, setSelected] = useState<AthleteReg | null>(null);

  async function onConsult(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRegs(null);
    setSelected(null);
    setLoading(true);
    try {
      const res = await fetch("/api/atleta/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na consulta");
      setCpfMasked(data.cpf_masked || "");
      setRegs(data.registrations || []);
      if ((data.registrations || []).length === 1) {
        setSelected(data.registrations[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
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
          Área do atleta
        </h1>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Sem criar conta: digite o <strong className="text-foreground">CPF</strong>{" "}
          usado na inscrição para ver o status e o comprovante de pagamento.
          Ainda não se inscreveu?{" "}
          <Link href="/inscrever" className="text-brand-soft underline font-medium">
            Ir para Inscrição
          </Link>
          .
        </p>

        <form
          onSubmit={onConsult}
          className="mt-6 rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium">CPF da inscrição</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-border bg-card-2 px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
              required
            />
          </label>
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Consultando…" : "Consultar inscrição"}
          </button>
        </form>

        {regs && regs.length === 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
            <p className="font-semibold">Nenhuma inscrição encontrada</p>
            <p className="text-muted mt-1">
              Confira o CPF ou faça a inscrição em{" "}
              <Link href="/inscrever" className="text-brand-soft underline">
                Comprar ingresso
              </Link>
              .
            </p>
          </div>
        )}

        {regs && regs.length > 1 && !selected && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">
              CPF {cpfMasked} · {regs.length} inscrições. Escolha uma:
            </p>
            {regs.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left hover:border-brand/50 transition"
              >
                <p className="font-bold">{r.event_name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {r.category} · {r.status_label}
                </p>
                <p className="text-sm font-semibold text-brand-soft mt-1">
                  {r.amount_label}
                </p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-6 space-y-4">
            {regs && regs.length > 1 && (
              <button
                type="button"
                className="text-sm text-muted hover:text-foreground"
                onClick={() => setSelected(null)}
              >
                ← Outras inscrições deste CPF
              </button>
            )}

            <ReceiptCard reg={selected} />

            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
              {selected.has_receipt && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 rounded-xl bg-brand py-3 font-bold text-white hover:bg-brand-dark"
                >
                  Imprimir / salvar PDF
                </button>
              )}
              {selected.status === "pending" && (
                <Link
                  href={`/pagar?id=${selected.id}&method=${selected.payment_method === "card" ? "card" : "pix"}&amount=${selected.amount_cents}`}
                  className="flex-1 inline-flex justify-center rounded-xl border border-border py-3 text-sm font-semibold hover:bg-white/5"
                >
                  Ir ao pagamento
                </Link>
              )}
              <Link
                href="/"
                className="flex-1 inline-flex justify-center rounded-xl border border-border py-3 text-sm font-semibold hover:bg-white/5"
              >
                Site do evento
              </Link>
            </div>
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
    <article
      className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-lg print:shadow-none print:border-black"
      id="comprovante-atleta"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            {paid ? "Comprovante de inscrição" : "Consulta de inscrição"}
          </p>
          <h2 className="text-xl font-black mt-1 leading-tight">
            {reg.event_name}
          </h2>
        </div>
        <span
          className={
            paid
              ? "shrink-0 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300"
              : reg.status === "pending"
                ? "shrink-0 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-200"
                : "shrink-0 rounded-full bg-white/10 border border-border px-3 py-1 text-xs font-bold text-muted"
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
          value={
            reg.event_date
              ? formatDateLongBR(reg.event_date)
              : "—"
          }
        />
        <Row
          label="Local"
          value={[reg.location, reg.city].filter(Boolean).join(" · ") || "—"}
        />
        <Row label="Categoria" value={reg.category} />
        <Row label="Camiseta" value={reg.shirt_size} />
        <Row label="Valor" value={reg.amount_label || formatBRL(reg.amount_cents)} />
        <Row label="Forma de pagamento" value={methodLabel} />
        <Row
          label="Inscrito em"
          value={
            reg.created_at
              ? new Date(reg.created_at).toLocaleString("pt-BR")
              : "—"
          }
        />
      </dl>

      <div className="mt-5 rounded-xl bg-card-2 border border-border px-3 py-2">
        <p className="text-[10px] uppercase text-muted">Código da inscrição</p>
        <p className="font-mono text-xs break-all mt-0.5">{reg.id}</p>
      </div>

      {paid ? (
        <p className="mt-4 text-xs text-muted leading-relaxed">
          Guarde este comprovante. Apresente o código ou o CPF na retirada do kit
          / credenciamento, se o organizador pedir. Consulta também em{" "}
          <strong className="text-foreground">/atleta</strong> com o mesmo CPF.
        </p>
      ) : (
        <p className="mt-4 text-xs text-amber-200/90 leading-relaxed">
          Pagamento ainda não confirmado. Conclua o pagamento ou envie o
          comprovante do Pix ao organizador (WhatsApp do evento).
        </p>
      )}
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
