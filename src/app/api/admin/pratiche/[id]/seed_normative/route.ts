/**
 * src/app/api/admin/pratiche/[id]/seed_normative/route.ts
 *
 * FIX: la funzione seedNormative era esportata con "export async function seedNormative"
 * direttamente nel file route. Next.js interpreta OGNI export come un metodo HTTP
 * valido (GET, POST, PUT, ecc.) e rifiutava "seedNormative" con l'errore:
 * "seedNormative is not a valid Route export field"
 *
 * SOLUZIONE: la funzione seedNormative è ora definita senza export (privata al file).
 * Solo POST è esportato — è l'unico handler HTTP necessario.
 */

import { NextRequest, NextResponse } from 'next/server'
import { indicizzaNormativa } from '@/lib/ai/rag'

// ─── Tipo record seed ─────────────────────────────────────────────────────────

type SeedRecord = {
  titolo: string
  contenuto: string
  fonteUrl?: string
  fonteNome: string
  comune?: string
  provincia?: string
  tipoAttivita?: string
  categoria: 'suap' | 'cciaa' | 'agenzia_entrate' | 'inps' | 'generale' | 'asl'
}

// ─── Helpers builder ─────────────────────────────────────────────────────────

function sari(
  codice: string,
  titolo: string,
  opts: {
    descrizione: string
    enti: string
    moduli: string
    documenti: string
    campi: string
    tempi: string
    costo: string
    via: string
    note?: string
    tipoAttivita?: string
  }
): SeedRecord {
  return {
    titolo: `SARI — ${titolo} [${codice}]`,
    contenuto: `PRATICA: ${titolo}
CODICE ATTO: ${codice}
DESCRIZIONE: ${opts.descrizione}
ENTI COINVOLTI: ${opts.enti}
MODULI RICHIESTI: ${opts.moduli}
DOCUMENTI DA ALLEGARE: ${opts.documenti}
CAMPI OBBLIGATORI: ${opts.campi}
TEMPI: ${opts.tempi}
COSTO: ${opts.costo}
VIA DI INVIO: ${opts.via}
${opts.note ? `NOTE: ${opts.note}` : ''}`.trim(),
    fonteUrl: `https://sari.camcom.it/pratiche/${codice.toLowerCase().replace(/\./g, '-')}`,
    fonteNome: 'SARI Infocamere',
    categoria: 'cciaa',
    tipoAttivita: opts.tipoAttivita,
  }
}

function suap(
  titolo: string,
  opts: {
    descrizione?: string
    settore: string
    procedura: string
    riferimentoNormativo: string
    documentiRichiesti: string
    tempi: string
    costo: string
    enteDestinatario: string
    note?: string
    tipoAttivita?: string
  }
): SeedRecord {
  return {
    titolo: `SUAP — ${titolo}`,
    contenuto: `PROCEDURA SUAP: ${titolo}
${opts.descrizione ? `DESCRIZIONE: ${opts.descrizione}\n` : ''}SETTORE: ${opts.settore}
TIPO PROCEDURA: ${opts.procedura}
RIFERIMENTO NORMATIVO: ${opts.riferimentoNormativo}
ENTE DESTINATARIO: ${opts.enteDestinatario}
DOCUMENTI RICHIESTI: ${opts.documentiRichiesti}
TEMPI: ${opts.tempi}
COSTO: ${opts.costo}
${opts.note ? `NOTE: ${opts.note}` : ''}`.trim(),
    fonteUrl: 'https://www.impresainungiorno.gov.it',
    fonteNome: 'Impresa in un Giorno — SUAP Nazionale',
    categoria: 'suap',
    tipoAttivita: opts.tipoAttivita,
  }
}

// ─── Record seed (campione — aggiungi altri dal file scripts/seed-normative.ts) ──

const SARI_RECORDS: SeedRecord[] = [
  sari('RI.CU.IMPIND.INIZIO', 'Iscrizione imprenditore individuale — Inizio attività', {
    descrizione: 'Prima iscrizione nel Registro delle Imprese di un imprenditore individuale con contestuale inizio attività.',
    enti: 'Camera di Commercio (Registro Imprese), Agenzia delle Entrate (P.IVA), INPS',
    moduli: 'I1 — dati imprenditore; modello AA9/12 Agenzia Entrate',
    documenti: 'Documento di identità, Codice Fiscale',
    campi: 'Dati anagrafici, sede legale, oggetto attività, codice ATECO, data inizio',
    tempi: '1-5 giorni lavorativi',
    costo: 'Diritti camerali: €18 + imposta di bollo €17,50. P.IVA gratuita.',
    via: 'Telematico via ComUnica (STAR) o Telemaco',
    tipoAttivita: 'apertura_impresa',
  }),
]

const SUAP_RECORDS: SeedRecord[] = [
  suap('SCIA per somministrazione alimenti e bevande', {
    settore: 'Ristorazione, bar, pub, pizzerie',
    procedura: 'SCIA (Segnalazione Certificata di Inizio Attività)',
    riferimentoNormativo: 'D.Lgs. 59/2010, L. 287/1991, D.Lgs. 222/2016',
    enteDestinatario: 'SUAP del Comune di competenza',
    documentiRichiesti: 'SCIA compilata, planimetria locale, attestato HACCP, SAB, visura CCIAA',
    tempi: 'Immediato per SCIA — inizio attività dal giorno di presentazione',
    costo: 'Variabile per Comune (€50-300 diritti istruttoria)',
    tipoAttivita: 'bar_ristorante',
  }),
]

// ─── FIX: funzione privata (SENZA export) ─────────────────────────────────────
// Precedentemente era "export async function seedNormative" — Next.js la
// interpretava come handler HTTP non valido e bloccava il build.

async function seedNormative(): Promise<{
  totale: number
  successi: number
  saltati: number
  errori: string[]
}> {
  const tutti: SeedRecord[] = [
    ...SARI_RECORDS,
    ...SUAP_RECORDS,
  ]

  let successi = 0
  let saltati = 0
  const errori: string[] = []

  for (const record of tutti) {
    try {
      const result = await indicizzaNormativa({
        titolo: record.titolo,
        contenuto: record.contenuto,
        fonteUrl: record.fonteUrl,
        fonteNome: record.fonteNome,
        comune: record.comune,
        provincia: record.provincia,
        tipoAttivita: record.tipoAttivita,
        categoria: record.categoria,
      })

      if ((result as any)?.skipped) {
        saltati++
      } else {
        successi++
      }

      await new Promise((r) => setTimeout(r, 300))
    } catch (e) {
      errori.push(`${record.titolo}: ${e}`)
    }
  }

  return { totale: tutti.length, successi, saltati, errori }
}

// ─── POST /api/admin/pratiche/[id]/seed_normative ─────────────────────────────
// Unico export valido — handler HTTP

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  try {
    const result = await seedNormative()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}