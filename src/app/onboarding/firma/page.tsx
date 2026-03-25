'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
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
    // Supporta sia 'uid' che 'user_id' nei parametri URL
    const uidFromUrl = params.get('uid') || params.get('user_id') || sessionStorage.getItem('zipra_user_id')
    setPraticaId(pid)
    setPiano(p)

    const init = async () => {
      let uid: string | null = null

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        uid = user.id
      } else if (uidFromUrl) {
        uid = uidFromUrl
      } else {
        sessionStorage.setItem('zipra_dopo_login', window.location.href)
        router.push('/auth/login')
        return
      }

      setUserId(uid)

      const { data: profilo } = await supabase
        .from('profiles')
        .select('firma_digitale_autorizzata')
        .eq('id', uid)
        .single()

      if (profilo?.firma_digitale_autorizzata) {
        setGiaFirmato(true)
        setTimeout(() => {
          router.push(pid ? `/dashboard?pratica=${pid}&nuova=1` : '/dashboard')
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
        <div className="text-5xl mb-4">&#10003;</div>
        <h2 className="font-bold text-z-light text-xl mb-2">Hai gia firmato!</h2>
        <p className="text-z-muted text-sm">Reindirizzamento alla dashboard...</p>
      </div>
    </div>
  )

  if (!userId) return null

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra</a>
          <p className="text-z-muted text-sm mt-1">Ultimo passaggio — firma i documenti</p>
        </div>
        <FirmaOnboarding
          praticaId={praticaId ?? ''}
          userId={userId}
          piano={piano}
          onComplete={() => {
            router.push(praticaId ? `/dashboard?pratica=${praticaId}&nuova=1` : '/dashboard')
          }}
        />
      </div>
    </div>
  )
}