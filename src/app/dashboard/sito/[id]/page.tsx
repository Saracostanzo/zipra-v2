'use client'
// PATH: src/app/dashboard/sito/[id]/page.tsx

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export default function SitoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [sito, setSito] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const carica = async () => {
      const { data } = await supabase
        .from('siti_vetrina')
        .select('*, pratiche(nome_impresa, tipo_attivita, comune_sede)')
        .eq('id', id)
        .single()
      setSito(data)
      setLoading(false)
    }

    // Polling finché lo stato è "generazione"
    carica()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('siti_vetrina')
        .select('stato, url_pubblicato, nome_dominio, testi, logo_url')
        .eq('id', id)
        .single()
      if (data && data.stato !== 'generazione') {
        setSito((prev: any) => ({ ...prev, ...data }))
        clearInterval(interval)
      }
    }, 4000) // Controlla ogni 4 secondi

    return () => clearInterval(interval)
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="text-z-muted font-mono text-sm">Caricamento...</div>
    </div>
  )

  if (!sito) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="font-head font-bold text-z-light text-xl mb-2">Sito non trovato</h2>
        <p className="text-z-muted text-sm mb-6">Il sito potrebbe essere ancora in fase di avvio.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">
          ← Torna alla dashboard
        </button>
      </div>
    </div>
  )

  const nomeSito = sito.pratiche?.nome_impresa ?? 'La tua impresa'

  return (
    <div className="min-h-screen bg-z-darker">

      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-z-muted hover:text-z-light text-sm transition">
            ← Dashboard
          </button>
          <h1 className="font-bold text-z-light">Sito vetrina — {nomeSito}</h1>
          <div className="ml-auto">
            <span className={`text-xs font-mono px-2 py-1 rounded-full ${
              sito.stato === 'pubblicato' ? 'bg-z-green/15 text-z-green' :
              sito.stato === 'generazione' ? 'bg-amber-400/15 text-amber-400' :
              sito.stato === 'revisione' ? 'bg-blue-400/15 text-blue-400' :
              'bg-red-400/15 text-red-400'
            }`}>
              {sito.stato === 'pubblicato' ? '✅ Pubblicato' :
               sito.stato === 'generazione' ? '⏳ In generazione' :
               sito.stato === 'revisione' ? '🔍 In revisione' :
               '❌ Errore'}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* ── Stato: generazione ── */}
        {sito.stato === 'generazione' && (
          <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-5" />
            <h2 className="font-bold text-z-light text-xl mb-2">Generazione in corso...</h2>
            <p className="text-z-muted text-sm mb-4">
              Stiamo costruendo il tuo sito web, il logo e la guida Google Business.<br />
              Riceverai una email quando tutto è pronto.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-6 text-xs text-z-muted/60">
              <div className="bg-z-darker rounded-xl p-3 text-center">
                <p className="text-lg mb-1">🎨</p>
                <p>Generazione logo AI</p>
              </div>
              <div className="bg-z-darker rounded-xl p-3 text-center">
                <p className="text-lg mb-1">✍️</p>
                <p>Scrittura testi SEO</p>
              </div>
              <div className="bg-z-darker rounded-xl p-3 text-center">
                <p className="text-lg mb-1">🌐</p>
                <p>Deploy su Vercel</p>
              </div>
            </div>
            <p className="text-xs text-z-muted/40 mt-6">
              Questa pagina si aggiorna automaticamente — puoi lasciarla aperta o tornare dopo.
            </p>
          </div>
        )}

        {/* ── Stato: pubblicato ── */}
        {sito.stato === 'pubblicato' && (
          <>
            <div className="bg-z-green/8 border border-z-green/20 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-z-green text-sm">✅ Il tuo sito è online!</p>
                <p className="text-z-muted/70 text-xs mt-1 font-mono">
                  {sito.url_pubblicato ?? `https://${sito.nome_dominio}`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={sito.url_pubblicato ?? `https://${sito.nome_dominio}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-sm py-2 px-4"
                >
                  🌐 Apri sito →
                </a>
              </div>
            </div>

            {sito.testi && (
              <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
                <h2 className="font-bold text-z-light text-lg mb-4">Contenuti del sito</h2>
                <div className="space-y-4">
                  {sito.testi.headline && (
                    <div>
                      <label className="label-field">Titolo principale</label>
                      <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3">{sito.testi.headline}</p>
                    </div>
                  )}
                  {sito.testi.sottotitolo && (
                    <div>
                      <label className="label-field">Sottotitolo</label>
                      <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3">{sito.testi.sottotitolo}</p>
                    </div>
                  )}
                  {sito.testi.descrizione && (
                    <div>
                      <label className="label-field">Descrizione</label>
                      <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3 leading-relaxed">{sito.testi.descrizione}</p>
                    </div>
                  )}
                  {sito.testi.servizi?.length > 0 && (
                    <div>
                      <label className="label-field">Servizi</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {sito.testi.servizi.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-z-green/10 text-z-green border border-z-green/20 px-3 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-z-muted/40 mt-5">
                  Per modificare i contenuti contatta il supporto Zipra — editor AI in arrivo.
                </p>
              </div>
            )}

            {sito.logo_url && (
              <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
                <h2 className="font-bold text-z-light text-lg mb-4">Logo</h2>
                <img src={sito.logo_url} alt="Logo" className="h-20 object-contain bg-white rounded-xl p-2" />
              </div>
            )}
          </>
        )}

        {/* ── Stato: revisione ── */}
        {sito.stato === 'revisione' && (
          <div className="bg-blue-400/8 border border-blue-400/20 rounded-2xl p-6 text-center">
            <p className="text-blue-400 font-bold text-lg mb-2">🔍 Sito in revisione</p>
            <p className="text-z-muted text-sm">
              I contenuti sono stati generati. Il team Zipra sta effettuando la revisione finale
              e pubblicherà il sito a breve. Riceverai una email di conferma.
            </p>
          </div>
        )}

        {/* ── Stato: errore ── */}
        {sito.stato === 'errore' && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-bold text-lg mb-2">❌ Errore nella generazione</p>
            <p className="text-z-muted text-sm mb-4">
              Si è verificato un errore durante la generazione. Il team Zipra è già al corrente e ti contatterà.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">
              ← Torna alla dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  )
}