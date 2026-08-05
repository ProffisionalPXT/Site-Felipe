import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/admin-auth";
import { getDemoRegistrations, getDemoEvent, isDemoMode } from "@/lib/demo-data";
import { getActiveEvent, getEventById } from "@/lib/event";
import {
  computeStats,
  filterRegistrations,
} from "@/lib/registration-stats";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RegistrationRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json(
      {
        error: isDemoMode()
          ? "Senha incorreta. Use a senha do painel (ADMIN_PASSWORD)."
          : "Não autorizado.",
      },
      { status: 401 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status")?.trim() || "all";
  const category = sp.get("category")?.trim() || "all";
  const shirt = sp.get("shirt")?.trim() || "all";
  const eventId = sp.get("eventId")?.trim();

  if (isDemoMode()) {
    const all = [...getDemoRegistrations(eventId || getDemoEvent()?.id || "")];
    const filtered = filterRegistrations(all, { q, status, category, shirt });
    return NextResponse.json({
      demo: true,
      event: getDemoEvent(),
      registrations: filtered,
      stats: computeStats(all),
      stats_filtered: computeStats(filtered),
      filters: { q, status, category, shirt },
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const all = (data ?? []) as RegistrationRow[];
    const filtered = filterRegistrations(all, { q, status, category, shirt });

    return NextResponse.json({
      demo: false,
      event,
      registrations: filtered,
      stats: computeStats(all),
      stats_filtered: computeStats(filtered),
      filters: { q, status, category, shirt },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao listar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
