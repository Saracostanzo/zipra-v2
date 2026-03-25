/**
 * src/app/api/firma/webhook/route.ts
 *
 * Webhook Yousign — riceve eventi di firma e aggiorna il DB
 *
 * BUG FIX: la verifica HMAC ora è attiva ogni volta che YOUSIGN_WEBHOOK_SECRET
 * è presente, indipendentemente da YOUSIGN_SANDBOX. In precedenza era bypassata
 * in sandbox, il che significava che in produzione — se YOUSIGN_SANDBOX=true
 * veniva dimenticato — chiunque poteva inviare webhook falsi e sbloccare pratiche.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseYousignWebhook, scaricaPDFFirmato } from "@/lib/yousign";
import { gestisciFirmaCompletata } from "@/lib/firma/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvaDocumento } from "@/lib/archivio/ricevute";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Verifica HMAC webhook Yousign ────────────────────────────────────────────
// BUG FIX: ora verifica sempre se il secret è configurato,
// indipendentemente dall'ambiente (sandbox/production).

function verificaFirmaWebhook(
  payload: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET;

  // Se il secret non è configurato, logga un avviso e lascia passare
  // (utile solo nelle prime fasi di sviluppo locale senza ngrok)
  if (!secret) {
    console.warn(
      "[Yousign] YOUSIGN_WEBHOOK_SECRET non configurato — webhook accettato senza verifica HMAC. " +
      "Configura il secret prima di andare in produzione."
    );
    return true;
  }

  // Se il secret c'è, verifica SEMPRE — sandbox o no
  if (!signatureHeader) {
    console.error("[Yousign] Header x-yousign-signature-256 mancante");
    return false;
  }

  const firma = signatureHeader.replace("sha256=", "");
  const atteso = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(firma, "hex"),
      Buffer.from(atteso, "hex")
    );
  } catch {
    return false;
  }
}

// ─── POST: Webhook Yousign ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-yousign-signature-256");

  // BUG FIX: verifica attiva sempre (non solo in production && non-sandbox)
  if (!verificaFirmaWebhook(rawBody, signatureHeader)) {
    console.error("[Yousign] Firma webhook non valida — richiesta rifiutata");
    return NextResponse.json(
      { error: "Firma webhook non valida" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Body JSON non valido" },
      { status: 400 }
    );
  }

  const evento = parseYousignWebhook(body);

  console.log("[Yousign]", evento.tipo, evento.requestId, evento.externalId);

  if (evento.tipo === "firmata") {
    const supabase = createAdminClient();

    // Recupera delega
    const { data: delega, error } = await supabase
      .from("deleghe")
      .select("user_id, pratica_id")
      .eq("yousign_signature_request_id", evento.requestId)
      .single();

    if (error || !delega) {
      console.error("[Yousign] Delega non trovata per requestId:", evento.requestId);
      // Rispondiamo 200 comunque — Yousign ritente altrimenti
      return NextResponse.json({ received: true });
    }

    // Recupera e archivia il PDF firmato
    const docId = body?.data?.signature_request?.documents?.[0]?.id;

    if (docId) {
      try {
        const pdfFirmato = await scaricaPDFFirmato(evento.requestId, docId);

        if (pdfFirmato) {
          const nomeFile = `firmato-${Date.now()}.pdf`;

          const docIdArchivio = await salvaDocumento({
            userId: delega.user_id,
            praticaId: delega.pratica_id ?? undefined,
            nome: nomeFile,
            descrizione: "Documento firmato digitalmente",
            tipo: "delega",
            buffer: pdfFirmato,
            mimeType: "application/pdf",
            tags: ["firmato", "yousign"],
          });

          if (docIdArchivio) {
            await supabase
              .from("deleghe")
              .update({ pdf_firmato_url: `/archivio/${docIdArchivio}` })
              .eq("yousign_signature_request_id", evento.requestId);
          }
        }
      } catch (err) {
        console.error("[Yousign] Errore download PDF firmato:", err);
        // Non bloccante — il flusso continua anche senza l'archiviazione del PDF
      }
    }

    // Logica business: aggiorna stato deleghe, invia procura se era il contratto, ecc.
    try {
      await gestisciFirmaCompletata({
        requestId: evento.requestId,
        externalId: evento.externalId,
      });
    } catch (err) {
      console.error("[Yousign] Errore gestisciFirmaCompletata:", err);
    }

    // Segna profilo come firmato
    await supabase
      .from("profiles")
      .update({
        firma_digitale_autorizzata: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delega.user_id);

    // Sblocca pratica
    if (delega.pratica_id) {
      await supabase
        .from("pratiche")
        .update({
          stato: "in_lavorazione",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delega.pratica_id);
    }

    console.log("[Yousign] Firma completata → pratica sbloccata per userId:", delega.user_id);
  }

  if (evento.tipo === "rifiutata") {
    console.log("[Yousign] Firma rifiutata:", evento.requestId);
    // TODO: notifica utente e metti pratica in stato "firma_rifiutata"
  }

  if (evento.tipo === "scaduta") {
    console.log("[Yousign] Firma scaduta:", evento.requestId);
    // TODO: notifica utente per far reinviare la firma
  }

  // Rispondi sempre 200 a Yousign — se rispondiamo 4xx/5xx ritenta all'infinito
  return NextResponse.json({ received: true });
}