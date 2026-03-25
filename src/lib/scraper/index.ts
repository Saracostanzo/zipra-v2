import * as cheerio from 'cheerio'
import { indicizzaNormativa } from '@/lib/ai/rag'

// ==========================================================
// TIPI
// ==========================================================

type CategoriaNormativa =
  | 'suap'
  | 'cciaa'
  | 'agenzia_entrate'
  | 'inps'
  | 'generale'

type AttivitaId =
  | 'taxi_ncc'
  | 'autoriparatori'
  | 'acconciatori'
  | 'estetisti'
  | 'mediatori'
  | 'agenti_commercio'
  | 'impiantisti'

type FetchResult = {
  ok: boolean
  status: number
  html: string | null
  finalUrl: string
}

type ScrapeReport = {
  indicizzati: number
  saltati: number
  errori: number
  totale?: number
  vuoti?: string[]
}

// ==========================================================
// COSTANTI QUALITÀ
// ==========================================================

const BAD_PATTERNS = [
  /pagina non trovata/i,
  /\b404\b/i,
  /not found/i,
  /please enable javascript/i,
  /javascript required/i,
  /accesso negato/i,
  /\blogin\b.*\brequired\b/i,        // FIX: era /\blogin\b/ — troppo generico, filtrava pagine con "login" nel testo
  /\baccedi\b.*\bper\b/i,            // FIX: era /\baccedi\b/
  /\bregistrati\b.*\bper\b/i,        // FIX: era /\bregistrati\b/
  /cookie consent required/i,        // FIX: era /cookie/i — filtrava TUTTO (anche pagine con "cookie policy" nel footer)
  /servizio non disponibile/i,
  /errore imprevisto/i,
]

const NOISE_PATTERNS = [
  /newsletter/i,
  /eventi/i,
  /news/i,
  /rassegna stampa/i,
  /seguici su/i,
  /condividi/i,
  /iscriviti/i,
]

const KEYWORDS_BY_CATEGORY: Record<CategoriaNormativa, string[]> = {
  suap: [
    'suap',
    'sportello unico',
    'attività produttive',
    'attivita produttive',
    'scia',
    'autorizzazione',
    'procedimento',
    'avvio attività',
    'avvio attivita',
    'impresa in un giorno',
  ],
  cciaa: [
    'camera di commercio',
    'registro imprese',
    'rea',
    'comunica',
    'albo',
    'ruolo',
    'requisiti professionali',
    'avvio impresa',
  ],
  agenzia_entrate: [
    'agenzia delle entrate',
    'partita iva',
    'apertura attività',
    'apertura attivita',
    'inizio attività',
    'inizio attivita',
    'ateco',
  ],
  inps: [
    'inps',
    'lavoratori autonomi',
    'artigiani',
    'commercianti',
    'gestione separata',
    'contributi',
  ],
  generale: [
    'normativa',
    'legge',
    'decreto',
    'articolo',
    'testo unico',
    'requisiti',
    'disciplina',
  ],
}

const KEYWORDS_BY_ATTIVITA: Record<AttivitaId, string[]> = {
  taxi_ncc: ['taxi', 'ncc', 'noleggio con conducente', 'ruolo conducenti', 'esame'],
  autoriparatori: ['autoriparatori', 'autoriparazione', 'meccatronica', 'carrozzeria', 'gommista'],
  acconciatori: ['acconciatori', 'acconciatore', 'parrucchiere', 'abilitazione'],
  estetisti: ['estetisti', 'estetista', 'abilitazione', 'requisiti professionali'],
  mediatori: ['mediatori', 'mediatore', 'agente d’affari', "agente d'affari", 'iscrizione'],
  agenti_commercio: ['agenti di commercio', 'agente di commercio', 'requisiti'],
  impiantisti: ['impiantisti', 'dm 37/2008', 'abilitazione', 'lettera a'],
}

const MIN_TEXT_LENGTH: Record<CategoriaNormativa, number> = {
  suap: 1200,           // FIX: era 700 — le pagine contatti SUAP arrivano a ~800 chars
  cciaa: 1500,          // FIX: era 700 — le homepage CCIAA generiche superavano facilmente
  agenzia_entrate: 700,
  inps: 700,
  generale: 900,
}

// ==========================================================
// FONTI NAZIONALI
// ==========================================================

const FONTI_NAZIONALI: Array<{
  url: string
  nome: string
  categoria: CategoriaNormativa
}> = [
  { url: 'https://www.impresainungiorno.gov.it/web/guest/home', nome: 'Impresa in un Giorno (SUAP nazionale)', categoria: 'suap' },
  { url: 'https://www.registroimprese.it/guida-all-avvio', nome: 'Registro Imprese nazionale', categoria: 'cciaa' },
  { url: 'https://www.agenziaentrate.gov.it/portale/apertura-attivita', nome: 'Agenzia delle Entrate — Apertura attività', categoria: 'agenzia_entrate' },
  { url: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti.html', nome: 'INPS — Lavoratori autonomi', categoria: 'inps' },
  { url: 'https://www.normattiva.it', nome: 'Normattiva — Testo unico leggi', categoria: 'generale' },
  { url: 'https://suap.mit.gov.it', nome: 'SUAP MIT — Portale nazionale', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/acconciatori', nome: 'Impresa in un Giorno — Acconciatori', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/estetisti', nome: 'Impresa in un Giorno — Estetisti', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/autoriparatori', nome: 'Impresa in un Giorno — Autoriparatori', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/impiantisti', nome: 'Impresa in un Giorno — Impiantisti', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/mediatori', nome: 'Impresa in un Giorno — Mediatori', categoria: 'suap' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/taxi-ncc', nome: 'Impresa in un Giorno — Taxi/NCC', categoria: 'suap' },
]

// ==========================================================
// TUTTE LE 105 CCIAA ITALIANE
// ==========================================================

export const TUTTE_CCIAA: { sigla: string; citta: string; regione: string; url: string }[] = [
  // NORD OVEST
  { sigla: 'TO', citta: 'Torino', regione: 'Piemonte', url: 'https://www.to.camcom.it/apertura-impresa' },
  { sigla: 'VC', citta: 'Vercelli', regione: 'Piemonte', url: 'https://www.pno.camcom.it' },
  { sigla: 'NO', citta: 'Novara', regione: 'Piemonte', url: 'https://www.pno.camcom.it' },
  { sigla: 'CN', citta: 'Cuneo', regione: 'Piemonte', url: 'https://www.cn.camcom.it/it/servizi' },
  { sigla: 'AT', citta: 'Asti', regione: 'Piemonte', url: 'https://aa.camcom.it' },
  { sigla: 'AL', citta: 'Alessandria', regione: 'Piemonte', url: 'https://aa.camcom.it' },
  { sigla: 'BI', citta: 'Biella', regione: 'Piemonte', url: 'https://www.pno.camcom.it' },
  { sigla: 'VB', citta: 'Verbania', regione: 'Piemonte', url: 'https://www.pno.camcom.it' },
  { sigla: 'AO', citta: 'Aosta', regione: "Valle d'Aosta", url: 'https://www.ao.camcom.it/it/servizi' },
  { sigla: 'GE', citta: 'Genova', regione: 'Liguria', url: 'https://www.ge.camcom.it/it/servizi-imprese' },
  { sigla: 'IM', citta: 'Imperia', regione: 'Liguria', url: 'https://www.rivlig.camcom.gov.it' },
  { sigla: 'SV', citta: 'Savona', regione: 'Liguria', url: 'https://www.rivlig.camcom.gov.it' },
  { sigla: 'SP', citta: 'La Spezia', regione: 'Liguria', url: 'https://www.rivlig.camcom.gov.it' },
  { sigla: 'MI', citta: 'Milano', regione: 'Lombardia', url: 'https://www.milomb.camcom.it' },
  { sigla: 'BG', citta: 'Bergamo', regione: 'Lombardia', url: 'https://www.bg.camcom.it/it/servizi' },
  { sigla: 'BS', citta: 'Brescia', regione: 'Lombardia', url: 'https://www.bs.camcom.it/it/servizi' },
  { sigla: 'CO', citta: 'Como', regione: 'Lombardia', url: 'https://www.comolecco.camcom.it' },
  { sigla: 'CR', citta: 'Cremona', regione: 'Lombardia', url: 'https://www.cr.camcom.it/it/servizi' },
  { sigla: 'LC', citta: 'Lecco', regione: 'Lombardia', url: 'https://www.comolecco.camcom.it' },
  { sigla: 'LO', citta: 'Lodi', regione: 'Lombardia', url: 'https://www.milomb.camcom.it' },
  { sigla: 'MN', citta: 'Mantova', regione: 'Lombardia', url: 'https://www.mn.camcom.it/it/servizi' },
  { sigla: 'MB', citta: 'Monza Brianza', regione: 'Lombardia', url: 'https://www.milomb.camcom.it' },
  { sigla: 'PV', citta: 'Pavia', regione: 'Lombardia', url: 'https://www.pv.camcom.it/it/servizi' },
  { sigla: 'SO', citta: 'Sondrio', regione: 'Lombardia', url: 'https://www.so.camcom.it/it/servizi' },
  { sigla: 'VA', citta: 'Varese', regione: 'Lombardia', url: 'https://www.va.camcom.it/it/servizi' },
  { sigla: 'BZ', citta: 'Bolzano', regione: 'Trentino-AA', url: 'https://www.bz.camcom.it/it/servizi' },
  { sigla: 'TN', citta: 'Trento', regione: 'Trentino-AA', url: 'https://www.tn.camcom.it/it/servizi' },
  { sigla: 'VR', citta: 'Verona', regione: 'Veneto', url: 'https://www.vr.camcom.it/it/servizi' },
  { sigla: 'VI', citta: 'Vicenza', regione: 'Veneto', url: 'https://www.vi.camcom.it/it/servizi' },
  { sigla: 'BL', citta: 'Belluno', regione: 'Veneto', url: 'https://www.tb.camcom.gov.it' },
  { sigla: 'TV', citta: 'Treviso', regione: 'Veneto', url: 'https://www.tb.camcom.gov.it' },
  { sigla: 'VE', citta: 'Venezia', regione: 'Veneto', url: 'https://www.dl.camcom.it' },
  { sigla: 'PD', citta: 'Padova', regione: 'Veneto', url: 'https://www.pd.camcom.it/it/servizi' },
  { sigla: 'RO', citta: 'Rovigo', regione: 'Veneto', url: 'https://www.dl.camcom.it' },
  { sigla: 'UD', citta: 'Udine', regione: 'Friuli-VG', url: 'https://www.pnud.camcom.it' },
  { sigla: 'GO', citta: 'Gorizia', regione: 'Friuli-VG', url: 'https://vg.camcom.it' },
  { sigla: 'TS', citta: 'Trieste', regione: 'Friuli-VG', url: 'https://vg.camcom.it' },
  { sigla: 'PN', citta: 'Pordenone', regione: 'Friuli-VG', url: 'https://www.pnud.camcom.it' },

  // NORD EST / CENTRO
  { sigla: 'PC', citta: 'Piacenza', regione: 'Emilia-Romagna', url: 'https://www.pc.camcom.it/it/servizi' },
  { sigla: 'PR', citta: 'Parma', regione: 'Emilia-Romagna', url: 'https://www.emilia.camcom.it' },
  { sigla: 'RE', citta: 'Reggio Emilia', regione: 'Emilia-Romagna', url: 'https://www.emilia.camcom.it' },
  { sigla: 'MO', citta: 'Modena', regione: 'Emilia-Romagna', url: 'https://www.mo.camcom.it/it/servizi' },
  { sigla: 'BO', citta: 'Bologna', regione: 'Emilia-Romagna', url: 'https://www.bo.camcom.gov.it' },
  { sigla: 'FE', citta: 'Ferrara', regione: 'Emilia-Romagna', url: 'https://www.fe.camcom.it/it/servizi' },
  { sigla: 'RA', citta: 'Ravenna', regione: 'Emilia-Romagna', url: 'https://www.ra.camcom.it/it/servizi' },
  { sigla: 'FC', citta: 'Forlì-Cesena', regione: 'Emilia-Romagna', url: 'https://www.romagna.camcom.it' },
  { sigla: 'RN', citta: 'Rimini', regione: 'Emilia-Romagna', url: 'https://www.romagna.camcom.it' },
  { sigla: 'MS', citta: 'Massa-Carrara', regione: 'Toscana', url: 'https://www.ms.camcom.it/it/servizi' },
  { sigla: 'LU', citta: 'Lucca', regione: 'Toscana', url: 'https://www.lu.camcom.it/it/servizi' },
  { sigla: 'PT', citta: 'Pistoia', regione: 'Toscana', url: 'https://www.ptpo.camcom.it' },
  { sigla: 'FI', citta: 'Firenze', regione: 'Toscana', url: 'https://www.fi.camcom.it/it/home' },
  { sigla: 'LI', citta: 'Livorno', regione: 'Toscana', url: 'https://www.lg.camcom.it' },
  { sigla: 'PI', citta: 'Pisa', regione: 'Toscana', url: 'https://www.pi.camcom.it/it/servizi' },
  { sigla: 'AR', citta: 'Arezzo', regione: 'Toscana', url: 'https://www.as.camcom.it' },
  { sigla: 'SI', citta: 'Siena', regione: 'Toscana', url: 'https://www.as.camcom.it' },
  { sigla: 'GR', citta: 'Grosseto', regione: 'Toscana', url: 'https://www.lg.camcom.it' },
  { sigla: 'PO', citta: 'Prato', regione: 'Toscana', url: 'https://www.ptpo.camcom.it' },
  { sigla: 'PG', citta: 'Perugia', regione: 'Umbria', url: 'https://www.umbria.camcom.it' },
  { sigla: 'TR', citta: 'Terni', regione: 'Umbria', url: 'https://www.umbria.camcom.it' },
  { sigla: 'PU', citta: 'Pesaro-Urbino', regione: 'Marche', url: 'https://www.marche.camcom.it' },
  { sigla: 'AN', citta: 'Ancona', regione: 'Marche', url: 'https://www.an.camcom.it/it/servizi' },
  { sigla: 'MC', citta: 'Macerata', regione: 'Marche', url: 'https://www.mc.camcom.it/it/servizi' },
  { sigla: 'AP', citta: 'Ascoli Piceno', regione: 'Marche', url: 'https://www.ap.camcom.it/it/servizi' },
  { sigla: 'FM', citta: 'Fermo', regione: 'Marche', url: 'https://www.marche.camcom.it' },
  { sigla: 'RM', citta: 'Roma', regione: 'Lazio', url: 'https://www.rm.camcom.it/servizi-imprese' },
  { sigla: 'VT', citta: 'Viterbo', regione: 'Lazio', url: 'https://www.rivt.camcom.it' },
  { sigla: 'RI', citta: 'Rieti', regione: 'Lazio', url: 'https://www.rivt.camcom.it' },
  { sigla: 'LT', citta: 'Latina', regione: 'Lazio', url: 'https://www.frlt.camcom.it' },
  { sigla: 'FR', citta: 'Frosinone', regione: 'Lazio', url: 'https://www.frlt.camcom.it' },
  { sigla: 'AQ', citta: "L'Aquila", regione: 'Abruzzo', url: 'https://www.cameragransasso.camcom.it' },
  { sigla: 'TE', citta: 'Teramo', regione: 'Abruzzo', url: 'https://www.te.camcom.it/it/servizi' },
  { sigla: 'PE', citta: 'Pescara', regione: 'Abruzzo', url: 'https://www.chpe.camcom.it' },
  { sigla: 'CH', citta: 'Chieti', regione: 'Abruzzo', url: 'https://www.chpe.camcom.it' },
  { sigla: 'CB', citta: 'Campobasso', regione: 'Molise', url: 'https://www.molise.camcom.gov.it' },
  { sigla: 'IS', citta: 'Isernia', regione: 'Molise', url: 'https://www.molise.camcom.gov.it' },

  // SUD
  { sigla: 'NA', citta: 'Napoli', regione: 'Campania', url: 'https://www.na.camcom.gov.it' },
  { sigla: 'CE', citta: 'Caserta', regione: 'Campania', url: 'https://www.ce.camcom.it/it/servizi' },
  { sigla: 'BN', citta: 'Benevento', regione: 'Campania', url: 'https://www.irpiniasannio.camcom.it' },
  { sigla: 'AV', citta: 'Avellino', regione: 'Campania', url: 'https://www.irpiniasannio.camcom.it' },
  { sigla: 'SA', citta: 'Salerno', regione: 'Campania', url: 'https://www.sa.camcom.it/it/servizi' },
  { sigla: 'FG', citta: 'Foggia', regione: 'Puglia', url: 'https://www.fg.camcom.it/it/servizi' },
  { sigla: 'BA', citta: 'Bari', regione: 'Puglia', url: 'https://www.ba.camcom.it/it/servizi' },
  { sigla: 'BT', citta: 'Barletta-AT', regione: 'Puglia', url: 'https://www.ba.camcom.it' },
  { sigla: 'TA', citta: 'Taranto', regione: 'Puglia', url: 'https://www.brta.camcom.it' },
  { sigla: 'BR', citta: 'Brindisi', regione: 'Puglia', url: 'https://www.brta.camcom.it' },
  { sigla: 'LE', citta: 'Lecce', regione: 'Puglia', url: 'https://www.le.camcom.it/it/servizi' },
  { sigla: 'PZ', citta: 'Potenza', regione: 'Basilicata', url: 'https://www.basilicata.camcom.it' },
  { sigla: 'MT', citta: 'Matera', regione: 'Basilicata', url: 'https://www.basilicata.camcom.it' },
  { sigla: 'CS', citta: 'Cosenza', regione: 'Calabria', url: 'https://www.cs.camcom.gov.it' },
  { sigla: 'CZ', citta: 'Catanzaro', regione: 'Calabria', url: 'https://czkrvv.camcom.it' },
  { sigla: 'RC', citta: 'Reggio Calabria', regione: 'Calabria', url: 'https://www.rc.camcom.it/it/servizi' },
  { sigla: 'KR', citta: 'Crotone', regione: 'Calabria', url: 'https://czkrvv.camcom.it' },
  { sigla: 'VV', citta: 'Vibo Valentia', regione: 'Calabria', url: 'https://czkrvv.camcom.it' },

  // ISOLE
  { sigla: 'PA', citta: 'Palermo', regione: 'Sicilia', url: 'https://paen.camcom.gov.it' },
  { sigla: 'ME', citta: 'Messina', regione: 'Sicilia', url: 'https://www.me.camcom.it/it/servizi' },
  { sigla: 'AG', citta: 'Agrigento', regione: 'Sicilia', url: 'https://www.ag.camcom.it/it/servizi' },
  { sigla: 'CL', citta: 'Caltanissetta', regione: 'Sicilia', url: 'https://www.cameracommercio.cl.it' },
  { sigla: 'EN', citta: 'Enna', regione: 'Sicilia', url: 'https://paen.camcom.gov.it' },
  { sigla: 'CT', citta: 'Catania', regione: 'Sicilia', url: 'https://ctrgsr.camcom.gov.it' },
  { sigla: 'RG', citta: 'Ragusa', regione: 'Sicilia', url: 'https://ctrgsr.camcom.gov.it' },
  { sigla: 'SR', citta: 'Siracusa', regione: 'Sicilia', url: 'https://ctrgsr.camcom.gov.it' },
  { sigla: 'TP', citta: 'Trapani', regione: 'Sicilia', url: 'https://www.tp.camcom.it/it/servizi' },
  { sigla: 'CA', citta: 'Cagliari', regione: 'Sardegna', url: 'https://www.caor.camcom.it' },
  { sigla: 'SS', citta: 'Sassari', regione: 'Sardegna', url: 'https://www.ss.camcom.it/it/servizi' },
  { sigla: 'NU', citta: 'Nuoro', regione: 'Sardegna', url: 'https://nu.camcom.it' },
  { sigla: 'OR', citta: 'Oristano', regione: 'Sardegna', url: 'https://www.caor.camcom.it' },
  { sigla: 'SU', citta: 'Sud Sardegna', regione: 'Sardegna', url: 'https://www.caor.camcom.it' },
]

// ==========================================================
// URL SUAP VERIFICATI
// ==========================================================

const URL_SUAP_VERIFICATI: Record<string, string> = {
  Roma: 'https://www.sportellounicoperlimpresa.it',
  Milano: 'https://fareimpresa.comune.milano.it',
  Napoli: 'https://www.comune.napoli.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/28905',
  Torino: 'https://commercio.comune.torino.it',
  Palermo: 'https://www.comune.palermo.it/suap.php',
  Genova: 'https://www.comune.genova.it/servizi/suap',
  Bologna: 'https://sportellimprese.comune.bologna.it',
  Firenze: 'https://suap.comune.fi.it',
  Bari: 'https://www.comune.bari.it/web/suap',
  Catania: 'https://www.comune.catania.it/il-comune/uffici/sportello-unico-attivita-produttive/',
  Venezia: 'https://www.comune.venezia.it/it/content/sportello-unico-per-le-attivita-produttive',
  Verona: 'https://www.comune.verona.it/nqcontent.cfm?a_id=1234',
  Messina: 'https://www.comune.messina.it/suap',
  Padova: 'https://www.comune.padova.it/it/suap',
  Trieste: 'https://www.comune.trieste.it/servizi/suap',
  Taranto: 'https://www.comune.taranto.it/index.php/suap',
  Brescia: 'https://www.comune.brescia.it/servizi/imprese-e-lavoro/suap',
  Lecce: 'https://www.comune.lecce.it/servizi/suap',
  'Reggio Calabria': 'https://www.reggiocal.it/suap',
  Modena: 'https://www.comune.modena.it/suap',
  Perugia: 'https://www.comune.perugia.it/suap',
  Livorno: 'https://www.comune.livorno.it/suap',
  Cagliari: 'https://www.comune.cagliari.it/portale/it/suap.page',
  Foggia: 'https://www.comune.foggia.it/suap',
  Salerno: 'https://www.comune.salerno.it/suap',
  Ferrara: 'https://www.comune.fe.it/suap',
  Sassari: 'https://www.comune.sassari.it/suap',
  Latina: 'https://www.comune.latina.it/suap',
  Bergamo: 'https://www.comune.bergamo.it/suap',
  Trento: 'https://www.comune.trento.it/Aree-tematiche/Attivita-economiche/SUAP',
  Bolzano: 'https://www.comune.bolzano.it/suap',
  Parma: 'https://www.comune.parma.it/it/servizi/suap.html',
  Piacenza: 'https://www.comune.piacenza.it/suap',
  Ancona: 'https://www.comune.ancona.it/suap',
  Andria: 'https://www.comune.andria.bt.it/suap',
  Arezzo: 'https://www.comune.arezzo.it/suap',
  Novara: 'https://www.comune.novara.it/suap',
  Pescara: 'https://www.comune.pescara.it/suap',
  Udine: 'https://www.comune.udine.it/suap',
  Brindisi: 'https://www.comune.brindisi.it/suap',
  Treviso: 'https://www.comune.treviso.it/suap',
  Vicenza: 'https://www.comune.vicenza.it/suap',
  Como: 'https://www.comune.como.it/suap',
  Varese: 'https://www.comune.varese.it/suap',
  'La Spezia': 'https://www.comune.laspezia.it/suap',
  Pisa: 'https://www.comune.pisa.it/suap',
  Lucca: 'https://www.comune.lucca.it/suap',
  Siena: 'https://www.comune.siena.it/suap',
  Cosenza: 'https://www.comune.cosenza.it/suap',
  Catanzaro: 'https://www.comune.catanzaro.it/suap',
  Potenza: 'https://www.comune.potenza.it/suap',
  Campobasso: 'https://www.comune.campobasso.it/suap',
}

// ==========================================================
// CODICI CATASTALI
// ==========================================================

const CODICI_CATASTALI: Record<string, string> = {
  Torino: 'L219', Vercelli: 'L750', Novara: 'F952', Cuneo: 'D205', Asti: 'A479',
  Alessandria: 'A182', Biella: 'A859', Verbania: 'L746', Aosta: 'A326', Genova: 'D969',
  Imperia: 'E290', Savona: 'I480', 'La Spezia': 'E463', Milano: 'F205', Bergamo: 'A794',
  Brescia: 'B157', Como: 'C933', Cremona: 'D150', Lecco: 'E507', Lodi: 'E648',
  Mantova: 'E897', 'Monza Brianza': 'F704', Pavia: 'G388', Sondrio: 'I829', Varese: 'L682',
  Bolzano: 'A952', Trento: 'L378', Verona: 'L781', Vicenza: 'L840', Belluno: 'A757',
  Treviso: 'L407', Venezia: 'L736', Padova: 'G224', Rovigo: 'H620', Udine: 'L483',
  Gorizia: 'E098', Trieste: 'L424', Pordenone: 'G888', Piacenza: 'G535', Parma: 'G337',
  'Reggio Emilia': 'H223', Modena: 'F257', Bologna: 'A944', Ferrara: 'D548', Ravenna: 'H199',
  'Forlì-Cesena': 'D704', Rimini: 'H294', 'Massa-Carrara': 'F023', Lucca: 'E715',
  Pistoia: 'G713', Firenze: 'D612', Livorno: 'E625', Pisa: 'G702', Arezzo: 'A390',
  Siena: 'I726', Grosseto: 'E202', Prato: 'G999', Perugia: 'G478', Terni: 'L117',
  'Pesaro-Urbino': 'G453', Ancona: 'A271', Macerata: 'E783', 'Ascoli Piceno': 'A462',
  Fermo: 'D542', Roma: 'H501', Viterbo: 'M082', Rieti: 'H282', Latina: 'E472',
  Frosinone: 'D810', "L'Aquila": 'A345', Teramo: 'L103', Pescara: 'G482', Chieti: 'C632',
  Campobasso: 'B519', Isernia: 'E335', Napoli: 'F839', Caserta: 'B963', Benevento: 'A783',
  Avellino: 'A509', Salerno: 'H703', Foggia: 'D643', Bari: 'A662', 'Barletta-AT': 'A669',
  Taranto: 'L049', Brindisi: 'B180', Lecce: 'E506', Potenza: 'G942', Matera: 'F052',
  Cosenza: 'D086', Catanzaro: 'C372', 'Reggio Calabria': 'H224', Crotone: 'D122',
  'Vibo Valentia': 'F537', Palermo: 'G273', Messina: 'F158', Agrigento: 'A089',
  Caltanissetta: 'B429', Enna: 'C342', Catania: 'C351', Ragusa: 'H163', Siracusa: 'I754',
  Trapani: 'L331', Cagliari: 'B354', Sassari: 'I452', Nuoro: 'F979', Oristano: 'G113',
  'Sud Sardegna': 'B354',
}

// ==========================================================
// ATTIVITÀ REGOLAMENTATE
// ==========================================================

const URL_ATTIVITA: Record<
  AttivitaId,
  {
    pattern: (sigla: string) => string[]
    override?: Record<string, string[]>
    fonti_regionali?: Record<string, string>
  }
> = {
  taxi_ncc: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/ruolo-conducenti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/ruolo-conducenti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/taxi-ncc`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/ruolo-conducenti`,
    ],
    override: {
      LE: ['https://www.le.camcom.it/P42A2864C71S/Sessione-di-esami-di-idoneita-all-esercizio-del-servizio-di-taxi-e-noleggio-con-conducente-.htm'],
      MI: ['https://www.mi.camcom.it/ruolo-conducenti-taxi-ncc'],
      RM: ['https://www.rm.camcom.it/pagina225_qualifiche-professionali-per-acconciatori-ed-estetisti.html'],
      NA: ['https://www.na.camcom.it/it/albi-e-ruoli/ruolo-conducenti'],
      TO: ['https://www.to.camcom.it/it/servizi/ruolo-conducenti-taxi'],
    },
    fonti_regionali: {
      Campania: 'https://servizi-digitali.regione.campania.it/AbilitazioneNcc',
      Toscana: 'https://www.regione.toscana.it/ruolo-conducenti',
      Puglia: 'https://www.regione.puglia.it/web/ncc-taxi',
    },
  },
  autoriparatori: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/autoriparatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/autoriparatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/autoriparazione`,
    ],
    override: {
      LE: ['https://www.le.camcom.it/it/albi-ruoli'],
      MI: ['https://www.mi.camcom.it/autoriparatori'],
    },
  },
  acconciatori: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/acconciatori`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/acconciatori-parrucchieri`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi/acconciatori`,
    ],
    fonti_regionali: {
      Lombardia: 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/attivita-e-servizi/ServizieInformazioni/imprese-e-lavoro/acconciatori',
      Puglia: 'https://www.regione.puglia.it/web/attivita-produttive/acconciatori',
      Toscana: 'https://www.regione.toscana.it/-/acconciatori',
      Veneto: 'https://www.regione.veneto.it/web/commercio/acconciatori',
      Campania: 'https://www.regione.campania.it/acconciatori',
    },
  },
  estetisti: {
    pattern: (sigla) => [
      `https://www.${sigla.toLowerCase()}.camcom.it/estetisti`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/albi-ruoli/estetisti`,
    ],
    fonti_regionali: {
      Lombardia: 'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/attivita-e-servizi/ServizieInformazioni/imprese-e-lavoro/estetisti',
      Puglia: 'https://www.regione.puglia.it/web/attivita-produttive/estetisti',
      Veneto: 'https://suap.regione.fvg.it/portale/cms/it/apertura-modifica/Estetista-00002',
      Toscana: 'https://www.regione.toscana.it/-/estetisti',
    },
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

const FONTI_NAZIONALI_REGOLAMENTATE: Array<{
  url: string
  nome: string
  categoria: CategoriaNormativa
  attivita: AttivitaId
}> = [
  { url: 'https://www.impresainungiorno.gov.it/web/guest/acconciatori', nome: 'Impresa in un Giorno — Acconciatori', categoria: 'suap', attivita: 'acconciatori' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/estetisti', nome: 'Impresa in un Giorno — Estetisti', categoria: 'suap', attivita: 'estetisti' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/autoriparatori', nome: 'Impresa in un Giorno — Autoriparatori', categoria: 'suap', attivita: 'autoriparatori' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/impiantisti', nome: 'Impresa in un Giorno — Impiantisti', categoria: 'suap', attivita: 'impiantisti' },
  { url: 'https://www.impresainungiorno.gov.it/web/guest/mediatori', nome: 'Impresa in un Giorno — Mediatori', categoria: 'suap', attivita: 'mediatori' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-01-15;21', nome: 'L.21/1992 — Taxi e NCC', categoria: 'generale', attivita: 'taxi_ncc' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1992-03-05;122', nome: 'L.122/1992 — Autoriparatori', categoria: 'generale', attivita: 'autoriparatori' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-01-04;1', nome: 'L.1/1990 — Estetisti', categoria: 'generale', attivita: 'estetisti' },
  { url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2005-01-17;174', nome: 'L.174/2005 — Acconciatori', categoria: 'generale', attivita: 'acconciatori' },
  { url: 'https://www.sni.unioncamere.it/approfondimenti/albo-ruolo-conducenti', nome: 'SNI — Ruolo Conducenti Taxi/NCC', categoria: 'cciaa', attivita: 'taxi_ncc' },
  { url: 'https://www.sni.unioncamere.it/approfondimenti/autoriparatori', nome: 'SNI — Autoriparatori', categoria: 'cciaa', attivita: 'autoriparatori' },
]

// ==========================================================
// COSTRUZIONE COMUNI CAPOLUOGO
// ==========================================================

export const TUTTI_COMUNI_CAPOLUOGO = TUTTE_CCIAA.map(({ sigla, citta, regione }) => {
  const nomeNorm = citta
    .toLowerCase()
    .replace(/['\s\-]/g, '')
    .replace(/à/g, 'a')
    .replace(/è/g, 'e')
    .replace(/ì/g, 'i')
    .replace(/ò/g, 'o')
    .replace(/ù/g, 'u')

  const urlVerificato = URL_SUAP_VERIFICATI[citta]
  const codCatastale = CODICI_CATASTALI[citta]

  const urlCandidates = [
    ...(urlVerificato ? [urlVerificato] : []),
    `https://www.comune.${nomeNorm}.it/suap`,
    `https://www.comune.${nomeNorm}.${sigla.toLowerCase()}.it/suap`,
    `https://suap.comune.${nomeNorm}.it`,
    `https://www.comune.${nomeNorm}.it/sportello-unico`,
    `https://commercio.comune.${nomeNorm}.it`,
    ...(codCatastale ? ['https://www.impresainungiorno.gov.it/comune?codCatastale=' + codCatastale] : []),
  ]

  return {
    comune: citta,
    provincia: sigla,
    regione,
    urlCandidates: Array.from(new Set(urlCandidates)),
  }
})

// ==========================================================
// HELPER
// ==========================================================

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function contaMatch(text: string, patterns: RegExp[]) {
  return patterns.reduce((acc, rx) => acc + (rx.test(text) ? 1 : 0), 0)
}

function containsKeywordHits(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  return keywords.filter((k) => lower.includes(k.toLowerCase())).length
}

function isPortaleNazionaleComuneFallback(url: string) {
  return url.includes('impresainungiorno.gov.it/comune?codCatastale=')
}

// ==========================================================
// FETCH
// ==========================================================

async function fetchPagina(url: string, timeoutMs = 10000): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Zipra/1.0; +https://zipra.it)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })

    clearTimeout(timeout)

    const contentType = res.headers.get('content-type') || ''
    if (!res.ok || !contentType.includes('text/html')) {
      return {
        ok: false,
        status: res.status,
        html: null,
        finalUrl: res.url || url,
      }
    }

    return {
      ok: true,
      status: res.status,
      html: await res.text(),
      finalUrl: res.url || url,
    }
  } catch {
    return {
      ok: false,
      status: 0,
      html: null,
      finalUrl: url,
    }
  }
}

// ==========================================================
// ESTRAZIONE TESTO
// ==========================================================

function estraiTestoQualificato(html: string): string {
  const $ = cheerio.load(html)

  $(
    [
      'script',
      'style',
      'noscript',
      'svg',
      'iframe',
      'nav',
      'footer',
      'header',
      'aside',
      'form',
      '.cookie',
      '.cookies',
      '.banner',
      '.ads',
      '.advertisement',
      '.sidebar',
      '.menu',
      '.breadcrumb',
      '.breadcrumbs',
      '.social',
      '.share',
      '.rating',
      '.search',
      '.newsletter',
      '.related',
      '.news',
      '.eventi',
      '.event-list',
      '.widget',
      '#cookie-banner',
      '#footer',
      '#header',
      '#sidebar',
    ].join(',')
  ).remove()

  const candidates = [
    'main article',
    'main .content',
    'main',
    'article',
    '#main-content',
    '#content',
    '.content',
    '.page-content',
    '.field--name-body',
    '[role="main"]',
  ]

  let bestText = ''

  for (const selector of candidates) {
    const txt = $(selector).first().text().replace(/\s+/g, ' ').trim()
    if (txt.length > bestText.length) bestText = txt
  }

  if (!bestText) {
    bestText = $('body').text().replace(/\s+/g, ' ').trim()
  }

  return bestText
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

// ==========================================================
// VALIDAZIONE
// ==========================================================

function valutaContenutoNormativo(params: {
  testo: string
  categoria: CategoriaNormativa
  url: string
  comune?: string
  provincia?: string
}) {
  const { testo, categoria, url, comune, provincia } = params
  const text = testo.trim()
  const lower = text.toLowerCase()

  if (!text || text.length < MIN_TEXT_LENGTH[categoria]) {
    return { valido: false, motivo: 'testo troppo corto' }
  }

  if (contaMatch(lower, BAD_PATTERNS) > 0) {
    return { valido: false, motivo: 'pagina errore/accesso negato' }
  }

  // FIX: blocca esplicitamente le pagine codCatastale di impresainungiorno
  // che mostrano solo indirizzo/telefono/responsabile SUAP, non procedure
  if (url.includes('impresainungiorno.gov.it/comune?codCatastale=')) {
    return { valido: false, motivo: 'pagina contatti SUAP — non procedurale' }
  }

  const keywordHits = containsKeywordHits(lower, KEYWORDS_BY_CATEGORY[categoria])
  if (keywordHits < 2) {
    return { valido: false, motivo: 'contenuto poco pertinente' }
  }

  const noiseHits = contaMatch(lower, NOISE_PATTERNS)
  if (noiseHits >= 3 && keywordHits < 3) {
    return { valido: false, motivo: 'contenuto troppo navigazionale' }
  }

  // FIX: verifica che ci sia contenuto procedurale reale (non solo homepage o contatti)
  if (categoria === 'suap' || categoria === 'cciaa') {
    const KEYWORDS_PROCEDURALI = [
      'procedimento', 'pratica', 'modulo', 'istanza', 'scia', 'comunicazione',
      'requisiti', 'documentazione', 'allegati', 'tempistica', 'iter',
      'codice ateco', 'partita iva', 'apertura', 'avvio', 'iscrizione',
      'autorizzazione', 'licenza', 'permesso', 'nulla osta',
    ]
    const hitsProc = KEYWORDS_PROCEDURALI.filter(k => lower.includes(k)).length
    if (hitsProc < 3) {
      return { valido: false, motivo: `nessun contenuto procedurale reale (solo ${hitsProc}/3 keyword trovate)` }
    }
  }

  return { valido: true, motivo: 'ok' }
}

function validaAttivitaRegolamentata(testo: string, attivitaId: AttivitaId) {
  const base = valutaContenutoNormativo({
    testo,
    categoria: 'cciaa',
    url: '',
  })

  if (!base.valido) return base

  const hits = containsKeywordHits(testo.toLowerCase(), KEYWORDS_BY_ATTIVITA[attivitaId] || [])
  if (hits < 2) {
    return { valido: false, motivo: `contenuto poco specifico per ${attivitaId}` }
  }

  return { valido: true, motivo: 'ok' }
}

// ==========================================================
// INDICIZZAZIONE SICURA
// ==========================================================

async function indicizzaSeValido(params: {
  titolo: string
  contenuto: string
  fonteUrl: string
  fonteNome: string
  categoria: CategoriaNormativa
  comune?: string
  provincia?: string
  tipoAttivita?: string
}) {
  const check = valutaContenutoNormativo({
    testo: params.contenuto,
    categoria: params.categoria,
    url: params.fonteUrl,
    comune: params.comune,
    provincia: params.provincia,
  })

  if (!check.valido) {
    return { skipped: true, motivo: check.motivo }
  }

  return indicizzaNormativa({
    titolo: params.titolo,
    contenuto: params.contenuto.replace(/\s+/g, ' ').trim().slice(0, 10000),
    fonteUrl: params.fonteUrl,
    fonteNome: params.fonteNome,
    comune: params.comune,
    provincia: params.provincia,
    categoria: params.categoria,
    tipoAttivita: params.tipoAttivita,
  })
}

// ==========================================================
// SCRAPER NAZIONALE
// ==========================================================

export async function scrapeNazionale(): Promise<ScrapeReport> {
  const risultati: ScrapeReport = {
    indicizzati: 0,
    saltati: 0,
    errori: 0,
    vuoti: [],
  }

  for (const fonte of FONTI_NAZIONALI) {
    try {
      const res = await fetchPagina(fonte.url, 10000)

      if (!res.ok || !res.html) {
        risultati.errori++
        risultati.vuoti?.push(fonte.nome)
        continue
      }

      const testo = estraiTestoQualificato(res.html)

      const out = await indicizzaSeValido({
        titolo: fonte.nome,
        contenuto: testo,
        fonteUrl: res.finalUrl,
        fonteNome: fonte.nome,
        categoria: fonte.categoria,
      })

      if ((out as any)?.skipped) risultati.saltati++
      else risultati.indicizzati++
    } catch {
      risultati.errori++
      risultati.vuoti?.push(fonte.nome)
    }

    await sleep(1000)
  }

  return risultati
}

// ==========================================================
// SCRAPER SUAP
// ==========================================================

export async function scrapeComuni(provincieFilter?: string[]): Promise<ScrapeReport> {
  const comuni = provincieFilter
    ? TUTTI_COMUNI_CAPOLUOGO.filter((c) => provincieFilter.includes(c.provincia))
    : TUTTI_COMUNI_CAPOLUOGO

  const risultati: ScrapeReport = {
    indicizzati: 0,
    saltati: 0,
    errori: 0,
    totale: comuni.length,
    vuoti: [],
  }

  console.log(`🏘️  Scraping SUAP per ${comuni.length} comuni...`)

  for (const { comune, provincia, urlCandidates } of comuni) {
    let testoValido: string | null = null
    let urlUsato = ''

    for (const url of Array.from(new Set(urlCandidates))) {
      const res = await fetchPagina(url, 8000)
      if (!res.ok || !res.html) continue

      const testo = estraiTestoQualificato(res.html)
      const validazione = valutaContenutoNormativo({
        testo,
        categoria: 'suap',
        url: res.finalUrl,
        comune,
        provincia,
      })

      if (validazione.valido) {
        testoValido = testo
        urlUsato = res.finalUrl
        break
      }
    }

    if (!testoValido) {
      console.log(`  ⚠️  ${comune}: nessuna pagina SUAP valida`)
      risultati.errori++
      risultati.vuoti?.push(`${comune} (${provincia})`)
      continue
    }

    try {
      const out = await indicizzaSeValido({
        titolo: `SUAP ${comune} (${provincia}) — Sportello Unico Attività Produttive`,
        contenuto: testoValido,
        fonteUrl: urlUsato,
        fonteNome: `Comune di ${comune}`,
        comune,
        provincia,
        categoria: 'suap',
      })

      if ((out as any)?.skipped) risultati.saltati++
      else {
        risultati.indicizzati++
        console.log(`  ✅ ${comune} indicizzato`)
      }
    } catch (e) {
      console.error(`  ❌ ${comune}: errore indicizzazione`, e)
      risultati.errori++
    }

    await sleep(500)
  }

  return risultati
}

// ==========================================================
// SCRAPER CCIAA
// ==========================================================

export async function scrapeCCIAA(provincieFilter?: string[]): Promise<ScrapeReport> {
  const cciaa = provincieFilter
    ? TUTTE_CCIAA.filter((c) => provincieFilter.includes(c.sigla))
    : TUTTE_CCIAA

  const risultati: ScrapeReport = {
    indicizzati: 0,
    saltati: 0,
    errori: 0,
    totale: cciaa.length,
    vuoti: [],
  }

  console.log(`🏛️  Scraping CCIAA per ${cciaa.length} camere di commercio...`)

  for (const { sigla, citta, regione, url } of cciaa) {
    const urlAlternativi = [
      url,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/registro-imprese`,
      `https://www.${sigla.toLowerCase()}.camcom.it/apertura-impresa`,
      `https://www.${sigla.toLowerCase()}.camcom.it/it/servizi`,
      `https://www.${sigla.toLowerCase()}.camcom.it`,
    ]

    let testoValido: string | null = null
    let urlUsato = ''

    for (const candidate of Array.from(new Set(urlAlternativi))) {
      const res = await fetchPagina(candidate, 8000)
      if (!res.ok || !res.html) continue

      const testo = estraiTestoQualificato(res.html)
      const hasLocalHint =
        testo.toLowerCase().includes(citta.toLowerCase()) ||
        testo.toLowerCase().includes('camera di commercio') ||
        testo.toLowerCase().includes('registro imprese')

      const validazione = valutaContenutoNormativo({
        testo,
        categoria: 'cciaa',
        url: res.finalUrl,
        comune: citta,
        provincia: sigla,
      })

      if (validazione.valido && hasLocalHint) {
        testoValido = testo
        urlUsato = res.finalUrl
        break
      }
    }

    if (!testoValido) {
      console.log(`  ⚠️  CCIAA ${citta}: nessuna pagina valida`)
      risultati.errori++
      risultati.vuoti?.push(`${citta} (${sigla})`)
      continue
    }

    try {
      const out = await indicizzaSeValido({
        titolo: `Camera di Commercio ${citta} (${sigla}) — ${regione}`,
        contenuto: testoValido,
        fonteUrl: urlUsato,
        fonteNome: `CCIAA ${citta}`,
        comune: citta,
        provincia: sigla,
        categoria: 'cciaa',
      })

      if ((out as any)?.skipped) risultati.saltati++
      else {
        risultati.indicizzati++
        console.log(`  ✅ CCIAA ${citta} indicizzata`)
      }
    } catch (e) {
      console.error(`  ❌ CCIAA ${citta}: errore indicizzazione`, e)
      risultati.errori++
    }

    await sleep(500)
  }

  return risultati
}

// ==========================================================
// SCRAPER ATTIVITÀ REGOLAMENTATE
// ==========================================================

export async function scrapaAttivitaRegolamentate(): Promise<{
  successi: number
  errori: number
  dettaglio: string[]
}> {
  const risultati = { successi: 0, errori: 0, dettaglio: [] as string[] }

  // Fonti nazionali regolamentate
  for (const fonte of FONTI_NAZIONALI_REGOLAMENTATE) {
    try {
      const res = await fetchPagina(fonte.url, 10000)
      if (!res.ok || !res.html) continue

      const testo = estraiTestoQualificato(res.html)
      const check = validaAttivitaRegolamentata(testo, fonte.attivita)
      if (!check.valido) continue

      await indicizzaNormativa({
        titolo: fonte.nome,
        contenuto: testo.slice(0, 6000),
        fonteUrl: res.finalUrl,
        fonteNome: fonte.nome,
        categoria: fonte.categoria,
        tipoAttivita: fonte.attivita,
      })

      risultati.successi++
      risultati.dettaglio.push(`✓ ${fonte.nome}`)
    } catch {
      risultati.errori++
    }

    await sleep(600)
  }

  console.log(`📋 Attività regolamentate — scraping ${TUTTE_CCIAA.length} province...`)

  for (const cciaa of TUTTE_CCIAA) {
    // Fonti provinciali
    for (const [attivitaId, config] of Object.entries(URL_ATTIVITA) as Array<
      [AttivitaId, (typeof URL_ATTIVITA)[AttivitaId]]
    >) {
      const urls = config.override?.[cciaa.sigla] ?? config.pattern(cciaa.sigla)

      for (const url of Array.from(new Set(urls))) {
        try {
          const res = await fetchPagina(url, 8000)
          if (!res.ok || !res.html) continue

          const testo = estraiTestoQualificato(res.html)
          const check = validaAttivitaRegolamentata(testo, attivitaId)
          if (!check.valido) continue

          const contenutoArricchito = `
ATTIVITÀ: ${attivitaId.replace(/_/g, ' ').toUpperCase()}
PROVINCIA: ${cciaa.citta} (${cciaa.sigla})
REGIONE: ${cciaa.regione}
FONTE: ${res.finalUrl}

${testo.slice(0, 4000)}
          `.trim()

          await indicizzaNormativa({
            titolo: `${attivitaId.replace(/_/g, ' ')} — ${cciaa.citta} (${cciaa.sigla})`,
            contenuto: contenutoArricchito,
            fonteUrl: res.finalUrl,
            fonteNome: `CCIAA ${cciaa.citta}`,
            comune: cciaa.citta,
            provincia: cciaa.sigla,
            categoria: 'cciaa',
            tipoAttivita: attivitaId,
          })

          risultati.successi++
          risultati.dettaglio.push(`✓ ${attivitaId} @ ${cciaa.sigla}`)
          break
        } catch {
          // prova url successivo
        }
      }
    }

    // Fonti regionali
    const regioniViste = new Set<string>()

    for (const [attivitaId, config] of Object.entries(URL_ATTIVITA) as Array<
      [AttivitaId, (typeof URL_ATTIVITA)[AttivitaId]]
    >) {
      const urlRegionale = config.fonti_regionali?.[cciaa.regione]
      if (!urlRegionale) continue

      const chiave = `${attivitaId}-${cciaa.regione}`
      if (regioniViste.has(chiave)) continue
      regioniViste.add(chiave)

      try {
        const res = await fetchPagina(urlRegionale, 8000)
        if (!res.ok || !res.html) continue

        const testo = estraiTestoQualificato(res.html)
        const check = validaAttivitaRegolamentata(testo, attivitaId)
        if (!check.valido) continue

        await indicizzaNormativa({
          titolo: `${attivitaId.replace(/_/g, ' ')} — Regione ${cciaa.regione}`,
          contenuto: `FONTE REGIONALE: ${cciaa.regione}\nATTIVITÀ: ${attivitaId}\n\n${testo.slice(0, 4000)}`,
          fonteUrl: res.finalUrl,
          fonteNome: `Regione ${cciaa.regione}`,
          categoria: 'suap',
          tipoAttivita: attivitaId,
        })

        risultati.successi++
        risultati.dettaglio.push(`✓ ${attivitaId} @ REGIONE ${cciaa.regione}`)
      } catch {
        // ignora
      }
    }

    await sleep(500)
  }

  return risultati
}

// ==========================================================
// API UTILI
// ==========================================================

export async function getDateEsamiTaxi(provincia: string): Promise<{
  prossima_sessione?: string
  url_bando?: string
  contatti?: string
} | null> {
  const cciaa = TUTTE_CCIAA.find(c => c.sigla === provincia.toUpperCase())
  if (!cciaa) return null

  const urlsProva =
    URL_ATTIVITA.taxi_ncc.override?.[cciaa.sigla] ??
    URL_ATTIVITA.taxi_ncc.pattern(cciaa.sigla)

  for (const url of urlsProva) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const html = await res.text()

      const dateMatch = html.match(/(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{4}|\w+\s\d{4})/gi)
      if (dateMatch && dateMatch.length > 0) {
        return {
          prossima_sessione: dateMatch[0],
          url_bando: url,
          contatti: `CCIAA ${cciaa.citta}: ${url}`,
        }
      }
    } catch {
      // ignora
    }
  }

  return {
    url_bando: `https://www.${provincia.toLowerCase()}.camcom.it`,
    contatti: `CCIAA ${cciaa.citta} — verificare sul sito ufficiale`,
  }
}

export async function getEstrattoCaricoINPS(codiceFiscale: string): Promise<{
  disponibile: boolean
  url: string
  istruzioni: string
}> {
  return {
    disponibile: false,
    url: 'https://servizi.inps.it/servizi/portaledeiserviziassicurativi/',
    istruzioni: 'Accedi a servizi.inps.it con SPID → Estratto conto contributivo → Scarica PDF e allegalo qui',
  }
}

export async function getVisuraCatastale(comune: string, indirizzo: string): Promise<{
  disponibile: boolean
  url: string
  istruzioni: string
}> {
  return {
    disponibile: false,
    url: 'https://sister.agenziaentrate.gov.it',
    istruzioni: 'Accedi a sister.agenziaentrate.gov.it → Ricerca per indirizzo → Scarica la planimetria e allegala',
  }
}

export function verificaCodiceFiscale(cf: string): boolean {
  if (!cf || cf.length !== 16) return false
  cf = cf.toUpperCase()

  const valoriPari = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
    K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
    U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
  } as Record<string, number>

  const valoriDispari = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
    K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
    U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  } as Record<string, number>

  let somma = 0
  for (let i = 0; i < 15; i++) {
    const c = cf[i]
    somma += i % 2 === 0 ? (valoriDispari[c] ?? 0) : (valoriPari[c] ?? 0)
  }

  const atteso = String.fromCharCode(65 + (somma % 26))
  return cf[15] === atteso
}

// ==========================================================
// JOB COMPLETO
// ==========================================================

export async function runScrapingJob(modalita: 'completo' | 'incrementale' = 'incrementale') {
  console.log(`🕷️  Scraping job avviato (modalità: ${modalita})...`)
  const start = Date.now()

  console.log(`📅 Scraping completo — tutte le ${TUTTE_CCIAA.length} province italiane`)

  const [nazionali, comuni, cciaa, regolamentate] = await Promise.allSettled([
    scrapeNazionale(),
    scrapeComuni(),
    scrapeCCIAA(),
    scrapaAttivitaRegolamentate(),
  ])

  const durata = ((Date.now() - start) / 1000).toFixed(1)

  const report = {
    durata,
    modalita,
    province_scrapeate: TUTTE_CCIAA.length,
    nazionali: nazionali.status === 'fulfilled' ? nazionali.value : { error: 'fallito' },
    comuni: comuni.status === 'fulfilled' ? comuni.value : { error: 'fallito' },
    cciaa: cciaa.status === 'fulfilled' ? cciaa.value : { error: 'fallito' },
    regolamentate: regolamentate.status === 'fulfilled' ? regolamentate.value : { error: 'fallito' },
  }

  console.log(`✅ Scraping completato in ${durata}s:`, JSON.stringify(report, null, 2))
  return report
}