import type { EventPublic, RegistrationRow } from "./types";

/** Dados fictícios só para prévia visual (sem Supabase). */
export const DEMO_EVENT_INITIAL: EventPublic = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Corrida Noturna da Cidade 2026",
  description:
    "Uma noite de energia, música e superação. Percurso iluminado, kit premium com camiseta dry-fit, medalha finisher e hidratação nos postos.\n\nIdeal para quem quer viver a emoção de uma corrida com estrutura profissional — do tipo bilheteria digital, simples e rápido de garantir a vaga.",
  regulations:
    "• Idade mínima: 16 anos (menores com autorização).\n• Inscrição pessoal e intransferível.\n• Uso de fone de ouvido sob responsabilidade do atleta.\n• Kit deve ser retirado no local nos dias informados pelo organizador.\n• Em caso de chuva o evento ocorre normalmente, salvo determinação oficial.",
  event_date: "2026-09-20",
  start_time: "19:30",
  location: "Parque da Cidade — Portão Principal",
  city: "Sua Cidade / UF",
  price_cents: 8900,
  max_slots: 500,
  registration_open: true,
  cover_image_url:
    "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1600&q=80",
  categories: ["5K", "10K", "Caminhada 3K"],
  shirt_sizes: ["PP", "P", "M", "G", "GG", "XG"],
  theme_layout: "bilheteria",
  theme_font: "geist",
  theme_color: "laranja",
  contact_email: "contato@seuevento.com.br",
  contact_whatsapp: "11999998888",
  contact_phone: "1133334444",
  contact_instagram: "@seuevento",
  contact_facebook: "",
  contact_youtube: "",
  contact_tiktok: "",
  contact_timing_url: "https://www.example.com/cronometragem",
  contact_timing_label: "Cronometragem, resultados e percursos",
  contact_kit_email: "kit@seuevento.com.br",
  contact_extra: "Atendimento de seg a sex, 9h às 18h",
  created_at: new Date().toISOString(),
  slots_remaining: 0, // recalculado abaixo após montar inscritos
  paid_count: 0,
  pending_count: 0,
  images: [
    {
      id: "img-1",
      event_id: "00000000-0000-4000-8000-000000000001",
      url: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=80",
      storage_path: "demo/1.jpg",
      caption: "Largada",
      sort_order: 0,
      is_cover: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "img-2",
      event_id: "00000000-0000-4000-8000-000000000001",
      url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80",
      storage_path: "demo/2.jpg",
      caption: "Percurso",
      sort_order: 1,
      is_cover: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "img-3",
      event_id: "00000000-0000-4000-8000-000000000001",
      url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80",
      storage_path: "demo/3.jpg",
      caption: "Atletas",
      sort_order: 2,
      is_cover: false,
      created_at: new Date().toISOString(),
    },
    {
      id: "img-4",
      event_id: "00000000-0000-4000-8000-000000000001",
      url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1200&q=80",
      storage_path: "demo/4.jpg",
      caption: "Chegada",
      sort_order: 3,
      is_cover: false,
      created_at: new Date().toISOString(),
    },
  ],
};

const FIRST = [
  "Ana", "Bruno", "Carla", "Diego", "Elena", "Felipe", "Gabriela", "Hugo",
  "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olivia", "Pedro",
  "Rafaela", "Samuel", "Tatiane", "Ulisses", "Vanessa", "Wagner", "Yasmin", "Zeca",
  "Beatriz", "Caio", "Daniela", "Eduardo", "Fernanda", "Gustavo", "Helena", "Igor",
];
const LAST = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida",
  "Nascimento", "Rodrigues", "Ferreira", "Alves", "Ribeiro", "Carvalho", "Gomes",
  "Martins", "Araújo", "Melo", "Barbosa", "Rocha",
];
const CATEGORIES = ["5K", "10K", "Caminhada 3K"] as const;
const SIZES = ["PP", "P", "M", "G", "GG", "XG"] as const;
const STATUSES = ["paid", "paid", "paid", "paid", "pending", "pending", "cancelled"] as const;

function buildDemoRegistrations(count: number): RegistrationRow[] {
  const rows: RegistrationRow[] = [];
  for (let i = 0; i < count; i++) {
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[i % LAST.length];
    const cat = CATEGORIES[i % 3 === 0 ? 1 : i % 5 === 0 ? 2 : 0]; // mais 5K e 10K
    // distribuição camisetas: mais M e G
    const sizeWeights = [0, 1, 2, 2, 2, 3, 3, 4, 5];
    const shirt = SIZES[sizeWeights[i % sizeWeights.length]];
    const status = STATUSES[i % STATUSES.length];
    const cpfBase = String(10000000000 + i * 137).slice(0, 11);

    rows.push({
      id: `reg-demo-${i + 1}`,
      event_id: DEMO_EVENT_INITIAL.id,
      full_name: `${fn} ${ln}`,
      cpf: cpfBase,
      birth_date: `19${70 + (i % 30)}-${String((i % 12) + 1).padStart(2, "0")}-15`,
      phone: `11${900000000 + i}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@email.com`,
      shirt_size: shirt,
      category: cat,
      status,
      payment_id: status === "paid" ? `pay-${i}` : null,
      payment_method: status === "paid" ? (i % 2 === 0 ? "pix" : "card") : null,
      amount_cents: 8900,
      created_at: new Date(Date.now() - i * 3600_000 * 5).toISOString(),
    });
  }
  return rows;
}

/** ~200 inscritos de exemplo para o organizador ver totais reais no admin */
export const DEMO_REGISTRATIONS: RegistrationRow[] = buildDemoRegistrations(200);

function syncEventCounts(ev: EventPublic, regs: RegistrationRow[]): EventPublic {
  const paid = regs.filter((r) => r.status === "paid").length;
  const pending = regs.filter((r) => r.status === "pending").length;
  const occupied = paid + pending;
  return {
    ...ev,
    paid_count: paid,
    pending_count: pending,
    slots_remaining: Math.max(0, ev.max_slots - occupied),
  };
}

/** Estado mutável da demo (compartilhado entre APIs enquanto o servidor roda). */

import fs from 'fs';
import path from 'path';

let demoEvents: EventPublic[] = [];
let demoRegistrations: RegistrationRow[] = [];

const DB_FILE = path.join(process.cwd(), '.demo-db.json');

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      demoEvents = data.events || [];
      demoRegistrations = data.registrations || [];
      return;
    } catch(e) {}
  }
  
  // Initialize default
  demoEvents = [syncEventCounts(structuredClone(DEMO_EVENT_INITIAL), DEMO_REGISTRATIONS)];
  demoRegistrations = [...DEMO_REGISTRATIONS];
  saveDB();
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({ events: demoEvents, registrations: demoRegistrations }, null, 2), 'utf8');
  } catch(e) {}
}

loadDB();

export function getDemoEvents(): EventPublic[] {
  return demoEvents;
}

export function getDemoEvent(id?: string): EventPublic | undefined {
  if (!id) return demoEvents[0];
  return demoEvents.find((e: EventPublic) => e.id === id) || demoEvents[0];
}

export function setDemoEvent(next: EventPublic): void {
  const idx = demoEvents.findIndex((e: EventPublic) => e.id === next.id);
  if (idx >= 0) {
    demoEvents[idx] = next;
  } else {
    demoEvents.push(next);
  }
  saveDB();
}

export function addDemoEvent(e: EventPublic): void {
  demoEvents.push(e);
  saveDB();
}

export function getDemoRegistrations(eventId: string): RegistrationRow[] {
  return demoRegistrations.filter((r: RegistrationRow) => r.event_id === eventId);
}

export function addDemoRegistration(r: RegistrationRow): void {
  demoRegistrations.push(r);
  saveDB();
}

export function updateDemoRegistration(r: RegistrationRow): void {
  const idx = demoRegistrations.findIndex((x: RegistrationRow) => x.id === r.id);
  if (idx >= 0) {
    demoRegistrations[idx] = r;
    saveDB();
  }
}
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") {
    return true;
  }
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return !hasUrl || !hasKey;
}
