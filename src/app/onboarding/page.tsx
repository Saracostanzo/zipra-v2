'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type TipoAccount = 'privato' | 'caf' | 'commercialista' | 'agenzia' | 'patronato'

const TIPI_BUSINESS: { id: TipoAccount; label: string; desc: string; emoji: string }[] = [
  { id: 'caf',            emoji: '🏢', label: 'CAF',               desc: 'Centro di Assistenza Fiscale' },
  { id: 'commercialista', emoji: '📊', label: 'Commercialista',    desc: 'Studio commercialista o tributarista' },
  { id: 'agenzia',        emoji: '🤝', label: 'Agenzia pratiche',  desc: 'Agenzia disbrigo pratiche' },
  { id: 'patronato',      emoji: '🏛️', label: 'Patronato',           desc: 'INCA, ACLI, ITAL, EPASA e altri patronati' },
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

      // Aggiorna profilo con tipo account
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

      // Se business, crea il record business_accounts
      if (isBusiness) {
        // Business: imposta subito firma_digitale_autorizzata = true
        // Commercialisti e CAF hanno già la loro firma professionale
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
    } catch (e) {
      toast.error('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">

        {/* Logo */}
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
          <div className="animate-slide-up">
            <h1 className="font-head text-4xl font-bold text-z-light text-center mb-2">
              Stai aprendo <span className="text-z-green">la tua impresa</span><br />
              o lavori per i tuoi clienti?
            </h1>
            <p className="text-z-muted text-center font-body mb-10">
              La risposta personalizza tutta l'esperienza.
            </p>

            <div className="grid grid-cols-1 gap-4 mb-8">

              {/* Privato */}
              <button
                onClick={() => setTipo('privato')}
                className={`p-6 border-2 text-left transition-all duration-150 group
                  ${tipo === 'privato'
                    ? 'border-z-green bg-z-green/8 shadow-green-glow'
                    : 'border-white/8 bg-z-mid hover:border-z-green/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">👤</span>
                  <div className="flex-1">
                    <div className={`font-head font-bold text-xl mb-1 ${tipo === 'privato' ? 'text-z-green' : 'text-z-light'}`}>
                      Voglio aprire la mia impresa
                    </div>
                    <div className="text-z-muted font-body text-sm">
                      Sono un privato che vuole avviare un'attività in Italia
                    </div>
                  </div>
                  <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0
                    ${tipo === 'privato' ? 'border-z-green bg-z-green' : 'border-white/20'}`}>
                    {tipo === 'privato' && <span className="text-z-dark text-xs font-bold">✓</span>}
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs font-mono text-z-muted/40 uppercase tracking-widest">oppure</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* Business options */}
              <div>
                <p className="text-xs font-mono text-z-muted/50 uppercase tracking-widest mb-3">
                  Gestisco le pratiche per i miei clienti
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {TIPI_BUSINESS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTipo(t.id)}
                      className={`p-4 border-2 text-left transition-all duration-150
                        ${tipo === t.id
                          ? 'border-z-orange bg-z-orange/8'
                          : 'border-white/8 bg-z-mid hover:border-z-orange/30'
                        }`}
                    >
                      <div className="text-2xl mb-2">{t.emoji}</div>
                      <div className={`font-head font-bold text-sm mb-0.5 ${tipo === t.id ? 'text-z-orange' : 'text-z-light'}`}>
                        {t.label}
                      </div>
                      <div className="text-xs font-body text-z-muted/60 leading-snug">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleContinua}
              disabled={!tipo || loading}
              className="btn-primary w-full justify-center py-4 text-base"
            >
              {loading ? 'Salvataggio...' : isPrivato ? '⚡ Inizia il wizard' : '→ Continua'}
            </button>
          </div>
        )}

        {step === 'business_dettagli' && (
          <div className="animate-slide-up">
            <h1 className="font-head text-3xl font-bold text-z-light text-center mb-8">
              Dati del tuo studio / agenzia
            </h1>

            <div className="bg-z-mid border border-white/8 p-6 space-y-5 mb-6">
              <div>
                <label className="label-field">Ragione sociale *</label>
                <input
                  value={form.ragione_sociale}
                  onChange={e => setForm(f => ({ ...f, ragione_sociale: e.target.value }))}
                  placeholder="Es: Studio Rossi & Associati"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Partita IVA *</label>
                <input
                  value={form.partita_iva}
                  onChange={e => setForm(f => ({ ...f, partita_iva: e.target.value }))}
                  placeholder="IT12345678901"
                  className="input-field font-mono"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="label-field">Indirizzo sede</label>
                <input
                  value={form.indirizzo}
                  onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))}
                  placeholder="Via Roma 1, 73100 Lecce (LE)"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Sito web (opzionale)</label>
                <input
                  value={form.sito_web}
                  onChange={e => setForm(f => ({ ...f, sito_web: e.target.value }))}
                  placeholder="https://www.studiorossi.it"
                  className="input-field"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="bg-z-orange/8 border border-z-orange/20 p-4 mb-6">
              <p className="text-sm font-body text-z-muted leading-relaxed">
                <span className="text-z-orange font-semibold">Piano Business</span> — €199/mese.
                Gestisci fino a 50 clienti, dashboard dedicata, white label opzionale.
                Puoi annullare in qualsiasi momento.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('scelta')} className="btn-secondary flex-1 justify-center">
                ← Indietro
              </button>
              <button
                onClick={handleContinua}
                disabled={!form.ragione_sociale || !form.partita_iva || loading}
                className="btn-orange flex-1 justify-center"
              >
                {loading ? 'Salvataggio...' : '🚀 Vai alla dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
