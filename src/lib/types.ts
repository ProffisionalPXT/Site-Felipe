export type RegistrationStatus = "pending" | "paid" | "cancelled" | "refunded";

export type EventRow = {
  id: string;
  name: string;
  description: string;
  regulations: string;
  event_date: string;
  start_time: string;
  location: string;
  city: string;
  price_cents: number;
  max_slots: number;
  registration_open: boolean;
  cover_image_url: string | null;
  cover_position_y: number;
  categories: string[];
  shirt_sizes: string[];
  /** Visual da home */
  theme_layout?: string;
  theme_font?: string;
  theme_color?: string;
  /** Contatos públicos (editáveis no admin) */
  contact_email?: string;
  contact_whatsapp?: string;
  contact_phone?: string;
  contact_instagram?: string;
  contact_facebook?: string;
  contact_youtube?: string;
  contact_tiktok?: string;
  /** Site de cronometragem / resultados / percursos */
  contact_timing_url?: string;
  contact_timing_label?: string;
  contact_kit_email?: string;
  contact_extra?: string;
  created_at: string;
  updated_at?: string;
};

export type EventImage = {
  id: string;
  event_id: string;
  url: string;
  storage_path: string;
  caption: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};

export type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  cpf: string;
  birth_date: string | null;
  phone: string;
  email: string;
  shirt_size: string;
  category: string;
  status: RegistrationStatus;
  payment_id: string | null;
  payment_method: string | null;
  amount_cents: number;
  created_at: string;
};

export type EventPublic = EventRow & {
  slots_remaining: number;
  paid_count: number;
  pending_count: number;
  images: EventImage[];
};

export type EventUpdateInput = {
  name: string;
  description: string;
  regulations: string;
  event_date: string;
  start_time: string;
  location: string;
  city: string;
  price_cents: number;
  max_slots: number;
  registration_open: boolean;
  categories: string[];
  shirt_sizes: string[];
  cover_image_url?: string | null;
};

/** Normaliza jsonb/array vindo do Postgres. */
export function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [...fallback];
}
