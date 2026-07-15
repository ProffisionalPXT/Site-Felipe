"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatBRL } from "@/lib/format";

function Content() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") || "";
  const method = (params.get("method") === "card" ? "card" : "pix") as
    | "pix"
    | "card";
  const amountParam = params.get("amount");
  const couponParam = params.get("coupon");
  const discountParam = params.get("discount");
  const originalParam = params.get("original");

  const [price, setPrice] = useState(
    amountParam ? Number(amountParam) : 8900
  );
  const [original, setOriginal] = useState(
    originalParam ? Number(originalParam) : 0
  );
  const [discount, setDiscount] = useState(
    discountParam ? Number(discountParam) : 0
  );
  const [coupon, setCoupon] = useState(couponParam || "");
  const [eventName, setEventName] = useState("Ingresso");
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Código Pix fictício só para demonstração visual
  const demoPixCode =
    "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426655440000520400005303986540" +
    (price / 100).toFixed(2) +
    "5802BR5925CORRIDANOTURNA DEMO6009SAO PAULO62070503***6304ABCD";

  useEffect(() => {
    fetch("/api/event")
      .then((r) => r.json())
      .then((d) => {
        if (d.event) {
          setEventName(d.event.name);
          if (!amountParam) setPrice(d.event.price_cents);
          if (!originalParam && !amountParam) setOriginal(d.event.price_cents);
        }
      })
      .catch(() => {});
  }, [amountParam, originalParam]);

  function copyPix() {
    void navigator.clipboard.writeText(demoPixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmPaid(e?: FormEvent) {
    e?.preventDefault();
    setPaying(true);
    // Demo: simula processamento e confirma
    setTimeout(() => {
      router.push(
        `/confirmacao?id=${encodeURIComponent(id)}&status=success&method=${method}`
      );
    }, 1200);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/comprar" className="text-sm text-muted hover:text-foreground">
        ← Voltar
      </Link>
      <h1 className="mt-3 text-2xl font-black tracking-tight">Pagamento</h1>
      <p className="text-sm text-muted mt-1">{eventName}</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Total</p>
            {discount > 0 && original > price && (
              <p className="text-sm text-muted line-through tabular-nums">
                {formatBRL(original)}
              </p>
            )}
            <p className="text-3xl font-black text-brand-soft tabular-nums">
              {formatBRL(price)}
            </p>
            {coupon && (
              <p className="text-xs text-emerald-400 mt-1 font-medium">
                Cupom {coupon}
                {discount > 0 ? ` · −${formatBRL(discount)}` : ""}
              </p>
            )}
          </div>
          <span
            className={
              method === "pix"
                ? "rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 px-3 py-1 text-xs font-bold"
                : "rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 px-3 py-1 text-xs font-bold"
            }
          >
            {method === "pix" ? "Pix" : "Cartão"}
          </span>
        </div>
      </div>

      {method === "pix" ? (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 space-y-4">
          <p className="text-center text-sm font-medium">
            Escaneie o QR Code ou copie o código Pix
          </p>

          {/* QR visual simulado */}
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-white p-3 shadow-inner">
            <div
              className="h-full w-full rounded-lg"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg,#0f172a 0 2px,transparent 2px 6px), repeating-linear-gradient(90deg,#0f172a 0 2px,transparent 2px 6px)",
                opacity: 0.85,
              }}
              aria-hidden
            />
          </div>
          <p className="text-center text-[11px] text-amber-300/90">
            Pagamento simulado até configurar o gateway
          </p>

          <div className="rounded-xl bg-card-2 border border-border p-3">
            <p className="text-[10px] text-muted mb-1">Pix Copia e Cola</p>
            <p className="text-[11px] font-mono break-all text-slate-300 leading-relaxed max-h-16 overflow-hidden">
              {demoPixCode}
            </p>
          </div>

          <button
            type="button"
            onClick={copyPix}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-white/5"
          >
            {copied ? "Copiado!" : "Copiar código Pix"}
          </button>

          <button
            type="button"
            disabled={paying}
            onClick={() => confirmPaid()}
            className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {paying ? "Confirmando…" : "Já paguei · confirmar inscrição"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={confirmPaid}
          className="mt-6 rounded-3xl border border-border bg-card p-6 space-y-4"
        >
          <p className="text-sm font-medium">Dados do cartão de crédito</p>
          <p className="text-[11px] text-amber-300/90 -mt-2">
            Simulado até configurar o gateway de pagamento
          </p>

          <div>
            <label className="text-xs text-muted">Número do cartão</label>
            <input
              required
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
              maxLength={19}
            />
          </div>
          <div>
            <label className="text-xs text-muted">Nome impresso no cartão</label>
            <input
              required
              placeholder="Como está no cartão"
              className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted">Validade</label>
              <input
                required
                placeholder="MM/AA"
                className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
                maxLength={5}
              />
            </div>
            <div>
              <label className="text-xs text-muted">CVV</label>
              <input
                required
                inputMode="numeric"
                placeholder="123"
                className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted">Parcelas</label>
            <select className="mt-1 w-full rounded-xl border border-border bg-card-2 px-3 py-3">
              <option>1x de {formatBRL(price)} sem juros</option>
              <option>2x de {formatBRL(Math.round(price / 2))}</option>
              <option>3x de {formatBRL(Math.round(price / 3))}</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={paying}
            className="w-full rounded-2xl bg-brand py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {paying ? "Processando…" : `Pagar ${formatBRL(price)}`}
          </button>
        </form>
      )}

      {id && (
        <p className="mt-4 text-center text-[11px] text-muted font-mono break-all">
          Pedido: {id}
        </p>
      )}
    </div>
  );
}

export default function PagarPage() {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-center text-muted">Carregando…</p>}>
          <Content />
        </Suspense>
      </main>
    </div>
  );
}
