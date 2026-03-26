'use client'

// PATH: src/app/checkout/page.tsx
//
// Gestisce 3 casi:
// 1. Piano abbonamento (base/pro) → Stripe subscription
// 2. Pratica singola per non abbonati → Stripe payment
// 3. Utente già abbonato con pratica INCLUSA → skip checkout, vai in dashboard
//
// L'URL arriva dal wizard: /checkout?pratica=UUID_DB&piano=base|pro|singola

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { PIANI } from '@/lib/stripe'

const PIANI_ABBONAMENTO = ['base', 'pro', 'mantenimento', 'business', 'business_pro']
// Pratiche incluse nell'abbonamento base e pro (non richiedono pagamento extra)
const PRATICHE_INCLUSE_ABBONAMENTO = [
  'variazione_sede', 'variazione_ateco', 'variazione_pec', 'suap_modifica',
  'deposito_bilancio', 'diritto_annuale', 'rinnovo_sanitario', 'cessazione_ditta',
  'nomina_admin', 'aggiunta_socio',
]

function CheckoutContent() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const praticaDbId = searchParams.get('pratica') // UUID database
  const pianoNome   = searchParams.get('piano') || 'base'

  const [loading, setLoading] = useState(true) // loading iniziale per controllo abbonamento
  const [pagando, setPagando] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [profilo, setProfilo] = useState<any>(null)
  const [pratica, setPratica] = useState<any>(null)
  const [inclusa, setInclusa] = useState(false) // pratica inclusa nell'abbonamento

  const pianoInfo = PIANI[pianoNome as keyof typeof PIANI] ?? null
  const isAbbonamento = PIANI_ABBONAMENTO.includes(pianoNome)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
        return
      }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfilo(p)

      if (praticaDbId) {
        const { data: pr } = await supabase.from('pratiche').select('*').eq('id', praticaDbId).single()
        setPratica(pr)

        // Se l'utente ha già un abbonamento attivo e la pratica è inclusa → skip pagamento
        const haAbbonamento = ['base', 'pro', 'mantenimento'].includes(p?.piano ?? '')
        const praticaIncl = PRATICHE_INCLUSE_ABBONAMENTO.some(k =>
          (pr?.tipo_attivita ?? '').toLowerCase().includes(k.replace('_', ' '))
        )

        if (haAbbonamento && praticaIncl && pianoNome === 'singola') {
          setInclusa(true)
          // Aggiorna stato pratica direttamente
          await supabase.from('pratiche')
            .update({ stato: 'in_revisione_admin', pagato: true, pagato_at: new Date().toISOString() })
            .eq('id', praticaDbId)
          setTimeout(() => router.push(`/dashboard?pratica=${praticaDbId}&nuova=1`), 2000)
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  const avviaCheckout = async () => {
    setErrore(null)
    setPagando(true)
    try {
      const payload: Record<string, string> = {}

      if (isAbbonamento) {
        payload.pianoId = pianoNome
      } else {
        // Singola pratica — usa importo variabile
        payload.singola = 'true'
      }
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
      setPagando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
    </div>
  )

  // Pratica inclusa nell'abbonamento — redirect automatico
  if (inclusa) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-z-green/10 border-2 border-z-green/30 rounded-2xl flex items-center justify-center">
          <span className="text-4xl text-z-green">✓</span>
        </div>
        <h1 className="font-head text-2xl font-bold text-z-light mb-2">Pratica inclusa nel tuo piano!</h1>
        <p className="text-z-muted text-sm mb-4">
          Questa pratica è compresa nel tuo abbonamento {profilo?.piano?.toUpperCase()} — nessun pagamento aggiuntivo.
        </p>
        <p className="text-z-muted/50 text-xs">Reindirizzamento alla dashboard...</p>
      </div>
    </div>
  )

  // Calcola importo per pratica singola
  const importoSingola = pratica
    ? (pratica.tipo_attivita?.toLowerCase().includes('srl') ? 299 : 199)
    : 199

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra</a>
        </div>

        <div className="bg-z-mid border border-white/10 rounded-2xl p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-z-light mb-1">Completa il pagamento</h1>
          <p className="text-z-muted text-sm mb-6">
            Verrai reindirizzato su Stripe — pagamento sicuro e crittografato.
          </p>

          {/* Riepilogo piano o pratica singola */}
          <div className="border border-white/12 rounded-xl p-4 mb-6">
            {isAbbonamento && pianoInfo ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-z-light">{pianoInfo.nome}</p>
                  <p className="text-z-muted text-xs mt-0.5">{pianoInfo.descrizione}</p>
                </div>
                <span className="font-bold text-z-green text-xl">€{pianoInfo.importo}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-z-light">Pratica singola</p>
                  <p className="text-z-muted text-xs mt-0.5 truncate max-w-xs">
                    {pratica?.tipo_attivita || pratica?.nome_impresa || 'Apertura impresa'}
                  </p>
                </div>
                <span className="font-bold text-z-green text-xl">€{importoSingola}</span>
              </div>
            )}
          </div>

          {/* Upsell abbonamento per chi sceglie singola */}
          {!isAbbonamento && (
            <div className="bg-z-green/5 border border-z-green/20 rounded-xl p-4 mb-5">
              <p className="text-xs text-z-green font-bold mb-1">💡 Risparmi con il piano annuale</p>
              <p className="text-xs text-z-muted">
                Con il Piano Base a <strong className="text-z-light">€149/anno</strong> tutte le pratiche
                di apertura e variazione sono incluse — paghi solo i diritti agli enti.
              </p>
              <button
                onClick={() => router.push(`/checkout?pratica=${praticaDbId}&piano=base`)}
                className="mt-2 text-xs text-z-green underline"
              >
                Passa al Piano Base →
              </button>
            </div>
          )}

          {errore && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-xl p-3 text-sm text-red-300">
              {errore}
            </div>
          )}

          <button
            onClick={avviaCheckout}
            disabled={pagando}
            className="w-full bg-z-green text-z-dark font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 text-base"
          >
            {pagando ? 'Reindirizzamento su Stripe...' : 'Procedi al pagamento →'}
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