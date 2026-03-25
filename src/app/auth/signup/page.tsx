'use client'
// src/app/signup/page.tsx
// VERSIONE CORRETTA con:
// 1. Raccolta dati anagrafici completi (necessari per procura e atti CCIAA)
// 2. Procura speciale inviata via Yousign SUBITO dopo registrazione
// 3. Delega Zipra attivata al momento della firma
// 4. Aggiornamento tabella procura su Supabase dopo firma

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'account' | 'anagrafica' | 'procura' | 'completato'

interface DatiAccount {
  email: string
  password: string
  conferma_password: string
}

interface DatiAnagrafica {
  full_name: string
  codice_fiscale: string
  data_nascita: string
  luogo_nascita: string
  via_residenza: string
  civico_residenza: string
  comune_residenza: string
  cap_residenza: string
  provincia_residenza: string
  telefono: string
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [firmaProcuraUrl, setFirmaProcuraUrl] = useState<string | null>(null)

  const [account, setAccount] = useState<DatiAccount>({ email: '', password: '', conferma_password: '' })
  const [anagrafica, setAnagrafica] = useState<DatiAnagrafica>({
    full_name: '', codice_fiscale: '', data_nascita: '', luogo_nascita: '',
    via_residenza: '', civico_residenza: '', comune_residenza: '', cap_residenza: '',
    provincia_residenza: '', telefono: '',
  })

  // ─── Step 1: Crea account ─────────────────────────────────────────────
  const handleRegistrazione = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (account.password !== account.conferma_password) { setError('Le password non coincidono'); return }
    if (account.password.length < 8) { setError('Password min 8 caratteri'); return }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
    })

    if (authError) { setError(authError.message); setLoading(false); return }
    if (data.user) { setUserId(data.user.id); setStep('anagrafica') }
    setLoading(false)
  }

  // ─── Step 2: Salva anagrafica + genera procura ────────────────────────
  const handleAnagrafica = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Valida CF
    if (anagrafica.codice_fiscale.length !== 16) { setError('Codice fiscale deve avere 16 caratteri'); return }

    setLoading(true)
    
    // Salva profilo completo su Supabase
    const residenza = `${anagrafica.via_residenza} ${anagrafica.civico_residenza}, ${anagrafica.cap_residenza} ${anagrafica.comune_residenza} (${anagrafica.provincia_residenza})`
    
    await supabase.from('profiles').upsert({
      id: userId,
      email: account.email,
      full_name: anagrafica.full_name,
      codice_fiscale: anagrafica.codice_fiscale.toUpperCase(),
      data_nascita: anagrafica.data_nascita,
      luogo_nascita: anagrafica.luogo_nascita,
      residenza,
      telefono: anagrafica.telefono,
      procura_firmata: false,
      created_at: new Date().toISOString(),
    })

    // Genera e invia procura speciale
    const res = await fetch('/api/procura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: anagrafica.full_name.split(' ')[0],
        cognome: anagrafica.full_name.split(' ').slice(1).join(' '),
        data_nascita: anagrafica.data_nascita,
        luogo_nascita: anagrafica.luogo_nascita,
        codice_fiscale: anagrafica.codice_fiscale.toUpperCase(),
        residenza,
        email: account.email,
        telefono: anagrafica.telefono,
      })
    })

    const procuraData = await res.json()

    if (procuraData.firma_url) {
      setFirmaProcuraUrl(procuraData.firma_url)
    }

    setStep('procura')
    setLoading(false)
  }

  // ─── Step 3: Firma procura (in-page via iframe Yousign o link) ────────
  const handleProcuraFirmata = async () => {
    // Verifica stato firma
    const res = await fetch('/api/procura')
    const data = await res.json()
    
    if (data.firmata) {
      setStep('completato')
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setError('Procura non ancora firmata. Apri il link e firma con OTP SMS.')
    }
  }

  const saltaFirmaProcura = async () => {
    // Permette di continuare senza firma — Zipra non potrà operare per loro conto
    // La firma viene richiesta prima di inviare qualsiasi pratica
    setStep('completato')
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-blue-600">Zipra</a>
          <p className="text-gray-500 text-sm mt-1">Pratiche burocratiche per imprese</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['account', 'anagrafica', 'procura', 'completato'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s ? 'bg-blue-600 text-white' :
                ['account', 'anagrafica', 'procura', 'completato'].indexOf(step) > i ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>{i + 1}</div>
              {i < 3 && <div className={`w-8 h-0.5 ${['account', 'anagrafica', 'procura', 'completato'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">

          {/* STEP 1: Account */}
          {step === 'account' && (
            <form onSubmit={handleRegistrazione} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Crea il tuo account</h2>
                <p className="text-gray-500 text-sm mt-1">Gratis — nessuna carta richiesta</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required value={account.email} onChange={e => setAccount({...account, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="mario@esempio.it" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" required value={account.password} onChange={e => setAccount({...account, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="Minimo 8 caratteri" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Password</label>
                <input type="password" required value={account.conferma_password} onChange={e => setAccount({...account, conferma_password: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="Ripeti la password" />
              </div>

              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? 'Creazione account...' : 'Continua →'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Hai già un account? <a href="/login" className="text-blue-600 hover:underline">Accedi</a>
              </p>
            </form>
          )}

          {/* STEP 2: Anagrafica */}
          {step === 'anagrafica' && (
            <form onSubmit={handleAnagrafica} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">I tuoi dati</h2>
                <p className="text-gray-500 text-sm mt-1">Necessari per aprire la tua impresa e per la procura di delega a Zipra</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome e Cognome completo</label>
                <input required value={anagrafica.full_name} onChange={e => setAnagrafica({...anagrafica, full_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Mario Rossi" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                  <input required maxLength={16} value={anagrafica.codice_fiscale} onChange={e => setAnagrafica({...anagrafica, codice_fiscale: e.target.value.toUpperCase()})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="RSSMRA80A01H501Z" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input required value={anagrafica.telefono} onChange={e => setAnagrafica({...anagrafica, telefono: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+39 333 1234567" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data di nascita</label>
                  <input type="date" required value={anagrafica.data_nascita} onChange={e => setAnagrafica({...anagrafica, data_nascita: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Luogo di nascita</label>
                  <input required value={anagrafica.luogo_nascita} onChange={e => setAnagrafica({...anagrafica, luogo_nascita: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Roma" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo di residenza</label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <input required value={anagrafica.via_residenza} onChange={e => setAnagrafica({...anagrafica, via_residenza: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Via Roma" />
                  </div>
                  <div>
                    <input required value={anagrafica.civico_residenza} onChange={e => setAnagrafica({...anagrafica, civico_residenza: e.target.value})}
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="N. civico" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input required value={anagrafica.cap_residenza} maxLength={5} onChange={e => setAnagrafica({...anagrafica, cap_residenza: e.target.value})}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="CAP" />
                  <input required value={anagrafica.comune_residenza} onChange={e => setAnagrafica({...anagrafica, comune_residenza: e.target.value})}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Comune" />
                  <input required maxLength={2} value={anagrafica.provincia_residenza} onChange={e => setAnagrafica({...anagrafica, provincia_residenza: e.target.value.toUpperCase()})}
                    className="border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase" placeholder="PR" />
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? 'Salvataggio e invio procura...' : 'Continua — Firma la procura di delega →'}
              </button>
            </form>
          )}

          {/* STEP 3: Firma Procura */}
          {step === 'procura' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Firma la procura di delega</h2>
                <p className="text-gray-500 text-sm mt-1">Necessaria per permetterci di operare per tuo conto</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Cosa stiamo chiedendo</h3>
                <p className="text-sm text-blue-800">
                  Con questa procura speciale autorizzi Zipra a presentare le pratiche burocratiche
                  in tua vece (ComUnica, SCIA, richieste di certificati) esattamente come farebbe
                  un CAF o un patronato. Non cedi nessun diritto patrimoniale.
                  Puoi revocarla in qualsiasi momento.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-blue-700">
                  <li>✅ Apertura P.IVA e iscrizione CCIAA</li>
                  <li>✅ SCIA al Comune (SUAP)</li>
                  <li>✅ Richiesta certificati (casellario, INPS)</li>
                  <li>✅ Iscrizione gestione INPS artigiani/commercianti</li>
                  <li>❌ Non include poteri patrimoniali o contrattuali</li>
                </ul>
              </div>

              {firmaProcuraUrl ? (
                <div className="space-y-3">
                  <a
                    href={firmaProcuraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition text-center"
                  >
                    ✍️ Firma la procura digitalmente →
                  </a>
                  <p className="text-xs text-gray-500 text-center">
                    Si apre una nuova finestra. Dopo la firma, torna qui e clicca "Ho firmato".
                  </p>
                  <button
                    onClick={handleProcuraFirmata}
                    className="w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-medium hover:bg-blue-50 transition"
                  >
                    ✅ Ho firmato — continua
                  </button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm">
                    ⏳ Stiamo preparando il documento di procura...
                    Ti arriverà un link via email e SMS per firmare digitalmente.
                  </p>
                </div>
              )}

              {error && <div className="bg-red-50 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>}

              <button onClick={saltaFirmaProcura} className="w-full text-gray-400 hover:text-gray-600 text-sm underline">
                Salta per ora (la firma sarà richiesta prima di inviare le pratiche)
              </button>
            </div>
          )}

          {/* STEP 4: Completato */}
          {step === 'completato' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">Account creato!</h2>
              <p className="text-gray-500">Accesso alla dashboard in corso...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}