"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDateBR } from "@/lib/format";
import type { EventPublic } from "@/lib/types";

export default function HomePage() {
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/event")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro ao carregar");
        setEvents(data.events || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
      <SiteHeader solid={true} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Eventos Disponíveis
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Escolha sua próxima corrida, garanta seu kit e supere seus limites.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-slate-500 animate-pulse font-medium">Carregando eventos...</p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Nenhum evento disponível no momento.
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((ev) => {
              const isClosed = !ev.registration_open || ev.slots_remaining <= 0;
              
              return (
                <Link
                  key={ev.id}
                  href={`/evento/${ev.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] w-full bg-slate-200 overflow-hidden">
                    {ev.cover_image_url ? (
                      <img
                        src={ev.cover_image_url}
                        alt={ev.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 font-medium">
                        Sem Foto
                      </div>
                    )}
                    
                    {isClosed && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                        <span className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white uppercase tracking-wider">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand">
                        {formatDateBR(ev.event_date)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {ev.city}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-bold leading-tight mb-2 group-hover:text-brand transition-colors">
                      {ev.name}
                    </h2>
                    
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">
                        A partir de <strong className="text-slate-900">{(ev.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                      </p>
                      
                      {!isClosed && (
                        <span className="rounded-full bg-brand/10 text-brand px-4 py-1.5 text-sm font-bold transition-colors group-hover:bg-brand group-hover:text-white">
                          Inscrever-se
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
