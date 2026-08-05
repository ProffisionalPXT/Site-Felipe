const fs = require('fs');
const path = require('path');

const dir = 'src/components/home-layouts';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// 1. Original Layout
const original = `"use client";
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
            href={\`/evento/\${ev.id}\`}
            className="group relative flex flex-col overflow-hidden rounded-3xl bg-slate-800 transition-all hover:shadow-[0_0_40px_rgba(255,107,0,0.15)] hover:-translate-y-1 h-[400px] w-full"
          >
            {ev.cover_image_url ? (
              <img
                src={ev.cover_image_url}
                alt={ev.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
`;

// 2. Glass Layout
const glass = `"use client";
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
            href={\`/evento/\${ev.id}\`}
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
`;

// 3. Minimal Layout
const minimal = `"use client";
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
            href={\`/evento/\${ev.id}\`}
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
                      INSCREVER-SE ->
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
`;

// 4. 3D Layout
const d3 = `"use client";
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
            href={\`/evento/\${ev.id}\`}
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
`;

// 5. Wide Layout
const wide = `"use client";
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
            href={\`/evento/\${ev.id}\`}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#007BFF]/20 bg-[#041630] shadow-[0_0_20px_rgba(0,123,255,0.05)] transition-all hover:border-[#007BFF]/60 hover:shadow-[0_0_30px_rgba(0,123,255,0.15)] h-[320px] w-full"
          >
            <div className="absolute inset-0 w-full h-full">
              {ev.cover_image_url ? (
                <img src={ev.cover_image_url} alt={ev.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60" />
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
`;

fs.writeFileSync(path.join(dir, 'HomeLayoutOriginal.tsx'), original);
fs.writeFileSync(path.join(dir, 'HomeLayoutGlass.tsx'), glass);
fs.writeFileSync(path.join(dir, 'HomeLayoutMinimal.tsx'), minimal);
fs.writeFileSync(path.join(dir, 'HomeLayout3D.tsx'), d3);
fs.writeFileSync(path.join(dir, 'HomeLayoutWide.tsx'), wide);

console.log("Vitrines criadas, incluindo HomeLayoutWide");
