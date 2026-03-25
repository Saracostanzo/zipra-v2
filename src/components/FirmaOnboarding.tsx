'use client'
// src/components/FirmaOnboarding.tsx
// Mostrato in dashboard quando la procura non è ancora firmata
// Chiede solo se attività nuova o esistente — poi tutto automatico

import { useState } from 'react'
import { inviaProccuraSpeciale } from '@/lib/firma/onboarding'

interface Props {
  praticaId: string
  userId: string
  piano: string
  importo?: number
  onComplete?: () => void
}

export default function FirmaOnboarding({ praticaId, userId, piano, importo = 149, onComplete }: Props) {
  const [attivitaNuova, setAttivitaNuova] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const avvia = async () => {
    if (attivitaNuova === null) return
    setLoading(true)
    setErrore(null)

    try {
      if (attivitaNuova) {
        // Nuova attività → flusso completo: contratto + procura speciale
        // avviaOnboardingFirma() invia il contratto e poi la procura in automatico
        const res = await fetch('/api/onboarding/firma', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, pratica_id: praticaId, piano, importo }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)
      } else {
        // Attività già aperta → solo procura speciale (ha già la firma digitale)
        // Chiama direttamente inviaProccuraSpeciale dal lib
        const res = await fetch('/api/onboarding/firma/solo-procura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, pratica_id: praticaId }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)
      }

      setInviato(true)
    } catch (e: any) {
      setErrore(e.message ?? 'Errore imprevisto. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  if (inviato) {
    return (
      <div className="bg-z-green/8 border border-z-green/20 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📧</div>
        <h3 className="font-bold text-z-light text-lg mb-2">
          {attivitaNuova
            ? 'Contratto di servizio inviato!'
            : 'Procura speciale inviata!'}
        </h3>
        <p className="text-z-muted text-sm mb-5">
          {attivitaNuova
            ? 'Controlla la tua email — trovi il contratto da firmare. Dopo la firma riceverai automaticamente la procura speciale. Ci vogliono 2 minuti in totale.'
            : 'Controlla la tua email — trovi la procura speciale da firmare. Ci vogliono 30 secondi.'}
        </p>
        <p className="text-xs text-z-muted/50">
          Puoi procedere con la dashboard anche prima di firmare — la firma sblocca la lavorazione della pratica.
        </p>
        {onComplete && (
          <button onClick={onComplete} className="mt-4 text-z-green underline text-sm">
            Vai alla dashboard →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-z-light text-lg mb-1">Autorizza Zipra a operare per te</h3>
        <p className="text-z-muted text-sm leading-relaxed">
          Per inviare le pratiche agli enti (CCIAA, INPS, SUAP, Agenzia delle Entrate) abbiamo bisogno
          che tu firmi digitalmente una procura speciale. Ci vogliono 2 minuti via email — nessun appuntamento,
          nessuna carta.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-z-muted/60 text-xs uppercase tracking-wider font-semibold">
          Una domanda veloce:
        </p>

        <button
          onClick={() => setAttivitaNuova(true)}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            attivitaNuova === true
              ? 'border-z-green bg-z-green/5'
              : 'border-white/8 bg-z-dark hover:border-white/20'
          }`}>
          <div className="font-bold text-z-light text-sm">🆕 Sto aprendo una nuova attività</div>
          <div className="text-z-muted/60 text-xs mt-1">
            Ricevi firma digitale certificata (tua per sempre) + procura speciale — tutto via email.
          </div>
        </button>

        <button
          onClick={() => setAttivitaNuova(false)}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            attivitaNuova === false
              ? 'border-z-green bg-z-green/5'
              : 'border-white/8 bg-z-dark hover:border-white/20'
          }`}>
          <div className="font-bold text-z-light text-sm">🏪 Ho già un'impresa aperta</div>
          <div className="text-z-muted/60 text-xs mt-1">
            Firma solo la procura speciale — se hai già una firma digitale va benissimo, altrimenti te ne forniamo una.
          </div>
        </button>
      </div>

      {attivitaNuova !== null && (
        <div className="bg-z-mid border border-white/8 rounded-xl p-4 text-sm space-y-1.5">
          <p className="text-z-light font-semibold text-xs uppercase tracking-wider mb-2">
            Cosa ricevi via email:
          </p>
          {attivitaNuova ? (
            <>
              <p className="text-z-muted">📄 <strong className="text-z-light">1ª email</strong> — Contratto di servizio Zipra da firmare</p>
              <p className="text-z-muted">📄 <strong className="text-z-light">2ª email</strong> — Procura speciale (inviata automaticamente dopo la prima firma)</p>
              <p className="text-z-muted/50 text-xs mt-2">La firma digitale rimane tua — puoi usarla per qualsiasi documento futuro.</p>
            </>
          ) : (
            <>
              <p className="text-z-muted">📄 <strong className="text-z-light">1 email</strong> — Procura speciale Zipra da firmare</p>
              <p className="text-z-muted/50 text-xs mt-2">30 secondi con il tuo smartphone.</p>
            </>
          )}
        </div>
      )}

      {errore && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-sm text-red-400">
          ❌ {errore}
        </div>
      )}

      <button
        onClick={avvia}
        disabled={attivitaNuova === null || loading}
        className="btn-primary w-full justify-center">
        {loading ? '⏳ Preparando i documenti...' : '📧 Invia documenti da firmare →'}
      </button>

      <p className="text-xs text-z-muted/40 text-center">
        I documenti sono legalmente vincolanti e conservati in modo sicuro.
        Puoi revocare la procura in qualsiasi momento dalle impostazioni.
      </p>
    </div>
  )
}