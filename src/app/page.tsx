'use client'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
const ChatbotAI = dynamic(() => import('../components/chatbot/ChatbotAI'), { ssr: false })

const CATEGORIE = [
  { emoji: '🚀', label: 'Aperture', desc: 'Ditta, SRL, SNC, SRLS' },
  { emoji: '✏️', label: 'Modifiche', desc: 'Sede, ATECO, soci, admin' },
  { emoji: '🔚', label: 'Cessazioni', desc: 'Chiusura ditta, liquidazione SRL' },
  { emoji: '📅', label: 'Adempimenti', desc: 'Bilanci, diritti, PEC, RTE' },
  { emoji: '🏛️', label: 'SUAP', desc: 'Licenze, autorizzazioni, rinnovi' },
  { emoji: '🏥', label: 'Sanitario', desc: 'ASL, HACCP, autorizzazioni' },
  { emoji: '⚖️', label: 'Societarie', desc: 'Quote, trasformazioni, fusioni' },
  { emoji: '🏦', label: 'INPS', desc: 'Malattia, maternità, assegno unico' },
]

export default function Home() {
  const [tipoCliente, setTipoCliente] = useState<'apro' | 'hogia'>('apro')

  return (
    <div className="min-h-screen bg-z-darker">

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/8 bg-z-darker/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-head text-2xl font-bold text-z-light">zipra</span>
            <span className="w-2 h-2 rounded-full bg-z-green" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pratiche" className="text-sm text-z-muted/60 hover:text-z-muted transition-colors">Servizi</Link>
            <Link href="/prezzi" className="text-sm text-z-muted/60 hover:text-z-muted transition-colors">Prezzi</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="btn-secondary text-xs py-2 px-4">Accedi</Link>
            <Link href="/auth/signup" className="btn-ghost text-xs py-2 px-4">Registrati</Link>
            <Link href="/wizard" className="btn-primary text-xs py-2 px-4">Inizia →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO — Chat AI gratuita in evidenza ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-z-green/10 border border-z-green/25 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-z-green animate-pulse" />
            <span className="text-xs font-mono text-z-green uppercase tracking-widest">
              Consulenza AI gratuita — nessuna registrazione
            </span>
          </div>

          <h1 className="font-head text-5xl md:text-6xl font-bold text-z-light leading-[1.05] mb-4">
            Hai un'idea per la tua impresa?<br />
            <span className="text-z-green">Chiedi all'AI, è gratis.</span>
          </h1>

          <p className="text-z-muted font-body text-lg max-w-2xl mx-auto mb-3">
            Descrivi la tua attività — l'AI ti dice codice ATECO, pratiche necessarie,
            adempimenti obbligatori e consigli specifici. <strong className="text-z-light">Senza registrarti.</strong>
          </p>
          <p className="text-sm font-mono text-z-muted/40">
            Poi, se vuoi che pensiamo a tutto noi, ci sono i piani a partire da €149/anno.
          </p>
        </div>

        {/* Chat AI grande, centrale */}
        <div className="max-w-3xl mx-auto">
          <ChatbotAI compact={false} />
        </div>

        {/* Disclaimer consulenza gratuita */}
        <div className="max-w-3xl mx-auto mt-4">
          <div className="bg-z-mid border border-white/5 p-4 flex items-start gap-3">
            <span className="text-blue-400 shrink-0">ℹ️</span>
            <p className="text-xs text-z-muted/60 leading-relaxed">
              La consulenza AI è gratuita e fornisce informazioni generali sulla burocrazia italiana.
              Non sostituisce la consulenza di un professionista abilitato.
              Per la gestione completa delle pratiche con invio agli enti, scegli un piano Zipra.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEZIONE 2 — Cosa puoi fare dopo la consulenza ─────────────── */}
      <section className="border-t border-white/8 py-20 bg-z-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-3">Vuoi che pensiamo a tutto noi?</p>
            <h2 className="font-head text-4xl font-bold text-z-light mb-4">
              Dall'idea alla ricevuta,<br />senza fare nulla.
            </h2>
            <p className="text-z-muted max-w-xl mx-auto">
              Che tu stia aprendo un'impresa o gestendo una già avviata, Zipra invia le pratiche agli enti al posto tuo.
            </p>
          </div>

          {/* Toggle apro/ho già */}
          <div className="flex justify-center mb-10">
            <div className="flex bg-z-mid border border-white/8 p-1">
              <button onClick={() => setTipoCliente('apro')}
                className={`px-8 py-2.5 text-sm font-bold transition-all ${tipoCliente === 'apro' ? 'bg-z-green text-z-dark' : 'text-z-muted hover:text-z-light'}`}>
                🚀 Apro un'impresa
              </button>
              <button onClick={() => setTipoCliente('hogia')}
                className={`px-8 py-2.5 text-sm font-bold transition-all ${tipoCliente === 'hogia' ? 'bg-z-green text-z-dark' : 'text-z-muted hover:text-z-light'}`}>
                🏢 Ho già un'impresa
              </button>
            </div>
          </div>

          {tipoCliente === 'apro' && (
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                { step: '1', titolo: 'Descrivi l\'idea', desc: 'Wizard guidato in 5 minuti. L\'AI analizza e genera il piano completo con codice ATECO e tutte le pratiche necessarie.' },
                { step: '2', titolo: 'Scegli come procedere', desc: 'Abbonati al piano Base (€149/anno) e hai tutto incluso. Oppure paga solo la pratica che ti serve al prezzo di listino.' },
                { step: '3', titolo: 'Aspetta la ricevuta', desc: 'Zipra invia tutto agli enti al posto tuo. CCIAA, INPS, SUAP, Agenzia Entrate. Tu non fai nulla.' },
              ].map(({ step, titolo, desc }) => (
                <div key={step} className="bg-z-mid border border-white/8 p-6">
                  <div className="w-8 h-8 bg-z-green/15 border border-z-green/30 flex items-center justify-center font-mono font-bold text-z-green text-sm mb-4">
                    {step}
                  </div>
                  <h3 className="font-head font-bold text-z-light mb-2">{titolo}</h3>
                  <p className="text-sm text-z-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          )}

          {tipoCliente === 'hogia' && (
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {[
                { step: '1', titolo: 'Dimmi cosa ti serve', desc: 'Variazione sede, cambio ATECO, cessazione, adempimenti annuali, licenze scadute. Il chatbot capisce cosa ti serve in secondi.' },
                { step: '2', titolo: 'Abbonati o paga la singola', desc: 'Con il piano Base (€149/anno) hai tutte le pratiche incluse — paghi solo i costi degli enti. Oppure paga la singola pratica.' },
                { step: '3', titolo: 'Tutto gestito', desc: 'Zipra si occupa di tutto: compilazione, invio, reinoltro se respinto, ricevuta e conservazione documenti.' },
              ].map(({ step, titolo, desc }) => (
                <div key={step} className="bg-z-mid border border-white/8 p-6">
                  <div className="w-8 h-8 bg-z-green/15 border border-z-green/30 flex items-center justify-center font-mono font-bold text-z-green text-sm mb-4">
                    {step}
                  </div>
                  <h3 className="font-head font-bold text-z-light mb-2">{titolo}</h3>
                  <p className="text-sm text-z-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/wizard" className="btn-primary text-base py-4 px-10">
              🚀 {tipoCliente === 'apro' ? 'Apri la tua impresa' : 'Gestisci la tua impresa'}
            </Link>
            <Link href="/pratiche" className="btn-secondary text-base py-4 px-10">
              Vedi tutti i servizi →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SEZIONE 3 — Piani chiari ───────────────────────────────────── */}
      <section className="border-t border-white/8 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-3">Prezzi</p>
            <h2 className="font-head text-4xl font-bold text-z-light mb-4">Semplice e trasparente</h2>
            <p className="text-z-muted max-w-xl mx-auto">
              Abbonati e hai tutto incluso per la tua impresa — che tu stia aprendo o gestendo.
              Oppure paga solo quello che ti serve.
            </p>
          </div>

          {/* 3 piani principali */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">

            {/* Base */}
            <div className="bg-z-mid border border-white/8 p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="font-head font-bold text-z-light text-lg">Base</h3>
                <p className="text-xs text-z-muted/60 mt-1">Per chi apre o gestisce</p>
              </div>
              <div className="mb-5">
                <span className="font-head font-bold text-z-light text-4xl">€149</span>
                <span className="text-z-muted text-sm ml-1">/anno</span>
              </div>
              <div className="space-y-2 flex-1 mb-5">
                {[
                  'Pratiche incluse — paghi solo i costi enti',
                  'Apertura, modifiche, cessazioni',
                  'Invio agli enti al posto tuo',
                  'Firma digitale + procura',
                  'Archivio e conservazione',
                  'Reinoltro gratuito sempre',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-z-green shrink-0 mt-0.5">✓</span>
                    <span className="text-z-muted">{f}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2 text-sm pt-2 border-t border-white/8">
                  <span className="text-z-muted/30 shrink-0">+</span>
                  <span className="text-z-muted/50 text-xs">Aggiungi Mantenimento a €29/anno per adempimenti automatici</span>
                </div>
              </div>
              <Link href="/wizard" className="block text-center py-3 border border-white/15 text-z-light text-sm font-bold hover:border-white/30 transition-all">
                Inizia con Base →
              </Link>
            </div>

            {/* Pro — highlight */}
            <div className="bg-z-mid border-2 border-z-green/50 p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-z-green text-z-dark text-xs font-mono font-bold px-3 py-1">Più scelto</span>
              </div>
              <div className="mb-4">
                <h3 className="font-head font-bold text-z-green text-lg">Pro</h3>
                <p className="text-xs text-z-muted/60 mt-1">Base + presenza online completa</p>
              </div>
              <div className="mb-5">
                <span className="font-head font-bold text-z-green text-4xl">€249</span>
                <span className="text-z-muted text-sm ml-1">/anno</span>
              </div>
              <div className="space-y-2 flex-1 mb-5">
                {[
                  'Tutto di Base incluso',
                  'Sito web professionale AI',
                  'Logo generato da AI',
                  'Scheda Google Business automatica',
                  'Editor sito via chat AI',
                  'Mantenimento incluso',
                  'Adempimenti annuali automatici',
                  'Sconto 20% pratiche future',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-z-green shrink-0 mt-0.5">✓</span>
                    <span className="text-z-muted">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/wizard" className="block text-center py-3 bg-z-green text-z-dark text-sm font-bold hover:bg-green-400 transition-all">
                Inizia con Pro →
              </Link>
            </div>

            {/* Singola pratica */}
            <div className="bg-z-mid border border-white/8 p-6 flex flex-col">
              <div className="mb-4">
                <h3 className="font-head font-bold text-z-light text-lg">Singola pratica</h3>
                <p className="text-xs text-z-muted/60 mt-1">Solo quello che ti serve</p>
              </div>
              <div className="mb-5">
                <span className="font-head font-bold text-z-light text-2xl">Prezzo listino</span>
                <div className="text-xs text-z-muted mt-1">Da €0 a €299 + costi enti</div>
              </div>
              <div className="space-y-2 flex-1 mb-5">
                {[
                  'Scegli una pratica dal catalogo',
                  'Nessun abbonamento',
                  'Stessa qualità e velocità',
                  'Reinoltro gratuito se respinta',
                  'Ricevuta e conservazione',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-z-green shrink-0 mt-0.5">✓</span>
                    <span className="text-z-muted">{f}</span>
                  </div>
                ))}
                <div className="bg-z-green/5 border border-z-green/15 p-3 mt-3 text-xs text-z-muted/70 leading-relaxed">
                  💡 Con un abbonamento Base hai più pratiche allo stesso prezzo o meno
                </div>
              </div>
              <Link href="/pratiche" className="block text-center py-3 border border-white/15 text-z-light text-sm font-bold hover:border-white/30 transition-all">
                Vedi listino pratiche →
              </Link>
            </div>
          </div>

          {/* Link prezzi completi */}
          <div className="text-center">
            <Link href="/prezzi" className="text-sm text-z-muted/50 hover:text-z-muted underline transition-colors">
              Vedi tutti i piani inclusi Business per commercialisti e CAF →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SEZIONE 4 — Catalogo preview ──────────────────────────────── */}
      <section className="border-t border-white/8 py-20 bg-z-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-3">Cosa gestiamo</p>
            <h2 className="font-head text-4xl font-bold text-z-light mb-3">
              35 pratiche. Tutti gli enti.
            </h2>
            <p className="text-z-muted max-w-xl mx-auto">
              Camera di Commercio, INPS, SUAP, Agenzia delle Entrate, ASL, Vigili del Fuoco.
              Aggiornato settimanalmente sulle normative di 105 comuni italiani.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {CATEGORIE.map(({ emoji, label, desc }) => (
              <Link key={label} href="/pratiche"
                className="bg-z-mid border border-white/8 p-4 hover:border-z-green/30 transition-all text-center group">
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="font-head font-bold text-z-light text-sm group-hover:text-z-green transition-colors">{label}</div>
                <div className="text-xs text-z-muted/60 mt-1">{desc}</div>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            {[
              { val: '350K+', label: 'imprese aprono ogni anno in Italia' },
              { val: '105', label: 'comuni monitorati ogni settimana' },
              { val: '€800', label: 'risparmio medio vs agenzia tradizionale' },
            ].map(({ val, label }) => (
              <div key={val} className="text-center">
                <div className="font-head text-3xl font-bold text-z-green">{val}</div>
                <div className="text-xs font-mono text-z-muted/50 mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/pratiche" className="btn-secondary inline-flex text-base py-3 px-8">
              Vedi tutte le pratiche →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SEZIONE 5 — Per commercialisti ────────────────────────────── */}
      <section className="border-t border-white/8 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-z-mid border border-white/8 p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-3">Per professionisti</p>
                <h2 className="font-head text-3xl font-bold text-z-light mb-3">
                  Sei un commercialista, CAF o patronato?
                </h2>
                <p className="text-z-muted text-sm leading-relaxed mb-6">
                  Con Zipra Business gestisci tutti i tuoi clienti da un'unica dashboard.
                  Paghi solo i costi degli enti — il servizio Zipra è incluso nell'abbonamento.
                  Per ogni cliente puoi generare sito web, logo e Google Business con un click.
                </p>
                <div className="flex gap-3">
                  <Link href="/onboarding?tipo=business" className="btn-primary">
                    Scopri il piano Business →
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '👥', titolo: 'Dashboard multi-cliente', desc: 'Tutte le pratiche di tutti i tuoi clienti in un posto' },
                  { icon: '💳', titolo: 'Paghi solo i costi enti', desc: 'Il servizio Zipra è incluso nell\'abbonamento Business' },
                  { icon: '🌐', titolo: 'Siti web per i clienti', desc: 'Genera sito + logo + Google Business con un click' },
                  { icon: '🗄️', titolo: 'Conservazione inclusa', desc: 'Archivio documenti per tutti i tuoi clienti' },
                ].map(({ icon, titolo, desc }) => (
                  <div key={titolo} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div>
                      <div className="font-bold text-z-light text-sm">{titolo}</div>
                      <div className="text-xs text-z-muted mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA finale ────────────────────────────────────────────────── */}
      <section className="border-t border-white/8 py-20 bg-z-dark">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-head text-5xl font-bold text-z-light mb-4">Pronto?</h2>
          <p className="text-z-muted text-lg mb-8">
            Inizia con la consulenza AI gratuita. Poi decidi se procedere.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/#chatbot" className="btn-primary text-base py-4 px-10">
              💬 Consulenza gratuita
            </Link>
            <Link href="/wizard" className="btn-secondary text-base py-4 px-10">
              🚀 Apri la tua impresa
            </Link>
          </div>
          <p className="text-xs font-mono text-z-muted/30 mt-6">
            Nessuna carta richiesta per la consulenza
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 py-8 bg-z-darker">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-head font-bold text-z-light">zipra</span>
            <span className="w-1.5 h-1.5 rounded-full bg-z-green" />
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-z-muted/40">
            <Link href="/pratiche" className="hover:text-z-muted transition-colors">Servizi</Link>
            <Link href="/prezzi" className="hover:text-z-muted transition-colors">Prezzi</Link>
            <Link href="/auth/login" className="hover:text-z-muted transition-colors">Accedi</Link>
          </div>
          <p className="text-xs font-mono text-z-muted/25 text-center">
            Le informazioni non sostituiscono la consulenza di un professionista abilitato. © 2024 Zipra
          </p>
        </div>
      </footer>
    </div>
  )
}