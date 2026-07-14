import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeCoupon,
  validateCouponCode,
} from "@/lib/coupons";
import { isDemoMode } from "@/lib/demo-data";
import { getActiveEvent, isValidCpf, onlyDigits } from "@/lib/event";
import {
  applyCardFeeCents,
  clampCardFeePercent,
  getPaymentSettingsPublic,
} from "@/lib/payment-settings";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

const bodySchema = z.object({
  full_name: z.string().min(3).max(120),
  cpf: z.string().min(11).max(14),
  birth_date: z.string().optional().nullable(),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  shirt_size: z.string().min(1).max(20),
  category: z.string().min(1).max(60),
  payment_method: z.enum(["pix", "card"]).optional(),
  coupon_code: z.string().max(40).optional().nullable(),
});

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
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const cpf = onlyDigits(data.cpf);

  async function resolvePrice(baseCents: number, cardFeePercent: number) {
    let amount = baseCents;
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: string | null = null;
    let cardFeeCents = 0;
    const feePct = clampCardFeePercent(cardFeePercent);

    if (data.coupon_code?.trim()) {
      const v = await validateCouponCode(data.coupon_code, baseCents);
      if (!v.ok) {
        return { error: v.error as string };
      }
      amount = v.final_cents;
      discount = v.discount_cents;
      couponCode = v.coupon.code;
      couponId = v.coupon.id;
    }

    const afterCoupon = amount;
    if ((data.payment_method || "pix") === "card" && feePct > 0) {
      amount = applyCardFeeCents(afterCoupon, feePct);
      cardFeeCents = amount - afterCoupon;
    }

    return {
      amount,
      discount,
      couponCode,
      couponId,
      cardFeeCents,
      cardFeePercent: feePct,
      afterCouponCents: afterCoupon,
    };
  }

  if (isDemoMode()) {
    if (cpf.length !== 11) {
      return NextResponse.json(
        { error: "Na demo, use CPF com 11 dígitos (ex: 529.982.247-25)." },
        { status: 400 }
      );
    }
    const ev = (await import("@/lib/demo-data")).getDemoEvent();
    const payPub = await getPaymentSettingsPublic();
    const priced = await resolvePrice(ev.price_cents, payPub.card_fee_percent);
    if ("error" in priced && priced.error) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }
    const {
      amount,
      discount,
      couponCode,
      couponId,
      cardFeeCents,
      cardFeePercent,
      afterCouponCents,
    } = priced as {
      amount: number;
      discount: number;
      couponCode: string | null;
      couponId: string | null;
      cardFeeCents: number;
      cardFeePercent: number;
      afterCouponCents: number;
    };

    if (couponId) await consumeCoupon(couponId);

    const id = crypto.randomUUID();
    return NextResponse.json({
      demo: true,
      registration: {
        id,
        event_id: ev.id,
        full_name: data.full_name.trim(),
        cpf,
        birth_date: data.birth_date || null,
        phone: onlyDigits(data.phone),
        email: data.email.trim().toLowerCase(),
        shirt_size: data.shirt_size,
        category: data.category,
        status: "pending",
        payment_id: null,
        payment_method: data.payment_method || "pix",
        amount_cents: amount,
        coupon_code: couponCode,
        discount_cents: discount,
        created_at: new Date().toISOString(),
      },
      event: {
        id: ev.id,
        name: ev.name,
        price_cents: ev.price_cents,
      },
      pricing: {
        original_cents: ev.price_cents,
        discount_cents: discount,
        after_coupon_cents: afterCouponCents,
        card_fee_cents: cardFeeCents,
        card_fee_percent: cardFeePercent,
        final_cents: amount,
        coupon_code: couponCode,
        payment_method: data.payment_method || "pix",
      },
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
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }
    if (!event.registration_open) {
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

    const payPub = await getPaymentSettingsPublic();
    const priced = await resolvePrice(
      event.price_cents,
      payPub.card_fee_percent
    );
    if ("error" in priced && priced.error) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }
    const {
      amount,
      discount,
      couponCode,
      couponId,
      cardFeeCents,
      cardFeePercent,
      afterCouponCents,
    } = priced as {
      amount: number;
      discount: number;
      couponCode: string | null;
      couponId: string | null;
      cardFeeCents: number;
      cardFeePercent: number;
      afterCouponCents: number;
    };

    const supabase = getServiceSupabase();

    const { data: existing } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("cpf", cpf)
      .maybeSingle();

    if (existing && existing.status !== "cancelled") {
      return NextResponse.json(
        { error: "Já existe inscrição com este CPF para este evento." },
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
      amount_cents: amount,
      payment_id: null,
      payment_method: data.payment_method || null,
      coupon_code: couponCode,
      discount_cents: discount,
    };

    const { data: registration, error } = existing
      ? await supabase
          .from("registrations")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await supabase.from("registrations").insert(payload).select("*").single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe inscrição com este CPF." },
          { status: 409 }
        );
      }
      throw error;
    }

    if (couponId) await consumeCoupon(couponId);

    return NextResponse.json({
      registration,
      event: {
        id: event.id,
        name: event.name,
        price_cents: event.price_cents,
      },
      pricing: {
        original_cents: event.price_cents,
        discount_cents: discount,
        after_coupon_cents: afterCouponCents,
        card_fee_cents: cardFeeCents,
        card_fee_percent: cardFeePercent,
        final_cents: amount,
        coupon_code: couponCode,
        payment_method: data.payment_method || "pix",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao inscrever";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
