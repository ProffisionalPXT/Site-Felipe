import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_REGISTRATIONS, getDemoEvent, isDemoMode } from "@/lib/demo-data";
import { getActiveEvent, isValidCpf, onlyDigits } from "@/lib/event";
import { formatBRL } from "@/lib/format";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RegistrationRow } from "@/lib/types";

const bodySchema = z.object({
  cpf: z.string().min(11).max(14),
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago · confirmado",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

function publicReg(
  r: RegistrationRow,
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
    /** Só quem pagou tem “comprovante” oficial */
    has_receipt: r.status === "paid",
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
    return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 });
  }

  const cpf = onlyDigits(parsed.data.cpf);
  if (cpf.length !== 11) {
    return NextResponse.json(
      { error: "CPF deve ter 11 dígitos." },
      { status: 400 }
    );
  }

  if (isDemoMode()) {
    // Demo: validação de CPF relaxada; filtra inscrições demo
    const ev = getDemoEvent();
    const regs = DEMO_REGISTRATIONS.filter((r) => onlyDigits(r.cpf) === cpf);
    // Se não achar, ainda permite ver mensagem clara
    return NextResponse.json({
      ok: true,
      demo: true,
      cpf_masked: maskCpf(cpf),
      registrations: regs.map((r) =>
        publicReg(
          r,
          ev.name,
          ev.event_date,
          ev.location,
          ev.city
        )
      ),
    });
  }

  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Sistema ainda não configurado." },
      { status: 503 }
    );
  }

  try {
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { error: "Nenhum evento ativo." },
        { status: 404 }
      );
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

    const regs = (data || []) as RegistrationRow[];

    return NextResponse.json({
      ok: true,
      demo: false,
      cpf_masked: maskCpf(cpf),
      registrations: regs.map((r) =>
        publicReg(
          r,
          event.name,
          event.event_date,
          event.location,
          event.city
        )
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na consulta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
