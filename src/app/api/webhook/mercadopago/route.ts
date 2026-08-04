import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMercadoPagoAccessToken } from "@/lib/payment-settings";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { getEventById } from "@/lib/event";
/**
 * Webhook Mercado Pago — marca inscrição como paga quando o pagamento é approved.
 * Configure a URL: https://SEU_SITE/api/webhook/mercadopago
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId") || undefined;
  const token = await getMercadoPagoAccessToken(eventId);
  
  if (!token) {
    return NextResponse.json({ ok: false, error: "no token" }, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string };
    };

    const paymentId = body?.data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const client = new MercadoPagoConfig({ accessToken: token });
    const paymentApi = new Payment(client);
    const payment = await paymentApi.get({ id: paymentId });

    const externalRef = payment.external_reference;
    const status = payment.status;

    if (!externalRef) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (status === "approved") {
      const supabase = getServiceSupabase();
      const { data: updatedReg } = await supabase
        .from("registrations")
        .update({
          status: "paid",
          payment_id: String(paymentId),
          payment_method: payment.payment_type_id ?? "mercadopago",
        })
        .eq("id", externalRef)
        .select("id, email, full_name, event_id, amount_cents, status")
        .single();

      // Dispara o email transacional
      if (updatedReg && updatedReg.email) {
        const ev = await getEventById(updatedReg.event_id);
        if (ev) {
          await sendPaymentConfirmationEmail({
            email: updatedReg.email,
            fullName: updatedReg.full_name,
            eventName: ev.name,
            amountCents: updatedReg.amount_cents,
            registrationId: updatedReg.id,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("webhook mercadopago", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "mercadopago-webhook" });
}
