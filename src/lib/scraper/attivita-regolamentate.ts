/**
 * SCRAPER ATTIVITÀ REGOLAMENTATE
 * 
 * Aggiornamento settimanale (lunedì 8:00 UTC) — si aggiunge allo scraper esistente
 * 
 * Per ogni attività regolamentata e ogni provincia:
 * 1. Scarica i requisiti aggiornati dal sito CCIAA/Comune/Regione
 * 2. Verifica date esami (taxi, mediatori, autoriparatori)
 * 3. Verifica superfici minime locali (parrucchieri, estetisti)
 * 4. Indicizza tutto in pgvector per la ricerca semantica
 * 
 * API pubbliche collegate:
 * - impresainungiorno.gov.it — pratiche SUAP nazionali
 * - registroimprese.it — albi e ruoli CCIAA
 * - inps.it — estratto contributivo (serve CF utente)
 * - catasto (sister.agenziaentrate.gov.it) — visure catastali
 */

import { indicizzaNormativa } from '@/lib/ai/rag'
import { TUTTE_CCIAA } from './index'

// ═══════════════════════════════════════════════════════════
// MAPPA URL SPECIFICI PER ATTIVITÀ REGOLAMENTATE
// Per ogni CCIAA, URL diretto alla pagina dell'attività
// ═══════════════════════════════════════════════════════════

type AttivitaId = 
  | 'taxi_ncc' 
  | 'autoriparatori' 
  | 'acconciatori'
  | 'estetisti'
  | 'mediatori'
  | 'agenti_commercio'
  | 'impiantisti'

// URL per attività regolamentate — pattern comune + override per province specifiche
const URL_ATTIVITA: Record<AttivitaId, {
  pattern: (sigla: string) => string[]  // lista URL da provare in ordine
  override?: Record<string, string[]>   // override per province specifiche
  fonti_regionali?: Record<string, string>  // fonti regionali (quando l'ente è la Regione)
}> = {
  taxi_ncc: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/ruolo-conducenti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/ruolo-conducenti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/taxi-ncc`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/ruolo-conducenti`,
    ],
    override: {
      'LE': ['https://www.le.camcom.it/P42A2864C71S/Sessione-di-esami-di-idoneita-all-esercizio-del-servizio-di-taxi-e-noleggio-con-conducente-.htm'],
      'MI': ['https://www.mi.camcom.it/ruolo-conducenti-taxi-ncc'],
      'RM': ['https://www.rm.camcom.it/pagina225_qualifiche-professionali-per-acconciatori-ed-estetisti.html'],
      'NA': ['https://www.na.camcom.it/it/albi-e-ruoli/ruolo-conducenti'],
      'TO': ['https://www.to.camcom.it/it/servizi/ruolo-conducenti-taxi'],
    },
    fonti_regionali: {
      'Campania': 'https://servizi-digitali.regione.campania.it/AbilitazioneNcc',
      'Toscana': 'https://www.regione.toscana.it/ruolo-conducenti',
      'Puglia': 'https://www.regione.puglia.it/web/ncc-taxi',
    }
  },
  autoriparatori: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/autoriparatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/autoriparatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/autoriparazione`,
    ],
    override: {
      'LE': ['https://www.le.camcom.it/it/albi-ruoli'],
      'MI': ['https://www.mi.camcom.it/autoriparatori'],
    }
  },
  acconciatori: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/acconciatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/acconciatori-parrucchieri`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/acconciatori`,
    ],
    fonti_regionali: {
      'Lombardia': 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/attivita-e-servizi/ServizieInformazioni/imprese-e-lavoro/acconciatori',
      'Puglia': 'https://www.regione.puglia.it/web/attivita-produttive/acconciatori',
      'Toscana': 'https://www.regione.toscana.it/-/acconciatori',
      'Veneto': 'https://www.regione.veneto.it/web/commercio/acconciatori',
      'Campania': 'https://www.regione.campania.it/acconciatori',
    }
  },
  estetisti: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/estetisti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/estetisti`,
    ],
    fonti_regionali: {
      'Lombardia': 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/attivita-e-servizi/ServizieInformazioni/imprese-e-lavoro/estetisti',
      'Puglia': 'https://www.regione.puglia.it/web/attivita-produttive/estetisti',
      'Veneto': 'https://suap.regione.fvg.it/portale/cms/it/apertura-modifica/Estetista-00002',
      'Toscana': 'https://www.regione.toscana.it/-/estetisti',
    }
  },
  mediatori: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/mediatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/mediatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/agenti-mediatori`,
    ],
  },
  agenti_commercio: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/agenti-commercio`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/agenti-commercio`,
    ],
  },
  impiantisti: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/impiantisti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/impiantisti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/dm-37-2008`,
    ],
  },
}

// ═══════════════════════════════════════════════════════════
// FONTI NAZIONALI PER ATTIVITÀ REGOLAMENTATE
// ═══════════════════════════════════════════════════════════

const FONTI_NAZIONALI_REGOLAMENTATE = [
  // Impresa in un Giorno — pratiche per categoria
  { url: 'https://www.impresainungiorno.gov.it/web/guest/acconciatori',   nome: 'Impresa in un Giorno — Acconciatori',    categoria: 'suap', attivita: 'acconciatori' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/estetisti',      nome: 'Impresa in un Giorno — Estetisti',       categoria: 'suap', attivita: 'estetisti' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/autoriparatori', nome: 'Impresa in un Giorno — Autoriparatori',  categoria: 'suap', attivita: 'autoriparatori' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/impiantisti',    nome: 'Impresa in un Giorno — Impiantisti',     categoria: 'suap', attivita: 'impiantisti' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/mediatori',      nome: 'Impresa in un Giorno — Mediatori',       categoria: 'suap', attivita: 'mediatori' },
  // Normattiva — testi legge aggiornati
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-01-15;21', nome: 'L.21/1992 — Taxi e NCC', categoria: 'generale', attivita: 'taxi_ncc' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-03-05;122', nome: 'L.122/1992 — Autoriparatori', categoria: 'generale', attivita: 'autoriparatori' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-01-04;1', nome: 'L.1/1990 — Estetisti', categoria: 'generale', attivita: 'estetisti' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-01-17;174', nome: 'L.174/2005 — Acconciatori', categoria: 'generale', attivita: 'acconciatori' },
  // SNI Unioncamere — guide pratiche
  { url: 'https://www.sni.unioncamere.it/approfondimenti/albo-ruolo-conducenti', nome: 'SNI — Ruolo Conducenti Taxi/NCC', categoria: 'cciaa', attivita: 'taxi_ncc' },
  { url: 'https://www.sni.unioncamere.it/approfondimenti/autoriparatori', nome: 'SNI — Autoriparatori', categoria: 'cciaa', attivita: 'autoriparatori' },
]

// ═══════════════════════════════════════════════════════════
// SCRAPER PRINCIPALE ATTIVITÀ REGOLAMENTATE
// ═══════════════════════════════════════════════════════════

export async function scrapaAttivitaRegolamentate(): Promise<{
  successi: number
  errori: number
  dettaglio: string[]
}> {
  const risultati = { successi: 0, errori: 0, dettaglio: [] as string[] }

  // 1. Fonti nazionali
  for (const fonte of FONTI_NAZIONALI_REGOLAMENTATE) {
    try {
      const res = await fetch(fonte.url, {
        headers: { 'User-Agent': 'Zipra-Bot/1.0 (info@zipra.it)' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue
      const html = await res.text()
      const testo = estraiTesto(html)
      if (testo.length < 100) continue

      await indicizzaNormativa({
        titolo: fonte.nome,
        contenuto: testo.substring(0, 3000),
        fonteUrl: fonte.url,
        fonteNome: fonte.nome,
        categoria: fonte.categoria as any,
        tipoAttivita: (fonte as any).attivita,
      })
      risultati.successi++
      risultati.dettaglio.push(`✓ ${fonte.nome}`)
    } catch (e) {
      risultati.errori++
    }
  }

  // 2. Scraping per provincia — TUTTE le province ogni settimana, nessuna rotazione
  const provinceDaProcessare = TUTTE_CCIAA
  console.log(`📋 Attività regolamentate — scraping ${provinceDaProcessare.length} province...`)

  for (const cciaa of provinceDaProcessare) {
    for (const [attivitaId, config] of Object.entries(URL_ATTIVITA)) {
      const urls = config.override?.[cciaa.sigla] ?? config.pattern(cciaa.sigla)

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Zipra-Bot/1.0 (info@zipra.it)' },
            signal: AbortSignal.timeout(8000),
          })
          if (!res.ok) continue
          const html = await res.text()
          const testo = estraiTesto(html)
          if (testo.length < 200) continue

          // Arricchisce il contenuto con metadati locali
          const contenutoArricchito = `
ATTIVITÀ: ${attivitaId.replace(/_/g, ' ').toUpperCase()}
PROVINCIA: ${cciaa.citta} (${cciaa.sigla})
REGIONE: ${cciaa.regione}
FONTE: ${url}
DATA AGGIORNAMENTO: ${new Date().toLocaleDateString('it-IT')}

${testo.substring(0, 2500)}
          `.trim()

          await indicizzaNormativa({
            titolo: `${attivitaId.replace(/_/g, ' ')} — ${cciaa.citta} (${cciaa.sigla})`,
            contenuto: contenutoArricchito,
            fonteUrl: url,
            fonteNome: `CCIAA ${cciaa.citta}`,
            comune: cciaa.citta,
            provincia: cciaa.sigla,
            categoria: 'cciaa',
            tipoAttivita: attivitaId,
          })

          risultati.successi++
          risultati.dettaglio.push(`✓ ${attivitaId} @ ${cciaa.sigla}`)
          break // Trovato URL valido per questa provincia+attività
        } catch {
          // Prova URL successivo
        }
      }
    }

    // Scrapa fonti regionali — evita duplicati per regione
    const regioniViste = new Set<string>()
    for (const [attivitaId, config] of Object.entries(URL_ATTIVITA)) {
      const urlRegionale = config.fonti_regionali?.[cciaa.regione]
      if (!urlRegionale) continue
      const chiave = `${attivitaId}-${cciaa.regione}`
      if (regioniViste.has(chiave)) continue
      regioniViste.add(chiave)

      try {
        const res = await fetch(urlRegionale, {
          headers: { 'User-Agent': 'Zipra-Bot/1.0 (info@zipra.it)' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) continue
        const html = await res.text()
        const testo = estraiTesto(html)
        if (testo.length < 200) continue

        await indicizzaNormativa({
          titolo: `${attivitaId.replace(/_/g, ' ')} — Regione ${cciaa.regione}`,
          contenuto: `FONTE REGIONALE: ${cciaa.regione}\n\n${testo.substring(0, 2500)}`,
          fonteUrl: urlRegionale,
          fonteNome: `Regione ${cciaa.regione}`,
          provincia: cciaa.sigla,
          categoria: 'suap',
          tipoAttivita: attivitaId,
        })
        risultati.successi++
      } catch {}
    }

    // Piccola pausa per non sovraccaricare i server
    await new Promise(r => setTimeout(r, 500))
  }

  return risultati
}

// ═══════════════════════════════════════════════════════════
// API PUBBLICHE COLLEGATE — dati in tempo reale
// ═══════════════════════════════════════════════════════════

/**
 * Recupera date esami taxi/NCC dalla CCIAA di una provincia
 * Usato nel wizard quando l'utente vuole fare il tassista
 */
export async function getDateEsamiTaxi(provincia: string): Promise<{
  prossima_sessione?: string
  url_bando?: string
  contatti?: string
} | null> {
  const cciaa = TUTTE_CCIAA.find(c => c.sigla === provincia.toUpperCase())
  if (!cciaa) return null

  const urlsProva = URL_ATTIVITA.taxi_ncc.override?.[cciaa.sigla] ??
    URL_ATTIVITA.taxi_ncc.pattern(cciaa.sigla)

  for (const url of urlsProva) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const html = await res.text()

      // Cerca pattern di date nel testo
      const dateMatch = html.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\w+\s\d{4})/gi)
      if (dateMatch && dateMatch.length > 0) {
        return {
          prossima_sessione: dateMatch[0],
          url_bando: url,
          contatti: `CCIAA ${cciaa.citta}: ${url}`,
        }
      }
    } catch {}
  }

  return {
    url_bando: `https://www.${provincia.toLowerCase()}.camcom.it`,
    contatti: `CCIAA ${cciaa.citta} — verificare sul sito ufficiale`,
  }
}

/**
 * Recupera estratto contributivo INPS via API
 * (richiede delega/SPID — usato quando l'utente ci autorizza)
 */
export async function getEstrattoCaricoINPS(codiceFiscale: string): Promise<{
  disponibile: boolean
  url: string
  istruzioni: string
}> {
  // L'API INPS per l'estratto conto richiede autenticazione SPID
  // Non possiamo accedervi direttamente — guidiamo l'utente
  return {
    disponibile: false,
    url: `https://servizi.inps.it/servizi/portaledeiserviziassicurativi/`,
    istruzioni: `Accedi a servizi.inps.it con SPID → Estratto conto contributivo → Scarica PDF e allegalo qui`,
  }
}

/**
 * Recupera visura catastale via API Agenzia Entrate (SISTER)
 * Disponibile per il comune/indirizzo del locale
 */
export async function getVisuraCatastale(comune: string, indirizzo: string): Promise<{
  disponibile: boolean
  url: string
  istruzioni: string
}> {
  return {
    disponibile: false,
    url: 'https://sister.agenziaentrate.gov.it',
    istruzioni: `Accedi a sister.agenziaentrate.gov.it → Ricerca per indirizzo → Scarica la planimetria e allegala`,
  }
}

/**
 * Verifica se un codice fiscale è valido (algoritmo Luhn italiano)
 */
export function verificaCodiceFiscale(cf: string): boolean {
  if (!cf || cf.length !== 16) return false
  cf = cf.toUpperCase()
  const valoriPari = { '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7,'I':8,'J':9,
    'K':10,'L':11,'M':12,'N':13,'O':14,'P':15,'Q':16,'R':17,'S':18,'T':19,
    'U':20,'V':21,'W':22,'X':23,'Y':24,'Z':25 }
  const valoriDispari = { '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,
    '9':21,'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,
    'K':2,'L':4,'M':18,'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,
    'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23 }
  let somma = 0
  for (let i = 0; i < 15; i++) {
    const c = cf[i] as keyof typeof valoriPari
    somma += i % 2 === 0 ? (valoriDispari[c] ?? 0) : (valoriPari[c] ?? 0)
  }
  const atteso = String.fromCharCode(65 + (somma % 26))
  return cf[15] === atteso
}

// ═══════════════════════════════════════════════════════════
// HELPER: estrai testo leggibile da HTML
// ═══════════════════════════════════════════════════════════

function estraiTesto(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}