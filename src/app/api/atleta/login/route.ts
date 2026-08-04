import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  hashAthletePassword,
  isValidAthletePassword,
  verifyAthletePassword,
} from "@/lib/athlete-auth";
import { DEMO_REGISTRATIONS, getDemoEvent, isDemoMode } from "@/lib/demo-data";
import { getActiveEvent, getEventById, isValidCpf, onlyDigits } from "@/lib/event";
import { formatBRL } from "@/lib/format";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RegistrationRow } from "@/lib/types";

const bodySchema = z.object({
  event_id: z.string().uuid().optional(),
  cpf: z.string().min(11).max(14),
  password: z.string().min(4).max(72),
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago · confirmado",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

function toPublic(
  r: RegistrationRow & { access_password_hash?: string | null },
  eventName: string,
  eventDate: string,
  location: string,
  city: string
) {
  return {
    id: r.id,
    full_name: r.full_name,
    cpf_masked: maskCpf(r.cpf),
    category: r.category,
    shirt_size: r.shirt_size,
    status: r.status,
    status_label: STATUS_LABEL[r.status] || r.status,
    payment_method: r.payment_method,
    amount_cents: r.amount_cents,
    amount_label: formatBRL(r.amount_cents),
    created_at: r.created_at,
    event_name: eventName,
    event_date: eventDate,
    location,
    city,
    has_receipt: r.status === "paid",
    can_pay: r.status === "pending",
  };
}

function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return "***.***.***-**";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

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
      { error: "Informe CPF e senha (mín. 4 caracteres)." },
      { status: 400 }
    );
  }

  const cpf = onlyDigits(parsed.data.cpf);
  const password = parsed.data.password;
  const eventId = parsed.data.event_id;

  if (cpf.length !== 11) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }
  if (!isValidAthletePassword(password)) {
    return NextResponse.json(
      { error: "Senha inválida (4 a 72 caracteres)." },
      { status: 400 }
    );
  }

  const fail = () =>
    NextResponse.json(
      {
        error:
          "CPF ou senha incorretos, ou não há inscrição com acesso. Só quem já se inscreveu no evento consegue entrar.",
      },
      { status: 401 }
    );

  if (isDemoMode()) {
    if (cpf.length !== 11) return fail();
    const ev = getDemoEvent();
    const demoHash = hashAthletePassword("1234");
    // Demo: senha fixa 1234 para CPFs das inscrições demo, ou qualquer se criar nova
    const regs = DEMO_REGISTRATIONS.filter((r) => onlyDigits(r.cpf) === cpf);
    if (regs.length === 0) return fail();
    if (!verifyAthletePassword(password, demoHash) && password !== "1234") {
      // aceita 1234 na demo
      if (password.trim() !== "1234") return fail();
    }
    return NextResponse.json({
      ok: true,
      demo: true,
      cpf_masked: maskCpf(cpf),
      registrations: regs.map((r) =>
        toPublic(r, ev.name, ev.event_date, ev.location, ev.city)
      ),
    });
  }

  if (!isValidCpf(cpf)) return fail();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Sistema ainda não configurado." },
      { status: 503 }
    );
  }

  try {
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado ou inativo." }, { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("event_id", event.id)
      .eq("cpf", cpf)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    const regs = (data || []) as (RegistrationRow & {
      access_password_hash?: string | null;
    })[];

    if (regs.length === 0) return fail();

    // Precisa ter senha cadastrada e bater em pelo menos uma inscrição do CPF
    const withPass = regs.filter((r) => r.access_password_hash);
    if (withPass.length === 0) {
      return NextResponse.json(
        {
          error:
            "Esta inscrição ainda não tem senha de acesso. Faça a inscrição de novo definindo uma senha, ou fale com o organizador.",
        },
        { status: 401 }
      );
    }

    const ok = withPass.some((r) =>
      verifyAthletePassword(password, r.access_password_hash)
    );
    if (!ok) return fail();

    return NextResponse.json({
      ok: true,
      demo: false,
      cpf_masked: maskCpf(cpf),
      registrations: regs.map((r) =>
        toPublic(
          r,
          event.name,
          event.event_date,
          event.location,
          event.city
        )
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
