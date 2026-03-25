import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificaReinoltro } from "@/lib/notifications/service";
import { generaRicevutaPDF } from "@/lib/archivio/ricevute";

/**
 * POST /api/admin/pratiche/[id]/reinoltro
 *
 * Chiamato dall'admin quando ha corretto la pratica e la reinvia.
 * Il reinoltro è SEMPRE gratuito per policy — tracciato esplicitamente nel DB.
 *
 * Effetti:
 *   1. Stato pratica → 'reinoltrata'
 *   2. Aggiorna record reiezione con correzioni e data reinoltro
 *   3. Genera ricevuta reinoltro e archivia
 *   4. Notifica utente (email) — messaggio positivo
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { correzioniApportate, numeroProtocolloReinoltro, ente } =
    await req.json();

  const praticaId = params.id;
  const adminSupabase = createAdminClient();

  // 1. Recupera pratica + ultima reiezione
  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*, user:profiles(id, nome, cognome, email)")
    .eq("id", praticaId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  const { data: ultimaReiezione } = await adminSupabase
    .from("reiezone_pratiche")
    .select("id")
    .eq("pratica_id", praticaId)
    .is("data_reinoltro", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 2. Aggiorna stato pratica
  await adminSupabase
    .from("pratiche")
    .update({
      stato: "reinoltrata",
      updated_at: new Date().toISOString(),
    })
    .eq("id", praticaId);

  // 3. Aggiorna record reiezione con dati del reinoltro
  if (ultimaReiezione) {
    await adminSupabase
      .from("reiezone_pratiche")
      .update({
        correzioni_apportate: correzioniApportate ?? null,
        data_reinoltro: new Date().toISOString(),
        numero_protocollo_reinoltro: numeroProtocolloReinoltro ?? null,
        reinoltro_gratuito: true, // sempre — policy aziendale
      })
      .eq("id", ultimaReiezione.id);
  }

  // 4. Aggiorna checklist item a 'in_corso'
  await adminSupabase
    .from("checklist_items")
    .update({
      stato: "in_corso",
    })
    .eq("pratica_id", praticaId)
    .eq("stato", "da_fare");

  // 5. Nota admin
  await adminSupabase.from("admin_notes").insert({
    pratica_id: praticaId,
    admin_id: user.id,
    nota: `REINOLTRO GRATUITO a ${ente ?? "ente"}${correzioniApportate ? ` — Correzioni: ${correzioniApportate}` : ""}${numeroProtocolloReinoltro ? ` — Prot: ${numeroProtocolloReinoltro}` : ""}`,
    tipo: "approvazione",
  });

  // 6. Genera ricevuta reinoltro e archivia
  await generaRicevutaPDF({
    userId: pratica.user_id,
    praticaId,
    tipoRicevuta: "invio_pratica",
    dati: {
      ente: ente ?? "Ente competente",
      numero_protocollo: numeroProtocolloReinoltro,
      data_protocollo: new Date().toLocaleDateString("it-IT"),
      note: "Reinoltro gratuito dopo correzione",
      correzioni: correzioniApportate,
    },
  });

  // 7. Notifica utente — tono positivo
  await notificaReinoltro({
    userId: pratica.user_id,
    praticaId,
    ente: ente ?? "ente competente",
    numeroPratica: pratica.numero_pratica,
    nomeImpresa: pratica.nome_impresa,
  });

  return NextResponse.json({ success: true });
}
