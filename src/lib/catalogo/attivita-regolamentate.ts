/**
 * ZIPRA — KNOWLEDGE BASE COMPLETA ATTIVITÀ REGOLAMENTATE ITALIANE
 * ════════════════════════════════════════════════════════════════
 * 80+ attività con:
 *  - Legge di riferimento aggiornata
 *  - Iter pratico nell'ordine corretto
 *  - Documenti: chi li ha / chi li recupera Zipra via API
 *  - API e canali digitali per ogni ente (cosa automatizziamo)
 *  - Varianti regionali/comunali rilevanti
 *
 * Copertura digitale Zipra:
 *  ✅ ComUnica  → CCIAA + Agenzia Entrate + INPS + INAIL in un solo invio
 *  ✅ SUAP      → impresainungiorno.gov.it (SCIA, comunicazioni, variazioni)
 *  ✅ INPS      → estratto contributivo, iscrizione gestioni, RED
 *  ✅ Giustizia → casellario giudiziale (portale giustizia.it)
 *  ✅ ADE       → apertura P.IVA, cambio regime fiscale, deleghe F24
 *  ✅ INAIL     → iscrizione, denuncia infortuni, autoliquidazione
 *  ⚠️ ASL      → solo in alcune province (portali locali non standard)
 *  ⚠️ Regioni  → varia molto per regione
 *
 * Aggiornato: Marzo 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPI
// ═══════════════════════════════════════════════════════════════════════════

export type FonteDocumento =
  | 'utente'           // ce l'ha già l'utente
  | 'zipra_api'        // Zipra lo recupera automaticamente via API
  | 'zipra_genera'     // Zipra lo compila (SCIA, ComUnica, moduli CCIAA)
  | 'ente_pubblico'    // l'utente lo richiede allo sportello / portale
  | 'professionista'   // notaio, tecnico abilitato, consulente HACCP

export interface DocumentoRichiesto {
  id: string
  nome: string
  descrizione: string
  obbligatorio: boolean
  fonte: FonteDocumento
  dati_necessari?: string[]   // dati che chiediamo all'utente per recuperarlo
  dove?: string               // dove si ottiene se ente_pubblico
  come_ottenere?: string
  tempi_stimati?: string
  costo_stimato?: string
  zipra_lo_fa: boolean        // true = utente non fa nulla
}

export interface ComunicazioneEnte {
  ente: string
  nome_canale: string
  url: string
  cosa_fa_zipra: string        // descrizione azione automatizzata
  dati_necessari: string[]     // dati che servono dall'utente
  automatico: boolean          // true = zero intervento utente
  note?: string
}

export interface AttivitaRegolamentata {
  id: string
  nome: string
  nome_breve: string
  nomi_alternativi: string[]
  categoria: 'artigianato' | 'commercio' | 'somministrazione' | 'trasporto' | 'servizi' | 'sanitario' | 'professione' | 'logistica' | 'turismo' | 'formazione' | 'media'
  legge_riferimento: string
  codici_ateco: string[]
  enti_verifica: string[]
  requisiti_soggettivi: string[]
  requisiti_oggettivi: string[]
  alert?: string
  iter: string[]
  documenti: DocumentoRichiesto[]
  comunicazioni_enti: ComunicazioneEnte[]
  varianti_regionali?: Record<string, string>
  varianti_comunali?: string
  cosa_gestiamo: string
  cosa_deve_fare_utente: string[]
  percentuale_automazione: number  // % del lavoro gestito da Zipra (stima)
}

// ═══════════════════════════════════════════════════════════════════════════
// CANALI DIGITALI STANDARD — riutilizzati su tutte le attività
// ═══════════════════════════════════════════════════════════════════════════

const CH_COMUNICA: ComunicazioneEnte = {
  ente: 'CCIAA + Agenzia Entrate + INPS + INAIL',
  nome_canale: 'ComUnica / Registro Imprese Telemaco',
  url: 'https://webtelemaco.infocamere.it',
  cosa_fa_zipra: 'Invia in un unico atto telematico: apertura P.IVA (ADE), iscrizione Registro Imprese (CCIAA), iscrizione gestione INPS artigiani/commercianti, comunicazione INAIL. Firma digitale e marca temporale incluse.',
  dati_necessari: ['CF titolare', 'Dati anagrafici', 'Sede impresa', 'Codice ATECO', 'Regime fiscale scelto'],
  automatico: true,
  note: 'È la pratica più importante — apre tutto con un solo invio'
}

const CH_SUAP: ComunicazioneEnte = {
  ente: 'SUAP Comunale',
  nome_canale: 'impresainungiorno.gov.it',
  url: 'https://www.impresainungiorno.gov.it',
  cosa_fa_zipra: 'Invia SCIA di inizio attività, variazione, cessazione, subingresso. Compila tutti i moduli, allega i documenti, firma digitalmente, trasmette al Comune competente.',
  dati_necessari: ['CF titolare', 'Dati impresa', 'Dati locale', 'Dichiarazioni autocertificate', 'Allegati'],
  automatico: true,
  note: 'Alcuni Comuni hanno SUAP autonomo — Zipra verifica e usa il canale corretto'
}

const CH_ADE: ComunicazioneEnte = {
  ente: 'Agenzia delle Entrate',
  nome_canale: 'Cassetto Fiscale / Fisconline / ComUnica',
  url: 'https://telematici.agenziaentrate.gov.it',
  cosa_fa_zipra: 'Apertura P.IVA, comunicazione inizio attività, scelta/cambio regime fiscale, deleghe F24, richiesta duplicato CF.',
  dati_necessari: ['CF', 'Residenza', 'Codice ATECO', 'Regime fiscale'],
  automatico: true,
  note: 'Incluso nella ComUnica per nuove imprese. Separato per variazioni.'
}

const CH_INPS: ComunicazioneEnte = {
  ente: 'INPS',
  nome_canale: 'myINPS / ComUnica',
  url: 'https://www.inps.it',
  cosa_fa_zipra: 'Iscrizione gestione artigiani o commercianti (IVS), estratto contributivo, posizione previdenziale, RED telematico, DM10 gestione dipendenti.',
  dati_necessari: ['CF titolare', 'Codice ATECO'],
  automatico: true,
  note: 'Iscrizione IVS automatica nella ComUnica. Estratto contributivo via PIN/SPID.'
}

const CH_INAIL: ComunicazioneEnte = {
  ente: 'INAIL',
  nome_canale: 'Portale INAIL / ComUnica',
  url: 'https://www.inail.it',
  cosa_fa_zipra: 'Iscrizione assicurazione obbligatoria, denuncia infortuni, autoliquidazione premi, PAT (Posizione Assicurativa Territoriale).',
  dati_necessari: ['CF', 'Tipo attività', 'N. dipendenti previsti'],
  automatico: true,
  note: 'Obbligatorio se ci sono dipendenti o se l\'attività è a rischio specifico'
}

const CH_GIUSTIZIA: ComunicazioneEnte = {
  ente: 'Ministero della Giustizia',
  nome_canale: 'Portale Casellario Giudiziale',
  url: 'https://certificatopenale.giustizia.it',
  cosa_fa_zipra: 'Richiesta certificato casellario giudiziale online con SPID/CIE. Disponibile in 24-48 ore.',
  dati_necessari: ['CF', 'Data e luogo di nascita'],
  automatico: true
}

const CH_ASL: ComunicazioneEnte = {
  ente: 'ASL / ATS locale',
  nome_canale: 'Portale ASL provinciale (varia)',
  url: 'Variabile per provincia',
  cosa_fa_zipra: 'Dove disponibile digitalmente: notifica sanitaria (Reg. CE 852/2004), registrazione attività alimentare. In altre province: assistenza alla compilazione e invio.',
  dati_necessari: ['Dati impresa', 'Planimetria locale', 'Piano HACCP'],
  automatico: false,
  note: 'Non ancora standardizzato a livello nazionale — Zipra usa i portali locali dove disponibili'
}

const CH_ALBI: ComunicazioneEnte = {
  ente: 'CCIAA — Albi e Ruoli',
  nome_canale: 'Telemaco / SARI',
  url: 'https://webtelemaco.infocamere.it',
  cosa_fa_zipra: 'Iscrizione e variazione Albi (Autoriparatori, Acconciatori, Impiantisti, Agenti, Mediatori, Panificatori). Comunicazione Responsabile Tecnico. Aggiornamento REA.',
  dati_necessari: ['CF titolare e RT', 'Attestati', 'Dati impresa'],
  automatico: true
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTI STANDARD — riutilizzati
// ═══════════════════════════════════════════════════════════════════════════

const D_ID: DocumentoRichiesto = {
  id: 'doc_id', nome: 'Documento di identità valido',
  descrizione: 'Carta d\'identità o passaporto in corso di validità',
  obbligatorio: true, fonte: 'utente', zipra_lo_fa: false
}
const D_CF: DocumentoRichiesto = {
  id: 'codice_fiscale', nome: 'Codice fiscale',
  descrizione: 'Tesserino CF — serve per tutto',
  obbligatorio: true, fonte: 'utente', zipra_lo_fa: false
}
const D_CASELLARIO: DocumentoRichiesto = {
  id: 'casellario', nome: 'Certificato casellario giudiziale',
  descrizione: 'Richiesto da Zipra online con SPID/CIE — l\'utente non deve fare nulla',
  obbligatorio: true, fonte: 'zipra_api',
  dati_necessari: ['Codice fiscale', 'Data di nascita', 'Luogo di nascita'],
  zipra_lo_fa: true, tempi_stimati: '24-48 ore'
}
const D_ESTRATTO_INPS: DocumentoRichiesto = {
  id: 'estratto_inps', nome: 'Estratto contributivo INPS',
  descrizione: 'Storico contributi — dimostra anni di esperienza nel settore',
  obbligatorio: false, fonte: 'zipra_api',
  dati_necessari: ['Codice fiscale'],
  zipra_lo_fa: true, tempi_stimati: 'Immediato'
}
const D_COMUNICA: DocumentoRichiesto = {
  id: 'comunica', nome: 'Pratica ComUnica completa',
  descrizione: 'P.IVA + CCIAA + INPS + INAIL in un unico invio telematico',
  obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true
}
const scia = (tipo: string): DocumentoRichiesto => ({
  id: `scia_${tipo}`, nome: `SCIA ${tipo}`,
  descrizione: `Segnalazione Certificata di Inizio Attività — ${tipo}`,
  obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true
})
const D_CONTRATTO_LOCALE: DocumentoRichiesto = {
  id: 'contratto_locale', nome: 'Contratto di locazione o rogito',
  descrizione: 'Disponibilità del locale commerciale/artigianale',
  obbligatorio: true, fonte: 'utente', zipra_lo_fa: false
}
const D_PLANIMETRIA: DocumentoRichiesto = {
  id: 'planimetria', nome: 'Planimetria con superfici e destinazioni d\'uso',
  descrizione: 'Pianta del locale con misure e indicazione delle zone',
  obbligatorio: true, fonte: 'professionista',
  come_ottenere: 'Geometra o tecnico abilitato', costo_stimato: '€100-250',
  zipra_lo_fa: false
}
const D_CONF_IMPIANTI: DocumentoRichiesto = {
  id: 'conf_impianti', nome: 'Dichiarazione conformità impianti DM 37/2008',
  descrizione: 'Impianti elettrici e idraulici a norma',
  obbligatorio: true, fonte: 'professionista',
  come_ottenere: 'Tecnico abilitato che ha installato/verificato gli impianti',
  costo_stimato: '€150-400', zipra_lo_fa: false
}
const D_HACCP: DocumentoRichiesto = {
  id: 'haccp', nome: 'Piano HACCP',
  descrizione: 'Autocontrollo alimentare — obbligatorio per legge (Reg. CE 852/2004)',
  obbligatorio: true, fonte: 'professionista',
  come_ottenere: 'Consulente HACCP o tecnologo alimentare',
  costo_stimato: '€300-800', tempi_stimati: '1-2 settimane',
  zipra_lo_fa: false
}
const D_AGIBILITA: DocumentoRichiesto = {
  id: 'agibilita', nome: 'Certificato di agibilità del locale',
  descrizione: 'Il locale è idoneo all\'uso previsto',
  obbligatorio: true, fonte: 'ente_pubblico',
  dove: 'Comune — Ufficio tecnico', tempi_stimati: '1-4 settimane se non già disponibile',
  zipra_lo_fa: false
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE COMPLETO
// ═══════════════════════════════════════════════════════════════════════════

export const ATTIVITA_REGOLAMENTATE: AttivitaRegolamentata[] = [

  // ═══════════════════════════════════════════════════════
  // GRUPPO 1 — ARTIGIANATO REGOLAMENTATO
  // ═══════════════════════════════════════════════════════

  {
    id: 'autoriparatori',
    nome: 'Autoriparatore — meccanico, carrozziere, elettrauto, gommista',
    nome_breve: 'Meccanico / Officina',
    nomi_alternativi: ['meccanico', 'officina', 'officina auto', 'officina moto', 'carrozziere', 'carrozzeria', 'elettrauto', 'gommista', 'pneumatici', 'revisioni', 'tagliando', 'autofficina', 'riparazione auto'],
    categoria: 'artigianato',
    legge_riferimento: 'L. 5 febbraio 1992 n.122',
    codici_ateco: ['45.20.10', '45.20.20', '45.20.30', '45.20.40', '45.20.91', '45.20.99'],
    enti_verifica: ['CCIAA — Albo Autoriparatori'],
    requisiti_soggettivi: [
      'Patentino autoriparatore CCIAA: esame presso Commissione provinciale OPPURE 2 anni esperienza documentata come dipendente qualificato in officina autorizzata negli ultimi 5 anni',
      'Requisiti morali (no condanne per reati ostativi L.122/1992)',
    ],
    requisiti_oggettivi: [
      'Locale idoneo con superficie adeguata al tipo di lavorazione',
      'Vasche raccolta oli esausti e reflui a norma di legge (D.Lgs 152/2006)',
      'Conformità impianti DM 37/2008',
      'CPI (Certificato Prevenzione Incendi) se deposito carburanti o oltre soglie',
    ],
    alert: '⚠️ Patentino OBBLIGATORIO prima di aprire — non è possibile aprire e ottenerlo dopo.',
    iter: [
      '1. Verifica/ottieni patentino autoriparatore CCIAA (esame o documenta esperienza)',
      '2. Prepara il locale: vasche oli, impianti a norma, eventuale CPI',
      '3. Raccolta documenti → Zipra ti guida passo per passo',
      '4. ComUnica (P.IVA + CCIAA + INPS artigiani + eventuale INAIL) → Zipra invia',
      '5. SCIA al SUAP per inizio attività → Zipra invia',
      '6. Iscrizione Albo Autoriparatori + comunicazione Responsabile Tecnico CCIAA → Zipra invia',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'patentino', nome: 'Patentino autoriparatore CCIAA', descrizione: 'Abilitazione obbligatoria prima di aprire l\'officina', obbligatorio: true, fonte: 'utente', come_ottenere: 'Esame CCIAA (materie: tecnica auto, normativa, sicurezza) OPPURE documentazione 2 anni esperienza. Zipra ti indica come prenotare l\'esame.', zipra_lo_fa: false },
      D_CONTRATTO_LOCALE, D_CONF_IMPIANTI,
      { id: 'vasche_oli', nome: 'Certificazione vasche raccolta oli', descrizione: 'Obbligatoria per ambito ambientale', obbligatorio: true, fonte: 'professionista', costo_stimato: '€100-300', zipra_lo_fa: false },
      D_CASELLARIO, D_ESTRATTO_INPS,
      scia('autoriparatori'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_ALBI],
    varianti_regionali: { 'Lombardia': 'Moduli SCIA regionali specifici — Zipra li usa automaticamente', 'Veneto': 'Albo Artigiani regionale — procedura specifica di iscrizione', 'Toscana': 'Comunicazione aggiuntiva alla Regione per iscrizione artigiani' },
    cosa_gestiamo: 'ComUnica, SCIA SUAP, Albo Autoriparatori, Responsabile Tecnico CCIAA, casellario giudiziale, estratto INPS',
    cosa_deve_fare_utente: ['Ottenere il patentino CCIAA (esame o esperienza)', 'Trovare e attrezzare il locale', 'Far fare la conformità impianti e certificazione vasche'],
    percentuale_automazione: 75,
  },

  {
    id: 'impiantisti_elettrico',
    nome: 'Impiantista elettrico — impianti civili e industriali',
    nome_breve: 'Elettricista',
    nomi_alternativi: ['elettricista', 'impianti elettrici', 'installatore elettrico', 'fotovoltaico', 'domotica', 'impianti civili', 'quadri elettrici'],
    categoria: 'artigianato',
    legge_riferimento: 'DM 22 gennaio 2008 n.37 (ex L. 46/1990)',
    codici_ateco: ['43.21.01', '43.21.09'],
    enti_verifica: ['CCIAA — Responsabile Tecnico'],
    requisiti_soggettivi: [
      'Diploma di scuola secondaria superiore ad indirizzo tecnico nel settore + 2 anni esperienza, OPPURE',
      'Diploma professionale triennale nel settore + 4 anni esperienza, OPPURE',
      'Qualifica professionale regionale nel settore + 4 anni esperienza, OPPURE',
      '3 anni di esperienza come operaio qualificato nel settore',
    ],
    requisiti_oggettivi: ['Sede operativa (anche domicilio per chi lavora in cantiere)'],
    iter: [
      '1. Verifica che il tuo diploma/qualifica soddisfi i requisiti DM37 → Zipra controlla',
      '2. ComUnica (P.IVA + CCIAA + INPS) → Zipra invia',
      '3. SCIA impiantisti al SUAP → Zipra invia',
      '4. Comunicazione Responsabile Tecnico a CCIAA → Zipra invia',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'titolo_studio', nome: 'Diploma tecnico o attestato qualifica professionale', descrizione: 'Requisito DM37 — deve essere nel settore corretto', obbligatorio: true, fonte: 'utente', come_ottenere: 'Il tuo diploma. Se smarrito: duplicato dall\'istituto scolastico o Ministero Istruzione.', zipra_lo_fa: false },
      D_ESTRATTO_INPS, D_CASELLARIO,
      scia('impiantisti-elettrici'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_ALBI],
    cosa_gestiamo: 'Tutto — una delle aperture più semplici tra le attività regolamentate',
    cosa_deve_fare_utente: ['Fornire diploma o attestato qualifica'],
    percentuale_automazione: 90,
  },

  {
    id: 'impiantisti_idraulico',
    nome: 'Impiantista idraulico, termoidraulico, gas, riscaldamento',
    nome_breve: 'Idraulico / Termoidraulico',
    nomi_alternativi: ['idraulico', 'termoidraulico', 'caldaie', 'gas', 'riscaldamento', 'condizionamento', 'climatizzazione', 'impianti termici', 'pompe di calore', 'geotermia'],
    categoria: 'artigianato',
    legge_riferimento: 'DM 37/2008 art. 1 c.2 lett. b/c/d/e/g',
    codici_ateco: ['43.22.01', '43.22.02', '43.22.03', '43.22.09'],
    enti_verifica: ['CCIAA — Responsabile Tecnico'],
    requisiti_soggettivi: [
      'Stessi requisiti impiantisti elettrici (DM 37/2008)',
      'Per impianti gas tipo G: abilitazione specifica art. 4 comma 3 DM 37',
    ],
    requisiti_oggettivi: ['Sede operativa'],
    iter: [
      '1. Verifica requisiti DM37 (e tipo G se lavori su gas) → Zipra controlla',
      '2. ComUnica → Zipra invia',
      '3. SCIA al SUAP → Zipra invia',
      '4. Comunicazione RT CCIAA → Zipra invia',
    ],
    documenti: [D_ID, D_CF, { id: 'titolo_studio_id', nome: 'Diploma/qualifica tecnica', descrizione: 'Requisito DM37', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false }, D_ESTRATTO_INPS, scia('impiantisti-idraulici'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_INPS, CH_ALBI],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Fornire diploma o attestato'],
    percentuale_automazione: 90,
  },

  {
    id: 'impiantisti_ascensori',
    nome: 'Impiantista ascensori, montascale, piattaforme elevatrici',
    nome_breve: 'Impiantista ascensori',
    nomi_alternativi: ['ascensori', 'montascale', 'piattaforma elevatrice', 'manutenzione ascensori', 'montacarichi'],
    categoria: 'artigianato',
    legge_riferimento: 'DM 37/2008 + DPR 30 aprile 1999 n.162',
    codici_ateco: ['43.29.01'],
    enti_verifica: ['CCIAA — Responsabile Tecnico'],
    requisiti_soggettivi: [
      'Qualifica tecnica specifica per ascensori (norma UNI EN 81)',
      'Abilitazione DM37 per impianti',
    ],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Verifica qualifica tecnica ascensori + DM37', '2. ComUnica → Zipra', '3. SCIA → Zipra', '4. RT CCIAA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'qualifica_asc', nome: 'Qualifica tecnica ascensori UNI EN 81', descrizione: 'Certificazione specifica', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false }, scia('impiantisti-ascensori'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ALBI],
    cosa_gestiamo: 'ComUnica, SCIA, RT CCIAA',
    cosa_deve_fare_utente: ['Qualifica tecnica ascensori'],
    percentuale_automazione: 85,
  },

  {
    id: 'acconciatori',
    nome: 'Acconciatore / Parrucchiere / Barbiere',
    nome_breve: 'Parrucchiere',
    nomi_alternativi: ['parrucchiere', 'barbiere', 'acconciatore', 'salon', 'salone bellezza', 'hair stylist', 'coiffeur', 'unisex', 'extensions', 'tinte capelli', 'barbershop'],
    categoria: 'artigianato',
    legge_riferimento: 'L. 17 agosto 2005 n.174',
    codici_ateco: ['96.02.01', '96.02.02'],
    enti_verifica: ['CCIAA', 'SUAP Comunale'],
    requisiti_soggettivi: [
      'Qualifica professionale regionale di acconciatore:',
      '  - Corso biennale regionale + esame finale OPPURE',
      '  - Diploma professionale + pratica biennale documentata OPPURE',
      '  - 3 anni esperienza documentata negli ultimi 5 anni',
    ],
    requisiti_oggettivi: [
      'Superfici minime locali (variano per comune/regione — Zipra verifica automaticamente)',
      'Lavatesta obbligatorio in molte regioni',
      'Conformità impianti idrici e elettrici',
      'Servizi igienici riservati ai clienti (molte regioni)',
    ],
    alert: '⚠️ Verifica la superficie minima del TUO comune prima di firmare il contratto del locale — Zipra lo controlla gratis.',
    iter: [
      '1. Hai già la qualifica regionale? → Sì: vai al punto 2. No: corso biennale presso ente accreditato',
      '2. Cerca locale con superficie conforme al tuo comune → Zipra verifica per te',
      '3. Firma contratto locale',
      '4. Conformità impianti da tecnico abilitato',
      '5. ComUnica (P.IVA + CCIAA artigiani + INPS) → Zipra invia',
      '6. SCIA al SUAP → Zipra invia',
      '7. Comunicazione Responsabile Tecnico CCIAA → Zipra invia',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'qualifica_acc', nome: 'Qualifica professionale acconciatore', descrizione: 'Attestato regionale — il requisito più importante', obbligatorio: true, fonte: 'utente', come_ottenere: 'Corso biennale presso ente di formazione accreditato dalla Regione + esame finale.', zipra_lo_fa: false },
      D_CONTRATTO_LOCALE, D_PLANIMETRIA, D_CONF_IMPIANTI,
      D_CASELLARIO,
      scia('acconciatori'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_ALBI],
    varianti_regionali: {
      'Lombardia': 'Minimo 15 mq netti + locale accessori separato',
      'Puglia': 'Minimo 25 mq + lavatesta obbligatorio + antibagno',
      'Campania': 'Minimo 20 mq + servizi igienici separati clienti',
      'Veneto': 'Schema tipo regolamento comunale variabile',
      'Toscana': 'Superfici definite da regolamento comunale',
      'Sicilia': 'Minimo 20 mq + esame presso commissione provinciale',
    },
    cosa_gestiamo: 'Verifica superficie minima, ComUnica, SCIA SUAP, Responsabile Tecnico CCIAA, casellario',
    cosa_deve_fare_utente: ['Qualifica regionale (corso biennale)', 'Trovare locale con superficie idonea', 'Conformità impianti da tecnico'],
    percentuale_automazione: 75,
  },

  {
    id: 'estetisti',
    nome: 'Estetista / Centro estetico / Nail art / Onicotecnica',
    nome_breve: 'Estetista',
    nomi_alternativi: ['estetista', 'centro estetico', 'beauty center', 'nail art', 'onicotecnica', 'massaggiatrice', 'epilazione', 'ceretta', 'trucco semipermanente', 'microblading', 'semipermanente'],
    categoria: 'artigianato',
    legge_riferimento: 'L. 4 gennaio 1990 n.1 + normative regionali',
    codici_ateco: ['96.02.09', '96.04.10', '96.04.20'],
    enti_verifica: ['SUAP Comunale', 'ASL'],
    requisiti_soggettivi: [
      'Qualifica professionale estetista (corso + esame commissione regionale)',
      'Per laser/IPL/radiofrequenza/luce pulsata: autorizzazione ASL aggiuntiva',
    ],
    requisiti_oggettivi: ['Superfici minime per comune (tipicamente 20-50 mq)', 'Antibagno (molte regioni)', 'Verifica ASL igienico-sanitaria'],
    alert: '⚠️ Per laser, IPL o radiofrequenza servono autorizzazioni ASL specifiche aggiuntive.',
    iter: ['1. Qualifica regionale', '2. Verifica superficie e requisiti ASL per il tuo comune → Zipra controlla', '3. ComUnica → Zipra', '4. SCIA SUAP → Zipra', '5. Notifica sanitaria ASL → Zipra dove disponibile digitalmente'],
    documenti: [
      D_ID, D_CF,
      { id: 'qualifica_est', nome: 'Qualifica professionale estetista', descrizione: 'Attestato regionale obbligatorio', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false },
      D_CONTRATTO_LOCALE,
      { id: 'planimetria_est', nome: 'Planimetria con postazioni', descrizione: 'Pianta con indicazione attrezzature estetiche e postazioni', obbligatorio: true, fonte: 'professionista', costo_stimato: '€100-200', zipra_lo_fa: false },
      D_CASELLARIO, scia('estetisti'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_ASL, CH_ALBI],
    varianti_regionali: { 'Puglia': 'Min 20 mq netti + antibagno obbligatorio', 'Lombardia': 'Regolamento specifico per tipo di trattamento estetico', 'Veneto': 'Procedura SUAP regionale unificata' },
    cosa_gestiamo: 'Verifica requisiti comune, ComUnica, SCIA SUAP, notifica ASL dove digitale, casellario',
    cosa_deve_fare_utente: ['Qualifica regionale estetista', 'Locale idoneo con superficie conforme'],
    percentuale_automazione: 78,
  },

  {
    id: 'tatuatori',
    nome: 'Tatuatore / Piercer / Body art',
    nome_breve: 'Tatuatore',
    nomi_alternativi: ['tatuatore', 'tattoo', 'piercing', 'tatuaggi', 'studio tatuaggi', 'body art', 'tattoo artist', 'body modification'],
    categoria: 'artigianato',
    legge_riferimento: 'DM Salute 5/2/1992 + normative regionali (DGR)',
    codici_ateco: ['96.09.09'],
    enti_verifica: ['SUAP Comunale', 'ASL'],
    requisiti_soggettivi: ['Attestato formazione (varia per regione: corso ASL o regionale 40-80h)', 'Conoscenza sterilizzazione, igiene e gestione rischio biologico'],
    requisiti_oggettivi: ['Autoclave per sterilizzazione', 'Locale con autorizzazione sanitaria ASL', 'Servizi igienici dedicati'],
    alert: '⚠️ Normativa MOLTO variabile per regione — alcune richiedono corsi specifici, altre no.',
    iter: ['1. Verifica normativa regionale specifica → Zipra controlla per te', '2. Corso formazione se richiesto dalla tua regione', '3. Richiesta autorizzazione sanitaria ASL', '4. ComUnica + SCIA → Zipra invia'],
    documenti: [
      D_ID, D_CF,
      { id: 'attestato_tat', nome: 'Attestato formazione tatuatori', descrizione: 'Corso regionale o ASL (40-80h)', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false },
      { id: 'aut_asl_tat', nome: 'Autorizzazione sanitaria ASL', descrizione: 'Verifica locale e attrezzature', obbligatorio: true, fonte: 'ente_pubblico', dove: 'ASL della provincia', tempi_stimati: '30-60 giorni', zipra_lo_fa: false },
      scia('tatuatori'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    varianti_regionali: { 'Lombardia': 'DGR specifica — corso abilitante regionale obbligatorio 80h', 'Veneto': 'Corso ASL + autorizzazione sanitaria preventiva', 'Puglia': 'Normativa regionale DGR specifica' },
    cosa_gestiamo: 'Verifica normativa regionale, ComUnica, SCIA — ti assistiamo sulla richiesta ASL',
    cosa_deve_fare_utente: ['Corso di formazione (se richiesto dalla regione)', 'Ottenere autorizzazione ASL'],
    percentuale_automazione: 65,
  },

  {
    id: 'manutenzione_verde',
    nome: 'Cura e manutenzione del verde / Giardiniere professionale',
    nome_breve: 'Giardiniere',
    nomi_alternativi: ['giardiniere', 'giardinaggio', 'manutenzione verde', 'potatura', 'verde pubblico', 'paesaggista', 'arboricoltore', 'florovivaismo'],
    categoria: 'artigianato',
    legge_riferimento: 'L. 14 agosto 2016 n.154',
    codici_ateco: ['81.30.00'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Qualifica professionale (diploma agrario, attestato formazione regionale) OPPURE 3 anni esperienza documentata'],
    requisiti_oggettivi: ['Nessun locale obbligatorio'],
    iter: ['1. ComUnica (P.IVA + CCIAA artigiani + INPS) → Zipra', '2. SCIA verde CCIAA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'qualifica_verde', nome: 'Diploma agrario o attestato formazione', descrizione: 'OPPURE documenta 3 anni esperienza via estratto INPS', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false }, D_ESTRATTO_INPS, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_INPS, CH_ALBI],
    cosa_gestiamo: 'Tutto — estratto INPS per documentare esperienza, ComUnica, SCIA CCIAA',
    cosa_deve_fare_utente: ['Diploma o documentare 3 anni esperienza (Zipra recupera estratto INPS)'],
    percentuale_automazione: 92,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 2 — SOMMINISTRAZIONE ALIMENTI E BEVANDE
  // ═══════════════════════════════════════════════════════

  {
    id: 'bar_ristorante',
    nome: 'Bar / Ristorante / Pizzeria / Somministrazione alimenti e bevande',
    nome_breve: 'Bar / Ristorante',
    nomi_alternativi: ['bar', 'ristorante', 'pizzeria', 'trattoria', 'pub', 'caffetteria', 'gelateria', 'tavola calda', 'fast food', 'rosticceria', 'pasticceria', 'osteria', 'birreria', 'cocktail bar', 'aperitivo', 'trattoria', 'sushi'],
    categoria: 'somministrazione',
    legge_riferimento: 'D.Lgs 59/2010, L. 25 agosto 1991 n.287, DPR 4 aprile 2001 n.227',
    codici_ateco: ['56.10.11', '56.10.12', '56.10.20', '56.10.30', '56.10.41', '56.10.42', '56.21.00', '56.30.00'],
    enti_verifica: ['SUAP Comunale', 'ASL'],
    requisiti_soggettivi: [
      'Attestato SAB (Somministrazione Alimenti e Bevande) — corso 80-120h, €200-400 OPPURE',
      'Diploma istituto alberghiero OPPURE',
      '2 anni esperienza documentata nel settore negli ultimi 5 anni',
    ],
    requisiti_oggettivi: [
      'Verifica piano commerciale comunale (alcune zone sono sature o vietate)',
      'Agibilità del locale',
      'Piano HACCP obbligatorio',
      'CPI (Certificato Prevenzione Incendi) se capienza >50 persone o specifiche superfici',
    ],
    alert: '⚠️ Prima di firmare il contratto del locale: Zipra verifica GRATIS se è possibile aprire un bar/ristorante in quella zona.',
    iter: [
      '1. Indica l\'indirizzo del locale → Zipra verifica piano commerciale comunale',
      '2. Ottieni attestato SAB se non ce l\'hai (2-4 settimane, €200-400)',
      '3. Fai fare il piano HACCP da consulente alimentare',
      '4. Assicurati che il locale abbia agibilità',
      '5. ComUnica (P.IVA + CCIAA + INPS + eventuale INAIL) → Zipra invia',
      '6. Notifica sanitaria ASL (Reg. CE 852/2004) → Zipra invia dove digitale',
      '7. SCIA somministrazione al SUAP → Zipra invia',
      '8. Se CPI obbligatorio: domanda ai VVF → Zipra assiste',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'sab', nome: 'Attestato SAB', descrizione: 'Somministrazione Alimenti e Bevande — obbligatorio', obbligatorio: true, fonte: 'utente', come_ottenere: 'Corso presso Confcommercio, CNA o ente accreditato. Durata: 80-120h. Costo: €200-400.', costo_stimato: '€200-400', tempi_stimati: '2-4 settimane', zipra_lo_fa: false },
      D_HACCP, D_AGIBILITA, D_CONTRATTO_LOCALE,
      { id: 'notifica_asl', nome: 'Notifica sanitaria ASL', descrizione: 'Reg. CE 852/2004 — Zipra la invia dove il portale è digitale', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true },
      scia('somministrazione'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_INAIL, CH_ASL],
    varianti_comunali: 'Il piano commerciale limita nuove aperture in specifiche zone. Varia per comune.',
    varianti_regionali: { 'Sicilia': 'Procedura SUAP tramite portale regionale SUAP Sicilia', 'Toscana': 'Telematizzazione avanzata — integrazione diretta SUAP-ASL' },
    cosa_gestiamo: 'Verifica zona commerciale, ComUnica, notifica ASL, SCIA SUAP, casellario',
    cosa_deve_fare_utente: ['Ottenere attestato SAB', 'Commissionare piano HACCP', 'Verificare agibilità locale'],
    percentuale_automazione: 70,
  },

  {
    id: 'panificio',
    nome: 'Panificio / Forno artigianale / Pastificio / Mulino',
    nome_breve: 'Panificio',
    nomi_alternativi: ['panificio', 'panetteria', 'forno', 'panettiere', 'mulino', 'pastificio', 'pasta fresca', 'pane artigianale'],
    categoria: 'somministrazione',
    legge_riferimento: 'L. 4 luglio 1967 n.580, DM 1 ottobre 1998 n.468',
    codici_ateco: ['10.71.10', '10.71.20', '10.73.00'],
    enti_verifica: ['CCIAA', 'ASL'],
    requisiti_soggettivi: ['Diploma o 2 anni esperienza panificazione'],
    requisiti_oggettivi: ['Locale con impianti specifici panificazione', 'Autorizzazione sanitaria ASL', 'Piano HACCP'],
    iter: ['1. ComUnica → Zipra', '2. SCIA panificio CCIAA → Zipra', '3. Notifica sanitaria ASL → Zipra', '4. Piano HACCP obbligatorio'],
    documenti: [D_ID, D_CF, { id: 'req_pan', nome: 'Diploma panificazione o esperienza', descrizione: 'Requisito professionale', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false }, D_HACCP, { id: 'notifica_asl_pan', nome: 'Notifica sanitaria ASL', descrizione: 'Zipra invia dove digitale', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, scia('panificio'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_INPS, CH_ASL, CH_ALBI],
    cosa_gestiamo: 'ComUnica, SCIA, notifica ASL, Albo Panificatori CCIAA',
    cosa_deve_fare_utente: ['Diploma/esperienza panificazione', 'Piano HACCP'],
    percentuale_automazione: 72,
  },

  {
    id: 'macelleria',
    nome: 'Macelleria / Norcineria / Salumeria',
    nome_breve: 'Macelleria',
    nomi_alternativi: ['macelleria', 'macellaio', 'norcineria', 'salumeria', 'carni', 'polleria', 'macelleria equina'],
    categoria: 'commercio',
    legge_riferimento: 'D.Lgs 6 novembre 2007 n.193, Reg. CE 852/2004, Reg. CE 853/2004',
    codici_ateco: ['47.22.00'],
    enti_verifica: ['ASL', 'SUAP'],
    requisiti_soggettivi: ['Nessun requisito professionale specifico (abrogato)', 'Registrazione sanitaria ASL obbligatoria'],
    requisiti_oggettivi: ['Celle frigorifere', 'Superfici lavabili', 'Piano HACCP carni specifico'],
    iter: ['1. ComUnica → Zipra', '2. Registrazione sanitaria ASL (Reg. CE 853/2004) → Zipra dove digitale', '3. SCIA SUAP → Zipra', '4. Piano HACCP carni'],
    documenti: [D_ID, D_CF, { id: 'haccp_mac', nome: 'Piano HACCP carni', descrizione: 'Piano specifico per prodotti carnei', obbligatorio: true, fonte: 'professionista', costo_stimato: '€400-800', zipra_lo_fa: false }, { id: 'registrazione_asl_mac', nome: 'Registrazione sanitaria ASL', descrizione: 'Zipra compila e invia dove disponibile digitalmente', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, scia('macelleria'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'Registrazione ASL, ComUnica, SCIA',
    cosa_deve_fare_utente: ['Locale con celle frigorifere idonee', 'Piano HACCP specifico carni'],
    percentuale_automazione: 68,
  },

  {
    id: 'pescheria',
    nome: 'Pescheria / Vendita prodotti ittici',
    nome_breve: 'Pescheria',
    nomi_alternativi: ['pescheria', 'pescivendolo', 'pesce fresco', 'frutti di mare', 'itticoltura', 'prodotti ittici'],
    categoria: 'commercio',
    legge_riferimento: 'Reg. CE 852/2004, Reg. CE 853/2004',
    codici_ateco: ['47.23.00'],
    enti_verifica: ['ASL', 'SUAP'],
    requisiti_soggettivi: ['Registrazione sanitaria ASL'],
    requisiti_oggettivi: ['Celle refrigerate', 'Piano HACCP prodotti ittici'],
    iter: ['1. ComUnica → Zipra', '2. Registrazione/notifica ASL → Zipra', '3. SCIA SUAP → Zipra', '4. Piano HACCP ittici'],
    documenti: [D_ID, D_CF, { id: 'haccp_pesce', nome: 'Piano HACCP prodotti ittici', obbligatorio: true, fonte: 'professionista', descrizione: 'Specifico per prodotti ittici freschi e surgelati', costo_stimato: '€400-600', zipra_lo_fa: false }, { id: 'registrazione_asl_pesc', nome: 'Registrazione sanitaria ASL', descrizione: 'Zipra compila e invia dove disponibile', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, scia('pescheria'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'Registrazione ASL, ComUnica, SCIA',
    cosa_deve_fare_utente: ['Locale con celle refrigerate', 'Piano HACCP ittici'],
    percentuale_automazione: 68,
  },

  {
    id: 'gastronomia_rosticceria',
    nome: 'Gastronomia / Rosticceria / Laboratorio artigianale alimentare',
    nome_breve: 'Gastronomia',
    nomi_alternativi: ['gastronomia', 'rosticceria', 'laboratorio alimentare', 'laboratorio gastronomico', 'catering', 'cucina', 'produzione alimentare'],
    categoria: 'somministrazione',
    legge_riferimento: 'D.Lgs 59/2010, Reg. CE 852/2004',
    codici_ateco: ['10.85.09', '56.10.42', '56.21.00'],
    enti_verifica: ['ASL', 'SUAP'],
    requisiti_soggettivi: ['SAB o diploma alberghiero o esperienza per vendita al pubblico', 'Nessun requisito per laboratorio produzione'],
    requisiti_oggettivi: ['Locale con requisiti igienico-sanitari', 'Piano HACCP', 'Notifica sanitaria ASL'],
    iter: ['1. ComUnica → Zipra', '2. Notifica sanitaria ASL → Zipra', '3. SCIA SUAP → Zipra', '4. Piano HACCP'],
    documenti: [D_ID, D_CF, D_HACCP, { id: 'notifica_asl_gast', nome: 'Notifica sanitaria ASL', descrizione: 'Zipra la invia dove digitale', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, scia('gastronomia'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'ComUnica, notifica ASL, SCIA',
    cosa_deve_fare_utente: ['Piano HACCP', 'SAB (se vendita diretta al pubblico)'],
    percentuale_automazione: 70,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 3 — COMMERCIO
  // ═══════════════════════════════════════════════════════

  {
    id: 'commercio_dettaglio',
    nome: 'Commercio al dettaglio — negozio',
    nome_breve: 'Negozio',
    nomi_alternativi: ['negozio', 'boutique', 'shop', 'punto vendita', 'esercizio commerciale', 'abbigliamento', 'scarpe', 'accessori', 'elettronica', 'giocattoli', 'sport', 'libri'],
    categoria: 'commercio',
    legge_riferimento: 'D.Lgs 31 marzo 1998 n.114 + normative regionali commercio',
    codici_ateco: ['47.11', '47.19', '47.51', '47.59', '47.71', '47.72', '47.74', '47.75', '47.76', '47.77', '47.78', '47.79'],
    enti_verifica: ['SUAP Comunale'],
    requisiti_soggettivi: ['Nessun requisito professionale per commercio generico', 'Requisiti speciali solo per settori particolari (armi, farmaci, oggetti preziosi)'],
    requisiti_oggettivi: ['Verifica zona commerciale comunale', 'Agibilità locale'],
    iter: ['1. Verifica zona commerciale → Zipra', '2. ComUnica → Zipra', '3. Comunicazione apertura SUAP → Zipra'],
    documenti: [D_ID, D_CF, D_CONTRATTO_LOCALE, { id: 'scia_comm', nome: 'Comunicazione apertura + ComUnica', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Pratiche complete apertura negozio', zipra_lo_fa: true }],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Fornire dati impresa e indirizzo locale'],
    percentuale_automazione: 95,
  },

  {
    id: 'commercio_ingrosso',
    nome: 'Commercio all\'ingrosso',
    nome_breve: 'Grossista',
    nomi_alternativi: ['ingrosso', 'grossista', 'distributore', 'import export', 'commercio B2B'],
    categoria: 'commercio',
    legge_riferimento: 'D.Lgs 31 marzo 1998 n.114, D.Lgs 59/2010',
    codici_ateco: ['46.11', '46.12', '46.13', '46.14', '46.15', '46.16', '46.17', '46.18', '46.19', '46.2X', '46.3X', '46.4X', '46.5X', '46.6X', '46.7X', '46.9X'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Requisiti morali'],
    requisiti_oggettivi: ['Magazzino idoneo'],
    iter: ['1. ComUnica → Zipra', '2. SCIA commercio ingrosso CCIAA → Zipra'],
    documenti: [D_ID, D_CF, scia('ingrosso'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Solo dati impresa'],
    percentuale_automazione: 97,
  },

  {
    id: 'tabaccheria',
    nome: 'Tabaccheria / Rivendita tabacchi e sali',
    nome_breve: 'Tabaccheria',
    nomi_alternativi: ['tabaccheria', 'tabacchi', 'rivendita tabacchi', 'sali e tabacchi', 'sigarette', 'gratta e vinci'],
    categoria: 'commercio',
    legge_riferimento: 'L. 22 dicembre 1957 n.1293, L. 3 gennaio 1981 n.6',
    codici_ateco: ['47.26.00'],
    enti_verifica: ['ADM — Agenzia Dogane e Monopoli'],
    requisiti_soggettivi: ['Concessione governativa ADM tramite bando pubblico', 'Distanza minima da altre rivendite'],
    requisiti_oggettivi: ['Locale secondo parametri ADM'],
    alert: '⚠️ La concessione ADM si ottiene solo tramite bando pubblico — non si può aprire senza.',
    iter: ['1. Zipra monitora i bandi ADM per la tua città automaticamente', '2. Esce un bando → Zipra prepara tutta la domanda', '3. Assegnazione concessione → ComUnica + SCIA → Zipra', '4. Oppure: acquistare rivendita esistente da cedente → Zipra gestisce il subingresso'],
    documenti: [D_ID, D_CF, { id: 'domanda_adm', nome: 'Domanda bando ADM', descrizione: 'Zipra prepara e invia tutta la domanda per il bando concessione tabacchi', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, { ente: 'ADM', nome_canale: 'Portale ADM — Area Rivendite', url: 'https://www.adm.gov.it/portale/tabacchi', cosa_fa_zipra: 'Monitora bandi nuove concessioni, prepara e invia domanda partecipazione, gestisce iter post-assegnazione.', dati_necessari: ['CF', 'Residenza', 'Dati locali candidati'], automatico: true }],
    cosa_gestiamo: 'Monitoraggio bandi ADM, preparazione domanda, subingresso, apertura impresa post-assegnazione',
    cosa_deve_fare_utente: ['Indicarci la città/zona di interesse', 'Firmare la domanda bando', 'Attendere l\'esito del bando ADM'],
    percentuale_automazione: 80,
  },

  {
    id: 'edicola_giornali',
    nome: 'Edicola / Vendita giornali e riviste',
    nome_breve: 'Edicola',
    nomi_alternativi: ['edicola', 'giornalaio', 'vendita giornali', 'rivendita giornali', 'riviste', 'fumetti'],
    categoria: 'commercio',
    legge_riferimento: 'L. 5 agosto 1981 n.416, L. 13 aprile 1999 n.108',
    codici_ateco: ['47.62.00'],
    enti_verifica: ['Comune', 'SUAP'],
    requisiti_soggettivi: ['Bando comunale per postazione fissa OPPURE commercio al dettaglio per punti vendita in negozio'],
    requisiti_oggettivi: ['Postazione/chiosco secondo bando comunale'],
    alert: '⚠️ Le postazioni edicola sono assegnate tramite bando comunale.',
    iter: ['1. Verifica bandi aperti nel tuo comune → Zipra monitora', '2. Domanda bando → Zipra prepara', '3. ComUnica + SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'domanda_edicola', nome: 'Domanda bando comunale edicola', descrizione: 'Zipra prepara la domanda', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'Monitoraggio bandi, domanda, apertura impresa',
    cosa_deve_fare_utente: ['Indicarci il comune di interesse'],
    percentuale_automazione: 82,
  },

  {
    id: 'noleggio_veicoli',
    nome: 'Noleggio veicoli senza conducente / Rent a car',
    nome_breve: 'Noleggio auto',
    nomi_alternativi: ['noleggio auto', 'rent a car', 'noleggio furgoni', 'noleggio veicoli', 'car rental', 'noleggio moto', 'noleggio bici', 'bike sharing'],
    categoria: 'commercio',
    legge_riferimento: 'D.Lgs 285/1992 (CdS) art. 84-85, normative regionali',
    codici_ateco: ['77.11.00', '77.12.00', '77.21.09'],
    enti_verifica: ['Comune', 'SUAP'],
    requisiti_soggettivi: ['Nessun requisito professionale specifico'],
    requisiti_oggettivi: ['Rimessa per i veicoli', 'Assicurazioni adeguate'],
    iter: ['1. ComUnica → Zipra', '2. SCIA SUAP → Zipra', '3. Eventuale autorizzazione comunale'],
    documenti: [D_ID, D_CF, scia('noleggio-veicoli'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Solo dati impresa e rimessa'],
    percentuale_automazione: 95,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 4 — TRASPORTO
  // ═══════════════════════════════════════════════════════

  {
    id: 'taxi',
    nome: 'Tassista / Servizio taxi',
    nome_breve: 'Tassista',
    nomi_alternativi: ['taxi', 'tassista', 'servizio taxi', 'cab', 'radiotaxi'],
    categoria: 'trasporto',
    legge_riferimento: 'L. 15 gennaio 1992 n.21',
    codici_ateco: ['49.32.10'],
    enti_verifica: ['Provincia / Regione — Ruolo Conducenti', 'CCIAA', 'Comune — licenza taxi'],
    requisiti_soggettivi: [
      'Patente di guida tipo B da almeno 3 anni',
      'CAP-KB (Certificato Abilitazione Professionale) OPPURE CQC trasporto persone',
      'Superamento esame idoneità commissione provinciale (2 sessioni/anno)',
      'Iscrizione Ruolo Conducenti CCIAA (dopo esame)',
      'Licenza taxi rilasciata dal Comune (bando pubblico o acquisto da cedente)',
      'Certificato medico idoneità psicofisica',
      'Casellario giudiziale pulito',
    ],
    requisiti_oggettivi: ['Veicolo omologato per servizio taxi', 'Tassametro certificato e tarato', 'Assicurazione RC speciale NCC/taxi'],
    alert: '⚠️ Il percorso completo per ottenere la licenza taxi può richiedere 6-18 mesi.',
    iter: [
      '1. Apertura ditta individuale + P.IVA → Zipra invia ComUnica (PRIMO passo obbligatorio)',
      '2. Ottenere CAP-KB (esame Motorizzazione Civile) se non hai CQC persone',
      '3. Fare il certificato medico psicofisico (medico di base, €20-50)',
      '4. Zipra raccoglie casellario giudiziale automaticamente',
      '5. Domanda iscrizione esame Ruolo Conducenti CCIAA → Zipra prepara e invia',
      '6. Studiare e superare l\'esame CCIAA (materie: L.21/1992, toponomastica locale, diritto trasporti, sicurezza)',
      '7. Iscrizione Ruolo Conducenti post-esame → Zipra invia',
      '8. Monitoraggio bandi licenza taxi nel tuo comune → Zipra monitora automaticamente',
      '9. SCIA SUAP per avvio servizio → Zipra invia',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'patente_b', nome: 'Patente di guida B (almeno 3 anni)', descrizione: 'Copia fronte/retro', obbligatorio: true, fonte: 'utente', zipra_lo_fa: false },
      { id: 'cap_kb', nome: 'CAP-KB o CQC persone', descrizione: 'Esame Motorizzazione Civile per trasporto persone', obbligatorio: true, fonte: 'utente', come_ottenere: 'Esame teorico + pratico presso Motorizzazione Civile. Prepararsi su portale MIT o guide specializzate.', zipra_lo_fa: false },
      D_CASELLARIO,
      { id: 'cert_medico_taxi', nome: 'Certificato medico psicofisico', descrizione: 'Dal medico di base o centro medico abilitato', obbligatorio: true, fonte: 'utente', costo_stimato: '€20-50', zipra_lo_fa: false },
      { id: 'domanda_esame_taxi', nome: 'Domanda iscrizione esame Ruolo Conducenti CCIAA', descrizione: 'Zipra compila e invia la domanda con tutti gli allegati', obbligatorio: true, fonte: 'zipra_genera', zipra_lo_fa: true },
      D_COMUNICA,
    ],
    comunicazioni_enti: [
      CH_COMUNICA, CH_SUAP, CH_GIUSTIZIA,
      { ente: 'CCIAA — Ruolo Conducenti', nome_canale: 'Telemaco / Sportello CCIAA', url: 'https://webtelemaco.infocamere.it', cosa_fa_zipra: 'Domanda iscrizione esame, invio documentazione, iscrizione Ruolo Conducenti dopo esame superato.', dati_necessari: ['CF', 'Patente', 'CAP-KB', 'Casellario', 'Certificato medico'], automatico: true },
      { ente: 'Comune — Licenza taxi', nome_canale: 'SUAP / Portale comunale', url: 'https://www.impresainungiorno.gov.it', cosa_fa_zipra: 'Monitoraggio bandi licenza taxi, preparazione e invio domanda bando, subingresso da cedente.', dati_necessari: ['Dati impresa', 'Iscrizione Ruolo Conducenti'], automatico: true },
    ],
    varianti_regionali: { 'Campania': 'Esame gestito dalla Regione Campania tramite portale dedicato', 'Toscana': 'Ruolo conducenti regionale (RENT) — procedura specifica', 'Puglia': 'Procedure provinciali differenziate' },
    cosa_gestiamo: 'ComUnica, casellario, domanda esame CCIAA, iscrizione Ruolo, SCIA, monitoraggio bandi licenza',
    cosa_deve_fare_utente: ['Patente B (3+ anni)', 'CAP-KB o CQC persone (esame Motorizzazione)', 'Certificato medico psicofisico', 'Studiare e superare esame CCIAA'],
    percentuale_automazione: 65,
  },

  {
    id: 'ncc',
    nome: 'NCC — Noleggio con Conducente',
    nome_breve: 'NCC',
    nomi_alternativi: ['NCC', 'noleggio con conducente', 'autista privato', 'transfer', 'limousine', 'auto con conducente'],
    categoria: 'trasporto',
    legge_riferimento: 'L. 15 gennaio 1992 n.21 — art. 3',
    codici_ateco: ['49.32.20'],
    enti_verifica: ['Provincia — Ruolo Conducenti', 'Comune — autorizzazione NCC'],
    requisiti_soggettivi: ['Stessi del taxi per esame e CAP-KB/CQC', 'Autorizzazione NCC dal Comune (più facile della licenza taxi)'],
    requisiti_oggettivi: ['Rimessa per i veicoli (obbligatoria)'],
    iter: ['1. ComUnica → Zipra', '2. CAP-KB/CQC persone', '3. Esame Ruolo Conducenti CCIAA → Zipra prepara documenti', '4. Richiesta autorizzazione NCC al Comune → Zipra'],
    documenti: [
      D_ID, D_CF,
      { id: 'patente_ncc', nome: 'Patente B (almeno 3 anni)', obbligatorio: true, fonte: 'utente', descrizione: 'Copia fronte/retro', zipra_lo_fa: false },
      { id: 'cap_kb_ncc', nome: 'CAP-KB o CQC persone', obbligatorio: true, fonte: 'utente', descrizione: 'Esame Motorizzazione', zipra_lo_fa: false },
      D_CASELLARIO,
      { id: 'cert_med_ncc', nome: 'Certificato medico psicofisico', obbligatorio: true, fonte: 'utente', descrizione: 'Medico di base', costo_stimato: '€20-50', zipra_lo_fa: false },
      { id: 'domanda_ncc', nome: 'Domanda autorizzazione NCC + esame CCIAA + ComUnica', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Tutte le pratiche in un pacchetto', zipra_lo_fa: true },
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_GIUSTIZIA],
    cosa_gestiamo: 'Come taxi — tutto tranne CAP-KB, esame CCIAA e certificato medico',
    cosa_deve_fare_utente: ['CAP-KB/CQC persone', 'Certificato medico', 'Esame CCIAA'],
    percentuale_automazione: 68,
  },

  {
    id: 'autoscuola',
    nome: 'Autoscuola / Scuola guida',
    nome_breve: 'Autoscuola',
    nomi_alternativi: ['autoscuola', 'scuola guida', 'istruttore guida', 'corso patente'],
    categoria: 'formazione',
    legge_riferimento: 'D.Lgs 285/1992 (CdS), DM 17 maggio 1995 n.317',
    codici_ateco: ['85.53.00'],
    enti_verifica: ['MIT — Ministero Infrastrutture e Trasporti', 'Motorizzazione Civile'],
    requisiti_soggettivi: ['Abilitazione istruttore guida (esame Motorizzazione)', 'Autorizzazione MIT'],
    requisiti_oggettivi: ['Aula didattica', 'Veicoli scuola guida omologati', 'Simulatori se previsti dalla norma'],
    iter: ['1. Autorizzazione MIT', '2. ComUnica → Zipra', '3. SCIA comunale → Zipra'],
    documenti: [D_ID, D_CF, { id: 'aut_mit_autoscuola', nome: 'Autorizzazione MIT', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Ministero Infrastrutture e Trasporti', dove: 'MIT / Motorizzazione Civile', tempi_stimati: '60-120 giorni', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'ComUnica e SCIA — ti guidiamo sull\'iter MIT/Motorizzazione',
    cosa_deve_fare_utente: ['Autorizzazione MIT', 'Abilitazione istruttore'],
    percentuale_automazione: 55,
  },

  {
    id: 'trasporto_merci',
    nome: 'Trasporto merci su strada / Autotrasportatore',
    nome_breve: 'Autotrasportatore',
    nomi_alternativi: ['autotrasportatore', 'trasporto merci', 'camionista', 'spedizioni', 'logistica', 'corriere espresso'],
    categoria: 'trasporto',
    legge_riferimento: 'D.Lgs 21 novembre 2005 n.286, Reg. CE 1071/2009',
    codici_ateco: ['49.41.00', '49.42.00'],
    enti_verifica: ['MIT — Albo Autotrasportatori', 'CCIAA'],
    requisiti_soggettivi: ['Iscrizione Albo Nazionale Autotrasportatori (MIT)', 'CQC (Certificato di Qualificazione del Conducente) per veicoli >3.5t', 'Capacità professionale: attestato esame MIT OPPURE 10 anni esperienza imprenditoriale'],
    requisiti_oggettivi: ['Sede operativa', 'Veicoli a norma', 'Assicurazioni specifiche'],
    iter: ['1. Iscrizione Albo Autotrasportatori MIT', '2. ComUnica + Albo → Zipra'],
    documenti: [
      D_ID, D_CF,
      { id: 'cqc', nome: 'CQC — Certificato Qualificazione Conducente', obbligatorio: true, fonte: 'utente', descrizione: 'Per veicoli >3.5 tonnellate', zipra_lo_fa: false },
      { id: 'attestato_mit_tras', nome: 'Attestato capacità professionale MIT', obbligatorio: true, fonte: 'utente', descrizione: 'Esame MIT o 10 anni esperienza', zipra_lo_fa: false },
      { id: 'iscrizione_albo_tras', nome: 'Domanda iscrizione Albo Autotrasportatori + ComUnica', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Zipra invia tutto', zipra_lo_fa: true },
    ],
    comunicazioni_enti: [CH_COMUNICA, { ente: 'MIT — Albo Autotrasportatori', nome_canale: 'Portale MIT Albo Autotrasportatori', url: 'https://www.mit.gov.it/alboautotrasporto', cosa_fa_zipra: 'Domanda iscrizione Albo nazionale, variazioni, rinnovi.', dati_necessari: ['CF', 'Dati impresa', 'CQC', 'Capacità professionale'], automatico: true }],
    cosa_gestiamo: 'Iscrizione Albo MIT, ComUnica',
    cosa_deve_fare_utente: ['CQC per veicoli pesanti', 'Attestato capacità professionale MIT'],
    percentuale_automazione: 72,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 5 — SERVIZI E LOGISTICA
  // ═══════════════════════════════════════════════════════

  {
    id: 'pulizie',
    nome: 'Impresa di pulizie, disinfezione, disinfestazione, derattizzazione, sanificazione',
    nome_breve: 'Impresa pulizie',
    nomi_alternativi: ['pulizie', 'impresa pulizie', 'pulizie industriali', 'sanificazione', 'disinfestazione', 'derattizzazione', 'cleaning', 'pulizie uffici', 'pulizie condominiali', 'pulizie civili'],
    categoria: 'servizi',
    legge_riferimento: 'L. 25 gennaio 1994 n.82, DM 7 luglio 1997 n.274',
    codici_ateco: ['81.21.00', '81.22.02', '81.29.10', '81.29.20', '81.29.91', '81.29.99'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Requisiti morali e onorabilità', 'Nessun requisito professionale specifico (semplificato dal 2007, L.40/2007)'],
    requisiti_oggettivi: ['Classificazione fasce in base al volume d\'affari (automatica CCIAA)'],
    iter: ['1. ComUnica (P.IVA + CCIAA + INPS) → Zipra invia', '2. SCIA impresa pulizie CCIAA → Zipra invia', '3. Classificazione fascia fatturato → automatica'],
    documenti: [D_ID, D_CF, D_CASELLARIO, scia('pulizie'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI, CH_INPS],
    cosa_gestiamo: 'Tutto — una delle aperture più veloci e semplici in assoluto',
    cosa_deve_fare_utente: ['Solo dati anagrafici e dati impresa'],
    percentuale_automazione: 97,
  },

  {
    id: 'facchinaggio',
    nome: 'Impresa di facchinaggio, logistica e movimentazione merci',
    nome_breve: 'Facchinaggio',
    nomi_alternativi: ['facchinaggio', 'logistica', 'magazzinaggio', 'traslochi', 'movimentazione merci', 'facchini', 'deposito e stoccaggio'],
    categoria: 'logistica',
    legge_riferimento: 'DM 30 giugno 2003 n.221',
    codici_ateco: ['52.24.00', '52.29.09'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Requisiti morali', 'Nessun requisito professionale dal 2007'],
    requisiti_oggettivi: ['Classificazione fasce fatturato'],
    iter: ['1. ComUnica → Zipra', '2. SCIA facchinaggio CCIAA → Zipra'],
    documenti: [D_ID, D_CF, D_CASELLARIO, scia('facchinaggio'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI, CH_INPS],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Solo dati anagrafici'],
    percentuale_automazione: 97,
  },

  {
    id: 'spedizionieri',
    nome: 'Spedizioniere / Freight forwarder',
    nome_breve: 'Spedizioniere',
    nomi_alternativi: ['spedizioniere', 'agenzia spedizioni', 'freight forwarder', 'doganalista', 'sdoganamento', 'import export', 'customs broker'],
    categoria: 'logistica',
    legge_riferimento: 'L. 14 novembre 1941 n.1442 (parz. modificata D.Lgs 59/2010)',
    codici_ateco: ['52.29.01'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Diploma + 2 anni esperienza nel settore OPPURE 5 anni esperienza documentata come dipendente'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. ComUnica → Zipra', '2. SCIA spedizionieri CCIAA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'diploma_sped', nome: 'Diploma + esperienza o esperienza quinquennale', obbligatorio: true, fonte: 'utente', descrizione: 'Requisiti professionali', zipra_lo_fa: false }, D_ESTRATTO_INPS, scia('spedizionieri'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI, CH_INPS],
    cosa_gestiamo: 'ComUnica, SCIA, estratto INPS per documentare esperienza',
    cosa_deve_fare_utente: ['Diploma e documentazione esperienza (Zipra recupera estratto INPS)'],
    percentuale_automazione: 88,
  },

  {
    id: 'mediatore_marittimo',
    nome: 'Mediatore marittimo / Raccomandatario marittimo',
    nome_breve: 'Mediatore marittimo',
    nomi_alternativi: ['mediatore marittimo', 'broker marittimo', 'ship agent', 'raccomandatario marittimo', 'agente marittimo', 'ship broker'],
    categoria: 'logistica',
    legge_riferimento: 'L. 12 marzo 1968 n.478 (mediatori), L. 4 aprile 1977 n.135 (raccomandatari)',
    codici_ateco: ['52.29.09'],
    enti_verifica: ['CCIAA — Ruolo Mediatori Marittimi', 'Capitaneria di Porto (raccomandatari)'],
    requisiti_soggettivi: ['Esame CCIAA per mediatore marittimo + iscrizione Ruolo', 'Per raccomandatari: iscrizione elenco Capitaneria di Porto + fideiussione'],
    requisiti_oggettivi: ['Sede operativa in zona portuale o costiera'],
    iter: ['1. Superare esame CCIAA mediatori marittimi', '2. ComUnica + iscrizione Ruolo → Zipra'],
    documenti: [D_ID, D_CF, { id: 'esame_mm', nome: 'Superamento esame CCIAA mediatori marittimi', obbligatorio: true, fonte: 'utente', descrizione: 'Abilitazione professionale', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI],
    cosa_gestiamo: 'Domanda esame, iscrizione Ruolo, ComUnica',
    cosa_deve_fare_utente: ['Superare esame CCIAA'],
    percentuale_automazione: 75,
  },

  {
    id: 'mediatore_diporto',
    nome: 'Mediatore del diporto / Broker nautico',
    nome_breve: 'Mediatore nautico',
    nomi_alternativi: ['mediatore diporto', 'broker nautico', 'vendita barche', 'compravendita imbarcazioni', 'yacht broker'],
    categoria: 'servizi',
    legge_riferimento: 'D.Lgs 18 luglio 2005 n.171 (Codice della Nautica)',
    codici_ateco: ['52.29.09'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: ['Iscrizione Registro Mediatori del Diporto CCIAA (esame abilitante)'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Esame abilitante CCIAA', '2. ComUnica + iscrizione Registro → Zipra'],
    documenti: [D_ID, D_CF, { id: 'esame_diporto', nome: 'Esame abilitante mediatore diporto', obbligatorio: true, fonte: 'utente', descrizione: 'CCIAA', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI],
    cosa_gestiamo: 'Domanda esame, iscrizione Registro, ComUnica',
    cosa_deve_fare_utente: ['Superare esame CCIAA'],
    percentuale_automazione: 78,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 6 — MEDIAZIONE E AGENTI
  // ═══════════════════════════════════════════════════════

  {
    id: 'agente_immobiliare',
    nome: 'Agente immobiliare / Mediatore immobiliare / Agenzia immobiliare',
    nome_breve: 'Agente immobiliare',
    nomi_alternativi: ['agente immobiliare', 'agenzia immobiliare', 'mediatore immobiliare', 'real estate', 'affitti', 'compravendita immobili', 'property manager', 'property finder'],
    categoria: 'servizi',
    legge_riferimento: 'L. 3 febbraio 1989 n.39, D.Lgs 26 marzo 2010 n.59',
    codici_ateco: ['68.31.00'],
    enti_verifica: ['CCIAA — Ruolo Agenti di Affari in Mediazione'],
    requisiti_soggettivi: [
      'Iscrizione Ruolo Agenti di Affari in Mediazione CCIAA previo:',
      '  - Corso abilitante 80-120h + esame teorico-pratico CCIAA OPPURE',
      '  - Diploma istituto tecnico indirizzo commerciale + 1 anno esperienza OPPURE',
      '  - Laurea in materie giuridico-economiche',
      'Polizza RC professionale obbligatoria (min. €500.000 massimale)',
    ],
    requisiti_oggettivi: ['Sede operativa'],
    alert: '⚠️ Esercitare l\'attività di mediazione senza iscrizione al Ruolo CCIAA è REATO PENALE.',
    iter: [
      '1. Cerca e frequenta corso abilitante (80-120h, €500-1.500) → Zipra ti trova i corsi abilitati vicino a te',
      '2. Domanda iscrizione esame CCIAA → Zipra prepara e invia tutta la documentazione',
      '3. Supera l\'esame CCIAA (teoria + pratica)',
      '4. Sottoscrivi polizza RC professionale',
      '5. ComUnica (P.IVA + CCIAA + INPS) → Zipra invia',
      '6. Iscrizione Ruolo Agenti Mediazione CCIAA → Zipra invia',
      '7. SCIA al SUAP → Zipra invia',
    ],
    documenti: [
      D_ID, D_CF,
      { id: 'attestato_med_imm', nome: 'Attestato corso abilitante mediatori', obbligatorio: true, fonte: 'utente', descrizione: 'Corso 80-120h presso ente accreditato dalla CCIAA', costo_stimato: '€500-1.500', tempi_stimati: '1-3 mesi', zipra_lo_fa: false },
      { id: 'polizza_rc_imm', nome: 'Polizza RC professionale', obbligatorio: true, fonte: 'utente', descrizione: 'Minimo €500.000 massimale — obbligatoria per legge', costo_stimato: '€300-800/anno', zipra_lo_fa: false },
      D_CASELLARIO,
      { id: 'domanda_esame_ruolo', nome: 'Domanda esame + iscrizione Ruolo + ComUnica + SCIA', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Tutte le pratiche burocratiche in un pacchetto', zipra_lo_fa: true },
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ADE, CH_INPS, CH_GIUSTIZIA, CH_ALBI],
    cosa_gestiamo: 'Trova corso abilitante, domanda esame CCIAA, iscrizione Ruolo, ComUnica, SCIA, casellario',
    cosa_deve_fare_utente: ['Frequentare e superare il corso abilitante (80-120h)', 'Superare l\'esame CCIAA', 'Sottoscrivere polizza RC professionale'],
    percentuale_automazione: 72,
  },

  {
    id: 'agente_commercio',
    nome: 'Agente e rappresentante di commercio',
    nome_breve: 'Agente di commercio',
    nomi_alternativi: ['agente di commercio', 'rappresentante', 'plurimandatario', 'monomandatario', 'procacciatore d\'affari', 'agente vendite'],
    categoria: 'servizi',
    legge_riferimento: 'L. 12 marzo 1985 n.204, D.Lgs 59/2010',
    codici_ateco: ['46.19.01', '46.19.09'],
    enti_verifica: ['CCIAA'],
    requisiti_soggettivi: [
      'Diploma scuola secondaria superiore + 2 anni esperienza documentata OPPURE',
      'Qualsiasi laurea + 1 anno esperienza OPPURE',
      '4 anni esperienza come dipendente in azienda commerciale',
      'Requisiti morali (no condanne specifiche)',
    ],
    requisiti_oggettivi: ['Nessun locale obbligatorio'],
    iter: ['1. ComUnica → Zipra invia', '2. SCIA agente commercio CCIAA → Zipra invia'],
    documenti: [D_ID, D_CF, { id: 'diploma_agente', nome: 'Diploma + documentazione esperienza', obbligatorio: true, fonte: 'utente', descrizione: 'Requisiti professionali', zipra_lo_fa: false }, D_ESTRATTO_INPS, D_CASELLARIO, scia('agenti-commercio'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI, CH_INPS, CH_GIUSTIZIA],
    cosa_gestiamo: 'Tutto — estratto INPS per esperienza, casellario, ComUnica, SCIA',
    cosa_deve_fare_utente: ['Diploma (Zipra recupera estratto INPS per documentare esperienza)'],
    percentuale_automazione: 90,
  },

  {
    id: 'mediatore_creditizio',
    nome: 'Mediatore creditizio / Agente in attività finanziaria',
    nome_breve: 'Mediatore creditizio',
    nomi_alternativi: ['mediatore creditizio', 'agente finanziario', 'broker mutui', 'consulente mutui', 'agente in attività finanziaria', 'intermediario finanziario'],
    categoria: 'servizi',
    legge_riferimento: 'D.Lgs 13 agosto 2010 n.141 + Regolamento OAM',
    codici_ateco: ['66.19.40'],
    enti_verifica: ['OAM — Organismo Agenti e Mediatori'],
    requisiti_soggettivi: ['Iscrizione OAM (esame + formazione continua)', 'Polizza RC professionale obbligatoria'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Esame OAM e iscrizione registro (organismo-am.it)', '2. Polizza RC', '3. ComUnica → Zipra'],
    documenti: [D_ID, D_CF, { id: 'iscrizione_oam', nome: 'Iscrizione OAM', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'organismo-am.it — esame + iscrizione', dove: 'https://www.organismo-am.it', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, { ente: 'OAM', nome_canale: 'organismo-am.it', url: 'https://www.organismo-am.it', cosa_fa_zipra: 'Assistenza alla registrazione e all\'iscrizione al registro OAM.', dati_necessari: ['CF', 'Esame superato'], automatico: false }],
    cosa_gestiamo: 'ComUnica — ti guidiamo passo per passo sul percorso OAM',
    cosa_deve_fare_utente: ['Superare esame OAM', 'Iscriversi al registro OAM', 'Polizza RC'],
    percentuale_automazione: 55,
  },

  {
    id: 'agente_assicurativo',
    nome: 'Agente assicurativo / Broker assicurativo',
    nome_breve: 'Agente assicurativo',
    nomi_alternativi: ['agente assicurativo', 'assicurazioni', 'broker assicurativo', 'consulente assicurativo', 'agente assicurazioni'],
    categoria: 'servizi',
    legge_riferimento: 'D.Lgs 7 settembre 2005 n.209 (Codice Assicurazioni), Regolamento IVASS',
    codici_ateco: ['66.22.00', '66.29.09'],
    enti_verifica: ['IVASS — Registro Unico Intermediari Assicurativi (RUI)'],
    requisiti_soggettivi: ['Iscrizione RUI-IVASS (esame + requisiti professionali)', 'Polizza RC professionale obbligatoria'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Esame abilitante + iscrizione RUI (ivass.it)', '2. ComUnica → Zipra'],
    documenti: [D_ID, D_CF, { id: 'iscrizione_rui', nome: 'Iscrizione RUI — IVASS', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'ivass.it — Registro Unico Intermediari', dove: 'https://www.ivass.it', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, { ente: 'IVASS', nome_canale: 'Portale IVASS — ivass.it', url: 'https://www.ivass.it', cosa_fa_zipra: 'Assistenza alla domanda di iscrizione RUI.', dati_necessari: ['CF', 'Esame superato'], automatico: false }],
    cosa_gestiamo: 'ComUnica — ti guidiamo sull\'iscrizione RUI',
    cosa_deve_fare_utente: ['Esame abilitante', 'Iscrizione RUI IVASS'],
    percentuale_automazione: 55,
  },

  {
    id: 'promotore_finanziario',
    nome: 'Consulente finanziario / Promotore finanziario',
    nome_breve: 'Consulente finanziario',
    nomi_alternativi: ['promotore finanziario', 'consulente finanziario', 'consulente patrimoniale', 'private banker', 'gestore patrimoni'],
    categoria: 'servizi',
    legge_riferimento: 'D.Lgs 58/1998 (TUF), Regolamento OCF',
    codici_ateco: ['66.19.10'],
    enti_verifica: ['OCF — Organismo di Vigilanza e Tenuta dell\'Albo dei Consulenti Finanziari'],
    requisiti_soggettivi: ['Iscrizione Albo OCF (esame abilitante + requisiti)'],
    requisiti_oggettivi: ['Nessun locale obbligatorio'],
    iter: ['1. Esame OCF (consultazionefinanziaria.it)', '2. Iscrizione albo', '3. ComUnica → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_ocf', nome: 'Iscrizione Albo OCF', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Organismo CF — consulentefinanziario.it', dove: 'https://www.consulentefinanziario.it', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'ComUnica',
    cosa_deve_fare_utente: ['Esame OCF', 'Iscrizione albo OCF'],
    percentuale_automazione: 50,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 7 — SANITARIO E BENESSERE
  // ═══════════════════════════════════════════════════════

  {
    id: 'studio_medico',
    nome: 'Studio medico / Ambulatorio / Poliambulatorio',
    nome_breve: 'Studio medico',
    nomi_alternativi: ['studio medico', 'ambulatorio', 'poliambulatorio', 'clinica privata', 'medico specialista', 'medicina generale', 'medicina del lavoro'],
    categoria: 'sanitario',
    legge_riferimento: 'D.Lgs 30 dicembre 1992 n.502, DPR 14 gennaio 1997 (requisiti minimi)',
    codici_ateco: ['86.21.00', '86.22.09'],
    enti_verifica: ['ASL', 'Regione'],
    requisiti_soggettivi: ['Laurea in Medicina + specializzazione + iscrizione Ordine dei Medici'],
    requisiti_oggettivi: ['Autorizzazione sanitaria ASL', 'Requisiti minimi strutturali DPR 1997'],
    iter: ['1. Iscrizione Ordine Medici (se non ancora)', '2. P.IVA → Zipra', '3. Richiesta autorizzazione sanitaria ASL (Zipra ti assiste)', '4. SCIA SUAP → Zipra'],
    documenti: [
      D_ID, D_CF,
      { id: 'laurea_med', nome: 'Laurea Medicina + specializzazione', obbligatorio: true, fonte: 'utente', descrizione: 'Titoli accademici', zipra_lo_fa: false },
      { id: 'ordine_medici', nome: 'Iscrizione Ordine dei Medici', obbligatorio: true, fonte: 'utente', descrizione: 'Iscrizione obbligatoria per legge', zipra_lo_fa: false },
      { id: 'aut_asl_med', nome: 'Autorizzazione sanitaria ASL', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Per apertura studio/ambulatorio', dove: 'ASL provinciale', tempi_stimati: '30-90 giorni', zipra_lo_fa: false },
      scia('ambulatorio'), D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'P.IVA, SCIA SUAP — assistenza per autorizzazione ASL',
    cosa_deve_fare_utente: ['Iscrizione Ordine dei Medici', 'Ottenere autorizzazione sanitaria ASL'],
    percentuale_automazione: 55,
  },

  {
    id: 'studio_dentistico',
    nome: 'Studio dentistico / Odontoiatra / Ortodonzia',
    nome_breve: 'Dentista',
    nomi_alternativi: ['dentista', 'odontoiatra', 'studio dentistico', 'ortodonzia', 'implantologia', 'pedodonzia'],
    categoria: 'sanitario',
    legge_riferimento: 'L. 24 luglio 1985 n.409, D.Lgs 502/1992',
    codici_ateco: ['86.23.00'],
    enti_verifica: ['ASL', 'Regione'],
    requisiti_soggettivi: ['Laurea Odontoiatria + iscrizione Ordine Odontoiatri'],
    requisiti_oggettivi: ['Autorizzazione sanitaria ASL', 'Requisiti minimi strutturali', 'Gestione rifiuti speciali (amalgame, ecc.)'],
    iter: ['1. Iscrizione Ordine Odontoiatri', '2. P.IVA → Zipra', '3. Autorizzazione ASL', '4. SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'laurea_odont', nome: 'Laurea Odontoiatria + Ordine', obbligatorio: true, fonte: 'utente', descrizione: 'Titoli e iscrizione ordine', zipra_lo_fa: false }, { id: 'aut_asl_od', nome: 'Autorizzazione sanitaria ASL', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Per studio dentistico', dove: 'ASL', tempi_stimati: '30-90 gg', zipra_lo_fa: false }, scia('dentista'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'P.IVA e SCIA',
    cosa_deve_fare_utente: ['Ordine Odontoiatri', 'Autorizzazione ASL'],
    percentuale_automazione: 55,
  },

  {
    id: 'fisioterapia',
    nome: 'Studio fisioterapia / Centro riabilitativo / Osteopatia',
    nome_breve: 'Fisioterapista',
    nomi_alternativi: ['fisioterapia', 'fisioterapista', 'riabilitazione', 'osteopatia', 'centro fisioterapico', 'massoterapia', 'chinesiterapia'],
    categoria: 'sanitario',
    legge_riferimento: 'D.Lgs 502/1992, L. 3/2018 (professionisti sanitari)',
    codici_ateco: ['86.90.21'],
    enti_verifica: ['ASL', 'Regione'],
    requisiti_soggettivi: ['Laurea Fisioterapia + iscrizione Albo TSRM e PSTRP'],
    requisiti_oggettivi: ['Autorizzazione sanitaria ASL (in alcune regioni accreditamento)'],
    iter: ['1. Iscrizione Albo TSRM-PSTRP', '2. P.IVA → Zipra', '3. Autorizzazione ASL', '4. SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_fisio', nome: 'Iscrizione Albo TSRM-PSTRP', obbligatorio: true, fonte: 'utente', descrizione: 'Albo fisioterapisti', zipra_lo_fa: false }, { id: 'aut_fisio', nome: 'Autorizzazione ASL', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Per studio fisioterapico', dove: 'ASL locale', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'P.IVA e SCIA',
    cosa_deve_fare_utente: ['Albo TSRM-PSTRP', 'Autorizzazione ASL'],
    percentuale_automazione: 55,
  },

  {
    id: 'palestra',
    nome: 'Palestra / Centro fitness / Yoga / Pilates / Arti marziali',
    nome_breve: 'Palestra',
    nomi_alternativi: ['palestra', 'gym', 'fitness', 'centro sportivo', 'crossfit', 'yoga', 'pilates', 'arti marziali', 'boxe', 'danza', 'functional training'],
    categoria: 'sanitario',
    legge_riferimento: 'D.Lgs 120/2023 (riforma sport), normative regionali',
    codici_ateco: ['93.13.00', '93.12.00', '93.29.30'],
    enti_verifica: ['Comune', 'Regione'],
    requisiti_soggettivi: ['Qualifiche istruttori variabili per regione (CONI, FederSport, attestati specifici)'],
    requisiti_oggettivi: ['Agibilità locale', 'CPI se capienza >100 persone', 'Autorizzazione sanitaria per piscine e saune'],
    iter: ['1. Verifica normativa regionale specifica → Zipra controlla', '2. ComUnica → Zipra', '3. Comunicazione SUAP → Zipra', '4. CPI se necessario'],
    documenti: [D_ID, D_CF, D_AGIBILITA, D_CONTRATTO_LOCALE, scia('palestra'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    varianti_regionali: { 'Lombardia': 'Normativa specifica palestre LR 26/2016', 'Veneto': 'Requisiti SUAP specifici per attività sportiva' },
    cosa_gestiamo: 'ComUnica, SCIA, verifica normativa regionale',
    cosa_deve_fare_utente: ['Agibilità locale', 'Qualifiche istruttori se richieste dalla regione'],
    percentuale_automazione: 70,
  },

  {
    id: 'ottico',
    nome: 'Ottico / Optometrista / Centro ottico',
    nome_breve: 'Ottico',
    nomi_alternativi: ['ottico', 'ottica', 'centro ottico', 'occhiali', 'lenti a contatto', 'optometria', 'vista'],
    categoria: 'sanitario',
    legge_riferimento: 'L. 23 dicembre 1978 n.833 art.99, RD 31 maggio 1928 n.1334',
    codici_ateco: ['47.78.20'],
    enti_verifica: ['Regione'],
    requisiti_soggettivi: ['Diploma di ottico rilasciato da istituto specifico + abilitazione professionale'],
    requisiti_oggettivi: ['Locale idoneo'],
    iter: ['1. ComUnica → Zipra', '2. SCIA SUAP → Zipra', '3. Eventuale comunicazione ordine/albo regionale'],
    documenti: [D_ID, D_CF, { id: 'diploma_ottico', nome: 'Diploma ottico + abilitazione', obbligatorio: true, fonte: 'utente', descrizione: 'Titolo professionale', zipra_lo_fa: false }, scia('ottica'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'ComUnica e SCIA',
    cosa_deve_fare_utente: ['Diploma di ottico e abilitazione'],
    percentuale_automazione: 80,
  },

  {
    id: 'psicologo',
    nome: 'Psicologo / Psicoterapeuta',
    nome_breve: 'Psicologo',
    nomi_alternativi: ['psicologo', 'psicoterapeuta', 'psicoterapia', 'consulenza psicologica', 'neuropsicologia', 'counseling'],
    categoria: 'sanitario',
    legge_riferimento: 'L. 18 febbraio 1989 n.56',
    codici_ateco: ['86.90.29'],
    enti_verifica: ['Ordine degli Psicologi'],
    requisiti_soggettivi: ['Laurea magistrale Psicologia + tirocinio + esame di Stato + iscrizione Ordine Psicologi'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Ordine Psicologi', '2. P.IVA + ENPAP → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_psi', nome: 'Iscrizione Ordine degli Psicologi', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria per esercitare', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'ENPAP', nome_canale: 'Portale ENPAP', url: 'https://www.enpap.it', cosa_fa_zipra: 'Iscrizione ente previdenziale psicologi e comunicazione inizio attività.', dati_necessari: ['CF', 'Iscrizione Ordine'], automatico: true }],
    cosa_gestiamo: 'P.IVA, comunicazione ENPAP',
    cosa_deve_fare_utente: ['Iscrizione Ordine Psicologi'],
    percentuale_automazione: 75,
  },

  {
    id: 'infermiere',
    nome: 'Infermiere / Assistenza infermieristica',
    nome_breve: 'Infermiere',
    nomi_alternativi: ['infermiere', 'studio infermieristico', 'assistenza domiciliare', 'cure infermieristiche', 'infermiere professionale'],
    categoria: 'sanitario',
    legge_riferimento: 'L. 42/1999, L. 3/2018',
    codici_ateco: ['86.90.19'],
    enti_verifica: ['OPI — Ordine Professioni Infermieristiche'],
    requisiti_soggettivi: ['Laurea infermieristica + iscrizione OPI'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Iscrizione OPI', '2. P.IVA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_inf', nome: 'Iscrizione OPI', obbligatorio: true, fonte: 'utente', descrizione: 'Ordine Professioni Infermieristiche', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'P.IVA',
    cosa_deve_fare_utente: ['Iscrizione OPI'],
    percentuale_automazione: 80,
  },

  {
    id: 'veterinario',
    nome: 'Veterinario / Clinica veterinaria / Ambulatorio veterinario',
    nome_breve: 'Veterinario',
    nomi_alternativi: ['veterinario', 'clinica veterinaria', 'ambulatorio veterinario', 'pet', 'animali domestici'],
    categoria: 'sanitario',
    legge_riferimento: 'L. 396/1965, DPR 28/3/2000 n.120',
    codici_ateco: ['75.00.00'],
    enti_verifica: ['Ordine Veterinari', 'ASL'],
    requisiti_soggettivi: ['Laurea Medicina Veterinaria + esame abilitazione + iscrizione Ordine Veterinari'],
    requisiti_oggettivi: ['Autorizzazione sanitaria ASL', 'Requisiti strutturali ambulatorio'],
    iter: ['1. Iscrizione Ordine Veterinari', '2. P.IVA → Zipra', '3. Autorizzazione ASL', '4. SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_vet', nome: 'Iscrizione Ordine Veterinari', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria', zipra_lo_fa: false }, { id: 'aut_asl_vet', nome: 'Autorizzazione ASL', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Per ambulatorio', dove: 'ASL', zipra_lo_fa: false }, scia('veterinario'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'P.IVA e SCIA',
    cosa_deve_fare_utente: ['Ordine Veterinari', 'Autorizzazione ASL'],
    percentuale_automazione: 55,
  },

  {
    id: 'farmacia',
    nome: 'Farmacia',
    nome_breve: 'Farmacia',
    nomi_alternativi: ['farmacia', 'farmacista', 'parafarmacia', 'dispensario farmaceutico'],
    categoria: 'sanitario',
    legge_riferimento: 'DL 219/2006, L. 362/1991, DPR 1275/1971',
    codici_ateco: ['47.73.10'],
    enti_verifica: ['Regione', 'Comune (pianta organica)'],
    requisiti_soggettivi: ['Laurea Farmacia + esame abilitazione + iscrizione Ordine Farmacisti', 'Sede assegnata tramite concorso regionale (pianta organica)'],
    requisiti_oggettivi: ['Locale in sede assegnata dalla Regione'],
    alert: '⚠️ Sede farmacia assegnata tramite concorso regionale — non si apre liberamente.',
    iter: ['1. Partecipare al concorso regionale per sede farmacia', '2. Dopo assegnazione: tutto → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_farm', nome: 'Iscrizione Ordine Farmacisti', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria', zipra_lo_fa: false }, { id: 'assegnazione_sede_farm', nome: 'Provvedimento assegnazione sede farmacia', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Dalla Regione post-concorso', dove: 'Regione', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'Tutto dopo assegnazione sede regionale',
    cosa_deve_fare_utente: ['Iscrizione Ordine Farmacisti', 'Concorso regionale per sede'],
    percentuale_automazione: 60,
  },

  {
    id: 'laboratorio_analisi',
    nome: 'Laboratorio analisi cliniche / Centro diagnostico',
    nome_breve: 'Lab. analisi cliniche',
    nomi_alternativi: ['laboratorio analisi', 'analisi cliniche', 'centro diagnostico', 'analisi del sangue', 'esami diagnostici', 'ecografia', 'radiologia'],
    categoria: 'sanitario',
    legge_riferimento: 'DPR 14 gennaio 1997 (requisiti minimi), D.Lgs 502/1992',
    codici_ateco: ['86.90.11', '86.90.12'],
    enti_verifica: ['ASL', 'Regione'],
    requisiti_soggettivi: ['Direttore sanitario con laurea medica + specializzazione specifica', 'Autorizzazione sanitaria regionale'],
    requisiti_oggettivi: ['Requisiti minimi strutturali e tecnologici (DPR 1997)', 'Strumentazione certificata'],
    iter: ['1. Autorizzazione sanitaria regionale', '2. P.IVA → Zipra', '3. SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'aut_reg_lab', nome: 'Autorizzazione sanitaria regionale', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Regione e/o ASL', dove: 'Regione', tempi_stimati: '60-120 gg', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    cosa_gestiamo: 'P.IVA e SCIA — ti guidiamo sull\'iter ASL/Regione',
    cosa_deve_fare_utente: ['Autorizzazione sanitaria regionale', 'Direttore sanitario abilitato'],
    percentuale_automazione: 50,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 8 — TURISMO
  // ═══════════════════════════════════════════════════════

  {
    id: 'agenzia_viaggi',
    nome: 'Agenzia di viaggi e turismo / Tour operator',
    nome_breve: 'Agenzia viaggi',
    nomi_alternativi: ['agenzia di viaggi', 'tour operator', 'turismo', 'vacanze', 'viaggi organizzati', 'pacchetti turistici', 'online travel agency'],
    categoria: 'turismo',
    legge_riferimento: 'D.Lgs 21 maggio 2018 n.62 (Codice del Turismo)',
    codici_ateco: ['79.11.00', '79.12.00', '79.90.11'],
    enti_verifica: ['Regione — Assessorato Turismo'],
    requisiti_soggettivi: ['Autorizzazione regionale', 'Direttore tecnico con abilitazione specifica'],
    requisiti_oggettivi: ['Fideiussione bancaria o assicurativa obbligatoria (copre rimborsi clienti)', 'Polizza RC professionale'],
    iter: ['1. Ottieni autorizzazione regionale (Zipra ti guida)', '2. Fideiussione', '3. ComUnica → Zipra', '4. SCIA → Zipra'],
    documenti: [
      D_ID, D_CF,
      { id: 'aut_regione_tur', nome: 'Autorizzazione regionale agenzia viaggi', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Assessorato regionale Turismo', dove: 'Regione competente', tempi_stimati: '30-60 giorni', zipra_lo_fa: false },
      { id: 'fideiussione_tur', nome: 'Fideiussione bancaria/assicurativa', obbligatorio: true, fonte: 'utente', descrizione: 'Garanzia finanziaria per i clienti — obbligatoria', costo_stimato: '€500-2.000/anno', zipra_lo_fa: false },
      D_COMUNICA,
    ],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    varianti_regionali: { 'Sicilia': 'Procedura specifica Assessorato Turismo regione Sicilia', 'Sardegna': 'Portale regionale SUAP Sardegna' },
    cosa_gestiamo: 'ComUnica, SCIA — ti guidiamo sull\'autorizzazione regionale',
    cosa_deve_fare_utente: ['Autorizzazione regionale', 'Fideiussione bancaria'],
    percentuale_automazione: 62,
  },

  {
    id: 'guida_turistica',
    nome: 'Guida turistica / Accompagnatore turistico',
    nome_breve: 'Guida turistica',
    nomi_alternativi: ['guida turistica', 'accompagnatore turistico', 'city guide', 'tour guide', 'guida naturalistica', 'guida ambientale'],
    categoria: 'turismo',
    legge_riferimento: 'D.Lgs 62/2018, normative regionali',
    codici_ateco: ['79.90.20'],
    enti_verifica: ['Regione'],
    requisiti_soggettivi: ['Abilitazione professionale regionale (esame teorico-pratico)', 'Per siti UNESCO: abilitazione nazionale specifica'],
    requisiti_oggettivi: ['Nessun locale obbligatorio'],
    iter: ['1. Esame abilitazione regionale', '2. P.IVA → Zipra', '3. SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'abilitazione_guida', nome: 'Abilitazione guida turistica regionale', obbligatorio: true, fonte: 'utente', descrizione: 'Esame regionale obbligatorio', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'P.IVA e SCIA',
    cosa_deve_fare_utente: ['Superare esame regionale di abilitazione'],
    percentuale_automazione: 75,
  },

  {
    id: 'struttura_ricettiva',
    nome: 'B&B / Affittacamere / Casa vacanze / Agriturismo',
    nome_breve: 'B&B / Affittacamere',
    nomi_alternativi: ['B&B', 'bed and breakfast', 'affittacamere', 'casa vacanze', 'agriturismo', 'agriturismi', 'affitti brevi', 'Airbnb', 'locazione turistica'],
    categoria: 'turismo',
    legge_riferimento: 'L. 13 luglio 2015 n.107 (e normative regionali), D.Lgs 23/2011 (cedolare secca)',
    codici_ateco: ['55.10.00', '55.20.51', '55.20.52', '55.20.10'],
    enti_verifica: ['Comune (SUAP)', 'Regione', 'ASL (per ristorazione)'],
    requisiti_soggettivi: ['Normativa molto variabile per regione', 'SAB se si fa colazione'],
    requisiti_oggettivi: ['Classificazione stelle da Regione', 'Requisiti igienico-sanitari', 'Segnalazione al Comune + Questura (alloggiati web)'],
    alert: '⚠️ Per affitti brevi tipo Airbnb: obbligo CIN (Codice Identificativo Nazionale) dal 2024.',
    iter: ['1. Verifica normativa regionale → Zipra controlla', '2. SCIA al SUAP → Zipra', '3. CIN (Codice Identificativo Nazionale) → Zipra tramite portale BDSR', '4. Comunicazione Questura (alloggiati web) → Zipra', '5. ComUnica se attività imprenditoriale → Zipra'],
    documenti: [
      D_ID, D_CF, D_CONTRATTO_LOCALE,
      { id: 'cin', nome: 'CIN — Codice Identificativo Nazionale', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Obbligatorio dal 2024 — Zipra lo ottiene tramite portale BDSR Turismo', zipra_lo_fa: true },
      { id: 'scia_ricezione', nome: 'SCIA apertura struttura ricettiva + ComUnica', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Pratiche complete', zipra_lo_fa: true },
    ],
    comunicazioni_enti: [
      CH_COMUNICA, CH_SUAP,
      { ente: 'Ministero Turismo — BDSR', nome_canale: 'Portale BDSR (bdsr.turismo.gov.it)', url: 'https://bdsr.turismo.gov.it', cosa_fa_zipra: 'Richiesta CIN (Codice Identificativo Nazionale) obbligatorio per strutture ricettive e affitti brevi dal 2024.', dati_necessari: ['CF', 'Dati immobile', 'Dati struttura'], automatico: true },
      { ente: 'Questura — Alloggiati Web', nome_canale: 'Portale Alloggiati Web (Polizia di Stato)', url: 'https://alloggiatiweb.poliziadistato.it', cosa_fa_zipra: 'Registrazione alla piattaforma per comunicazione obbligatoria presenze (entro 24h da arrivo ospite).', dati_necessari: ['CF gestore', 'Dati struttura'], automatico: true },
    ],
    cosa_gestiamo: 'CIN (codice identificativo nazionale), SCIA SUAP, registrazione Alloggiati Web, ComUnica',
    cosa_deve_fare_utente: ['SAB se si fa colazione', 'Normativa specifica regionale per classificazione'],
    percentuale_automazione: 85,
  },

  {
    id: 'agenzia_funebre',
    nome: 'Agenzia funebre / Onoranze funebri',
    nome_breve: 'Agenzia funebre',
    nomi_alternativi: ['agenzia funebre', 'onoranze funebri', 'pompe funebri', 'servizi funebri'],
    categoria: 'servizi',
    legge_riferimento: 'DPR 10 settembre 1990 n.285 + normative regionali + regolamenti comunali',
    codici_ateco: ['96.03.00'],
    enti_verifica: ['Comune', 'ASL'],
    requisiti_soggettivi: ['Autorizzazione comunale specifica', 'Requisiti igienico-sanitari'],
    requisiti_oggettivi: ['Camera ardente conforme', 'Veicoli omologati per trasporto salme'],
    alert: '⚠️ Normativa variabile per comune — alcuni limitano il numero di agenzie.',
    iter: ['1. Verifica normativa comunale → Zipra controlla', '2. Autorizzazione comunale', '3. ComUnica + SCIA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'aut_com_fun', nome: 'Autorizzazione comunale onoranze funebri', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Specifica per attività funebre', dove: 'Comune', zipra_lo_fa: false }, scia('agenzia-funebre'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'Verifica normativa, ComUnica, SCIA',
    cosa_deve_fare_utente: ['Autorizzazione comunale specifica'],
    percentuale_automazione: 65,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 9 — SICUREZZA E INVESTIGAZIONI
  // ═══════════════════════════════════════════════════════

  {
    id: 'vigilanza',
    nome: 'Istituto di vigilanza privata / Guardia giurata',
    nome_breve: 'Vigilanza privata',
    nomi_alternativi: ['vigilanza privata', 'guardia giurata', 'sicurezza privata', 'istituto di vigilanza', 'steward eventi', 'bodyguard', 'antirapina'],
    categoria: 'servizi',
    legge_riferimento: 'R.D. 18 giugno 1931 n.773 (TULPS) artt. 133-141',
    codici_ateco: ['80.10.00'],
    enti_verifica: ['Prefettura'],
    requisiti_soggettivi: ['Licenza prefettizia (90-180 giorni)', 'Requisiti morali stringenti', 'Formazione guardie giurate (TULPS + DM 154/2009)'],
    requisiti_oggettivi: ['Sede operativa idonea'],
    alert: '⚠️ Licenza prefettizia richiede molti mesi — pianifica con largo anticipo.',
    iter: ['1. Domanda licenza alla Prefettura', '2. Approvazione (90-180 gg)', '3. ComUnica → Zipra', '4. SCIA → Zipra'],
    documenti: [D_ID, D_CF, D_CASELLARIO, { id: 'licenza_pref', nome: 'Licenza prefettizia', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Prefettura della provincia — processo lungo', dove: 'Prefettura', tempi_stimati: '90-180 giorni', zipra_lo_fa: false }, scia('vigilanza'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_GIUSTIZIA],
    cosa_gestiamo: 'Casellario, ComUnica e SCIA post-licenza',
    cosa_deve_fare_utente: ['Ottenere licenza prefettizia (processo lungo e complesso)'],
    percentuale_automazione: 50,
  },

  {
    id: 'investigatore_privato',
    nome: 'Investigatore privato / Agenzia investigativa',
    nome_breve: 'Investigatore privato',
    nomi_alternativi: ['investigatore privato', 'detective', 'agenzia investigativa', 'perito investigativo', 'investigazioni private'],
    categoria: 'servizi',
    legge_riferimento: 'R.D. 773/1931 (TULPS) art. 134',
    codici_ateco: ['80.30.00'],
    enti_verifica: ['Prefettura'],
    requisiti_soggettivi: ['Licenza prefettizia', 'Requisiti morali', 'Formazione specifica'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Licenza Prefettura', '2. ComUnica → Zipra'],
    documenti: [D_ID, D_CF, D_CASELLARIO, { id: 'lic_pref_inv', nome: 'Licenza prefettizia investigatore', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Prefettura', dove: 'Prefettura', tempi_stimati: '60-120 gg', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_GIUSTIZIA],
    cosa_gestiamo: 'Casellario, ComUnica post-licenza',
    cosa_deve_fare_utente: ['Licenza prefettizia'],
    percentuale_automazione: 50,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 10 — PROFESSIONISTI TECNICI
  // ═══════════════════════════════════════════════════════

  {
    id: 'geometra',
    nome: 'Geometra / Perito edile / Studio tecnico',
    nome_breve: 'Geometra',
    nomi_alternativi: ['geometra', 'studio tecnico', 'topografo', 'perizie immobiliari', 'catasto', 'perito edile', 'rilievi'],
    categoria: 'professione',
    legge_riferimento: 'RD 11 febbraio 1929 n.274, DPR 7 agosto 2012 n.137',
    codici_ateco: ['71.12.30'],
    enti_verifica: ['Collegio dei Geometri'],
    requisiti_soggettivi: ['Diploma geometra (o laurea triennale) + tirocinio + esame di Stato + iscrizione Collegio Geometri'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Collegio Geometri', '2. P.IVA + CIPAG (Cassa previdenza) → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_geo', nome: 'Iscrizione Collegio Geometri', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria per esercitare', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'CIPAG', nome_canale: 'Portale CIPAG', url: 'https://www.cipag.it', cosa_fa_zipra: 'Comunicazione inizio attività alla Cassa previdenza geometri.', dati_necessari: ['CF', 'Iscrizione Collegio'], automatico: true }],
    cosa_gestiamo: 'P.IVA, CIPAG, adempimenti fiscali apertura',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione Collegio Geometri'],
    percentuale_automazione: 70,
  },

  {
    id: 'perito_industriale',
    nome: 'Perito industriale / Studio tecnico peritale',
    nome_breve: 'Perito industriale',
    nomi_alternativi: ['perito industriale', 'perito meccanico', 'perito elettrotecnico', 'perito chimico', 'studio peritale'],
    categoria: 'professione',
    legge_riferimento: 'RD 11 febbraio 1929 n.275, DPR 137/2012',
    codici_ateco: ['71.12.20'],
    enti_verifica: ['Collegio Periti Industriali'],
    requisiti_soggettivi: ['Diploma perito industriale + tirocinio + esame di Stato + iscrizione Collegio Periti'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Collegio Periti Industriali', '2. P.IVA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_perito', nome: 'Iscrizione Collegio Periti Industriali', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'P.IVA e adempimenti apertura',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione Collegio Periti'],
    percentuale_automazione: 72,
  },

  {
    id: 'commercialista',
    nome: 'Dottore commercialista / Revisore contabile',
    nome_breve: 'Commercialista',
    nomi_alternativi: ['commercialista', 'dottore commercialista', 'ragioniere', 'studio commercialista', 'consulente fiscale', 'tributarista', 'revisore contabile'],
    categoria: 'professione',
    legge_riferimento: 'D.Lgs 28 giugno 2005 n.139',
    codici_ateco: ['69.20.11', '69.20.12'],
    enti_verifica: ['ODCEC — Ordine Dottori Commercialisti'],
    requisiti_soggettivi: ['Laurea + tirocinio 18 mesi + esame di Stato + iscrizione ODCEC'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione ODCEC', '2. P.IVA + CNPR (Cassa dottori commercialisti) → Zipra'],
    documenti: [D_ID, D_CF, { id: 'odcec', nome: 'Iscrizione ODCEC', obbligatorio: true, fonte: 'utente', descrizione: 'Ordine Dottori Commercialisti', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'CNPR', nome_canale: 'Portale CNPR', url: 'https://www.cnpr.it', cosa_fa_zipra: 'Comunicazione inizio attività alla Cassa previdenza commercialisti.', dati_necessari: ['CF', 'Iscrizione ODCEC'], automatico: true }],
    cosa_gestiamo: 'P.IVA, CNPR, setup fiscale',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione ODCEC'],
    percentuale_automazione: 72,
  },

  {
    id: 'avvocato',
    nome: 'Avvocato / Studio legale',
    nome_breve: 'Avvocato',
    nomi_alternativi: ['avvocato', 'studio legale', 'legale', 'penalista', 'civilista', 'avvocatura', 'diritto del lavoro'],
    categoria: 'professione',
    legge_riferimento: 'L. 31 dicembre 2012 n.247',
    codici_ateco: ['69.10.10'],
    enti_verifica: ['Ordine degli Avvocati'],
    requisiti_soggettivi: ['Laurea Giurisprudenza + praticantato 2 anni + esame di Stato + iscrizione Ordine Avvocati'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Ordine Avvocati', '2. P.IVA + Cassa Forense → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_avv', nome: 'Iscrizione Ordine Avvocati', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'Cassa Forense', nome_canale: 'Portale Cassa Forense', url: 'https://www.cassaforense.it', cosa_fa_zipra: 'Comunicazione inizio attività alla Cassa Forense (previdenza avvocati). Obbligatoria entro 30 gg.', dati_necessari: ['CF', 'Iscrizione Ordine'], automatico: true }],
    cosa_gestiamo: 'P.IVA, Cassa Forense, setup fiscale',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione Ordine Avvocati'],
    percentuale_automazione: 72,
  },

  {
    id: 'notaio',
    nome: 'Notaio',
    nome_breve: 'Notaio',
    nomi_alternativi: ['notaio', 'notaio pubblico', 'studio notarile', 'atti notarili'],
    categoria: 'professione',
    legge_riferimento: 'L. 16 febbraio 1913 n.89 (Legge Notarile)',
    codici_ateco: ['69.10.20'],
    enti_verifica: ['Consiglio Notarile', 'Ministero della Giustizia'],
    requisiti_soggettivi: ['Laurea Giurisprudenza + tirocinio 18 mesi + concorso pubblico notarile (posti limitati)'],
    requisiti_oggettivi: ['Studio notarile nella sede assegnata'],
    alert: '⚠️ L\'accesso alla professione notarile avviene solo tramite concorso pubblico con posti limitati.',
    iter: ['1. Concorso pubblico notarile (Ministero Giustizia)', '2. Nomina ministeriale', '3. P.IVA + comunicazioni → Zipra'],
    documenti: [D_ID, D_CF, { id: 'nomina_notaio', nome: 'Nomina ministeriale notaio', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Ministero della Giustizia post-concorso', dove: 'Ministero Giustizia', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'P.IVA e comunicazioni dopo nomina',
    cosa_deve_fare_utente: ['Concorso pubblico notarile', 'Nomina ministeriale'],
    percentuale_automazione: 50,
  },

  {
    id: 'architetto_ingegnere',
    nome: 'Architetto / Ingegnere / Studio di progettazione',
    nome_breve: 'Architetto / Ingegnere',
    nomi_alternativi: ['architetto', 'ingegnere', 'studio architettura', 'studio ingegneria', 'progettazione', 'strutturista', 'ingegnere civile', 'ingegnere ambientale'],
    categoria: 'professione',
    legge_riferimento: 'RD 23 ottobre 1925 n.2537, DPR 137/2012',
    codici_ateco: ['71.11.00', '71.12.10', '71.12.20'],
    enti_verifica: ['Ordine Architetti (OAP)', 'Ordine Ingegneri'],
    requisiti_soggettivi: ['Laurea magistrale + tirocinio + esame di Stato + iscrizione Ordine Architetti o Ordine Ingegneri'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Ordine professionale', '2. P.IVA + INARCASSA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_arch_ing', nome: 'Iscrizione Ordine Architetti / Ordine Ingegneri', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria per esercitare', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'INARCASSA', nome_canale: 'Portale INARCASSA', url: 'https://www.inarcassa.it', cosa_fa_zipra: 'Comunicazione inizio attività a INARCASSA (Cassa previdenza arch. e ing.). Obbligatoria entro 30 gg.', dati_necessari: ['CF', 'Iscrizione Ordine'], automatico: true }],
    cosa_gestiamo: 'P.IVA, INARCASSA, setup fiscale',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione Ordine professionale'],
    percentuale_automazione: 72,
  },

  {
    id: 'consulente_lavoro',
    nome: 'Consulente del lavoro',
    nome_breve: 'Consulente del lavoro',
    nomi_alternativi: ['consulente del lavoro', 'studio del lavoro', 'paghe e contributi', 'amministrazione personale'],
    categoria: 'professione',
    legge_riferimento: 'L. 12 gennaio 1979 n.12',
    codici_ateco: ['69.20.22'],
    enti_verifica: ['Ordine Consulenti del Lavoro'],
    requisiti_soggettivi: ['Laurea o diploma specifico + tirocinio + esame di Stato + iscrizione Ordine CdL'],
    requisiti_oggettivi: ['Studio professionale'],
    iter: ['1. Iscrizione Ordine CdL', '2. P.IVA + ENPACL → Zipra'],
    documenti: [D_ID, D_CF, { id: 'albo_cdl', nome: 'Iscrizione Ordine Consulenti del Lavoro', obbligatorio: true, fonte: 'utente', descrizione: 'Obbligatoria', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ADE, { ente: 'ENPACL', nome_canale: 'Portale ENPACL', url: 'https://www.enpacl.it', cosa_fa_zipra: 'Comunicazione inizio attività alla Cassa previdenza consulenti del lavoro.', dati_necessari: ['CF', 'Iscrizione Ordine'], automatico: true }],
    cosa_gestiamo: 'P.IVA, ENPACL, setup fiscale',
    cosa_deve_fare_utente: ['Esame di Stato', 'Iscrizione Ordine CdL'],
    percentuale_automazione: 72,
  },

  {
    id: 'perito_assicurativo',
    nome: 'Perito assicurativo / Liquidatore sinistri',
    nome_breve: 'Perito assicurativo',
    nomi_alternativi: ['perito assicurativo', 'liquidatore sinistri', 'loss adjuster', 'perito danni'],
    categoria: 'servizi',
    legge_riferimento: 'L. 12 agosto 1927 n.1625, Regolamento IVASS n.33/2010',
    codici_ateco: ['66.21.00'],
    enti_verifica: ['CCIAA — Ruolo Periti Assicurativi', 'IVASS'],
    requisiti_soggettivi: ['Esame di idoneità + iscrizione Ruolo Periti Assicurativi CCIAA'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. Esame idoneità + iscrizione Ruolo CCIAA', '2. P.IVA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'esame_perito_ass', nome: 'Esame idoneità perito assicurativo CCIAA', obbligatorio: true, fonte: 'utente', descrizione: 'Iscrizione Ruolo Periti Assicurativi', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI],
    cosa_gestiamo: 'P.IVA, iscrizione Ruolo CCIAA',
    cosa_deve_fare_utente: ['Esame CCIAA perito assicurativo'],
    percentuale_automazione: 75,
  },

  {
    id: 'periti_esperti',
    nome: 'Perito ed esperto / Consulente tecnico d\'ufficio (CTU)',
    nome_breve: 'Perito / CTU',
    nomi_alternativi: ['perito', 'esperto', 'CTU', 'consulente tecnico', 'perito estimatore', 'CTP'],
    categoria: 'professione',
    legge_riferimento: 'DM 29 dicembre 1979, D.Lgs 150/2022 (riforma CTU)',
    codici_ateco: ['74.90.99'],
    enti_verifica: ['CCIAA — Ruolo Periti ed Esperti', 'Ministero Giustizia (per CTU)'],
    requisiti_soggettivi: ['Competenza specifica nella categoria di iscrizione', 'Iscrizione Ruolo Periti ed Esperti CCIAA'],
    requisiti_oggettivi: ['Nessun locale obbligatorio'],
    iter: ['1. Domanda iscrizione Ruolo CCIAA', '2. P.IVA → Zipra'],
    documenti: [D_ID, D_CF, { id: 'domanda_ruolo_periti', nome: 'Domanda iscrizione Ruolo Periti CCIAA', obbligatorio: true, fonte: 'zipra_genera', descrizione: 'Zipra compila e invia la domanda', zipra_lo_fa: true }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_ALBI],
    cosa_gestiamo: 'Domanda Ruolo CCIAA, P.IVA',
    cosa_deve_fare_utente: ['Documentare la competenza specifica'],
    percentuale_automazione: 82,
  },

  // ═══════════════════════════════════════════════════════
  // GRUPPO 11 — FORMAZIONE E MEDIA
  // ═══════════════════════════════════════════════════════

  {
    id: 'asilo_nido',
    nome: 'Asilo nido / Micronido / Ludoteca / Centro bambini',
    nome_breve: 'Asilo nido',
    nomi_alternativi: ['asilo nido', 'nido', 'micronido', 'ludoteca', 'spazio bambini', 'nido famiglia', 'tagesmutter'],
    categoria: 'formazione',
    legge_riferimento: 'L. 28 marzo 2003 n.53, D.Lgs 65/2017, normative regionali',
    codici_ateco: ['88.91.00', '88.99.09'],
    enti_verifica: ['Regione', 'Comune', 'ASL'],
    requisiti_soggettivi: ['Autorizzazione regionale obbligatoria', 'Titoli educatori certificati'],
    requisiti_oggettivi: ['Requisiti minimi strutturali regionali (superficie per bambino, spazi, igiene)', 'Autorizzazione ASL'],
    iter: ['1. Autorizzazione regionale', '2. Autorizzazione ASL', '3. ComUnica → Zipra', '4. Comunicazione Comune → Zipra'],
    documenti: [D_ID, D_CF, { id: 'aut_reg_nido', nome: 'Autorizzazione regionale asilo nido', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Regione competente', dove: 'Regione', tempi_stimati: '60-90 gg', zipra_lo_fa: false }, D_PLANIMETRIA, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_ASL],
    varianti_regionali: { 'Lombardia': 'Procedura specifica con modulistica regionale unificata', 'Veneto': 'Sistema SUAP regionale per servizi educativi' },
    cosa_gestiamo: 'ComUnica, comunicazione Comune, SCIA — assistenza per autorizzazione regionale',
    cosa_deve_fare_utente: ['Autorizzazione regionale', 'Autorizzazione ASL', 'Locale idoneo con requisiti regionali'],
    percentuale_automazione: 52,
  },

  {
    id: 'scuola_privata',
    nome: 'Scuola privata / Centro di formazione / Accademia',
    nome_breve: 'Scuola privata',
    nomi_alternativi: ['scuola privata', 'centro formazione', 'accademia', 'scuola di lingue', 'scuola di musica', 'scuola danza', 'ente di formazione', 'istituto privato'],
    categoria: 'formazione',
    legge_riferimento: 'DPR 11 luglio 1980 n.382, L. 107/2015',
    codici_ateco: ['85.20.00', '85.31.20', '85.32.00', '85.42.00', '85.52.09', '85.59.20'],
    enti_verifica: ['MIUR / USR (Ufficio Scolastico Regionale)', 'Comune'],
    requisiti_soggettivi: ['Parificazione o riconoscimento MIUR (per diplomi validi legalmente)'],
    requisiti_oggettivi: ['Locale idoneo', 'CPI se capienza >100', 'Agibilità'],
    iter: ['1. ComUnica → Zipra', '2. Comunicazione apertura SUAP → Zipra', '3. Eventuale riconoscimento MIUR (complesso)'],
    documenti: [D_ID, D_CF, D_AGIBILITA, D_CONTRATTO_LOCALE, scia('scuola-privata'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP],
    cosa_gestiamo: 'ComUnica e comunicazione SUAP — assistenza per riconoscimento MIUR se necessario',
    cosa_deve_fare_utente: ['Agibilità locale', 'Riconoscimento MIUR se si vogliono rilasciare diplomi legalmente validi'],
    percentuale_automazione: 72,
  },

  {
    id: 'agenzia_lavoro_interinale',
    nome: 'Agenzia per il lavoro / Somministrazione lavoro / Agenzie interinali',
    nome_breve: 'Agenzia per il lavoro',
    nomi_alternativi: ['agenzia per il lavoro', 'agenzia interinale', 'somministrazione lavoro', 'agenzia lavoro temporaneo', 'staff leasing'],
    categoria: 'servizi',
    legge_riferimento: 'D.Lgs 10 settembre 2003 n.276',
    codici_ateco: ['78.20.00', '78.10.00'],
    enti_verifica: ['Ministero del Lavoro'],
    requisiti_soggettivi: ['Autorizzazione ministeriale (MIT Lavoro)', 'Capitale sociale minimo €600.000', 'Garanzia fideiussoria'],
    requisiti_oggettivi: ['Sede operativa nazionale e filiali'],
    alert: '⚠️ Autorizzazione ministeriale molto complessa — per agenzie interinali a regime pieno.',
    iter: ['1. Domanda autorizzazione Ministero del Lavoro (complessa)', '2. ComUnica → Zipra'],
    documenti: [D_ID, D_CF, { id: 'aut_mit_lavoro', nome: 'Autorizzazione Ministero del Lavoro', obbligatorio: true, fonte: 'ente_pubblico', descrizione: 'Iter complesso — richiede consulente specializzato', dove: 'Ministero del Lavoro', tempi_stimati: '6-12 mesi', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'ComUnica post-autorizzazione',
    cosa_deve_fare_utente: ['Tutto il percorso autorizzativo (molto complesso — consigliamo consulente specializzato)'],
    percentuale_automazione: 35,
  },

  {
    id: 'agenzia_matrimoniale',
    nome: 'Agenzia matrimoniale / Agenzia incontri',
    nome_breve: 'Agenzia matrimoniale',
    nomi_alternativi: ['agenzia matrimoniale', 'agenzia incontri', 'matchmaking', 'appuntamenti'],
    categoria: 'servizi',
    legge_riferimento: 'L. 16 febbraio 1913 n.89 (TULPS per attività di mediazione) + normative regionali',
    codici_ateco: ['96.09.09'],
    enti_verifica: ['Comune', 'Questura (per alcune forme)'],
    requisiti_soggettivi: ['SCIA al Comune + eventuale comunicazione Questura'],
    requisiti_oggettivi: ['Sede operativa'],
    iter: ['1. ComUnica → Zipra', '2. SCIA al SUAP → Zipra'],
    documenti: [D_ID, D_CF, D_CASELLARIO, scia('agenzia-matrimoniale'), D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA, CH_SUAP, CH_GIUSTIZIA],
    cosa_gestiamo: 'Tutto',
    cosa_deve_fare_utente: ['Solo dati anagrafici'],
    percentuale_automazione: 90,
  },

  {
    id: 'editoria_web',
    nome: 'Testata giornalistica / Blog professionale / Web media',
    nome_breve: 'Testata giornalistica',
    nomi_alternativi: ['giornale', 'testata giornalistica', 'blog', 'web media', 'newsletter', 'podcast professionale', 'portale informazione'],
    categoria: 'media',
    legge_riferimento: 'L. 8 febbraio 1948 n.47 (Legge sulla Stampa), L. 3 agosto 1949 n.698',
    codici_ateco: ['58.13.00', '58.14.00', '63.12.00'],
    enti_verifica: ['Tribunale (per testate con direttore responsabile)', 'Ordine Giornalisti (per direttori giornalisti)'],
    requisiti_soggettivi: ['Direttore responsabile — giornalista iscritto ODG per testate con distribuzione periodica'],
    requisiti_oggettivi: ['Sede redazione'],
    iter: ['1. Registrazione testata al Tribunale competente (se periodico)', '2. ComUnica → Zipra', '3. Eventuale deposito alla prefettura'],
    documenti: [D_ID, D_CF, { id: 'reg_testata', nome: 'Registrazione testata al Tribunale', obbligatorio: false, fonte: 'ente_pubblico', descrizione: 'Solo per testate periodiche con distribuzione', dove: 'Tribunale competente per territorio', costo_stimato: '€50-150', zipra_lo_fa: false }, D_COMUNICA],
    comunicazioni_enti: [CH_COMUNICA],
    cosa_gestiamo: 'ComUnica, apertura P.IVA',
    cosa_deve_fare_utente: ['Registrazione testata al Tribunale se periodico', 'Direttore responsabile giornalista per testate registrate'],
    percentuale_automazione: 78,
  },

]

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Identifica l'attività dall'input libero dell'utente
 */
export function identificaAttivita(testo: string): AttivitaRegolamentata | null {
  const t = testo.toLowerCase()
  let best: AttivitaRegolamentata | null = null
  let bestScore = 0

  for (const a of ATTIVITA_REGOLAMENTATE) {
    const keywords = [
      a.id, a.nome.toLowerCase(), a.nome_breve.toLowerCase(),
      ...a.nomi_alternativi.map(k => k.toLowerCase()),
    ]
    const score = keywords.reduce((s, kw) => s + (t.includes(kw) ? kw.length : 0), 0)
    if (score > bestScore) { bestScore = score; best = a }
  }
  return best
}

/**
 * Statistiche documenti per un'attività
 */
export function getStatsDocumenti(a: AttivitaRegolamentata) {
  const totali = a.documenti.length
  const zipraFa = a.documenti.filter(d => d.zipra_lo_fa).length
  const utenteDevePortare = a.documenti.filter(d => !d.zipra_lo_fa && d.obbligatorio)
  return { totali, zipraFa, utenteDevePortare: utenteDevePortare.length, listaDaPortare: utenteDevePortare.map(d => d.nome) }
}

/**
 * Testo riepilogativo per il chatbot
 */
export function riepilogoChatbot(a: AttivitaRegolamentata, comune?: string): string {
  const stats = getStatsDocumenti(a)
  const lines: string[] = []
  if (a.alert) lines.push(a.alert, '')
  lines.push(`*${a.nome_breve}*${comune ? ` a ${comune}` : ''} — ${a.legge_riferimento}`, '')
  lines.push('TU devi solo:')
  a.cosa_deve_fare_utente.forEach((c, i) => lines.push(`${i + 1}. ${c}`))
  lines.push('')
  lines.push('ZIPRA gestisce tutto il resto:')
  a.iter.filter(s => s.toLowerCase().includes('zipra')).forEach(s => lines.push(`→ ${s}`))
  lines.push('')
  lines.push(`Automazione Zipra: ${a.percentuale_automazione}% del lavoro`)
  lines.push(`Documenti: ${stats.zipraFa}/${stats.totali} li recupera/genera Zipra automaticamente`)
  if (stats.utenteDevePortare > 0) {
    lines.push(`Hai solo bisogno di: ${stats.listaDaPortare.join(', ')}`)
  }
  return lines.join('\\n').trim()
}

/**
 * Lista enti con cui Zipra comunica per un'attività
 */
export function getEntiAutomatici(a: AttivitaRegolamentata): string[] {
  return a.comunicazioni_enti
    .filter(e => e.automatico)
    .map(e => e.ente)
}

export default ATTIVITA_REGOLAMENTATE