'use client'
import { useState } from 'react'
import { CATALOGO, CATEGORIE_INFO, calcolaPrezzo, CategoriaPratica, PraticaCatalogo } from '@/lib/catalogo'
import ChatbotAI from '@/components/chatbot/ChatbotAI'
import { useRouter } from 'next/navigation'

export default function PratichePage() {
  const router = useRouter()
  const [categoriaAttiva, setCategoriaAttiva] = useState<CategoriaPratica | 'tutte'>('tutte')
  const [cerca, setCerca] = useState('')
  const [mostraChatbot, setMostraChatbot] = useState(false)
  const isAbbonato = false // TODO: recuperare dal profilo utente

  const praticheFiltrate = CATALOGO.filter(p => {
    const matchCategoria = categoriaAttiva === 'tutte' || p.categoria === categoriaAttiva
    const matchCerca = !cerca || 
      p.titolo.toLowerCase().includes(cerca.toLowerCase()) ||
      p.keywords.some(k => k.includes(cerca.toLowerCase()))
    return matchCategoria && matchCerca
  })

  return (
    <div className="min-h-screen bg-z-darker text-z-light">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-darker/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="font-head text-xl font-bold text-z-light">zipra</span>
            <span className="w-1.5 h-1.5 rounded-full bg-z-green" />
          </a>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="btn-secondary text-xs py-2">Dashboard</a>
            <a href="/prezzi" className="btn-primary text-xs py-2">Abbonati</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-3">Catalogo servizi</p>
          <h1 className="font-head text-5xl font-bold text-z-light mb-4">
            Cosa possiamo fare<br />
            <span className="text-z-green">per la tua impresa?</span>
          </h1>
          <p className="text-z-muted font-body text-lg mb-8 max-w-xl mx-auto">
            Dall'apertura alla chiusura, dalle modifiche agli adempimenti annuali.
            Se non trovi quello che cerchi, chiedilo all'AI.
          </p>

          {/* CTA chatbot */}
          <button
            onClick={() => setMostraChatbot(!mostraChatbot)}
            className={`inline-flex items-center gap-2 px-6 py-3 font-head font-bold text-sm uppercase tracking-wider transition-all
              ${mostraChatbot ? 'btn-secondary' : 'btn-primary'}`}
          >
            {mostraChatbot ? '✕ Chiudi assistente' : '⚡ Chiedi all\'AI cosa ti serve'}
          </button>
        </div>

        {/* Chatbot inline */}
        {mostraChatbot && (
          <div className="max-w-2xl mx-auto mb-12 animate-slide-up">
            <ChatbotAI compact />
          </div>
        )}

        {/* Filtri */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setCategoriaAttiva('tutte')}
            className={`px-4 py-2 text-xs font-head font-bold uppercase tracking-wider transition-all
              ${categoriaAttiva === 'tutte' ? 'bg-z-green text-z-dark' : 'border border-white/15 text-z-muted hover:border-white/30'}`}
          >
            Tutte ({CATALOGO.length})
          </button>
          {(Object.entries(CATEGORIE_INFO) as [CategoriaPratica, any][]).map(([id, info]) => {
            const count = CATALOGO.filter(p => p.categoria === id).length
            if (count === 0) return null
            return (
              <button key={id}
                onClick={() => setCategoriaAttiva(id)}
                className={`px-4 py-2 text-xs font-head font-bold uppercase tracking-wider transition-all flex items-center gap-1.5
                  ${categoriaAttiva === id ? 'bg-z-green text-z-dark' : 'border border-white/15 text-z-muted hover:border-white/30'}`}
              >
                <span>{info.emoji}</span>
                {info.label}
                <span className="opacity-50">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Ricerca */}
        <div className="mb-8">
          <input
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            placeholder="Cerca per nome o parola chiave..."
            className="input-field max-w-sm py-2.5 text-sm"
          />
        </div>

        {/* Banner abbonamento */}
        {!isAbbonato && (
          <div className="bg-z-green/5 border border-z-green/20 p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-head font-bold text-z-light text-sm mb-1">
                💡 Con il piano Mantenimento (€29/mese) molte pratiche sono incluse o scontate del 20%
              </p>
              <p className="text-xs font-body text-z-muted">
                Variazioni sede, ATECO, PEC, diritto annuale CCIAA, titolare effettivo e altro
              </p>
            </div>
            <a href="/prezzi" className="btn-primary text-xs py-2 px-5 shrink-0">Scopri →</a>
          </div>
        )}

        {/* Griglia pratiche */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {praticheFiltrate.map(pratica => {
            const { prezzoZipra, dirittiEnti, totale, notePrezzo } = calcolaPrezzo(pratica, isAbbonato)
            const catInfo = CATEGORIE_INFO[pratica.categoria]

            return (
              <div key={pratica.id}
                className="bg-z-mid border border-white/8 p-5 hover:border-z-green/30 
                           transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col"
                onClick={() => router.push(`/pratiche/${pratica.id}`)}
              >
                {/* Badge categoria */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-z-muted/50 flex items-center gap-1">
                    {catInfo.emoji} {catInfo.label}
                  </span>
                  <div className="flex gap-1">
                    {pratica.richiedeNotaio && (
                      <span className="text-[10px] font-mono bg-amber-400/10 text-amber-400 px-1.5 py-0.5">Notaio</span>
                    )}
                    {pratica.richiedeCommercialista && (
                      <span className="text-[10px] font-mono bg-blue-400/10 text-blue-400 px-1.5 py-0.5">Comm.</span>
                    )}
                    {pratica.inclusalMantenimento && !isAbbonato && (
                      <span className="text-[10px] font-mono bg-z-green/10 text-z-green px-1.5 py-0.5">Incl. abb.</span>
                    )}
                    {pratica.inclusalMantenimento && isAbbonato && (
                      <span className="text-[10px] font-mono bg-z-green/20 text-z-green px-1.5 py-0.5">✓ Inclusa</span>
                    )}
                  </div>
                </div>

                {/* Titolo e descrizione */}
                <h3 className="font-head font-bold text-z-light mb-1">{pratica.titolo}</h3>
                <p className="text-xs font-body text-z-muted/70 leading-relaxed mb-4 flex-1">
                  {pratica.descrizione}
                </p>

                {/* Prezzi e tempi */}
                <div className="border-t border-white/8 pt-3 flex items-end justify-between">
                  <div>
                    {pratica.inclusalMantenimento && isAbbonato ? (
                      <div className="font-head font-bold text-z-green text-lg">Inclusa</div>
                    ) : (
                      <>
                        <div className="font-head font-bold text-z-light text-lg">
                          €{totale}
                          {pratica.richiedeNotaio && <span className="text-xs text-amber-400 ml-1">+notaio</span>}
                        </div>
                        <div className="text-[10px] font-mono text-z-muted/40">
                          €{prezzoZipra} Zipra + €{dirittiEnti} enti
                        </div>
                      </>
                    )}
                    <div className="text-[10px] font-mono text-z-muted/40 mt-0.5">⏱ {pratica.tempiMedi}</div>
                  </div>
                  <span className="text-z-green text-sm">→</span>
                </div>
              </div>
            )
          })}
        </div>

        {praticheFiltrate.length === 0 && (
          <div className="text-center py-16">
            <p className="text-z-muted font-body mb-4">Nessuna pratica trovata per "{cerca}"</p>
            <button onClick={() => setMostraChatbot(true)} className="btn-primary text-sm">
              ⚡ Chiedi all'AI — descrivi cosa ti serve
            </button>
          </div>
        )}

        {/* Sezione preventivi */}
        <div className="mt-16 border border-white/8 bg-z-mid p-8 text-center">
          <h2 className="font-head text-2xl font-bold text-z-light mb-2">
            Non trovi quello che cerchi?
          </h2>
          <p className="text-z-muted font-body mb-6">
            Gestiamo anche pratiche complesse, fusioni, scissioni, accordi societari e molto altro.
            Contattaci per un preventivo personalizzato.
          </p>
          <a href="mailto:info@zipra.it" className="btn-secondary inline-flex">
            📧 Richiedi preventivo
          </a>
        </div>
      </div>
    </div>
  )
}