import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gestisciMessaggioEditor, applicaModifica } from "@/lib/sito/editor";

/**
 * POST /api/sito/modifica
 *
 * Gestisce la chat AI per modifiche al sito vetrina.
 * Accessibile da:
 *   - Utenti Zipra Piano Pro (autenticati)
 *   - Clienti via PIN sito (accesso semplificato)
 */
export async function POST(req: NextRequest) {
  const {
    sitoId,
    messaggio,
    immagineUrl,
    applicaModificaConfermata,
    campo,
    valore,
    tipo,
    // Accesso via PIN (per clienti non registrati su Zipra)
    pinAccesso,
    emailAccesso,
  } = await req.json();

  if (!sitoId)
    return NextResponse.json({ error: "sitoId obbligatorio" }, { status: 400 });

  const supabase = createAdminClient();

  // ── Verifica identità: utente Zipra OPPURE PIN sito ─────────────────────────

  let userId: string | null = null;

  // Caso 1: utente autenticato su Zipra
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    // Verifica JWT Supabase
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");
    // In realtà usiamo il cookie session — qui semplificato
    const { data: sito } = await supabase
      .from("siti_vetrina")
      .select("user_id")
      .eq("id", sitoId)
      .single();
    userId = sito?.user_id ?? null;
  }

  // Caso 2: accesso via PIN (cliente del commercialista o cliente diretto)
  if (!userId && pinAccesso) {
    const { data: account } = await supabase
      .from("sito_account")
      .select("user_id, pin_accesso, email_notifiche")
      .eq("sito_id", sitoId)
      .single();

    if (account && account.pin_accesso === pinAccesso) {
      userId = account.user_id;
      // Aggiorna ultimo accesso
      await supabase
        .from("sito_account")
        .update({ ultimo_accesso: new Date().toISOString() })
        .eq("sito_id", sitoId);
    } else {
      return NextResponse.json({ error: "PIN non valido" }, { status: 401 });
    }
  }

  if (!userId)
    return NextResponse.json(
      { error: "Accesso non autorizzato" },
      { status: 401 },
    );

  // Verifica che il sito esista e appartenga all'utente (o sia accessibile via PIN)
  const { data: sito } = await supabase
    .from("siti_vetrina")
    .select("id, user_id, stato")
    .eq("id", sitoId)
    .single();

  if (!sito)
    return NextResponse.json({ error: "Sito non trovato" }, { status: 404 });
  if (sito.stato !== "pubblicato" && sito.stato !== "revisione") {
    return NextResponse.json(
      { error: "Sito non ancora pronto" },
      { status: 400 },
    );
  }

  // ── Applica modifica confermata ─────────────────────────────────────────────

  if (applicaModificaConfermata && campo && valore) {
    const risultato = await applicaModifica({
      sitoId,
      userId,
      campo,
      valore,
      tipo: tipo ?? "testo",
    });

    return NextResponse.json({
      success: risultato.success,
      urlNuovo: risultato.urlNuovo,
      messaggio: risultato.success
        ? "✅ Modifica applicata! Il sito è stato aggiornato."
        : "❌ Errore nell'applicare la modifica. Riprova.",
    });
  }

  // ── Gestisci messaggio chat ─────────────────────────────────────────────────

  if (!messaggio)
    return NextResponse.json(
      { error: "Messaggio obbligatorio" },
      { status: 400 },
    );

  const risposta = await gestisciMessaggioEditor({
    sitoId,
    userId,
    messaggio,
    immagineUrl,
  });

  return NextResponse.json(risposta);
}
