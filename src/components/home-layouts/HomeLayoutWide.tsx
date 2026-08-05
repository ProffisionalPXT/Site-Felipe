"use client";
import Link from "next/link";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export function HomeLayoutWide({ events }: { events: EventPublic[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 max-w-7xl mx-auto">
      {events.map((ev) => {
        const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
        const formattedPrice = (ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <Link
            key={ev.id}
            href={`/evento/${ev.id}`}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#007BFF]/20 bg-[#041630] shadow-[0_0_20px_rgba(0,123,255,0.05)] transition-all hover:border-[#007BFF]/60 hover:shadow-[0_0_30px_rgba(0,123,255,0.15)] h-[320px] w-full"
          >
            <div className="absolute inset-0 w-full h-full">
              {ev.cover_image_url ? (
                <img src={ev.cover_image_url} alt={ev.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60" style={{ objectPosition: `center ${ev.cover_position_y ?? 50}%` }} />
              ) : (
                <div className="absolute inset-0 bg-[#0a1f3d]" />
              )}
              {/* Overlay inspired by the screenshot: dark gradient fading to right/bottom */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#020b18] via-[#041630]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041630] to-transparent opacity-90" />
            </div>
            
            <div className="relative flex flex-1 flex-col p-8 h-full z-10">
              <div className="flex gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                  {formatDateBR(ev.event_date)}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#007BFF] bg-[#007BFF]/10 px-3 py-1 rounded-full backdrop-blur-md">
                  {ev.city}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight mt-auto mb-2 text-white group-hover:text-[#007BFF] transition-colors duration-300 drop-shadow-md">
                {ev.name.toUpperCase()}
              </h2>
              <div className="mt-4 flex items-center justify-between">
                {isClosed ? (
                  <span className="text-sm font-bold text-slate-500 uppercase">ESGOTADO</span>
                ) : (
                  <span className="rounded-full border border-[#007BFF]/40 bg-[#007BFF]/20 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition-all group-hover:bg-[#007BFF] shadow-[0_0_10px_rgba(0,123,255,0.2)]">
                    INSCREVER-SE | {formattedPrice}
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
