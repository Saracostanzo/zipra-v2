'use client'
import { useState, useRef, useEffect } from 'react'
import { PraticaCatalogo } from '@/lib/catalogo'
import { useRouter } from 'next/navigation'

interface Messaggio {
  ruolo: 'user' | 'assistant'
  testo: string
  pratica?: PraticaCatalogo & { prezzi: any }
  timestamp: Date
}

const SUGGERIMENTI = [
  'Voglio aprire un bar a Lecce',
  'Devo aggiungere un socio alla mia SRL',
  'Ho cambiato indirizzo della sede',
  'Devo depositare il bilancio annuale',
  'Voglio trasformare la ditta in SRL',
  'Devo rinnovare la licenza del mio bar',
]

// ─── Testo formattato ─────────────────────────────────────────────────────────
function TestoFormattato({ testo }: { testo: string }) {
  const righe = testo.split('\n')
  return (
    <div className="space-y-2">
      {righe.map((riga, i) => {
        if (!riga.trim()) return <div key={i} className="h-1" />
        const matchLista = riga.match(/^(\d+)\.\s+(.+)/)
        if (matchLista) {
          return (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {matchLista[1]}
              </span>
              <span className="text-slate-200 leading-relaxed text-sm flex-1">
                {formattaInline(matchLista[2])}
              </span>
            </div>
          )
        }
        return (
          <p key={i} className="text-slate-200 leading-relaxed text-sm">
            {formattaInline(riga)}
          </p>
        )
      })}
    </div>
  )
}

function formattaInline(testo: string): React.ReactNode {
  const parti = testo.split(/(\*\*[^*]+\*\*)/)
  return parti.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{parte.slice(2, -2)}</strong>
    }
    return <span key={i}>{parte}</span>
  })
}

// ─── Salva contesto chatbot per il wizard ────────────────────────────────────
function salvaContestoPerWizard(pratica: PraticaCatalogo & { prezzi: any }, storia: { ruolo: string; testo: string }[]) {
  // Cerca il comune SOLO nei messaggi utente (non nelle risposte AI che contengono parole come INPS, ComUnica ecc)
  const messaggiUtente = storia.filter(m => m.ruolo === 'user').map(m => m.testo).join(' ').toLowerCase()

  // Lista comuni italiani noti — match diretto, zero regex
  const COMUNI_NOTI = [
    'roma', 'milano', 'napoli', 'torino', 'palermo', 'genova', 'bologna', 'firenze',
    'bari', 'catania', 'venezia', 'verona', 'messina', 'padova', 'trieste', 'taranto',
    'brescia', 'prato', 'modena', 'reggio emilia', 'reggio calabria', 'perugia',
    'ravenna', 'livorno', 'cagliari', 'foggia', 'rimini', 'salerno', 'ferrara',
    'sassari', 'latina', 'monza', 'bergamo', 'lecce', 'trento', 'bolzano', 'parma',
    'piacenza', 'ancona', 'andria', 'barletta', 'arezzo', 'novara', 'pescara',
    'udine', 'cesena', 'pesaro', 'cosenza', 'siracusa', 'catanzaro', 'brindisi',
    'como', 'varese', 'vicenza', 'treviso', 'la spezia', 'pisa', 'lucca', 'pistoia',
    'grosseto', 'siena', 'massa', 'carrara', 'savona', 'imperia', 'aosta', 'cuneo',
    'asti', 'alessandria', 'verbania', 'biella', 'vercelli', 'mantova', 'cremona',
    'lodi', 'sondrio', 'pavia', 'pordenone', 'gorizia', 'matera', 'potenza',
    'campobasso', 'isernia', 'chieti', 'teramo', 'avezzano', 'sulmona', 'caserta',
    'benevento', 'avellino', 'crotone', 'vibo valentia', 'lamezia terme', 'forlì',
    'imola', 'faenza', 'marsala', 'gela', 'agrigento', 'trapani', 'caltanissetta',
    'enna', 'ragusa', 'vittoria', 'bagheria', 'acireale', 'olbia', 'nuoro',
    'oristano', 'alghero', 'gallipoli', 'nardò', 'galatina', 'maglie', 'monopoli',
    'fasano', 'altamura', 'trani', 'bisceglie', 'corato', 'molfetta', 'bitonto',
    'cerignola', 'manfredonia', 'martina franca', 'lecco', 'sanremo', 'mestre',
    'chioggia', 'bassano del grappa', 'schio', 'montebelluna', 'jesolo',
  ]

  // Trova il comune cercando per nome nel testo utente
  let matchComune = ''
  for (const comune of COMUNI_NOTI) {
    if (messaggiUtente.includes(comune)) {
      // Prende il più lungo (es "reggio calabria" batte "reggio")
      if (comune.length > matchComune.length) {
        matchComune = comune.charAt(0).toUpperCase() + comune.slice(1)
      }
    }
  }


  // Mappa pratica_id → settore
  const settoreMap: Record<string, string> = {
    bar_ristorante: 'ristorazione', pizzeria: 'ristorazione', pasticceria: 'ristorazione',
    negozio_dettaglio: 'commercio', commercio_ingrosso: 'commercio',
    parrucchiere: 'sanitario_benessere', estetista: 'sanitario_benessere', palestra: 'sanitario_benessere',
    autoriparatore: 'artigianato', impiantista: 'artigianato', idraulico: 'artigianato',
    taxi: 'trasporto', ncc: 'trasporto',
    studio_medico: 'sanitario_benessere', studio_dentistico: 'sanitario_benessere',
    geometra: 'professionale', commercialista: 'professionale', avvocato: 'professionale',
    edilizia: 'edilizia',
  }

  // Per apertura_ditta/srl deriva il settore dall'idea utente
  const ideaText = [...storia.filter(m => m.ruolo === 'user').map(m => m.testo), pratica.titolo].join(' ').toLowerCase()
  const settoreDaIdea = (() => {
    if (/bar|ristoran|pizzer|pasticcer|gelateria|pub|trattoria|osteria|caffè|caffe|somministr/.test(ideaText)) return 'ristorazione'
    if (/negozio|commercio|vendita|shop|boutique|abbigliamento|alimentari/.test(ideaText)) return 'commercio'
    if (/parrucchier|barbier|estetist|centro estetico|salone|spa|wellness/.test(ideaText)) return 'sanitario_benessere'
    if (/meccanico|officina|autoripar|carrozzier|elettrauto|gommista/.test(ideaText)) return 'artigianato'
    if (/impiantist|elettricist|idraulico|termoidraul|installaz/.test(ideaText)) return 'artigianato'
    if (/taxi|ncc|autista|trasporto persone/.test(ideaText)) return 'trasporto'
    if (/medico|dentist|ambulatorio|studio medico|fisioterapist/.test(ideaText)) return 'sanitario_benessere'
    if (/edilizia|costruzioni|ristrutturaz|geometra|architetto/.test(ideaText)) return 'edilizia'
    if (/informatica|software|sviluppatore|web|digitale|tech/.test(ideaText)) return 'informatica'
    if (/commercialista|avvocato|notaio|consulente|studio professionale/.test(ideaText)) return 'professionale'
    return settoreMap[pratica.id] || ''
  })()

  // Forma giuridica da idea
  const formaGiuridicaDaIdea = (() => {
    if (/\bsrl\b|s\.r\.l|società a responsabilità/.test(ideaText)) return 'srl'
    if (/\bsrls\b|s\.r\.l\.s/.test(ideaText)) return 'srls'
    if (/\bsas\b|s\.a\.s|accomandita/.test(ideaText)) return 'sas'
    if (/\bsnc\b|s\.n\.c|nome collettivo/.test(ideaText)) return 'snc'
    if (/libero professionista|partita iva professionale|freelance/.test(ideaText)) return 'libero_professionista'
    return 'ditta_individuale'
  })()

  const contesto = {
    da_chatbot: true,
    pratica_id: pratica.id,
    pratica_titolo: pratica.titolo,
    idea: storia.find(m => m.ruolo === 'user')?.testo || pratica.titolo,
    settore: settoreDaIdea,
    comune_sede: matchComune,
    forma_giuridica: formaGiuridicaDaIdea,
    storia_chatbot: storia,
  }
  sessionStorage.setItem('zipra_chatbot_contesto', JSON.stringify(contesto))
}

// ─── Card pratica ─────────────────────────────────────────────────────────────
function CardProcedi({ pratica, storia, router }: { pratica: PraticaCatalogo & { prezzi: any }, storia: { ruolo: string; testo: string }[], router: any }) {
  const [scelta, setScelta] = useState<'base' | 'pro' | 'singola'>('base')

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl">

      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base leading-tight">{pratica.titolo}</h3>
            <p className="text-slate-400 text-xs mt-1">{pratica.descrizione}</p>
          </div>
          {pratica.richiedeNotaio && (
            <span className="text-[10px] font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-1 rounded-full shrink-0">
              Notaio req.
            </span>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl">
          <button onClick={() => setScelta('base')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              scelta === 'base'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}>
            ⭐ Base
          </button>
          <button onClick={() => setScelta('pro')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              scelta === 'pro'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}>
            🚀 Pro + Sito
          </button>
          <button onClick={() => setScelta('singola')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              scelta === 'singola'
                ? 'bg-slate-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}>
            💳 Singola
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <div className="px-5 pb-5">

        {/* PIANO BASE */}
        {scelta === 'base' && (
          <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-4">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-3">Piano Base — €149/anno</p>
            <div className="space-y-2.5 mb-5">
              {[
                'Questa pratica inclusa',
                'Modifiche e variazioni incluse per sempre (cambio sede, ATECO, PEC)',
                'Paghi solo i diritti agli enti (CCIAA, Comune, ecc.)',
                'Cessazione inclusa quando vuoi',
                'Archivio digitale completo',
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-emerald-400 shrink-0 mt-0.5 font-bold text-base leading-none">✓</span>
                  <span className="text-slate-300">{f}</span>
                </div>
              ))}
              <div className="flex items-start gap-2.5 text-sm pt-1 border-t border-white/5">
                <span className="text-slate-600 shrink-0 mt-0.5 font-bold text-base leading-none line-through">✕</span>
                <span className="text-slate-600 line-through">Sito web e Google Business — solo Piano Pro</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black text-emerald-400">€149</span>
                <span className="text-slate-500 text-xs ml-1">/anno</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => { salvaContestoPerWizard(pratica, storia); router.push('/wizard?piano=base&da_chat=1') }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30">
                  Abbonati →
                </button>
                <button onClick={() => setScelta('pro')}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors underline underline-offset-2">
                  Ti serve anche il sito? →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PIANO PRO */}
        {scelta === 'pro' && (
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-widest">Piano Pro — €249/anno</p>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">CONSIGLIATO</span>
            </div>
            <div className="space-y-2.5 mb-5">
              {[
                'Tutto del Piano Base incluso',
                'Sito web vetrina creato, pubblicato e online',
                'Scheda Google Business configurata e attivata',
                'Logo generato con intelligenza artificiale',
                'Editor sito con chat AI — modifiche illimitate',
                'Archivio digitale completo',
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-teal-400 shrink-0 mt-0.5 font-bold text-base leading-none">✓</span>
                  <span className="text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">€249</span>
                <span className="text-slate-500 text-xs ml-1">/anno</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => { salvaContestoPerWizard(pratica, storia); router.push('/wizard?piano=pro&da_chat=1') }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30">
                  Scegli Pro →
                </button>
                <button onClick={() => setScelta('base')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-2">
                  ← Vedi Piano Base
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SINGOLA PRATICA */}
        {scelta === 'singola' && (
          <div className="rounded-xl bg-slate-800/60 border border-white/10 p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Solo questa pratica — pagamento unico</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Servizio Zipra', val: `€${pratica.prezzi?.prezzoZipra ?? '—'}`, color: 'text-white' },
                { label: 'Diritti enti', val: `€${pratica.prezzi?.dirittiEnti ?? '—'}`, color: 'text-slate-300' },
                { label: 'Totale', val: `€${pratica.prezzi?.totale ?? '—'}`, color: 'text-emerald-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <div className={`text-lg font-black ${color}`}>{val}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {pratica.richiedeNotaio && (
              <div className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2.5 mb-4">
                ⚠️ Richiede notaio — costo variabile, ti preventivieremo prima di procedere
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">⏱ {pratica.tempiMedi}</span>
              <button onClick={() => { salvaContestoPerWizard(pratica, storia); router.push('/wizard?da_chat=1') }}
                className="bg-slate-600 hover:bg-slate-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200">
                Procedi →
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="text-[10px] text-slate-600 text-center pb-4">
        Reinoltro gratuito · Paghi solo dopo la revisione
      </div>
    </div>
  )
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function ChatbotAI({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [messaggi, setMessaggi] = useState<Messaggio[]>([{
    ruolo: 'assistant',
    testo: 'Ciao! Sono l\'assistente Zipra. Dimmi cosa vuoi fare o che tipo di impresa hai — ti dico tutto: pratiche necessarie, codice ATECO, costi esatti. Gratis. 👋',
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storia, setStoria] = useState<{ ruolo: string; testo: string }[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scrolla solo il container della chat, NON la pagina
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messaggi])

  const invia = async (testo?: string) => {
    const msg = testo ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    setMessaggi(prev => [...prev, { ruolo: 'user', testo: msg, timestamp: new Date() }])

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaggio: msg, storia }),
      })
      const data = await res.json()
      setMessaggi(prev => [...prev, {
        ruolo: 'assistant',
        testo: data.risposta,
        pratica: data.pratica,
        timestamp: new Date(),
      }])
      setStoria(prev => [...prev,
        { ruolo: 'user', testo: msg },
        { ruolo: 'assistant', testo: data.risposta },
      ])
    } catch {
      setMessaggi(prev => [...prev, {
        ruolo: 'assistant',
        testo: 'Scusa, ho avuto un problema. Riprova tra un momento.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl ${compact ? 'h-[480px]' : 'h-[640px]'}`}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0 bg-slate-800/50">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-base">⚡</span>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-800" />
        </div>
        <div>
          <div className="font-bold text-white text-sm">Assistente Zipra</div>
          <div className="text-xs text-emerald-400/80">Online — consulenza gratuita</div>
        </div>
      </div>

      {/* Messaggi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messaggi.map((m, i) => (
          <div key={i} className={`flex ${m.ruolo === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${m.ruolo === 'user' ? 'max-w-[80%]' : 'w-full'}`}>
              <div className={`px-4 py-3 rounded-2xl ${
                m.ruolo === 'user'
                  ? 'bg-emerald-500 text-white font-medium text-sm rounded-br-sm'
                  : 'bg-slate-700/60 border border-white/8 rounded-bl-sm'
              }`}>
                {m.ruolo === 'user'
                  ? <span className="text-sm">{m.testo}</span>
                  : <TestoFormattato testo={m.testo} />
                }
              </div>
              {m.pratica && <CardProcedi pratica={m.pratica} storia={storia} router={router} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700/60 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 bg-emerald-400/60 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggerimenti */}
      {messaggi.length <= 1 && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Prova a chiedere</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGERIMENTI.slice(0, compact ? 3 : 6).map(s => (
              <button key={s} onClick={() => invia(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400
                           hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5
                           transition-all duration-150">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/8 shrink-0 bg-slate-800/30">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && invia()}
            placeholder="Descrivi la tua attività o cosa ti serve..."
            className="flex-1 py-3 px-4 rounded-xl bg-slate-700/60 border border-white/10 text-white placeholder-slate-500 text-sm outline-none focus:border-emerald-500/50 focus:bg-slate-700 transition-all"
            disabled={loading}
          />
          <button
            onClick={() => invia()}
            disabled={!input.trim() || loading}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 shrink-0">
            →
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Consulenza gratuita · Nessuna registrazione richiesta
        </p>
      </div>
    </div>
  )
}