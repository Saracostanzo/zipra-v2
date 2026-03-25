'use client'
import { useParams, useRouter } from 'next/navigation'
import { CATALOGO, calcolaPrezzo } from '@/lib/catalogo'

export default function DettaglioPratica() {
  const params = useParams()
  const router = useRouter()
  const pratica = CATALOGO.find(p => p.id === params.id)

  if (!pratica) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="text-center">
        <p className="text-z-muted mb-4">Pratica non trovata</p>
        <button onClick={() => router.push('/pratiche')} className="btn-primary">← Torna al catalogo</button>
      </div>
    </div>
  )

  const { prezzoZipra, dirittiEnti, totale, notePrezzo } = calcolaPrezzo(pratica, false)

  return (
    <div className="min-h-screen bg-z-darker">
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/pratiche')} className="text-z-muted hover:text-z-light text-sm">← Catalogo</button>
          <span className="text-white/20">/</span>
          <span className="text-z-muted text-sm">{pratica.titolo}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-mono text-z-green/70 uppercase tracking-widest mb-2">{pratica.categoria}</p>
          <h1 className="font-head text-4xl font-bold text-z-light mb-3">{pratica.titolo}</h1>
          <p className="text-z-muted text-lg">{pratica.descrizione}</p>
        </div>

        {/* Prezzi chiari */}
        <div className="bg-z-mid border border-white/8 p-6 mb-6">
          <h2 className="font-head font-bold text-z-light mb-4">Quanto costa</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-white/8">
              <div>
                <div className="font-body font-semibold text-z-light">Servizio Zipra</div>
                <div className="text-xs text-z-muted mt-0.5">Compilazione, invio pratiche, gestione completa</div>
              </div>
              <div className="font-head font-bold text-z-light text-xl">€{prezzoZipra}</div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/8">
              <div>
                <div className="font-body font-semibold text-z-light">Diritti enti</div>
                <div className="text-xs text-z-muted mt-0.5">Tasse e bolli pagati agli enti (CCIAA, INPS, ecc.)</div>
              </div>
              <div className="font-head font-bold text-z-muted text-xl">€{dirittiEnti}</div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="font-head font-bold text-z-light text-lg">Totale</div>
              <div className="font-head font-bold text-z-green text-2xl">€{totale}</div>
            </div>
          </div>
          {pratica.richiedeNotaio && (
            <div className="mt-4 bg-amber-400/8 border border-amber-400/20 p-4">
              <p className="text-sm text-amber-400">
                ⚠️ Questa pratica richiede un notaio per legge — costo stimato {pratica.costoNotaioStimato ?? 'da preventivare'}, a carico tuo e separato dal costo Zipra. Ti preventivieremo prima di procedere.
              </p>
            </div>
          )}
          {pratica.richiedeCommercialista && (
            <div className="mt-4 bg-blue-400/8 border border-blue-400/20 p-4">
              <p className="text-sm text-blue-400">
                ℹ️ Questa pratica include il coordinamento con un commercialista affiliato (+€40 già inclusi nel prezzo).
              </p>
            </div>
          )}
        </div>

        {/* Tempi e documenti */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-z-mid border border-white/8 p-5">
            <h3 className="font-head font-bold text-z-light mb-3">⏱ Tempi</h3>
            <p className="text-z-muted text-sm">{pratica.tempiMedi}</p>
          </div>
          <div className="bg-z-mid border border-white/8 p-5">
            <h3 className="font-head font-bold text-z-light mb-3">📋 Documenti necessari</h3>
            <ul className="space-y-1">
              {pratica.documentiRichiesti.map(d => (
                <li key={d} className="text-z-muted text-sm flex gap-2">
                  <span className="text-z-green shrink-0">✓</span>{d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {pratica.note && (
          <div className="bg-z-mid border border-white/8 p-5 mb-6">
            <p className="text-sm text-z-muted">ℹ️ {pratica.note}</p>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => router.push('/wizard')} className="btn-primary w-full justify-center py-4 text-base">
          Inizia questa pratica →
        </button>
        <p className="text-xs text-z-muted/40 text-center mt-3">
          Reinoltro gratuito se l'ente respinge · Paghi solo dopo la revisione
        </p>
      </div>
    </div>
  )
}