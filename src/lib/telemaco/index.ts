/**
 * TELEMACO — Modulo invio telematico pratiche al Registro Imprese
 *
 * Endpoint test:  https://telemaco.infocamere.it/telemacobc (no accreditamento)
 * Endpoint prod:  https://telemaco.infocamere.it/telemaco   (richiede accreditamento)
 *
 * Documentazione: https://www.infocamere.it/telemaco
 * Accreditamento: https://www.infocamere.it/accreditamento-intermediari
 */

import { PRATICHE_SARI } from '@/lib/sari/scraper'

// ─── Tipi ────────────────────────────────────────────────────────────────────

export interface DatiPraticaTelemaco {
  // Impresa
  codiceFiscaleTitolare: string
  nomeTitolare: string
  cognomeTitolare: string
  denominazione: string
  codiceAteco: string
  sedeLegale: {
    via: string
    civico: string
    cap: string
    comune: string
    provincia: string
  }
  dataInizioAttivita: string
  // Pratica
  tipoPratica: keyof typeof PRATICHE_SARI
  cciaaCompetente: string // sigla provincia es. "MI", "RM"
  // Opzionale per società
  soci?: { cf: string; nome: string; cognome: string; quota: number }[]
}

export interface RispostaTelemaco {
  success: boolean
  numeroProtocollo?: string
  dataProtocollo?: string
  stato?: 'RICEVUTA' | 'IN_ISTRUTTORIA' | 'ACCETTATA' | 'RESPINTA'
  messaggi?: string[]
  errore?: string
  xmlInviato?: string
}

// ─── Generazione XML pratica ComUnica ────────────────────────────────────────

export function generaXMLPratica(dati: DatiPraticaTelemaco): string {
  const praticaInfo = PRATICHE_SARI[dati.tipoPratica]
  const dataOggi = new Date().toISOString().split('T')[0]
  const timestamp = new Date().toISOString()

  // ID univoco pratica
  const idPratica = `ZIPRA-${Date.now()}-${dati.codiceFiscaleTitolare}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Distinta xmlns="http://www.infocamere.it/comunica/distinta"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          versione="3.0"
          id="${idPratica}">

  <!-- ═══════════════════════════════════════════════════════
       INTESTAZIONE PRATICA
       ═══════════════════════════════════════════════════════ -->
  <Intestazione>
    <CodiceAtto>${praticaInfo.codiceAtto}</CodiceAtto>
    <TipoPratica>${praticaInfo.codiceAtto}</TipoPratica>
    <CCIAA>${dati.cciaaCompetente}</CCIAA>
    <DataPresentazione>${dataOggi}</DataPresentazione>
    <SoftwareInvio>
      <Nome>Zipra</Nome>
      <Versione>2.0</Versione>
      <Produttore>Zipra S.r.l.</Produttore>
    </SoftwareInvio>
    <Intermediario>
      <CodiceFiscale>${process.env.TELEMACO_CF_INTERMEDIARIO ?? ''}</CodiceFiscale>
      <Denominazione>${process.env.TELEMACO_NOME_INTERMEDIARIO ?? 'Zipra'}</Denominazione>
    </Intermediario>
  </Intestazione>

  <!-- ═══════════════════════════════════════════════════════
       DATI IMPRESA (Modulo S1)
       ═══════════════════════════════════════════════════════ -->
  <Modulo tipo="S1">
    <Impresa>
      <CodiceFiscale>${dati.codiceFiscaleTitolare}</CodiceFiscale>
      <Denominazione>${escapeXml(dati.denominazione)}</Denominazione>
      <FormaGiuridica>${mappaFormaGiuridica(dati.tipoPratica)}</FormaGiuridica>
      <CodiceAteco>${dati.codiceAteco}</CodiceAteco>
      <DataInizioAttivita>${dati.dataInizioAttivita}</DataInizioAttivita>
    </Impresa>
    <SedeLegale>
      <Via>${escapeXml(dati.sedeLegale.via)}</Via>
      <NumeroCivico>${dati.sedeLegale.civico}</NumeroCivico>
      <CAP>${dati.sedeLegale.cap}</CAP>
      <Comune>${escapeXml(dati.sedeLegale.comune)}</Comune>
      <Provincia>${dati.sedeLegale.provincia}</Provincia>
      <Nazione>IT</Nazione>
    </SedeLegale>
    <AttivitaEsercitata>
      <Descrizione>${escapeXml(dati.denominazione)}</Descrizione>
      <CodiceAteco>${dati.codiceAteco}</CodiceAteco>
    </AttivitaEsercitata>
  </Modulo>

  <!-- ═══════════════════════════════════════════════════════
       DATI PERSONA FISICA (Modulo P)
       ═══════════════════════════════════════════════════════ -->
  <Modulo tipo="P">
    <Persona>
      <CodiceFiscale>${dati.codiceFiscaleTitolare}</CodiceFiscale>
      <Nome>${escapeXml(dati.nomeTitolare)}</Nome>
      <Cognome>${escapeXml(dati.cognomeTitolare)}</Cognome>
      <Carica>TI</Carica><!-- TI = Titolare, AM = Amministratore -->
      <DataInizioCarica>${dati.dataInizioAttivita}</DataInizioCarica>
    </Persona>
    ${dati.soci?.map(s => `
    <Persona>
      <CodiceFiscale>${s.cf}</CodiceFiscale>
      <Nome>${escapeXml(s.nome)}</Nome>
      <Cognome>${escapeXml(s.cognome)}</Cognome>
      <Carica>SO</Carica><!-- SO = Socio -->
      <QuotaPercentuale>${s.quota}</QuotaPercentuale>
    </Persona>`).join('') ?? ''}
  </Modulo>

  <!-- ═══════════════════════════════════════════════════════
       ALLEGATI
       (i file vengono aggiunti in base64 in fase di invio)
       ═══════════════════════════════════════════════════════ -->
  <Allegati>
    <!-- Placeholder — gli allegati vengono aggiunti dinamicamente -->
  </Allegati>

</Distinta>`

  return xml
}

// ─── Invio pratica a Telemaco ─────────────────────────────────────────────────

export async function inviaPraticaTelemaco(
  xmlPratica: string,
  allegati: { nome: string; contenutoBase64: string; tipo: string }[] = [],
  modalita: 'test' | 'produzione' = 'test'
): Promise<RispostaTelemaco> {

  const endpoint = modalita === 'test'
    ? 'https://telemaco.infocamere.it/telemacobc/ws/invio'
    : 'https://telemaco.infocamere.it/telemaco/ws/invio'

  if (!process.env.TELEMACO_USERNAME || !process.env.TELEMACO_PASSWORD) {
    return {
      success: false,
      errore: 'Credenziali Telemaco non configurate. Imposta TELEMACO_USERNAME e TELEMACO_PASSWORD in .env',
    }
  }

  // Costruisci il payload multipart con XML + allegati
  const payload = {
    xmlDistinta: Buffer.from(xmlPratica).toString('base64'),
    allegati: allegati.map(a => ({
      nomeFile: a.nome,
      contenuto: a.contenutoBase64,
      tipoDocumento: a.tipo,
    })),
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.TELEMACO_USERNAME}:${process.env.TELEMACO_PASSWORD}`
        ).toString('base64'),
        'X-Telemaco-Version': '3.0',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, errore: `HTTP ${res.status}: ${errText}`, xmlInviato: xmlPratica }
    }

    const data = await res.json()

    return {
      success: true,
      numeroProtocollo: data.numeroProtocollo,
      dataProtocollo: data.dataProtocollo,
      stato: data.stato,
      messaggi: data.messaggi,
      xmlInviato: xmlPratica,
    }

  } catch (e) {
    return {
      success: false,
      errore: `Errore connessione Telemaco: ${String(e)}`,
      xmlInviato: xmlPratica,
    }
  }
}

// ─── Polling stato pratica ────────────────────────────────────────────────────

export async function getStatoPraticaTelemaco(
  numeroProtocollo: string,
  cciaa: string,
  modalita: 'test' | 'produzione' = 'test'
): Promise<{ stato: string; messaggi: string[]; dataAggiornamento: string } | null> {

  const endpoint = modalita === 'test'
    ? `https://telemaco.infocamere.it/telemacobc/ws/stato/${cciaa}/${numeroProtocollo}`
    : `https://telemaco.infocamere.it/telemaco/ws/stato/${cciaa}/${numeroProtocollo}`

  try {
    const res = await fetch(endpoint, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.TELEMACO_USERNAME}:${process.env.TELEMACO_PASSWORD}`
        ).toString('base64'),
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function mappaFormaGiuridica(tipoPratica: string): string {
  const mappa: Record<string, string> = {
    apertura_ditta_individuale: 'DI',  // Ditta Individuale
    apertura_srl:               'SR',  // S.r.l.
    apertura_srls:              'SS',  // S.r.l.s.
    apertura_snc:               'SN',  // S.n.c.
    apertura_sas:               'SA',  // S.a.s.
    iscrizione_albo_artigiani:  'DI',  // Artigiano individuale
  }
  return mappa[tipoPratica] ?? 'DI'
}
