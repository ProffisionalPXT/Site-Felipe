import { getDemoEvent, isDemoMode, setDemoEvent } from "./demo-data";
import { getActiveEvent } from "./event";
import { getServiceSupabase, isSupabaseConfigured } from "./supabase";

export type PaymentMode = "mercadopago" | "manual_pix" | "demo";

export type PaymentSettings = {
  mode: PaymentMode;
  accept_pix: boolean;
  accept_card: boolean;
  /**
   * Percentual repassado no cartão sobre o valor do ingresso (após cupom).
   * Ex.: 5 = +5%. Pix não aplica.
   */
  card_fee_percent: number;
  /** Token completo só no servidor; no admin vem mascarado se já existir */
  mp_access_token: string;
  mp_token_configured: boolean;
  mp_token_hint: string;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | "";
  receiver_name: string;
  help_whatsapp: string;
  notes: string;
};

export type PaymentSettingsPublic = {
  accept_pix: boolean;
  accept_card: boolean;
  mode: PaymentMode;
  receiver_name: string;
  /** Só em modo manual_pix e se houver chave */
  has_manual_pix: boolean;
  /** % de taxa no cartão (0 = sem taxa extra) */
  card_fee_percent: number;
};

const DEFAULTS: PaymentSettings = {
  mode: "demo",
  accept_pix: true,
  accept_card: true,
  card_fee_percent: 5,
  mp_access_token: "",
  mp_token_configured: false,
  mp_token_hint: "",
  pix_key: "",
  pix_key_type: "",
  receiver_name: "",
  help_whatsapp: "",
  notes: "",
};

/** Normaliza % da taxa de cartão (0–30). */
export function clampCardFeePercent(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 30) return 30;
  return Math.round(n * 100) / 100;
}

/** Aplica taxa de cartão em centavos (arredonda para o centavo). */
export function applyCardFeeCents(
  baseCents: number,
  feePercent: number
): number {
  const p = clampCardFeePercent(feePercent);
  if (p <= 0 || baseCents <= 0) return Math.max(0, Math.round(baseCents));
  return Math.round(baseCents * (1 + p / 100));
}

// Estado demo em memória
let demoPayment: PaymentSettings = { ...DEFAULTS, mode: "demo" };

function maskToken(token: string): string {
  if (!token || token.length < 12) return token ? "••••••••" : "";
  return `${token.slice(0, 8)}…${token.slice(-4)}`;
}

function rowToSettings(row: Record<string, unknown>): PaymentSettings {
  const token = String(row.mp_access_token ?? "");
  const mode = (row.payment_mode as PaymentMode) || "manual_pix";
  const feeRaw = row.card_fee_percent;
  const fee =
    feeRaw === null || feeRaw === undefined || feeRaw === ""
      ? 5
      : clampCardFeePercent(feeRaw);
  return {
    mode: token ? "mercadopago" : mode === "mercadopago" ? "manual_pix" : mode,
    accept_pix: row.accept_pix !== false,
    accept_card: row.accept_card !== false,
    card_fee_percent: fee,
    mp_access_token: token,
    mp_token_configured: Boolean(token),
    mp_token_hint: token ? maskToken(token) : "",
    pix_key: String(row.pix_key ?? ""),
    pix_key_type: (row.pix_key_type as PaymentSettings["pix_key_type"]) || "",
    receiver_name: String(row.receiver_name ?? ""),
    help_whatsapp: String(row.help_whatsapp ?? ""),
    notes: String(row.payment_notes ?? ""),
  };
}

/** Settings para o admin (token mascarado na resposta se não for o valor novo). */
export async function getPaymentSettingsForAdmin(): Promise<PaymentSettings> {
  if (isDemoMode()) {
    return {
      ...demoPayment,
      mp_token_configured: Boolean(demoPayment.mp_access_token),
      mp_token_hint: demoPayment.mp_access_token
        ? maskToken(demoPayment.mp_access_token)
        : "",
      // não devolve token completo na listagem se já salvo — admin manda de novo se quiser trocar
      mp_access_token: "",
    };
  }

  if (!isSupabaseConfigured()) {
    return { ...DEFAULTS };
  }

  const event = await getActiveEvent();
  if (!event) return { ...DEFAULTS };

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(
      "payment_mode, accept_pix, accept_card, card_fee_percent, mp_access_token, pix_key, pix_key_type, receiver_name, help_whatsapp, payment_notes"
    )
    .eq("id", event.id)
    .single();

  if (error || !data) {
    // Colunas podem não existir ainda
    return { ...DEFAULTS, mode: "manual_pix" };
  }

  const s = rowToSettings(data as Record<string, unknown>);
  return {
    ...s,
    mp_access_token: "", // nunca manda o token de volta no GET
  };
}

/** Token real para processar pagamento (servidor). */
export async function getMercadoPagoAccessToken(): Promise<string | null> {
  // Prioridade: cadastro do organizador > env
  if (isDemoMode()) {
    return demoPayment.mp_access_token || process.env.MERCADOPAGO_ACCESS_TOKEN || null;
  }

  if (isSupabaseConfigured()) {
    try {
      const event = await getActiveEvent();
      if (event) {
        const supabase = getServiceSupabase();
        const { data } = await supabase
          .from("events")
          .select("mp_access_token, accept_pix, accept_card")
          .eq("id", event.id)
          .single();
        const token = data?.mp_access_token as string | undefined;
        if (token) return token;
      }
    } catch {
      /* ignore */
    }
  }

  return process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

export async function getPaymentSettingsPublic(): Promise<PaymentSettingsPublic> {
  if (isDemoMode()) {
    return {
      mode: "demo",
      accept_pix: demoPayment.accept_pix,
      accept_card: demoPayment.accept_card,
      receiver_name: demoPayment.receiver_name || "Organizador (demo)",
      has_manual_pix: Boolean(demoPayment.pix_key),
      card_fee_percent: demoPayment.card_fee_percent,
    };
  }

  const admin = await getPaymentSettingsForAdmin();
  // reload with token flag - getPaymentSettingsForAdmin strips token
  let hasMp = admin.mp_token_configured;
  let pixKey = admin.pix_key;
  let cardFee = admin.card_fee_percent;
  if (isSupabaseConfigured()) {
    try {
      const event = await getActiveEvent();
      if (event) {
        const supabase = getServiceSupabase();
        const { data } = await supabase
          .from("events")
          .select(
            "mp_access_token, pix_key, accept_pix, accept_card, payment_mode, receiver_name, card_fee_percent"
          )
          .eq("id", event.id)
          .single();
        if (data) {
          hasMp = Boolean(data.mp_access_token);
          pixKey = String(data.pix_key || "");
          cardFee =
            data.card_fee_percent === null || data.card_fee_percent === undefined
              ? 5
              : clampCardFeePercent(data.card_fee_percent);
          return {
            mode: hasMp ? "mercadopago" : (data.payment_mode as PaymentMode) || "manual_pix",
            accept_pix: data.accept_pix !== false,
            accept_card: data.accept_card !== false,
            receiver_name: String(data.receiver_name || ""),
            has_manual_pix: Boolean(pixKey),
            card_fee_percent: cardFee,
          };
        }
      }
    } catch {
      /* */
    }
  }

  return {
    mode: hasMp ? "mercadopago" : "manual_pix",
    accept_pix: admin.accept_pix,
    accept_card: admin.accept_card,
    receiver_name: admin.receiver_name,
    has_manual_pix: Boolean(pixKey),
    card_fee_percent: cardFee,
  };
}

export type PaymentSettingsUpdate = {
  mode: PaymentMode;
  accept_pix: boolean;
  accept_card: boolean;
  card_fee_percent: number;
  /** Se vazio e já havia token, mantém o antigo */
  mp_access_token?: string;
  clear_mp_token?: boolean;
  pix_key: string;
  pix_key_type: PaymentSettings["pix_key_type"];
  receiver_name: string;
  help_whatsapp: string;
  notes: string;
};

export async function savePaymentSettings(
  input: PaymentSettingsUpdate
): Promise<PaymentSettings> {
  if (isDemoMode()) {
    const nextToken = input.clear_mp_token
      ? ""
      : input.mp_access_token?.trim()
        ? input.mp_access_token.trim()
        : demoPayment.mp_access_token;

    demoPayment = {
      mode: nextToken ? "mercadopago" : input.mode === "mercadopago" ? "manual_pix" : input.mode,
      accept_pix: input.accept_pix,
      accept_card: input.accept_card,
      card_fee_percent: clampCardFeePercent(input.card_fee_percent),
      mp_access_token: nextToken,
      mp_token_configured: Boolean(nextToken),
      mp_token_hint: nextToken ? maskToken(nextToken) : "",
      pix_key: input.pix_key.trim(),
      pix_key_type: input.pix_key_type,
      receiver_name: input.receiver_name.trim(),
      help_whatsapp: input.help_whatsapp.trim(),
      notes: input.notes.trim(),
    };

    // reflete no evento demo o receiver se útil
    const ev = getDemoEvent();
    setDemoEvent({ ...ev });

    return {
      ...demoPayment,
      mp_access_token: "",
    };
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado.");
  }

  const event = await getActiveEvent();
  if (!event) throw new Error("Evento não encontrado.");

  const supabase = getServiceSupabase();
  const { data: current } = await supabase
    .from("events")
    .select("mp_access_token")
    .eq("id", event.id)
    .single();

  let token = (current?.mp_access_token as string) || "";
  if (input.clear_mp_token) token = "";
  else if (input.mp_access_token?.trim()) token = input.mp_access_token.trim();

  const mode: PaymentMode = token
    ? "mercadopago"
    : input.mode === "demo"
      ? "manual_pix"
      : input.mode;

  const { error } = await supabase
    .from("events")
    .update({
      payment_mode: mode,
      accept_pix: input.accept_pix,
      accept_card: input.accept_card,
      card_fee_percent: clampCardFeePercent(input.card_fee_percent),
      mp_access_token: token || null,
      pix_key: input.pix_key.trim() || null,
      pix_key_type: input.pix_key_type || null,
      receiver_name: input.receiver_name.trim() || null,
      help_whatsapp: input.help_whatsapp.trim() || null,
      payment_notes: input.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  if (error) {
    throw new Error(
      error.message.includes("column")
        ? "Falta rodar o schema.sql atualizado no Supabase (colunas de pagamento)."
        : error.message
    );
  }

  return getPaymentSettingsForAdmin();
}
