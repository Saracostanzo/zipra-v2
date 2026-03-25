'use client'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

export default function ImpostazioniPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  const cambiaPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessaggio(null)

    if (nuovaPassword.length < 8) {
      setMessaggio({ tipo: 'errore', testo: 'La password deve avere almeno 8 caratteri.' })
      return
    }
    if (nuovaPassword !== confermaPassword) {
      setMessaggio({ tipo: 'errore', testo: 'Le password non coincidono.' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    setLoading(false)

    if (error) {
      setMessaggio({ tipo: 'errore', testo: error.message })
    } else {
      setMessaggio({ tipo: 'ok', testo: '✅ Password aggiornata con successo!' })
      setNuovaPassword('')
      setConfermaPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-z-darker">

      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="text-z-muted hover:text-z-light text-sm transition">
            ← Dashboard
          </button>
          <h1 className="font-bold text-z-light">Impostazioni account</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Cambio password */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-1">Cambia password</h2>
          <p className="text-z-muted text-sm mb-6">
            Se hai ricevuto una password temporanea da Zipra, cambiale subito con una tua.
          </p>

          <form onSubmit={cambiaPassword} className="space-y-4 max-w-sm">
            <div>
              <label className="label-field">Nuova password</label>
              <input
                type="password"
                value={nuovaPassword}
                onChange={e => setNuovaPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Conferma nuova password</label>
              <input
                type="password"
                value={confermaPassword}
                onChange={e => setConfermaPassword(e.target.value)}
                placeholder="Ripeti la password"
                className="input-field"
                required
              />
            </div>

            {messaggio && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                messaggio.tipo === 'ok'
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/25 text-red-400'
              }`}>
                {messaggio.testo}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center">
              {loading ? '⏳ Aggiornamento...' : 'Aggiorna password'}
            </button>
          </form>
        </div>

        {/* Reset password via email */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-1">Hai dimenticato la password?</h2>
          <p className="text-z-muted text-sm mb-4">
            Ti mandiamo un link per reimpostarla via email.
          </p>
          <button
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user?.email) return
              await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/dashboard/impostazioni`,
              })
              setMessaggio({ tipo: 'ok', testo: '📧 Email inviata! Controlla la tua casella.' })
            }}
            className="btn-secondary text-sm">
            📧 Invia link di reset via email
          </button>
        </div>

      </div>
    </div>
  )
}