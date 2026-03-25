/**
 * SEED NORMATIVE — Database completo per l'apertura di imprese in Italia
 *
 * Questo script popola il database con ~120 record di alta qualità:
 *
 *  1. SARI/ComUnica  — tutti i codici pratica del Registro Imprese
 *  2. SUAP           — procedure SCIA/autorizzazioni per attività
 *  3. Settori        — requisiti specifici per ogni attività regolamentata
 *  4. Forme giuridiche — obblighi per SRL, SAS, SNC, ditte individuali
 *  5. INPS/Fisco     — contributi, P.IVA, regimi fiscali
 *  6. Sanità/HACCP   — alimentare, estetica, sanitario
 *
 * Esegui con: npx ts-node scripts/seed-normative.ts
 * Oppure via API: POST /api/admin/seed-normative
 */

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
SETTORE: ${opts.settore}
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

function settore(
  titolo: string,
  opts: {
    legge: string
    descrizione: string
    requisiti: string
    documenti: string
    ente: string
    note?: string
    tipoAttivita?: string
  }
): SeedRecord {
  return {
    titolo: `SETTORE — ${titolo}`,
    contenuto: `ATTIVITÀ REGOLAMENTATA: ${titolo}
RIFERIMENTO NORMATIVO: ${opts.legge}
DESCRIZIONE: ${opts.descrizione}
REQUISITI OBBLIGATORI: ${opts.requisiti}
DOCUMENTI DA PRESENTARE: ${opts.documenti}
ENTE COMPETENTE: ${opts.ente}
${opts.note ? `NOTE: ${opts.note}` : ''}`.trim(),
    fonteUrl: 'https://www.impresainungiorno.gov.it',
    fonteNome: 'Normativa Nazionale Settori Regolamentati',
    categoria: 'generale',
    tipoAttivita: opts.tipoAttivita,
  }
}

// =============================================================================
// 1. SARI / COMUNICA — CODICI PRATICHE REGISTRO IMPRESE
// =============================================================================

const SARI_RECORDS: SeedRecord[] = [

  sari('RI.CU.IMPIND.INIZIO', 'Iscrizione imprenditore individuale — Inizio attività', {
    descrizione: 'Prima iscrizione nel Registro delle Imprese di un imprenditore individuale con contestuale inizio attività commerciale o artigianale.',
    enti: 'Camera di Commercio (Registro Imprese), Agenzia delle Entrate (P.IVA), INPS',
    moduli: 'I1 — dati imprenditore; modello AA9/12 Agenzia Entrate',
    documenti: 'Documento di identità, Codice Fiscale, eventuale abilitazione professionale se attività regolamentata',
    campi: 'Dati anagrafici, sede legale e operativa, oggetto attività, codice ATECO, data inizio',
    tempi: '1-5 giorni lavorativi per iscrizione RI; contestuale apertura P.IVA',
    costo: 'Diritti camerali: €18 + imposta di bollo €17,50. P.IVA gratuita.',
    via: 'Telematico via ComUnica (STAR) o Telemaco',
    note: 'ComUnica permette di inviare in un unico invio a Registro Imprese, Agenzia Entrate, INPS e INAIL.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.CU.IMPIND.MOD', 'Modifica dati imprenditore individuale', {
    descrizione: 'Comunicazione di variazione di dati relativi all\'imprenditore individuale: trasferimento sede, modifica oggetto, nuova unità locale, cambio denominazione.',
    enti: 'Camera di Commercio',
    moduli: 'I2 — modifica dati imprenditore',
    documenti: 'Documento di identità. Per trasferimento sede: eventuale contratto di locazione.',
    campi: 'Dati modificati, data variazione',
    tempi: '5-10 giorni lavorativi',
    costo: 'Diritti camerali: €18 + bollo €17,50',
    via: 'Telematico via Telemaco/ComUnica',
  }),

  sari('RI.CU.IMPIND.CESS', 'Cessazione attività imprenditore individuale', {
    descrizione: 'Cancellazione dal Registro delle Imprese per cessazione dell\'attività dell\'imprenditore individuale.',
    enti: 'Camera di Commercio, Agenzia delle Entrate (chiusura P.IVA), INPS',
    moduli: 'I3 — cessazione imprenditore',
    documenti: 'Documento di identità',
    campi: 'Data cessazione attività',
    tempi: '30 giorni dalla cessazione per obbligo di comunicazione',
    costo: 'Diritti camerali: €18 + bollo €17,50',
    via: 'Telematico via Telemaco/ComUnica',
    note: 'Contestualmente va chiusa la P.IVA (modello AA9/12) entro 30 giorni.',
  }),

  sari('RI.CU.SOC.COST.SRL', 'Costituzione SRL — Iscrizione Registro Imprese', {
    descrizione: 'Iscrizione nel Registro delle Imprese di una Società a Responsabilità Limitata di nuova costituzione.',
    enti: 'Camera di Commercio, Notaio (per atto costitutivo), Agenzia delle Entrate',
    moduli: 'S1 — dati società; allegare atto costitutivo e statuto',
    documenti: 'Atto costitutivo notarile, statuto, documento di identità soci e amministratori, codici fiscali',
    campi: 'Denominazione, sede legale, oggetto sociale, capitale sociale (min €1 o €10.000), soci, organo amministrativo',
    tempi: '10-20 giorni dalla presentazione del notaio',
    costo: 'Diritti camerali: €200 + bollo €65. Notaio: €1.500-€3.000. Tassa concessione governativa: €309,87 se capitale < €516.456,90.',
    via: 'Deposito notarile obbligatorio entro 20 giorni dall\'atto',
    note: 'Il capitale minimo è €1 per SRL semplificata (under 35 anni) e €10.000 per SRL ordinaria. La SRL semplificata ha costi notarili ridotti.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.CU.SOC.COST.SNC', 'Costituzione SNC — Iscrizione Registro Imprese', {
    descrizione: 'Iscrizione nel Registro delle Imprese di una Società in Nome Collettivo.',
    enti: 'Camera di Commercio',
    moduli: 'S1 con tipo società SNC',
    documenti: 'Contratto sociale (può essere anche scrittura privata autenticata o atto pubblico), documenti soci',
    campi: 'Denominazione, sede, oggetto, soci e loro poteri',
    tempi: '10-15 giorni',
    costo: 'Diritti camerali: €200 + bollo €65. Notaio opzionale (consigliato).',
    via: 'Telematico via Telemaco',
    note: 'In SNC tutti i soci rispondono solidalmente e illimitatamente delle obbligazioni sociali.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.CU.SOC.COST.SAS', 'Costituzione SAS — Iscrizione Registro Imprese', {
    descrizione: 'Iscrizione nel Registro delle Imprese di una Società in Accomandita Semplice.',
    enti: 'Camera di Commercio',
    moduli: 'S1 con tipo società SAS',
    documenti: 'Atto costitutivo, documenti tutti i soci (accomandatari e accomandanti)',
    campi: 'Denominazione (con nome di un socio accomandatario), sede, oggetto, distinzione soci',
    tempi: '10-15 giorni',
    costo: 'Diritti camerali: €200 + bollo €65',
    via: 'Telematico via Telemaco',
    note: 'Soci accomandatari: responsabilità illimitata e poteri di gestione. Soci accomandanti: responsabilità limitata alla quota.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.CU.SOC.COST.SPA', 'Costituzione SPA — Iscrizione Registro Imprese', {
    descrizione: 'Iscrizione nel Registro delle Imprese di una Società per Azioni.',
    enti: 'Camera di Commercio, Notaio (obbligatorio)',
    moduli: 'S1 con tipo società SPA',
    documenti: 'Atto costitutivo notarile, statuto, relazione di stima per conferimenti in natura',
    campi: 'Denominazione, sede, oggetto, capitale (min €50.000), azioni, organo di controllo',
    tempi: '15-30 giorni',
    costo: 'Diritti camerali: €200 + bollo €65. Notaio: €3.000-€8.000+. Capitale minimo: €50.000.',
    via: 'Deposito notarile obbligatorio',
    note: 'Richiede revisore/collegio sindacale obbligatorio da determinate soglie.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.IS.ARTIG', 'Iscrizione Albo Artigiani', {
    descrizione: 'Iscrizione all\'Albo delle Imprese Artigiane tenuto dalla Camera di Commercio. Obbligatoria per chi esercita artigianato come attività prevalente.',
    enti: 'Camera di Commercio (Albo Artigiani) + Commissione Provinciale Artigianato',
    moduli: 'APE — domanda iscrizione albo artigiani',
    documenti: 'Documento identità, codice fiscale, eventuale abilitazione professionale, contratto di locazione sede',
    campi: 'Dati titolare, tipo attività artigiana, sede, eventuale personale dipendente',
    tempi: '30-60 giorni (la Commissione Provinciale Artigianato deve deliberare)',
    costo: 'Contributo regionale variabile (€50-€200 a seconda della regione)',
    via: 'Sportello CCIAA o telematico',
    note: 'Necessaria per accedere a contributi artigiani INPS e agevolazioni regionali per artigiani.',
    tipoAttivita: 'artigianato',
  }),

  sari('RI.CU.UL.INIZIO', 'Apertura Unità Locale', {
    descrizione: 'Comunicazione di apertura di una sede secondaria, filiale, deposito o punto vendita aggiuntivo rispetto alla sede principale.',
    enti: 'Camera di Commercio della provincia dove si apre l\'unità locale',
    moduli: 'UL1 — apertura unità locale',
    documenti: 'Documento di identità legale rappresentante, contratto di locazione/atto di proprietà',
    campi: 'Indirizzo unità locale, tipo unità (sede secondaria, deposito, punto vendita), data apertura, attività svolta',
    tempi: '5-10 giorni',
    costo: 'Diritti camerali: €18 + bollo €17,50',
    via: 'Telematico via Telemaco',
    note: 'Va comunicata entro 30 giorni dall\'apertura. SUAP separato se l\'unità richiede autorizzazioni locali.',
    tipoAttivita: 'apertura_impresa',
  }),

  sari('RI.CU.UL.CESS', 'Chiusura Unità Locale', {
    descrizione: 'Comunicazione di cessazione di una unità locale (sede secondaria, filiale, deposito).',
    enti: 'Camera di Commercio',
    moduli: 'UL3 — cessazione unità locale',
    documenti: 'Documento di identità',
    campi: 'Indirizzo unità locale, data chiusura',
    tempi: '5-10 giorni',
    costo: 'Diritti camerali: €18 + bollo €17,50',
    via: 'Telematico via Telemaco',
    note: 'Comunicare anche eventuali autorizzazioni SUAP da chiudere.',
  }),

  sari('RI.CU.AZIENDE.TRASF', 'Trasferimento sede legale', {
    descrizione: 'Comunicazione di spostamento della sede legale dell\'impresa nello stesso Comune o in altro Comune della stessa provincia.',
    enti: 'Camera di Commercio',
    moduli: 'S2 per società o I2 per imprese individuali — variazione sede',
    documenti: 'Contratto di locazione o atto di proprietà nuova sede, documento identità',
    campi: 'Nuovo indirizzo sede legale, data trasferimento',
    tempi: '5-10 giorni',
    costo: 'Diritti camerali: €18-€50 + bollo €17,50',
    via: 'Telematico via Telemaco/ComUnica',
    note: 'Se il trasferimento è in altra provincia, la pratica va inviata alla NUOVA CCIAA competente.',
  }),

  sari('RI.CU.NOMIN.AMM', 'Nomina/Cessazione Amministratore', {
    descrizione: 'Comunicazione di nomina, revoca o dimissioni di amministratore (CEO, consigliere, liquidatore) di una società.',
    enti: 'Camera di Commercio',
    moduli: 'S5 — variazione organo amministrativo',
    documenti: 'Verbale assemblea/CdA di nomina o cessazione, accettazione nomina dell\'amministratore, documento identità',
    campi: 'Dati nuovo/cessato amministratore, tipo carica, data decorrenza, poteri conferiti',
    tempi: '5-15 giorni',
    costo: 'Diritti camerali: €50-€90 + bollo €17,50-€65',
    via: 'Telematico via Telemaco (spesso tramite notaio per SPA/SRL)',
    note: 'Da comunicare entro 30 giorni dalla nomina/cessazione. Il nuovo amministratore deve accettare espressamente la carica.',
  }),

  sari('RI.CU.SOC.MOD.CAP', 'Aumento/Riduzione capitale sociale', {
    descrizione: 'Comunicazione di delibera assembleare di aumento o riduzione del capitale sociale.',
    enti: 'Camera di Commercio, Notaio (obbligatorio per SPA, consigliato per SRL)',
    moduli: 'S4 — modifica atto costitutivo',
    documenti: 'Verbale assemblea notarile, statuto aggiornato, eventuale relazione stima (per conferimenti)',
    campi: 'Tipo operazione (aumento/riduzione), nuovo importo capitale, data delibera',
    tempi: '15-20 giorni',
    costo: 'Diritti camerali: €50-€200 + bollo €65. Notaio: €1.000-€3.000+.',
    via: 'Deposito notarile obbligatorio per SPA',
    note: 'Per SRL la riduzione sotto €10.000 richiede il rilascio del certificato che non vi sono procedure concorsuali.',
  }),

  sari('RI.CU.PESI.ABL', 'Abilitazione vendita prodotti alimentari e bevande', {
    descrizione: 'Comunicazione/abilitazione per esercitare il commercio al dettaglio o la somministrazione di alimenti e bevande.',
    enti: 'Camera di Commercio (requisiti professionali), SUAP Comune (autorizzazione commerciale)',
    moduli: 'Dichiarazione requisiti professionali + SCIA al SUAP',
    documenti: 'Attestato formazione (corso SAB 6h o 30h), o in alternativa esperienza maturata documentata, o titolo di studio equipollente',
    campi: 'Tipo attività (commercio dettaglio / somministrazione), sede, dati responsabile',
    tempi: 'SCIA: immediato. Autorizzazione: 30-60 giorni per grandi superfici.',
    costo: 'Corso SAB: €100-€300. SUAP: €0-€100 bollo.',
    via: 'SCIA telematica al SUAP comunale',
    note: 'Il corso SAB (Somministrazione Alimenti e Bevande) è di 6 ore per il commercio al dettaglio, 30 ore per la somministrazione (bar, ristoranti). Da ottobre 2012 (D.Lgs 147/2012) il requisito professionale non è più necessario per il commercio al dettaglio alimentare, ma è richiesto per la somministrazione.',
    tipoAttivita: 'alimentare',
  }),

  sari('RI.CU.SOC.DENOM', 'Modifica denominazione/ragione sociale', {
    descrizione: 'Comunicazione di variazione della denominazione o ragione sociale dell\'impresa.',
    enti: 'Camera di Commercio',
    moduli: 'S4 per società (modifica statuto) o I2 per ditta individuale',
    documenti: 'Verbale assemblea (per società), documento identità, nuovo statuto se necessario',
    campi: 'Nuova denominazione, data delibera/decorrenza',
    tempi: '5-15 giorni',
    costo: 'Diritti camerali: €50 + bollo €17,50-€65',
    via: 'Telematico via Telemaco',
    note: 'Verificare disponibilità denominazione: nessun\'altra impresa nella stessa provincia deve avere denominazione identica o simile che possa creare confusione.',
  }),

  sari('RI.CU.PROC.LIQ', 'Messa in liquidazione società', {
    descrizione: 'Comunicazione di delibera di scioglimento e messa in liquidazione della società.',
    enti: 'Camera di Commercio',
    moduli: 'S6 — liquidazione societaria',
    documenti: 'Verbale assemblea notarile di scioglimento, nomina liquidatori, statuto aggiornato',
    campi: 'Data delibera scioglimento, generalità liquidatori e loro poteri',
    tempi: '15-30 giorni',
    costo: 'Diritti camerali: €90-€200 + bollo €65. Notaio: €1.000-€2.000.',
    via: 'Deposito notarile',
    note: 'I liquidatori devono adempiere tutti gli obblighi fiscali e contributivi prima della cancellazione definitiva.',
  }),

  sari('RI.CU.PROC.CANC', 'Cancellazione definitiva dal Registro Imprese', {
    descrizione: 'Cancellazione dell\'impresa dal Registro delle Imprese al termine della procedura di liquidazione o per cessazione.',
    enti: 'Camera di Commercio, Agenzia delle Entrate (chiusura P.IVA), INPS',
    moduli: 'I3 per ditte individuali; S9 per società',
    documenti: 'Bilancio finale di liquidazione, dichiarazione liquidatori di avvenuto pagamento creditori',
    campi: 'Data cancellazione, dichiarazione assenza di rapporti giuridici pendenti',
    tempi: '15-30 giorni',
    costo: 'Diritti camerali: €18-€90 + bollo',
    via: 'Telematico via Telemaco o tramite notaio',
    note: 'Dopo la cancellazione dal RI vanno chiuse: P.IVA (entro 30 giorni), posizione INPS, eventuale Albo Artigiani.',
  }),

  sari('RI.CU.PEC.OBBL', 'Iscrizione/aggiornamento domicilio digitale (PEC)', {
    descrizione: 'Obbligo di iscrizione e aggiornamento dell\'indirizzo PEC (Posta Elettronica Certificata) nel Registro delle Imprese. Obbligatorio per tutte le imprese.',
    enti: 'Camera di Commercio',
    moduli: 'Comunicazione PEC tramite Telemaco',
    documenti: 'Nessuno — solo comunicazione PEC attiva e funzionante',
    campi: 'Indirizzo PEC valido e attivo',
    tempi: 'Immediato',
    costo: 'Gratuito (solo bollo €17,50 se comunicazione autonoma)',
    via: 'Telematico via Telemaco o portale imprese.gov.it',
    note: 'Dal 2024 è obbligatorio anche per gli amministratori di società. La PEC deve essere univoca per impresa/persona.',
  }),

  sari('RI.CU.TITOLARE', 'Dichiarazione Titolare Effettivo', {
    descrizione: 'Comunicazione dei titolari effettivi (beneficial owners) al Registro Imprese. Obbligatoria per società, trust e associazioni. D.Lgs 231/2007 come modificato dal D.Lgs 125/2019.',
    enti: 'Camera di Commercio — sezione speciale Titolari Effettivi',
    moduli: 'TE1 — prima comunicazione; TE2 — variazione; TE3 — cessazione',
    documenti: 'Documento identità titolari effettivi, documentazione che prova controllo/proprietà',
    campi: 'Dati anagrafici titolari effettivi, modalità controllo, percentuale partecipazione',
    tempi: '30 giorni dalla costituzione o dalla variazione',
    costo: 'Gratuito',
    via: 'Telematico via portale dedicato CCIAA',
    note: 'È titolare effettivo chi detiene o controlla più del 25% delle quote o dei diritti di voto.',
  }),

  sari('RI.CU.ATECO.MOD', 'Modifica codice ATECO', {
    descrizione: 'Comunicazione di variazione del codice ATECO (Classificazione Attività Economiche) a seguito di cambiamento dell\'attività prevalente.',
    enti: 'Camera di Commercio, Agenzia delle Entrate (P.IVA)',
    moduli: 'I2 per imprese individuali; S2 per società',
    documenti: 'Documento identità. Eventuale nuova abilitazione se l\'attività è regolamentata.',
    campi: 'Nuovo codice ATECO, descrizione attività, data variazione',
    tempi: '5-10 giorni',
    costo: 'Diritti camerali: €18 + bollo €17,50',
    via: 'Telematico via Telemaco. Contestuale variazione P.IVA ad Agenzia Entrate.',
    note: 'Dall\'1 aprile 2025 è in vigore la nuova classificazione ATECO 2025. Verificare il codice aggiornato.',
  }),

  sari('RI.CU.SOCIA', 'Modifica compagine sociale (entrata/uscita soci)', {
    descrizione: 'Comunicazione di variazione dei soci di una società: cessione quote, ingresso nuovo socio, recesso, esclusione.',
    enti: 'Camera di Commercio, Notaio (obbligatorio per cessione quote SRL)',
    moduli: 'S7 — variazione soci',
    documenti: 'Atto di cessione quote notarile (SRL: obbligo notaio o commercialista iscritto), libro soci aggiornato',
    campi: 'Dati cedente e cessionario, quote cedute, corrispettivo, data atto',
    tempi: '15-30 giorni dal deposito atto',
    costo: 'Diritti camerali: €50-€90 + bollo €65. Notaio: €500-€2.000.',
    via: 'Deposito notarile o tramite commercialista (per cessione quote senza notaio)',
    note: 'Per SRL: dal 2008 è possibile cedere quote anche con atto firmato digitalmente da un commercialista iscritto all\'OdC.',
  }),

  sari('RI.CU.QUALIF', 'Iscrizione qualifiche professionali speciali (acconciatori, estetisti, autoriparatori)', {
    descrizione: 'Iscrizione nell\'apposita sezione del Registro delle Imprese per imprese che svolgono attività che richiedono qualifiche professionali specifiche.',
    enti: 'Camera di Commercio',
    moduli: 'Modulo dichiarazione qualifiche professionali + eventuale iscrizione albo',
    documenti: 'Attestato abilitazione professionale (diploma, attestato corso riconosciuto, esperienza documentata), documento identità',
    campi: 'Tipo qualifica, numero certificato/attestato, ente che ha rilasciato l\'abilitazione',
    tempi: '10-30 giorni (verifica requisiti da parte della CCIAA)',
    costo: 'Incluso nei diritti camerali di iscrizione/variazione',
    via: 'Telematico via Telemaco con allegati digitalizzati',
    note: 'Per acconciatori: diploma scuola professionale + 3 anni praticantato, o 5 anni praticantato. Per estetisti: diploma 2 anni + tirocinio. Per autoriparatori: diploma + 2 anni praticantato.',
    tipoAttivita: 'qualifiche_professionali',
  }),

]

// =============================================================================
// 2. SUAP — PROCEDURE COMUNALI (procedure nazionali, applicabili ovunque)
// =============================================================================

const SUAP_RECORDS: SeedRecord[] = [

  suap('SCIA Apertura esercizio di vicinato (commercio al dettaglio < 150 mq)', {
    settore: 'Commercio al dettaglio',
    procedura: 'SCIA — Segnalazione Certificata di Inizio Attività',
    riferimentoNormativo: 'D.Lgs 114/1998 (Riforma Bersani), D.Lgs 59/2010, L.R. regionali commercio',
    enteDestinatario: 'SUAP del Comune dove si apre l\'attività',
    documentiRichiesti: 'SCIA compilata, documento identità titolare, abilitazione se alimenti, planimetria locale, contratto locazione, dichiarazione requisiti morali e professionali',
    tempi: 'Efficacia immediata dalla presentazione. Il Comune ha 60 giorni per inibire se non conforme.',
    costo: 'Bollo €16, diritti istruttori comunali €50-€300 (variabile per comune)',
    note: 'Superficie di vendita: fino a 150 mq nei comuni sotto 10.000 ab.; fino a 250 mq sopra 10.000 ab. (medie strutture richiedono autorizzazione). Non serve requisito professionale per il non-alimentare.',
    tipoAttivita: 'commercio',
  }),

  suap('SCIA Apertura bar, caffetteria, pub (somministrazione alimenti e bevande)', {
    settore: 'Somministrazione alimenti e bevande',
    procedura: 'SCIA con eventuale programmazione comunale',
    riferimentoNormativo: 'L. 287/1991, D.Lgs 59/2010, L.R. regionali',
    enteDestinatario: 'SUAP Comune',
    documentiRichiesti: 'SCIA, documento identità, attestato corso SAB 30 ore o esperienza documentata, planimetria locale con distinzione zone, dichiarazione HACCP, certificato agibilità, nulla osta sanitario ASL, licenza suoneria (SIAE se musica)',
    tempi: 'SCIA: attività dal giorno successivo. Comuni con programmazione: 30-90 giorni.',
    costo: 'Bollo €16, diritti istruttori €100-€500, eventuale tassa SIAE',
    note: 'Il requisito professionale per somministrazione è il corso SAB da 30 ore (o equipollente esperienza/titolo). Verificare programmazione comunale: alcuni comuni limitano il numero di esercizi.',
    tipoAttivita: 'alimentare',
  }),

  suap('SCIA Apertura ristorante, pizzeria, trattoria', {
    settore: 'Somministrazione alimenti e bevande — Ristorazione',
    procedura: 'SCIA con adempimenti sanitari e sicurezza',
    riferimentoNormativo: 'L. 287/1991, Reg. CE 852/2004 (HACCP), D.Lgs 193/2007',
    enteDestinatario: 'SUAP Comune, ASL (notifica sanitaria)',
    documentiRichiesti: 'SCIA, corso SAB 30h, planimetria con indicazione zone cucina/sala/magazzino, piano HACCP redatto da tecnico abilitato, notifica sanitaria ASL, agibilità, dotazione antincendio (CPI se > 100 coperti), sistema di aerazione cucina',
    tempi: 'Notifica sanitaria: efficacia immediata. CPI (se necessario): 60-90 giorni.',
    costo: 'Notifica ASL: €100-€300. CPI: €200-€1.000. Bollo + diritti comunali €200-€500.',
    note: 'Obbligatorio il piano HACCP (Analisi dei Rischi e Controllo dei Punti Critici) redatto e aggiornato. Formazione HACCP per tutti gli addetti alla manipolazione alimenti.',
    tipoAttivita: 'alimentare',
  }),

  suap('SCIA Apertura parrucchiere / acconciatore', {
    settore: 'Acconciatura',
    procedura: 'SCIA con dichiarazione requisiti professionali',
    riferimentoNormativo: 'L. 174/2005 (Disciplina dell\'attività di acconciatore), D.Lgs 114/1998',
    enteDestinatario: 'SUAP Comune + CCIAA (iscrizione albo)',
    documentiRichiesti: 'SCIA, abilitazione professionale (diploma professionale + 3 anni praticantato o 5 anni praticantato), planimetria locale, contratto locazione, dichiarazione igienico-sanitaria, dotazione attrezzature idonee',
    tempi: 'SCIA: attività dal giorno presentazione o successivo. CCIAA: 30 giorni per iscrizione albo.',
    costo: 'Bollo €16, diritti comunali €50-€200, iscrizione CCIAA inclusa nel diritto annuale.',
    note: 'L\'acconciatore deve essere presente durante l\'orario di attività o nominare un sostituto abilitato. Vietato il servizio a domicilio senza idonea attrezzatura mobile.',
    tipoAttivita: 'acconciatori',
  }),

  suap('SCIA Apertura centro estetico / estetista', {
    settore: 'Estetica',
    procedura: 'SCIA con dichiarazione requisiti e notifica ASL',
    riferimentoNormativo: 'L. 1/1990 (Disciplina dell\'attività di estetista), D.M. Sanità, L.R. regionali',
    enteDestinatario: 'SUAP Comune, ASL (per trattamenti invasivi)',
    documentiRichiesti: 'SCIA, diploma corso professionale estetista (2 anni), planimetria locale, attrezzature dichiarate (lista apparecchiature), contratto locazione, dichiarazione rispetto superfici minime regionali',
    tempi: 'SCIA: immediata. Per apparecchiature estetiche avanzate (laser, radiofrequenza): verifica regionale 30-60 giorni.',
    costo: 'Bollo €16, diritti comunali €50-€200',
    note: 'Le superfici minime variano per regione (tipicamente 15-20 mq per cabina). Alcune trattamenti richiedono supervisione medica (es. laser tipo 4). Verificare normativa regionale.',
    tipoAttivita: 'estetisti',
  }),

  suap('SCIA Apertura officina meccanica / autoriparazione', {
    settore: 'Autoriparazione',
    procedura: 'SCIA con iscrizione albo autoriparatori CCIAA',
    riferimentoNormativo: 'L. 122/1992 (Disciplina dell\'attività di autoriparazione)',
    enteDestinatario: 'SUAP Comune, CCIAA (albo autoriparatori)',
    documentiRichiesti: 'SCIA, abilitazione professionale (diploma specifico + 2 anni praticantato o 5 anni praticantato), planimetria, vasca raccolta oli, contratto smaltimento rifiuti speciali, CPI se necessario',
    tempi: 'SCIA: immediata. Albo CCIAA: 30-60 giorni.',
    costo: 'Bollo €16, diritti comunali €100-€300, iscrizione albo CCIAA €100-€200',
    note: 'L\'albo si articola in 5 categorie: meccanica e motoristica; carrozzeria; elettrauto; gommista; centro revisioni. Proroga adeguamento requisiti meccatronica fino al 5 luglio 2026.',
    tipoAttivita: 'autoriparatori',
  }),

  suap('Autorizzazione NCC (Noleggio Con Conducente)', {
    settore: 'Trasporto persone',
    procedura: 'Autorizzazione comunale + iscrizione Ruolo Conducenti CCIAA',
    riferimentoNormativo: 'L. 21/1992 (Disciplina del servizio taxi e NCC), Regolamento comunale',
    enteDestinatario: 'Comune (autorizzazione NCC), CCIAA (Ruolo Conducenti)',
    documentiRichiesti: 'Domanda autorizzazione NCC al Comune, patente categoria B (min), iscrizione Ruolo Conducenti CCIAA (esame idoneità), veicolo omologato (max 9 posti), assicurazione RC auto con massimale elevato, visita medica idoneità',
    tempi: 'Esame Ruolo Conducenti: sessioni periodiche CCIAA (verifica calendario). Autorizzazione Comune: 30-90 giorni.',
    costo: 'Esame CCIAA: €100-€300. Autorizzazione Comune: variabile. Assicurazione NCC: €2.000-€5.000/anno.',
    note: 'Il Ruolo Conducenti è tenuto dalla CCIAA. Bisogna sostenere un esame di idoneità (topografia, norme di circolazione, educazione, conoscenza lingue). NCC deve rientrare alla rimessa dopo ogni servizio (differenza da taxi). La riforma del settore è in corso (L. 21/1992 modificata).',
    tipoAttivita: 'taxi_ncc',
  }),

  suap('SCIA Apertura B&B (Bed and Breakfast)', {
    settore: 'Ricettività turistica',
    procedura: 'SCIA o comunicazione al Comune + SUAP',
    riferimentoNormativo: 'L.R. regionali turismo (ogni regione ha normativa propria)',
    enteDestinatario: 'SUAP Comune, Regione/Provincia (CIR - Codice Identificativo Regionale)',
    documentiRichiesti: 'SCIA o comunicazione, planimetria abitazione con camere B&B, dichiarazione gestione familiare, CIR (da richiedere alla Regione/Provincia), dichiarazione rispetto requisiti igienico-sanitari, CCISS/Portale alloggiati (polizia)',
    tempi: 'SCIA: immediata. CIR: 15-30 giorni.',
    costo: 'Bollo €16, diritti comunali variabili, imposta soggiorno (a carico ospiti)',
    note: 'Il B&B ha carattere accessorio alla residenza del titolare (che deve abitarci). Massimo 3 camere e 6 posti letto nella maggior parte delle regioni. Per strutture più grandi: affittacamere o casa vacanze con diversa disciplina. Obbligo comunicazione presenze a ISTAT e Pubblica Sicurezza.',
    tipoAttivita: 'turismo',
  }),

  suap('SCIA Apertura agenzia di viaggio e turismo', {
    settore: 'Turismo — Agenzie',
    procedura: 'SCIA con autorizzazione regionale',
    riferimentoNormativo: 'D.Lgs 79/2011 (Codice del Turismo), L.R. regionali',
    enteDestinatario: 'SUAP Comune, Regione (licenza regionale)',
    documentiRichiesti: 'SCIA, direttore tecnico con qualifica (diploma o esame regionale), polizza assicurativa RC professionale, fideiussione bancaria (€75.000-€250.000), partecipazione a Fondo di Garanzia',
    tempi: '30-90 giorni per autorizzazione regionale',
    costo: 'Fideiussione: €75.000+. Polizza RC: €500-€2.000/anno. Tassa regionale variabile.',
    note: 'Obbligatoria la figura del Direttore Tecnico abilitato. Le agenzie che vendono solo prodotti di altri operatori (agenti) hanno disciplina semplificata.',
    tipoAttivita: 'turismo',
  }),

  suap('SCIA Apertura studio medico / ambulatorio', {
    settore: 'Sanitario',
    procedura: 'Autorizzazione ASL + SCIA Comune',
    riferimentoNormativo: 'D.Lgs 502/1992, D.P.R. 14/1/1997 (requisiti minimi strutture sanitarie), L.R. regionali',
    enteDestinatario: 'ASL (autorizzazione sanitaria), SUAP Comune, Ordine Professionale',
    documentiRichiesti: 'Domanda autorizzazione ASL, planimetria con requisiti tecnici (superfici, ventilazione), dichiarazione requisiti strutturali e tecnologici, elenco attrezzature, iscrizione albo professionale medico/odontoiatra, assicurazione RC professionale',
    tempi: '60-180 giorni per autorizzazione sanitaria',
    costo: 'Imposta bollo + diritti ASL €200-€1.000',
    note: 'I requisiti minimi strutturali e tecnologici variano per tipo di specialità. Obbligo informativa GDPR per trattamento dati sanitari. Obbligo sistemi di pagamento tracciabili.',
    tipoAttivita: 'sanitario',
  }),

  suap('SCIA Apertura palestra / centro fitness', {
    settore: 'Sport e benessere',
    procedura: 'SCIA con requisiti sicurezza e tecnici',
    riferimentoNormativo: 'D.M. 18/03/1996 (norme antincendio palestre), L. 4/2013 (professioni non organizzate)',
    enteDestinatario: 'SUAP Comune, VVF (per superficie > 200 mq o presenza spettatori)',
    documentiRichiesti: 'SCIA, planimetria conforme normativa antincendio, dotazione estintori e sistemi emergenza, certificazioni istruttori (L. 4/2013), eventuale CPI (Certificato Prevenzione Incendi)',
    tempi: 'SCIA: immediata. CPI: 60-90 giorni.',
    costo: 'Bollo €16, diritti comunali, CPI €200-€800',
    note: 'Dal 2023 è obbligatorio per gli istruttori di fitness iscriversi all\'associazione di categoria (L. 4/2013) o dimostrare competenza specifica. Le palestre con piscina hanno ulteriori obblighi sanitari.',
    tipoAttivita: 'benessere',
  }),

  suap('SCIA Apertura lavanderia / tintoria', {
    settore: 'Servizi alla persona',
    procedura: 'SCIA con nulla osta ambientale',
    riferimentoNormativo: 'L. 84/2006 (disciplina lavanderie), normativa ambientale',
    enteDestinatario: 'SUAP Comune, ARPA/ASL (per uso solventi)',
    documentiRichiesti: 'SCIA, planimetria, sistema di ventilazione conforme, se uso percloroetilene: autorizzazione emissioni in atmosfera, contratto smaltimento rifiuti liquidi',
    tempi: 'SCIA: immediata. Autorizzazione emissioni: 60-90 giorni.',
    costo: 'Bollo €16, eventuali diritti ambientali',
    note: 'L\'uso di percloroetilene è soggetto a forti restrizioni ambientali. Molte lavanderie sono passate a sistemi acquosi o wet cleaning.',
    tipoAttivita: 'servizi_persona',
  }),

  suap('SCIA Apertura farmacia / parafarmacia', {
    settore: 'Farmaceutico',
    procedura: 'Autorizzazione ministeriale/regionale (farmacia) o SCIA (parafarmacia)',
    riferimentoNormativo: 'L. 475/1968 (farmacia), D.L. 223/2006 (parafarmacia), D.Lgs 219/2006',
    enteDestinatario: 'Regione/ASL (farmacia), SUAP Comune (parafarmacia)',
    documentiRichiesti: 'Per farmacia: concorso straordinario o trasferimento. Per parafarmacia: SCIA, iscrizione Ordine Farmacisti, planimetria, decreto nomina direttore',
    tempi: 'Farmacia: iter concorsuale molto lungo (anni). Parafarmacia: SCIA immediata.',
    costo: 'Farmacia: concorso, trasferimento (quotazioni alte). Parafarmacia: diritti comunali.',
    note: 'Le farmacie sono soggette a pianta organica comunale. Le parafarmacie possono vendere farmaci SOP e OTC ma non i farmaci soggetti a ricetta.',
    tipoAttivita: 'farmaceutico',
  }),

  suap('Comunicazione apertura attività artigianale', {
    settore: 'Artigianato',
    procedura: 'ComUnica + iscrizione Albo Artigiani + SCIA SUAP se necessaria',
    riferimentoNormativo: 'L. 443/1985 (legge quadro artigianato), L.R. regionali',
    enteDestinatario: 'CCIAA (Albo Artigiani tramite Commissione Provinciale), SUAP per autorizzazioni locali',
    documentiRichiesti: 'Domanda iscrizione albo, documentazione qualifica professionale, eventuale SCIA per locale',
    tempi: '30-60 giorni per iscrizione albo. SCIA: immediata.',
    costo: 'Contributo albo: €50-€200 (regionale)',
    note: 'L\'artigiano è chi esercita personalmente un\'attività manuale con prevalenza del lavoro proprio e dei familiari, senza fine speculativo. Limite dipendenti variabile per settore (max 22 per manifattura, 8 per costruzioni).',
    tipoAttivita: 'artigianato',
  }),

  suap('SCIA Apertura agenzia immobiliare', {
    settore: 'Intermediazione immobiliare',
    procedura: 'SCIA con iscrizione albo mediatori CCIAA',
    riferimentoNormativo: 'L. 39/1989 (mediatori), D.Lgs 59/2010',
    enteDestinatario: 'SUAP Comune, CCIAA (Ruolo Agenti di Affari in Mediazione)',
    documentiRichiesti: 'SCIA, iscrizione Ruolo Mediatori CCIAA (esame idoneità), polizza RC professionale (obbligatoria, min €1,5M), planimetria ufficio',
    tempi: 'Esame mediatori CCIAA: sessioni periodiche. SCIA: immediata dopo iscrizione.',
    costo: 'Esame CCIAA: €200-€500. Polizza RC: €500-€2.000/anno. Bollo + diritti comunali.',
    note: 'L\'agente immobiliare deve essere iscritto al Ruolo Agenti di Affari in Mediazione tenuto dalla CCIAA. Obbligo polizza RC professionale. Obbligo formazione continua.',
    tipoAttivita: 'mediatori',
  }),

  suap('SCIA Apertura studio di consulenza / commercialista / avvocato', {
    settore: 'Professioni regolamentate',
    procedura: 'Iscrizione Ordine Professionale + apertura studio (non richiede SUAP)',
    riferimentoNormativo: 'Normativa specifica per ogni ordine professionale',
    enteDestinatario: 'Ordine Professionale territoriale',
    documentiRichiesti: 'Laurea abilitante, esame di stato, iscrizione albo, comunicazione inizio attività all\'ordine',
    tempi: 'Varia per ordine: 30-90 giorni',
    costo: 'Quota iscrizione ordine: €100-€500/anno',
    note: 'Per studi legali, commercialisti, ingegneri, architetti, medici: iscrizione al rispettivo Ordine Professionale. Non sempre richiesto SUAP per lo studio (dipende da comune e tipo attività). Obbligo polizza RC professionale per molti ordini.',
    tipoAttivita: 'professioni_regolamentate',
  }),

  suap('Comunicazione inizio attività ambulante con posteggio fisso', {
    settore: 'Commercio ambulante',
    procedura: 'Autorizzazione + concessione posteggio comunale',
    riferimentoNormativo: 'D.Lgs 114/1998, D.Lgs 59/2010, L.R. regionali',
    enteDestinatario: 'SUAP Comune',
    documentiRichiesti: 'Domanda concessione posteggio, documento identità, iscrizione CCIAA, dichiarazione requisiti morali',
    tempi: '30-90 giorni; i posteggi fissi sono spesso soggetti a bandi',
    costo: 'Canone annuo posteggio (comunale), bollo, diritti istruttori',
    note: 'I posteggi fissi nei mercati sono contingentati e assegnati tramite bando. Diverso dal commercio itinerante (che richiede solo SCIA generale). Per alimentare: corso SAB obbligatorio.',
    tipoAttivita: 'commercio',
  }),

  suap('SCIA Apertura centro massaggi / shiatsu / discipline orientali', {
    settore: 'Benessere non sanitario',
    procedura: 'SCIA con distinzione benessere/sanitario',
    riferimentoNormativo: 'L. 4/2013 (professioni non organizzate), L.R. regionali benessere',
    enteDestinatario: 'SUAP Comune',
    documentiRichiesti: 'SCIA, planimetria, attestato formazione (almeno 500 ore per massaggio tradizionale), dichiarazione che le prestazioni non hanno finalità sanitarie/terapeutiche',
    tempi: 'SCIA: immediata',
    costo: 'Bollo €16, diritti comunali €50-€200',
    note: 'ATTENZIONE: i massaggi terapeutici (fisioterapia, osteopatia) richiedono laurea specifica e iscrizione ordine professionale. Il massaggio "benessere" è diverso. Molte regioni hanno disciplina specifica per centri benessere.',
    tipoAttivita: 'benessere',
  }),

]

// =============================================================================
// 3. SETTORI REGOLAMENTATI — Requisiti specifici per attività
// =============================================================================

const SETTORI_RECORDS: SeedRecord[] = [

  settore('Acconciatori — Requisiti, abilitazione e disciplina', {
    legge: 'L. 174/2005 — Disciplina dell\'attività di acconciatore',
    descrizione: 'L\'acconciatore esegue su capelli umani trattamenti di taglio, decolorazione, colorazione, arricciatura, ondulazione permanente, stiratura e similari. Include barbiere e parrucchiere.',
    requisiti: `1. Qualifica professionale obbligatoria: 
   - Diploma istituto professionale settore benessere (indirizzo acconciatura) + 1 anno tirocinio
   - OPPURE: 2 anni di praticantato + esame teorico-pratico abilitante
   - OPPURE: 5 anni di praticantato (senza esame) — solo per chi ha svolto praticantato entro 2015
   - OPPURE: riconoscimento qualifiche estere (procedura UE)
2. L\'abilitato deve essere fisicamente presente nell\'esercizio durante l\'orario di attività
3. Il sostituto (in caso di assenza temporanea) deve essere anch\'egli abilitato`,
    documenti: 'Diploma/attestato abilitazione, eventuale libretto praticantato vidimato CCIAA, documento identità',
    ente: 'CCIAA per iscrizione albo; SUAP per SCIA apertura esercizio',
    note: 'Non è possibile delimitare gli spazi dell\'esercizio: deve essere un locale unico senza separazioni fisiche con altre attività. Il servizio a domicilio è consentito solo con attrezzatura adeguata.',
    tipoAttivita: 'acconciatori',
  }),

  settore('Estetisti — Requisiti, abilitazione e discipline vietate', {
    legge: 'L. 1/1990 — Disciplina dell\'attività di estetista',
    descrizione: 'L\'estetista esegue trattamenti ed applicazioni cosmetici al corpo umano: massaggi estetici, trattamenti per l\'igiene e la cura del viso e del corpo, applicazione di prodotti cosmetici, epilazione, manicure, pedicure estetico.',
    requisiti: `1. Qualifica professionale obbligatoria:
   - Diploma istituto professionale (2 anni) + tirocinio
   - OPPURE: qualifica regionale dopo 2 anni formazione professionale + tirocinio
   - OPPURE: percorso di qualifica con 1000 ore formazione
2. Superfici minime del locale (variano per regione):
   - Cabina estetica: min 7-10 mq
   - Zona attesa: min 4 mq
   - Servizi igienici separati per clienti
3. Apparecchiature: solo quelle consentite per uso estetico non medico`,
    documenti: 'Diploma estetista riconosciuto, planimetria con indicazione superfici, elenco apparecchiature con marcatura CE',
    ente: 'SUAP per SCIA; eventuale ASL per apparecchiature elettromedicali avanzate',
    note: 'VIETATO eseguire: trattamenti che richiedono ausilio di attrezzature elettromedicali riservate alla medicina (laser classe 4, ecc.), trattamenti invasivi, atti di diagnosi. Alcune procedure (IPL, radiofrequenza avanzata) richiedono supervisione medica in alcune regioni.',
    tipoAttivita: 'estetisti',
  }),

  settore('Autoriparatori — Categorie, requisiti e albo', {
    legge: 'L. 122/1992 — Disciplina dell\'attività di autoriparazione',
    descrizione: 'L\'autoriparatore esegue attività di manutenzione, riparazione e sostituzione di parti su veicoli a motore e rimorchi.',
    requisiti: `L'albo autoriparatori è diviso in 5 categorie:
1. MECCANICA E MOTORISTICA: riparazioni motore, cambio, freni
   - Diploma tecnico settore meccanico/motoristico + 2 anni praticantato
   - OPPURE: 5 anni praticantato come dipendente qualificato
2. CARROZZERIA: riparazioni scocca e verniciatura
   - Stessi requisiti con specializzazione carrozzeria
3. ELETTRAUTO: impianti elettrici e elettronici
   - Diploma elettronico/elettrotecnico + 2 anni praticantato
4. GOMMISTA: pneumatici e cerchi
   - 3 anni praticantato
5. MECCATRONICA (nuova categoria): integra meccanica + elettronica
   - Entrata in vigore scaglionata; scadenza adeguamento 5 luglio 2026
Obblighi ambientali: vasca raccolta oli, contratto smaltimento rifiuti speciali, registro carico/scarico`,
    documenti: 'Diploma + libretto praticantato vidimato; contratto smaltimento rifiuti; planimetria con vasca olii',
    ente: 'CCIAA (Albo Autoriparatori), SUAP per apertura officina, ARPA per scarichi',
    note: 'Proroga adeguamento requisiti meccatronica: 5 luglio 2026. Il titolare abilitato deve essere presente durante l\'attività.',
    tipoAttivita: 'autoriparatori',
  }),

  settore('Taxi e NCC — Disciplina, Ruolo Conducenti e differenze', {
    legge: 'L. 21/1992 — Legge quadro servizio taxi e noleggio con conducente',
    descrizione: 'Disciplina il servizio pubblico non di linea: taxi (stazionamento su suolo pubblico, tariffa obbligatoria) e NCC (prenotazione presso rimessa, tariffa concordata).',
    requisiti: `TAXI:
1. Licenza comunale (bando pubblico — numero contingentato)
2. Iscrizione Ruolo Conducenti CCIAA (esame idoneità)
3. Patente B (min) con requisiti sanitari specifici
4. Visita medica periodica
5. Veicolo omologato taxi (verifiche periodiche)

NCC (Noleggio Con Conducente):
1. Autorizzazione comunale (non contingentata come taxi)
2. Iscrizione Ruolo Conducenti CCIAA
3. Rimessa obbligatoria nel Comune che rilascia l'autorizzazione
4. Obbligo di ritorno in rimessa dopo ogni servizio (no stazionamento taxi)
5. Assicurazione RC auto massimale elevato (min €15M)

ESAME RUOLO CONDUCENTI (CCIAA):
- Topografia locale, stradario
- Norme del codice della strada
- Nozioni di educazione e comportamento con clienti
- Conoscenza base 1 lingua straniera
- Date esami: verificare CCIAA provinciale (sessioni trimestrali/semestrali)`,
    documenti: 'Domanda iscrizione Ruolo, patente B, visita medica, documento identità, assicurazione veicolo',
    ente: 'CCIAA (Ruolo Conducenti), Comune (licenza taxi o autorizzazione NCC)',
    note: 'Il mercato taxi è molto contingentato: le licenze vengono messe a bando raramente. NCC è alternativa più accessibile. La riforma del settore (prevista) mira a liberalizzare parzialmente.',
    tipoAttivita: 'taxi_ncc',
  }),

  settore('Impiantisti — D.M. 37/2008 e categorie', {
    legge: 'D.M. 37/2008 — Riordino disposizioni in materia di attività di installazione impianti',
    descrizione: 'Disciplina l\'installazione, trasformazione, ampliamento e manutenzione degli impianti negli edifici.',
    requisiti: `L'impiantista abilitato può operare nelle seguenti categorie:
a) Impianti elettrici e protezione da scariche atmosferiche
b) Impianti radiotelevisivi, antenne, TVCC
c) Impianti di riscaldamento e climatizzazione
d) Impianti idrosanitari e gas in pressione
e) Impianti di sollevamento e trasporto (ascensori)
f) Impianti di protezione antincendio
g) Impianti di automazione porte/cancelli

REQUISITI PROFESSIONALI (almeno uno):
- Diploma tecnico pertinente + 2 anni esperienza settore
- Laurea tecnica pertinente + 1 anno esperienza
- 5 anni di esperienza alle dipendenze di impresa abilitata
- Iscrizione a ordine professionale pertinente (ingegnere, perito)

OBBLIGHI POST-LAVORO:
- Dichiarazione di conformità (D.C.) da consegnare al committente
- Progetto impianto (per impianti sopra soglie)`,
    documenti: 'Iscrizione CCIAA con categoria impiantista, diploma/attestati, dichiarazioni conformità da conservare',
    ente: 'CCIAA (iscrizione registro imprese con specifica attività impiantistica)',
    note: 'La Dichiarazione di Conformità è documento legalmente obbligatorio che certifica che l\'impianto è stato realizzato a regola d\'arte. Senza D.C. l\'impianto non può essere messo in servizio.',
    tipoAttivita: 'impiantisti',
  }),

  settore('Mediatori / Agenti di Affari in Mediazione — Albo e requisiti', {
    legge: 'L. 39/1989 — Mediatori. D.Lgs 26/2010 — recepimento direttiva servizi',
    descrizione: 'Il mediatore mette in relazione due o più parti per la conclusione di un affare (es. agente immobiliare, agente in servizi finanziari, agente di servizi vari).',
    requisiti: `1. Iscrizione Ruolo Agenti di Affari in Mediazione presso CCIAA
2. Esame di idoneità (se non in possesso di titolo equipollente)
3. POLIZZA RC PROFESSIONALE OBBLIGATORIA:
   - Agenti immobiliari: min €1.500.000 per sinistro
   - Agenti merci: min €250.000
4. Assenza di condanne penali per reati specifici
5. Non essere in stato di fallimento/insolvenza
6. Residenza o domicilio professionale in Italia

SEZIONI DEL RUOLO:
A) Agenti immobiliari e tecnici
B) Agenti in servizi di mediazione e spedizione
C) Agenti e mediatori merci
D) Agenti e mediatori per il mercato agroalimentare
E) Agenti e mediatori creditizi (con disciplina specifica BdI)`,
    documenti: 'Domanda iscrizione, diploma o superamento esame, polizza RC professionale, dichiarazione requisiti morali',
    ente: 'CCIAA (Ruolo Mediatori)',
    note: 'Gli agenti e mediatori creditizi (money transfer, leasing, mutui) hanno disciplina aggiuntiva della Banca d\'Italia.',
    tipoAttivita: 'mediatori',
  }),

  settore('Agenti e Rappresentanti di Commercio — AEC e iscrizione', {
    legge: 'D.Lgs 303/1991, L. 204/1985, Accordi Economici Collettivi (AEC)',
    descrizione: 'L\'agente di commercio promuove la conclusione di contratti per conto di una o più imprese preponenti, senza essere dipendente.',
    requisiti: `1. Iscrizione Ruolo Agenti e Rappresentanti di Commercio CCIAA
   (dal 2012 non è più richiesto esame obbligatorio per tutti — basta iscrizione)
2. Requisiti morali: assenza condanne per reati specifici
3. Non svolgere concorrenza alle aziende preponenti (salvo accordo)
4. Enasarco: iscrizione obbligatoria alla Fondazione Enasarco (previdenza)
5. Contratto di agenzia: obbligatoriamente in forma scritta`,
    documenti: 'Domanda iscrizione CCIAA, documento identità, dichiarazione requisiti',
    ente: 'CCIAA (Ruolo), Fondazione Enasarco (previdenza obbligatoria)',
    note: 'L\'agente mono-mandatario ha tutele diverse dal pluri-mandatario. Le provvigioni, indennità di fine rapporto e preavviso sono regolate dagli AEC di settore (es. AEC commercio, AEC industria).',
    tipoAttivita: 'agenti_commercio',
  }),

  settore('HACCP — Piano e obblighi per attività alimentari', {
    legge: 'Reg. CE 852/2004 (igiene prodotti alimentari), D.Lgs 193/2007',
    descrizione: 'HACCP (Hazard Analysis Critical Control Points) è il sistema obbligatorio di autocontrollo igienico-sanitario per tutte le imprese che producono, trasformano, distribuiscono o somministrano alimenti.',
    requisiti: `OBBLIGHI PER TUTTE LE ATTIVITÀ ALIMENTARI:
1. Piano HACCP scritto: analisi pericoli (biologici, chimici, fisici), identificazione CCP, limiti critici, monitoraggio, azioni correttive
2. Registro di controllo temperature (per alimenti conservati a temperatura controllata)
3. Formazione HACCP del personale:
   - Responsabile HACCP: formazione approfondita (8-24 ore + aggiornamenti)
   - Personale addetto: formazione base (4-8 ore)
   - Attestato formazione obbligatorio per ogni addetto
4. Notifica sanitaria all'ASL (Reg. CE 852/2004, art. 6)
5. Verifica annuale e aggiornamento piano in caso di cambiamenti

CHI È ESENTE: attività con sola vendita prodotti confezionati (tipo cartoleria+snack) — valutazione caso per caso`,
    documenti: 'Piano HACCP (redatto da consulente alimentare o internamente), attestati formazione, registro temperature',
    ente: 'ASL/SIAN (Servizio Igiene Alimenti e Nutrizione) — controlli ispettivi',
    note: 'Sanzioni per mancanza piano HACCP: da €1.000 a €60.000. Le ispezioni ASL sono senza preavviso. Il piano HACCP va aggiornato ogni volta che cambiano prodotti/processi.',
    tipoAttivita: 'alimentare',
  }),

  settore('Alimenti — Notifica sanitaria e registrazione stabilimento', {
    legge: 'Reg. CE 852/2004 art. 6, Reg. CE 853/2004, D.Lgs 193/2007',
    descrizione: 'Prima di iniziare l\'attività di produzione, trasformazione o distribuzione di alimenti, l\'operatore deve notificare la propria attività all\'autorità competente.',
    requisiti: `NOTIFICA SANITARIA (obbligatoria prima dell'avvio):
1. Presentare notifica al SUAP o direttamente all'ASL con:
   - Tipo di attività (produzione, trasformazione, distribuzione, somministrazione)
   - Elenco categorie alimenti trattati
   - Planimetria dei locali
   - Dati responsabile HACCP
2. L'ASL iscrive lo stabilimento nel Registro Nazionale degli Stabilimenti

REGISTRAZIONE vs RICONOSCIMENTO:
- REGISTRAZIONE: per la maggior parte delle attività (bar, ristoranti, negozi alimentari)
- RICONOSCIMENTO CE: obbligatorio per stabilimenti di produzione di alimenti di origine animale (macelli, caseifici, industria ittica)`,
    documenti: 'Modulo notifica sanitaria, planimetria, piano HACCP, documento identità',
    ente: 'ASL/Servizio Veterinario o SIAN, tramite SUAP',
    note: 'La notifica va rinnovata/aggiornata in caso di variazioni significative (cambio locali, nuovi processi). Il numero di registrazione sanitaria va indicato sulle etichette dei prodotti (per stabilimenti di produzione).',
    tipoAttivita: 'alimentare',
  }),

  settore('Sicurezza sul lavoro — D.Lgs 81/2008 obblighi base', {
    legge: 'D.Lgs 81/2008 (Testo Unico Sicurezza sul Lavoro) e successive modifiche',
    descrizione: 'Il D.Lgs 81/2008 stabilisce gli obblighi di tutela della salute e sicurezza dei lavoratori per tutti i datori di lavoro, inclusi i lavoratori autonomi in determinate condizioni.',
    requisiti: `OBBLIGHI MINIMI PER OGNI DATORE DI LAVORO:
1. DVR (Documento di Valutazione dei Rischi): obbligatorio per tutte le imprese con almeno 1 dipendente
2. Nomina RSPP (Responsabile Servizio Prevenzione Protezione):
   - Datore di lavoro può essere RSPP (fino a 30 dipendenti, per la maggior parte delle attività)
   - Richiede corso di formazione specifico per categoria
3. Nomina RLS (Rappresentante Lavoratori Sicurezza): se richiesto dai lavoratori
4. Medico competente: obbligatorio se ci sono rischi specifici (videoterminali, rumore, agenti chimici, ecc.)
5. Sorveglianza sanitaria: visite mediche periodiche se necessaria
6. Formazione sicurezza obbligatoria: entro 60 giorni dall'assunzione per ogni lavoratore
7. Informazioni e procedure emergenza: piano evacuazione, presidi antincendio

SEMPLIFICAZIONI PER MICRO-IMPRESE (fino a 10 dipendenti):
- DVR semplificato con autocertificazione (settori a basso rischio)`,
    documenti: 'DVR, nomina RSPP, registro formazione, verbali RLS, schede sicurezza sostanze pericolose',
    ente: 'ASL (vigilanza), INAIL (infortuni), Ispettorato del Lavoro',
    note: 'Sanzioni per mancanza DVR: da €2.500 a arresto. La formazione sicurezza deve essere documentata e conservata. Aggiornamento DVR obbligatorio in caso di cambiamenti organizzativi.',
    tipoAttivita: 'sicurezza_lavoro',
  }),

  settore('Privacy GDPR — Obblighi per imprese (Reg. UE 679/2016)', {
    legge: 'Reg. UE 2016/679 (GDPR), D.Lgs 101/2018 (adeguamento italiano)',
    descrizione: 'Il GDPR impone obblighi a tutte le imprese che trattano dati personali di persone fisiche residenti nell\'UE.',
    requisiti: `OBBLIGHI BASE PER OGNI IMPRESA:
1. Informativa privacy (privacy policy) da fornire a:
   - Clienti (anche sul sito web)
   - Dipendenti e collaboratori
   - Fornitori se persone fisiche
2. Registro dei trattamenti (obbligatorio per imprese > 250 dipendenti o per trattamenti sistematici)
3. Nomina DPO (Data Protection Officer): obbligatorio solo per PA e imprese che trattano dati sensibili su larga scala
4. Consenso: per newsletter, marketing diretto, cookie non tecnici
5. Data breach: notifica al Garante entro 72 ore in caso di violazione dati
6. Trasferimento dati extra-UE: solo verso paesi adeguati o con garanzie specifiche

SPECIFICI PER SETTORE:
- Sanitario: trattamento dati sensibili salute — misure rafforzate
- E-commerce: policy cookie, consenso newsletter
- Datori di lavoro: informativa dipendenti, gestione dati buste paga`,
    documenti: 'Informativa privacy, eventuale registro trattamenti, moduli consenso, nomina responsabili del trattamento',
    ente: 'Garante Privacy (vigilanza)',
    note: 'Sanzioni GDPR: fino a €20 milioni o 4% fatturato annuo globale. Il sito web deve avere cookie banner conforme e privacy policy aggiornata.',
    tipoAttivita: 'privacy',
  }),

  settore('Antiriciclaggio — Obblighi per professionisti e attività', {
    legge: 'D.Lgs 231/2007 (antiriciclaggio) come modificato dal D.Lgs 90/2017',
    descrizione: 'Normativa per prevenire il riciclaggio di denaro e il finanziamento del terrorismo. Si applica a professionisti, banche, intermediari e alcune imprese.',
    requisiti: `CHI È SOGGETTO:
- Banche e intermediari finanziari
- Commercialisti, avvocati, notai (per attività specifiche)
- Agenti immobiliari (per compravendite)
- Revisori contabili
- Dealer in beni di lusso (> €10.000 in contanti)

OBBLIGHI PRINCIPALI:
1. Adeguata verifica del cliente (KYC — Know Your Customer)
   - Identificazione cliente e titolare effettivo
   - Valutazione scopo del rapporto
2. Conservazione documenti: 10 anni
3. Segnalazione operazioni sospette alla UIF (Unità di Informazione Finanziaria)
4. Formazione del personale
5. Registro dei rapporti per banche e intermediari`,
    documenti: 'Fascicolo cliente con documenti KYC, registro operazioni, procedure interne antiriciclaggio',
    ente: 'UIF (Banca d\'Italia), Guardia di Finanza, MEF',
    note: 'LIMITE CONTANTI: dal 1° gennaio 2023 il limite per pagamenti in contanti è €5.000 (era €2.000 nel 2022). Per acquisti tra privati il limite non si applica, ma le banche segnalano comunque movimenti sospetti.',
    tipoAttivita: 'antiriciclaggio',
  }),

]

// =============================================================================
// 4. FORME GIURIDICHE — Confronto e obblighi
// =============================================================================

const FORME_GIURIDICHE_RECORDS: SeedRecord[] = [

  {
    titolo: 'Ditta Individuale — Caratteristiche, costi e obblighi',
    contenuto: `FORMA GIURIDICA: Ditta Individuale (Imprenditore Individuale)

DESCRIZIONE: L'imprenditore individuale esercita l'attività economica in proprio, senza distinzione patrimoniale tra patrimonio personale e aziendale.

CARATTERISTICHE PRINCIPALI:
- Unico titolare con responsabilità illimitata (risponde con tutto il patrimonio personale)
- Gestione autonoma e flessibile
- Forma più semplice e meno costosa per iniziare
- Adatta a piccole imprese individuali (artigiani, commercianti, professionisti con P.IVA)

COSTI DI COSTITUZIONE:
- Iscrizione CCIAA: €18 + bollo €17,50
- Apertura P.IVA: gratuita (Agenzia Entrate)
- TOTALE AVVIO: circa €50-€100

COSTI ANNUALI FISSI:
- Diritto annuale CCIAA: €88-€200 (in base al fatturato)
- INPS artigiani/commercianti: circa €3.600-€4.000/anno fisso (anche senza reddito)
- Commercialista (facoltativo ma consigliato): €500-€2.000/anno

REGIME FISCALE CONSIGLIATO:
- Forfettario (se fatturato < €85.000): aliquota 15% (5% per primi 5 anni); no IVA, no ISA, no IRAP
- Ordinario: IRPEF progressiva 23%-43%, IVA trimestrale/mensile

ADEMPIMENTI PRINCIPALI:
- Fatturazione elettronica (obbligatoria)
- Dichiarazione redditi (annuale)
- Versamento INPS (trimestrale)
- Eventuale IVA (se non forfettario)`,
    fonteUrl: 'https://www.registroimprese.it',
    fonteNome: 'Registro Imprese — Guide forme giuridiche',
    categoria: 'cciaa',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'SRL (Società a Responsabilità Limitata) — Caratteristiche e obblighi',
    contenuto: `FORMA GIURIDICA: SRL — Società a Responsabilità Limitata

DESCRIZIONE: Società di capitali con responsabilità limitata al capitale conferito. I soci non rispondono personalmente dei debiti sociali (salvo garanzie personali concesse a banche).

VARIANTI:
- SRL Ordinaria: capitale min €10.000 (75% all'atto, restante entro 90 giorni)
- SRL Semplificata (SRLS): capitale min €1, riservata a persone fisiche, atto costitutivo standard (no costi notarili ridotti)
- SRL Innovativa: agevolazioni per startup

COSTI DI COSTITUZIONE:
- Notaio: €1.500-€3.000 (SRL ordinaria); SRLS: €500-€1.000
- Diritti CCIAA: €200 + bollo €65
- Tassa concessione governativa: €309,87 (se capitale < €516.456,90)
- TOTALE: circa €2.000-€4.000 (SRL ordinaria)

COSTI ANNUALI FISSI:
- Diritto annuale CCIAA: €200-€2.000 (in base al fatturato)
- Commercialista (obbligatorio in pratica): €2.000-€8.000/anno
- Eventuale Collegio Sindacale (se sopra soglie): €3.000-€10.000/anno

VANTAGGI FISCALI:
- IRES: 24% sul reddito d'impresa
- IRAP: 3,9% (con agevolazioni per neoimprenditori)
- Possibilità di lasciare utili in società (tassazione ridotta vs distribuzione dividendi al 26%)

OBBLIGHI CONTABILI:
- Bilancio d'esercizio obbligatorio (stato patrimoniale, conto economico, nota integrativa)
- Deposito bilancio al Registro Imprese entro 30 giorni dall'approvazione assembleare
- Assemblea soci entro 120 giorni dalla chiusura esercizio (180 in casi particolari)`,
    fonteUrl: 'https://www.registroimprese.it',
    fonteNome: 'Registro Imprese — Guide forme giuridiche',
    categoria: 'cciaa',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'SNC e SAS — Società di persone: caratteristiche e differenze',
    contenuto: `FORME GIURIDICHE: SNC e SAS — Società di persone

SNC (Società in Nome Collettivo):
- Tutti i soci rispondono illimitatamente e solidalmente
- Adatta a piccole imprese con soci fidati
- Semplicità gestionale: tutti i soci sono amministratori (salvo diverso accordo)
- Fiscalmente trasparente: i redditi sono imputati ai soci (IRPEF)
- Costi: €200 + bollo €65 CCIAA; notaio consigliato (€500-€1.500)

SAS (Società in Accomandita Semplice):
- Due categorie di soci:
  * Accomandatari: responsabilità illimitata, gestione società
  * Accomandanti: responsabilità limitata alla quota, no gestione
- Adatta quando un socio apporta capitale senza voler gestire
- Denominazione sociale DEVE contenere il nome di almeno un accomandatario
- Stessa fiscalità trasparente di SNC

CONFRONTO RAPIDO FORME GIURIDICHE:
| Forma       | Responsabilità | Capitale min | Costo avvio | Tassazione      |
|-------------|---------------|--------------|-------------|-----------------|
| Ditta Ind.  | Illimitata     | Nessuno      | €50         | IRPEF 23-43%   |
| SNC/SAS     | Illimitata     | Nessuno      | €300-€1.500 | IRPEF soci     |
| SRL         | Limitata       | €1-€10.000   | €2.000-€4.000| IRES 24%      |
| SPA         | Limitata       | €50.000      | €5.000-€10.000| IRES 24%     |

QUANDO SCEGLIERE COSA:
- Attività piccola senza dipendenti: Ditta Individuale (forfettario)
- Due/tre soci, fiducia reciproca, piccola attività: SNC
- Socio attivo + socio investitore: SAS
- Tutela patrimonio personale, crescita prevista: SRL
- Impresa strutturata, investitori, quotazione: SPA`,
    fonteUrl: 'https://www.registroimprese.it',
    fonteNome: 'Registro Imprese — Guide forme giuridiche',
    categoria: 'cciaa',
    tipoAttivita: 'apertura_impresa',
  },

]

// =============================================================================
// 5. INPS / FISCO — Contributi e obblighi fiscali
// =============================================================================

const INPS_FISCO_RECORDS: SeedRecord[] = [

  {
    titolo: 'Regime Forfettario — Caratteristiche, limiti e accesso 2025',
    contenuto: `REGIME FISCALE: Regime Forfettario (L. 190/2014 e successive modifiche)

LIMITE DI ACCESSO:
- Ricavi/compensi anno precedente: max €85.000
- Spese per personale dipendente/co.co.co.: max €20.000
- Redditi da lavoro dipendente/pensione: max €30.000 (salvo cessazione rapporto)
- Partecipazione in società di persone: esclude il forfettario
- Attività prevalente non può essere con datore di lavoro precedente (nei 2 anni precedenti)

ALIQUOTE:
- 15% sul reddito imponibile (sostitutiva IRPEF, IRAP, addizionali)
- 5% per i PRIMI 5 ANNI di attività (nuova attività o ripresa dopo 3 anni di inattività)

COME SI CALCOLA IL REDDITO:
Reddito = Ricavi × Coefficiente di redditività (per ATECO)
Coefficienti principali:
- Commercio (46.xx-47.xx): 40%
- Attività professionali, scientifiche, tecniche (69-75): 78%
- Servizi alloggio e ristorazione (55-56): 40%
- Manifatturiero, costruzioni (10-43): 67%
- Intermediari del commercio (46.1x): 62%
- Altre attività economiche: 67%

VANTAGGI:
- Nessuna IVA (non si addebita, non si detrae)
- No ISA (ex studi di settore)
- No IRAP
- Fatturazione semplificata
- No ritenuta d'acconto subita (con dichiarazione al cliente)
- INPS contributi ridotti del 35% (per artigiani e commercianti)

SVANTAGGI:
- Nessuna deduzione dei costi reali
- Se si supera €85.000 in corso d'anno: uscita dal forfettario dall'anno successivo
  (se si supera €100.000: uscita immediata, con IVA per le operazioni eccedenti)
- Non conveniente con costi alti (es. acquisti ingenti, personale)`,
    fonteUrl: 'https://www.agenziaentrate.gov.it/portale/web/guest/regime-forfetario',
    fonteNome: 'Agenzia delle Entrate — Regime Forfettario',
    categoria: 'agenzia_entrate',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'Apertura Partita IVA — Procedura, codici ATECO e termini',
    contenuto: `PROCEDURA: Apertura Partita IVA

CHI DEVE APRIRE P.IVA:
- Chiunque svolga attività economica in modo abituale e continuativo
- Artigiani, commercianti, professionisti, imprenditori
- Non richiesta per: prestazioni occasionali fino a €5.000/anno (ma obbligo di ritenuta d'acconto da parte del committente)

COME APRIRE P.IVA:
1. Modello AA9/12 per persone fisiche (ditte individuali, liberi professionisti)
2. Modello AA7/10 per soggetti diversi (società, enti)
3. Presentazione:
   - Online: servizio telematico Agenzia Entrate (FISCONLINE o ENTRATEL)
   - Di persona: qualsiasi ufficio Agenzia Entrate
   - Tramite ComUnica (contestuale all'iscrizione CCIAA)
   - Tramite CAF/intermediario abilitato
4. GRATUITA — nessun costo
5. Effetto immediato: la P.IVA è attiva dal giorno stesso

CODICE ATECO:
- Classificazione delle attività economiche (edizione 2025 dal 1° aprile 2025)
- Determina: regime previdenziale, coefficiente forfettario, studi di settore
- Possibile indicare più codici (uno principale + secondari)
- Strumento ricerca ATECO: https://www.codiceateco.it o sito ISTAT

REGIME IVA:
- Liquidazione trimestrale (metodo storico): entro 16 del secondo mese dopo il trimestre
- Liquidazione mensile (se volume affari > €400.000 servizi / €800.000 beni)
- Versamento con F24

NUMERO P.IVA:
- 11 cifre: 7 cifre identificativo + 3 cifre codice ufficio + 1 cifra controllo
- Coincide con il codice fiscale per persone fisiche solo nei casi di nuovo rilascio`,
    fonteUrl: 'https://www.agenziaentrate.gov.it/portale/apertura-attivita',
    fonteNome: 'Agenzia delle Entrate — Apertura attività',
    categoria: 'agenzia_entrate',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'INPS Artigiani e Commercianti — Contributi obbligatori 2025',
    contenuto: `CONTRIBUTI INPS: Artigiani e Commercianti

CHI SI ISCRIVE:
- Gestione Artigiani: imprenditori che svolgono attività artigianale (iscritti Albo Artigiani)
- Gestione Commercianti: titolari/coadiuvanti di imprese commerciali, agenti, mediatori

CONTRIBUTI FISSI 2025 (approssimativi — verificare circolare INPS annuale):
- Contributo fisso annuale: circa €3.900-€4.200 (indipendentemente dal reddito)
  Suddiviso in 4 rate trimestrali (16/5, 20/8, 16/11, 16/2 anno successivo)
- Aliquota contributiva: circa 24% (artigiani) / 24,48% (commercianti)
  sul reddito eccedente il minimale (circa €17.000)
- Il contributo fisso è dovuto anche se non si produce reddito

MINIMALE E MASSIMALE 2025:
- Reddito minimale: circa €17.000
- Reddito massimale: circa €113.000 (oltre non si pagano contributi)

REGIME FORFETTARIO:
- Riduzione del 35% sui contributi INPS obbligatori
- Applicazione automatica con comunicazione preventiva a INPS

COME ISCRIVERSI:
- Contestualmente all'apertura P.IVA via ComUnica
- Oppure: INPS online — sezione "Lavoratori autonomi"
- Iscrizione entro 30 giorni dall'inizio attività

CODICE ATECO E GESTIONE:
- ATECO inizio con 45-47: Commercianti
- ATECO manifatturiero/artigiano: Artigiani
- ATECO misto: verifica quale prevalente`,
    fonteUrl: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti.html',
    fonteNome: 'INPS — Lavoratori autonomi e artigiani',
    categoria: 'inps',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'INPS Gestione Separata — Per liberi professionisti e collaboratori',
    contenuto: `CONTRIBUTI INPS: Gestione Separata (L. 335/1995)

CHI SI ISCRIVE:
- Liberi professionisti senza cassa professionale propria (informatici, consulenti, formatori, ecc.)
- Collaboratori coordinati e continuativi (Co.Co.Co.)
- Amministratori di società (se non pensionati)
- Venditori porta a porta
- Lavoratori autonomi occasionali (se > €5.000/anno)

ALIQUOTE 2025 (approssimativi):
- Professionisti senza altra copertura previdenziale: 26,23%
- Professionisti con altra copertura (pensionati, iscritti altra cassa): 24%
- Co.Co.Co.: 33% (1/3 a carico collaboratore, 2/3 a carico committente)

COME SI PAGA:
- Con la dichiarazione dei redditi (acconto 40%+40% in novembre-giugno, saldo)
- Oppure con contributo IVS trimestrale se previsto

CASSA PROFESSIONALE vs GESTIONE SEPARATA:
Alcune professioni hanno una propria cassa:
- Avvocati → Cassa Forense
- Medici → ENPAM
- Ingegneri/Architetti → Inarcassa
- Commercialisti → CNPADC
- Farmacisti → ENPAF
Chi è iscritto alla propria cassa NON si iscrive alla Gestione Separata (salvo specifici casi)

PRESTAZIONI:
- Pensione (dopo contribuzione sufficiente)
- Indennità malattia e maternità (limitata)
- Assegno unico figli (coordinato con INPS)`,
    fonteUrl: 'https://www.inps.it/it/it/datori-di-lavoro-e-aziende/autonomi-e-professionisti.html',
    fonteNome: 'INPS — Gestione Separata',
    categoria: 'inps',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'Fatturazione elettronica — Obblighi e regime di transizione',
    contenuto: `FATTURAZIONE ELETTRONICA: Obblighi e sistema SDI

OBBLIGO GENERALIZZATO:
- Dal 1° gennaio 2019: obbligatoria per tutti i titolari di P.IVA (B2B e B2C)
- Dal 1° luglio 2022: obbligatoria anche per forfettari sopra €25.000 di ricavi
- Dal 1° gennaio 2024: obbligatoria per TUTTI i forfettari (nessuna soglia)
- Eccezioni: operatori sanitari (per dati trasmessi al Sistema Tessera Sanitaria)

SISTEMA SDI (Sistema di Interscambio):
- Tutte le fatture passano tramite SDI dell'Agenzia delle Entrate
- Formato: XML/SDI (FPA per PA, FPR per privati)
- L'Agenzia Entrate conserva 10 anni le fatture

COME EMETTERE FATTURE ELETTRONICHE:
1. Software gestionale (es. Fatture in Cloud, Aruba, Teamystem)
2. Portale Fatture e Corrispettivi (gratuito) sul sito AE
3. App dedicata

CORRISPETTIVI TELEMATICI:
- Per chi ha scontrino/ricevuta fiscale: obbligo trasmissione telematica dei corrispettivi
- Registratori di cassa "RT" (telematici) obbligatori
- Trasmissione giornaliera all'Agenzia Entrate

CODICE DESTINATARIO:
- Privati consumatori: codice destinatario "0000000" + PEC se disponibile
- PA: Codice Univoco Ufficio (CUI)
- Professionisti/imprese: Codice SDI a 7 caratteri o PEC`,
    fonteUrl: 'https://www.agenziaentrate.gov.it/portale/web/guest/fatturazione-elettronica',
    fonteNome: 'Agenzia delle Entrate — Fatturazione elettronica',
    categoria: 'agenzia_entrate',
    tipoAttivita: 'apertura_impresa',
  },

  {
    titolo: 'Diritto Annuale CCIAA — Importi 2025 e modalità di pagamento',
    contenuto: `DIRITTO ANNUALE CCIAA: Obblighi e importi

COS'È:
Il diritto annuale è un tributo che tutte le imprese iscritte al Registro delle Imprese devono versare annualmente alla Camera di Commercio.

CHI PAGA:
- Tutte le imprese iscritte al Registro delle Imprese (incluse unità locali)
- Non pagano: liberi professionisti senza P.IVA, associazioni non profit

IMPORTI 2025 (fascia principale per sede legale):
- Imprese individuali (artigiani, commercianti):
  * Fino a €100.000 di fatturato: €88-€142 (varia per CCIAA)
  * Da €100.000 a €250.000: €200-€250
  * Oltre €250.000: aliquote progressive

- Società di persone (SNC, SAS):
  * Base: €200-€250

- Società di capitali (SRL, SPA):
  * Base: €200-€400 (cresce con fatturato)
  * SRL semplificata: riduzione 50% per primo anno

SCADENZA: 30 giugno di ogni anno (con F24)
ATTENZIONE a comunicazioni di pagamento ingannevoli: il diritto annuale si paga SOLO tramite F24, codice tributo 3850. Non rispondere a bollettini non ufficiali.

SANZIONI:
- Mancato pagamento: maggiorazione 30% + interessi
- Non è condizione per mantenere l'iscrizione (ma si accumula il debito)`,
    fonteUrl: 'https://www.registroimprese.it',
    fonteNome: 'Registro Imprese — Diritto Annuale',
    categoria: 'cciaa',
    tipoAttivita: 'apertura_impresa',
  },

]

// =============================================================================
// 6. ATECO 2025 — Codici principali e implicazioni
// =============================================================================

const ATECO_RECORDS: SeedRecord[] = [
  {
    titolo: 'ATECO 2025 — Aggiornamento e principali codici per nuove imprese',
    contenuto: `ATECO 2025: Nuova classificazione attività economiche

AGGIORNAMENTO 2025:
- Dal 1° aprile 2025 è in vigore la nuova classificazione ATECO 2025
- Sostituisce ATECO 2007 e le integrazioni precedenti
- Obbligo di aggiornamento per tutte le imprese con vecchio codice ATECO

CODICI PRINCIPALI NUOVE IMPRESE:

COMMERCIO AL DETTAGLIO (47.xx):
- 47.11 Supermercati e ipermercati
- 47.19 Commercio al dettaglio non specializzato
- 47.25.1 Commercio al dettaglio di bevande in esercizi specializzati
- 47.99 Commercio al dettaglio non in negozi (porta a porta, internet)

RISTORAZIONE E ALLOGGIO (55-56.xx):
- 55.10 Alberghi e strutture ricettive simili
- 55.20 Strutture ricettive per brevi soggiorni (B&B, agriturismo)
- 56.10.11 Ristorazione con somministrazione (ristoranti)
- 56.10.12 Pizzerie asporto/domicilio
- 56.30 Bar e altri esercizi simili senza cucina

SERVIZI ALLA PERSONA (96.xx):
- 96.02.01 Servizi di parrucchiera/acconciatura
- 96.02.02 Servizi di estetista
- 96.09.05 Servizi di tatuaggio e piercing

PROFESSIONI E CONSULENZA (69-74.xx):
- 69.10.10 Attività degli studi legali
- 69.20.11 Servizi contabilità (commercialisti)
- 70.22 Consulenza imprenditoriale e management
- 71.11 Attività degli studi di architettura
- 71.12.10 Attività degli studi di ingegneria civile

INFORMATICA E ICT (62-63.xx):
- 62.01 Produzione di software
- 62.02 Consulenza nel settore informatico
- 63.11 Elaborazione dei dati

TRASPORTI (49.xx):
- 49.32 Trasporto con taxi e NCC
- 49.41 Trasporto merci su strada

COSTRUZIONI (41-43.xx):
- 41.20 Costruzione di edifici
- 43.21 Installazione impianti elettrici
- 43.22 Installazione idraulica, riscaldamento, condizionamento`,
    fonteUrl: 'https://www.istat.it/it/archivio/17888',
    fonteNome: 'ISTAT — Classificazione ATECO 2025',
    categoria: 'generale',
    tipoAttivita: 'apertura_impresa',
  },
]

// =============================================================================
// SCRIPT PRINCIPALE
// =============================================================================

export async function seedNormative(): Promise<{
  totale: number
  successi: number
  saltati: number
  errori: string[]
}> {
  const tutti: SeedRecord[] = [
    ...SARI_RECORDS,
    ...SUAP_RECORDS,
    ...SETTORI_RECORDS,
    ...FORME_GIURIDICHE_RECORDS,
    ...INPS_FISCO_RECORDS,
    ...ATECO_RECORDS,
  ]

  console.log(`\n🌱 Seed normative avviato — ${tutti.length} record da inserire\n`)

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
        console.log(`  ⏭  Saltato (già presente): ${record.titolo.slice(0, 60)}`)
      } else {
        successi++
        console.log(`  ✅ Inserito: ${record.titolo.slice(0, 60)}`)
      }

      // Piccola pausa per non sovraccaricare Voyage AI
      await new Promise((r) => setTimeout(r, 300))
    } catch (e) {
      errori.push(`${record.titolo}: ${e}`)
      console.error(`  ❌ Errore: ${record.titolo}`, e)
    }
  }

  console.log(`\n📊 Seed completato:`)
  console.log(`   ✅ Inseriti: ${successi}`)
  console.log(`   ⏭  Saltati:  ${saltati}`)
  console.log(`   ❌ Errori:   ${errori.length}`)

  return { totale: tutti.length, successi, saltati, errori }
}

// Esecuzione diretta con ts-node
if (require.main === module) {
  seedNormative()
    .then((r) => {
      console.log('\nRisultato finale:', r)
      process.exit(r.errori.length > 0 ? 1 : 0)
    })
    .catch((e) => {
      console.error('Seed fallito:', e)
      process.exit(1)
    })
}
import { NextRequest, NextResponse } from 'next/server'

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
