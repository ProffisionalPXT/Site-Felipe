export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPassword } from "@/lib/admin-auth";
import { getDemoEvent, getDemoEvents, addDemoEvent, isDemoMode, setDemoEvent } from "@/lib/demo-data";
import { getActiveEvent, getEventById } from "@/lib/event";
import { getPaymentSettingsPublic } from "@/lib/payment-settings";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { resolveColor, resolveFont, resolveLayout } from "@/lib/themes";

export async function GET(req: NextRequest) {
  if (isDemoMode()) {
    const payment = await getPaymentSettingsPublic();
    return NextResponse.json({
      configured: true,
      demo: true,
      event: getDemoEvent(req.nextUrl.searchParams.get("eventId") || undefined),
      events: getDemoEvents(),
      payment,
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Supabase ainda não configurado. Siga o README e preencha o .env.local",
      },
      { status: 503 }
    );
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const event = await getEventById(id);
      if (!event) {
        return NextResponse.json(
          { configured: true, error: "Evento não encontrado." },
          { status: 404 }
        );
      }
      const payment = await getPaymentSettingsPublic(id);
      return NextResponse.json({ configured: true, demo: false, event, payment });
    } else {
      const { getAllEvents } = await import("@/lib/event");
      const events = await getAllEvents();
      return NextResponse.json({ configured: true, demo: false, events });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar evento";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(160),
  description: z.string().max(8000).optional().default(""),
  regulations: z.string().max(12000).optional().default(""),
  event_date: z.string().min(8),
  start_time: z.string().min(1).max(20).optional().default("07:00"),
  location: z.string().max(300).optional().default(""),
  city: z.string().max(120).optional().default(""),
  price_cents: z.coerce.number().int().min(0).max(10_000_000),
  max_slots: z.coerce.number().int().min(1).max(100_000),
  registration_open: z.boolean(),
  categories: z.array(z.string()).min(1).max(40),
  shirt_sizes: z.array(z.string()).min(1).max(20),
  cover_image_url: z.string().nullable().optional(),
  // Aceita IDs antigos e novos; normaliza com resolveLayout/resolveFont
  theme_layout: z.string().optional(),
  theme_font: z.string().optional(),
  theme_color: z.string().optional(),
  contact_email: z.string().max(200).optional(),
  contact_whatsapp: z.string().max(40).optional(),
  contact_phone: z.string().max(40).optional(),
  contact_instagram: z.string().max(120).optional(),
  contact_facebook: z.string().max(200).optional(),
  contact_youtube: z.string().max(200).optional(),
  contact_tiktok: z.string().max(120).optional(),
  contact_timing_url: z.string().max(500).optional(),
  contact_timing_label: z.string().max(120).optional(),
  contact_kit_email: z.string().max(200).optional(),
  contact_extra: z.string().max(500).optional(),
});

export async function PUT(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldMsgs = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${(v || []).join(", ")}`)
      .join(" · ");
    return NextResponse.json(
      {
        error: fieldMsgs
          ? `Dados inválidos (${fieldMsgs})`
          : "Dados inválidos. Confira nome, data, preço, vagas e categorias.",
        details: flat,
      },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const theme_layout = resolveLayout(body.theme_layout);
  const theme_font = resolveFont(body.theme_font);
  const theme_color = resolveColor(body.theme_color);
  const contacts = {
    contact_email: (body.contact_email ?? "").trim(),
    contact_whatsapp: (body.contact_whatsapp ?? "").trim(),
    contact_phone: (body.contact_phone ?? "").trim(),
    contact_instagram: (body.contact_instagram ?? "").trim(),
    contact_facebook: (body.contact_facebook ?? "").trim(),
    contact_youtube: (body.contact_youtube ?? "").trim(),
    contact_tiktok: (body.contact_tiktok ?? "").trim(),
    contact_timing_url: (body.contact_timing_url ?? "").trim(),
    contact_timing_label:
      (body.contact_timing_label ?? "").trim() ||
      "Cronometragem e percursos",
    contact_kit_email: (body.contact_kit_email ?? "").trim(),
    contact_extra: (body.contact_extra ?? "").trim(),
  };
  const categories = body.categories.map((c) => c.trim()).filter(Boolean);
  const shirt_sizes = body.shirt_sizes.map((s) => s.trim()).filter(Boolean);
  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos 1 categoria." },
      { status: 400 }
    );
  }
  if (shirt_sizes.length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos 1 tamanho de camiseta." },
      { status: 400 }
    );
  }

  if (isDemoMode()) {
    const current = getDemoEvent(body.id);
    const next = {
      ...current,
      name: body.name.trim(),
      description: (body.description || "").trim(),
      regulations: (body.regulations || "").trim(),
      event_date: body.event_date,
      start_time: (body.start_time || "07:00").trim(),
      location: (body.location || "").trim(),
      city: (body.city || "").trim(),
      price_cents: body.price_cents,
      max_slots: body.max_slots,
      registration_open: body.registration_open,
      categories,
      shirt_sizes,
      theme_layout,
      theme_font,
      theme_color,
      ...contacts,
      cover_image_url:
        body.cover_image_url === undefined
          ? current.cover_image_url
          : body.cover_image_url,
      slots_remaining: Math.max(
        0,
        body.max_slots - current.paid_count - current.pending_count
      ),
    };
    setDemoEvent(next);
    return NextResponse.json({
      ok: true,
      demo: true,
      event: next,
      message:
        "Salvo com sucesso! Abra a home e atualize a página (F5) para ver as mudanças.",
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const eventId = body.id;
    const current = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!current) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("events")
      .update({
        name: body.name.trim(),
        description: (body.description || "").trim(),
        regulations: (body.regulations || "").trim(),
        event_date: body.event_date,
        start_time: (body.start_time || "07:00").trim(),
        location: (body.location || "").trim(),
        city: (body.city || "").trim(),
        price_cents: body.price_cents,
        max_slots: body.max_slots,
        registration_open: body.registration_open,
        categories,
        shirt_sizes,
        theme_layout,
        theme_font,
        theme_color,
        ...contacts,
        cover_image_url:
          body.cover_image_url === undefined
            ? current.cover_image_url
            : body.cover_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("*")
      .single();

    if (error) throw error;

    const event = await getEventById(current.id);
    return NextResponse.json({ ok: true, demo: false, event, raw: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar evento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (isDemoMode()) {
    const newId = crypto.randomUUID();
    const newEvent = {
      ...getDemoEvent(),
      id: newId,
      name: "Novo Evento",
      event_date: new Date().toISOString().split("T")[0],
      price_cents: 0,
      max_slots: 500,
      registration_open: false,
      categories: ["5K", "10K"],
      shirt_sizes: ["P", "M", "G"],
    };
    addDemoEvent(newEvent);
    return NextResponse.json({ ok: true, event: newEvent });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const supabase = getServiceSupabase();
    
    // Insere um evento vazio com dados default
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: "Novo Evento",
        event_date: new Date().toISOString().split("T")[0], // Hoje
        price_cents: 0,
        max_slots: 500,
        registration_open: false,
        categories: ["5K", "10K"],
        shirt_sizes: ["P", "M", "G"],
      })
      .select("*")
      .single();

    if (error) throw error;
    
    // Retorna o novo evento para o frontend poder redirecionar e editar
    return NextResponse.json({ ok: true, event: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar evento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

