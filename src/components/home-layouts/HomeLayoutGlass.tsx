"use client";
import Link from "next/link";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export function HomeLayoutGlass({ events }: { events: EventPublic[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-[#007BFF]/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      {events.map((ev) => {
        const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
        const formattedPrice = (ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <Link
            key={ev.id}
            href={`/evento/${ev.id}`}
            className="group relative flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:bg-white/10 hover:border-[#007BFF]/50 hover:shadow-[0_0_30px_rgba(0,123,255,0.2)] h-[480px] w-full"
          >
            <div className="h-[220px] w-full relative overflow-hidden rounded-t-[32px]">
              {ev.cover_image_url ? (
                <img src={ev.cover_image_url} alt={ev.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="absolute inset-0 bg-slate-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#041630] to-transparent opacity-80" />
            </div>
            <div className="flex flex-1 flex-col p-6 relative -mt-8 bg-gradient-to-b from-transparent to-[#041630]/90 rounded-b-[32px]">
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007BFF] bg-[#007BFF]/10 border border-[#007BFF]/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                  {formatDateBR(ev.event_date)}
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight mb-2 text-white group-hover:text-[#007BFF] transition-colors duration-300">
                {ev.name}
              </h2>
              <p className="text-sm text-slate-400 line-clamp-3 mb-6">
                {ev.description || "Corra e garanta sua vaga. Inscrições abertas!"}
              </p>
              <div className="mt-auto">
                {isClosed ? (
                  <div className="w-full text-center rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-sm font-bold text-slate-500">ESGOTADO</div>
                ) : (
                  <div className="w-full text-center rounded-xl bg-[#007BFF] hover:bg-[#0056B3] text-white px-6 py-3 text-sm font-bold transition-all shadow-[0_0_15px_rgba(0,123,255,0.4)]">
                    Comprar Ingresso • {formattedPrice}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
