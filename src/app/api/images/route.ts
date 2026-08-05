export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/admin-auth";
import { isDemoMode } from "@/lib/demo-data";
import { getActiveEvent } from "@/lib/event";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "event-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Lista fotos do evento (público). */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (isDemoMode()) {
    const base =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
      const qs = eventId ? `?id=${eventId}` : "";
      const res = await fetch(`${base}/api/event${qs}`, { cache: "no-store" });
      const data = await res.json();
      return NextResponse.json({
        demo: true,
        images: data.event?.images ?? [],
        cover: data.event?.cover_image_url ?? null,
      });
    } catch {
      return NextResponse.json({ demo: true, images: [], cover: null });
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  try {
    const { getEventById } = await import("@/lib/event");
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ images: event.images, cover: event.cover_image_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Upload de foto (admin). FormData: file + opcional caption */
export async function POST(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (isDemoMode()) {
    const { getDemoEvent, setDemoEvent } = require('@/lib/demo-data');
    const ev = getDemoEvent(eventId);
    
    // Ler o arquivo e converter para base64
    const formData = await req.formData().catch(() => null);
    const file = formData ? formData.get("file") as Blob | null : null;
    let url = `https://picsum.photos/1200/800?random=${Date.now()}`;
    
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      url = `data:${file.type};base64,${buffer.toString("base64")}`;
    }
    
    const mockImage = {
      id: crypto.randomUUID(),
      event_id: ev?.id || "demo",
      url,
      storage_path: "demo/mock.jpg",
      caption: "Foto adicionada",
      sort_order: (ev?.images || []).length,
      is_cover: false,
      created_at: new Date().toISOString()
    };
    const nextEvent = { ...ev, images: [...(ev?.images || []), mockImage] } as any;
    if (ev) setDemoEvent(nextEvent);
    return NextResponse.json({ ok: true, demo: true, image: mockImage, event: nextEvent });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  try {
    const { getEventById } = await import("@/lib/event");
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const caption = String(form.get("caption") || "").slice(0, 200);
    const setCover = String(form.get("set_cover") || "") === "1";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WEBP ou GIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem no máximo 5 MB." }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";

    const path = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upError) throw upError;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const sort_order = event.images.length;

    if (setCover || event.images.length === 0) {
      await supabase
        .from("event_images")
        .update({ is_cover: false })
        .eq("event_id", event.id);
    }

    const { data: image, error: insertError } = await supabase
      .from("event_images")
      .insert({
        event_id: event.id,
        url,
        storage_path: path,
        caption,
        sort_order,
        is_cover: setCover || event.images.length === 0,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    if (setCover || event.images.length === 0) {
      await supabase
        .from("events")
        .update({
          cover_image_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }

    const updated = await getActiveEvent();
    return NextResponse.json({ image, event: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
