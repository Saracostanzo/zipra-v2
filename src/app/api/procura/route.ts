/**
 * src/app/api/procura/route.ts
 *
 * Genera e invia la procura speciale via Yousign.
 * Chiamato manualmente dal frontend o da avviaOnboardingFirma().
 *
 * BUG FIX: la funzione buildPDFBuffer usava pdfLines.length (caratteri JS)
 * per il campo /Length del PDF, ma il PDF richiede la lunghezza in byte.
 * Con testi contenenti caratteri non-ASCII (accenti, simboli italiani come
 * à è ì ò ù), i byte UTF-8 sono più dei caratteri JS → il PDF era malformato
 * e Yousign lo rifiutava con errore 422.
 * CORREZIONE: Buffer.byteLength(pdfLines, 'utf-8')
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creaRichiestaDiFirma } from "@/lib/yousign";

// ─── Testo procura speciale ───────────────────────────────────────────────────

function buildTestoProcura({
  nome,
  cognome,
  data_nascita,
  luogo_nascita,
  codice_fiscale,
  residenza,
}: {
  nome: string;
  cognome: string;
  data_nascita: string;
  luogo_nascita: string;
  codice_fiscale: string;
  residenza: string;
}): string {
  const oggi = new Date().toLocaleDateString("it-IT");
  const scadenza = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("it-IT");

  return `PROCURA SPECIALE

Il/La sottoscritto/a ${nome} ${cognome},
nato/a a ${luogo_nascita} il ${data_nascita},
codice fiscale: ${codice_fiscale},
residente in ${residenza},

CONFERISCE PROCURA SPECIALE

a Zipra S.r.l., con sede legale in Italia,
per svolgere in nome e per conto del/la sottoscritto/a le seguenti attività:

1. Apertura Partita IVA presso Agenzia delle Entrate (modello AA9/AA7)
2. Iscrizione al Registro delle Imprese presso la Camera di Commercio competente (ComUnica)
3. Iscrizione alla gestione previdenziale INPS (artigiani, commercianti o gestione separata)
4. Presentazione SCIA o domanda di autorizzazione al SUAP del Comune
5. Notifica sanitaria all'ASL/ATS competente per attività alimentari o sanitarie
6. Comunicazione dell'indirizzo PEC al Registro delle Imprese
7. Comunicazione del titolare effettivo al Registro Titolari Effettivi
8. Variazioni, integrazioni e reinoltri relativi alle pratiche elencate
9. Ricezione di comunicazioni, ricevute e notifiche dagli enti competenti

La presente procura NON include poteri patrimoniali, contrattuali o di disposizione
di beni del Mandante ed e' valida per la durata del rapporto contrattuale con Zipra.
Puo' essere revocata in qualsiasi momento con comunicazione scritta a info@zipra.it.

Validita': dal ${oggi} al ${scadenza}

Il Mandante (firma digitale): ____________________________
`;
}

// ─── Genera PDF minimale da testo ────────────────────────────────────────────
// BUG FIX: usa Buffer.byteLength invece di .length per il campo /Length
// .length conta i caratteri UTF-16 di JavaScript, ma il PDF vuole i byte UTF-8.
// Con accenti italiani (à, è, ecc.) ogni carattere occupa 2 byte → length < byteLength
// → il parser PDF pensava che lo stream fosse troncato → file corrotto.

function buildPDFBuffer(testo: string): Buffer {
  const lines = testo.split("\n");
  const pdfLines = lines
    .map(
      (line, i) =>
        `BT /F1 10 Tf 50 ${750 - i * 14} Td (${line.replace(/[()\\]/g, "\\$&")}) Tj ET`
    )
    .join("\n");

  // BUG FIX: Buffer.byteLength per la lunghezza corretta in byte
  const streamLength = Buffer.byteLength(pdfLines, "utf-8");

  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${streamLength}>>
stream
${pdfLines}
endstream
endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
%%EOF`;

  return Buffer.from(content, "utf-8");
}

// ─── POST /api/procura ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const {
    pratica_id,
    nome,
    cognome,
    data_nascita,
    luogo_nascita,
    codice_fiscale,
    residenza,
    email,
    telefono,
  } = await req.json();

  // Valida telefono — non usiamo più il fallback fittizio
  if (!telefono || telefono.trim() === "") {
    return NextResponse.json(
      {
        error:
          "Numero di telefono obbligatorio per l'invio dell'OTP di firma. Aggiornalo nel tuo profilo.",
      },
      { status: 400 }
    );
  }

  const testo = buildTestoProcura({
    nome,
    cognome,
    data_nascita,
    luogo_nascita,
    codice_fiscale,
    residenza,
  });
  const pdfBuffer = buildPDFBuffer(testo);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // ─── Yousign configurato → invia per firma ───────────────────────────────
  if (process.env.YOUSIGN_API_KEY) {
    const risultato = await creaRichiestaDiFirma({
      nome,
      cognome,
      email,
      telefono: telefono.trim(),
      pdfBuffer,
      nomePDF: `procura-speciale-${codice_fiscale}.pdf`,
      tipoFirma: "electronic_signature",
      externalId: pratica_id || user.id,
      redirectSuccesso: `${baseUrl}/dashboard?procura=firmata`,
      campiDaFirmare: [
        { pagina: 1, x: 50, y: 650, larghezza: 200, altezza: 50 },
      ],
    });

    if (risultato) {
      // Salva su profiles
      await supabase
        .from("profiles")
        .update({
          yousign_procura_id: risultato.requestId,
          procura_richiesta_il: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Salva su pratica se fornita
      if (pratica_id) {
        await supabase
          .from("pratiche")
          .update({
            yousign_procura_id: risultato.requestId,
            procura_richiesta_il: new Date().toISOString(),
          })
          .eq("id", pratica_id);
      }

      return NextResponse.json({
        success: true,
        firma_url: risultato.signLink,
        request_id: risultato.requestId,
        messaggio: `Procura inviata via email a ${email} — firma con OTP SMS`,
      });
    }

    // Se creaRichiestaDiFirma restituisce null, registra un todo admin
    console.error("[Procura] creaRichiestaDiFirma ha restituito null");
  }

  // ─── Fallback mock: salva bozza su storage e crea todo admin ─────────────
  const adminSupabase = createAdminClient();
  const fileName = `procura_${codice_fiscale}_${Date.now()}.pdf`;
  const storagePath = `${user.id}/procure/${fileName}`;

  await adminSupabase.storage
    .from("documenti-pratiche")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });

  const { data: urlData } = adminSupabase.storage
    .from("documenti-pratiche")
    .getPublicUrl(storagePath);

  await supabase
    .from("profiles")
    .update({ procura_bozza_url: urlData.publicUrl })
    .eq("id", user.id);

  await adminSupabase.from("todo_admin").insert({
    pratica_id: pratica_id || null,
    tipo: "procura_firma_manuale",
    priorita: "altissima",
    descrizione: `Procura speciale da far firmare a ${nome} ${cognome} (CF: ${codice_fiscale})`,
    istruzioni: [
      `1. Configura YOUSIGN_API_KEY in .env per automatizzare`,
      `2. Nel frattempo: scarica la bozza → ${urlData.publicUrl}`,
      `3. Invia PDF via email a ${email} e chiedi firma autografa`,
      `4. Una volta firmata, carica il PDF firmato nell'archivio e aggiorna lo stato`,
    ],
  });

  return NextResponse.json({
    success: true,
    mock: true,
    bozza_url: urlData.publicUrl,
    messaggio:
      "Yousign non configurato — bozza salvata e todo admin creato per firma manuale",
  });
}