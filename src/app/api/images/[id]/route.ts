import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/admin-auth";
import { getActiveEvent } from "@/lib/event";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "event-photos";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE remove foto. PATCH ?action=cover define como capa. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (require('@/lib/demo-data').isDemoMode()) {
    const { id } = await ctx.params;
    const { getDemoEvent, setDemoEvent } = require('@/lib/demo-data');
    const ev = getDemoEvent();
    if (ev) {
      const images = ev.images || [];
      const image = images.find((i: any) => i.id === id);
      if (image) {
        const nextImages = images.filter((i: any) => i.id !== id);
        let coverUrl = ev.cover_image_url;
        if (coverUrl === image.url || image.is_cover) {
          coverUrl = nextImages.length > 0 ? nextImages[0].url : null;
          if (nextImages.length > 0) nextImages[0].is_cover = true;
        }
        const nextEvent = { ...ev, images: nextImages, cover_image_url: coverUrl };
        setDemoEvent(nextEvent);
        return NextResponse.json({ ok: true, event: nextEvent });
      }
    }
    return NextResponse.json({ error: "Imagem não encontrada na demo." }, { status: 404 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const supabase = getServiceSupabase();
    const { data: image, error } = await supabase
      .from("event_images")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !image) {
      return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
    }

    await supabase.storage.from(BUCKET).remove([image.storage_path]);
    await supabase.from("event_images").delete().eq("id", id);

    // Se era capa, limpa ou promove outra
    const { data: event } = await supabase
      .from("events")
      .select("id, cover_image_url")
      .eq("id", image.event_id)
      .single();

    if (event?.cover_image_url === image.url || image.is_cover) {
      const { data: nextImg } = await supabase
        .from("event_images")
        .select("*")
        .eq("event_id", image.event_id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      await supabase
        .from("events")
        .update({
          cover_image_url: nextImg?.url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", image.event_id);

      if (nextImg) {
        await supabase
          .from("event_images")
          .update({ is_cover: true })
          .eq("id", nextImg.id);
      }
    }

    const updated = await getActiveEvent();
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao remover";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (require('@/lib/demo-data').isDemoMode()) {
    const { id } = await ctx.params;
    const { getDemoEvent, setDemoEvent } = require('@/lib/demo-data');
    const ev = getDemoEvent();
    let body: any = {};
    try { body = await req.json(); } catch {}
    if (body.action !== "set_cover") return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    
    if (ev) {
      const images = ev.images || [];
      const image = images.find((i: any) => i.id === id);
      if (image) {
        const nextImages = images.map((i: any) => ({ ...i, is_cover: i.id === id }));
        const nextEvent = { ...ev, images: nextImages, cover_image_url: image.url };
        setDemoEvent(nextEvent);
        return NextResponse.json({ ok: true, event: nextEvent });
      }
    }
    return NextResponse.json({ error: "Imagem não encontrada na demo." }, { status: 404 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  if (body.action !== "set_cover") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: image, error } = await supabase
      .from("event_images")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !image) {
      return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
    }

    await supabase
      .from("event_images")
      .update({ is_cover: false })
      .eq("event_id", image.event_id);

    await supabase
      .from("event_images")
      .update({ is_cover: true })
      .eq("id", id);

    await supabase
      .from("events")
      .update({
        cover_image_url: image.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", image.event_id);

    const updated = await getActiveEvent();
    return NextResponse.json({ ok: true, event: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
