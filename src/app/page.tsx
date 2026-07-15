"use client";

import { useEffect, useState } from "react";
import { HomeHeroByLayout } from "@/components/HomeLayouts";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDateLongBR } from "@/lib/format";
import {
  colorVarsStyle,
  getFontFamily,
  resolveColor,
  resolveFont,
  resolveLayout,
} from "@/lib/themes";
import type { EventPublic } from "@/lib/types";

export default function HomePage() {
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const layout = resolveLayout(event?.theme_layout);
  const font = resolveFont(event?.theme_font);
  const color = resolveColor(event?.theme_color);
  const fontFamily = getFontFamily(font);

  useEffect(() => {
    fetch("/api/event")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro ao carregar");
        setEvent(data.event);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Teclado no lightbox
  useEffect(() => {
    if (!lightbox || !event?.images?.length) return;
    const urls = event.images.map((i) => i.url);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      const idx = urls.indexOf(lightbox!);
      if (idx < 0) return;
      if (e.key === "ArrowRight") setLightbox(urls[(idx + 1) % urls.length]);
      if (e.key === "ArrowLeft")
        setLightbox(urls[(idx - 1 + urls.length) % urls.length]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, event]);

  const canBuy =
    !!event?.registration_open && (event?.slots_remaining ?? 0) > 0;

  // Layouts claros / com painel lateral
  const lightLayouts = layout === "split" || layout === "magazine";
  // Elegante e noturno: hierarquia própria (sem header fixo sólido)
  const hideSiteHeader = layout === "revista" || layout === "poster";
  // Capa full: header transparente sobre a foto
  const solidHeader = lightLayouts;

  return (
    <div
      className="home-theme min-h-full flex flex-col bg-background text-foreground"
      data-layout={layout}
      data-font={font}
      data-color={color}
      style={{
        ...colorVarsStyle(color),
        fontFamily,
        ["--home-font" as string]: fontFamily,
      }}
    >
      {loading && (
        <>
          <SiteHeader solid />
          <p className="text-muted text-center py-32">Carregando evento…</p>
        </>
      )}

      {error && (
        <>
          <SiteHeader solid />
          <div className="mx-auto max-w-xl px-4 py-16">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <h1 className="text-xl font-semibold mb-2">Quase lá</h1>
              <p className="mb-4 text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        </>
      )}

      {event && (
        <>
          {!hideSiteHeader && <SiteHeader solid={solidHeader} />}

          <HomeHeroByLayout
            event={event}
            canBuy={canBuy}
            layout={layout}
            onOpenPhoto={setLightbox}
          />

          {/* Sobre + regulamento (comum a todos) */}
          <section className="mx-auto w-full max-w-6xl px-4 py-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold mb-3">Sobre o evento</h2>
              <p className="text-muted leading-relaxed whitespace-pre-line text-sm md:text-base">
                {event.description || "Informações em breve."}
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted">Data</dt>
                  <dd className="font-medium capitalize text-right">
                    {formatDateLongBR(event.event_date)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted">Horário</dt>
                  <dd className="font-medium">{event.start_time}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Local</dt>
                  <dd className="font-medium text-right">
                    {event.location}
                    {event.city ? ` · ${event.city}` : ""}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold mb-3">Regulamento</h2>
              <p className="text-muted leading-relaxed whitespace-pre-line text-sm md:text-base">
                {event.regulations || "Regulamento será publicado em breve."}
              </p>
            </div>
          </section>

          {/* Contatos (editáveis no admin) */}
          <ContactsSection event={event} />

          {canBuy && (
            <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur p-3 md:hidden">
              <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                <div>
                  <p className="text-xs text-muted">Ingresso</p>
                  <p className="font-bold text-lg">
                    {(event.price_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <a
                  href="/comprar"
                  className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-white"
                >
                  Comprar
                </a>
              </div>
            </div>
          )}

          {lightbox && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
              role="dialog"
            >
              <button
                type="button"
                className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/15 text-white text-2xl"
                onClick={() => setLightbox(null)}
                aria-label="Fechar"
              >
                ×
              </button>
              {event.images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-3 h-12 w-12 rounded-full bg-white/15 text-white text-2xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      const urls = event.images.map((i) => i.url);
                      const i = urls.indexOf(lightbox);
                      setLightbox(urls[(i - 1 + urls.length) % urls.length]);
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 h-12 w-12 rounded-full bg-white/15 text-white text-2xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      const urls = event.images.map((i) => i.url);
                      const i = urls.indexOf(lightbox);
                      setLightbox(urls[(i + 1) % urls.length]);
                    }}
                  >
                    ›
                  </button>
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox}
                alt=""
                className="max-h-[90vh] max-w-full rounded-xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <footer className="border-t border-border py-6 text-center text-xs text-muted pb-24 md:pb-8">
            Bilheteria digital · {event.name}
          </footer>
        </>
      )}
    </div>
  );
}

function ContactsSection({ event }: { event: EventPublic }) {
  const items: { label: string; value: string; href?: string }[] = [];

  if (event.contact_email) {
    items.push({
      label: "E-mail",
      value: event.contact_email,
      href: `mailto:${event.contact_email}`,
    });
  }
  if (event.contact_whatsapp) {
    const digits = event.contact_whatsapp.replace(/\D/g, "");
    items.push({
      label: "WhatsApp",
      value: formatPhone(event.contact_whatsapp),
      href: `https://wa.me/55${digits}`,
    });
  }
  if (event.contact_phone) {
    items.push({
      label: "Telefone",
      value: formatPhone(event.contact_phone),
      href: `tel:${event.contact_phone.replace(/\D/g, "")}`,
    });
  }
  if (event.contact_instagram) {
    const ig = event.contact_instagram.replace(/^@/, "");
    const href = event.contact_instagram.startsWith("http")
      ? event.contact_instagram
      : `https://instagram.com/${ig}`;
    items.push({
      label: "Instagram",
      value: event.contact_instagram.startsWith("@")
        ? event.contact_instagram
        : `@${ig}`,
      href,
    });
  }
  if (event.contact_facebook) {
    items.push({
      label: "Facebook",
      value: event.contact_facebook,
      href: event.contact_facebook.startsWith("http")
        ? event.contact_facebook
        : `https://facebook.com/${event.contact_facebook}`,
    });
  }
  if (event.contact_youtube) {
    items.push({
      label: "YouTube",
      value: event.contact_youtube,
      href: event.contact_youtube.startsWith("http")
        ? event.contact_youtube
        : `https://youtube.com/${event.contact_youtube}`,
    });
  }
  if (event.contact_tiktok) {
    const tk = event.contact_tiktok.replace(/^@/, "");
    items.push({
      label: "TikTok",
      value: event.contact_tiktok.startsWith("@")
        ? event.contact_tiktok
        : `@${tk}`,
      href: event.contact_tiktok.startsWith("http")
        ? event.contact_tiktok
        : `https://www.tiktok.com/@${tk}`,
    });
  }
  if (event.contact_kit_email) {
    items.push({
      label: "Kit / retirada",
      value: event.contact_kit_email,
      href: `mailto:${event.contact_kit_email}`,
    });
  }

  const hasTiming = Boolean(event.contact_timing_url?.trim());
  const hasAnything = items.length > 0 || hasTiming || event.contact_extra;

  if (!hasAnything) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 md:pb-16">
        <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted">
          Contatos em breve. O organizador preenche na aba{" "}
          <strong>Contatos</strong> do painel.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 md:pb-16">
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-xl font-bold mb-1">Contatos</h2>
        <p className="text-sm text-muted mb-6">
          Fale com a organização · redes e cronometragem
        </p>

        {hasTiming && (
          <a
            href={event.contact_timing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border-2 border-brand/40 bg-brand/10 px-5 py-4 hover:bg-brand/15 transition"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-soft">
                Cronometragem · percursos · resultados
              </p>
              <p className="font-bold text-lg mt-0.5">
                {event.contact_timing_label || "Ver tabela / site oficial"}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shrink-0">
              Abrir site →
            </span>
          </a>
        )}

        {items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {items.map((it) =>
              it.href ? (
                <a
                  key={it.label + it.value}
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-border bg-card-2 px-3 py-3 hover:border-brand/50 transition"
                >
                  <p className="text-[11px] text-muted">{it.label}</p>
                  <p className="font-medium mt-0.5 break-all">{it.value}</p>
                </a>
              ) : (
                <div
                  key={it.label + it.value}
                  className="rounded-xl border border-border bg-card-2 px-3 py-3"
                >
                  <p className="text-[11px] text-muted">{it.label}</p>
                  <p className="font-medium mt-0.5 break-all">{it.value}</p>
                </div>
              )
            )}
          </div>
        )}

        {event.contact_extra && (
          <p className="mt-5 text-sm text-muted leading-relaxed whitespace-pre-line">
            {event.contact_extra}
          </p>
        )}
      </div>
    </section>
  );
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return raw;
}
