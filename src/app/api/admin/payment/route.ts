import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminPassword } from "@/lib/admin-auth";
import {
  getPaymentSettingsForAdmin,
  savePaymentSettings,
} from "@/lib/payment-settings";

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const settings = await getPaymentSettingsForAdmin();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const bodySchema = z.object({
  mode: z.enum(["mercadopago", "manual_pix", "demo"]),
  accept_pix: z.boolean(),
  accept_card: z.boolean(),
  /** 0–30; padrão 5 */
  card_fee_percent: z.coerce.number().min(0).max(30).optional(),
  mp_access_token: z.string().optional(),
  clear_mp_token: z.boolean().optional(),
  pix_key: z.string().max(200),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random", ""]),
  receiver_name: z.string().max(120),
  help_whatsapp: z.string().max(30),
  notes: z.string().max(2000),
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const b = parsed.data;
  if (!b.accept_pix && !b.accept_card) {
    return NextResponse.json(
      { error: "Ative pelo menos uma forma: Pix ou cartão." },
      { status: 400 }
    );
  }

  try {
    const settings = await savePaymentSettings({
      mode: b.mode,
      accept_pix: b.accept_pix,
      accept_card: b.accept_card,
      card_fee_percent:
        b.card_fee_percent === undefined ? 5 : b.card_fee_percent,
      mp_access_token: b.mp_access_token,
      clear_mp_token: b.clear_mp_token,
      pix_key: b.pix_key,
      pix_key_type: b.pix_key_type,
      receiver_name: b.receiver_name,
      help_whatsapp: b.help_whatsapp,
      notes: b.notes,
    });
    return NextResponse.json({
      ok: true,
      settings,
      message: "Recebimento salvo. O site usará essas configurações.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
