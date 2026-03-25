import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { creaRichiestaDiFirma, getStatoFirma } from "@/lib/yousign";

// ─── Testo legale procura ─────────────────────────────────────────────────────

function buildTestoProcura(dati: {
  nome: string;
  cognome: string;
  luogo_nascita: string;
  data_nascita: string;
  codice_fiscale: string;
  residenza: string;
}): string {
  const oggi = new Date().toLocaleDateString("it-IT");
  return `PROCURA SPECIALE

Il/La sottoscritto/a ${dati.nome} ${dati.cognome}, nato/a a ${dati.luogo_nascita} il ${dati.data_nascita},
codice fiscale ${dati.codice_fiscale}, residente in ${dati.residenza}
(di seguito "il Mandante"),

CONFERISCE PROCURA SPECIALE

a Zipra S.r.l., nella persona dei suoi rappresentanti legali pro tempore
(di seguito "il Mandatario"),

a compiere in nome e per conto del Mandante tutti gli atti e le formalità necessarie per:

a) Presentare pratiche presso il Registro delle Imprese e la Camera di Commercio
   competente, incluse domande di iscrizione, variazione e cessazione;

b) Trasmettere la Comunicazione Unica (ComUnica) per l'apertura, variazione e
   cessazione di impresa ai sensi del D.Lgs. 25 novembre 2016, n. 219;

c) Presentare Segnalazioni Certificate di Inizio Attività (SCIA) allo Sportello
   Unico delle Attività Produttive (SUAP) di qualsiasi Comune;

d) Richiedere all'Agenzia delle Entrate il codice fiscale e/o la partita IVA,
   nonché effettuare variazioni di dati anagrafici fiscali;

e) Richiedere l'iscrizione alla gestione previdenziale INPS per artigiani e
   commercianti, nonché a qualsiasi altra gestione INPS pertinente;

f) Richiedere certificati e documenti amministrativi, incluso il certificato del
   casellario giudiziale, ai fini esclusivi delle pratiche sopra indicate;

g) Compiere qualsiasi ulteriore atto amministrativo connesso all'apertura,
   gestione e cessazione dell'attività imprenditoriale del Mandante.

La presente procura NON include poteri patrimoniali, contrattuali o di disposizione
di beni del Mandante ed è valida per la durata del rapporto contrattuale con Zipra.
Può essere revocata in qualsiasi momento con comunicazione scritta a info@zipra.it.

Data: ${oggi}

Il Mandante (firma digitale): ____________________________
`;
}

// ─── Genera PDF minimo da testo (senza dipendenze esterne) ───────────────────

function buildPDFBuffer(testo: string): Buffer {
  // PDF minimale valido — Yousign lo accetta per aggiungere il campo firma sopra
  const lines = testo.split("\n");
  const pdfLines = lines
    .map(
      (line, i) =>
        `BT /F1 10 Tf 50 ${750 - i * 14} Td (${line.replace(/[()\\]/g, "\\$&")}) Tj ET`,
    )
    .join("\n");

  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${pdfLines.length}>>
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
// Genera e invia procura speciale via Yousign

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

  // Costruisci testo e PDF
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
      telefono,
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
  }

  // ─── Mock: salva bozza su storage e crea todo admin ──────────────────────
  const fileName = `procura_${codice_fiscale}_${Date.now()}.pdf`;
  const storagePath = `${user.id}/procure/${fileName}`;

  await supabase.storage
    .from("documenti-pratiche")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });

  const { data: urlData } = supabase.storage
    .from("documenti-pratiche")
    .getPublicUrl(storagePath);

  await supabase
    .from("profiles")
    .update({
      procura_bozza_url: urlData.publicUrl,
    })
    .eq("id", user.id);

  // Todo admin per firma manuale
  await supabase.from("todo_admin").insert({
    pratica_id: pratica_id || null,
    tipo: "procura_firma_manuale",
    priorita: "altissima",
    descrizione: `Procura speciale da far firmare a ${nome} ${cognome} (CF: ${codice_fiscale})`,
    istruzioni: [
      `1. Configura YOUSIGN_API_KEY in .env per automatizzare`,
      `2. Nel frattempo: scarica la bozza → ${urlData.publicUrl}`,
      `3. Invia PDF via email a ${email} e chiedi firma autografa`,
      `4. Dopo firma: aggiorna profiles.procura_firmata = true per user ${user.id}`,
    ].join("\n"),
    dati: {
      nome,
      cognome,
      codice_fiscale,
      email,
      procura_url: urlData.publicUrl,
    },
    completato: false,
  });

  return NextResponse.json({
    success: true,
    mock: true,
    procura_bozza_url: urlData.publicUrl,
    messaggio:
      "Procura generata — in attesa di firma manuale (configura Yousign per automatizzare)",
  });
}

// ─── GET /api/procura?pratica_id=xxx ─────────────────────────────────────────
// Controlla se la procura è stata firmata

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pratica_id = searchParams.get("pratica_id");

  // Leggi stato dal profilo
  const { data: profile } = await supabase
    .from("profiles")
    .select("procura_firmata, procura_url, yousign_procura_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ firmata: false });

  // Se già firmata in DB → ritorna subito
  if (profile.procura_firmata) {
    return NextResponse.json({
      firmata: true,
      procura_url: profile.procura_url,
    });
  }

  // Se Yousign configurato e c'è un request_id → controlla stato live
  if (process.env.YOUSIGN_API_KEY && profile.yousign_procura_id) {
    const stato = await getStatoFirma(profile.yousign_procura_id);

    if (stato?.stato === "firmata") {
      // Aggiorna DB
      await supabase
        .from("profiles")
        .update({
          procura_firmata: true,
          procura_firmata_il: stato.dataFirma || new Date().toISOString(),
          procura_url: stato.pdfFirmatoUrl || null,
        })
        .eq("id", user.id);

      if (pratica_id) {
        await supabase
          .from("pratiche")
          .update({
            procura_firmata: true,
            procura_firmata_il: stato.dataFirma || new Date().toISOString(),
          })
          .eq("id", pratica_id);
      }

      return NextResponse.json({ firmata: true, stato: "firmata" });
    }

    return NextResponse.json({
      firmata: false,
      stato: stato?.stato || "sconosciuto",
    });
  }

  return NextResponse.json({ firmata: false, stato: "in_attesa" });
}
