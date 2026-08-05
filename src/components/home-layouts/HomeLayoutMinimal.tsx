"use client";
import Link from "next/link";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export function HomeLayoutMinimal({ events }: { events: EventPublic[] }) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {events.map((ev) => {
        const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
        const formattedPrice = (ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        return (
          <Link
            key={ev.id}
            href={`/evento/${ev.id}`}
            className="group flex flex-col md:flex-row bg-[#041630] border border-slate-800 hover:border-[#007BFF] transition-all duration-300"
          >
            <div className="md:w-64 h-48 md:h-auto shrink-0 relative overflow-hidden">
              {ev.cover_image_url ? (
                <img src={ev.cover_image_url} alt={ev.name} className="absolute inset-0 h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              ) : (
                <div className="absolute inset-0 bg-slate-900" />
              )}
            </div>
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-500 mb-3 uppercase tracking-widest">
                <span>{formatDateBR(ev.event_date)}</span>
                <span>//</span>
                <span>{ev.city}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-light tracking-tight text-white mb-4 group-hover:text-[#007BFF] transition-colors">
                {ev.name}
              </h2>
              <div className="mt-auto flex items-center gap-6">
                {isClosed ? (
                  <span className="text-sm font-medium text-slate-600">ESGOTADO</span>
                ) : (
                  <>
                    <span className="text-sm font-medium text-white">{formattedPrice}</span>
                    <span className="text-[#007BFF] text-sm font-mono tracking-widest group-hover:translate-x-2 transition-transform">
                      INSCREVER-SE &rarr;
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
