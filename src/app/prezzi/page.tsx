'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PrezziPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'privati' | 'business'>('privati')

  return (
    <div className="min-h-screen bg-z-dark">

      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-head text-xl font-bold text-z-light">zipra ⚡</a>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-z-muted/60 hover:text-z-light transition">← Home</a>
            <a href="/pratiche" className="text-sm text-z-muted/60 hover:text-z-light transition">Servizi</a>
            <a href="/auth/signup" className="btn-primary text-sm py-2 px-4">Inizia gratis →</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20">

        {/* Titolo */}
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-black text-z-light mb-4 tracking-tight">
            Prezzi chiari,<br />
            <span className="text-z-green">nessuna sorpresa</span>
          </h1>
          <p className="text-z-muted text-lg max-w-xl mx-auto">
            Paga solo il servizio Zipra. I diritti agli enti (CCIAA, Comune, ecc.) 
            sono sempre separati e indicati prima di procedere.
          </p>
        </div>

        {/* Toggle tab */}
        <div className="flex justify-center mb-12">
          <div className="flex p-1.5 bg-z-mid rounded-2xl gap-1.5">
            <button
              onClick={() => setTab('privati')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                tab === 'privati'
                  ? 'bg-z-green text-z-dark shadow-green-sm'
                  : 'text-z-muted hover:text-z-light'
              }`}>
              👤 Privati e imprese
            </button>
            <button
              onClick={() => setTab('business')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                tab === 'business'
                  ? 'bg-z-green text-z-dark shadow-green-sm'
                  : 'text-z-muted hover:text-z-light'
              }`}>
              🏢 Commercialisti, CAF e Patronati
            </button>
          </div>
        </div>

        {/* ── PRIVATI ── */}
        {tab === 'privati' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* SINGOLA PRATICA */}
            <div className="bg-z-mid rounded-2xl border border-white/8 p-6 flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-black text-z-light mb-1">Singola pratica</h2>
                <p className="text-z-muted text-sm">Scegli solo quello che ti serve</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-black text-z-light">Listino</span>
                <p className="text-z-muted text-xs mt-1">Varia per tipo di pratica</p>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Una pratica a scelta dal catalogo',
                  'Analisi AI della tua situazione',
                  'Invio agli enti al posto tuo',
                  'Reinoltro gratuito se respinta',
                  'Pratica completata via email',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
                <div className="pt-3 mt-1 border-t border-white/6 space-y-2">
                  {['Adempimenti annuali', 'Sito web', 'Logo', 'Google Business'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-z-dim font-bold shrink-0">—</span>
                      <span className="text-z-dim">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => router.push('/pratiche')}
                className="btn-secondary w-full justify-center">
                Scegli una pratica →
              </button>
            </div>

            {/* BASE */}
            <div className="bg-z-mid rounded-2xl border border-white/8 p-6 flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-black text-z-light mb-1">Base</h2>
                <p className="text-z-muted text-sm">Apertura completa + tutto incluso per 12 mesi</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-z-green">€149</span>
                <span className="text-z-muted text-sm ml-1">/anno</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Apertura impresa completa',
                  'Analisi AI + codice ATECO',
                  'Tutte le pratiche di apertura incluse',
                  'Modifiche, variazioni e cessazione: solo costi enti',
                  'PEC, cambio sede, aggiunta soci — sempre gratis',
                  'Firma digitale — tua per sempre, riutilizzabile',
                  'Reinoltro gratuito se respinta',
                  'Archivio documenti incluso',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
                <div className="pt-3 mt-1 border-t border-white/6 space-y-2">
                  {[
                    'Adempimenti annuali (aggiungi Mantenimento €29/anno)',
                    'Sito web',
                    'Logo',
                    'Google Business',
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <span className="text-z-dim font-bold shrink-0 mt-0.5">—</span>
                      <span className="text-z-dim">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => router.push('/wizard')}
                className="btn-primary w-full justify-center">
                Inizia con Base →
              </button>
            </div>

            {/* PRO — evidenziato */}
            <div className="bg-gradient-to-b from-z-card to-z-mid rounded-2xl border border-z-green/30 p-6 flex flex-col relative shadow-green">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-z-green text-z-dark text-xs font-black px-4 py-1.5 rounded-full shadow-green-sm whitespace-nowrap">
                  ✨ Più scelto
                </span>
              </div>
              <div className="mb-6 pt-2">
                <h2 className="text-xl font-black text-z-light mb-1">Pro</h2>
                <p className="text-z-muted text-sm">Base + sito + logo + Google Business + mantenimento</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-z-green">€249</span>
                <span className="text-z-muted text-sm ml-1">/anno</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Tutto del Piano Base incluso',
                  'Sito web professionale con AI',
                  'Logo generato da AI',
                  'Scheda Google Business creata e verificata',
                  'Editor sito via chat AI — gratis, illimitato',
                  'Mantenimento annuale incluso',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/wizard?piano=pro')}
                className="btn-primary w-full justify-center">
                Inizia con Pro →
              </button>
            </div>

            {/* MANTENIMENTO */}
            <div className="bg-z-mid rounded-2xl border border-white/8 p-6 flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-black text-z-light mb-1">Mantenimento</h2>
                <p className="text-z-muted text-sm">Per chi ha già l'impresa aperta</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-z-green">€29</span>
                <span className="text-z-muted text-sm ml-1">/mese</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Adempimenti annuali automatici (bilancio, diritto camerale, ecc.)',
                  'Notifiche automatiche sulle scadenze che ti riguardano',
                  'Aggiornamenti su leggi e cambiamenti che impattano la tua attività',
                  'Sconto 20% su tutte le pratiche',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
                <div className="pt-3 mt-1 border-t border-white/6">
                  <div className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-dim font-bold shrink-0 mt-0.5">—</span>
                    <span className="text-z-dim">Pratiche con notaio o commercialista (costo aggiuntivo)</span>
                  </div>
                </div>
              </div>
              <button onClick={() => router.push('/checkout?piano=mantenimento')}
                className="btn-secondary w-full justify-center">
                Abbonati al Mantenimento →
              </button>
            </div>
          </div>
        )}

        {/* ── BUSINESS ── */}
        {tab === 'business' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* BUSINESS BASE */}
            <div className="bg-z-mid rounded-2xl border border-white/8 p-7 flex flex-col">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-z-light mb-1">Business</h2>
                <p className="text-z-muted text-sm">Per studi, CAF, patronati e agenzie</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-z-green">€199</span>
                <span className="text-z-muted text-sm ml-1">/mese</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Dashboard clienti — gestisci tutte le pratiche dei tuoi clienti',
                  'Apri pratiche a nome di un cliente in pochi click',
                  'Preparazione completa della documentazione notarile (zip pronto)',
                  'Notifiche automatiche ai tuoi clienti',
                  'Archivio documenti per ogni cliente',
                  'Conservazione a lungo termine',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
                <div className="pt-3 mt-1 border-t border-white/6">
                  <div className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-dim font-bold shrink-0 mt-0.5">—</span>
                    <span className="text-z-dim">Siti vetrina illimitati (aggiungi Business Pro)</span>
                  </div>
                </div>
              </div>
              <button onClick={() => router.push('/checkout?piano=business')}
                className="btn-primary w-full justify-center">
                Inizia con Business →
              </button>
            </div>

            {/* BUSINESS PRO */}
            <div className="bg-gradient-to-b from-z-card to-z-mid rounded-2xl border border-z-green/30 p-7 flex flex-col relative shadow-green">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-z-green text-z-dark text-xs font-black px-4 py-1.5 rounded-full shadow-green-sm whitespace-nowrap">
                  Completo
                </span>
              </div>
              <div className="mb-6 pt-2">
                <h2 className="text-2xl font-black text-z-light mb-1">Business Pro</h2>
                <p className="text-z-muted text-sm">Business + siti vetrina illimitati per i tuoi clienti</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-z-green">€299</span>
                <span className="text-z-muted text-sm ml-1">/mese</span>
              </div>
              <div className="space-y-3 mb-8 flex-1">
                {[
                  'Tutto di Business incluso',
                  'Siti vetrina illimitati per i tuoi clienti',
                  'Logo AI per ogni cliente',
                  'Google Business per ogni cliente',
                  'Editor sito AI per ogni cliente',
                  'Archivio e conservazione illimitati',
                ].map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <span className="text-z-green font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-z-soft">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/checkout?piano=business_pro')}
                className="btn-primary w-full justify-center">
                Inizia con Business Pro →
              </button>
            </div>
          </div>
        )}

        {/* Nota legale — solo notaio */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-z-mid border border-white/7 rounded-2xl px-6 py-5 text-center">
            <p className="text-z-muted text-sm leading-relaxed">
              Le pratiche che richiedono notaio o commercialista hanno un costo aggiuntivo
              che ti viene indicato chiaramente prima di procedere.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}