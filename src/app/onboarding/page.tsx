'use client'

// PATH: src/app/onboarding/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import toast from 'react-hot-toast'

type TipoAccount = 'privato' | 'caf' | 'commercialista' | 'agenzia' | 'patronato'

const TIPI_BUSINESS: { id: TipoAccount; label: string; desc: string; emoji: string }[] = [
  { id: 'caf',            emoji: '🏢', label: 'CAF',             desc: 'Centro di Assistenza Fiscale' },
  { id: 'commercialista', emoji: '📊', label: 'Commercialista',  desc: 'Studio commercialista o tributarista' },
  { id: 'agenzia',        emoji: '🤝', label: 'Agenzia pratiche', desc: 'Agenzia disbrigo pratiche' },
  { id: 'patronato',      emoji: '🏛️', label: 'Patronato',       desc: 'INCA, ACLI, ITAL, EPASA e altri patronati' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [tipo, setTipo] = useState<TipoAccount | null>(null)
  const [step, setStep] = useState<'scelta' | 'business_dettagli'>('scelta')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    ragione_sociale: '',
    partita_iva: '',
    indirizzo: '',
    sito_web: '',
  })

  const isPrivato = tipo === 'privato'
  const isBusiness = tipo && tipo !== 'privato'

  const handleContinua = async () => {
    if (!tipo) return
    if (isBusiness && step === 'scelta') {
      setStep('business_dettagli')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('profiles').update({
        tipo_account: tipo,
        onboarding_completato: true,
        ...(isBusiness ? {
          ragione_sociale: form.ragione_sociale,
          partita_iva: form.partita_iva,
          indirizzo: form.indirizzo,
          sito_web: form.sito_web,
        } : {}),
      }).eq('id', user.id)

      if (isBusiness) {
        await supabase.from('profiles').update({
          firma_digitale_autorizzata: true,
        }).eq('id', user.id)

        await supabase.from('business_accounts').insert({
          owner_id: user.id,
          nome: form.ragione_sociale,
          tipo: tipo,
          partita_iva: form.partita_iva,
          indirizzo: form.indirizzo,
        })
        router.push('/business/dashboard')
      } else {
        router.push('/wizard')
      }
    } catch {
      toast.error('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-head text-3xl font-bold text-z-light">zipra</span>
            <span className="w-2 h-2 rounded-full bg-z-green shadow-green-glow" />
          </div>
          <p className="text-z-muted font-body text-sm">
            {step === 'scelta' ? 'Prima di iniziare, dicci chi sei' : 'Inserisci i dati della tua attività'}
          </p>
        </div>

        {step === 'scelta' && (
          <div>
            <h1 className="font-head text-4xl font-bold text-z-light text-center mb-2">
              Stai aprendo <span className="text-z-green">la tua impresa</span><br />
              o lavori per i tuoi clienti?
            </h1>
            <p className="text-z-muted text-center font-body mb-10">
              La risposta personalizza tutta l&apos;esperienza.
            </p>

            <div className="grid grid-cols-1 gap-4 mb-8">
              <button
                onClick={() => setTipo('privato')}
                className={`p-6 border-2 text-left transition-all duration-150 ${tipo === 'privato'
                  ? 'border-z-green bg-z-green/8 shadow-green-glow'
                  : 'border-white/8 bg-z-mid hover:border-z-green/30'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">👤</span>
                  <div>
                    <div className="font-head font-bold text-xl text-z-light mb-1">Sto aprendo la mia impresa</div>
                    <div className="text-z-muted text-sm">Ditta individuale, SRL, SNC, libero professionista...</div>
                  </div>
                </div>
              </button>

              {TIPI_BUSINESS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`p-6 border-2 text-left transition-all duration-150 ${tipo === t.id
                    ? 'border-z-green bg-z-green/8 shadow-green-glow'
                    : 'border-white/8 bg-z-mid hover:border-z-green/30'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{t.emoji}</span>
                    <div>
                      <div className="font-head font-bold text-xl text-z-light mb-1">{t.label}</div>
                      <div className="text-z-muted text-sm">{t.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleContinua}
              disabled={!tipo || loading}
              className="btn-primary w-full justify-center py-4 text-base disabled:opacity-40">
              {loading ? 'Caricamento...' : 'Continua →'}
            </button>
          </div>
        )}

        {step === 'business_dettagli' && (
          <div>
            <h2 className="font-head text-2xl font-bold text-z-light mb-6">Dati della tua attività</h2>
            <div className="space-y-4 mb-8">
              {[
                { campo: 'ragione_sociale', label: 'Ragione sociale *', placeholder: 'Studio Rossi & Associati' },
                { campo: 'partita_iva', label: 'Partita IVA', placeholder: '12345678901' },
                { campo: 'indirizzo', label: 'Indirizzo sede', placeholder: 'Via Roma 1, 73100 Lecce' },
                { campo: 'sito_web', label: 'Sito web (opzionale)', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.campo}>
                  <label className="label-field">{f.label}</label>
                  <input
                    value={form[f.campo as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.campo]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('scelta')} className="btn-secondary flex-1 justify-center">
                Indietro
              </button>
              <button
                onClick={handleContinua}
                disabled={!form.ragione_sociale || loading}
                className="btn-primary flex-1 justify-center disabled:opacity-40">
                {loading ? 'Salvataggio...' : 'Inizia →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}