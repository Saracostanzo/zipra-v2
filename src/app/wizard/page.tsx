'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { cercaComuni, trovaComuneEsatto, type Comune } from '@/lib/comuni'
import { CATALOGO } from '@/lib/catalogo'

// ─── Autocomplete Comuni Italiani ─────────────────────────────────────────────
function ComuneAutocomplete({
  value,
  onChange,
}: {
  value: string
  onChange: (comune: string, provincia: string, cap: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [risultati, setRisultati] = useState<Comune[]>([])
  const [aperto, setAperto] = useState(false)
  const [selezionato, setSelezionato] = useState<Comune | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inizializzato = useRef(false)

  // Sincronizza se arriva un valore pre-impostato (es. dal chatbot)
  // Usa ref per triggerare anche al mount, non solo al cambio
  useEffect(() => {
    if (!value) return
    if (inizializzato.current && value === selezionato?.nome) return
    inizializzato.current = true

    setQuery(value)
    const trovato = trovaComuneEsatto(value)
    if (trovato) {
      setSelezionato(trovato)
      onChange(trovato.nome, trovato.provincia, trovato.cap)
    } else {
      const risultatiParziali = cercaComuni(value)
      if (risultatiParziali.length >= 1) {
        // Prendi il primo match (es. "Lecce" → Lecce LE)
        const primo = risultatiParziali[0]
        setSelezionato(primo)
        setQuery(primo.nome)
        onChange(primo.nome, primo.provincia, primo.cap)
      }
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chiudi dropdown se click fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAperto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = (v: string) => {
    setQuery(v)
    setSelezionato(null)
    if (v.length >= 2) {
      setRisultati(cercaComuni(v))
      setAperto(true)
    } else {
      setRisultati([])
      setAperto(false)
    }
    // Aggiorna comunque il valore nel form (anche parziale)
    onChange(v, '', '')
  }

  const seleziona = (c: Comune) => {
    setQuery(c.nome)
    setSelezionato(c)
    setAperto(false)
    setRisultati([])
    onChange(c.nome, c.provincia, c.cap)
  }

  return (
    <div ref={ref} className="relative">
      <label className="label-field">Comune *</label>
      <input
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => query.length >= 2 && setAperto(true)}
        placeholder="Inizia a scrivere il comune..."
        className="input-field"
        autoComplete="off"
      />

      {/* Dropdown risultati */}
      {aperto && risultati.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-z-card border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
          {risultati.map(c => (
            <button
              key={`${c.nome}-${c.provincia}`}
              onClick={() => seleziona(c)}
              className="w-full px-4 py-3 text-left hover:bg-white/8 transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-z-light font-medium text-sm">{c.nome}</span>
                <span className="text-z-muted/50 text-xs ml-2">{c.regione}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-z-muted/60">{c.cap}</span>
                <span className="text-xs font-bold bg-z-green/15 text-z-green px-2 py-0.5 rounded-full">{c.provincia}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chip del comune selezionato con provincia e CAP */}
      {selezionato && (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 bg-z-green/10 border border-z-green/25 rounded-full px-3 py-1.5">
            <span className="text-z-green text-xs">✓</span>
            <span className="text-z-light text-xs font-medium">{selezionato.nome}</span>
            <span className="text-z-green/70 text-xs font-mono">{selezionato.provincia}</span>
            <span className="text-z-muted/50 text-xs">{selezionato.cap}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const STORAGE_KEY = 'zipra_wizard_dati'

type StatoDocumento = 'non_caricato' | 'caricato' | 'skippato' | 'zipra_lo_fa' | 'in_caricamento'

interface DocumentoWizard {
  id: string
  nome: string
  descrizione: string
  obbligatorio: boolean
  fonte: 'utente' | 'zipra_api' | 'ente_pubblico' | 'professionista' | 'autogenerato'
  zipraLoCompila?: boolean
  comeOttenere?: string
  dove?: string
  tempiStimati?: string
  costoStimato?: string
  stato: StatoDocumento
  file?: File
  fileUrl?: string
  datiNecessari?: string[]
}

type DatiWizard = {
  idea: string; settore: string; forma_giuridica: string
  nome_impresa: string; comune_sede: string; provincia_sede: string
  ha_locale: boolean; serve_alimenti: boolean
  nome: string; cognome: string; codice_fiscale: string; email: string; telefono: string
}

const DATI_INIZIALI: DatiWizard = {
  idea: '', settore: '', forma_giuridica: 'ditta_individuale',
  nome_impresa: '', comune_sede: '', provincia_sede: '',
  ha_locale: false, serve_alimenti: false,
  nome: '', cognome: '', codice_fiscale: '', email: '', telefono: '',
}

const STEP_LABELS = ['Idea', 'Settore', 'Forma', 'Sede', 'Dettagli', 'Dati', 'Documenti']

// Icone fonte documento
const FONTE_CONFIG = {
  utente:        { icon: '📎', label: 'Carica tu', color: 'text-blue-400' },
  zipra_api:     { icon: '✨', label: 'Zipra lo recupera', color: 'text-z-green' },
  ente_pubblico: { icon: '🏛️', label: 'Da ente pubblico', color: 'text-amber-400' },
  professionista:{ icon: '👔', label: 'Da professionista', color: 'text-purple-400' },
  autogenerato:  { icon: '🤖', label: 'Zipra lo compila', color: 'text-z-green' },
}

// Card singolo documento
function CardDocumento({
  doc, onCarica, onSkippa, onZipraLoFa, onSpiega,
}: {
  doc: DocumentoWizard
  onCarica: (file: File) => void
  onSkippa: () => void
  onZipraLoFa: () => void
  onSpiega: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const fonteInfo = FONTE_CONFIG[doc.fonte]

  const statoColor = {
    non_caricato: '',
    caricato: 'border-green-400/30 bg-green-400/5',
    skippato: 'border-amber-400/20 bg-amber-400/5',
    zipra_lo_fa: 'border-z-green/30 bg-z-green/5',
    in_caricamento: 'border-white/15',
  }[doc.stato]

  return (
    <div className={`border p-5 transition-all ${statoColor || 'border-white/8 bg-z-mid'}`}>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={e => e.target.files?.[0] && onCarica(e.target.files[0])}
        className="hidden" />

      {/* Header documento */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono ${fonteInfo.color}`}>{fonteInfo.icon} {fonteInfo.label}</span>
            {doc.obbligatorio ? (
              <span className="text-[10px] font-mono text-red-400/70 bg-red-400/10 px-1.5 py-0.5">Obbligatorio</span>
            ) : (
              <span className="text-[10px] font-mono text-z-muted/40 bg-white/5 px-1.5 py-0.5">Opzionale</span>
            )}
          </div>
          <h4 className="font-head font-bold text-z-light text-sm">{doc.nome}</h4>
          <p className="text-xs text-z-muted/70 mt-0.5 leading-relaxed">{doc.descrizione}</p>
        </div>

        {/* Badge stato */}
        {doc.stato === 'caricato' && (
          <div className="shrink-0 flex items-center gap-1.5 text-green-400 text-xs font-mono bg-green-400/10 px-2 py-1">
            <span>✓</span> Caricato
          </div>
        )}
        {doc.stato === 'skippato' && (
          <div className="shrink-0 flex items-center gap-1.5 text-amber-400 text-xs font-mono bg-amber-400/10 px-2 py-1">
            <span>⏳</span> Dopo
          </div>
        )}
        {doc.stato === 'zipra_lo_fa' && (
          <div className="shrink-0 flex items-center gap-1.5 text-z-green text-xs font-mono bg-z-green/10 px-2 py-1">
            <span>✨</span> Zipra ci pensa
          </div>
        )}
      </div>

      {/* File caricato */}
      {doc.stato === 'caricato' && doc.file && (
        <div className="flex items-center gap-2 text-xs text-green-400/80 bg-green-400/8 px-3 py-2 mb-3">
          <span>📄</span>
          <span className="truncate">{doc.file.name}</span>
          <button onClick={() => fileRef.current?.click()}
            className="ml-auto shrink-0 underline opacity-60 hover:opacity-100">
            Cambia
          </button>
        </div>
      )}

      {/* Zipra lo fa — mostra dati necessari */}
      {doc.stato === 'zipra_lo_fa' && doc.datiNecessari && (
        <div className="text-xs text-z-green/70 bg-z-green/8 px-3 py-2 mb-3">
          Ci servirà solo: {doc.datiNecessari.join(', ')}
        </div>
      )}

      {/* Azioni */}
      {doc.stato === 'non_caricato' && (
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Zipra lo recupera via API */}
          {(doc.fonte === 'zipra_api' || doc.zipraLoCompila) && (
            <button onClick={onZipraLoFa}
              className="flex items-center gap-1.5 px-3 py-2 bg-z-green text-z-dark text-xs font-bold hover:bg-green-400 transition-all">
              ✨ Zipra ci pensa
            </button>
          )}

          {/* Carica file — per documenti utente o professionista */}
          {(doc.fonte === 'utente' || doc.fonte === 'professionista') && (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-all">
              📎 Allega ora
            </button>
          )}

          {/* Spiega come ottenerlo */}
          {(doc.comeOttenere || doc.dove) && (
            <button onClick={onSpiega}
              className="flex items-center gap-1.5 px-3 py-2 border border-white/8 text-z-muted text-xs hover:border-white/20 hover:text-z-light transition-all">
              💡 Come ottenerlo?
            </button>
          )}

          {/* Salta per dopo */}
          <button onClick={onSkippa}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/8 text-z-muted/50 text-xs hover:border-amber-400/30 hover:text-amber-400 transition-all ml-auto">
            ⏭ Allego dopo
          </button>
        </div>
      )}

      {/* Documento da ente pubblico — solo info */}
      {doc.stato === 'non_caricato' && doc.fonte === 'ente_pubblico' && (
        <div className="mt-3 bg-amber-400/5 border border-amber-400/15 p-3">
          <div className="text-xs text-amber-400/80 mb-2">
            🏛️ Questo documento si richiede presso: <strong>{doc.dove ?? 'ente pubblico'}</strong>
          </div>
          {doc.tempiStimati && (
            <div className="text-xs text-z-muted/50">⏱ Tempi: {doc.tempiStimati}</div>
          )}
          <button onClick={onSkippa}
            className="mt-2 text-xs text-amber-400 underline">
            Lo richiedo io, proseguo
          </button>
        </div>
      )}

      {/* Tempi e costi se skippato */}
      {doc.stato === 'skippato' && doc.tempiStimati && (
        <div className="mt-2 text-xs text-z-muted/40">
          ⏱ Quando lo hai, caricalo dalla dashboard
          {doc.costoStimato && ` · Costo stimato: ${doc.costoStimato}`}
        </div>
      )}
    </div>
  )
}

// Pannello "Come ottenerlo"
function PannelloSpiega({ doc, onClose }: { doc: DocumentoWizard; onClose: () => void }) {
  return (
    <div className="border border-z-green/25 bg-z-darker p-5 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-z-green uppercase tracking-wider">Come ottenerlo</span>
        <button onClick={onClose} className="text-z-muted/40 hover:text-z-muted">×</button>
      </div>
      <h4 className="font-bold text-z-light text-sm mb-2">{doc.nome}</h4>
      {doc.comeOttenere && (
        <p className="text-sm text-z-muted leading-relaxed mb-3">{doc.comeOttenere}</p>
      )}
      {doc.dove && (
        <div className="flex items-start gap-2 text-sm">
          <span className="text-amber-400 shrink-0">📍</span>
          <span className="text-z-muted">Dove: <strong className="text-z-light">{doc.dove}</strong></span>
        </div>
      )}
      {doc.tempiStimati && (
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-blue-400">⏱</span>
          <span className="text-z-muted">Tempi: <strong className="text-z-light">{doc.tempiStimati}</strong></span>
        </div>
      )}
      {doc.costoStimato && (
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className="text-green-400">💰</span>
          <span className="text-z-muted">Costo stimato: <strong className="text-z-light">{doc.costoStimato}</strong></span>
        </div>
      )}
    </div>
  )
}

export default function WizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [analisi, setAnalisi] = useState<any>(null)
  const [praticaId, setPraticaId] = useState<string | null>(null)
  const [documenti, setDocumenti] = useState<DocumentoWizard[]>([])
  const [docSpiega, setDocSpiega] = useState<string | null>(null)
  const [attivitaRegolamentata, setAttivitaRegolamentata] = useState<any>(null)
  const [dati, setDati] = useState<DatiWizard>(DATI_INIZIALI)
  const [daChatbot, setDaChatbot] = useState(false)
  const [erroreSubmit, setErroreSubmit] = useState<string | null>(null)
  const [pianoUtente, setPianoUtente] = useState<string | null>(null)
  const [pianoScelto, setPianoScelto] = useState<string>('') // piano scelto nella chat/URL
  const [praticaCatalogo, setPraticaCatalogo] = useState<any>(null)
  const [datiPersonaliGiaPresenti, setDatiPersonaliGiaPresenti] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const daChatParam = urlParams.get('da_chat') === '1'
    const pianoParam = urlParams.get('piano') || 'base'
    setPianoScelto(pianoParam)

    // Carica dati utente se loggato — pre-compila step 5 e salta a step successivo
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('piano, nome, cognome, codice_fiscale, telefono, email')
          .eq('id', user.id)
          .single()

        setPianoUtente(profile?.piano ?? 'free')

        // Pre-compila dati personali se li abbiamo già
        if (profile?.nome) {
          setDati(prev => ({
            ...prev,
            nome: profile.nome ?? prev.nome,
            cognome: profile.cognome ?? prev.cognome,
            codice_fiscale: profile.codice_fiscale ?? prev.codice_fiscale,
            telefono: profile.telefono ?? prev.telefono,
            email: user.email ?? prev.email,
          }))
          // Segnala che i dati personali sono già presenti — step 5 può essere saltato
          setDatiPersonaliGiaPresenti(true)
        }
      } else {
        setPianoUtente('free')
      }
    })

    if (daChatParam) {
      // Veniamo dal chatbot — puliamo SEMPRE localStorage per evitare
      // che una sessione wizard precedente già completata ci porti in dashboard
      localStorage.removeItem(STORAGE_KEY)

      const raw = sessionStorage.getItem('zipra_chatbot_contesto')
      sessionStorage.removeItem('zipra_chatbot_contesto')

      if (raw) {
        try {
          const ctx = JSON.parse(raw)
          // Cerca comune nel nostro DB per avere anche provincia e CAP
          const comuneTrovato = ctx.comune_sede ? trovaComuneEsatto(ctx.comune_sede) : null
          setDati(prev => ({
            ...prev,
            idea: ctx.idea || '',
            settore: ctx.settore || '',
            comune_sede: comuneTrovato?.nome || ctx.comune_sede || '',
            provincia_sede: comuneTrovato?.provincia || '',
            forma_giuridica: ctx.forma_giuridica || 'ditta_individuale',
          }))
          // Salta al primo step non ancora compilato
          if (ctx.idea && ctx.settore) {
            setStep(2)
          } else if (ctx.idea) {
            setStep(1)
          } else {
            setStep(0)
          }
          setDaChatbot(true)
        } catch {
          setStep(0)
        }
      } else {
        // sessionStorage vuoto (es. tab aperta di nuovo) → ricomincia da step 0
        setStep(0)
      }
      // In ogni caso non leggere localStorage se veniamo dal chatbot
      return
    }

    // Accesso diretto al wizard (non da chatbot) — leggi eventuale bozza
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Leggi bozza solo se NON è una pratica già completata (praticaId presente)
        if (parsed.dati && !parsed.praticaId) {
          setDati(parsed.dati)
          setStep(parsed.step ?? 0)
        }
      } catch {}
    }
    if (urlParams.get('auto') === '1' && saved) {
      try {
        const parsed = JSON.parse(saved)
        avviaCreazione(parsed.dati)
      } catch {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const aggiorna = (campo: string, valore: any) =>
    setDati(prev => ({ ...prev, [campo]: valore }))

  const avanti = () => setStep(s => Math.min(s + 1, 6))
  const indietro = () => { setStep(s => Math.max(s - 1, 0)); setErroreSubmit(null) }

  // Categorizza i documenti: Zipra gestisce il massimo possibile
  const categorizzaDocumento = (nome: string, idea: string, comune: string): Partial<DocumentoWizard> => {
    const n = nome.toLowerCase()

    // ── ZIPRA LO FA AUTOMATICAMENTE (zipra_api / autogenerato) ──────────

    if (n.includes('pec') || n.includes('posta elettronica certificata')) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra attiva e registra la PEC a tuo nome — non devi fare nulla.',
      datiNecessari: ['Codice fiscale', 'Nome impresa'],
    }
    if (n.includes('estratto contributivo') || n.includes('estratto inps')) return {
      fonte: 'zipra_api', zipraLoCompila: true,
      descrizione: 'Zipra lo recupera dal portale INPS con il tuo codice fiscale.',
      datiNecessari: ['Codice fiscale'],
    }
    if (n.includes('durc') || n.includes('documento unico di regolarità')) return {
      fonte: 'zipra_api', zipraLoCompila: true,
      descrizione: 'Zipra lo richiede all\'INPS automaticamente tramite portale telematico.',
      datiNecessari: ['Codice fiscale', 'P.IVA'],
    }
    if (n.includes('visura catastale') || n.includes('visura camerale')) return {
      fonte: 'zipra_api', zipraLoCompila: true,
      descrizione: 'Zipra la recupera dal Registro Imprese / Catasto in automatico.',
      datiNecessari: ['Codice fiscale o indirizzo immobile'],
    }
    if (n.includes('casellario giudiziale') || n.includes('certificato penale') || n.includes('carichi pendenti')) return {
      fonte: 'zipra_api', zipraLoCompila: true,
      descrizione: 'Zipra lo richiede al Ministero della Giustizia tramite portale intermediari.',
      datiNecessari: ['Codice fiscale', 'Data e luogo di nascita'],
    }
    if (n.includes('codice fiscale') || n.includes('tesserino fiscale')) return {
      fonte: 'zipra_api', zipraLoCompila: true,
      descrizione: 'Zipra verifica e recupera il codice fiscale dall\'Agenzia delle Entrate.',
      datiNecessari: ['Nome, cognome, data e luogo di nascita'],
    }
    if (n.includes('certificato di residenza') || n.includes('autocertificazione di residenza')) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra genera il modulo di autocertificazione precompilato — devi solo firmarlo.',
      datiNecessari: ['Indirizzo di residenza'],
    }
    if (n.includes('requisiti morali') || n.includes('art. 71') || n.includes('dichiarazione sostitutiva')) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra compila il modulo standard per la dichiarazione requisiti morali — devi solo firmarlo.',
    }
    if (n.includes('attestazione requisiti') && (n.includes('morali') || n.includes('professional'))) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra genera il modulo precompilato con i tuoi dati — ti chiediamo solo la firma.',
    }
    if (n.includes('scia') || n.includes('comunicazione inizio attività') || n.includes('comunica')) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra compila e invia la SCIA al SUAP del Comune per tuo conto.',
    }
    if (n.includes('modulo') || n.includes('modello') || n.includes('istanza') || n.includes('domanda di iscrizione')) return {
      fonte: 'autogenerato', zipraLoCompila: true,
      descrizione: 'Zipra compila il modulo ufficiale con i tuoi dati e lo invia all\'ente competente.',
    }

    // ── DA PROFESSIONISTA (non può farla Zipra, serve tecnico abilitato) ──

    if (n.includes('haccp') || n.includes('autocontrollo alimentare')) return {
      fonte: 'professionista',
      descrizione: 'Documento obbligatorio per chi manipola alimenti. Lo prepara un consulente HACCP.',
      comeOttenere: 'Consulente HACCP o tecnologo alimentare. Chiedi preventivo sul nostro portale.',
      tempiStimati: '1-2 settimane',
      costoStimato: '€300-800',
    }
    if (n.includes('conformità impianti') || n.includes('dichiarazione di conformità') || n.includes('impianti elettrici') || n.includes('impianto elettrico')) return {
      fonte: 'professionista',
      descrizione: 'Rilasciata dall\'installatore o tecnico abilitato che ha verificato gli impianti.',
      comeOttenere: 'Elettricista o tecnico abilitato DM 37/2008 che ha installato o verificato gli impianti.',
      costoStimato: '€150-400',
    }
    if (n.includes('planimetria') || n.includes('pianta')) return {
      fonte: 'professionista',
      descrizione: 'Pianta del locale con misure e destinazioni d\'uso. La prepara un tecnico (geometra/architetto).',
      comeOttenere: 'Geometra o architetto abilitato. In alcuni casi è già disponibile dal proprietario del locale.',
      costoStimato: '€100-250',
    }
    if (n.includes('perizia') || n.includes('valutazione tecnica')) return {
      fonte: 'professionista',
      descrizione: 'Documento tecnico redatto da professionista abilitato.',
      costoStimato: 'Variabile',
    }

    // ── DA ENTE PUBBLICO ───────────────────────────────────────────────

    if (n.includes('agibilità') || n.includes('certificato di agibilità')) return {
      fonte: 'ente_pubblico',
      descrizione: 'Certificato che attesta l\'idoneità del locale all\'uso previsto.',
      dove: `Comune di ${comune} — Ufficio Tecnico`,
      comeOttenere: 'Richiedi all\'ufficio tecnico del Comune oppure verifica se già disponibile presso il proprietario del locale.',
      tempiStimati: '2-6 settimane se non già disponibile',
    }
    if (n.includes('autorizzazione sanitaria') || n.includes('nulla osta sanitario')) return {
      fonte: 'ente_pubblico',
      descrizione: 'Autorizzazione rilasciata dall\'ASL locale dopo sopralluogo.',
      dove: `ASL di ${comune}`,
      tempiStimati: '30-60 giorni',
    }
    if (n.includes('licenza') && (n.includes('comune') || n.includes('municipale'))) return {
      fonte: 'ente_pubblico',
      descrizione: 'Licenza rilasciata dal Comune.',
      dove: `Comune di ${comune} — SUAP`,
    }

    // ── L'UTENTE PORTA QUELLO CHE HA GIÀ ─────────────────────────────

    if (n.includes('documento di identità') || n.includes('carta d\'identità') || n.includes('passaporto') || n.includes('patente')) return {
      fonte: 'utente',
      descrizione: 'Carta d\'identità, passaporto o patente in corso di validità.',
    }
    if (n.includes('contratto di locazione') || n.includes('atto di proprietà') || n.includes('titolo di disponibilità')) return {
      fonte: 'utente',
      descrizione: 'Il contratto di affitto o l\'atto notarile del locale che hai scelto.',
      comeOttenere: 'È il contratto firmato col proprietario del locale. Se non lo hai ancora, puoi aggiungerlo dopo.',
    }
    if (n.includes('titolo di studio') || n.includes('diploma') || n.includes('laurea') || n.includes('attestato professionale') || n.includes('qualifica')) return {
      fonte: 'utente',
      descrizione: 'Il tuo diploma, laurea o attestato di qualifica professionale.',
      comeOttenere: 'Il tuo documento originale. Se smarrito: richiedilo all\'istituto scolastico o università.',
    }
    if (n.includes('corso') || n.includes('formazione') || n.includes('attestato') && n.includes('sicurezza')) return {
      fonte: 'utente',
      descrizione: 'Attestato del corso di formazione già effettuato.',
      comeOttenere: 'Se non l\'hai ancora fatto, il corso si prenota online su piattaforme come Informa o Punto Sicuro. Durata 4-16h, costo €30-100.',
      costoStimato: '€30-100',
    }
    if (n.includes('polizza') || n.includes('assicurazione') || n.includes('rc professionale')) return {
      fonte: 'utente',
      descrizione: 'Polizza assicurativa di responsabilità civile professionale.',
      comeOttenere: 'Richiedi preventivo a qualsiasi compagnia assicurativa (Generali, AXA, UnipolSai, ecc.).',
      costoStimato: '€200-800/anno',
    }
    if (n.includes('schede tecniche') || n.includes('scheda di sicurezza')) return {
      fonte: 'utente',
      descrizione: 'Schede tecniche dei prodotti che utilizzi. Le fornisce il produttore o distributore.',
      comeOttenere: 'Richiedi le schede al fornitore dei prodotti o scaricale dal sito del produttore.',
    }

    // Default: l'utente porta il documento ma con info su come ottenerlo
    return {
      fonte: 'utente',
      descrizione: `Documento necessario per aprire ${idea} a ${comune}.`,
    }
  }

  // Step 6 — prepara lista documenti con categorizzazione intelligente
  const preparaStepDocumenti = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analizza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: dati.idea, settore: dati.settore,
          forma_giuridica: dati.forma_giuridica,
          comune: dati.comune_sede, provincia: dati.provincia_sede,
          ha_locale: dati.ha_locale, serve_alimenti: dati.serve_alimenti,
        }),
      })
      const data = await res.json()
      setAnalisi(data)

      // Cerca la pratica nel catalogo per avere il prezzo reale
      // Cerca per codice ATECO o per parole chiave nell'idea
      const ideaL = dati.idea.toLowerCase()
      const found = CATALOGO.find(p => {
        const t = p.titolo.toLowerCase()
        return (
          (ideaL.includes('bar') && t.includes('apertura')) ||
          (ideaL.includes('ristorante') && t.includes('apertura')) ||
          (ideaL.includes('pizzeria') && t.includes('apertura')) ||
          (ideaL.includes('parrucchiere') && t.includes('apertura')) ||
          (ideaL.includes('estetista') && t.includes('apertura')) ||
          (ideaL.includes('meccanico') && t.includes('apertura')) ||
          (ideaL.includes('officina') && t.includes('apertura')) ||
          (ideaL.includes('srl') && t.includes('s.r.l.')) ||
          (ideaL.includes('negozio') && t.includes('apertura')) ||
          (!ideaL.includes('srl') && !ideaL.includes('sas') && p.id === 'apertura_ditta')
        )
      }) ?? CATALOGO.find(p => p.id === 'apertura_ditta')
      setPraticaCatalogo(found ?? null)

      if (data.attivita_regolamentata) {
        setAttivitaRegolamentata(data.attivita_regolamentata)
      }

      // ── SOLO LA CI È UNIVERSALE — tutto il resto lo decide l'AI ──────
      // L'AI conosce l'attività specifica e restituisce esattamente
      // i documenti necessari per quell'attività in quel comune.
      // Noi categorizziamo (chi li fa: Zipra vs utente) ma non aggiungiamo nulla extra.

      const ideaLower = dati.idea.toLowerCase()

      // CI — unico documento fisso universale
      const docsBase: DocumentoWizard[] = [
        {
          id: 'doc_identita',
          nome: 'Documento di identità',
          descrizione: 'Carta d\'identità, passaporto o patente in corso di validità.',
          obbligatorio: true,
          fonte: 'utente',
          stato: 'non_caricato',
        },
      ]

      // PEC — quasi sempre necessaria per le imprese, Zipra la gestisce
      docsBase.push({
        id: 'pec',
        nome: 'PEC (Posta Elettronica Certificata)',
        descrizione: 'Zipra attiva e registra la PEC a nome della tua impresa — non devi fare nulla.',
        obbligatorio: true,
        fonte: 'autogenerato',
        zipraLoCompila: true,
        datiNecessari: ['Nome impresa', 'Codice fiscale'],
        stato: 'zipra_lo_fa',
      })

      // Contratto locale — solo se ha sede fisica
      if (dati.ha_locale) {
        docsBase.push({
          id: 'contratto_locale',
          nome: 'Contratto di locazione o atto di proprietà del locale',
          descrizione: 'Il contratto di affitto o l\'atto notarile del locale scelto.',
          obbligatorio: true,
          fonte: 'utente',
          stato: 'non_caricato',
          comeOttenere: 'È il contratto firmato col proprietario. Se non lo hai ancora, puoi aggiungerlo dalla dashboard.',
        })
      }

      // HACCP — solo se serve alimenti
      if (dati.serve_alimenti) {
        docsBase.push({
          id: 'piano_haccp',
          nome: 'Piano HACCP (autocontrollo alimentare)',
          descrizione: 'Obbligatorio per legge per chi manipola alimenti. Lo prepara un consulente HACCP — noi ti mettiamo in contatto.',
          obbligatorio: true,
          fonte: 'professionista',
          stato: 'non_caricato',
          comeOttenere: 'Consulente HACCP o tecnologo alimentare. Durata 1-2 settimane.',
          tempiStimati: '1-2 settimane',
          costoStimato: '€300-800',
        })
      }

      // ── Documenti dall'AI — l'AI sa esattamente cosa serve per questa attività ──
      // Categorizziamo ogni documento (chi lo fa) ma NON aggiungiamo roba extra
      const nomiFissi = new Set(docsBase.map(d => d.nome.toLowerCase()))
      const docsAI: DocumentoWizard[] = []
      const visti = new Set<string>()

      for (let i = 0; i < (data.documenti_necessari ?? []).length; i++) {
        const nome: string = data.documenti_necessari[i]
        const nLower = nome.toLowerCase()

        // Salta duplicati
        if (visti.has(nLower)) continue
        visti.add(nLower)

        // Salta tutto ciò che fa Zipra o è già coperto — MAI mostrarlo come compito utente
        const gestisceZipra = [
          'pec', 'posta elettronica certificata',
          'casellario', 'certificato penale', 'carichi pendenti',
          'estratto contributivo', 'estratto inps',
          'durc', 'documento unico di regolarità',
          'visura camerale', 'visura catastale',
          'comunica', 'codice fiscale', 'tesserino fiscale',
          'certificato di residenza', 'autocertificazione',
          'dichiarazione sostitutiva', 'requisiti morali',
          'documento di identità', "carta d'identità",
          'scia ',
        ]
        if (
          nomiFissi.has(nLower) ||
          gestisceZipra.some(k => nLower.includes(k)) ||
          (nLower.includes('contratto di locazione') && dati.ha_locale) ||
          (nLower.includes('haccp') && dati.serve_alimenti)
        ) continue

        const extra = categorizzaDocumento(nome, dati.idea, dati.comune_sede)
        docsAI.push({
          id: `doc_ai_${i}`,
          nome,
          descrizione: extra.descrizione || `Documento necessario per aprire ${dati.idea} a ${dati.comune_sede}.`,
          obbligatorio: true,
          fonte: extra.fonte || 'utente',
          zipraLoCompila: extra.zipraLoCompila,
          datiNecessari: extra.datiNecessari,
          comeOttenere: extra.comeOttenere,
          dove: extra.dove,
          tempiStimati: extra.tempiStimati,
          costoStimato: extra.costoStimato,
          stato: (extra.fonte === 'zipra_api' || extra.fonte === 'autogenerato') && extra.zipraLoCompila
            ? 'zipra_lo_fa'
            : 'non_caricato',
        })
      }

      setDocumenti([...docsBase, ...docsAI])
    } catch (e) {
      console.error(e)
      setDocumenti([
        { id: 'doc_identita', nome: 'Documento di identità', descrizione: 'Carta d\'identità o passaporto', obbligatorio: true, fonte: 'utente', stato: 'non_caricato' },
      ])
    } finally {
      setLoading(false)
      setStep(6)
    }
  }

  const aggiornaStatoDoc = (id: string, stato: StatoDocumento, file?: File) => {
    setDocumenti(prev => prev.map(d =>
      d.id === id ? { ...d, stato, file: file ?? d.file } : d
    ))
  }

  const avviaCreazione = async (d: DatiWizard) => {
    setLoading(true)
    setErroreSubmit(null)
    try {
      const supabase = createBrowserSupabaseClient()
      let { data: { user } } = await supabase.auth.getUser()

      // ── Utente non loggato (es. arriva dal chatbot senza registrarsi) ──
      // Creiamo un account temporaneo con la sua email
      if (!user) {
        const email = d.email?.trim()
        if (!email) {
          setErroreSubmit('Inserisci la tua email per salvare la pratica e ricevere aggiornamenti.')
          setLoading(false)
          return
        }
        // Usa password fissa basata sull'email — così ogni tentativo usa la stessa
        // e non si creano account duplicati con password diverse
        const emailHash = email.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
        const tempPassword = 'Zipra' + Math.abs(emailHash).toString(36).toUpperCase().slice(0, 6) + '!'

        // Prima prova a fare signIn — forse l'account esiste già
        const { data: existingLogin } = await supabase.auth.signInWithPassword({ email, password: tempPassword })
        if (existingLogin?.user) {
          user = existingLogin.user
        } else {
          // Account non esiste o password diversa — crea nuovo account
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: tempPassword,
            options: {
              data: { full_name: `${d.nome ?? ''} ${d.cognome ?? ''}`.trim() || email },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            }
          })

          if (signUpError) {
            if (signUpError.message?.includes('rate limit') || signUpError.message?.includes('over_email_send_rate_limit')) {
              setErroreSubmit('Troppe richieste a Supabase. Aspetta 1 minuto e riprova.')
            } else if (signUpError.message?.includes('already registered')) {
              setErroreSubmit('Hai già un account con questa email. Vai alla pagina di login.')
            } else {
              setErroreSubmit('Errore creazione account: ' + signUpError.message)
            }
            setLoading(false)
            return
          }

          if (!signUpData.user) {
            setErroreSubmit('Errore imprevisto nella creazione account. Riprova.')
            setLoading(false)
            return
          }

          user = signUpData.user

          // Se email confirmation attiva, signIn subito dopo
          if (!signUpData.session) {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email, password: tempPassword,
            })
            if (loginError || !loginData.user) {
              setErroreSubmit('Conferma la tua email e poi accedi con: ' + email + ' / ' + tempPassword)
              setLoading(false)
              return
            }
            user = loginData.user
          }
        }

        // Crea profilo con retry
        for (let t = 0; t < 3; t++) {
          if (t > 0) await new Promise(r => setTimeout(r, 600))
          const { error: pe } = await supabase.from('profiles').upsert({
            id: user.id, email,
            full_name: `${d.nome ?? ''} ${d.cognome ?? ''}`.trim() || email,
            nome: d.nome ?? '', cognome: d.cognome ?? '',
            codice_fiscale: d.codice_fiscale ?? '',
            telefono: d.telefono ?? '',
            role: 'user', piano: 'free',
          }, { onConflict: 'id' })
          if (!pe) break
          if (t === 2) { setErroreSubmit('Errore profilo: ' + pe.message); setLoading(false); return }
        }

        // Salva per toast in dashboard + invia email benvenuto
        sessionStorage.setItem('zipra_temp_password', JSON.stringify({ email, password: tempPassword }))
        fetch('/api/auth/benvenuto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: tempPassword, nome: d.nome?.trim() || '' }),
        }).catch(() => {})
      }

      // Assicura che il profilo esista (per utenti già loggati il trigger potrebbe non aver girato)
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        role: 'user',
        piano: 'free',
      }, { onConflict: 'id', ignoreDuplicates: true })

      if (d.nome) {
        await supabase.from('profiles').update({
          nome: d.nome,
          cognome: d.cognome,
          full_name: `${d.nome} ${d.cognome}`.trim(),
          codice_fiscale: d.codice_fiscale,
          telefono: d.telefono,
        }).eq('id', user.id)
      }

      // Carica documenti allegati su Storage
      const documentiCaricati: any[] = []
      for (const doc of documenti) {
        if (doc.stato === 'caricato' && doc.file) {
          const path = `${user.id}/wizard/${Date.now()}_${doc.file.name}`
          const { data: uploadData } = await supabase.storage
            .from('documenti').upload(path, doc.file)
          if (uploadData) {
            documentiCaricati.push({ id: doc.id, nome: doc.nome, path })
          }
        }
      }

      const docMancanti = documenti
        .filter(doc => (doc.stato === 'skippato' || doc.stato === 'non_caricato') && doc.obbligatorio && doc.fonte === 'utente')
        .map(doc => ({ id: doc.id, nome: doc.nome }))

      const tipoAttivita = d.idea?.trim() || 'Nuova attività'
      const formaGiuridica = d.forma_giuridica?.trim() || 'ditta_individuale'
      const nomeImpresa = d.nome_impresa?.trim() || d.idea?.trim() || 'Nuova impresa'
      const comuneSede = d.comune_sede?.trim() || 'Da definire'
      // Cerca provincia nel DB comuni se mancante
      const comuneDB = d.provincia_sede?.trim() ? null : trovaComuneEsatto(comuneSede)
      const provinciaSede = (d.provincia_sede?.trim() || comuneDB?.provincia || 'ND').toUpperCase().slice(0, 2)

      const { data: pratica, error } = await supabase.from('pratiche').insert({
        user_id: user.id,
        tipo_attivita: tipoAttivita,
        forma_giuridica: formaGiuridica,
        nome_impresa: nomeImpresa,
        comune_sede: comuneSede,
        provincia_sede: provinciaSede,
        ha_locale: d.ha_locale ?? false,
        serve_alimenti: d.serve_alimenti ?? false,
        codice_ateco: analisi?.codice_ateco ?? null,
        descrizione_ateco: analisi?.descrizione_ateco ?? null,
        dati_wizard: JSON.stringify(d),
        analisi_ai: analisi ? JSON.stringify({
          ...analisi,
          documenti_caricati: documentiCaricati,
          documenti_mancanti: docMancanti,
        }) : null,
        stato: 'bozza',
        piano: new URLSearchParams(window.location.search).get('piano') || 'base',
        note_admin: docMancanti.length > 0
          ? `⚠️ Documenti mancanti (${docMancanti.length}): ${docMancanti.map(doc => doc.nome).join(', ')}`
          : null,
      }).select('id').single()

      if (error) {
        console.error('Errore Supabase:', error)
        setErroreSubmit(`Errore nel salvare la pratica: ${error.message}`)
        return
      }

      if (pratica) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ praticaId: pratica.id }))
        const piano = new URLSearchParams(window.location.search).get('piano') || 'singola'
        // → Checkout Stripe con pratica_id e piano
        // Stripe dopo il pagamento redirecta a /onboarding/firma?pratica_id=X&user_id=Y
        window.location.href = `/checkout?pratica=${pratica.id}&piano=${piano}`
        return
      }
    } catch (e: any) {
      console.error('Errore avviaCreazione:', e)
      setErroreSubmit(`Errore imprevisto: ${e?.message ?? 'Riprova'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    await avviaCreazione(dati)
  }

  const docMancanti = documenti.filter(d => d.stato === 'skippato' || d.stato === 'non_caricato')
  const docPronti = documenti.filter(d => d.stato === 'caricato' || d.stato === 'zipra_lo_fa')
  const progresso = documenti.length > 0
    ? Math.round((docPronti.length / documenti.length) * 100)
    : 0

  // ── Loading AI ─────────────────────────────────────────
  if (loading && step === 5) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin mx-auto mb-6" />
        <h2 className="font-head font-bold text-2xl text-z-light mb-2">Analizzo la tua impresa...</h2>
        <p className="text-z-muted text-sm">Identifico le pratiche necessarie e i documenti richiesti per {dati.comune_sede}.</p>
      </div>
    </div>
  )

  // ── Loading finale ────────────────────────────────────
  if (loading && step === 6) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin mx-auto mb-6" />
        <h2 className="font-head font-bold text-2xl text-z-light mb-2">Creo la tua pratica...</h2>
        <p className="text-z-muted text-sm">Carico i documenti e preparo tutto per l'invio.</p>
      </div>
    </div>
  )

  // ── Wizard steps ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        <div className="text-center mb-6">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra ⚡</a>
          <p className="text-z-muted text-sm mt-1">
            {step < 6 ? `Step ${step + 1} di 7` : 'Documenti'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {STEP_LABELS.map((l, i) => (
            <div key={l} className="flex-1">
              <div className={`h-1 rounded transition-all ${i <= step ? 'bg-z-green' : 'bg-white/10'}`} />
              <p className={`text-[9px] font-mono mt-1 text-center hidden sm:block ${i === step ? 'text-z-green' : 'text-z-muted/30'}`}>{l}</p>
            </div>
          ))}
        </div>

        {/* Banner "continua dalla chat" */}
        {daChatbot && dati.idea && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">💬</span>
            <div>
              <p className="text-emerald-400 font-bold text-sm">Continui dalla chat — abbiamo già capito cosa ti serve</p>
              <p className="text-slate-300 text-sm mt-0.5">"{dati.idea}"</p>
              <p className="text-slate-500 text-xs mt-1">Abbiamo saltato i passi già completati. Controlla e vai avanti.</p>
            </div>
          </div>
        )}

        {/* ── STEP 0 — Idea ─────────────────────────────── */}
        {step === 0 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">Cosa vuoi fare?</h2>
            <p className="text-z-muted text-sm mb-6">Descrivi la tua idea in parole tue — più sei specifico, più precisa è l'analisi.</p>
            <label className="label-field">La tua idea</label>
            <textarea value={dati.idea} onChange={e => aggiorna('idea', e.target.value)}
              placeholder="Es: Voglio aprire un bar nel centro di Lecce con somministrazione e cucina"
              className="input-field min-h-[120px] resize-none" />
          </div>
        )}

        {/* ── STEP 1 — Settore ──────────────────────────── */}
        {step === 1 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">Che settore?</h2>
            <p className="text-z-muted text-sm mb-6">Seleziona il più vicino alla tua attività.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'ristorazione', label: '🍽️ Ristorazione' },
                { id: 'commercio', label: '🛍️ Commercio' },
                { id: 'artigianato', label: '🔨 Artigianato' },
                { id: 'servizi', label: '💼 Servizi' },
                { id: 'informatica', label: '💻 Tech / Informatica' },
                { id: 'sanitario_benessere', label: '💆 Benessere / Estetica' },
                { id: 'edilizia', label: '🏗️ Edilizia / Impianti' },
                { id: 'professionale', label: '📋 Professionale' },
              ].map(s => (
                <button key={s.id} onClick={() => aggiorna('settore', s.id)}
                  className={`p-4 border-2 text-left font-bold text-sm transition-all ${dati.settore === s.id ? 'border-z-green bg-z-green/5 text-z-light' : 'border-white/8 bg-z-dark text-z-muted hover:border-white/20'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2 — Forma giuridica ──────────────────── */}
        {step === 2 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">Forma giuridica?</h2>
            <p className="text-z-muted text-sm mb-6">Se non sei sicuro scegli Ditta Individuale — è la più semplice per partire.</p>
            <div className="space-y-3">
              {[
                { id: 'ditta_individuale', label: 'Ditta Individuale', desc: 'Semplice, veloce, senza notaio. Lavori da solo.' },
                { id: 'srl', label: 'S.r.l.', desc: 'Con soci, responsabilità limitata. Richiede notaio.' },
                { id: 'srls', label: 'S.r.l.s.', desc: 'Come SRL con capitale minimo €1. Richiede notaio.' },
                { id: 'libero_professionista', label: 'Libero Professionista', desc: 'Per professioni intellettuali e tecniche.' },
              ].map(f => (
                <button key={f.id} onClick={() => aggiorna('forma_giuridica', f.id)}
                  className={`w-full p-4 border-2 text-left transition-all ${dati.forma_giuridica === f.id ? 'border-z-green bg-z-green/5' : 'border-white/8 bg-z-dark hover:border-white/20'}`}>
                  <div className="font-bold text-z-light text-sm">{f.label}</div>
                  <div className="text-z-muted text-xs mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3 — Sede ─────────────────────────────── */}
        {step === 3 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">Dove sarà la sede?</h2>
            <p className="text-z-muted text-sm mb-6">Il comune determina quali normative locali si applicano.</p>
            <div className="space-y-4">
              <div>
                <label className="label-field">Nome impresa *</label>
                <input value={dati.nome_impresa} onChange={e => aggiorna('nome_impresa', e.target.value)}
                  placeholder="Es: Bar Lo Scalino, Officina Rossi..." className="input-field" />
                <p className="text-xs text-z-muted/50 mt-1">Sarà il nome con cui la tua impresa sarà registrata.</p>
              </div>
              <ComuneAutocomplete
                value={dati.comune_sede}
                onChange={(comune, provincia, cap) => {
                  aggiorna('comune_sede', comune)
                  aggiorna('provincia_sede', provincia)
                  aggiorna('cap_sede' as any, cap)
                }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 4 — Dettagli ─────────────────────────── */}
        {step === 4 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">Qualche dettaglio</h2>
            <p className="text-z-muted text-sm mb-6">Determina quali pratiche aggiuntive ti servono.</p>
            <div className="space-y-3">
              {[
                { campo: 'ha_locale', emoji: '🏪', label: 'Hai o stai cercando un locale fisico', desc: 'Negozio, bar, ufficio, laboratorio, atelier — anche se non ancora firmato il contratto' },
                { campo: 'serve_alimenti', emoji: '🍽️', label: 'Somministri o vendi alimenti/bevande', desc: 'Bar, ristorante, pizzeria, alimentari, gastronomia...' },
              ].map(({ campo, emoji, label, desc }) => (
                <button key={campo} onClick={() => aggiorna(campo, !dati[campo as keyof DatiWizard])}
                  className={`w-full p-4 border-2 text-left transition-all ${dati[campo as keyof DatiWizard] ? 'border-z-green bg-z-green/5' : 'border-white/8 bg-z-dark'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-z-light text-sm">{emoji} {label}</div>
                      <div className="text-z-muted text-xs mt-0.5">{desc}</div>
                    </div>
                    <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 ${dati[campo as keyof DatiWizard] ? 'border-z-green bg-z-green' : 'border-white/20'}`}>
                      {dati[campo as keyof DatiWizard] && <span className="text-z-dark text-xs font-bold">✓</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5 — Dati personali ───────────────────── */}
        {step === 5 && (
          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-2xl text-z-light mb-2">I tuoi dati</h2>
            <p className="text-z-muted text-sm mb-6">Necessari per le pratiche burocratiche.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Nome *</label>
                  <input value={dati.nome} onChange={e => aggiorna('nome', e.target.value)}
                    placeholder="Mario" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Cognome *</label>
                  <input value={dati.cognome} onChange={e => aggiorna('cognome', e.target.value)}
                    placeholder="Rossi" className="input-field" />
                </div>
              </div>
              <div>
                <label className="label-field">Codice Fiscale *</label>
                <input value={dati.codice_fiscale} onChange={e => aggiorna('codice_fiscale', e.target.value.toUpperCase())}
                  placeholder="RSSMRA80A01H501Z" className="input-field font-mono" maxLength={16} />
                {dati.codice_fiscale.length > 0 && dati.codice_fiscale.length !== 16 && (
                  <p className="text-xs text-red-400 mt-1">Il codice fiscale deve essere di 16 caratteri</p>
                )}
              </div>
              <div>
                <label className="label-field">Telefono *</label>
                <input value={dati.telefono} onChange={e => aggiorna('telefono', e.target.value.replace(/[^0-9+\s]/g, ''))}
                  placeholder="+39 333 1234567" className="input-field" />
                {dati.telefono.length > 0 && dati.telefono.replace(/[\s+]/g, '').length < 9 && (
                  <p className="text-xs text-red-400 mt-1">Inserisci un numero di telefono valido</p>
                )}
              </div>
              <div>
                <label className="label-field">Email *</label>
                <input type="email" value={dati.email} onChange={e => aggiorna('email', e.target.value)}
                  placeholder="mario@esempio.it" className="input-field" />
                {dati.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dati.email) && (
                  <p className="text-xs text-red-400 mt-1">Inserisci un indirizzo email valido</p>
                )}
                <p className="text-xs text-z-muted/50 mt-1">Userai questa email per accedere alla dashboard.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 6 — Documenti ────────────────────────── */}
        {step === 6 && documenti.length > 0 && (
          <div className="w-full max-w-2xl">

            {/* Banner piano — inclusa o a pagamento */}
            {(pianoUtente === 'base' || pianoUtente === 'pro' || pianoScelto === 'base' || pianoScelto === 'pro') ? (
              <div className="bg-z-green/10 border border-z-green/25 rounded-2xl px-5 py-4 flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">✅</span>
                <div>
                  <p className="text-z-green font-bold text-sm">
                    Pratica inclusa nel Piano {(pianoUtente === 'pro' || pianoScelto === 'pro') ? 'Pro' : 'Base'} — €{(pianoUtente === 'pro' || pianoScelto === 'pro') ? '249' : '149'}/anno
                  </p>
                  <p className="text-z-muted/70 text-xs mt-0.5">
                    Tutte le pratiche di apertura incluse nell'abbonamento annuale.
                    {praticaCatalogo?.dirittiEnti > 0 && ` Paghi solo i diritti agli enti (~€${praticaCatalogo.dirittiEnti}) quando richiesti dagli enti.`}
                  </p>
                </div>
              </div>
            ) : praticaCatalogo ? (
              <div className="bg-z-mid border border-white/8 rounded-2xl px-5 py-4 mb-4">
                <p className="text-z-light font-bold text-sm mb-3">Costo questa pratica</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-z-darker rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-z-light">€{praticaCatalogo.prezzoZipra}</div>
                    <div className="text-[10px] text-z-muted/50 mt-0.5">Servizio Zipra</div>
                  </div>
                  <div className="bg-z-darker rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-z-muted">€{praticaCatalogo.dirittiEnti}</div>
                    <div className="text-[10px] text-z-muted/50 mt-0.5">Diritti enti</div>
                  </div>
                  <div className="bg-z-darker rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-z-green">€{praticaCatalogo.prezzoZipra + praticaCatalogo.dirittiEnti}</div>
                    <div className="text-[10px] text-z-muted/50 mt-0.5">Totale</div>
                  </div>
                </div>
                <p className="text-xs text-z-muted/40 mt-3">
                  Paghi solo dopo la revisione e conferma da parte di Zipra.
                </p>
              </div>
            ) : null}

            {/* Alert attività regolamentata */}
            {attivitaRegolamentata && (
              <div className="bg-amber-400/8 border border-amber-400/25 p-4 mb-4">
                <div className="font-bold text-amber-400 text-sm mb-1">
                  ⚠️ Attività soggetta a requisiti professionali
                </div>
                <p className="text-xs text-amber-400/70 leading-relaxed">
                  {attivitaRegolamentata.nota ?? 'Questa attività richiede qualifiche o abilitazioni specifiche. Verifica di avere i requisiti prima di procedere.'}
                </p>
              </div>
            )}

            <div className="bg-z-mid border border-white/8 p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-head font-bold text-z-light">Documenti necessari</h2>
                <span className="text-xs font-mono text-z-muted/50">{docPronti.length}/{documenti.length}</span>
              </div>
              <p className="text-z-muted text-sm mb-4">
                Carica quello che hai subito. Per il resto clicca <span className="text-amber-400">⏭ Allego dopo</span> — lo carichi dalla dashboard quando sei pronto.
              </p>

              {/* Barra progresso */}
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-z-green rounded-full transition-all duration-500"
                  style={{ width: `${progresso}%` }} />
              </div>
              <div className="text-xs font-mono text-z-muted/40 text-right">{progresso}% pronti</div>
            </div>

            <div className="space-y-3">
              {documenti.map(doc => (
                <div key={doc.id}>
                  <CardDocumento
                    doc={doc}
                    onCarica={(file) => aggiornaStatoDoc(doc.id, 'caricato', file)}
                    onSkippa={() => aggiornaStatoDoc(doc.id, 'skippato')}
                    onZipraLoFa={() => aggiornaStatoDoc(doc.id, 'zipra_lo_fa')}
                    onSpiega={() => setDocSpiega(docSpiega === doc.id ? null : doc.id)}
                  />
                  {docSpiega === doc.id && (
                    <PannelloSpiega doc={doc} onClose={() => setDocSpiega(null)} />
                  )}
                </div>
              ))}
            </div>

            {/* Riepilogo prima di procedere */}
            {docMancanti.filter(d => d.stato === 'non_caricato').length === 0 && (
              <div className="mt-4 p-4 bg-z-green/8 border border-z-green/20 text-sm text-z-muted">
                <span className="text-z-green font-bold">✓ Pronto.</span>{' '}
                {docMancanti.length > 0
                  ? `Hai ${docMancanti.length} documenti da caricare dopo — puoi farlo dalla dashboard.`
                  : 'Tutti i documenti sono pronti!'
                }
              </div>
            )}

            <button onClick={handleSubmit}
              disabled={loading || documenti.some(d =>
                d.stato === 'non_caricato' &&
                d.obbligatorio &&
                d.fonte === 'utente' &&
                d.id === 'doc_identita'
              )}
              className="btn-primary w-full justify-center py-4 text-base mt-4">
              {loading ? '⏳ Salvataggio in corso...' : docMancanti.length > 0 ? '💾 Salva pratica e carico il resto dopo' : '🚀 Avvia la pratica — tutto pronto!'}
            </button>
            {erroreSubmit && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                ❌ {erroreSubmit}
              </div>
            )}
            <p className="text-xs text-z-muted/30 text-center mt-2">
              Puoi caricare i documenti mancanti in qualsiasi momento dalla dashboard
            </p>
          </div>
        )}

        {/* ── Navigazione ───────────────────────────────── */}
        {step < 6 && (
          <div className="flex gap-3 mt-4">
            {step > 0 && (
              <button onClick={indietro} className="btn-secondary flex-1 justify-center">
                ← Indietro
              </button>
            )}
            {step < 5 ? (
              <button onClick={() => {
                // Se allo step 4 e dati già presenti → salta step 5, vai ai documenti
                if (step === 4 && datiPersonaliGiaPresenti) {
                  preparaStepDocumenti()
                } else {
                  avanti()
                }
              }}
                disabled={
                  (step === 0 && !dati.idea) ||
                  (step === 1 && !dati.settore) ||
                  (step === 3 && (!dati.comune_sede || !dati.nome_impresa))
                }
                className="btn-primary flex-1 justify-center">
                {step === 4 && datiPersonaliGiaPresenti ? '📄 Vedi documenti →' : 'Continua →'}
              </button>
            ) : (
              <button onClick={preparaStepDocumenti}
                disabled={loading || !dati.nome || !dati.cognome || !dati.email || dati.codice_fiscale.length !== 16 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dati.email)}
                className="btn-primary flex-1 justify-center">
                📄 Vedi documenti necessari →
              </button>
            )}
          </div>
        )}
        {step === 6 && (
          <button onClick={indietro} className="btn-secondary w-full justify-center mt-3 text-sm">
            ← Torna ai dati personali
          </button>
        )}
      </div>
    </div>
  )
}