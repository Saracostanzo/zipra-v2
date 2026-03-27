'use client'
import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          setErrore('Link non valido o scaduto. Richiedine uno nuovo.')
        } else {
          setPronto(true)
        }
      })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPronto(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronto(true)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async () => {
    setErrore('')
    if (nuovaPassword.length < 8) { setErrore('La password deve avere almeno 8 caratteri'); return }
    if (nuovaPassword !== conferma) { setErrore('Le password non coincidono'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    setLoading(false)
    if (error) setErrore('Errore: ' + error.message)
    else { setSuccesso(true); setTimeout(() => router.push('/dashboard'), 2000) }
  }

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="font-head text-3xl font-bold text-z-light">zipra ⚡</a>
        </div>
        <div className="bg-z-mid border border-white/8 p-8">
          {successo ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="font-head font-bold text-xl text-z-light mb-2">Password aggiornata!</h2>
              <p className="text-z-muted text-sm">Reindirizzamento alla dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="font-head font-bold text-xl text-z-light mb-2">Nuova password</h2>
              <p className="text-z-muted text-sm mb-6">Scegli una password sicura per il tuo account Zipra.</p>

              {errore && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 mb-4">
                  {errore}
                  <div className="mt-2">
                    <a href="/auth/login" className="text-red-400 underline text-xs">← Torna al login</a>
                  </div>
                </div>
              )}

              {!pronto && !errore && (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-z-muted text-sm">Verifica in corso...</p>
                </div>
              )}

              {pronto && (
                <div className="space-y-4">
                  <div>
                    <label className="label-field">Nuova password</label>
                    <input
                      type="password"
                      value={nuovaPassword}
                      onChange={e => setNuovaPassword(e.target.value)}
                      placeholder="Minimo 8 caratteri"
                      className="input-field"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label-field">Conferma password</label>
                    <input
                      type="password"
                      value={conferma}
                      onChange={e => setConferma(e.target.value)}
                      placeholder="Ripeti la password"
                      className="input-field"
                      onKeyDown={e => e.key === 'Enter' && handleReset()}
                    />
                  </div>
                  {nuovaPassword.length > 0 && conferma.length > 0 && nuovaPassword !== conferma && (
                    <p className="text-xs text-red-400">Le password non coincidono</p>
                  )}
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="btn-primary w-full justify-center py-3 disabled:opacity-50"
                  >
                    {loading ? '⏳ Salvataggio...' : '🔐 Imposta nuova password'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}