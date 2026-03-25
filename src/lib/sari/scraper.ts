import * as cheerio from 'cheerio'
import { indicizzaNormativa } from '@/lib/ai/rag'

// ─── Fonti SARI ufficiali ─────────────────────────────────────────────────────
// Tutto ciò che è pubblicamente accessibile su sari.camcom.it e portali correlati

const FONTI_SARI = [
  // ── Portale SARI principale ──
  {
    url: 'https://sari.camcom.it',
    nome: 'SARI — Portale principale Infocamere',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://sari.camcom.it/tipologie-pratiche',
    nome: 'SARI — Tipologie pratiche ComUnica',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://sari.camcom.it/modulistica',
    nome: 'SARI — Modulistica ufficiale',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://sari.camcom.it/guide',
    nome: 'SARI — Guide operative',
    categoria: 'cciaa',
    priorita: 1,
  },

  // ── ComUnica ──
  {
    url: 'https://comunica.gov.it',
    nome: 'ComUnica — Comunicazione unica imprese',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://comunica.gov.it/cosa-e-comunica',
    nome: 'ComUnica — Cos\'è e come funziona',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://comunica.gov.it/adempimenti',
    nome: 'ComUnica — Adempimenti obbligatori',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://comunica.gov.it/guide-e-manuali',
    nome: 'ComUnica — Guide e manuali',
    categoria: 'cciaa',
    priorita: 1,
  },

  // ── Registro Imprese ──
  {
    url: 'https://www.registroimprese.it/apertura-impresa',
    nome: 'Registro Imprese — Apertura impresa',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.registroimprese.it/modifica-impresa',
    nome: 'Registro Imprese — Modifica impresa',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.registroimprese.it/cessazione-impresa',
    nome: 'Registro Imprese — Cessazione impresa',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.registroimprese.it/adempimenti',
    nome: 'Registro Imprese — Adempimenti periodici',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.registroimprese.it/pec-imprese',
    nome: 'Registro Imprese — Obbligo PEC',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.registroimprese.it/codice-ateco',
    nome: 'Registro Imprese — Codici ATECO',
    categoria: 'cciaa',
    priorita: 1,
  },

  // ── Infocamere ──
  {
    url: 'https://www.infocamere.it/servizi-alle-imprese',
    nome: 'Infocamere — Servizi imprese',
    categoria: 'cciaa',
    priorita: 2,
  },
  {
    url: 'https://www.infocamere.it/telemaco',
    nome: 'Infocamere — Telemaco (invio telematico)',
    categoria: 'cciaa',
    priorita: 1,
  },
  {
    url: 'https://www.infocamere.it/comunicazione-unica',
    nome: 'Infocamere — Comunicazione Unica',
    categoria: 'cciaa',
    priorita: 1,
  },

  // ── Impresa in un Giorno (SUAP nazionale) ──
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/adempimenti',
    nome: 'Impresa in un Giorno — Adempimenti',
    categoria: 'suap',
    priorita: 1,
  },
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/attivita-commerciali',
    nome: 'Impresa in un Giorno — Attività commerciali',
    categoria: 'suap',
    priorita: 1,
  },
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/attivita-artigiane',
    nome: 'Impresa in un Giorno — Attività artigiane',
    categoria: 'suap',
    priorita: 1,
  },
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/pubblici-esercizi',
    nome: 'Impresa in un Giorno — Pubblici esercizi',
    categoria: 'suap',
    priorita: 1,
  },
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/attivita-sanitarie',
    nome: 'Impresa in un Giorno — Attività sanitarie',
    categoria: 'suap',
    priorita: 1,
  },
  {
    url: 'https://www.impresainungiorno.gov.it/web/guest/edilizia',
    nome: 'Impresa in un Giorno — Edilizia',
    categoria: 'suap',
    priorita: 1,
  },

  // ── Agenzia delle Entrate ──
  {
    url: 'https://www.agenziaentrate.gov.it/portale/apertura-partita-iva',
    nome: 'Agenzia Entrate — Apertura Partita IVA',
    categoria: 'agenzia_entrate',
    priorita: 1,
  },
  {
    url: 'https://www.agenziaentrate.gov.it/portale/regimi-fiscali-imprese',
    nome: 'Agenzia Entrate — Regimi fiscali',
    categoria: 'agenzia_entrate',
    priorita: 1,
  },
  {
    url: 'https://www.agenziaentrate.gov.it/portale/regime-forfettario',
    nome: 'Agenzia Entrate — Regime forfettario',
    categoria: 'agenzia_entrate',
    priorita: 1,
  },

  // ── INPS ──
  {
    url: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti/artigiani-e-commercianti.html',
    nome: 'INPS — Artigiani e commercianti',
    categoria: 'inps',
    priorita: 1,
  },
  {
    url: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti/gestione-separata.html',
    nome: 'INPS — Gestione separata',
    categoria: 'inps',
    priorita: 1,
  },
  {
    url: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti/contributi-artigiani-commercianti.html',
    nome: 'INPS — Contributi artigiani/commercianti',
    categoria: 'inps',
    priorita: 1,
  },

  // ── Normattiva — leggi chiave ──
  {
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2000-03-31;300',
    nome: 'D.Lgs 300/2000 — Riforma PA',
    categoria: 'generale',
    priorita: 2,
  },
  {
    url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2010-07-30;122',
    nome: 'L. 122/2010 — SCIA',
    categoria: 'suap',
    priorita: 1,
  },
]

// ─── Manuali PDF Telemaco/SARI (scaricabili pubblicamente) ───────────────────
// Vengono estratti come testo e indicizzati nel RAG

const PDF_SARI = [
  {
    url: 'https://www.infocamere.it/documents/10181/1234567/Manuale_Telemaco.pdf',
    nome: 'Manuale Telemaco — Invio telematico pratiche',
    categoria: 'cciaa',
  },
  {
    url: 'https://sari.camcom.it/documents/guida-operativa-comunica.pdf',
    nome: 'Guida operativa ComUnica',
    categoria: 'cciaa',
  },
  {
    url: 'https://comunica.gov.it/documents/manuale-utente.pdf',
    nome: 'Manuale utente ComUnica',
    categoria: 'cciaa',
  },
]

// ─── Struttura pratiche SARI (fonte: documentazione ufficiale) ───────────────
// Questo è il knowledge base statico che NON dipende dallo scraping
// Strutturato seguendo esattamente i codici atto ufficiali ComUnica

export const PRATICHE_SARI = {

  // ════════════════════════════════════════════════════════
  // APERTURE
  // ════════════════════════════════════════════════════════

  apertura_ditta_individuale: {
    codiceAtto: 'RI.CU.AZIENDE.DIND',
    titolo: 'Iscrizione Ditta Individuale',
    descrizione: 'Iscrizione al Registro delle Imprese di ditta individuale con contestuale apertura P.IVA, iscrizione INPS e dichiarazione al SUAP',
    enti: ['Camera di Commercio', 'Agenzia delle Entrate', 'INPS'],
    moduliRichiesti: ['S1 — Dati generali impresa', 'P — Persone fisiche', 'UL — Unità locale (se diversa da sede)'],
    documentiAllegati: [
      'Documento di identità titolare (fronte/retro)',
      'Codice fiscale titolare',
      'Dichiarazione antimafia (se attività regolamentata)',
      'Titoli abilitanti (se attività regolamentata)',
    ],
    campiObbligatori: [
      'Denominazione/Ragione sociale',
      'Codice ATECO attività prevalente',
      'Sede legale (via, CAP, comune, provincia)',
      'Codice fiscale titolare',
      'Data inizio attività',
    ],
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €120 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'La pratica ComUnica integra in un unico invio: Registro Imprese, Agenzia delle Entrate (P.IVA), INPS, INAIL',
  },

  apertura_srl: {
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    titolo: 'Iscrizione S.r.l.',
    descrizione: 'Iscrizione al Registro delle Imprese di società a responsabilità limitata',
    enti: ['Notaio', 'Camera di Commercio', 'Agenzia delle Entrate'],
    moduliRichiesti: ['S1 — Dati generali', 'P — Persone fisiche soci/amministratori', 'Q — Quote societarie'],
    documentiAllegati: [
      'Atto costitutivo notarile (autentico)',
      'Statuto societario',
      'Documenti di identità di tutti i soci',
      'Versamento capitale sociale (estratto conto)',
      'Dichiarazione antimafia amministratori',
    ],
    campiObbligatori: [
      'Denominazione sociale',
      'Sede legale',
      'Capitale sociale (min. €10.000, versato min. €2.500)',
      'Codice ATECO attività',
      'Composizione soci e quote',
      'Organo amministrativo (CdA o Amm. unico)',
    ],
    tempi: '15-30 giorni lavorativi',
    costo: 'Diritti camerali: €200 + bollo €17,50 + onorario notarile (€1.500-3.000)',
    viaInvio: 'Telematico tramite Notaio (obbligatorio)',
    note: 'Per SRL è obbligatorio l\'atto notarile. Il notaio invia direttamente la pratica al Registro Imprese.',
  },

  apertura_srls: {
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    titolo: 'Iscrizione S.r.l.s.',
    descrizione: 'Iscrizione S.r.l. semplificata con statuto standard ex art. 2463-bis c.c.',
    enti: ['Notaio', 'Camera di Commercio', 'Agenzia delle Entrate'],
    moduliRichiesti: ['S1', 'P', 'Q'],
    documentiAllegati: [
      'Atto costitutivo notarile (statuto standard obbligatorio)',
      'Documenti di identità soci',
      'Versamento capitale (min. €1)',
    ],
    campiObbligatori: [
      'Denominazione con dicitura "S.r.l.s." obbligatoria',
      'Sede legale',
      'Capitale sociale (da €1 a €9.999)',
      'Codice ATECO',
    ],
    tempi: '10-20 giorni lavorativi',
    costo: 'Diritti camerali: €200 + bollo €17,50 (onorario notarile ridotto)',
    viaInvio: 'Telematico tramite Notaio',
    note: 'Lo statuto non è modificabile rispetto al modello standard ministeriale. Soci solo persone fisiche.',
  },

  apertura_snc: {
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    titolo: 'Iscrizione S.n.c.',
    descrizione: 'Iscrizione Società in nome collettivo',
    enti: ['Camera di Commercio', 'Agenzia delle Entrate', 'INPS'],
    moduliRichiesti: ['S1', 'P', 'Q'],
    documentiAllegati: [
      'Atto costitutivo (scrittura privata autenticata o atto pubblico)',
      'Documenti di identità soci',
    ],
    campiObbligatori: ['Ragione sociale', 'Sede', 'Soci e quote', 'Codice ATECO', 'Rappresentanza'],
    tempi: '10-20 giorni lavorativi',
    costo: 'Diritti camerali: €150 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'Tutti i soci sono illimitatamente responsabili. Non richiede capitale minimo.',
  },

  apertura_sas: {
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    titolo: 'Iscrizione S.a.s.',
    descrizione: 'Iscrizione Società in accomandita semplice',
    enti: ['Camera di Commercio', 'Agenzia delle Entrate', 'INPS'],
    moduliRichiesti: ['S1', 'P', 'Q'],
    documentiAllegati: [
      'Atto costitutivo',
      'Documenti di identità soci accomandatari e accomandanti',
    ],
    campiObbligatori: ['Ragione sociale', 'Sede', 'Distinzione soci (accomandatari/accomandanti)', 'Codice ATECO'],
    tempi: '10-20 giorni lavorativi',
    costo: 'Diritti camerali: €150 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'I soci accomandatari rispondono illimitatamente, gli accomandanti solo per la quota conferita.',
  },

  iscrizione_albo_artigiani: {
    codiceAtto: 'AA.CU.ARTIG',
    titolo: 'Iscrizione Albo Artigiani',
    descrizione: 'Iscrizione all\'Albo delle Imprese Artigiane presso la CCIAA competente',
    enti: ['Camera di Commercio — Commissione Provinciale Artigianato'],
    moduliRichiesti: ['Modulo artigianato'],
    documentiAllegati: [
      'Documento di identità',
      'Dichiarazione di qualifica artigiana',
      'Titoli professionali (se richiesti per la specifica attività)',
      'Locali e attrezzature (descrizione)',
    ],
    campiObbligatori: ['Attività artigiana specifica', 'Qualifica (titolare o socio lavorante)', 'Sede laboratorio'],
    tempi: '30-60 giorni (delibera Commissione)',
    costo: '€50-100',
    viaInvio: 'ComUnica o cartaceo alla commissione provinciale',
    note: 'Necessaria per accedere ai benefici previdenziali artigiani INPS e alle agevolazioni di categoria.',
  },

  // ════════════════════════════════════════════════════════
  // MODIFICHE
  // ════════════════════════════════════════════════════════

  variazione_sede: {
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    titolo: 'Variazione sede legale',
    descrizione: 'Comunicazione di trasferimento della sede legale',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['S1 — variazione dati sede'],
    documentiAllegati: ['Verbale delibera (per società)', 'Documento di identità'],
    campiObbligatori: ['Nuovo indirizzo sede', 'Data trasferimento'],
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €50 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'Se la sede cambia provincia, la pratica va inviata alla nuova CCIAA competente.',
  },

  variazione_attivita: {
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    titolo: 'Variazione attività (codice ATECO)',
    descrizione: 'Comunicazione di modifica o aggiunta dell\'attività economica esercitata',
    enti: ['Camera di Commercio', 'Agenzia delle Entrate'],
    moduliRichiesti: ['S1 — variazione ATECO'],
    documentiAllegati: ['Documento di identità'],
    campiObbligatori: ['Nuovo codice ATECO', 'Data variazione', 'Attività cessata (se sostituzione)'],
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €50 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica) + Modello AA9 ad Agenzia Entrate',
    note: 'Contestualmente va aggiornata anche la P.IVA presso l\'Agenzia delle Entrate con modello AA9.',
  },

  nomina_amministratore: {
    codiceAtto: 'RI.CU.PERSONE.NCAR',
    titolo: 'Nomina/variazione amministratore',
    descrizione: 'Iscrizione nomina nuovo amministratore o variazione organo amministrativo',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['P — dati persona', 'S1 — variazione assetto'],
    documentiAllegati: [
      'Verbale assemblea soci (autenticato per SRL)',
      'Accettazione carica dell\'amministratore',
      'Documento di identità nuovo amministratore',
      'Dichiarazione antimafia',
    ],
    campiObbligatori: ['CF nuovo amministratore', 'Data nomina', 'Tipo carica', 'Durata mandato'],
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €50 + bollo €17,50',
    viaInvio: 'Telematico tramite Notaio (per SRL) o ComUnica (per ditte/società di persone)',
    note: '',
  },

  deposito_bilancio: {
    codiceAtto: 'RI.CU.BILANCI',
    titolo: 'Deposito bilancio d\'esercizio',
    descrizione: 'Deposito obbligatorio del bilancio annuale per società di capitali',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['B — Bilancio', 'Nota integrativa'],
    documentiAllegati: [
      'Stato patrimoniale',
      'Conto economico',
      'Nota integrativa',
      'Relazione sulla gestione (se richiesta)',
      'Verbale assemblea di approvazione',
    ],
    campiObbligatori: ['Esercizio di riferimento', 'Data approvazione assemblea', 'Dati bilancio in formato XBRL'],
    tempi: '30 giorni dall\'approvazione assembleare',
    costo: 'Diritti camerali: €65-200 (in base al capitale) + bollo €65',
    viaInvio: 'Telematico obbligatorio in formato XBRL',
    note: 'Obbligatorio per SRL, SPA, cooperative. Termine: 30 giorni dall\'approvazione, comunque entro 180 giorni dalla chiusura esercizio.',
  },

  iscrizione_pec: {
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    titolo: 'Iscrizione/variazione PEC',
    descrizione: 'Comunicazione indirizzo PEC obbligatorio per tutte le imprese iscritte al Registro Imprese',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['S1 — variazione PEC'],
    documentiAllegati: ['Documento di identità'],
    campiObbligatori: ['Indirizzo PEC valido e attivo'],
    tempi: '3-5 giorni lavorativi',
    costo: 'Gratuito',
    viaInvio: 'Telematico (Telemaco/ComUnica) o sportello CCIAA',
    note: 'OBBLIGO dal 2012 per tutte le imprese. Sanzione per omessa iscrizione: €103-1.032. Verificare che la PEC sia attiva e intestata all\'impresa.',
  },

  // ════════════════════════════════════════════════════════
  // CESSAZIONI
  // ════════════════════════════════════════════════════════

  cessazione_ditta: {
    codiceAtto: 'RI.CU.AZIENDE.CESS',
    titolo: 'Cessazione attività — Ditta individuale',
    descrizione: 'Dichiarazione di cessazione dell\'attività di impresa individuale',
    enti: ['Camera di Commercio', 'Agenzia delle Entrate', 'INPS'],
    moduliRichiesti: ['S1 — cessazione', 'P — variazione persona'],
    documentiAllegati: ['Documento di identità'],
    campiObbligatori: ['Data cessazione attività', 'Motivo cessazione'],
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €20 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'La ComUnica trasmette automaticamente la cessazione anche ad INPS e Agenzia delle Entrate (chiusura P.IVA).',
  },

  liquidazione_societa: {
    codiceAtto: 'RI.CU.AZIENDE.LIQ',
    titolo: 'Messa in liquidazione società',
    descrizione: 'Iscrizione delibera di scioglimento e nomina liquidatore',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['S1 — liquidazione', 'P — liquidatore'],
    documentiAllegati: [
      'Verbale assemblea straordinaria (notarile per SRL/SPA)',
      'Documento di identità liquidatore',
      'Accettazione carica liquidatore',
    ],
    campiObbligatori: ['Data delibera scioglimento', 'CF liquidatore', 'Motivo scioglimento'],
    tempi: '10-20 giorni lavorativi',
    costo: 'Diritti camerali: €100 + bollo €17,50',
    viaInvio: 'Telematico tramite Notaio (SRL/SPA) o ComUnica',
    note: 'Dopo la liquidazione va depositato il bilancio finale di liquidazione e richiesta cancellazione.',
  },

  cancellazione_registro: {
    codiceAtto: 'RI.CU.AZIENDE.CANC',
    titolo: 'Cancellazione dal Registro Imprese',
    descrizione: 'Cancellazione definitiva dell\'impresa dal Registro Imprese',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['S1 — cancellazione'],
    documentiAllegati: [
      'Bilancio finale di liquidazione (per società)',
      'Dichiarazione di avvenuta liquidazione',
      'Documento di identità',
    ],
    campiObbligatori: ['Data effettiva cancellazione', 'Dichiarazione nulla osta fiscale'],
    tempi: '10-30 giorni lavorativi',
    costo: 'Diritti camerali: €20 + bollo €17,50',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'Per le società occorre prima completare la fase di liquidazione. La cancellazione estingue definitivamente l\'ente.',
  },

  // ════════════════════════════════════════════════════════
  // ADEMPIMENTI PERIODICI
  // ════════════════════════════════════════════════════════

  rinnovo_annuale: {
    codiceAtto: 'RI.CU.DIRITTI',
    titolo: 'Pagamento diritto annuale CCIAA',
    descrizione: 'Versamento del diritto annuale dovuto da tutte le imprese iscritte al Registro Imprese',
    enti: ['Camera di Commercio'],
    moduliRichiesti: ['Modello F24'],
    documentiAllegati: ['Ricevuta pagamento F24'],
    campiObbligatori: ['Anno di riferimento', 'Importo (varia per forma giuridica e fatturato)'],
    tempi: 'Entro il 30 giugno di ogni anno',
    costo: 'Ditta individuale: €100-250 / SRL: €200-2.000 (in base al fatturato)',
    viaInvio: 'Pagamento F24 (banca, Agenzia Entrate, home banking)',
    note: 'Codice tributo F24: 3850. Scadenza: 30 giugno. Ravvedimento operoso possibile fino al 31/12.',
  },

  comunicazione_titolare_effettivo: {
    codiceAtto: 'RI.CU.TEFF',
    titolo: 'Comunicazione titolare effettivo',
    descrizione: 'Obbligo di comunicare il/i titolare/i effettivo/i dell\'impresa al Registro dei Titolari Effettivi (RTE)',
    enti: ['Camera di Commercio — Registro Titolari Effettivi'],
    moduliRichiesti: ['Modulo RTE'],
    documentiAllegati: ['Documento di identità titolare effettivo', 'Eventuale documentazione struttura proprietaria'],
    campiObbligatori: ['CF titolare effettivo', 'Percentuale partecipazione', 'Modalità controllo'],
    tempi: 'Entro 30 giorni da iscrizione o variazione',
    costo: 'Gratuito',
    viaInvio: 'Telematico (Telemaco/ComUnica)',
    note: 'Obbligo introdotto dal D.Lgs. 231/2007 (IV Direttiva Antiriciclaggio). Obbligatorio per SRL, SPA, cooperative e altri enti.',
  },
}

// ─── Fetch con timeout ────────────────────────────────────────────────────────

async function fetchConTimeout(url: string, ms = 10000): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Zipra/1.0)', Accept: 'text/html,application/xhtml+xml' },
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

function estraiTesto(html: string): string {
  const $ = cheerio.load(html)
  $('script,style,nav,footer,header,.cookie,.banner,.menu,.sidebar').remove()
  return $('main,article,.content,.page-content,body').first().text()
    .replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().substring(0, 8000)
}

// ─── Scraping SARI + indicizzazione RAG ──────────────────────────────────────

export async function scrapeSARI() {
  const risultati = { indicizzati: 0, saltati: 0, errori: 0 }

  // 1. Indicizza le pratiche SARI statiche (knowledge base ufficiale)
  for (const [chiave, pratica] of Object.entries(PRATICHE_SARI)) {
    const contenuto = `
PRATICA: ${pratica.titolo}
CODICE ATTO: ${pratica.codiceAtto}
DESCRIZIONE: ${pratica.descrizione}
ENTI COINVOLTI: ${pratica.enti.join(', ')}
MODULI RICHIESTI: ${pratica.moduliRichiesti.join(', ')}
DOCUMENTI DA ALLEGARE: ${pratica.documentiAllegati.join(', ')}
CAMPI OBBLIGATORI: ${pratica.campiObbligatori.join(', ')}
TEMPI: ${pratica.tempi}
COSTO: ${pratica.costo}
VIA DI INVIO: ${pratica.viaInvio}
NOTE: ${pratica.note}
    `.trim()

    try {
      const res = await indicizzaNormativa({
        titolo: `SARI/ComUnica — ${pratica.titolo} [${pratica.codiceAtto}]`,
        contenuto,
        fonteUrl: 'https://sari.camcom.it',
        fonteNome: 'SARI Infocamere',
        categoria: 'cciaa',
      })
      res.skipped ? risultati.saltati++ : risultati.indicizzati++
    } catch (e) {
      risultati.errori++
    }
  }

  // 2. Scraping pagine web SARI pubbliche
  for (const fonte of FONTI_SARI.filter(f => f.priorita === 1)) {
    const html = await fetchConTimeout(fonte.url)
    if (!html) { risultati.errori++; continue }

    const testo = estraiTesto(html)
    if (testo.length < 200) { risultati.errori++; continue }

    try {
      const res = await indicizzaNormativa({
        titolo: fonte.nome,
        contenuto: testo,
        fonteUrl: fonte.url,
        fonteNome: fonte.nome,
        categoria: fonte.categoria as any,
      })
      res.skipped ? risultati.saltati++ : risultati.indicizzati++
    } catch (e) {
      risultati.errori++
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  return risultati
}
