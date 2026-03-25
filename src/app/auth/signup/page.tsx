'use client'

// PATH: src/app/auth/signup/page.tsx

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

type Step = 'account' | 'anagrafica' | 'completato'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [account, setAccount] = useState({ email: '', password: '', conferma_password: '' })
  const [anagrafica, setAnagrafica] = useState({
    nome: '',
    cognome: '',
    codice_fiscale: '',
    data_nascita: '',
    luogo_nascita: '',
    via_residenza: '',
    civico_residenza: '',
    comune_residenza: '',
    cap_residenza: '',
    provincia_residenza: '',
    telefono: '',
  })

  const handleAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (account.password !== account.conferma_password) {
      setError('Le password non coincidono')
      return
    }
    if (account.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri')
      return
    }
    setLoading(true)
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
      })
      if (signUpError) throw signUpError
      setStep('anagrafica')
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  const handleAnagrafica = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessione non trovata — riprova')

      const residenza = `${anagrafica.via_residenza} ${anagrafica.civico_residenza}, ${anagrafica.cap_residenza} ${anagrafica.comune_residenza} (${anagrafica.provincia_residenza})`

      await supabase.from('profiles').update({
        nome: anagrafica.nome,
        cognome: anagrafica.cognome,
        full_name: `${anagrafica.nome} ${anagrafica.cognome}`.trim(),
        codice_fiscale: anagrafica.codice_fiscale.toUpperCase(),
        data_nascita: anagrafica.data_nascita || null,
        luogo_nascita: anagrafica.luogo_nascita || null,
        residenza: residenza.trim(),
        telefono: anagrafica.telefono || null,
      }).eq('id', user.id)

      // Invia procura speciale via Yousign se telefono presente
      if (anagrafica.telefono) {
        try {
          await fetch('/api/procura', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: anagrafica.nome,
              cognome: anagrafica.cognome,
              data_nascita: anagrafica.data_nascita,
              luogo_nascita: anagrafica.luogo_nascita,
              codice_fiscale: anagrafica.codice_fiscale.toUpperCase(),
              residenza,
              email: account.email,
              telefono: anagrafica.telefono,
            }),
          })
        } catch {
          // Non bloccante — la procura si può reinviare dall'admin
        }
      }

      setStep('completato')
      setTimeout(() => router.push('/onboarding'), 1500)
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="font-head text-2xl font-bold text-z-light">zipra</a>
          <p className="text-z-muted text-sm mt-1">
            {step === 'account' && 'Crea il tuo account'}
            {step === 'anagrafica' && 'Dati anagrafici'}
            {step === 'completato' && 'Account creato!'}
          </p>
        </div>

        {/* STEP 1: Account */}
        {step === 'account' && (
          <form onSubmit={handleAccount} className="bg-z-mid border border-white/8 rounded-2xl p-6 space-y-4">
            <div>
              <label className="label-field">Email *</label>
              <input type="email" required value={account.email}
                onChange={e => setAccount(p => ({ ...p, email: e.target.value }))}
                className="input-field" placeholder="tua@email.it" />
            </div>
            <div>
              <label className="label-field">Password *</label>
              <input type="password" required value={account.password}
                onChange={e => setAccount(p => ({ ...p, password: e.target.value }))}
                className="input-field" placeholder="Minimo 8 caratteri" />
            </div>
            <div>
              <label className="label-field">Conferma password *</label>
              <input type="password" required value={account.conferma_password}
                onChange={e => setAccount(p => ({ ...p, conferma_password: e.target.value }))}
                className="input-field" placeholder="Ripeti la password" />
            </div>
            {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</div>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50">
              {loading ? 'Creazione account...' : 'Crea account →'}
            </button>
            <p className="text-center text-z-muted/50 text-xs">
              Hai già un account?{' '}
              <a href="/auth/login" className="text-z-green underline">Accedi</a>
            </p>
          </form>
        )}

        {/* STEP 2: Anagrafica */}
        {step === 'anagrafica' && (
          <form onSubmit={handleAnagrafica} className="bg-z-mid border border-white/8 rounded-2xl p-6 space-y-4">
            <p className="text-z-muted text-sm">
              Questi dati servono per compilare automaticamente le pratiche e la procura speciale.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Nome *</label>
                <input required value={anagrafica.nome}
                  onChange={e => setAnagrafica(p => ({ ...p, nome: e.target.value }))}
                  className="input-field" placeholder="Mario" />
              </div>
              <div>
                <label className="label-field">Cognome *</label>
                <input required value={anagrafica.cognome}
                  onChange={e => setAnagrafica(p => ({ ...p, cognome: e.target.value }))}
                  className="input-field" placeholder="Rossi" />
              </div>
            </div>
            <div>
              <label className="label-field">Codice fiscale *</label>
              <input required value={anagrafica.codice_fiscale}
                onChange={e => setAnagrafica(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))}
                className="input-field font-mono" placeholder="RSSMRA80A01H501Z"
                maxLength={16} minLength={16} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Data di nascita</label>
                <input type="date" value={anagrafica.data_nascita}
                  onChange={e => setAnagrafica(p => ({ ...p, data_nascita: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="label-field">Luogo di nascita</label>
                <input value={anagrafica.luogo_nascita}
                  onChange={e => setAnagrafica(p => ({ ...p, luogo_nascita: e.target.value }))}
                  className="input-field" placeholder="Roma" />
              </div>
            </div>
            <div>
              <label className="label-field">Numero di telefono *</label>
              <input required type="tel" value={anagrafica.telefono}
                onChange={e => setAnagrafica(p => ({ ...p, telefono: e.target.value }))}
                className="input-field" placeholder="+39 333 1234567" />
              <p className="text-xs text-z-muted/50 mt-1">
                Necessario per ricevere il codice OTP per firmare la procura digitale
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label-field">Via/Piazza residenza</label>
                <input value={anagrafica.via_residenza}
                  onChange={e => setAnagrafica(p => ({ ...p, via_residenza: e.target.value }))}
                  className="input-field" placeholder="Via Roma" />
              </div>
              <div>
                <label className="label-field">N. civico</label>
                <input value={anagrafica.civico_residenza}
                  onChange={e => setAnagrafica(p => ({ ...p, civico_residenza: e.target.value }))}
                  className="input-field" placeholder="1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label-field">CAP</label>
                <input value={anagrafica.cap_residenza}
                  onChange={e => setAnagrafica(p => ({ ...p, cap_residenza: e.target.value }))}
                  className="input-field font-mono" placeholder="73100" maxLength={5} />
              </div>
              <div>
                <label className="label-field">Comune</label>
                <input value={anagrafica.comune_residenza}
                  onChange={e => setAnagrafica(p => ({ ...p, comune_residenza: e.target.value }))}
                  className="input-field" placeholder="Lecce" />
              </div>
              <div>
                <label className="label-field">Prov.</label>
                <input value={anagrafica.provincia_residenza}
                  onChange={e => setAnagrafica(p => ({ ...p, provincia_residenza: e.target.value.toUpperCase() }))}
                  className="input-field font-mono" placeholder="LE" maxLength={2} />
              </div>
            </div>
            {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</div>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-50">
              {loading ? 'Salvataggio...' : 'Completa registrazione →'}
            </button>
          </form>
        )}

        {/* STEP 3: Completato */}
        {step === 'completato' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-z-light">Account creato!</h2>
            <p className="text-z-muted text-sm">Reindirizzamento in corso...</p>
          </div>
        )}
      </div>
    </div>
  )
}