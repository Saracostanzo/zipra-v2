import { NextRequest, NextResponse } from "next/server";
import { parseYousignWebhook, scaricaPDFFirmato } from "@/lib/yousign";
import { gestisciFirmaCompletata } from "@/lib/firma/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvaDocumento } from "@/lib/archivio/ricevute";
import { createHmac, timingSafeEqual } from "crypto";

// ─── Verifica HMAC webhook Yousign ────────────────────────────────────────────

function verificaFirmaWebhook(
  payload: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[Yousign] YOUSIGN_WEBHOOK_SECRET non configurato — webhook non verificato"
    );
    return true;
  }

  if (!signatureHeader) return false;

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

  // 🔐 Verifica sicurezza in produzione
  if (
    process.env.NODE_ENV === "production" &&
    process.env.YOUSIGN_SANDBOX !== "true"
  ) {
    if (!verificaFirmaWebhook(rawBody, signatureHeader)) {
      console.error("[Yousign] Firma webhook non valida");
      return NextResponse.json(
        { error: "Firma webhook non valida" },
        { status: 401 }
      );
    }
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

  console.log(
    "[Yousign]",
    evento.tipo,
    evento.requestId,
    evento.externalId
  );

  if (evento.tipo === "firmata") {
    const supabase = createAdminClient();

    // 🔹 Recupera delega
    const { data: delega, error } = await supabase
      .from("deleghe")
      .select("user_id, pratica_id")
      .eq("yousign_signature_request_id", evento.requestId)
      .single();

    if (error || !delega) {
      console.error("[Yousign] Delega non trovata", evento.requestId);
      return NextResponse.json({ received: true });
    }

    // 🔹 Recupera documento firmato
    const docId =
      body?.data?.signature_request?.documents?.[0]?.id;

    if (docId) {
      try {
        const pdfFirmato = await scaricaPDFFirmato(
          evento.requestId,
          docId
        );

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
              .update({
                pdf_firmato_url: `/archivio/${docIdArchivio}`,
              })
              .eq(
                "yousign_signature_request_id",
                evento.requestId
              );
          }
        }
      } catch (err) {
        console.error("[Yousign] errore PDF:", err);
      }
    }

    // 🔹 Logica business
    try {
      await gestisciFirmaCompletata({
        requestId: evento.requestId,
        externalId: evento.externalId,
      });
    } catch (err) {
      console.error("[Yousign] errore business:", err);
    }

    // 💣 SEGNA PROFILO COME FIRMATO
    await supabase
      .from("profiles")
      .update({
        firma_digitale_autorizzata: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", delega.user_id);

    // 💣 SBLOCCA PRATICA
    if (delega.pratica_id) {
      await supabase
        .from("pratiche")
        .update({
          stato: "in_lavorazione",
          updated_at: new Date().toISOString(),
        })
        .eq("id", delega.pratica_id);
    }

    console.log("[Yousign] Firma completata → pratica sbloccata");
  }

  if (evento.tipo === "rifiutata") {
    console.log("[Yousign] Firma rifiutata:", evento.requestId);
  }

  if (evento.tipo === "scaduta") {
    console.log("[Yousign] Firma scaduta:", evento.requestId);
  }

  return NextResponse.json({ received: true });
}