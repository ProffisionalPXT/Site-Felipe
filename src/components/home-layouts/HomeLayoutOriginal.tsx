"use client";
import Link from "next/link";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export function HomeLayoutOriginal({ events }: { events: EventPublic[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {events.map((ev) => {
        const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
        const formattedPrice = (ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <Link
            key={ev.id}
            href={`/evento/${ev.id}`}
            className="group relative flex flex-col overflow-hidden rounded-3xl bg-slate-800 transition-all hover:shadow-[0_0_40px_rgba(255,107,0,0.15)] hover:-translate-y-1 h-[400px] w-full"
          >
            {ev.cover_image_url ? (
              <img
                src={ev.cover_image_url}
                alt={ev.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ objectPosition: `center ${ev.cover_position_y ?? 50}%` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500">Sem Foto</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/80 to-transparent opacity-90" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
            <div className="relative flex flex-1 flex-col justify-end p-8 h-full z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand bg-brand/10 px-3 py-1 rounded-full backdrop-blur-md">
                  {formatDateBR(ev.event_date)}
                </span>
                <span className="text-xs font-semibold text-slate-300 bg-white/5 px-3 py-1 rounded-full backdrop-blur-md">
                  {ev.city}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight mb-2 text-white group-hover:text-brand transition-colors duration-300">
                {ev.name}
              </h2>
              <p className="text-sm text-slate-400 line-clamp-2 mb-6 max-w-[80%]">
                {ev.description || "Garanta já a sua vaga neste grande evento."}
              </p>
              <div className="mt-auto flex items-center justify-between">
                {isClosed ? (
                  <span className="rounded-full bg-red-500/20 border border-red-500/50 px-6 py-2.5 text-sm font-bold text-red-400 uppercase tracking-wider backdrop-blur-md">Esgotado</span>
                ) : (
                  <span className="rounded-full bg-brand hover:bg-brand-dark shadow-lg shadow-brand/20 text-white px-6 py-3 text-sm font-bold transition-all flex items-center gap-2 group-hover:scale-105">
                    Inscrever-se <span className="opacity-50">|</span> {formattedPrice}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
