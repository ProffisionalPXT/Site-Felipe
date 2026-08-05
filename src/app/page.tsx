"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import type { EventPublic } from "@/lib/types";

import { HomeLayoutOriginal } from "@/components/home-layouts/HomeLayoutOriginal";
import { HomeLayoutGlass } from "@/components/home-layouts/HomeLayoutGlass";
import { HomeLayoutMinimal } from "@/components/home-layouts/HomeLayoutMinimal";
import { HomeLayout3D } from "@/components/home-layouts/HomeLayout3D";
import { HomeLayoutWide } from "@/components/home-layouts/HomeLayoutWide";

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayout, setActiveLayout] = useState<string>("original");

  useEffect(() => {
    // Carregar configuração do layout do site (salvo no Admin)
    const savedLayout = localStorage.getItem("nexora_site_layout");
    if (savedLayout) {
      setActiveLayout(savedLayout);
    } else {
      setActiveLayout("wide"); // O mais novo como default
    }

    fetch("/api/event", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Erro ao carregar");
        
        const evs = data.events || [];
        setEvents(evs);
        
        if (evs.length === 1) {
          router.push(`/evento/\${evs[0].id}`);
        } else {
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-full flex flex-col bg-[#020813] text-white font-sans relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#041630] to-transparent pointer-events-none -z-10" />

      <SiteHeader solid={true} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-16 pb-24 relative z-10">
        <div className="text-center mb-16 relative">
          {/* Subtle glow behind title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-[#007BFF]/20 blur-[100px] rounded-full -z-10" />
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white drop-shadow-lg uppercase">
            Eventos Nexora
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            Tecnologia que conecta experiências únicas. Descubra seu próximo evento.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-[#007BFF] animate-pulse font-bold tracking-widest text-lg uppercase">Carregando eventos...</p>
          </div>
        )}

        {error && (
          <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-20 text-slate-500 text-lg">
            Nenhum evento disponível no momento.
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="relative">
            {activeLayout === "glass" && <HomeLayoutGlass events={events} />}
            {activeLayout === "minimal" && <HomeLayoutMinimal events={events} />}
            {activeLayout === "3d" && <HomeLayout3D events={events} />}
            {activeLayout === "wide" && <HomeLayoutWide events={events} />}
            {(activeLayout === "original" || !["glass", "minimal", "3d", "wide"].includes(activeLayout)) && (
              <HomeLayoutOriginal events={events} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
