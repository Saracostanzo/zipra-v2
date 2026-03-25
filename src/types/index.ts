// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  nome: string
  cognome: string
  telefono?: string
  codice_fiscale?: string
  role: UserRole
  piano: 'base' | 'pro' | 'free'
  created_at: string
  firma_digitale_autorizzata: boolean
  firma_digitale_url?: string
}

// ─── Pratiche ────────────────────────────────────────────────────────────────

export type StatoPratica =
  | 'bozza'
  | 'in_revisione_admin'
  | 'inviata_utente'
  | 'in_revisione_utente'
  | 'approvata_utente'
  | 'in_invio'
  | 'inviata_ente'
  | 'completata'
  | 'respinta'
  | 'richiede_integrazione'

export type TipoInvio = 'automatico_api' | 'manuale_admin' | 'guidato_utente'

export interface Pratica {
  id: string
  user_id: string
  numero_pratica: string
  tipo_attivita: string
  forma_giuridica: string
  nome_impresa: string
  comune_sede: string
  provincia_sede: string
  codice_ateco: string
  descrizione_ateco: string
  stato: StatoPratica
  note_admin?: string
  note_utente?: string
  analisi_ai?: string
  created_at: string
  updated_at: string
  data_invio?: string
  data_completamento?: string
  user?: UserProfile
  checklist?: ChecklistItem[]
  documenti?: Documento[]
}

export interface ChecklistItem {
  id: string
  pratica_id: string
  titolo: string
  descrizione: string
  ente: string
  obbligatorio: boolean
  tipo_invio: TipoInvio
  stato: 'da_fare' | 'in_corso' | 'completata' | 'non_applicabile'
  tempi: string
  costo: string
  documenti_richiesti: string[]
  note?: string
  completato: boolean
  api_endpoint?: string
  order: number
}

export interface Documento {
  id: string
  pratica_id: string
  nome: string
  tipo: 'input_utente' | 'generato' | 'firmato' | 'inviato'
  url: string
  mime_type: string
  size: number
  created_at: string
  richiede_firma: boolean
  firmato: boolean
}

// ─── Notifiche ───────────────────────────────────────────────────────────────

export type TipoNotifica =
  | 'inviata_utente'
  | 'pratica_in_revisione'
  | 'pratica_approvata'
  | 'pratica_respinta'
  | 'pratica_completata'
  | 'adempimento_scadenza'
  | 'normativa_aggiornata'
  | 'firma_richiesta'
  | 'integrazione_richiesta'
  | 'sito_pronto'

export interface Notifica {
  id: string
  user_id: string
  tipo: TipoNotifica
  titolo: string
  messaggio: string
  letta: boolean
  pratica_id?: string
  azione_url?: string
  azione_label?: string
  created_at: string
  inviata_email: boolean
  inviata_sms: boolean
}

// ─── Adempimenti / Compliance ────────────────────────────────────────────────

export interface Adempimento {
  id: string
  titolo: string
  descrizione: string
  scadenza: string
  tipo: 'nazionale' | 'regionale' | 'comunale' | 'camerale'
  enti_interessati: string[]
  forme_giuridiche: string[]
  settori: string[]
  comuni?: string[]
  urgente: boolean
  fonte_url: string
  created_at: string
}

// ─── Normative (RAG) ─────────────────────────────────────────────────────────

export interface NormativaSource {
  id: string
  titolo: string
  contenuto: string
  fonte_url: string
  fonte_nome: string
  comune?: string
  provincia?: string
  tipo_attivita?: string
  categoria: 'suap' | 'cciaa' | 'agenzia_entrate' | 'inps' | 'asl' | 'vvf' | 'generale'
  data_scraping: string
  embedding?: number[]
}

// ─── Sito Vetrina ────────────────────────────────────────────────────────────

export interface SitoVetrina {
  id: string
  user_id: string
  pratica_id: string
  nome_dominio: string
  url_pubblicato?: string
  stato: 'generazione' | 'revisione' | 'pubblicato' | 'errore'
  colori: { primario: string; secondario: string; accento: string }
  font: string
  testi: {
    headline: string
    sottotitolo: string
    descrizione: string
    servizi: string[]
    orari?: string
    indirizzo?: string
  }
  logo_url?: string
  created_at: string
  updated_at: string
}

// ─── Wizard State ────────────────────────────────────────────────────────────

export interface WizardData {
  // Step 1
  descrizioneAttivita: string
  // Step 2
  tipoAttivita: string | null
  // Step 3
  formaGiuridica: string | null
  // Step 4
  nomeImpresa: string
  comuneSede: string
  provinciaSede: string
  haLocale: boolean | null
  serveAlimenti: boolean | null
  // Step 5
  nome: string
  cognome: string
  codiceFiscale: string
  email: string
  telefono: string
  // AI Results
  codiceAteco: string
  descrizioneAteco: string
  analisiAI: string
  checklist: ChecklistItem[]
}

// ─── Reiezioni ────────────────────────────────────────────────────────────────

export type StatoPraticaEsteso = StatoPratica | 'respinta_ente' | 'in_reinoltro' | 'reinoltrata'

export interface ReiezionePratica {
  id: string
  pratica_id: string
  checklist_item_id?: string
  ente: string
  motivo_reiezione: string
  dettagli_tecnici?: string
  data_reiezione: string
  correzioni_apportate?: string
  data_reinoltro?: string
  numero_protocollo_reinoltro?: string
  reinoltro_gratuito: boolean
  reinoltro_riuscito?: boolean
  note_admin?: string
  created_at: string
}

// ─── Tipi account business aggiornati ────────────────────────────────────────
// CAF, patronati e commercialisti hanno le stesse funzionalità Business:
// - Dashboard multi-cliente
// - Generazione siti vetrina con crediti mensili
// - Nessun onboarding firma (usano la propria firma professionale)
// - Piani Business e Business Pro

export type TipoAccountBusiness = 'caf' | 'commercialista' | 'agenzia' | 'patronato'
export const TIPI_BUSINESS: TipoAccountBusiness[] = ['caf', 'commercialista', 'agenzia', 'patronato']

export const LABEL_TIPO_ACCOUNT: Record<string, string> = {
  privato:         'Privato',
  caf:             'CAF — Centro Assistenza Fiscale',
  commercialista:  'Studio Commercialista',
  agenzia:         'Agenzia Pratiche',
  patronato:       'Patronato',
}
