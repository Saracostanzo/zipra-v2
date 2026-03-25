// src/app/api/enti/comunica/route.ts
// ComUnica via Telemaco (Infocamere)
// Apertura impresa: P.IVA + CCIAA + INPS + INAIL in un solo invio
// Portale: https://webtelemaco.infocamere.it
// Richiede: accreditamento Infocamere come intermediario abilitato

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const TELEMACO_URL =
  process.env.TELEMACO_URL || "https://webtelemaco.infocamere.it/wspratic/rest";
const TELEMACO_USER = process.env.TELEMACO_USER;
const TELEMACO_PASS = process.env.TELEMACO_PASS;
const TELEMACO_CODICE_FISCALE_INTERMEDIARIO = process.env.ZIPRA_CF_PIVA;

// ─── Tipi pratica ComUnica ────────────────────────────────────────────────
type TipoPratica =
  | "apertura_ditta_individuale"
  | "apertura_srl"
  | "apertura_sas"
  | "apertura_snc"
  | "scia_autoriparatori"
  | "scia_impiantisti"
  | "scia_pulizie"
  | "scia_facchinaggio"
  | "scia_acconciatori"
  | "scia_ingrosso"
  | "scia_mediatori"
  | "scia_agenti_commercio"
  | "scia_spedizionieri"
  | "scia_panificio"
  | "scia_verde"
  | "variazione_sede"
  | "variazione_ateco"
  | "variazione_legale_rappresentante"
  | "cessazione";

interface ComUnicaRequest {
  pratica_id: string;
  tipo: TipoPratica;
  dati_impresa: {
    tipo_impresa: "ditta_individuale" | "srl" | "sas" | "snc" | "spa";
    codice_fiscale_titolare: string;
    nome: string;
    cognome: string;
    data_nascita: string;
    luogo_nascita: string;
    residenza: {
      via: string;
      civico: string;
      comune: string;
      cap: string;
      provincia: string;
    };
    sede_impresa: {
      via: string;
      civico: string;
      comune: string;
      cap: string;
      provincia: string;
      codice_comune: string; // codice catastale
    };
    codice_ateco: string;
    descrizione_attivita: string;
    regime_fiscale: "ordinario" | "forfettario" | "semplificato";
    data_inizio: string; // YYYY-MM-DD
    soci?: Array<{ cf: string; nome: string; cognome: string; quota: number }>;
  };
  dati_scia?: {
    responsabile_tecnico_cf?: string;
    responsabile_tecnico_nome?: string;
    responsabile_tecnico_cognome?: string;
    titolo_professionale?: string;
    superfici_locali?: number; // mq
    numero_addetti?: number;
    dichiarazioni_aggiuntive?: Record<string, boolean>;
  };
}

// ─── Mappa codici moduli Telemaco ─────────────────────────────────────────
const MODULI_COMUNICA: Record<TipoPratica, string[]> = {
  apertura_ditta_individuale: ["S1", "S5", "I1"],
  apertura_srl: ["S1", "S5", "I1", "UL"],
  apertura_sas: ["S1", "S5", "I1"],
  apertura_snc: ["S1", "S5", "I1"],
  scia_autoriparatori: ["S1", "S5", "I1", "SCIA_AUT"],
  scia_impiantisti: ["S1", "S5", "I1", "SCIA_IMP"],
  scia_pulizie: ["S1", "S5", "I1", "SCIA_PUL"],
  scia_facchinaggio: ["S1", "S5", "I1", "SCIA_FAC"],
  scia_acconciatori: ["S1", "S5", "I1", "SCIA_ACC"],
  scia_ingrosso: ["S1", "S5", "I1", "SCIA_ING"],
  scia_mediatori: ["S1", "S5", "I1", "SCIA_MED"],
  scia_agenti_commercio: ["S1", "S5", "I1", "SCIA_AGE"],
  scia_spedizionieri: ["S1", "S5", "I1", "SCIA_SPE"],
  scia_panificio: ["S1", "S5", "I1", "SCIA_PAN"],
  scia_verde: ["S1", "S5", "I1", "SCIA_VER"],
  variazione_sede: ["S2", "UL"],
  variazione_ateco: ["S2"],
  variazione_legale_rappresentante: ["S2", "I2"],
  cessazione: ["S3"],
};

// ─── POST: Invia pratica ComUnica ─────────────────────────────────────────
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const body: ComUnicaRequest = await req.json();
  const { pratica_id, tipo, dati_impresa, dati_scia } = body;

  // Verifica procura
  const { data: pratica } = await supabase
    .from("pratiche")
    .select("procura_firmata, procura_url, stato")
    .eq("id", pratica_id)
    .single();
  if (!pratica?.procura_firmata) {
    return NextResponse.json(
      { error: "Procura speciale obbligatoria prima di inviare ComUnica" },
      { status: 400 },
    );
  }

  // Verifica stato pratica (deve essere pagata o almeno approvata)
  if (!["pagata", "approvata", "in_lavorazione"].includes(pratica.stato)) {
    return NextResponse.json(
      {
        error: `Pratica in stato '${pratica.stato}' — non pronta per invio ComUnica`,
      },
      { status: 400 },
    );
  }

  const moduli = MODULI_COMUNICA[tipo];

  // ─── PRODUZIONE Telemaco ──────────────────────────────────────────────
  if (TELEMACO_USER) {
    try {
      // Costruisci payload XML per Telemaco (formato standard CCIAA)
      const payload = buildTelemacoPayload(
        tipo,
        dati_impresa,
        dati_scia,
        moduli,
      );

      const res = await fetch(`${TELEMACO_URL}/pratiche/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Authorization:
            "Basic " +
            Buffer.from(`${TELEMACO_USER}:${TELEMACO_PASS}`).toString("base64"),
          "X-CF-Intermediario": TELEMACO_CODICE_FISCALE_INTERMEDIARIO!,
          "X-Procura-Ref": pratica.procura_url || "",
        },
        body: payload,
      });

      const result = await res.text();
      const numeroPratica = extractNumeroPratica(result);

      if (numeroPratica) {
        await supabase
          .from("pratiche")
          .update({
            stato: "inviata_cciaa",
            numero_pratica_cciaa: numeroPratica,
            data_invio_cciaa: new Date().toISOString(),
          })
          .eq("id", pratica_id);

        await supabase.from("azioni_admin").insert({
          pratica_id,
          admin_id: user.id,
          tipo: "comunica_inviata",
          dettaglio: `ComUnica inviata via Telemaco. Numero pratica CCIAA: ${numeroPratica}. Moduli: ${moduli.join(", ")}`,
        });

        return NextResponse.json({
          success: true,
          numero_pratica: numeroPratica,
          moduli_inviati: moduli,
          stato: "inviata",
          messaggio: `ComUnica inviata con successo. Numero pratica: ${numeroPratica}`,
        });
      }
    } catch (err) {
      console.error("Telemaco error:", err);
    }
  }

  // ─── MOCK: Genera pratica come TODO con istruzioni complete ───────────
  const istruzioni = buildIstruzioniManuali(
    tipo,
    dati_impresa,
    dati_scia,
    moduli,
    pratica_id,
  );

  await supabase.from("todo_admin").insert({
    pratica_id,
    tipo: "comunica_manuale",
    priorita: "alta",
    descrizione: `Invia ComUnica — ${tipo.replace(/_/g, " ")} per ${dati_impresa.nome} ${dati_impresa.cognome}`,
    istruzioni,
    dati: { tipo, dati_impresa, moduli },
    completato: false,
    creato_il: new Date().toISOString(),
  });

  await supabase
    .from("pratiche")
    .update({ stato: "in_lavorazione" })
    .eq("id", pratica_id);

  return NextResponse.json({
    success: true,
    mock: true,
    moduli_necessari: moduli,
    messaggio:
      "Telemaco non ancora configurato — todo creato per invio manuale",
    istruzioni_brevi: `Apri impresainungiorno.gov.it o Telemaco, compila moduli ${moduli.join("+")} per ${dati_impresa.nome} ${dati_impresa.cognome}`,
  });
}

// ─── GET: Controlla stato pratica CCIAA ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const numero_pratica = searchParams.get("numero_pratica");

  if (!numero_pratica)
    return NextResponse.json(
      { error: "numero_pratica obbligatorio" },
      { status: 400 },
    );

  if (!TELEMACO_USER) {
    return NextResponse.json({
      stato: "mock",
      messaggio: "Telemaco non configurato",
    });
  }

  try {
    const res = await fetch(
      `${TELEMACO_URL}/pratiche/${numero_pratica}/stato`,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${TELEMACO_USER}:${TELEMACO_PASS}`).toString("base64"),
        },
      },
    );
    const stato = await res.json();
    return NextResponse.json(stato);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildTelemacoPayload(
  tipo: TipoPratica,
  dati: ComUnicaRequest["dati_impresa"],
  scia: ComUnicaRequest["dati_scia"],
  moduli: string[],
): string {
  // XML semplificato — struttura reale definita da specifiche Infocamere
  return `<?xml version="1.0" encoding="UTF-8"?>
<ComUnica xmlns="http://www.infocamere.it/comunica/v1">
  <Intestazione>
    <CodiceIntermediario>${TELEMACO_CODICE_FISCALE_INTERMEDIARIO}</CodiceIntermediario>
    <TipoPratica>${tipo}</TipoPratica>
    <DataInvio>${new Date().toISOString()}</DataInvio>
  </Intestazione>
  <Moduli>${moduli.map((m) => `<Modulo>${m}</Modulo>`).join("")}</Moduli>
  <Soggetto>
    <CodiceFiscale>${dati.codice_fiscale_titolare}</CodiceFiscale>
    <Nome>${dati.nome}</Nome>
    <Cognome>${dati.cognome}</Cognome>
    <DataNascita>${dati.data_nascita}</DataNascita>
    <LuogoNascita>${dati.luogo_nascita}</LuogoNascita>
  </Soggetto>
  <SedeImpresa>
    <Via>${dati.sede_impresa.via}</Via>
    <Civico>${dati.sede_impresa.civico}</Civico>
    <Comune>${dati.sede_impresa.comune}</Comune>
    <CAP>${dati.sede_impresa.cap}</CAP>
    <Provincia>${dati.sede_impresa.provincia}</Provincia>
    <CodiceComune>${dati.sede_impresa.codice_comune}</CodiceComune>
  </SedeImpresa>
  <AttivitaEconomica>
    <CodiceATECO>${dati.codice_ateco}</CodiceATECO>
    <Descrizione>${dati.descrizione_attivita}</Descrizione>
    <DataInizio>${dati.data_inizio}</DataInizio>
  </AttivitaEconomica>
  ${
    scia
      ? `<DatiSCIA>
    <ResponsabileTecnicoCF>${scia.responsabile_tecnico_cf || ""}</ResponsabileTecnicoCF>
    <ResponsabileTecnicoNome>${scia.responsabile_tecnico_nome || ""}</ResponsabileTecnicoNome>
  </DatiSCIA>`
      : ""
  }
</ComUnica>`;
}

function extractNumeroPratica(xmlResponse: string): string | null {
  const match = xmlResponse.match(/<NumeroPratica>([^<]+)<\/NumeroPratica>/);
  return match ? match[1] : null;
}

function buildIstruzioniManuali(
  tipo: TipoPratica,
  dati: ComUnicaRequest["dati_impresa"],
  scia: ComUnicaRequest["dati_scia"],
  moduli: string[],
  pratica_id: string,
): string {
  const linee = [
    `=== ISTRUZIONI COMUNICA MANUALE ===`,
    `Tipo pratica: ${tipo}`,
    ``,
    `CLIENTE:`,
    `  Nome: ${dati.nome} ${dati.cognome}`,
    `  CF: ${dati.codice_fiscale_titolare}`,
    `  Data nascita: ${dati.data_nascita}`,
    `  Luogo nascita: ${dati.luogo_nascita}`,
    ``,
    `SEDE IMPRESA:`,
    `  ${dati.sede_impresa.via} ${dati.sede_impresa.civico}`,
    `  ${dati.sede_impresa.cap} ${dati.sede_impresa.comune} (${dati.sede_impresa.provincia})`,
    ``,
    `ATECO: ${dati.codice_ateco} — ${dati.descrizione_attivita}`,
    `Inizio attività: ${dati.data_inizio}`,
    ``,
    `MODULI DA COMPILARE: ${moduli.join(", ")}`,
    ``,
    `PASSI:`,
    `1. Accedi a https://webtelemaco.infocamere.it con credenziali intermediario Zipra`,
    `2. Nuova pratica > ${tipo}`,
    `3. Compila moduli ${moduli.join(" + ")} con i dati sopra`,
    scia
      ? `4. SCIA: Responsabile Tecnico CF: ${scia.responsabile_tecnico_cf || "N/D"}`
      : "",
    `5. Firma digitalmente con firma Zipra (in qualità di procuratore)`,
    `6. Invia e annota numero pratica CCIAA in Supabase > pratiche > ${pratica_id}`,
    `7. Marca questo todo come completato`,
  ].filter(Boolean);
  return linee.join("\n");
}
