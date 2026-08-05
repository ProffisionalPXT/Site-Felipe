"use client";
import Link from "next/link";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export function HomeLayout3D({ events }: { events: EventPublic[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 pt-8">
      {events.map((ev, i) => {
        const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
        const formattedPrice = (ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <Link
            key={ev.id}
            href={`/evento/${ev.id}`}
            className="group relative flex flex-col h-[500px] transition-all duration-500 hover:-translate-y-4 hover:scale-[1.02]"
            style={{ perspective: "1000px" }}
          >
            <div className="absolute inset-0 rounded-[2rem] bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-hover:shadow-[0_30px_60px_rgba(0,123,255,0.2)] transition-shadow duration-500 overflow-hidden border border-white/5">
              {ev.cover_image_url ? (
                <img src={ev.cover_image_url} alt={ev.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="absolute inset-0 bg-[#041630]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#041630] via-[#041630]/60 to-transparent" />
            </div>
            <div className="relative h-full flex flex-col justify-end p-8 md:p-10 z-10 translate-z-10">
              <span className="w-fit text-xs font-bold uppercase tracking-widest text-[#007BFF] bg-[#007BFF]/10 px-4 py-2 rounded-lg backdrop-blur-md mb-4 border border-[#007BFF]/30">
                {formatDateBR(ev.event_date)}
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-2 leading-none group-hover:text-[#007BFF] transition-colors drop-shadow-xl">
                {ev.name}
              </h2>
              <p className="text-slate-300 font-medium mb-8 text-lg drop-shadow-md">
                {ev.city}
              </p>
              <div className="w-full">
                {isClosed ? (
                  <div className="w-full bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl py-4 text-center font-bold text-slate-400">ESGOTADO</div>
                ) : (
                  <div className="w-full bg-[#007BFF] hover:bg-[#0056B3] text-white rounded-2xl py-4 text-center font-bold text-lg shadow-[0_10px_30px_rgba(0,123,255,0.4)] transition-all group-hover:-translate-y-1">
                    Comprar Ingresso
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
