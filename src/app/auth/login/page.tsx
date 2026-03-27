'use client'
// PATH: src/app/auth/login/page.tsx

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [modalitaRecupero, setModalitaRecupero] = useState(false)
  const [emailInviata, setEmailInviata] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setErrore('Inserisci email e password'); return }
    setLoading(true)
    setErrore('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrore('Email o password non corretti')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', email)
      .single()

    if (profile?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  const handleRecuperoPassword = async () => {
    if (!email) { setErrore('Inserisci prima la tua email'); return }
    setLoading(true)
    setErrore('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (error) {
      setErrore('Errore: ' + error.message)
    } else {
      setEmailInviata(true)
    }
  }

  // ── Modalità recupero password ──────────────────────────────────────────
  if (modalitaRecupero) {
    return (
      <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <a href="/" className="font-head text-3xl font-bold text-z-light">zipra ⚡</a>
          </div>

          <div className="bg-z-mid border border-white/8 p-8">
            {emailInviata ? (
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="font-head font-bold text-xl text-z-light mb-2">Email inviata!</h2>
                <p className="text-z-muted text-sm mb-6">
                  Controlla la tua casella di posta. Trovi un link per reimpostare la password.
                  Il link scade dopo 1 ora.
                </p>
                <button
                  onClick={() => { setModalitaRecupero(false); setEmailInviata(false) }}
                  className="btn-secondary w-full justify-center"
                >
                  ← Torna al login
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-head font-bold text-xl text-z-light mb-2">Recupera password</h2>
                <p className="text-z-muted text-sm mb-6">
                  Inserisci la tua email — ti mandiamo un link per reimpostare la password.
                </p>

                {errore && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 mb-4">
                    {errore}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="label-field">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tua@email.com"
                      className="input-field"
                      onKeyDown={e => e.key === 'Enter' && handleRecuperoPassword()}
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleRecuperoPassword}
                    disabled={loading}
                    className="btn-primary w-full justify-center py-3"
                  >
                    {loading ? '⏳ Invio...' : '📧 Invia link di recupero'}
                  </button>
                </div>

                <button
                  onClick={() => { setModalitaRecupero(false); setErrore('') }}
                  className="text-z-muted text-sm hover:text-z-light transition w-full text-center mt-4"
                >
                  ← Torna al login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Modalità login normale ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="font-head text-3xl font-bold text-z-light">zipra ⚡</a>
        </div>

        <div className="bg-z-mid border border-white/8 p-8">
          <h2 className="font-head font-bold text-xl text-z-light mb-6">Accedi</h2>

          {errore && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 mb-4">
              {errore}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tua@email.com"
                className="input-field"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label-field">Password</label>
                <button
                  type="button"
                  onClick={() => { setModalitaRecupero(true); setErrore('') }}
                  className="text-xs text-z-green hover:underline"
                >
                  Password dimenticata?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="La tua password"
                className="input-field"
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? 'Accesso...' : 'Accedi →'}
            </button>
          </div>

          <p className="text-center text-z-muted text-sm mt-4">
            Non hai un account?{' '}
            <a href="/auth/signup" className="text-z-green hover:underline">Registrati</a>
          </p>
        </div>
      </div>
    </div>
  )
}