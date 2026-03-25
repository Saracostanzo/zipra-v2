'use client'
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

  // Controlla il ruolo e reindirizza
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

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-head text-3xl font-bold text-z-light">zipra</span>
          <span className="w-2 h-2 rounded-full bg-z-green inline-block ml-2 mb-1" />
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tua@email.com" className="input-field" />
            </div>
            <div>
              <label className="label-field">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="La tua password" className="input-field"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="btn-primary w-full justify-center py-3">
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