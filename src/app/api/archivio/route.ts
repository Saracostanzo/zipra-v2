import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvaDocumento, getUrlFirmato } from "@/lib/archivio/ricevute";

// ─── GET: lista documenti archivio ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const praticaId = searchParams.get("pratica_id");
  const tipo = searchParams.get("tipo");
  const anno = searchParams.get("anno");

  let query = supabase
    .from("archivio_documenti")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (praticaId) query = query.eq("pratica_id", praticaId);
  if (tipo) query = query.eq("tipo", tipo);
  if (anno) query = query.eq("anno_riferimento", parseInt(anno));

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Genera URL firmati per il download
  const documenti = await Promise.all(
    (data ?? []).map(async (doc) => ({
      ...doc,
      download_url: await getUrlFirmato(doc.storage_path, 3600),
    })),
  );

  return NextResponse.json({ documenti });
}

// ─── POST: carica nuovo documento ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const nome = formData.get("nome") as string;
  const tipo = formData.get("tipo") as string;
  const praticaId = formData.get("pratica_id") as string | null;
  const descrizione = formData.get("descrizione") as string | null;
  const tags = formData.get("tags") as string | null;

  if (!file || !nome || !tipo) {
    return NextResponse.json(
      { error: "File, nome e tipo obbligatori" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const docId = await salvaDocumento({
    userId: user.id,
    praticaId: praticaId ?? undefined,
    nome,
    descrizione: descrizione ?? undefined,
    tipo,
    buffer,
    mimeType: file.type,
    annoRiferimento: new Date().getFullYear(),
    tags: tags ? JSON.parse(tags) : [],
  });

  if (!docId)
    return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });

  return NextResponse.json({ success: true, id: docId });
}
