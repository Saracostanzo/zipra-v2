/**
 * CATALOGO PRATICHE ZIPRA — Completo
 *
 * Include TUTTE le pratiche gestibili, non solo l'apertura.
 * Ogni pratica ha:
 *   - Prezzo Zipra (commissione)
 *   - Diritti enti (costi fissi da pagare agli enti)
 *   - Se inclusa nell'abbonamento Mantenimento
 *   - Se richiede notaio o commercialista (costo a parte)
 *   - Tempi medi
 *   - Codice atto ComUnica (se applicabile)
 */

export type CategoriaPratica =
  | 'apertura'
  | 'modifica'
  | 'cessazione'
  | 'societaria'
  | 'adempimento'
  | 'suap'
  | 'fiscale'
  | 'sanitario'
  | 'licenze'

export type ComplessitaPratica = 'semplice' | 'media' | 'complessa' | 'notarile'

export interface PraticaCatalogo {
  id: string
  titolo: string
  descrizione: string
  categoria: CategoriaPratica
  complessita: ComplessitaPratica
  // Pricing
  prezzoZipra: number           // commissione Zipra in €
  dirittiEnti: number           // costi fissi enti in € (approssimativi)
  inclusalMantenimento: boolean // se true, prezzo Zipra = 0 per abbonati
  scontoMantenimento: number    // percentuale sconto per abbonati (es. 0.2 = 20%)
  richiedeNotaio: boolean       // costo notaio a parte, da preventivare
  richiedeCommercialista: boolean // +€40 fisso
  costoNotaioStimato?: string   // range indicativo
  // Dettagli
  forme_giuridiche: string[]    // a quali forme si applica
  codiceAtto?: string           // codice ComUnica se applicabile
  tempiMedi: string
  documentiRichiesti: string[]
  note?: string
  // Per il chatbot — parole chiave per il matching
  keywords: string[]
  domandeTipiche: string[]      // come lo chiede l'utente
}

export const CATALOGO: PraticaCatalogo[] = [

  // ══════════════════════════════════════════════════════════════
  // APERTURA (già gestite dal wizard — qui per completezza catalogo)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'apertura_ditta',
    titolo: 'Apertura ditta individuale',
    descrizione: 'Iscrizione completa al Registro Imprese con Partita IVA, INPS e SUAP',
    categoria: 'apertura', complessita: 'media',
    prezzoZipra: 79, dirittiEnti: 137, inclusalMantenimento: false, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale'],
    codiceAtto: 'RI.CU.AZIENDE.DIND',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Documento identità', 'Codice fiscale'],
    keywords: ['aprire', 'apro', 'nuova impresa', 'ditta', 'partita iva', 'start', 'avviare'],
    domandeTipiche: ['voglio aprire una ditta', 'devo aprire partita iva', 'voglio avviare un\'attività'],
  },

  {
    id: 'apertura_srl',
    titolo: 'Costituzione S.r.l.',
    descrizione: 'Costituzione società a responsabilità limitata con atto notarile',
    categoria: 'apertura', complessita: 'notarile',
    prezzoZipra: 149, dirittiEnti: 500, inclusalMantenimento: false, scontoMantenimento: 0,
    richiedeNotaio: true, richiedeCommercialista: false,
    costoNotaioStimato: '€1.500 - €3.000',
    forme_giuridiche: ['srl'],
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    tempiMedi: '15-30 giorni lavorativi',
    documentiRichiesti: ['Documenti identità soci', 'Versamento capitale'],
    note: 'Il costo del notaio è separato e obbligatorio per legge',
    keywords: ['srl', 'società', 'costituire', 'fondare', 'soci', 'responsabilità limitata'],
    domandeTipiche: ['voglio aprire una srl', 'costituire una società', 'aprire con soci'],
  },

  // ══════════════════════════════════════════════════════════════
  // MODIFICHE
  // ══════════════════════════════════════════════════════════════

  {
    id: 'variazione_sede',
    titolo: 'Variazione sede legale',
    descrizione: 'Comunicazione trasferimento sede legale alla Camera di Commercio',
    categoria: 'modifica', complessita: 'semplice',
    prezzoZipra: 29, dirittiEnti: 67, inclusalMantenimento: true, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Nuovo indirizzo', 'Documento identità'],
    note: 'Se cambia provincia, la pratica va alla nuova CCIAA',
    keywords: ['sede', 'indirizzo', 'trasferimento', 'spostarsi', 'cambio sede', 'trasloco'],
    domandeTipiche: ['ho cambiato indirizzo', 'devo cambiare sede', 'mi sono trasferito', 'cambio sede legale'],
  },

  {
    id: 'variazione_ateco',
    titolo: 'Variazione codice ATECO / attività',
    descrizione: 'Modifica o aggiunta dell\'attività economica esercitata',
    categoria: 'modifica', complessita: 'semplice',
    prezzoZipra: 29, dirittiEnti: 67, inclusalMantenimento: true, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Nuova descrizione attività', 'Documento identità'],
    keywords: ['ateco', 'attività', 'cambio attività', 'aggiungere servizio', 'modifica attività', 'nuovo settore'],
    domandeTipiche: ['voglio aggiungere una nuova attività', 'devo cambiare ateco', 'ho cambiato settore'],
  },

  {
    id: 'variazione_pec',
    titolo: 'Variazione / iscrizione PEC',
    descrizione: 'Comunicazione o aggiornamento PEC al Registro Imprese',
    categoria: 'modifica', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    codiceAtto: 'RI.CU.AZIENDE.VARI',
    tempiMedi: '3-5 giorni lavorativi',
    documentiRichiesti: ['Indirizzo PEC attivo'],
    note: 'Gratuito — incluso in tutti i piani',
    keywords: ['pec', 'email certificata', 'casella pec', 'obbligo pec', 'registrare pec'],
    domandeTipiche: ['devo registrare la pec', 'ho cambiato pec', 'devo aggiornare la pec'],
  },

  {
    id: 'nomina_amministratore',
    titolo: 'Nomina / cambio amministratore',
    descrizione: 'Iscrizione nomina nuovo amministratore o variazione organo amministrativo',
    categoria: 'modifica', complessita: 'media',
    prezzoZipra: 39, dirittiEnti: 67, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.PERSONE.NCAR',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Verbale assemblea', 'Documento identità nuovo amministratore', 'Accettazione carica'],
    note: 'Per SRL serve verbale notarile se previsto dallo statuto',
    keywords: ['amministratore', 'nomina', 'cambio admin', 'rappresentante legale', 'nuovo direttore'],
    domandeTipiche: ['devo cambiare l\'amministratore', 'nominare un nuovo admin', 'cambio il rappresentante legale'],
  },

  {
    id: 'aggiunta_socio',
    titolo: 'Aggiunta / variazione soci',
    descrizione: 'Ingresso nuovo socio o variazione quote societarie',
    categoria: 'societaria', complessita: 'notarile',
    prezzoZipra: 79, dirittiEnti: 120, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: true, richiedeCommercialista: false,
    costoNotaioStimato: '€500 - €1.500',
    forme_giuridiche: ['srl', 'srls'],
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    tempiMedi: '15-25 giorni lavorativi',
    documentiRichiesti: ['Atto cessione quote (notarile)', 'Documenti identità', 'Delibera assemblea'],
    note: 'La cessione quote SRL richiede atto notarile o con firma autenticata',
    keywords: ['socio', 'soci', 'quote', 'cessione quote', 'nuovo socio', 'aggiungere socio', 'entrare in società'],
    domandeTipiche: ['devo aggiungere un socio', 'voglio cedere le quote', 'entra un nuovo socio nella mia srl'],
  },

  {
    id: 'aumento_capitale',
    titolo: 'Aumento capitale sociale',
    descrizione: 'Delibera e iscrizione aumento del capitale sociale',
    categoria: 'societaria', complessita: 'notarile',
    prezzoZipra: 69, dirittiEnti: 200, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: true, richiedeCommercialista: false,
    costoNotaioStimato: '€800 - €2.000',
    forme_giuridiche: ['srl', 'srls'],
    codiceAtto: 'RI.CU.AZIENDE.SOC',
    tempiMedi: '20-30 giorni lavorativi',
    documentiRichiesti: ['Delibera assemblea straordinaria', 'Attestazione versamento', 'Perizia (se conferimento in natura)'],
    keywords: ['capitale', 'aumento capitale', 'aumentare', 'conferimento', 'investimento'],
    domandeTipiche: ['devo aumentare il capitale', 'voglio aumentare il capitale sociale'],
  },

  {
    id: 'titolare_effettivo',
    titolo: 'Comunicazione titolare effettivo',
    descrizione: 'Iscrizione o aggiornamento nel Registro Titolari Effettivi (RTE)',
    categoria: 'adempimento', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.TEFF',
    tempiMedi: '3-7 giorni lavorativi',
    documentiRichiesti: ['Dati titolare effettivo', 'Percentuale partecipazione'],
    note: 'Obbligo D.Lgs. 231/2007 — sanzioni per omessa comunicazione',
    keywords: ['titolare effettivo', 'rte', 'registro titolari', 'antiriciclaggio', 'beneficial owner'],
    domandeTipiche: ['devo comunicare il titolare effettivo', 'obbligo titolare effettivo', 'registro antiriciclaggio'],
  },

  // ══════════════════════════════════════════════════════════════
  // CESSAZIONI
  // ══════════════════════════════════════════════════════════════

  {
    id: 'cessazione_ditta',
    titolo: 'Cessazione ditta individuale',
    descrizione: 'Chiusura completa: Registro Imprese, Partita IVA, INPS',
    categoria: 'cessazione', complessita: 'media',
    prezzoZipra: 29, dirittiEnti: 37, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'libero_professionista'],
    codiceAtto: 'RI.CU.AZIENDE.CESS',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Documento identità', 'Data cessazione attività'],
    note: 'La ComUnica trasmette automaticamente anche la chiusura P.IVA e INPS',
    keywords: ['chiudere', 'cessare', 'chiusura', 'smettere', 'liquidare', 'cessazione', 'chiudo la ditta'],
    domandeTipiche: ['voglio chiudere la ditta', 'devo cessare l\'attività', 'chiudo la partita iva', 'smetto di lavorare'],
  },

  {
    id: 'liquidazione_srl',
    titolo: 'Liquidazione e cancellazione S.r.l.',
    descrizione: 'Scioglimento, nomina liquidatore, liquidazione e cancellazione finale',
    categoria: 'cessazione', complessita: 'notarile',
    prezzoZipra: 69, dirittiEnti: 350, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: true, richiedeCommercialista: true,
    costoNotaioStimato: '€800 - €2.000',
    forme_giuridiche: ['srl', 'srls'],
    codiceAtto: 'RI.CU.AZIENDE.LIQ',
    tempiMedi: '60-180 giorni (processo lungo)',
    documentiRichiesti: ['Delibera scioglimento', 'Nomina liquidatore', 'Bilancio finale liquidazione'],
    note: 'Processo in più fasi: scioglimento → liquidazione → cancellazione. Richiede commercialista per il bilancio finale',
    keywords: ['liquidare', 'sciogliere', 'chiudere srl', 'cancellare', 'liquidazione', 'chiusura società'],
    domandeTipiche: ['voglio chiudere la srl', 'liquidare la società', 'sciogliere la srl'],
  },

  // ══════════════════════════════════════════════════════════════
  // ADEMPIMENTI PERIODICI
  // ══════════════════════════════════════════════════════════════

  {
    id: 'deposito_bilancio',
    titolo: 'Deposito bilancio d\'esercizio',
    descrizione: 'Deposito bilancio annuale in formato XBRL al Registro Imprese',
    categoria: 'adempimento', complessita: 'complessa',
    prezzoZipra: 49, dirittiEnti: 130, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: true,
    forme_giuridiche: ['srl', 'srls'],
    codiceAtto: 'RI.CU.BILANCI',
    tempiMedi: '10-15 giorni lavorativi',
    documentiRichiesti: ['Bilancio approvato', 'Verbale assemblea approvazione', 'Nota integrativa'],
    note: 'Scadenza: 30 giorni dall\'approvazione assembleare, max 180 giorni dalla chiusura esercizio. +€40 commercialista',
    keywords: ['bilancio', 'deposito bilancio', 'bilancio annuale', 'conto economico', 'stato patrimoniale', 'xbrl'],
    domandeTipiche: ['devo depositare il bilancio', 'bilancio annuale da depositare', 'scadenza bilancio'],
  },

  {
    id: 'diritto_annuale',
    titolo: 'Diritto annuale Camera di Commercio',
    descrizione: 'Guida e verifica pagamento diritto annuale CCIAA (modello F24)',
    categoria: 'adempimento', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    tempiMedi: 'Scadenza 30 giugno',
    documentiRichiesti: ['Modello F24'],
    note: 'Incluso nel Mantenimento — ti guidiamo nel calcolo e nel pagamento',
    keywords: ['diritto annuale', 'camera di commercio', 'cciaa', 'tassa annuale', 'f24 cciaa', '30 giugno'],
    domandeTipiche: ['devo pagare il diritto annuale', 'quanto pago alla camera di commercio', 'f24 cciaa'],
  },

  // ══════════════════════════════════════════════════════════════
  // SUAP / LICENZE
  // ══════════════════════════════════════════════════════════════

  {
    id: 'suap_modifica',
    titolo: 'Modifica autorizzazione SUAP',
    descrizione: 'Variazione di dati o condizioni dell\'autorizzazione già rilasciata',
    categoria: 'suap', complessita: 'media',
    prezzoZipra: 49, dirittiEnti: 100, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    tempiMedi: '15-30 giorni lavorativi',
    documentiRichiesti: ['Autorizzazione originale', 'Documentazione variazione'],
    keywords: ['suap', 'autorizzazione', 'modifica licenza', 'variazione attività', 'ampliamento', 'modifica locale'],
    domandeTipiche: ['devo modificare la mia autorizzazione', 'cambiare la licenza', 'ampliamento locale'],
  },

  {
    id: 'rinnovo_sanitario',
    titolo: 'Rinnovo / modifica autorizzazione sanitaria ASL',
    descrizione: 'Rinnovo notifica sanitaria o modifica condizioni per attività alimentari/sanitarie',
    categoria: 'sanitario', complessita: 'media',
    prezzoZipra: 49, dirittiEnti: 150, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    tempiMedi: '20-40 giorni lavorativi',
    documentiRichiesti: ['Autorizzazione sanitaria attuale', 'Piano HACCP aggiornato', 'Documentazione variazione'],
    keywords: ['asl', 'sanitario', 'haccp', 'rinnovo sanitario', 'autorizzazione sanitaria', 'alimenti', 'bar ristorante'],
    domandeTipiche: ['devo rinnovare l\'autorizzazione sanitaria', 'haccp scaduto', 'modifica bar ristorante asl'],
  },

  {
    id: 'trasformazione_societaria',
    titolo: 'Trasformazione societaria',
    descrizione: 'Trasformazione da una forma giuridica a un\'altra (es. ditta → SRL)',
    categoria: 'societaria', complessita: 'notarile',
    prezzoZipra: 149, dirittiEnti: 400, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: true, richiedeCommercialista: true,
    costoNotaioStimato: '€1.500 - €3.000',
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.AZIENDE.TRAS',
    tempiMedi: '30-60 giorni lavorativi',
    documentiRichiesti: ['Atto trasformazione (notarile)', 'Perizia stima patrimonio', 'Documenti identità'],
    note: 'Una delle operazioni più complesse. Richiede notaio + commercialista',
    keywords: ['trasformare', 'trasformazione', 'ditta in srl', 'snc in srl', 'cambiare forma giuridica'],
    domandeTipiche: ['voglio trasformare la ditta in srl', 'passare da snc a srl', 'cambiare forma societaria'],
  },

  {
    id: 'subentro_attivita',
    titolo: 'Subentro in attività esistente',
    descrizione: 'Acquisto e subentro in un\'attività commerciale già avviata',
    categoria: 'apertura', complessita: 'media',
    prezzoZipra: 79, dirittiEnti: 200, inclusalMantenimento: false, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls'],
    tempiMedi: '10-20 giorni lavorativi',
    documentiRichiesti: ['Contratto acquisto azienda', 'Documento identità', 'Visura cedente'],
    keywords: ['subentro', 'rilevare', 'acquistare attività', 'comprare negozio', 'rilevare bar', 'subentrare'],
    domandeTipiche: ['voglio rilevare un bar', 'subentro in un negozio', 'acquisto attività esistente'],
  },

  {
    id: 'cancellazione_registro',
    titolo: 'Cancellazione dal Registro Imprese',
    descrizione: 'Cancellazione definitiva dopo liquidazione o per ditta individuale',
    categoria: 'cessazione', complessita: 'media',
    prezzoZipra: 29, dirittiEnti: 37, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas'],
    codiceAtto: 'RI.CU.AZIENDE.CANC',
    tempiMedi: '10-20 giorni lavorativi',
    documentiRichiesti: ['Bilancio finale liquidazione', 'Dichiarazione nulla osta fiscale'],
    keywords: ['cancellare', 'cancellazione', 'eliminare dal registro', 'registro imprese cancellazione'],
    domandeTipiche: ['devo cancellarmi dal registro imprese', 'cancellazione registro imprese'],
  },
,

  // ══════════════════════════════════════════════════════════════
  // PRATICHE INPS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'inps_variazione',
    titolo: 'Variazione posizione INPS',
    descrizione: 'Comunicazione variazione dati, attività o reddito alla gestione INPS di competenza',
    categoria: 'adempimento', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    codiceAtto: 'AA.INPS.VARI',
    tempiMedi: '5-10 giorni lavorativi',
    documentiRichiesti: ['Documento identità', 'Dati variazione'],
    note: 'Inclusa nel piano Mantenimento',
    keywords: ['inps', 'variazione inps', 'cambio attività inps', 'aggiorna inps'],
    domandeTipiche: ['devo aggiornare i dati inps', 'variazione inps', 'cambio attività inps'],
  },

  {
    id: 'inps_cessazione',
    titolo: 'Cessazione posizione INPS',
    descrizione: 'Comunicazione di cessazione attività alla gestione INPS artigiani o commercianti',
    categoria: 'cessazione', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'libero_professionista'],
    codiceAtto: 'AA.INPS.CESS',
    tempiMedi: '5 giorni lavorativi',
    documentiRichiesti: ['Data cessazione attività'],
    note: 'Di solito trasmessa in automatico con la ComUnica di cessazione',
    keywords: ['cessazione inps', 'chiudere inps', 'smettere contributi inps'],
    domandeTipiche: ['devo chiudere la posizione inps', 'cessazione inps'],
  },

  {
    id: 'inps_malattia_autonomi',
    titolo: 'Domanda indennità malattia — autonomi',
    descrizione: 'Richiesta indennità di malattia per artigiani e commercianti iscritti INPS',
    categoria: 'adempimento', complessita: 'media',
    prezzoZipra: 29, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale'],
    tempiMedi: '10-20 giorni lavorativi',
    documentiRichiesti: ['Certificato medico con codice di malattia', 'Documento identità', 'IBAN'],
    note: 'Spetta dopo 3 giorni di malattia. Va presentata entro 2 giorni dalla fine della malattia.',
    keywords: ['malattia', 'indennità malattia', 'sono malato', 'sussidio malattia inps', 'artigiano malato'],
    domandeTipiche: ["sono malato e voglio l'indennità", 'domanda malattia inps', 'mi spetta qualcosa se sono malato'],
  },

  {
    id: 'inps_maternita_autonomi',
    titolo: 'Domanda maternità / paternità — autonomi',
    descrizione: 'Richiesta indennità di maternità o paternità per lavoratori autonomi e iscritti gestione separata',
    categoria: 'adempimento', complessita: 'media',
    prezzoZipra: 29, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'libero_professionista'],
    tempiMedi: '15-30 giorni lavorativi',
    documentiRichiesti: ['Certificato medico gravidanza o nascita', 'Documento identità', 'IBAN', 'Dichiarazione astensione attività'],
    note: 'Importo: 80% della retribuzione convenzionale per 5 mesi. Presentare almeno 3 mesi prima del parto.',
    keywords: ['maternità', 'paternità', 'congedo', 'gravidanza inps', 'nascita figlio inps', 'indennità maternità'],
    domandeTipiche: ['aspetto un figlio e voglio la maternità', 'domanda maternità inps', 'congedo parentale autonomi'],
  },

  {
    id: 'inps_assegno_unico',
    titolo: 'Assegno Unico Universale per i figli',
    descrizione: 'Domanda Assegno Unico INPS per i figli a carico (fino a 21 anni, illimitato per disabili)',
    categoria: 'adempimento', complessita: 'media',
    prezzoZipra: 19, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    tempiMedi: '30-45 giorni lavorativi',
    documentiRichiesti: ['ISEE in corso di validità', 'Documento identità', 'IBAN', 'Dati figli (CF, data nascita)'],
    note: "Si rinnova ogni anno a marzo. L'importo varia in base all'ISEE: da €57 a €175 per figlio al mese.",
    keywords: ['assegno unico', 'figli', 'bonus figli', 'assegno familiare', 'sussidio figli'],
    domandeTipiche: ["ho un figlio e voglio l'assegno unico", 'assegno unico universale', 'bonus figli inps'],
  },

  {
    id: 'inps_dis_coll',
    titolo: 'Domanda DIS-COLL (disoccupazione collaboratori)',
    descrizione: 'Indennità di disoccupazione per collaboratori coordinati e occasionali iscritti gestione separata',
    categoria: 'adempimento', complessita: 'media',
    prezzoZipra: 29, dirittiEnti: 0, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['libero_professionista'],
    tempiMedi: '30-60 giorni lavorativi',
    documentiRichiesti: ['Documento identità', 'IBAN', 'Documentazione fine rapporto'],
    note: "Va presentata entro 68 giorni dalla fine del rapporto. Spetta se hai almeno 1 mese di contributi nell'anno precedente.",
    keywords: ['dis-coll', 'disoccupazione', 'collaboratore', 'fine contratto', 'indennità disoccupazione', 'gestione separata'],
    domandeTipiche: ['ho perso il lavoro come collaboratore', 'domanda disoccupazione gestione separata', 'dis-coll inps'],
  },

  {
    id: 'inps_rateizzazione',
    titolo: 'Rateizzazione debiti contributivi INPS',
    descrizione: 'Richiesta di rateizzazione per il pagamento di contributi INPS arretrati',
    categoria: 'adempimento', complessita: 'media',
    prezzoZipra: 39, dirittiEnti: 0, inclusalMantenimento: false, scontoMantenimento: 0.2,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    tempiMedi: '30-60 giorni lavorativi',
    documentiRichiesti: ['Estratto conto contributivo INPS', 'Documento identità', 'Dichiarazione difficoltà economica'],
    note: "Fino a 60 rate mensili per importi oltre €3.000. Tasso di interesse 5,5% annuo.",
    keywords: ['rate inps', 'rateizzare inps', 'debiti inps', 'arretrati inps', 'pagare a rate inps'],
    domandeTipiche: ["devo dei soldi all'inps e voglio pagare a rate", 'rateizzazione inps', 'ho debiti inps'],
  },

  {
    id: 'inps_estratto_conto',
    titolo: 'Verifica estratto conto contributivo',
    descrizione: "Recupero e analisi dell'estratto conto contributivo INPS con verifica correttezza versamenti",
    categoria: 'adempimento', complessita: 'semplice',
    prezzoZipra: 0, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale', 'srl', 'srls', 'snc', 'sas', 'libero_professionista'],
    tempiMedi: '1-3 giorni lavorativi',
    documentiRichiesti: ['SPID o documento identità'],
    note: 'Incluso nel piano Mantenimento. Verifichiamo che i contributi siano stati correttamente accreditati.',
    keywords: ['estratto conto inps', 'contributi versati', 'verifica contributi', 'posizione inps', 'storia contributiva'],
    domandeTipiche: ['voglio vedere i miei contributi inps', 'estratto conto inps', 'quanti contributi ho versato'],
  },

  {
    id: 'inps_riduzione_under35',
    titolo: 'Riduzione contributi nuovi iscritti INPS (under 35)',
    descrizione: 'Domanda riduzione del 50% dei contributi INPS per i primi 3 anni di iscrizione alla gestione artigiani/commercianti',
    categoria: 'adempimento', complessita: 'semplice',
    prezzoZipra: 19, dirittiEnti: 0, inclusalMantenimento: true, scontoMantenimento: 0,
    richiedeNotaio: false, richiedeCommercialista: false,
    forme_giuridiche: ['ditta_individuale'],
    tempiMedi: '10-20 giorni lavorativi',
    documentiRichiesti: ['Documento identità', 'Prima iscrizione INPS (nessuna iscrizione precedente)'],
    note: 'Agevolazione per under 35 che si iscrivono per la prima volta. Riduzione 50% per 3 anni poi 25% per 2 anni.',
    keywords: ['riduzione contributi', 'under 35', 'agevolazione giovani inps', 'contributi ridotti', 'sgravio inps'],
    domandeTipiche: ['ho meno di 35 anni posso pagare meno inps', 'riduzione contributi under 35', 'agevolazione giovani inps'],
  },

]

// ─── Helper: calcola prezzo finale per abbonato ──────────────────────────────

export function calcolaPrezzo(
  pratica: PraticaCatalogo,
  isAbbonato: boolean
): { prezzoZipra: number; dirittiEnti: number; totale: number; notePrezzo: string } {

  let prezzoZipra = pratica.prezzoZipra

  if (isAbbonato && pratica.inclusalMantenimento) {
    prezzoZipra = 0
  } else if (isAbbonato && pratica.scontoMantenimento > 0) {
    prezzoZipra = Math.round(prezzoZipra * (1 - pratica.scontoMantenimento))
  }

  if (pratica.richiedeCommercialista) {
    prezzoZipra += 40
  }

  const totale = prezzoZipra + pratica.dirittiEnti

  let notePrezzo = ''
  if (pratica.richiedeNotaio) {
    notePrezzo = `+ costo notaio (${pratica.costoNotaioStimato ?? 'da preventivare'})`
  }
  if (isAbbonato && pratica.inclusalMantenimento) {
    notePrezzo = 'Inclusa nel tuo abbonamento Mantenimento'
  }

  return { prezzoZipra, dirittiEnti: pratica.dirittiEnti, totale, notePrezzo }
}

// ─── Helper: cerca pratiche per keyword ──────────────────────────────────────

export function cercaPratiche(query: string): PraticaCatalogo[] {
  const q = query.toLowerCase()
  return CATALOGO.filter(p =>
    p.keywords.some(k => q.includes(k) || k.includes(q)) ||
    p.domandeTipiche.some(d => d.toLowerCase().includes(q)) ||
    p.titolo.toLowerCase().includes(q) ||
    p.descrizione.toLowerCase().includes(q)
  ).slice(0, 5)
}

// ─── Raggruppa per categoria ──────────────────────────────────────────────────

export function getCatalogoPer(categoria: CategoriaPratica): PraticaCatalogo[] {
  return CATALOGO.filter(p => p.categoria === categoria)
}

export const CATEGORIE_INFO: Record<CategoriaPratica, { label: string; emoji: string; desc: string }> = {
  apertura:    { label: 'Apertura',       emoji: '🚀', desc: 'Nuove imprese e subentri' },
  modifica:    { label: 'Modifiche',      emoji: '✏️', desc: 'Variazioni dati, sede, attività' },
  cessazione:  { label: 'Cessazione',     emoji: '🔚', desc: 'Chiusura e cancellazione' },
  societaria:  { label: 'Societarie',     emoji: '⚖️', desc: 'Soci, quote, trasformazioni' },
  adempimento: { label: 'Adempimenti',    emoji: '📅', desc: 'Bilanci, diritti annuali, obblighi' },
  suap:        { label: 'SUAP / Comune',  emoji: '🏛️', desc: 'Licenze e autorizzazioni comunali' },
  fiscale:     { label: 'Fiscale',        emoji: '🧾', desc: 'Pratiche Agenzia Entrate' },
  sanitario:   { label: 'Sanitario',      emoji: '🏥', desc: 'ASL, HACCP, autorizzazioni sanitarie' },
  licenze:     { label: 'Licenze',        emoji: '📋', desc: 'Rinnovi e variazioni licenze' },
}