import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificaReiezone } from "@/lib/notifications/service";

/**
 * POST /api/admin/pratiche/[id]/reiezione
 *
 * Chiamato dall'admin quando un ente respinge una pratica.
 * Può arrivare:
 *   - Manualmente (admin lo inserisce dopo aver visto la risposta dell'ente)
 *   - Automaticamente (da Telemaco webhook quando risponde con errore)
 *
 * Effetti:
 *   1. Stato pratica → 'respinta_ente'
 *   2. Salva record in reiezone_pratiche con motivo e dettagli
 *   3. Incrementa contatore reiezone sulla pratica
 *   4. Notifica utente (email + SMS) con messaggio rassicurante
 *   5. Notifica admin per presa in carico correzione
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

  const { ente, motivoReiezione, dettagliTecnici, checklistItemId, noteAdmin } =
    await req.json();

  if (!ente || !motivoReiezione) {
    return NextResponse.json(
      { error: "ente e motivoReiezione obbligatori" },
      { status: 400 },
    );
  }

  const praticaId = params.id;
  const adminSupabase = createAdminClient();

  // 1. Recupera pratica
  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*, user:profiles(id, nome, cognome, email)")
    .eq("id", praticaId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  // 2. Aggiorna stato pratica
  await adminSupabase
    .from("pratiche")
    .update({
      stato: "respinta_ente",
      num_reiezone: (pratica.num_reiezone ?? 0) + 1,
      ultimo_motivo_reiezione: motivoReiezione,
      data_ultima_reiezione: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", praticaId);

  // 3. Aggiorna stato checklist item se specificato
  if (checklistItemId) {
    await adminSupabase
      .from("checklist_items")
      .update({
        stato: "da_fare",
        note: `❌ Respinta da ${ente}: ${motivoReiezione}`,
      })
      .eq("id", checklistItemId);
  }

  // 4. Salva record reiezione
  await adminSupabase.from("reiezone_pratiche").insert({
    pratica_id: praticaId,
    checklist_item_id: checklistItemId ?? null,
    ente,
    motivo_reiezione: motivoReiezione,
    dettagli_tecnici: dettagliTecnici ?? null,
    note_admin: noteAdmin ?? null,
    reinoltro_gratuito: true,
  });

  // 5. Notifica utente — tono rassicurante, reinoltro gratuito
  await notificaReiezone({
    userId: pratica.user_id,
    praticaId,
    ente,
    motivoReiezione,
    numeroPratica: pratica.numero_pratica,
    nomeImpresa: pratica.nome_impresa,
  });

  // 6. Nota interna admin
  await adminSupabase.from("admin_notes").insert({
    pratica_id: praticaId,
    admin_id: user.id,
    nota: `REIEZIONE da ${ente}: ${motivoReiezione}${dettagliTecnici ? ` — Dettagli tecnici: ${dettagliTecnici}` : ""}`,
    tipo: "respinta",
  });

  return NextResponse.json({ success: true });
}
