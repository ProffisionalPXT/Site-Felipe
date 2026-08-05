import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyAthletePassword,
} from "@/lib/athlete-auth";
import { getActiveEvent, getEventById, isValidCpf, onlyDigits } from "@/lib/event";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isDemoMode, getDemoEvent } from "@/lib/demo-data";
import { validateCouponCode } from "@/lib/coupons";

const bodySchema = z.object({
  cpf: z.string().min(11).max(14),
  password: z.string().min(4).max(72),
  category: z.string().min(1).max(60),
  shirt_size: z.string().min(1).max(20),
  coupon_code: z.string().optional(),
});

/**
 * Atleta logado atualiza categoria/camiseta antes de pagar.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const cpf = onlyDigits(parsed.data.cpf);
  const { password, category, shirt_size, coupon_code } = parsed.data;

  if (isDemoMode()) {
    let finalAmount = getDemoEvent()?.price_cents || 0;
    if (coupon_code) {
      const v = await validateCouponCode(coupon_code, finalAmount);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      finalAmount = v.final_cents!;
    }
    return NextResponse.json({
      ok: true,
      demo: true,
      registration: {
        id,
        category,
        shirt_size,
        status: "pending",
        amount_cents: finalAmount,
      },
    });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Não configurado." }, { status: 503 });
  }
  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: reg, error } = await supabase
      .from("registrations")
      .select("id, event_id, cpf, status, access_password_hash, amount_cents")
      .eq("id", id)
      .maybeSingle();

    if (error || !reg) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    const event = await getEventById(reg.event_id);
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }
    if (!event.categories.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    }
    if (!event.shirt_sizes.includes(shirt_size)) {
      return NextResponse.json({ error: "Tamanho inválido." }, { status: 400 });
    }

    if (onlyDigits(String(reg.cpf)) !== cpf) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    if (!verifyAthletePassword(password, reg.access_password_hash as string)) {
      return NextResponse.json({ error: "CPF ou senha incorretos." }, { status: 401 });
    }
    if (reg.status !== "pending") {
      return NextResponse.json(
        { error: "Esta inscrição não está aguardando pagamento." },
        { status: 400 }
      );
    }

    let finalAmount = event.price_cents;
    let validCouponCode: string | null = null;
    let discountCents = 0;
    
    if (coupon_code) {
      const v = await validateCouponCode(coupon_code, event.price_cents);
      if (!v.ok) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      finalAmount = v.final_cents!;
      validCouponCode = v.coupon!.code;
      discountCents = v.discount_cents!;
    }

    const { data: updated, error: upErr } = await supabase
      .from("registrations")
      .update({
        category,
        shirt_size,
        amount_cents: finalAmount,
        coupon_code: validCouponCode,
        discount_cents: discountCents,
      })
      .eq("id", id)
      .select("id, category, shirt_size, status, amount_cents")
      .single();

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, registration: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
