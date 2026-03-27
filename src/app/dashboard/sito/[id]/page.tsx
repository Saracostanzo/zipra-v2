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
    const carica = async () => {
      const { data } = await supabase
        .from('siti_vetrina')
        .select('*, pratiche(nome_impresa, tipo_attivita, comune_sede)')
        .eq('id', id)
        .single()
      setSito(data)
      setLoading(false)
    }
    carica()
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
        <p className="text-z-muted text-sm mb-6">Il sito potrebbe essere ancora in generazione.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary">← Torna alla dashboard</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-z-darker">
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-z-muted hover:text-z-light text-sm transition">
            ← Dashboard
          </button>
          <h1 className="font-bold text-z-light">Sito vetrina — {sito.pratiche?.nome_impresa ?? 'La tua impresa'}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className={`text-xs font-mono px-2 py-1 rounded-full ${sito.stato === 'pubblicato' ? 'bg-z-green/15 text-z-green' : sito.stato === 'generazione' ? 'bg-amber-400/15 text-amber-400' : 'bg-white/10 text-z-muted'}`}>
              {sito.stato === 'pubblicato' ? '✅ Pubblicato' : sito.stato === 'generazione' ? '⏳ In generazione' : sito.stato}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {sito.stato === 'generazione' && (
          <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-6 text-center">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-bold text-z-light text-lg mb-2">Generazione in corso...</h2>
            <p className="text-z-muted text-sm">Stiamo costruendo il tuo sito. Riceverai una email quando è pronto. Ci vogliono 2-3 minuti.</p>
          </div>
        )}

        {sito.stato === 'pubblicato' && (
          <>
            <div className="bg-z-green/8 border border-z-green/20 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-z-green text-sm">✅ Il tuo sito è online!</p>
                <p className="text-z-muted/70 text-xs mt-0.5">{sito.url_pubblicato ?? sito.nome_dominio}</p>
              </div>
              <a href={sito.url_pubblicato ?? `https://${sito.nome_dominio}`} target="_blank" rel="noopener noreferrer"
                className="btn-primary text-sm py-2 px-4 shrink-0">
                🌐 Apri sito →
              </a>
            </div>

            {sito.testi && (
              <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
                <h2 className="font-bold text-z-light text-lg mb-4">Contenuti del sito</h2>
                <div className="space-y-4">
                  <div>
                    <label className="label-field">Titolo principale</label>
                    <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3">{sito.testi.headline ?? '—'}</p>
                  </div>
                  <div>
                    <label className="label-field">Sottotitolo</label>
                    <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3">{sito.testi.sottotitolo ?? '—'}</p>
                  </div>
                  <div>
                    <label className="label-field">Descrizione</label>
                    <p className="text-z-light text-sm bg-z-darker rounded-xl px-4 py-3 leading-relaxed">{sito.testi.descrizione ?? '—'}</p>
                  </div>
                  {sito.testi.servizi?.length > 0 && (
                    <div>
                      <label className="label-field">Servizi</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {sito.testi.servizi.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-z-green/10 text-z-green border border-z-green/20 px-3 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-z-muted/40 mt-4">
                  Per modificare i testi del sito scrivi al supporto Zipra o usa la chat AI in questa pagina (in arrivo).
                </p>
              </div>
            )}

            {sito.logo_url && (
              <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
                <h2 className="font-bold text-z-light text-lg mb-4">Logo</h2>
                <img src={sito.logo_url} alt="Logo" className="h-20 object-contain" />
              </div>
            )}
          </>
        )}

        {sito.stato === 'errore' && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-bold text-lg mb-2">❌ Errore nella generazione</p>
            <p className="text-z-muted text-sm mb-4">Si è verificato un errore. Il team Zipra è già al lavoro per risolvere.</p>
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">← Torna alla dashboard</button>
          </div>
        )}
      </div>
    </div>
  )
}