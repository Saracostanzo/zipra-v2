'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PIANI } from '@/lib/stripe'

export default function CheckoutSuccesso() {
  const params = useSearchParams()
  const pianoId = params.get('piano') as keyof typeof PIANI | null
  const praticaId = params.get('pratica')
  const piano = pianoId ? PIANI[pianoId] : null

  const [fase, setFase] = useState<'verifica' | 'firma_necessaria' | 'redirect'>('verifica')
  const [contatore, setContatore] = useState(3)

  useEffect(() => {
    const controlla = async () => {
      const supabase = createBrowserSupabaseClient()
      let { data: { user } } = await supabase.auth.getUser()

      // Se sessione persa dopo redirect Stripe, prova a recuperarla
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) user = session.user
      }

      if (!user) {
        window.location.href = '/dashboard'
        return
      }

      // Salva user_id in sessionStorage come backup
      sessionStorage.setItem('zipra_user_id_pre_stripe', user.id)

      const { data: profilo } = await supabase
        .from('profiles')
        .select('firma_digitale_autorizzata')
        .eq('id', user.id)
        .single()

      if (profilo?.firma_digitale_autorizzata) {
        setFase('redirect')
      } else {
        setFase('firma_necessaria')
      }
    }
    controlla()
  }, [])

  // Countdown solo quando siamo in redirect diretto
  useEffect(() => {
    if (fase !== 'redirect') return
    const t = setInterval(() => {
      setContatore(c => {
        if (c <= 1) {
          clearInterval(t)
          const dest = praticaId ? `/dashboard?pratica=${praticaId}&nuova=1` : '/dashboard'
          window.location.href = dest
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [fase, praticaId])

  // Fase verifica
  if (fase === 'verifica') return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
    </div>
  )

  // Fase firma necessaria — redirect a onboarding/firma
  if (fase === 'firma_necessaria') {
    // Redirect immediato alla pagina firma
    if (typeof window !== 'undefined') {
      // Recupera user_id da sessionStorage e passalo nell'URL
      const savedUserId = sessionStorage.getItem('zipra_user_id_pre_stripe') ?? ''
      window.location.href = `/onboarding/firma?pratica=${praticaId ?? ''}&piano=${pianoId ?? 'base'}&pagato=1&uid=${savedUserId}`
    }
    return (
      <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin mx-auto mb-6" />
          <h2 className="font-bold text-z-light text-xl mb-2">Pagamento confermato! ✓</h2>
          <p className="text-z-muted text-sm">Un ultimo passaggio — firma i documenti per autorizzare Zipra...</p>
        </div>
      </div>
    )
  }

  // Fase redirect — ha già firmato, va in dashboard con countdown
  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-8 bg-z-green/10 border-2 border-z-green rounded-2xl flex items-center justify-center">
          <span className="text-5xl">✓</span>
        </div>

        <h1 className="font-head text-4xl font-bold text-z-light mb-3">
          Pagamento confermato!
        </h1>

        {piano && (
          <div className="bg-z-mid border border-white/8 rounded-xl p-4 mb-6 inline-block">
            <span className="text-2xl mr-2">{piano.emoji}</span>
            <span className="font-head font-bold text-z-light">{piano.nome}</span>
            <span className="text-z-muted text-sm ml-2">attivato</span>
          </div>
        )}

        <p className="text-z-muted mb-2">
          Inizieremo a lavorare sulla tua pratica entro 24 ore lavorative.
        </p>
        <p className="text-z-muted mb-8">
          Hai ricevuto una email di conferma con la ricevuta.
        </p>

        <p className="text-xs font-mono text-z-muted/40 mb-4">
          Reindirizzamento tra {contatore} secondi...
        </p>

        <a
          href={praticaId ? `/dashboard?pratica=${praticaId}&nuova=1` : '/dashboard'}
          className="btn-primary">
          Vai alla dashboard →
        </a>
      </div>
    </div>
  )
}