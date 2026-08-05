"use client";

import Link from "next/link";
import { formatBRL, formatDateLongBR } from "@/lib/format";
import type { LayoutId } from "@/lib/themes";
import type { EventPublic } from "@/lib/types";

type Props = {
  event: EventPublic;
  canBuy: boolean;
  onOpenPhoto: (url: string) => void;
  layout: LayoutId;
};

/** Capa do evento: sempre a foto de capa (ou 1ª imagem). */
function coverUrl(event: EventPublic): string | null {
  return event.cover_image_url || event.images[0]?.url || null;
}

export function TicketCard({
  event,
  canBuy,
  compact = false,
  light = false,
}: {
  event: EventPublic;
  canBuy: boolean;
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <aside
      className={
        light
          ? "rounded-3xl border border-white/10 bg-white/5 border-white/10 p-6 shadow-xl"
          : "rounded-3xl border border-white/10 bg-black/55 backdrop-blur-xl p-6 shadow-2xl shadow-black/40"
      }
    >
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
        Ingresso
      </p>
      <p
        className={
          light
            ? "mt-1 text-4xl font-black text-white tabular-nums"
            : "mt-1 text-4xl font-black text-white tabular-nums"
        }
      >
        {formatBRL(event.price_cents)}
      </p>
      <p className="mt-1 text-sm text-slate-400">por atleta</p>

      <div className={`mt-5 grid grid-cols-2 gap-3 ${compact ? "text-sm" : ""}`}>
        <div className="rounded-2xl bg-white/5 border-white/10-2/80 border border-white/10 px-3 py-3">
          <p className="text-[11px] text-slate-400 uppercase">Vagas</p>
          <p className="text-xl font-bold tabular-nums">
            {event.slots_remaining}
            <span className="text-sm font-normal text-slate-400">
              {" "}
              / {event.max_slots}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 border-white/10-2/80 border border-white/10 px-3 py-3">
          <p className="text-[11px] text-slate-400 uppercase">Confirmados</p>
          <p className="text-xl font-bold tabular-nums">{event.paid_count}</p>
        </div>
      </div>

      {event.categories.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-slate-400 uppercase mb-2">Categorias</p>
          <div className="flex flex-wrap gap-1.5">
            {event.categories.map((c) => (
              <span
                key={c}
                className="rounded-lg bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-medium text-white"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {canBuy ? (
        <Link
          href={`/evento/${event.id}/comprar`}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-[#007BFF] hover:bg-[#0056B3] py-3.5 text-base font-bold text-white hover:bg-[#007BFF] hover:bg-[#0056B3]-dark transition"
        >
          Comprar ingresso
        </Link>
      ) : (
        <p className="mt-6 rounded-2xl bg-white/5 border border-white/10 py-3 text-center text-sm text-slate-400">
          Inscrições indisponíveis
        </p>
      )}
    </aside>
  );
}

function MetaLine({
  event,
  light = false,
}: {
  event: EventPublic;
  light?: boolean;
}) {
  const t = light ? "text-slate-400" : "text-white/80";
  return (
    <ul className={`flex flex-wrap gap-x-6 gap-y-2 text-sm ${t}`}>
      <li className="flex items-center gap-2">
        <span className="text-brand-soft">📅</span>
        <span className="capitalize">{formatDateLongBR(event.event_date)}</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="text-brand-soft">🕖</span>
        {event.start_time}
      </li>
      <li className="flex items-center gap-2">
        <span className="text-brand-soft">📍</span>
        {event.location}
        {event.city ? ` · ${event.city}` : ""}
      </li>
    </ul>
  );
}

function CoverLayer({ url }: { url: string | null }) {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: url
            ? `url(${url})`
            : "linear-gradient(135deg,#1e293b,#0f172a 50%,#7c2d12)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35" />
    </>
  );
}

function GalleryStrip({
  event,
  onOpenPhoto,
  tall = false,
}: {
  event: EventPublic;
  onOpenPhoto: (url: string) => void;
  tall?: boolean;
}) {
  if (!event.images.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {event.images.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onOpenPhoto(img.url)}
          className={`relative ${tall ? "h-56 w-80" : "h-44 w-72"} shrink-0 overflow-hidden rounded-2xl border border-white/10 group`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.caption || event.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </button>
      ))}
    </div>
  );
}

function GalleryGrid({
  event,
  onOpenPhoto,
  cols = 3,
}: {
  event: EventPublic;
  onOpenPhoto: (url: string) => void;
  cols?: 2 | 3 | 4;
}) {
  if (!event.images.length) return null;
  const grid =
    cols === 2
      ? "grid-cols-2"
      : cols === 4
        ? "grid-cols-2 md:grid-cols-4"
        : "grid-cols-2 md:grid-cols-3";
  return (
    <div className={`grid ${grid} gap-3`}>
      {event.images.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onOpenPhoto(img.url)}
          className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </button>
      ))}
    </div>
  );
}

function Badges({ canBuy }: { canBuy: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <span className="rounded-full bg-[#007BFF] hover:bg-[#0056B3] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        Ingresso oficial
      </span>
      {canBuy ? (
        <span className="rounded-full bg-emerald-500/25 border border-emerald-400/40 px-3 py-1 text-xs font-medium text-emerald-200">
          Vendas abertas
        </span>
      ) : (
        <span className="rounded-full bg-red-500/20 border border-red-400/30 px-3 py-1 text-xs font-medium text-red-200">
          Encerrado
        </span>
      )}
    </div>
  );
}

/**
 * Capa + letreiro — foto de capa SEMPRE atrás do título e do card.
 * É o layout da tela que o organizador pediu.
 */
function LayoutBilheteria(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="relative min-h-[78vh] flex flex-col">
        <CoverLayer url={cover} />
        <div className="relative z-10 mx-auto mt-auto w-full max-w-6xl px-4 pb-10 pt-28 grid gap-8 lg:grid-cols-[1.4fr_1fr] items-end">
          <div>
            <Badges canBuy={canBuy} />
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white drop-shadow-lg">
              {event.name}
            </h1>
            <p className="mt-4 max-w-xl text-base md:text-lg text-white/90 leading-relaxed">
              {event.description}
            </p>
            <div className="mt-6">
              <MetaLine event={event} />
            </div>
          </div>
          <TicketCard event={event} canBuy={canBuy} />
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold mb-5">Galeria</h2>
          <GalleryStrip event={event} onOpenPhoto={onOpenPhoto} />
        </section>
      )}
    </>
  );
}

/** Noturno cinematográfico */
function LayoutPoster(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="relative min-h-[100svh] flex flex-col">
        <CoverLayer url={cover} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-transparent to-transparent" />
        <div className="relative z-10 mt-auto w-full max-w-6xl mx-auto px-5 md:px-10 pb-14 md:pb-20 pt-32">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.95] max-w-4xl drop-shadow-xl">
            {event.name}
          </h1>
          <p className="mt-5 text-sm sm:text-base uppercase tracking-[0.18em] text-white/80 font-medium max-w-2xl">
            {event.description?.split("\n")[0] || event.location}
          </p>
          <p className="mt-3 text-sm md:text-base text-white/70 max-w-xl">
            <span className="capitalize">{formatDateLongBR(event.event_date)}</span>
            {event.city ? ` · ${event.city}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {event.categories.map((c) => (
              <span
                key={c}
                className="rounded-lg border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white"
              >
                {c}
              </span>
            ))}
            <div className="flex-1 min-w-[1rem]" />
            {canBuy ? (
              <Link
                href={`/evento/${event.id}/comprar`}
                className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Saiba Mais
              </Link>
            ) : null}
          </div>
          <div className="mt-10 max-w-sm">
            <TicketCard event={event} canBuy={canBuy} compact />
          </div>
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold mb-6">Momentos</h2>
          <GalleryGrid event={event} onOpenPhoto={onOpenPhoto} cols={3} />
        </section>
      )}
    </>
  );
}

/** Elegante central */
function LayoutRevista(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <div className="relative min-h-screen py-6 md:py-10 px-3 md:px-6">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center scale-105 blur-sm opacity-45"
        style={{
          backgroundImage: cover
            ? `url(${cover})`
            : "linear-gradient(135deg,#1a1208,#0a0a0f)",
        }}
      />
      <div className="fixed inset-0 -z-10 bg-black/70" />

      <div className="mx-auto max-w-4xl rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-white/10 bg-[#12141a]/92 shadow-2xl">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-sm text-white/70 border-b border-white/5">
          <a href="#topo" className="hover:text-white">
            Home
          </a>
          <a href="/inscrever" className="hover:text-white">
            Inscrição
          </a>
          <a href="#galeria" className="hover:text-white">
            Galeria
          </a>
        </nav>

        <div id="topo" className="relative">
          <div className="relative aspect-[16/9] md:aspect-[2.1/1] overflow-hidden">
            <CoverLayer url={cover} />
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center z-10">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-wide text-[#f5f0e8] drop-shadow-xl leading-[1.1]">
                {event.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
          <div className="px-4 py-5 border-b md:border-b-0 md:border-r border-white/10">
            <p className="text-sm font-medium text-white capitalize">
              {formatDateLongBR(event.event_date)}
            </p>
          </div>
          {(event.categories.length ? event.categories.slice(0, 3) : ["—"]).map(
            (cat, i) => (
              <div
                key={cat + i}
                className="px-4 py-5 border-b md:border-b-0 md:border-r border-white/10 last:border-r-0 flex items-center"
              >
                <p className="text-sm font-semibold text-white/90">{cat}</p>
              </div>
            )
          )}
        </div>

        <div className="px-5 md:px-8 py-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-white/75">
            {event.location}
            {event.city ? `, ${event.city}` : ""}
            {event.start_time ? ` · ${event.start_time}` : ""}
          </p>
          {canBuy && (
            <Link
              href={`/evento/${event.id}/comprar`}
              className="inline-flex justify-center rounded-xl bg-[#007BFF] hover:bg-[#0056B3] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#007BFF] hover:bg-[#0056B3]-dark"
            >
              Inscreva-se · {formatBRL(event.price_cents)}
            </Link>
          )}
        </div>

        {event.images.length > 0 && (
          <div id="galeria" className="px-4 md:px-6 pb-8 pt-2">
            <GalleryStrip event={event} onOpenPhoto={onOpenPhoto} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Neon esporte */
function LayoutNeon(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="relative min-h-[85vh] flex flex-col">
        <CoverLayer url={cover} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--brand)_0%,_transparent_55%)] opacity-25" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-28 pb-12 flex flex-col items-center text-center">
          <p className="text-brand-soft text-xs uppercase tracking-[0.35em] font-bold mb-4">
            Live · {formatDateLongBR(event.event_date)}
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-black text-white drop-shadow-[0_0_30px_var(--brand)] leading-tight">
            {event.name}
          </h1>
          <p className="mt-5 max-w-2xl text-white/80 text-lg">{event.description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {event.categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-brand/50 bg-[#007BFF] hover:bg-[#0056B3]/15 px-4 py-1.5 text-sm font-bold text-brand-soft"
              >
                {c}
              </span>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-lg">
            <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-4 backdrop-blur">
              <p className="text-[10px] uppercase text-slate-400">Vagas</p>
              <p className="text-2xl font-black text-white tabular-nums">
                {event.slots_remaining}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-4 backdrop-blur">
              <p className="text-[10px] uppercase text-slate-400">Preço</p>
              <p className="text-lg font-black text-brand-soft">
                {formatBRL(event.price_cents)}
              </p>
            </div>
          </div>
          {canBuy && (
            <Link
              href={`/evento/${event.id}/comprar`}
              className="mt-8 rounded-full bg-[#007BFF] hover:bg-[#0056B3] px-10 py-4 text-lg font-black text-white shadow-[0_0_40px_var(--brand)] hover:bg-[#007BFF] hover:bg-[#0056B3]-dark"
            >
              Garantir vaga
            </Link>
          )}
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <GalleryGrid event={event} onOpenPhoto={onOpenPhoto} cols={4} />
        </section>
      )}
    </>
  );
}

/** Split 50/50 */
function LayoutSplit(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="min-h-[88vh] grid lg:grid-cols-2">
        <div className="relative min-h-[42vh] lg:min-h-full">
          <CoverLayer url={cover} />
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <p className="text-white/70 text-sm uppercase tracking-widest">
              Capa do evento
            </p>
            <p className="text-white font-bold text-lg mt-1">{event.location}</p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-6 md:px-12 py-16 bg-[#020813]">
          <Badges canBuy={canBuy} />
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white">
            {event.name}
          </h1>
          <p className="mt-4 text-slate-400 leading-relaxed">{event.description}</p>
          <div className="mt-6">
            <MetaLine event={event} light />
          </div>
          <div className="mt-8 max-w-md">
            <TicketCard event={event} canBuy={canBuy} light />
          </div>
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-bold mb-4">Galeria</h2>
          <GalleryStrip event={event} onOpenPhoto={onOpenPhoto} />
        </section>
      )}
    </>
  );
}

/** Estádio wide */
function LayoutStadium(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="relative min-h-[90vh] flex flex-col items-center justify-end text-center px-4 pb-16 pt-32">
        <CoverLayer url={cover} />
        <div className="relative z-10 max-w-4xl">
          <p className="text-white/70 text-sm tracking-[0.3em] uppercase mb-4">
            {formatDateLongBR(event.event_date)} · {event.start_time}
          </p>
          <h1 className="font-display text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
            {event.name}
          </h1>
          <p className="mt-4 text-white/85 text-lg max-w-2xl mx-auto">
            {event.description?.split("\n")[0]}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {event.categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/15 border border-white/25 px-5 py-2 text-sm font-semibold text-white backdrop-blur"
              >
                {c}
              </span>
            ))}
          </div>
          {canBuy && (
            <Link
              href={`/evento/${event.id}/comprar`}
              className="mt-10 inline-flex rounded-2xl bg-[#007BFF] hover:bg-[#0056B3] px-12 py-4 text-lg font-bold text-white hover:bg-[#007BFF] hover:bg-[#0056B3]-dark shadow-xl"
            >
              Comprar · {formatBRL(event.price_cents)}
            </Link>
          )}
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <GalleryGrid event={event} onOpenPhoto={onOpenPhoto} cols={3} />
        </section>
      )}
    </>
  );
}

/** Magazine editorial */
function LayoutMagazine(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);
  const year = event.event_date?.slice(0, 4) || "2026";

  return (
    <>
      <section className="relative min-h-[70vh] grid md:grid-cols-[1.2fr_1fr]">
        <div className="relative min-h-[50vh]">
          <CoverLayer url={cover} />
          <div className="absolute top-6 left-6 z-10">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">
              Edição especial
            </p>
            <p className="text-6xl md:text-8xl font-black text-white/90 leading-none mt-2">
              {year}
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-6 md:px-10 py-12 bg-white/5 border-white/10 border-l border-white/10">
          <p className="text-xs uppercase tracking-widest text-brand font-bold mb-3">
            Ingresso oficial
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
            {event.name}
          </h1>
          <p className="mt-5 text-slate-400 leading-relaxed text-sm md:text-base whitespace-pre-line">
            {event.description}
          </p>
          <div className="mt-6">
            <MetaLine event={event} light />
          </div>
          <div className="mt-8 max-w-sm">
            <TicketCard event={event} canBuy={canBuy} light compact />
          </div>
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-bold mb-4">Ensaios fotográficos</h2>
          <GalleryGrid event={event} onOpenPhoto={onOpenPhoto} cols={4} />
        </section>
      )}
    </>
  );
}

/** Vitrine — faixa de fotos + bloco de título COM capa */
function LayoutVitrine(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      {event.images.length > 0 && (
        <section className="border-b border-white/10 bg-black/20 py-4 pt-20">
          <div className="mx-auto max-w-6xl px-4">
            <GalleryStrip event={event} onOpenPhoto={onOpenPhoto} tall />
          </div>
        </section>
      )}
      {!event.images.length && <div className="pt-20" />}

      <section className="relative min-h-[60vh] flex flex-col">
        <CoverLayer url={cover} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 grid gap-10 lg:grid-cols-[1.3fr_1fr] items-end">
          <div>
            <Badges canBuy={canBuy} />
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-lg">
              {event.name}
            </h1>
            <p className="mt-4 text-white/85 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
            <div className="mt-6">
              <MetaLine event={event} />
            </div>
          </div>
          <TicketCard event={event} canBuy={canBuy} />
        </div>
      </section>
    </>
  );
}

/** Catálogo — capa no topo com título */
function LayoutCatalogo(p: Props) {
  const { event, canBuy, onOpenPhoto } = p;
  const cover = coverUrl(event);

  return (
    <>
      <section className="relative min-h-[55vh] flex flex-col">
        <CoverLayer url={cover} />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-28 pb-10 grid gap-8 lg:grid-cols-[1fr_340px] items-end">
          <div>
            <Badges canBuy={canBuy} />
            <h1 className="font-display text-4xl md:text-5xl font-black text-white drop-shadow-lg">
              {event.name}
            </h1>
            <div className="mt-4">
              <MetaLine event={event} />
            </div>
            <p className="mt-4 text-white/85 leading-relaxed max-w-xl whitespace-pre-line">
              {event.description}
            </p>
          </div>
          <TicketCard event={event} canBuy={canBuy} compact />
        </div>
      </section>
      {event.images.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Fotos do evento</h2>
          <GalleryGrid event={event} onOpenPhoto={onOpenPhoto} cols={2} />
        </section>
      )}
    </>
  );
}

export function HomeHeroByLayout(props: Props) {
  switch (props.layout) {
    case "poster":
      return <LayoutPoster {...props} />;
    case "vitrine":
      return <LayoutVitrine {...props} />;
    case "revista":
      return <LayoutRevista {...props} />;
    case "catalogo":
      return <LayoutCatalogo {...props} />;
    case "neon":
      return <LayoutNeon {...props} />;
    case "split":
      return <LayoutSplit {...props} />;
    case "stadium":
      return <LayoutStadium {...props} />;
    case "magazine":
      return <LayoutMagazine {...props} />;
    case "bilheteria":
    default:
      return <LayoutBilheteria {...props} />;
  }
}
