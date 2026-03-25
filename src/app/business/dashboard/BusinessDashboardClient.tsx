'use client'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

const STATO_COLORS: Record<string, string> = {
  bozza: 'text-gray-400',
  in_revisione_admin: 'text-amber-400',
  inviata_utente: 'text-blue-400',
  approvata_utente: 'text-green-400',
  completata: 'text-emerald-400',
  respinta: 'text-red-400',
}

const STATO_LABELS: Record<string, string> = {
  bozza: 'Bozza',
  in_revisione_admin: '🔍 In revisione',
  inviata_utente: '📤 Inviata',
  approvata_utente: '✅ Approvata',
  in_invio: '⚡ In invio',
  completata: '🎉 Completata',
  respinta: '❌ Respinta',
}

export default function BusinessDashboardClient({
  business,
  clienti,
  stats,
}: {
  business: any
  clienti: any[]
  stats: any
}) {
  const [cerca, setCerca] = useState('')
  const [vistaAttiva, setVistaAttiva] = useState<'clienti' | 'pratiche'>('clienti')
  const [clienteSelezionato, setClienteSelezionato] = useState<any | null>(null)

  const clientiFiltrati = clienti.filter(c =>
    !cerca ||
    `${c.cliente?.nome} ${c.cliente?.cognome}`.toLowerCase().includes(cerca.toLowerCase()) ||
    c.cliente?.email?.toLowerCase().includes(cerca.toLowerCase())
  )

  const tutteLePratiche = clienti.flatMap(c =>
    (c.pratiche ?? []).map((p: any) => ({
      ...p,
      cliente: c.cliente,
    }))
  ).filter(p =>
    !cerca ||
    p.nome_impresa?.toLowerCase().includes(cerca.toLowerCase()) ||
    `${p.cliente?.nome} ${p.cliente?.cognome}`.toLowerCase().includes(cerca.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-z-darker text-z-light font-body">
      {/* Header */}
      <div className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-head text-xl font-bold text-z-light">zipra</span>
            <span className="text-white/20">|</span>
            <span className="text-sm font-body text-z-orange font-semibold">{business.nome}</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-z-orange/10 text-z-orange border border-z-orange/20 uppercase">
              {business.tipo}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href='/business/sito-cliente'}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              title="Genera sito vetrina per un cliente con un click"
            >
              🌐 Genera sito cliente
            </button>
            <a href="/business/nuovo-cliente" className="btn-primary text-xs py-2 px-4">
              + Aggiungi cliente
            </a>
            <a href="/dashboard" className="btn-secondary text-xs py-2 px-4">
              Area personale
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Clienti totali', val: stats.totaleClienti, color: 'text-z-light' },
            { label: 'Pratiche totali', val: stats.praticheTotali, color: 'text-z-light' },
            { label: 'In lavorazione', val: stats.praticheAttive, color: 'text-amber-400' },
            { label: 'Completate', val: stats.praticheCompletate, color: 'text-emerald-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-z-mid border border-white/8 p-5">
              <div className={`font-head text-3xl font-bold ${color}`}>{val}</div>
              <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + Ricerca */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-z-mid border border-white/8">
            {[
              { id: 'clienti', label: `Clienti (${clienti.length})` },
              { id: 'pratiche', label: `Pratiche (${tutteLePratiche.length})` },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setVistaAttiva(id as any)}
                className={`px-4 py-2 text-sm font-head font-bold uppercase tracking-wider transition-all
                  ${vistaAttiva === id ? 'bg-z-green text-z-dark' : 'text-z-muted hover:text-z-light'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            placeholder="Cerca cliente o pratica..."
            className="input-field flex-1 py-2 text-sm"
          />
        </div>

        {/* Vista clienti */}
        {vistaAttiva === 'clienti' && (
          <div className="grid grid-cols-12 gap-6">
            <div className={clienteSelezionato ? 'col-span-7' : 'col-span-12'}>
              <div className="space-y-2">
                {clientiFiltrati.map((c) => {
                  const praticheCliente = c.pratiche ?? []
                  const attive = praticheCliente.filter((p: any) => !['completata', 'bozza'].includes(p.stato))
                  const isSelected = clienteSelezionato?.cliente?.id === c.cliente?.id

                  return (
                    <div
                      key={c.id}
                      onClick={() => setClienteSelezionato(isSelected ? null : c)}
                      className={`border p-4 cursor-pointer transition-all duration-150
                        ${isSelected
                          ? 'border-z-orange bg-z-orange/5'
                          : 'border-white/8 bg-z-mid hover:border-white/20'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-head font-bold text-z-light">
                            {c.cliente?.nome} {c.cliente?.cognome}
                          </div>
                          <div className="text-sm text-z-muted/60 mt-0.5">{c.cliente?.email}</div>
                          {c.note && (
                            <div className="text-xs font-mono text-z-muted/40 mt-1">📝 {c.note}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-z-muted/40">
                            {formatDistanceToNow(new Date(c.aggiunto_at), { addSuffix: true, locale: it })}
                          </div>
                          <div className="flex gap-2 mt-1 justify-end">
                            <span className="text-xs font-mono bg-z-dark px-2 py-0.5 text-z-muted/60">
                              {praticheCliente.length} pratiche
                            </span>
                            {attive.length > 0 && (
                              <span className="text-xs font-mono bg-amber-400/10 text-amber-400 px-2 py-0.5">
                                {attive.length} attive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {clientiFiltrati.length === 0 && (
                  <div className="text-center py-16 text-z-muted/40 font-mono text-sm">
                    {cerca ? 'Nessun cliente trovato' : 'Nessun cliente ancora — aggiungine uno!'}
                  </div>
                )}
              </div>
            </div>

            {/* Pannello dettaglio cliente */}
            {clienteSelezionato && (
              <div className="col-span-5 bg-z-mid border border-white/8 p-6 h-fit sticky top-24">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-head font-bold text-lg text-z-light">
                    {clienteSelezionato.cliente?.nome} {clienteSelezionato.cliente?.cognome}
                  </h3>
                  <button onClick={() => setClienteSelezionato(null)} className="text-z-muted/40 hover:text-z-light">✕</button>
                </div>

                <div className="space-y-2 mb-5 text-sm">
                  <div>
                    <span className="label-field">Email</span>
                    <span className="text-z-muted">{clienteSelezionato.cliente?.email}</span>
                  </div>
                  <div>
                    <span className="label-field">Piano Zipra</span>
                    <span className={`font-mono text-xs px-2 py-0.5 ${
                      clienteSelezionato.cliente?.piano === 'pro' ? 'bg-z-orange/10 text-z-orange' :
                      clienteSelezionato.cliente?.piano === 'base' ? 'bg-z-green/10 text-z-green' :
                      'bg-white/5 text-z-muted'
                    }`}>{clienteSelezionato.cliente?.piano?.toUpperCase() ?? 'FREE'}</span>
                  </div>
                  {clienteSelezionato.note && (
                    <div>
                      <span className="label-field">Note</span>
                      <span className="text-z-muted">{clienteSelezionato.note}</span>
                    </div>
                  )}
                </div>

                {/* Pratiche del cliente */}
                <div>
                  <p className="label-field mb-3">Pratiche ({clienteSelezionato.pratiche?.length ?? 0})</p>
                  <div className="space-y-2">
                    {(clienteSelezionato.pratiche ?? []).map((p: any) => (
                      <a
                        key={p.id}
                        href={`/admin/pratiche/${p.id}`}
                        className="block border border-white/8 p-3 hover:border-z-green/30 transition-colors"
                      >
                        <div className="font-body font-semibold text-z-light text-sm">{p.nome_impresa}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-z-muted/60">{p.comune_sede}</span>
                          <span className={`text-xs font-mono ${STATO_COLORS[p.stato] ?? 'text-z-muted'}`}>
                            {STATO_LABELS[p.stato] ?? p.stato}
                          </span>
                        </div>
                      </a>
                    ))}
                    {(clienteSelezionato.pratiche?.length ?? 0) === 0 && (
                      <p className="text-xs text-z-muted/40 font-mono">Nessuna pratica ancora</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/8">
                  <a
                    href={`/business/clienti/${clienteSelezionato.cliente?.id}`}
                    className="btn-secondary w-full justify-center text-sm py-2.5"
                  >
                    Profilo completo cliente →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vista pratiche */}
        {vistaAttiva === 'pratiche' && (
          <div className="space-y-2">
            {tutteLePratiche.map((p) => (
              <a
                key={p.id}
                href={`/admin/pratiche/${p.id}`}
                className="flex items-center justify-between border border-white/8 bg-z-mid p-4 hover:border-white/20 transition-colors"
              >
                <div>
                  <div className="font-head font-bold text-z-light">{p.nome_impresa}</div>
                  <div className="text-sm text-z-muted/60 mt-0.5">
                    {p.cliente?.nome} {p.cliente?.cognome} · {p.comune_sede} · {p.tipo_attivita}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-mono ${STATO_COLORS[p.stato] ?? 'text-z-muted'}`}>
                    {STATO_LABELS[p.stato] ?? p.stato}
                  </span>
                  <div className="text-xs font-mono text-z-muted/30 mt-1">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: it })}
                  </div>
                </div>
              </a>
            ))}
            {tutteLePratiche.length === 0 && (
              <div className="text-center py-16 text-z-muted/40 font-mono text-sm">
                Nessuna pratica ancora
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
