'use client'
// PATH: src/app/checkout/page.tsx
//
// FLUSSO DATI CORRETTO:
//   URL: /checkout?pratica=UUID_DB&piano=base
//   → legge praticaDbId (UUID database) e pianoNome ("base")
//   → manda a /api/stripe/checkout: { pianoId: "base", praticaDbId: "UUID_DB" }
//   → API crea sessione Stripe con price da pianoId, UUID solo in metadata
//   → dopo pagamento → /checkout/successo → dashboard

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { PIANI } from '@/lib/stripe'

const PIANI_ABBONAMENTO = ['base', 'pro', 'mantenimento', 'business', 'business_pro']

function CheckoutContent() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [praticaDbId, setPraticaDbId] = useState<string | null>(null)
  const [pianoNome, setPianoNome] = useState<string>('base')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [utente, setUtente] = useState<any>(null)

  useEffect(() => {
    setPraticaDbId(searchParams.get('pratica'))
    setPianoNome(searchParams.get('piano') || 'base')
    // Verifica sessione
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
      else setUtente(user)
    })
  }, [searchParams])

  const pianoInfo = PIANI[pianoNome as keyof typeof PIANI] ?? null
  const isAbbonamento = PIANI_ABBONAMENTO.includes(pianoNome)

  async function avviaCheckout() {
    setErrore(null)
    setLoading(true)
    try {
      if (!utente) { router.push('/auth/login'); return }

      // Manda pianoId (per trovare il price Stripe) e praticaDbId (solo metadata)
      const payload: Record<string, string> = {}
      if (isAbbonamento) payload.pianoId = pianoNome
      if (praticaDbId) payload.praticaDbId = praticaDbId

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Errore dal server')
      if (!data?.url) throw new Error('URL Stripe non ricevuto')
      window.location.href = data.url
    } catch (err: any) {
      setErrore(err.message || 'Errore imprevisto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra</a>
        </div>

        <div className="bg-z-mid border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-z-light mb-1">Completa il pagamento</h1>
          <p className="text-z-muted text-sm mb-6">
            Verrai reindirizzato su Stripe — pagamento sicuro e crittografato.
          </p>

          {/* Riepilogo piano */}
          {pianoInfo ? (
            <div className="border border-white/12 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-z-light">{pianoInfo.nome}</span>
                <span className="font-bold text-z-green text-lg">€{pianoInfo.importo}</span>
              </div>
              <p className="text-z-muted text-xs mt-1">{pianoInfo.descrizione}</p>
            </div>
          ) : (
            <div className="border border-white/12 rounded-xl p-4 mb-6">
              <p className="text-z-muted text-sm">
                Piano: <span className="text-z-light font-medium">{pianoNome}</span>
              </p>
            </div>
          )}

          {errore && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-xl p-3 text-sm text-red-300">
              {errore}
            </div>
          )}

          <button
            onClick={avviaCheckout}
            disabled={loading || !utente}
            className="w-full bg-z-green text-z-dark font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 text-base"
          >
            {loading ? 'Reindirizzamento su Stripe...' : 'Procedi al pagamento →'}
          </button>

          <p className="text-center text-z-muted/40 text-xs mt-4">
            Pagamento sicuro gestito da Stripe. Zipra non vede i tuoi dati di pagamento.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-z-darker flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}