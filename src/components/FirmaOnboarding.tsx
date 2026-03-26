'use client'

// PATH: src/components/FirmaOnboarding.tsx
// Mostrato nel banner dashboard quando la firma non è ancora completata.
// NON chiede più se nuova/esistente — il sistema lo sa già.
// Aggiunge bottone "Ho già firmato" che verifica lo stato su Yousign.

import { useState } from 'react'

interface Props {
  praticaId?: string
  userId: string
  piano?: string
  importo?: number
  onComplete?: () => void
}

export default function FirmaOnboarding({ praticaId, userId, piano = 'base', importo = 149, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [inviato, setInviato] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  // Invia contratto + procura
  const avvia = async () => {
    setLoading(true)
    setErrore(null)
    try {
      const res = await fetch('/api/onboarding/firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pratica_id: praticaId, piano, importo }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setInviato(true)
    } catch (e: any) {
      setErrore(e.message ?? 'Errore imprevisto. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // Verifica se l'utente ha già firmato su Yousign
  const verificaFirma = async () => {
    setVerificando(true)
    setErrore(null)
    try {
      const res = await fetch('/api/firma/verifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, praticaId }),
      })
      const data = await res.json()
      if (data.firmato) {
        setMessaggio('✅ Firma verificata! Aggiorno la dashboard...')
        setTimeout(() => onComplete?.(), 1500)
      } else {
        setMessaggio(data.messaggio ?? 'Firma non ancora completata. Controlla la tua email.')
      }
    } catch (e: any) {
      setErrore('Errore verifica firma. Riprova.')
    } finally {
      setVerificando(false)
    }
  }

  if (inviato) {
    return (
      <div className="space-y-4">
        <div className="bg-z-green/8 border border-z-green/20 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">📧</div>
          <h3 className="font-bold text-z-light text-base mb-1">Email di firma inviata!</h3>
          <p className="text-z-muted text-sm">
            Controlla la tua email — trovi il contratto da firmare.
            Dopo la prima firma riceverai automaticamente la procura speciale.
            Ci vogliono 2 minuti in totale.
          </p>
        </div>

        {messaggio && (
          <div className={`text-sm text-center px-4 py-3 rounded-xl border ${
            messaggio.includes('✅')
              ? 'text-z-green border-z-green/20 bg-z-green/8'
              : 'text-amber-400 border-amber-400/20 bg-amber-400/8'
          }`}>
            {messaggio}
          </div>
        )}

        <button
          onClick={verificaFirma}
          disabled={verificando}
          className="w-full py-3 border border-z-green/30 text-z-green rounded-xl text-sm font-bold hover:bg-z-green/8 transition disabled:opacity-50"
        >
          {verificando ? '⏳ Verifica in corso...' : '✅ Ho già firmato — verifica'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-z-light text-base mb-1">Firma i documenti Zipra</h3>
        <p className="text-z-muted text-sm leading-relaxed">
          Per operare per tuo conto presso CCIAA, INPS, SUAP e Agenzia delle Entrate
          abbiamo bisogno di una procura speciale firmata digitalmente.
          Ti inviamo tutto via email — bastano 2 minuti dal telefono.
        </p>
      </div>

      <div className="bg-z-mid border border-white/8 rounded-xl p-4 space-y-2 text-sm">
        <p className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">Cosa ricevi:</p>
        <p className="text-z-muted">
          <span className="text-z-green mr-2">1.</span>
          <strong className="text-z-light">Contratto di servizio</strong> — firmabile in 30 secondi con OTP SMS
        </p>
        <p className="text-z-muted">
          <span className="text-z-green mr-2">2.</span>
          <strong className="text-z-light">Procura speciale</strong> — inviata automaticamente dopo la prima firma
        </p>
        <p className="text-xs text-z-muted/40 mt-2">
          La procura vale per tutte le pratiche future — non dovrai ripetere questo step.
        </p>
      </div>

      {errore && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-sm text-red-400">
          {errore}
        </div>
      )}

      {messaggio && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          messaggio.includes('✅')
            ? 'text-z-green border-z-green/20 bg-z-green/8'
            : 'text-amber-400 border-amber-400/20 bg-amber-400/8'
        }`}>
          {messaggio}
        </div>
      )}

      <button
        onClick={avvia}
        disabled={loading}
        className="w-full bg-z-green text-z-dark font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? '⏳ Preparando i documenti...' : '📧 Invia documenti da firmare →'}
      </button>

      <button
        onClick={verificaFirma}
        disabled={verificando}
        className="w-full py-2.5 border border-white/10 text-z-muted/60 rounded-xl text-sm hover:border-white/20 hover:text-z-muted transition disabled:opacity-50"
      >
        {verificando ? '⏳ Verifica...' : 'Ho già ricevuto le email — verifica firma'}
      </button>
    </div>
  )
}