"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  AdminContactsTab,
  type ContactForm,
} from "@/components/AdminContactsTab";
import { AdminCouponsTab } from "@/components/AdminCouponsTab";
import { AdminPasswordTab } from "@/components/AdminPasswordTab";
import { AdminPaymentTab } from "@/components/AdminPaymentTab";
import { LayoutWirePreview } from "@/components/LayoutWirePreview";
import {
  ADMIN_SESSION_KEY,
  clearTimedSession,
  loadTimedSession,
  saveTimedSession,
  touchTimedSession,
} from "@/lib/client-session";
import { centsToReaisInput, formatBRL, reaisToCents } from "@/lib/format";
import type { RegistrationStats } from "@/lib/registration-stats";
import {
  sortCategoryKeys,
  sortShirtKeys,
} from "@/lib/registration-stats";
import {
  COLORS,
  FONTS,
  LAYOUTS,
  resolveColor,
  resolveFont,
  resolveLayout,
  type ColorId,
  type FontId,
  type LayoutId,
} from "@/lib/themes";
import type { EventImage, EventPublic, RegistrationRow } from "@/lib/types";

type Tab =
  | "layout"
  | "resumo"
  | "evento"
  | "visual"
  | "cores"
  | "contatos"
  | "fotos"
  | "recebimento"
  | "cupons"
  | "senha"
  | "inscritos";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("resumo");
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [events, setEvents] = useState<EventPublic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [statsFiltered, setStatsFiltered] = useState<RegistrationStats | null>(
    null
  );
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterShirt, setFilterShirt] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  /** Avisos de pagamento / nova inscrição */
  const [liveAlerts, setLiveAlerts] = useState<
    { id: string; title: string; body: string; kind: "paid" | "new" }[]
  >([]);
  const knownPaidIds = useRef<Set<string> | null>(null);
  const knownRegIds = useRef<Set<string> | null>(null);
  const pollPwd = useRef(password);

  useEffect(() => {
    pollPwd.current = password;
  }, [password]);

  // Restaura login admin (6 horas)
  useEffect(() => {
    const saved = loadTimedSession<{ password: string }>(ADMIN_SESSION_KEY);
    if (saved?.password) {
      setPassword(saved.password);
      void loadAll(saved.password, {
        q: "",
        status: "all",
        category: "all",
        shirt: "all",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playNotifyBeep() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch {
      /* ignore */
    }
  }

  function dismissAlert(id: string) {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function showSuccess(title: string, message: string) {
    setMsg(message);
    setError(null);
    setSuccessModal({ title, message });
  }

  // Form estado do evento
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [regulations, setRegulations] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [priceInput, setPriceInput] = useState("0");
  const [maxSlots, setMaxSlots] = useState(500);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [categoriesText, setCategoriesText] = useState("5K\n10K");
  const [sizesText, setSizesText] = useState("PP\nP\nM\nG\nGG\nXG");
  const [themeLayout, setThemeLayout] = useState<LayoutId>("bilheteria");
  const [themeFont, setThemeFont] = useState<FontId>("geist");
  const [themeColor, setThemeColor] = useState<ColorId>("laranja");
  const [contacts, setContacts] = useState<ContactForm>({
    contact_email: "",
    contact_whatsapp: "",
    contact_phone: "",
    contact_instagram: "",
    contact_facebook: "",
    contact_youtube: "",
    contact_tiktok: "",
    contact_timing_url: "",
    contact_timing_label: "Cronometragem e percursos",
    contact_kit_email: "",
    contact_extra: "",
  });

  function fillForm(ev: EventPublic) {
    setEvent(ev);
    setName(ev.name);
    setDescription(ev.description);
    setRegulations(ev.regulations || "");
    setEventDate(ev.event_date);
    setStartTime(ev.start_time || "07:00");
    setLocation(ev.location);
    setCity(ev.city || "");
    setPriceInput(centsToReaisInput(ev.price_cents));
    setMaxSlots(ev.max_slots);
    setRegistrationOpen(ev.registration_open);
    setCategoriesText((ev.categories || []).join("\n"));
    setSizesText((ev.shirt_sizes || []).join("\n"));
    setThemeLayout(resolveLayout(ev.theme_layout));
    setThemeFont(resolveFont(ev.theme_font));
    setThemeColor(resolveColor(ev.theme_color));
    setContacts({
      contact_email: ev.contact_email || "",
      contact_whatsapp: ev.contact_whatsapp || "",
      contact_phone: ev.contact_phone || "",
      contact_instagram: ev.contact_instagram || "",
      contact_facebook: ev.contact_facebook || "",
      contact_youtube: ev.contact_youtube || "",
      contact_tiktok: ev.contact_tiktok || "",
      contact_timing_url: ev.contact_timing_url || "",
      contact_timing_label:
        ev.contact_timing_label || "Cronometragem e percursos",
      contact_kit_email: ev.contact_kit_email || "",
      contact_extra: ev.contact_extra || "",
    });
  }

  const loadAll = useCallback(
    async (
      pwd: string,
      opts?: {
        q?: string;
        status?: string;
        category?: string;
        shirt?: string;
      }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const qq = opts?.q ?? q;
        const st = opts?.status ?? filterStatus;
        const cat = opts?.category ?? filterCategory;
        const sh = opts?.shirt ?? filterShirt;
        if (qq) params.set("q", qq);
        if (st && st !== "all") params.set("status", st);
        if (cat && cat !== "all") params.set("category", cat);
        if (sh && sh !== "all") params.set("shirt", sh);
        
        let targetEventId = selectedEventId;
        const evListRes = await fetch("/api/event", { cache: "no-store" });
        const evListData = await evListRes.json();
        const availableEvents = evListData.events || [];
        setEvents(availableEvents);
        
        if (!targetEventId && availableEvents.length > 0) {
          targetEventId = availableEvents[0].id;
          setSelectedEventId(targetEventId);
        }
        if (targetEventId) {
          params.set("eventId", targetEventId);
        }

        const qs = params.toString();
        const listUrl = qs
          ? `/api/inscricoes/list?${qs}`
          : "/api/inscricoes/list";

        const [listRes] = await Promise.all([
          fetch(listUrl, { headers: { "x-admin-password": pwd } }),
        ]);

        const listData = await listRes.json();
        if (!listRes.ok) throw new Error(listData.error || "Senha incorreta");

        if (listData.event) {
          fillForm(listData.event);
        }
        setRows(listData.registrations || []);
        setStats(listData.stats || null);
        setStatsFiltered(listData.stats_filtered || null);
        setAuthed(true);
        saveTimedSession(ADMIN_SESSION_KEY, { password: pwd });
        touchTimedSession(ADMIN_SESSION_KEY);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
        setAuthed(false);
        clearTimedSession(ADMIN_SESSION_KEY);
      } finally {
        setLoading(false);
      }
    },
    [q, filterStatus, filterCategory, filterShirt, selectedEventId]
  );

  // Poll silencioso (sem filtros) para detectar pagamentos / novas inscrições
  useEffect(() => {
    if (!authed || !password) return;

    async function pollAlerts() {
      const pwd = pollPwd.current;
      if (!pwd) return;
      try {
        const params = new URLSearchParams();
        if (selectedEventId) params.set("eventId", selectedEventId);
        const res = await fetch(`/api/inscricoes/list?${params.toString()}`, {
          headers: { "x-admin-password": pwd },
        });
        if (!res.ok) return;
        const data = await res.json();
        const regs = (data.registrations || []) as RegistrationRow[];
        const paidIds = new Set(
          regs.filter((r) => r.status === "paid").map((r) => r.id)
        );
        const allIds = new Set(regs.map((r) => r.id));
        if (knownPaidIds.current === null) {
          knownPaidIds.current = paidIds;
          knownRegIds.current = allIds;
          return;
        }
        const newPaid = regs.filter(
          (r) => r.status === "paid" && !knownPaidIds.current!.has(r.id)
        );
        const newRegs = regs.filter((r) => !knownRegIds.current!.has(r.id));
        if (newPaid.length > 0) {
          playNotifyBeep();
          setLiveAlerts((prev) =>
            [
              ...newPaid.map((r) => ({
                id: `paid-${r.id}-${Date.now()}`,
                title: "Pagamento confirmado",
                body: `${r.full_name} · ${r.category} · inscrição paga`,
                kind: "paid" as const,
              })),
              ...prev,
            ].slice(0, 8)
          );
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            newPaid.forEach((r) => {
              try {
                new Notification("CorreCronos — pagamento", {
                  body: `${r.full_name} pagou a inscrição`,
                });
              } catch {
                /* */
              }
            });
          }
          // Atualiza a tela se o organizador estiver olhando
          void loadAll(pwd);
        } else if (newRegs.length > 0) {
          setLiveAlerts((prev) =>
            [
              ...newRegs.slice(0, 3).map((r) => ({
                id: `new-${r.id}-${Date.now()}`,
                title: "Nova inscrição",
                body: `${r.full_name} · aguardando pagamento`,
                kind: "new" as const,
              })),
              ...prev,
            ].slice(0, 8)
          );
          void loadAll(pwd);
        }
        knownPaidIds.current = paidIds;
        knownRegIds.current = allIds;
      } catch {
        /* rede */
      }
    }

    const t = window.setInterval(() => {
      void pollAlerts();
    }, 35_000);
    return () => window.clearInterval(t);
  }, [authed, password, loadAll]);

  async function createEvent() {
    if (!password) return;
    setSaving(true);
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar evento");
      
      const newEvent = data.event;
      setEvents((prev) => [...prev, newEvent]);
      setSelectedEventId(newEvent.id);
      setIsEditingEvent(true);
      fillForm(newEvent);
      
      showSuccess("Novo evento criado!", "Preencha os dados e salve.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent(
    e?: FormEvent<HTMLFormElement>,
    contactsOverride?: ContactForm
  ) {
    e?.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);

    const categories = categoriesText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const shirt_sizes = sizesText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (categories.length === 0) {
      setError("Informe pelo menos 1 categoria.");
      setSaving(false);
      return;
    }
    if (shirt_sizes.length === 0) {
      setError("Informe pelo menos 1 tamanho de camiseta.");
      setSaving(false);
      return;
    }

    const c = contactsOverride || contacts;

    try {
      const price = reaisToCents(priceInput);
      const slots = Number(maxSlots) || 1;
      const res = await fetch("/api/event", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          id: selectedEventId || event?.id,
          name: name.trim() || "Corrida",
          description,
          regulations,
          event_date: eventDate || "2026-09-20",
          start_time: startTime || "07:00",
          location,
          city,
          price_cents: Number.isFinite(price) ? price : 0,
          max_slots: Number.isFinite(slots) ? slots : 500,
          registration_open: registrationOpen,
          categories,
          shirt_sizes,
          theme_layout: resolveLayout(themeLayout),
          theme_font: resolveFont(themeFont),
          theme_color: resolveColor(themeColor),
          ...c,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && data.error) || `Falha ao salvar (HTTP ${res.status})`
        );
      }
      if (data.event) fillForm(data.event);
      showSuccess(
        "✓ Salvo com sucesso!",
        data.message ||
          "Alterações gravadas. Abra a home e aperte F5 para conferir."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      setError(message);
      setSuccessModal(null);
      window.alert(`Não foi possível salvar:\n\n${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setMsg(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (!event?.images.length) fd.append("set_cover", "1");
        const res = await fetch(`/api/images?eventId=${event?.id || ""}`, {
          method: "POST",
          headers: { "x-admin-password": password },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no upload");
        if (data.event) fillForm(data.event);
      }
      showSuccess(
        "Fotos enviadas!",
        "As imagens já estão no site. Abra a home e confira a galeria/capa."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  async function setCover(img: EventImage) {
    const res = await fetch(`/api/images/${img.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ action: "set_cover" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro");
      return;
    }
    if (data.event) fillForm(data.event);
    showSuccess("Capa atualizada!", "A foto de capa do site foi alterada.");
  }

  async function removeImage(img: EventImage) {
    if (!confirm("Remover esta foto do site?")) return;
    const res = await fetch(`/api/images/${img.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro");
      return;
    }
    if (data.event) fillForm(data.event);
    showSuccess("Foto removida!", "A imagem saiu da galeria do site.");
  }

  async function updateStatus(id: string, status: RegistrationRow["status"]) {
    const res = await fetch(`/api/inscricoes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Erro ao atualizar");
      return;
    }
    await loadAll(password, {
      q,
      status: filterStatus,
      category: filterCategory,
      shirt: filterShirt,
    });
  }

  function exportExcel() {
    const data = rows.map((r) => ({
      Nome: r.full_name,
      CPF: r.cpf,
      Email: r.email,
      Telefone: r.phone,
      Nascimento: r.birth_date || "",
      Camiseta: r.shirt_size,
      Categoria: r.category,
      Status: STATUS_LABEL[r.status] || r.status,
      Valor: formatBRL(r.amount_cents),
      Criado_em: r.created_at,
      ID: r.id,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscricoes");
    XLSX.writeFile(wb, `inscricoes-${event?.name || "corrida"}.xlsx`);
  }


  const NAV = [
  { id: "layout", label: "Layout da Vitrine", icon: "✨" },
  { id: "resumo", label: "Resumo", icon: "📊" },
  { id: "evento", label: "Eventos", icon: "≡" },
  { id: "visual", label: "Layout do Evento", icon: "🎨" },
    { id: "contatos", label: "Contatos", icon: "📞" },
    { id: "cupons", label: "Cupons", icon: "🎟️" },
    { id: "senha", label: "Senha", icon: "⚙" },
    { id: "inscritos", label: "Inscritos", icon: "☰" },
  ];

  const tabTitle: Record<Tab, string> = {
    layout: "Layout da Vitrine",
    resumo: "Resumo",
    evento: "Dados da corrida",
    visual: "Layout · fonte · cores",
    cores: "Layout · fonte · cores",
    contatos: "Contatos",
    fotos: "Fotos",
    recebimento: "Recebimento",
    cupons: "Cupons",
    senha: "Senha",
    inscritos: "Inscritos",
  };

  const activeTab: Tab = tab === "cores" ? "visual" : tab;
  const selectedFont = FONTS.find((f) => f.id === themeFont) || FONTS[0];
  const selectedColor = COLORS.find((c) => c.id === themeColor) || COLORS[0];

  return (
    <div className="admin-theme min-h-full">
      {successModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          onClick={() => setSuccessModal(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl admin-glass p-6 md:p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400 border border-emerald-500/30">
              ✓
            </div>
            <h2 id="success-title" className="text-xl font-black text-white tracking-tight">
              {successModal.title}
            </h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">{successModal.message}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="rounded-xl bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark"
              >
                Entendi
              </button>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold hover:bg-white/5"
                onClick={() => setSuccessModal(null)}
              >
                Ver site →
              </a>
            </div>
          </div>
        </div>
      )}

      {!authed ? (
        <div className="admin-shell min-h-screen flex items-center justify-center px-4">
          <form
            className="w-full max-w-sm space-y-3 rounded-2xl admin-glass p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              loadAll(password);
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand text-xl border border-brand/30">
                🏃
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Painel admin</h1>
                <p className="text-xs text-muted">Organizador da corrida</p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Digite a senha do organizador. A sessão fica ativa por{" "}
              <strong className="text-white">6 horas</strong> neste navegador.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="field"
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      ) : (
        <div className="admin-shell">
          {sidebarOpen && (
            <button
              type="button"
              className="admin-sidebar-backdrop md:hidden"
              aria-label="Fechar menu"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Menu do painel">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-600 text-white text-lg shadow-lg shadow-orange-900/40">
                🏃
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate leading-tight">CorreCronos</p>
                <p className="text-[10px] text-muted truncate">Admin</p>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-nav-btn ${activeTab === item.id ? "active" : ""}`}
                  onClick={() => {
                    setTab(item.id as Tab);
                    if (item.id === "evento") setIsEditingEvent(false);
                    setMsg(null);
                    setError(null);
                    setFontMenuOpen(false);
                    setColorMenuOpen(false);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="w-5 text-center opacity-90 text-sm">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="mt-4 mx-1 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition"
            >
              <span>↗</span> Ver site público
            </a>
            <button
              type="button"
              onClick={() => {
                clearTimedSession(ADMIN_SESSION_KEY);
                setAuthed(false);
                setPassword("");
              }}
              className="mt-2 mx-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-muted hover:text-white hover:bg-white/5"
            >
              Sair do admin (encerra sessão 6h)
            </button>
          </aside>

          <div className="admin-main">
            <header className="admin-topbar">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="md:hidden rounded-xl border border-white/10 p-2.5 text-white hover:bg-white/5"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menu"
                >
                  ☰
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-white truncate flex items-center gap-2">
                    <select
                      value={selectedEventId}
                      onChange={(e) => {
                        setSelectedEventId(e.target.value);
                        setTimeout(() => loadAll(password, { status: filterStatus, category: filterCategory, shirt: filterShirt, q }), 0);
                      }}
                      className="bg-transparent border-none outline-none focus:ring-0 text-xl md:text-2xl font-bold p-0 cursor-pointer text-white appearance-none"
                    >
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id} className="text-black text-sm">
                          {ev.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted text-sm opacity-50">▼</span>
                  </h1>
                  <p className="text-xs text-muted truncate mt-1">
                    {tabTitle[activeTab]} · painel do organizador
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-muted hover:text-white hover:bg-white/5"
                  title="Ver site"
                >
                  ⌂
                </a>
                <button
                  type="button"
                  onClick={() => loadAll(password)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-white/10 text-muted hover:text-white hover:bg-white/5"
                  title="Atualizar"
                >
                  ↻
                </button>
              </div>
            </header>

            <main className="flex-1 px-4 md:px-6 lg:px-8 pb-10 pt-4 max-w-6xl w-full mx-auto">
              {liveAlerts.length > 0 && (
                <div className="mb-4 space-y-2">
                  {liveAlerts.map((a) => (
                    <div
                      key={a.id}
                      className={
                        a.kind === "paid"
                          ? "flex items-start justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm"
                          : "flex items-start justify-between gap-3 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-sm"
                      }
                      role="status"
                    >
                      <div>
                        <p
                          className={
                            a.kind === "paid"
                              ? "font-bold text-emerald-300"
                              : "font-bold text-sky-300"
                          }
                        >
                          {a.kind === "paid" ? "✓ " : "● "}
                          {a.title}
                        </p>
                        <p className="text-slate-200 mt-0.5">{a.body}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          className="text-xs font-semibold text-white/90 underline"
                          onClick={() => {
                            setTab("inscritos");
                            dismissAlert(a.id);
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted hover:text-white"
                          onClick={() => dismissAlert(a.id)}
                          aria-label="Fechar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {authed &&
                typeof Notification !== "undefined" &&
                Notification.permission === "default" && (
                  <button
                    type="button"
                    className="mb-4 w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                    onClick={() => void Notification.requestPermission()}
                  >
                    Ativar notificações do navegador (avisos de pagamento)
                  </button>
                )}

              {(msg || error) && (
                <div
                  className={
                    error
                      ? "mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                      : "mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                  }
                >
                  {error || msg}
                </div>
              )}

              {event && activeTab !== "resumo" && (
                <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniStat label="Vagas restantes" value={String(event.slots_remaining)} />
                  <MiniStat label="Máximo" value={String(event.max_slots)} />
                  <MiniStat label="Já pagaram" value={String(stats?.paid ?? event.paid_count)} />
                  <MiniStat label="Faltam pagar" value={String(stats?.pending ?? event.pending_count)} />
                </div>
              )}

              {activeTab === "layout" && <AdminLayoutTab onMessage={(m, e) => { setMsg(m); setError(e); if(m && !e) showSuccess(m, ""); }} />}
              {activeTab === "resumo" && stats && event && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="admin-glass rounded-2xl p-5 md:p-6">
                      <p className="text-sm text-muted">Inscrições</p>
                      <p className="text-4xl md:text-5xl font-black tabular-nums text-white mt-1">
                        {stats.total.toLocaleString("pt-BR")}
                      </p>
                      <div className="admin-progress mt-4">
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (stats.awaiting_or_paid / Math.max(event.max_slots, 1)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted">Pagamentos</p>
                          <p className="text-2xl font-bold tabular-nums text-white">{stats.paid}</p>
                        </div>
                        <p className="text-sm text-muted">{event.slots_remaining} vagas livres</p>
                      </div>
                    </div>

                    <div className="admin-glass rounded-2xl p-5 md:p-6">
                      <p className="text-sm text-muted">Pagamentos confirmados</p>
                      <p className="text-4xl md:text-5xl font-black tabular-nums text-white mt-1">
                        {stats.paid.toLocaleString("pt-BR")}
                      </p>
                      <div className="admin-progress mt-4">
                        <span
                          style={{
                            width: `${Math.round(
                              (stats.paid / Math.max(stats.paid + stats.pending, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted">Pendentes</p>
                          <p className="text-2xl font-bold tabular-nums text-amber-400">{stats.pending}</p>
                        </div>
                        <p className="text-sm text-emerald-400 font-semibold">
                          +
                          {Math.round(
                            (stats.paid / Math.max(stats.paid + stats.pending, 1)) * 100
                          )}
                          % pagos
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="admin-glass rounded-2xl p-5">
                      <h3 className="font-bold text-white mb-1">Categorias</h3>
                      <p className="text-xs text-muted mb-4">Distribuição por modalidade</p>
                      <CategoryDonut byCategory={stats.by_category} total={stats.active || 1} />
                      <div className="mt-4 space-y-2">
                        {sortCategoryKeys(Object.keys(stats.by_category)).map((cat) => (
                          <BreakdownRow
                            key={cat}
                            label={cat}
                            count={stats.by_category[cat]}
                            total={stats.active || 1}
                            onClick={() => {
                              setFilterCategory(cat);
                              setFilterStatus("all");
                              setTab("inscritos");
                              void loadAll(password, {
                                category: cat,
                                status: "all",
                                shirt: "all",
                              });
                            }}
                          />
                        ))}
                        {Object.keys(stats.by_category).length === 0 && (
                          <p className="text-sm text-muted">Nenhum inscrito ainda.</p>
                        )}
                      </div>
                    </div>

                    <div className="admin-glass rounded-2xl p-5">
                      <h3 className="font-bold text-white mb-1">Camisetas</h3>
                      <p className="text-xs text-muted mb-4">Quantidade por tamanho do kit</p>
                      <ShirtBars
                        byShirt={stats.by_shirt}
                        onSelect={(size) => {
                          setFilterShirt(size);
                          setFilterStatus("all");
                          setFilterCategory("all");
                          setTab("inscritos");
                          void loadAll(password, {
                            shirt: size,
                            status: "all",
                            category: "all",
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="admin-glass rounded-2xl p-5">
                    <h3 className="font-bold text-white mb-1">Pagamentos</h3>
                    <p className="text-xs text-muted mb-4">Situação das inscrições</p>
                    <PayBar paid={stats.paid} pending={stats.pending} />
                    <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
                      <li className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span className="text-emerald-400 font-medium">Já pagaram</span>
                        <strong className="text-white">{stats.paid}</strong>
                      </li>
                      <li className="flex justify-between rounded-xl bg-white/5 px-3 py-2">
                        <span className="text-amber-400 font-medium">Faltam pagar</span>
                        <strong className="text-white">{stats.pending}</strong>
                      </li>
                      <li className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-muted">
                        <span>Canceladas</span>
                        <span>{stats.cancelled}</span>
                      </li>
                      <li className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-muted">
                        <span>Reembolsadas</span>
                        <span>{stats.refunded}</span>
                      </li>
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
                        onClick={() => {
                          setFilterStatus("pending");
                          setTab("inscritos");
                          void loadAll(password, {
                            status: "pending",
                            category: "all",
                            shirt: "all",
                          });
                        }}
                      >
                        Ver quem falta pagar →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStatus("all");
                          setFilterCategory("all");
                          setFilterShirt("all");
                          setQ("");
                          setTab("inscritos");
                          void loadAll(password, {
                            q: "",
                            status: "all",
                            category: "all",
                            shirt: "all",
                          });
                        }}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5"
                      >
                        Lista completa
                      </button>
                      <button
                        type="button"
                        onClick={exportExcel}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-muted hover:text-white hover:bg-white/5"
                      >
                        Exportar Excel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "visual" && (
                <form
                  onSubmit={(e) => {
                    setFontMenuOpen(false);
                    setColorMenuOpen(false);
                    void saveEvent(e);
                  }}
                  className="admin-glass rounded-2xl p-5 md:p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      Layout da home
                    </h2>
                    <p className="text-sm text-muted mt-1">
                      Escolha o design (como os atletas veem), a fonte e as cores — tudo
                      nesta aba. Salve e atualize a home (F5).
                    </p>
                  </div>

                  <div>
                    <p className="text-base font-bold mb-3 text-white">
                      1. Design da página
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {LAYOUTS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setThemeLayout(l.id)}
                          className={
                            themeLayout === l.id
                              ? "rounded-2xl border-2 border-brand p-4 text-left bg-brand/10 shadow-md ring-2 ring-brand/20"
                              : "rounded-2xl border border-white/10 p-4 text-left bg-white/5 hover:border-brand/40"
                          }
                        >
                          <LayoutWirePreview id={l.id} accent={l.accent} bg={l.previewBg} />
                          <p className="font-bold text-base mt-3 text-white">{l.name}</p>
                          <p className="text-xs text-muted mt-1 leading-snug">{l.description}</p>
                          {themeLayout === l.id && (
                            <p className="text-[11px] font-bold text-brand mt-2">
                              ✓ Selecionado
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fonte + cor estilo lista (tipo Excel) */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-sm font-bold mb-2 text-white">2. Fonte das letras</p>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setFontMenuOpen((o) => !o);
                            setColorMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#1a1f2a] px-3 py-2.5 text-left hover:border-brand/50 transition"
                          aria-expanded={fontMenuOpen}
                          aria-haspopup="listbox"
                        >
                          <span
                            className="text-base text-white truncate"
                            style={{ fontFamily: selectedFont.family }}
                          >
                            {selectedFont.name}
                          </span>
                          <span className="text-muted text-xs shrink-0">
                            {fontMenuOpen ? "▲" : "▼"}
                          </span>
                        </button>
                        {fontMenuOpen && (
                          <ul
                            role="listbox"
                            className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[#151922] shadow-2xl shadow-black/50 py-1"
                          >
                            {FONTS.map((f) => (
                              <li key={f.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={themeFont === f.id}
                                  onClick={() => {
                                    setThemeFont(f.id);
                                    setFontMenuOpen(false);
                                  }}
                                  className={
                                    themeFont === f.id
                                      ? "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left bg-brand/20 text-white"
                                      : "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-white/90 hover:bg-white/10"
                                  }
                                >
                                  <span
                                    className="text-[15px] truncate"
                                    style={{ fontFamily: f.family }}
                                  >
                                    {f.name}
                                  </span>
                                  <span className="text-[11px] text-muted shrink-0">
                                    {f.description}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p
                        className="mt-2 text-sm text-muted"
                        style={{ fontFamily: selectedFont.family }}
                      >
                        Prévia: Aa Bb Cc 123
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-bold mb-2 text-white">3. Cores da home</p>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setColorMenuOpen((o) => !o);
                            setFontMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#1a1f2a] px-3 py-2.5 text-left hover:border-brand/50 transition"
                          aria-expanded={colorMenuOpen}
                          aria-haspopup="listbox"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="flex gap-1 shrink-0">
                              <span
                                className="h-5 w-5 rounded border border-white/20"
                                style={{ background: selectedColor.vars.brand }}
                              />
                              <span
                                className="h-5 w-5 rounded border border-white/20"
                                style={{ background: selectedColor.vars.background }}
                              />
                              <span
                                className="h-5 w-5 rounded border border-white/20"
                                style={{ background: selectedColor.vars.brandSoft }}
                              />
                            </span>
                            <span className="text-sm text-white truncate">
                              {selectedColor.name}
                            </span>
                          </span>
                          <span className="text-muted text-xs shrink-0">
                            {colorMenuOpen ? "▲" : "▼"}
                          </span>
                        </button>
                        {colorMenuOpen && (
                          <ul
                            role="listbox"
                            className="absolute z-40 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-[#151922] shadow-2xl shadow-black/50 py-1"
                          >
                            {COLORS.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={themeColor === c.id}
                                  onClick={() => {
                                    setThemeColor(c.id);
                                    setColorMenuOpen(false);
                                  }}
                                  className={
                                    themeColor === c.id
                                      ? "w-full flex items-center gap-3 px-3 py-2.5 text-left bg-brand/20"
                                      : "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/10"
                                  }
                                >
                                  <span className="flex gap-1 shrink-0">
                                    <span
                                      className="h-5 w-5 rounded border border-white/15"
                                      style={{ background: c.vars.background }}
                                    />
                                    <span
                                      className="h-5 w-5 rounded border border-white/15"
                                      style={{ background: c.vars.brand }}
                                    />
                                    <span
                                      className="h-5 w-5 rounded border border-white/15"
                                      style={{ background: c.vars.brandSoft }}
                                    />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium text-white truncate">
                                      {c.name}
                                    </span>
                                    <span className="block text-[11px] text-muted truncate">
                                      {c.description}
                                    </span>
                                  </span>
                                  {themeColor === c.id && (
                                    <span className="ml-auto text-brand text-xs font-bold">✓</span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {(fontMenuOpen || colorMenuOpen) && (
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default bg-transparent"
                      aria-label="Fechar menu"
                      onClick={() => {
                        setFontMenuOpen(false);
                        setColorMenuOpen(false);
                      }}
                    />
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-brand px-8 py-3.5 font-bold text-white hover:bg-brand-dark disabled:opacity-60 text-base"
                    >
                      {saving ? "Salvando…" : "Salvar e aplicar na home"}
                    </button>
                    <a
                      href="/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold hover:bg-white/5"
                    >
                      Abrir home →
                    </a>
                  </div>
                </form>
              )}

              {activeTab === "contatos" && (
                <AdminContactsTab
                  event={event}
                  password={password}
                  saving={saving}
                  onSave={(c) => {
                    setContacts(c);
                    void saveEvent(undefined, c);
                  }}
                />
              )}

              {activeTab === "evento" && !isEditingEvent && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Seus Eventos</h2>
                      <p className="text-sm text-muted mt-1">Gerencie ou crie novas corridas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={createEvent}
                      disabled={saving}
                      className="rounded-xl bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-dark transition disabled:opacity-50"
                    >
                      {saving ? "Criando..." : "+ Criar Novo Evento"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          fillForm(ev);
                          setIsEditingEvent(true);
                          setTimeout(() => loadAll(password, { status: filterStatus, category: filterCategory, shirt: filterShirt, q }), 0);
                        }}
                        className="text-left rounded-2xl bg-card-2 border border-white/10 p-5 hover:border-brand/50 hover:bg-white/5 transition flex flex-col h-full"
                      >
                        <h3 className="font-bold text-white text-lg leading-tight mb-2">{ev.name}</h3>
                        <p className="text-sm text-muted mb-4">{new Date(ev.event_date).toLocaleDateString('pt-BR')}</p>
                        
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ev.registration_open ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {ev.registration_open ? 'Aberto' : 'Fechado'}
                          </span>
                          <span className="text-xs text-muted">✏️ Editar dados</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "evento" && isEditingEvent && (
                <>
                <form
                  onSubmit={(e) => void saveEvent(e)}
                  className="admin-glass rounded-2xl p-5 md:p-8 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white">Dados da corrida</h2>
                      <p className="text-sm text-muted mt-1">
                        Tudo que você mudar aqui aparece no site público.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingEvent(false)}
                      className="text-sm font-semibold text-muted hover:text-white"
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab("visual")}
                    className="w-full rounded-2xl border border-dashed border-brand/40 bg-brand/10 px-4 py-3 text-left hover:bg-brand/15 transition"
                  >
                    <p className="font-bold text-white">🎨 Quer mudar o visual da home?</p>
                    <p className="text-sm text-muted mt-0.5">
                      Abra <strong className="text-white">Layout</strong> — designs para atletas + fontes
                    </p>
                  </button>

                  <Field label="Nome da corrida *">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="field"
                      placeholder="Ex: Corrida Noturna 2026"
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Data *">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        required
                        className="field"
                      />
                    </Field>
                    <Field label="Horário de largada">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="field"
                      />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Local / endereço">
                      <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="field"
                        placeholder="Parque, avenida…"
                      />
                    </Field>
                    <Field label="Cidade">
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="field"
                      />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Preço do ingresso (R$) *">
                      <input
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="field"
                        placeholder="80,00"
                        inputMode="decimal"
                      />
                    </Field>
                    <Field label="Quantidade de vagas *">
                      <input
                        type="number"
                        min={1}
                        value={maxSlots}
                        onChange={(e) => setMaxSlots(Number(e.target.value))}
                        className="field"
                      />
                    </Field>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={registrationOpen}
                      onChange={(e) => setRegistrationOpen(e.target.checked)}
                      className="h-5 w-5 accent-orange-600"
                    />
                    <span>
                      <strong className="text-white">Inscrições abertas</strong>
                      <span className="block text-xs text-muted">
                        Desmarque para fechar as vendas no site
                      </span>
                    </span>
                  </label>

                  <Field label="Descrição (aparece no site)">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="field"
                      placeholder="Fale sobre a corrida, o kit, o percurso…"
                    />
                  </Field>

                  <Field label="Regulamento">
                    <textarea
                      value={regulations}
                      onChange={(e) => setRegulations(e.target.value)}
                      rows={5}
                      className="field"
                      placeholder="Regras, idade mínima, o que está incluso…"
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Categorias (uma por linha)">
                      <textarea
                        value={categoriesText}
                        onChange={(e) => setCategoriesText(e.target.value)}
                        rows={5}
                        className="field font-mono text-sm"
                        placeholder={"5K\n10K\nCaminhada"}
                      />
                      <p className="text-xs text-muted mt-1">
                        Ex.: 5K, 10K, Caminhada — o atleta escolhe no checkout
                      </p>
                    </Field>
                    <Field label="Tamanhos de camiseta (um por linha)">
                      <textarea
                        value={sizesText}
                        onChange={(e) => setSizesText(e.target.value)}
                        rows={5}
                        className="field font-mono text-sm"
                        placeholder={"P\nM\nG\nGG"}
                      />
                    </Field>
                  </div>

                  
        {/* === CONFIGURAÇÕES DE VISUAL === */}
        <div className="mt-8 rounded-2xl border border-white/5 bg-white/5 p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎨</span>
            <h3 className="text-lg font-bold">Identidade Visual do Evento</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Layout</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={themeLayout || "default"}
                onChange={(e) => setThemeLayout(e.target.value as any)}
              >
                <option value="default">Clássico / Padrão</option>
                <option value="split">Moderno (Dividido)</option>
                <option value="revista">Revista / Editorial</option>
                <option value="poster">Pôster</option>
                <option value="minimal">Minimalista</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Tipografia (Fonte)</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={themeFont || "sans"}
                onChange={(e) => setThemeFont(e.target.value as any)}
              >
                <option value="sans">Sem Serifa (Moderna)</option>
                <option value="serif">Com Serifa (Clássica)</option>
                <option value="mono">Monoespaçada (Tech)</option>
                <option value="display">Display (Impacto)</option>
                <option value="rounded">Arredondada (Amigável)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Cor Principal</label>
              <select
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2"
                value={themeColor || "brand"}
                onChange={(e) => setThemeColor(e.target.value as any)}
              >
                <option value="brand">Laranja (Padrão)</option>
                <option value="blue">Azul</option>
                <option value="green">Verde</option>
                <option value="red">Vermelho</option>
                <option value="purple">Roxo</option>
                <option value="dark">Preto/Escuro</option>
              </select>
            </div>
          </div>
        </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto rounded-xl bg-brand px-8 py-3 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {saving ? "Salvando…" : "Salvar e atualizar o site"}
                  </button>
                </form>
                
                <div className="mt-8 space-y-8 pb-12 border-t border-white/10 pt-8">
                  {/* FOTOS */}
                  <div className="admin-glass rounded-2xl p-5 md:p-8 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white">Fotos do evento</h2>
                      <p className="text-sm text-muted mt-1">
                        Envie fotos (cartaz, percurso, edição anterior). Aparecem na capa e na galeria.
                      </p>
                    </div>

                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 px-6 py-12 cursor-pointer hover:bg-brand/10 transition">
                      <span className="text-3xl">📷</span>
                      <span className="font-semibold text-center text-white">
                        {uploading ? "Enviando…" : "Toque ou clique para escolher fotos"}
                      </span>
                      <span className="text-xs text-muted text-center">
                        JPG, PNG ou WEBP · até 5 MB cada · pode selecionar várias
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          void uploadFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {event && event.images.length === 0 && (
                      <p className="text-sm text-muted text-center py-4">
                        Nenhuma foto ainda. Envie a primeira — ela vira a capa do site.
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {event?.images.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-2xl border border-white/10 overflow-hidden bg-black/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="" className="h-40 w-full object-cover" />
                          <div className="p-2 flex flex-wrap gap-1">
                            {img.is_cover || event.cover_image_url === img.url ? (
                              <span className="text-[10px] font-bold uppercase bg-brand text-white px-2 py-1 rounded">
                                Capa do site
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCover(img)}
                                className="text-[11px] font-medium bg-white/10 border border-white/10 px-2 py-1 rounded hover:bg-white/15 text-white"
                              >
                                Usar como capa
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(img)}
                              className="text-[11px] font-medium text-red-300 bg-red-500/15 px-2 py-1 rounded"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RECEBIMENTO */}
                  <AdminPaymentTab
                    password={password}
                    onMessage={(m, e) => {
                      setMsg(m);
                      setError(e);
                      if (m && !e) showSuccess("Recebimento salvo!", m);
                    }}
                  />
                </div>
                </>
              )}

              {activeTab === "cupons" && (
                <AdminCouponsTab
                  password={password}
                  priceCents={event?.price_cents ?? 8900}
                  onMessage={(m, e) => {
                    setMsg(m);
                    setError(e);
                    if (m && !e) showSuccess("Cupom atualizado!", m);
                  }}
                />
              )}

              {activeTab === "senha" && (
                <AdminPasswordTab
                  password={password}
                  onPasswordChanged={(np) => setPassword(np)}
                  onMessage={(m, e) => {
                    setMsg(m);
                    setError(e);
                    if (m && !e) showSuccess("Senha alterada!", m);
                  }}
                />
              )}

              {activeTab === "inscritos" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Inscritos</h2>
                    <p className="text-sm text-muted">
                      Filtre por pagamento, categoria ou camiseta. Totais na aba Resumo.
                    </p>
                  </div>

                  <div className="admin-glass rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Filtrar informações</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <label className="block text-xs text-muted">
                        Busca (nome / CPF)
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Ex.: Ana ou 123"
                          className="field mt-1"
                        />
                      </label>
                      <label className="block text-xs text-muted">
                        Pagamento
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="field mt-1"
                        >
                          <option value="all">Todos</option>
                          <option value="paid">Já pagaram</option>
                          <option value="pending">Faltam pagar</option>
                          <option value="cancelled">Canceladas</option>
                          <option value="refunded">Reembolsadas</option>
                        </select>
                      </label>
                      <label className="block text-xs text-muted">
                        Categoria
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="field mt-1"
                        >
                          <option value="all">Todas</option>
                          {(event?.categories || []).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-muted">
                        Camiseta
                        <select
                          value={filterShirt}
                          onChange={(e) => setFilterShirt(e.target.value)}
                          className="field mt-1"
                        >
                          <option value="all">Todos os tamanhos</option>
                          {(event?.shirt_sizes || []).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          loadAll(password, {
                            q,
                            status: filterStatus,
                            category: filterCategory,
                            shirt: filterShirt,
                          })
                        }
                        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        Aplicar filtros
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQ("");
                          setFilterStatus("all");
                          setFilterCategory("all");
                          setFilterShirt("all");
                          void loadAll(password, {
                            q: "",
                            status: "all",
                            category: "all",
                            shirt: "all",
                          });
                        }}
                        className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={exportExcel}
                        className="rounded-xl bg-white/10 text-white px-5 py-2.5 text-sm font-medium ml-auto border border-white/10"
                      >
                        Exportar Excel
                      </button>
                    </div>
                  </div>

                  {statsFiltered && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div className="rounded-xl admin-glass px-3 py-2">
                        <span className="text-muted text-xs">Neste filtro</span>
                        <p className="font-bold text-lg tabular-nums text-white">
                          {statsFiltered.total}
                        </p>
                      </div>
                      <div className="rounded-xl admin-glass px-3 py-2">
                        <span className="text-muted text-xs">Pagos (filtro)</span>
                        <p className="font-bold text-lg tabular-nums text-emerald-400">
                          {statsFiltered.paid}
                        </p>
                      </div>
                      <div className="rounded-xl admin-glass px-3 py-2">
                        <span className="text-muted text-xs">Pendentes (filtro)</span>
                        <p className="font-bold text-lg tabular-nums text-amber-400">
                          {statsFiltered.pending}
                        </p>
                      </div>
                      <div className="rounded-xl admin-glass px-3 py-2">
                        <span className="text-muted text-xs">Total geral</span>
                        <p className="font-bold text-lg tabular-nums text-white">
                          {stats?.total ?? "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-2xl admin-glass">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5 text-left text-muted">
                        <tr>
                          <th className="px-3 py-3 font-medium">Nome</th>
                          <th className="px-3 py-3 font-medium">CPF</th>
                          <th className="px-3 py-3 font-medium">Contato</th>
                          <th className="px-3 py-3 font-medium">Kit</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-10 text-center text-muted">
                              Nenhuma inscrição ainda.
                            </td>
                          </tr>
                        )}
                        {rows.map((r) => (
                          <tr key={r.id} className="border-t border-white/10">
                            <td className="px-3 py-3 font-medium text-white">{r.full_name}</td>
                            <td className="px-3 py-3 font-mono text-xs">{r.cpf}</td>
                            <td className="px-3 py-3">
                              <div>{r.email}</div>
                              <div className="text-muted text-xs">{r.phone}</div>
                            </td>
                            <td className="px-3 py-3">
                              {r.shirt_size} · {r.category}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={
                                  r.status === "paid"
                                    ? "text-emerald-400 font-medium"
                                    : r.status === "cancelled"
                                      ? "text-red-400"
                                      : "text-amber-400"
                                }
                              >
                                {STATUS_LABEL[r.status] || r.status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {r.status !== "paid" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-emerald-500/15 text-emerald-300 px-2 py-1 text-xs"
                                    onClick={() => updateStatus(r.id, "paid")}
                                  >
                                    Marcar paga
                                  </button>
                                )}
                                {r.status !== "cancelled" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-red-500/15 text-red-300 px-2 py-1 text-xs"
                                    onClick={() => updateStatus(r.id, "cancelled")}
                                  >
                                    Cancelar
                                  </button>
                                )}
                                {r.status === "paid" && (
                                  <button
                                    type="button"
                                    className="rounded-lg bg-white/10 text-muted px-2 py-1 text-xs"
                                    onClick={() => updateStatus(r.id, "refunded")}
                                  >
                                    Reembolsar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-white/90">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-glass rounded-xl p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-0.5 text-white">{value}</p>
    </div>
  );
}

function PayBar({ paid, pending }: { paid: number; pending: number }) {
  const total = paid + pending || 1;
  const pctPaid = Math.round((paid / total) * 100);
  return (
    <div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        <div className="h-full bg-gradient-to-r from-brand to-orange-400 transition-all" style={{ width: `${pctPaid}%` }} />
      </div>
      <p className="text-xs text-muted mt-2">
        {pctPaid}% pagos · {100 - pctPaid}% aguardando (sobre pagos+pendentes)
      </p>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  onClick: () => void;
}) {
  const pct = Math.round((count / total) * 100);
  return (
    <button type="button" onClick={onClick} className="w-full text-left group">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-white/90 group-hover:text-brand">{label}</span>
        <span className="tabular-nums font-bold text-white">
          {count} <span className="text-muted font-normal text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-brand/90 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

function CategoryDonut({
  byCategory,
  total,
}: {
  byCategory: Record<string, number>;
  total: number;
}) {
  const keys = sortCategoryKeys(Object.keys(byCategory));
  const colors = ["#ff6a1a", "#64748b", "#94a3b8", "#f59e0b", "#22c55e"];
  let acc = 0;
  const segs = keys.map((k, i) => {
    const v = byCategory[k] || 0;
    const pct = total > 0 ? (v / total) * 100 : 0;
    const start = acc;
    acc += pct;
    return { k, v, pct, start, color: colors[i % colors.length] };
  });
  const gradient =
    segs.length === 0
      ? "conic-gradient(#334155 0% 100%)"
      : `conic-gradient(${segs
          .map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`)
          .join(", ")})`;

  const top = segs[0];
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-3 rounded-full bg-[#12161f] flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white tabular-nums">
            {top ? Math.round(top.pct) : 0}%
          </span>
          <span className="text-[10px] text-muted truncate max-w-[4.5rem] text-center">
            {top?.k || "—"}
          </span>
        </div>
      </div>
      <ul className="space-y-1.5 text-xs min-w-0">
        {segs.slice(0, 4).map((s) => (
          <li key={s.k} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="truncate text-white/80">{s.k}</span>
            <span className="ml-auto tabular-nums">{Math.round(s.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShirtBars({
  byShirt,
  onSelect,
}: {
  byShirt: Record<string, number>;
  onSelect: (size: string) => void;
}) {
  const keys = sortShirtKeys(Object.keys(byShirt));
  const max = Math.max(1, ...keys.map((k) => byShirt[k] || 0));
  if (keys.length === 0) {
    return <p className="text-sm text-muted">Nenhuma camiseta ainda.</p>;
  }
  return (
    <div className="flex items-end gap-2 h-36">
      {keys.map((size, i) => {
        const v = byShirt[size] || 0;
        const h = Math.max(8, Math.round((v / max) * 100));
        const accent = i % 2 === 0;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            className="flex-1 flex flex-col items-center gap-1 group h-full justify-end"
            title={`${size}: ${v}`}
          >
            <span className="text-[10px] tabular-nums text-muted group-hover:text-white">{v}</span>
            <div
              className="w-full rounded-t-md transition-all group-hover:opacity-90"
              style={{
                height: `${h}%`,
                background: accent
                  ? "linear-gradient(180deg,#ff8f4d,#ff6a1a)"
                  : "rgba(148,163,184,0.45)",
              }}
            />
            <span className="text-[10px] font-semibold text-muted group-hover:text-white">
              {size}
            </span>
          </button>
        );
      })}
    </div>
  );
}


function AdminLayoutTab({ onMessage }: { onMessage: (m: string, e: string | null) => void }) {
  const [layout, setLayout] = useState("wide");

  useEffect(() => {
    const saved = localStorage.getItem("nexora_site_layout");
    if (saved) setLayout(saved);
  }, []);

  const saveLayout = (l: string) => {
    setLayout(l);
    localStorage.setItem("nexora_site_layout", l);
    onMessage("Layout da Vitrine salvo com sucesso!", null);
  };

  const layouts = [
    { id: "wide", name: "Eventos Nexora (Wide)", desc: "Estilo horizontal expansivo com botão inferior" },
    { id: "glass", name: "Glassmorphism", desc: "Cartões translúcidos com neon azul de fundo" },
    { id: "minimal", name: "Minimalista Tech", desc: "Design limpo, linhas finas e visual ultra organizado" },
    { id: "3d", name: "Imersão 3D", desc: "Eventos em cards flutuantes com sombras chamativas" },
    { id: "original", name: "Original / Clássico", desc: "Layout antigo padronizado" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Layout da Página Inicial</h2>
        <p className="text-slate-400">
          Escolha como os eventos serão apresentados na capa do seu site (Vitrine). 
          Esta configuração é salva no seu navegador para demonstração.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {layouts.map(l => (
          <div 
            key={l.id} 
            onClick={() => saveLayout(l.id)}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all ${layout === l.id ? 'border-[#007BFF] bg-[#007BFF]/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-white">{l.name}</h3>
              {layout === l.id && <span className="bg-[#007BFF] text-white text-xs px-2 py-1 rounded font-bold uppercase">Ativo</span>}
            </div>
            <p className="text-sm text-slate-400">{l.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <a href="/" target="_blank" className="inline-block bg-[#007BFF] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0056B3]">
          Abrir Vitrine para Conferir
        </a>
      </div>
    </div>
  );
}
