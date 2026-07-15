"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";

function Content() {
  const params = useSearchParams();
  const id = params.get("id");
  const status = params.get("status") || "pending";
  const method = params.get("method");

  const methodLabel =
    method === "pix" ? "Pix" : method === "card" ? "Cartão de crédito" : null;

  const isRegistered = status === "registered";

  const title =
    status === "success"
      ? "Ingresso confirmado!"
      : status === "failure"
        ? "Pagamento não concluído"
        : isRegistered
          ? "Inscrição registrada!"
          : "Pedido registrado";

  const message =
    status === "success"
      ? methodLabel
        ? `Pagamento via ${methodLabel} aprovado. Guarde o código e use Meu ingresso (CPF + senha) para ver o comprovante.`
        : "Seu pagamento foi aprovado. Use Meu ingresso com CPF e senha para ver o comprovante."
      : status === "failure"
        ? "O pagamento falhou ou foi cancelado. Entre em Meu ingresso e tente Comprar de novo."
        : isRegistered
          ? "Cadastro feito. A inscrição ainda não está paga. Entre em Meu ingresso (CPF + senha) e clique em Comprar para pagar."
          : "Recebemos seus dados. Conclua o pagamento em Comprar para garantir a vaga.";

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 shadow-xl text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-2xl">
        {status === "success" ? "✅" : status === "failure" ? "⚠️" : "🎫"}
      </div>
      <h1 className="text-2xl font-black mb-2">{title}</h1>
      {methodLabel && status === "success" && (
        <p className="mb-3 inline-flex rounded-full bg-white/5 border border-border px-3 py-1 text-xs font-semibold text-brand-soft">
          Pago com {methodLabel}
        </p>
      )}
      <p className="text-muted text-sm leading-relaxed mb-6">{message}</p>
      {id && (
        <p className="rounded-xl bg-card-2 border border-border px-3 py-2 text-xs font-mono break-all mb-6">
          Código: {id}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
        {(isRegistered || status === "pending" || status === "failure") && (
          <Link
            href="/comprar"
            className="inline-flex justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Comprar / pagar
          </Link>
        )}
        <Link
          href="/atleta"
          className="inline-flex justify-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-white/5"
        >
          Meu ingresso (CPF + senha)
        </Link>
        <Link
          href="/"
          className="inline-flex justify-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-white/5"
        >
          Voltar ao evento
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <Suspense fallback={<p className="text-center text-muted">Carregando…</p>}>
          <Content />
        </Suspense>
      </main>
    </div>
  );
}
