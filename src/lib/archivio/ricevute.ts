import { createAdminClient } from "@/lib/supabase/admin";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

interface DocumentoArchivio {
  userId: string;
  praticaId?: string;
  businessId?: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  categoria?: string;
  buffer: Buffer;
  mimeType: string;
  annoRiferimento?: number;
  scadenza?: string;
  tags?: string[];
  condivisiCon?: string[];
}

interface RicevutaParams {
  userId: string;
  praticaId?: string;
  tipoRicevuta: "pagamento" | "invio_pratica" | "completamento";
  dati: Record<string, any>;
}

// ─── Carica documento su Supabase Storage ─────────────────────────────────────

export async function archiviaSuStorage(
  buffer: Buffer,
  path: string,
  mimeType: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from("documenti")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return null;
  }

  return data.path;
}

// ─── Ottieni URL firmato per download ────────────────────────────────────────

export async function getUrlFirmato(
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from("documenti")
    .createSignedUrl(storagePath, expiresIn);
  return data?.signedUrl ?? null;
}

// ─── Salva documento nell'archivio ────────────────────────────────────────────

export async function salvaDocumento(
  params: DocumentoArchivio,
): Promise<string | null> {
  const supabase = createAdminClient();

  // Path: userId/anno/tipo/nomeFile
  const anno = params.annoRiferimento ?? new Date().getFullYear();
  const nomeFile = `${Date.now()}-${params.nome.replace(/[^a-z0-9.-]/gi, "_")}`;
  const storagePath = `${params.userId}/${anno}/${params.tipo}/${nomeFile}`;

  // Upload su Storage
  const path = await archiviaSuStorage(
    params.buffer,
    storagePath,
    params.mimeType,
  );
  if (!path) return null;

  // Salva metadati nel DB
  const { data, error } = await supabase
    .from("archivio_documenti")
    .insert({
      user_id: params.userId,
      pratica_id: params.praticaId ?? null,
      business_id: params.businessId ?? null,
      nome: params.nome,
      descrizione: params.descrizione ?? null,
      tipo: params.tipo,
      categoria: params.categoria ?? "generale",
      storage_path: path,
      storage_bucket: "documenti",
      mime_type: params.mimeType,
      size_bytes: params.buffer.length,
      anno_riferimento: anno,
      scadenza: params.scadenza ?? null,
      tags: JSON.stringify(params.tags ?? []),
      condiviso_con: JSON.stringify(params.condivisiCon ?? []),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Archivio insert error:", error);
    return null;
  }

  return data.id;
}

// ─── Genera PDF ricevuta pratica ─────────────────────────────────────────────

export async function generaRicevutaPDF(params: RicevutaParams): Promise<void> {
  const supabase = createAdminClient();

  // Dati pratica se disponibile
  let pratica: any = null;
  if (params.praticaId) {
    const { data } = await supabase
      .from("pratiche")
      .select("*, user:profiles(nome, cognome, email, codice_fiscale)")
      .eq("id", params.praticaId)
      .single();
    pratica = data;
  }

  // Dati utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cognome, email")
    .eq("id", params.userId)
    .single();

  // Genera PDF con pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const verde = rgb(0, 0.769, 0.549); // #00C48C
  const scuro = rgb(0.051, 0.067, 0.09); // #0D1117
  const grigio = rgb(0.533, 0.573, 0.643); // #8892A4

  // Header sfondo scuro
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: scuro,
  });

  // Logo
  page.drawText("zipra", {
    x: 48,
    y: height - 60,
    size: 28,
    font: fontBold,
    color: verde,
  });
  page.drawText("⚡", {
    x: 105,
    y: height - 58,
    size: 14,
    font: fontNorm,
    color: verde,
  });

  // Tipo documento
  const titoliRicevuta = {
    pagamento: "RICEVUTA DI PAGAMENTO",
    invio_pratica: "CONFERMA INVIO PRATICA",
    completamento: "CERTIFICATO DI COMPLETAMENTO",
  };
  page.drawText(titoliRicevuta[params.tipoRicevuta], {
    x: 48,
    y: height - 85,
    size: 9,
    font: fontBold,
    color: rgb(0.627, 0.643, 0.675),
  });

  let y = height - 130;

  // Intestazione documento
  page.drawText("Zipra S.r.l.", {
    x: 48,
    y,
    size: 11,
    font: fontBold,
    color: scuro,
  });
  y -= 18;
  page.drawText("Via Roma 1 — 73100 Lecce (LE)", {
    x: 48,
    y,
    size: 9,
    font: fontNorm,
    color: grigio,
  });
  y -= 14;
  page.drawText("P.IVA: IT12345678901", {
    x: 48,
    y,
    size: 9,
    font: fontNorm,
    color: grigio,
  });
  y -= 14;
  page.drawText("notifiche@zipra.it", {
    x: 48,
    y,
    size: 9,
    font: fontNorm,
    color: grigio,
  });

  // Data e numero
  const dataOggi = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.drawText(`Data: ${dataOggi}`, {
    x: width - 200,
    y: height - 130,
    size: 9,
    font: fontNorm,
    color: grigio,
  });

  y -= 30;

  // Linea separatore
  page.drawLine({
    start: { x: 48, y },
    end: { x: width - 48, y },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  y -= 24;

  // Sezione cliente
  page.drawText("CLIENTE", {
    x: 48,
    y,
    size: 8,
    font: fontBold,
    color: grigio,
  });
  y -= 18;
  page.drawText(`${profile?.nome ?? ""} ${profile?.cognome ?? ""}`, {
    x: 48,
    y,
    size: 11,
    font: fontBold,
    color: scuro,
  });
  y -= 16;
  page.drawText(profile?.email ?? "", {
    x: 48,
    y,
    size: 9,
    font: fontNorm,
    color: grigio,
  });
  y -= 30;

  // Sezione pratica (se disponibile)
  if (pratica) {
    page.drawText("PRATICA", {
      x: 48,
      y,
      size: 8,
      font: fontBold,
      color: grigio,
    });
    y -= 18;
    page.drawText(pratica.numero_pratica, {
      x: 48,
      y,
      size: 11,
      font: fontBold,
      color: verde,
    });
    y -= 16;
    page.drawText(
      `${pratica.nome_impresa} — ${pratica.comune_sede} (${pratica.provincia_sede})`,
      {
        x: 48,
        y,
        size: 9,
        font: fontNorm,
        color: scuro,
      },
    );
    y -= 14;
    page.drawText(
      `${pratica.tipo_attivita} · ${pratica.forma_giuridica} · ATECO ${pratica.codice_ateco}`,
      {
        x: 48,
        y,
        size: 9,
        font: fontNorm,
        color: grigio,
      },
    );
    y -= 30;
  }

  // Linea separatore
  page.drawLine({
    start: { x: 48, y },
    end: { x: width - 48, y },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  y -= 24;

  // Dettagli specifici per tipo ricevuta
  if (params.tipoRicevuta === "pagamento") {
    page.drawText("DETTAGLIO PAGAMENTO", {
      x: 48,
      y,
      size: 8,
      font: fontBold,
      color: grigio,
    });
    y -= 20;
    page.drawText(`Piano: ${(params.dati.piano as string).toUpperCase()}`, {
      x: 48,
      y,
      size: 10,
      font: fontNorm,
      color: scuro,
    });
    y -= 40;

    // Box importo
    page.drawRectangle({
      x: 48,
      y: y - 10,
      width: width - 96,
      height: 44,
      color: rgb(0.97, 0.97, 0.97),
    });
    page.drawText("TOTALE PAGATO", {
      x: 60,
      y: y + 16,
      size: 8,
      font: fontBold,
      color: grigio,
    });
    page.drawText(`€${params.dati.importo?.toFixed(2).replace(".", ",")}`, {
      x: 60,
      y: y - 2,
      size: 22,
      font: fontBold,
      color: verde,
    });
    page.drawText("IVA inclusa", {
      x: 200,
      y: y - 2,
      size: 8,
      font: fontNorm,
      color: grigio,
    });
    y -= 60;

    if (params.dati.stripe_session_id) {
      page.drawText(`ID transazione: ${params.dati.stripe_session_id}`, {
        x: 48,
        y,
        size: 8,
        font: fontNorm,
        color: grigio,
      });
      y -= 20;
    }
  }

  if (params.tipoRicevuta === "invio_pratica") {
    page.drawText("CONFERMA INVIO", {
      x: 48,
      y,
      size: 8,
      font: fontBold,
      color: grigio,
    });
    y -= 20;
    if (params.dati.ente) {
      page.drawText(`Ente: ${params.dati.ente}`, {
        x: 48,
        y,
        size: 10,
        font: fontNorm,
        color: scuro,
      });
      y -= 16;
    }
    if (params.dati.numero_protocollo) {
      page.drawText(`N. Protocollo: ${params.dati.numero_protocollo}`, {
        x: 48,
        y,
        size: 10,
        font: fontBold,
        color: verde,
      });
      y -= 16;
    }
    if (params.dati.data_protocollo) {
      page.drawText(`Data protocollo: ${params.dati.data_protocollo}`, {
        x: 48,
        y,
        size: 9,
        font: fontNorm,
        color: scuro,
      });
    }
  }

  if (params.tipoRicevuta === "completamento") {
    page.drawRectangle({
      x: 48,
      y: y - 20,
      width: width - 96,
      height: 60,
      color: rgb(0, 0.769, 0.549),
      opacity: 0.08,
    });
    page.drawText("🎉 IMPRESA UFFICIALMENTE REGISTRATA", {
      x: 60,
      y: y + 22,
      size: 11,
      font: fontBold,
      color: verde,
    });
    page.drawText("Tutte le pratiche sono state completate con successo.", {
      x: 60,
      y: y + 4,
      size: 9,
      font: fontNorm,
      color: scuro,
    });
    page.drawText(
      `Apertura completata il: ${new Date().toLocaleDateString("it-IT")}`,
      {
        x: 60,
        y: y - 12,
        size: 9,
        font: fontNorm,
        color: grigio,
      },
    );
  }

  // Footer
  page.drawLine({
    start: { x: 48, y: 60 },
    end: { x: width - 48, y: 60 },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText(
    "Zipra non sostituisce la consulenza di un professionista abilitato.",
    {
      x: 48,
      y: 44,
      size: 7.5,
      font: fontNorm,
      color: grigio,
    },
  );
  page.drawText("zipra.it", {
    x: width - 90,
    y: 44,
    size: 7.5,
    font: fontBold,
    color: verde,
  });

  // Esporta PDF
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  const nomeFile = `ricevuta-${params.tipoRicevuta}-${Date.now()}.pdf`;

  // Archivia documento
  const docId = await salvaDocumento({
    userId: params.userId,
    praticaId: params.praticaId,
    nome: nomeFile,
    descrizione: `${titoliRicevuta[params.tipoRicevuta]} — ${new Date().toLocaleDateString("it-IT")}`,
    tipo: "ricevuta_pratica",
    buffer: pdfBuffer,
    mimeType: "application/pdf",
    annoRiferimento: new Date().getFullYear(),
    tags: [params.tipoRicevuta, "ricevuta"],
  });

  // Salva anche nella tabella ricevute_pratiche (se è una pratica)
  if (params.praticaId && docId) {
    const tipoRicevutaMap: Record<string, string> = {
      pagamento: "completamento",
      invio_pratica: "invio_telematico",
      completamento: "completamento",
    };

    const storageUrl = await getUrlFirmato(
      `${params.userId}/${new Date().getFullYear()}/ricevuta_pratica/${nomeFile}`,
      86400 * 365,
    );

    await supabase.from("ricevute_pratiche").insert({
      pratica_id: params.praticaId,
      user_id: params.userId,
      tipo: tipoRicevutaMap[params.tipoRicevuta],
      ente: params.dati.ente ?? "Zipra",
      numero_protocollo: params.dati.numero_protocollo ?? null,
      data_protocollo: params.dati.data_protocollo ?? null,
      contenuto: params.dati,
      pdf_url: storageUrl,
      inviata_email: false,
    });
  }
}
