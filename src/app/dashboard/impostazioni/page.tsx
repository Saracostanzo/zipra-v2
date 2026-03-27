'use client'
// PATH: src/app/dashboard/impostazioni/page.tsx

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

const NOMI_PIANO: Record<string, string> = {
  free: 'Free',
  base: 'Base',
  pro: 'Pro',
  mantenimento: 'Mantenimento',
  business: 'Business',
  business_pro: 'Business Pro',
}

const PREZZI_PIANO: Record<string, string> = {
  base: '€149/anno',
  pro: '€249/anno',
  mantenimento: '€29/mese',
  business: '€199/mese',
  business_pro: '€299/mese',
}

function StatoBadgeAbbonamento({ stato, cancelAtPeriodEnd }: { stato: string, cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd) return (
    <span className="text-xs font-mono px-2 py-1 rounded-full bg-amber-400/15 text-amber-400">
      🕐 Cancellazione programmata
    </span>
  )
  switch (stato) {
    case 'attivo':
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-z-green/15 text-z-green">✅ Attivo</span>
    case 'trial':
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-blue-400/15 text-blue-400">🎁 Trial</span>
    case 'scaduto_pagamento':
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-red-400/15 text-red-400">⚠️ Pagamento in sospeso</span>
    case 'sospeso':
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-red-500/15 text-red-500">🚫 Sospeso</span>
    case 'cancellato':
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-amber-400/15 text-amber-400">📅 Attivo fino a scadenza</span>
    default:
      return <span className="text-xs font-mono px-2 py-1 rounded-full bg-white/10 text-z-muted">{stato}</span>
  }
}

export default function ImpostazioniPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  const [profilo, setProfilo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [loadingAbbonamento, setLoadingAbbonamento] = useState(false)
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [messaggioAbbonamento, setMessaggioAbbonamento] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)
  const [mostraConfermaAnnulla, setMostraConfermaAnnulla] = useState(false)

  useEffect(() => {
    const carica = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signup'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('*, stripe_subscription_id, stripe_subscription_status, stripe_subscription_period_end, stripe_cancel_at_period_end')
        .eq('id', user.id)
        .single()
      setProfilo(p)
      setLoading(false)
    }
    carica()
  }, [])

  const cambiaPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessaggio(null)
    if (nuovaPassword.length < 8) { setMessaggio({ tipo: 'errore', testo: 'La password deve avere almeno 8 caratteri.' }); return }
    if (nuovaPassword !== confermaPassword) { setMessaggio({ tipo: 'errore', testo: 'Le password non coincidono.' }); return }
    setLoadingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    setLoadingPassword(false)
    if (error) setMessaggio({ tipo: 'errore', testo: error.message })
    else { setMessaggio({ tipo: 'ok', testo: '✅ Password aggiornata con successo!' }); setNuovaPassword(''); setConfermaPassword('') }
  }

  const annullaAbbonamento = async () => {
    setLoadingAbbonamento(true)
    setMessaggioAbbonamento(null)
    try {
      const res = await fetch('/api/abbonamento/annulla', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessaggioAbbonamento({ tipo: 'ok', testo: data.messaggio })
      setMostraConfermaAnnulla(false)
      // Ricarica profilo
      const { data: p } = await supabase.from('profiles')
        .select('*, stripe_subscription_id, stripe_subscription_status, stripe_subscription_period_end, stripe_cancel_at_period_end')
        .eq('id', profilo.id).single()
      setProfilo(p)
    } catch (e: any) {
      setMessaggioAbbonamento({ tipo: 'errore', testo: e.message })
    } finally { setLoadingAbbonamento(false) }
  }

  const riattivaAbbonamento = async () => {
    setLoadingAbbonamento(true)
    setMessaggioAbbonamento(null)
    try {
      const res = await fetch('/api/abbonamento/riattiva', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessaggioAbbonamento({ tipo: 'ok', testo: data.messaggio })
      const { data: p } = await supabase.from('profiles')
        .select('*, stripe_subscription_id, stripe_subscription_status, stripe_subscription_period_end, stripe_cancel_at_period_end')
        .eq('id', profilo.id).single()
      setProfilo(p)
    } catch (e: any) {
      setMessaggioAbbonamento({ tipo: 'errore', testo: e.message })
    } finally { setLoadingAbbonamento(false) }
  }

  const pianoAttivo = profilo?.piano && profilo.piano !== 'free'
  const abbonamentoAttivo = profilo?.stripe_subscription_id && ['attivo', 'trial', 'scaduto_pagamento', 'cancellato'].includes(profilo?.stripe_subscription_status)
  const cancellatoAPeriodEnd = profilo?.stripe_cancel_at_period_end === true
  const scadenzaFormattata = profilo?.stripe_subscription_period_end
    ? new Date(profilo.stripe_subscription_period_end).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="text-z-muted font-mono text-sm">Caricamento...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-z-darker">

      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-z-muted hover:text-z-light text-sm transition">
            ← Dashboard
          </button>
          <h1 className="font-bold text-z-light">Impostazioni account</h1>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* ── Abbonamento ─────────────────────────────────────────────────── */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-4">Piano e abbonamento</h2>

          <div className="bg-z-darker rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-z-light font-bold text-lg">
                    Piano {NOMI_PIANO[profilo?.piano] ?? profilo?.piano ?? 'Free'}
                  </span>
                  {PREZZI_PIANO[profilo?.piano] && (
                    <span className="text-z-green text-sm font-mono">{PREZZI_PIANO[profilo?.piano]}</span>
                  )}
                </div>
                {profilo?.stripe_subscription_status && (
                  <div className="flex items-center gap-2">
                    <StatoBadgeAbbonamento
                      stato={profilo.stripe_subscription_status}
                      cancelAtPeriodEnd={cancellatoAPeriodEnd}
                    />
                  </div>
                )}
                {scadenzaFormattata && (
                  <p className="text-z-muted/60 text-xs mt-2">
                    {cancellatoAPeriodEnd
                      ? `⚠️ Accesso garantito fino al ${scadenzaFormattata} — poi il piano tornerà a Free.`
                      : profilo?.stripe_subscription_status === 'attivo'
                        ? `🔄 Rinnovo automatico il ${scadenzaFormattata}`
                        : `Scadenza: ${scadenzaFormattata}`
                    }
                  </p>
                )}
              </div>
              {!pianoAttivo && (
                <a href="/prezzi" className="btn-primary text-sm py-2 px-4 shrink-0">Abbonati →</a>
              )}
            </div>
          </div>

          {/* Banner stati critici */}
          {profilo?.stripe_subscription_status === 'scaduto_pagamento' && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-4">
              <p className="text-red-400 font-bold text-sm mb-1">⚠️ Pagamento in sospeso</p>
              <p className="text-red-400/70 text-xs">
                Il rinnovo dell'abbonamento non è andato a buon fine. Stripe riproverà automaticamente.
                Se il problema persiste aggiorna il metodo di pagamento.
              </p>
              <a
                href="https://billing.stripe.com/p/login/test_00g00000000000"
                target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-red-400 underline"
              >
                Aggiorna metodo di pagamento →
              </a>
            </div>
          )}

          {profilo?.stripe_subscription_status === 'sospeso' && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-500 font-bold text-sm mb-1">🚫 Abbonamento sospeso</p>
              <p className="text-red-400/70 text-xs mb-3">
                Il pagamento non è stato completato dopo diversi tentativi. L'accesso alle funzioni è limitato.
                Rinnova l'abbonamento per ripristinare l'accesso completo.
              </p>
              <a href="/prezzi" className="btn-primary text-sm py-2 px-4">🔄 Rinnova abbonamento →</a>
            </div>
          )}

          {/* Messaggi operazioni abbonamento */}
          {messaggioAbbonamento && (
            <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${messaggioAbbonamento.tipo === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border border-red-500/25 text-red-400'}`}>
              {messaggioAbbonamento.testo}
            </div>
          )}

          {/* Azioni abbonamento */}
          {abbonamentoAttivo && (
            <div className="space-y-3">
              {/* Riattiva se cancellazione programmata */}
              {cancellatoAPeriodEnd && (
                <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl p-4">
                  <p className="text-amber-400 font-bold text-sm mb-1">📅 Cancellazione programmata</p>
                  <p className="text-amber-400/70 text-xs mb-3">
                    Hai cancellato il piano. Continui ad avere accesso fino al {scadenzaFormattata}.
                    Puoi annullare la cancellazione prima della scadenza.
                  </p>
                  <button
                    onClick={riattivaAbbonamento}
                    disabled={loadingAbbonamento}
                    className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
                  >
                    {loadingAbbonamento ? '⏳...' : '↩️ Ripristina abbonamento'}
                  </button>
                </div>
              )}

              {/* Annulla abbonamento — solo se attivo e non già cancellato */}
              {!cancellatoAPeriodEnd && profilo?.stripe_subscription_status === 'attivo' && (
                <div>
                  {!mostraConfermaAnnulla ? (
                    <button
                      onClick={() => setMostraConfermaAnnulla(true)}
                      className="text-sm text-z-muted/50 hover:text-red-400 transition underline"
                    >
                      Cancella abbonamento
                    </button>
                  ) : (
                    <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                      <p className="text-red-400 font-bold text-sm mb-1">Sei sicuro di voler cancellare?</p>
                      <p className="text-z-muted text-xs mb-4">
                        Il piano rimarrà attivo fino al <strong className="text-z-light">{scadenzaFormattata}</strong>.
                        Dopo quella data il piano tornerà a Free e non potrai aprire nuove pratiche incluse nell'abbonamento.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={annullaAbbonamento}
                          disabled={loadingAbbonamento}
                          className="text-sm text-red-400 border border-red-400/30 px-4 py-2 rounded-xl hover:bg-red-400/10 transition disabled:opacity-50"
                        >
                          {loadingAbbonamento ? '⏳ Cancellazione...' : '🗑️ Sì, cancella abbonamento'}
                        </button>
                        <button
                          onClick={() => setMostraConfermaAnnulla(false)}
                          className="text-sm text-z-muted border border-white/10 px-4 py-2 rounded-xl hover:border-white/20 transition"
                        >
                          No, mantieni
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Portale Stripe per storico fatture */}
              <div className="pt-2 border-t border-white/6">
                <p className="text-z-muted/50 text-xs mb-2">Gestisci metodo di pagamento e visualizza le fatture:</p>
                <a
                  href="https://billing.stripe.com/p/login/test_00g00000000000"
                  target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-2 px-4 inline-block"
                >
                  🧾 Portale fatturazione Stripe →
                </a>
              </div>
            </div>
          )}

          {/* Non abbonato — upsell */}
          {!pianoAttivo && (
            <div className="bg-z-green/5 border border-z-green/15 rounded-xl p-4">
              <p className="text-z-green font-bold text-sm mb-1">🚀 Passa a un piano abbonamento</p>
              <p className="text-z-muted text-xs">Con il Piano Base a €149/anno hai tutte le pratiche incluse — paghi solo i diritti agli enti.</p>
              <a href="/prezzi" className="btn-primary text-sm py-2 px-4 mt-3 inline-block">Scopri i piani →</a>
            </div>
          )}
        </div>

        {/* ── Cambio password ─────────────────────────────────────────────── */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-1">Cambia password</h2>
          <p className="text-z-muted text-sm mb-6">Se hai ricevuto una password temporanea da Zipra, cambiala con una tua.</p>

          <form onSubmit={cambiaPassword} className="space-y-4 max-w-sm">
            <div>
              <label className="label-field">Nuova password</label>
              <input type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)}
                placeholder="Minimo 8 caratteri" className="input-field" required />
            </div>
            <div>
              <label className="label-field">Conferma nuova password</label>
              <input type="password" value={confermaPassword} onChange={e => setConfermaPassword(e.target.value)}
                placeholder="Ripeti la password" className="input-field" required />
            </div>
            {messaggio && (
              <div className={`rounded-xl px-4 py-3 text-sm ${messaggio.tipo === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border border-red-500/25 text-red-400'}`}>
                {messaggio.testo}
              </div>
            )}
            <button type="submit" disabled={loadingPassword} className="btn-primary w-full justify-center disabled:opacity-50">
              {loadingPassword ? '⏳ Aggiornamento...' : 'Aggiorna password'}
            </button>
          </form>
        </div>

        {/* ── Reset password via email ─────────────────────────────────────── */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-1">Hai dimenticato la password?</h2>
          <p className="text-z-muted text-sm mb-4">Ti mandiamo un link per reimpostarla via email.</p>
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

        {/* ── Elimina account ──────────────────────────────────────────────── */}
        <div className="bg-z-mid border border-white/8 rounded-2xl p-6">
          <h2 className="font-bold text-z-light text-lg mb-1">Zona pericolosa</h2>
          <p className="text-z-muted text-sm mb-4">
            Per eliminare il tuo account contatta il supporto Zipra. I dati delle pratiche vengono conservati per obblighi di legge.
          </p>
          <a href="mailto:supporto@zipra.it" className="text-sm text-z-muted/50 hover:text-red-400 transition underline">
            Contatta il supporto per eliminare l'account
          </a>
        </div>

      </div>
    </div>
  )
}