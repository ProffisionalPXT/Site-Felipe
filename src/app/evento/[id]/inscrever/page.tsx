"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ATHLETE_SESSION_KEY,
  saveTimedSession,
} from "@/lib/client-session";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

/**
 * Só cadastro da inscrição (dados + senha de acesso).
 * Pagamento fica em /comprar (precisa estar logado).
 */
export default function InscreverPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/event?id=${eventId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro");
        setEvent(data.event);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

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
      shirt_size: String(fd.get("shirt_size") || ""),
      category: String(fd.get("category") || ""),
      access_password: password,
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
      const cpfDigits = String(payload.cpf).replace(/\D/g, "");

      // Sessão atleta 6h — Comprar ingresso já entra logado
      saveTimedSession(ATHLETE_SESSION_KEY, {
        cpf: cpfDigits,
        password,
      });

      router.push(
        `/evento/${eventId}/confirmacao?id=${encodeURIComponent(regId)}&status=registered`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao inscrever");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-background">
      <SiteHeader solid />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 pb-16">
        <Link href={`/evento/${eventId}`} className="text-sm text-muted hover:text-foreground">
          ← Voltar ao evento
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Inscrição</h1>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Cadastro do atleta <strong className="text-foreground">sem pagamento</strong>.
          Depois entre em <strong className="text-foreground">Meu ingresso</strong> e
          clique em <strong className="text-foreground">Comprar</strong> para pagar.
        </p>

        {loading && <p className="mt-8 text-muted">Carregando…</p>}
        {error && (
          <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            {error}
          </p>
        )}

        {event && (
          <>
            <div className="mt-6 rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold">{event.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {formatDateBR(event.event_date)} · {event.start_time}
              </p>
              <p className="text-xs text-muted mt-1">
                {event.slots_remaining} vagas restantes
              </p>
            </div>

            {!event.registration_open || event.slots_remaining <= 0 ? (
              <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
                Não é possível se inscrever no momento.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                    Categoria
                  </label>
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
                      event.shirt_sizes.includes("M")
                        ? "M"
                        : event.shirt_sizes[0]
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
                  {submitting ? "Salvando…" : "Confirmar inscrição"}
                </button>

                <p className="text-center text-xs text-muted">
                  Já se inscreveu?{" "}
                  <Link href={`/evento/${eventId}/atleta`} className="text-brand-soft underline">
                    Meu ingresso
                  </Link>
                  {" · "}
                  <Link href={`/evento/${eventId}/comprar`} className="text-brand-soft underline">
                    Comprar / pagar
                  </Link>
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
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
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>
  );
}
