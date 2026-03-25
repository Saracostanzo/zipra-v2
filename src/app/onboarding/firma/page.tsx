'use client'
// src/app/onboarding/firma/page.tsx
// Mostrata dopo il pagamento Stripe
// Chiede nuova attività vs esistente → avvia firma digitale + procura

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FirmaOnboarding from '@/components/FirmaOnboarding'

export default function OnboardingFirmaPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [praticaId, setPraticaId] = useState<string | null>(null)
  const [piano, setPiano] = useState<string>('base')
  const [giaFirmato, setGiaFirmato] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pid = params.get('pratica')
    const p = params.get('piano') || 'base'
    // uid passato nell'URL dalla pagina successo (sopravvive ai redirect)
    const uidFromUrl = params.get('uid')
    setPraticaId(pid)
    setPiano(p)

    const init = async () => {
      let uid: string | null = null

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        uid = user.id
      } else if (uidFromUrl) {
        // Sessione persa ma abbiamo uid dall'URL — usiamo quello
        uid = uidFromUrl
      } else {
        // Nessuna sessione e nessun uid — vai al login
        sessionStorage.setItem('zipra_dopo_login', window.location.href)
        router.push('/auth/signup')
        return
      }

      setUserId(uid)

      // Controlla se ha già firmato
      const { data: profilo } = await supabase
        .from('profiles')
        .select('firma_digitale_autorizzata')
        .eq('id', uid)
        .single()

      if (profilo?.firma_digitale_autorizzata) {
        setGiaFirmato(true)
        setTimeout(() => {
          router.push(`/dashboard?pratica=${pid}&nuova=1`)
        }, 2000)
      }

      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
    </div>
  )

  if (giaFirmato) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-bold text-z-light text-xl mb-2">Hai già firmato</h2>
        <p className="text-z-muted text-sm">Procura speciale già presente — ti portiamo subito alla dashboard.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra ⚡</a>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-z-green text-sm">✓ Pagamento completato</span>
            <span className="text-z-muted/30">→</span>
            <span className="text-z-light text-sm font-bold">Firma documenti</span>
          </div>
        </div>

        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          {userId && praticaId && (
            <FirmaOnboarding
              praticaId={praticaId}
              userId={userId}
              piano={piano}
              onComplete={() => router.push(`/dashboard?pratica=${praticaId}&nuova=1`)}
            />
          )}
        </div>

        <p className="text-center text-xs text-z-muted/30 mt-4">
          La procura è valida per tutte le pratiche future — non dovrai firmare di nuovo.
        </p>
      </div>
    </div>
  )
}