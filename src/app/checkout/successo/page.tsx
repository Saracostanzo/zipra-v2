'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { PIANI } from '@/lib/stripe'

function SuccessoContent() {
  const params = useSearchParams()
  const pianoId = params.get('piano') as keyof typeof PIANI | null
  const praticaId = params.get('pratica')
  const piano = pianoId && PIANI[pianoId] ? PIANI[pianoId] : null
  const [contatore, setContatore] = useState(6)
  const dest = praticaId && praticaId.length > 10
    ? `/dashboard?pratica=${praticaId}&nuova=1`
    : '/dashboard'

  // Salva userId in sessionStorage per sicurezza (utile se sessione instabile dopo redirect Stripe)
  useEffect(() => {
    createBrowserSupabaseClient().auth.getUser().then(({ data: { user } }) => {
      if (user) sessionStorage.setItem('zipra_user_id', user.id)
    })
  }, [])

  // Countdown e redirect automatico — va diretto in dashboard, nessun loop
  useEffect(() => {
    const t = setInterval(() => {
      setContatore(c => {
        if (c <= 1) { clearInterval(t); window.location.href = dest; return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [dest])

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        <div className="w-20 h-20 mx-auto mb-6 bg-z-green/10 border-2 border-z-green/30 rounded-2xl flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-z-green">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="font-head text-3xl font-bold text-z-light mb-2">
          Pagamento completato!
        </h1>
        <p className="text-z-muted text-sm mb-5">
          Grazie — inizieremo a lavorare sulla tua pratica entro 24 ore lavorative.
        </p>

        {piano && (
          <div className="bg-z-mid border border-white/8 rounded-xl px-5 py-3 mb-5 inline-block">
            <span className="font-bold text-z-light">{piano.nome}</span>
            <span className="text-z-green font-bold ml-3">€{piano.importo}</span>
            <span className="text-z-muted text-sm ml-2">attivato</span>
          </div>
        )}

        <div className="bg-z-mid border border-white/8 rounded-xl p-4 mb-6 text-left space-y-2">
          <p className="text-sm font-medium text-z-light">Prossimi passi:</p>
          <p className="text-xs text-z-muted leading-relaxed">
            <span className="text-z-green mr-2">1.</span>
            Riceverai un&apos;email da <strong>Yousign</strong> con il link per firmare la procura speciale — 30 secondi dal telefono.
          </p>
          <p className="text-xs text-z-muted leading-relaxed">
            <span className="text-z-green mr-2">2.</span>
            Dopo la firma, il nostro team prende in carico la pratica e ti aggiorneremo ad ogni passaggio.
          </p>
        </div>

        <p className="text-z-muted/50 text-xs mb-4">
          Reindirizzamento automatico in {contatore} secondi...
        </p>

        <a
          href={dest}
          className="block w-full bg-z-green text-z-dark font-bold py-3 rounded-xl hover:opacity-90 transition text-center"
        >
          Vai alla dashboard
        </a>
      </div>
    </div>
  )
}

export default function CheckoutSuccessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-z-darker flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
      </div>
    }>
      <SuccessoContent />
    </Suspense>
  )
}