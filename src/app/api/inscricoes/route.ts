export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  hashAthletePassword,
  isValidAthletePassword,
} from "@/lib/athlete-auth";
import { isDemoMode, addDemoRegistration, getDemoEvent, setDemoEvent } from "@/lib/demo-data";
import { getActiveEvent, getEventById, isValidCpf, onlyDigits } from "@/lib/event";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

const bodySchema = z.object({
  event_id: z.string().uuid().optional(),
  full_name: z.string().min(3).max(120),
  cpf: z.string().min(11).max(14),
  birth_date: z.string().optional().nullable(),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  shirt_size: z.string().min(1).max(20),
  category: z.string().min(1).max(60),
  /** Senha da área do atleta (obrigatória na inscrição) */
  access_password: z.string().min(4).max(72),
});

/**
 * Cria só a inscrição (cadastro). Pagamento é em /comprar.
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Confira os campos e a senha (mín. 4 caracteres)." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const cpf = onlyDigits(data.cpf);

  if (!isValidAthletePassword(data.access_password)) {
    return NextResponse.json(
      { error: "Senha de acesso: entre 4 e 72 caracteres." },
      { status: 400 }
    );
  }

  const passwordHash = hashAthletePassword(data.access_password);

  if (isDemoMode()) {
    if (cpf.length !== 11) {
      return NextResponse.json(
        { error: "Na demo, use CPF com 11 dígitos (ex: 529.982.247-25)." },
        { status: 400 }
      );
    }
    const ev = (await import("@/lib/demo-data")).getDemoEvent();
    if (!ev) return NextResponse.json({ error: "Evento demo não encontrado" }, { status: 500 });
    const id = crypto.randomUUID();
    return NextResponse.json({
      demo: true,
      registration: {
        id,
        event_id: (ev?.id || ""),
        full_name: data.full_name.trim(),
        cpf,
        birth_date: data.birth_date || null,
        phone: onlyDigits(data.phone),
        email: data.email.trim().toLowerCase(),
        shirt_size: data.shirt_size,
        category: data.category,
        status: "pending",
        payment_id: null,
        payment_method: null,
        amount_cents: (ev?.price_cents || 0),
        coupon_code: null,
        discount_cents: 0,
        created_at: new Date().toISOString(),
      },
      event: {
        id: ev.id,
        name: ev.name,
        price_cents: ev.price_cents,
      },
      message:
        "Inscrição registrada. Use seu CPF em Meu ingresso e depois Comprar para pagar.",
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 503 }
    );
  }

  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }

  try {
    const eventId = data.event_id;
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { error: "Nenhum evento configurado ou encontrado." },
        { status: 400 }
      );
    }if (!event.registration_open) {
      return NextResponse.json({ error: "Inscrições fechadas." }, { status: 403 });
    }
    if (event.slots_remaining <= 0) {
      return NextResponse.json({ error: "Não há mais vagas." }, { status: 409 });
    }

    if (!event.categories.includes(data.category)) {
      return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    }
    if (!event.shirt_sizes.includes(data.shirt_size)) {
      return NextResponse.json({ error: "Tamanho de camiseta inválido." }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from("registrations")
      .select("id, status, access_password_hash")
      .eq("event_id", event.id)
      .eq("cpf", cpf)
      .maybeSingle();

    if (existing && existing.status !== "cancelled") {
      return NextResponse.json(
        {
          error:
          "Já existe inscrição com este CPF. Entre em Meu ingresso com seu CPF, ou use Comprar para pagar.",
        },
        { status: 409 }
      );
    }

    const payload = {
      event_id: event.id,
      full_name: data.full_name.trim(),
      cpf,
      birth_date: data.birth_date || null,
      phone: onlyDigits(data.phone),
      email: data.email.trim().toLowerCase(),
      shirt_size: data.shirt_size,
      category: data.category,
      status: "pending" as const,
      amount_cents: event.price_cents,
      payment_id: null,
      payment_method: null,
      coupon_code: null,
      discount_cents: 0,
      access_password_hash: passwordHash,
    };

    const { data: registration, error } = existing
      ? await supabase
          .from("registrations")
          .update(payload)
          .eq("id", existing.id)
          .select(
            "id, event_id, full_name, cpf, birth_date, phone, email, shirt_size, category, status, payment_id, payment_method, amount_cents, created_at"
          )
          .single()
      : await supabase
          .from("registrations")
          .insert(payload)
          .select(
            "id, event_id, full_name, cpf, birth_date, phone, email, shirt_size, category, status, payment_id, payment_method, amount_cents, created_at"
          )
          .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe inscrição com este CPF." },
          { status: 409 }
        );
      }
      if (error.message?.includes("access_password_hash") || error.message?.includes("column")) {
        return NextResponse.json(
          {
            error:
              "Falta rodar no Supabase o SQL: alter table registrations add column if not exists access_password_hash text;",
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      registration,
      event: {
        id: event.id,
        name: event.name,
        price_cents: event.price_cents,
      },
      message:
        "Inscrição registrada. Entre em Meu ingresso (apenas CPF) e use Comprar para pagar.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao inscrever";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
