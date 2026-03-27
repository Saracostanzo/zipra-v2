'use client'
// PATH: src/components/PannelloGeneraSito.tsx
//
// Componente condiviso per generare sito vetrina, usato da:
//   1. Dashboard cliente Piano Pro → PannelloProFeatures nella dashboard
//   2. Dashboard business/commercialista → per i propri clienti
//
// Props:
//   pratiche     — lista pratiche del cliente target
//   targetUserId — userId del cliente per cui si genera il sito
//   businessId   — se presente, è il commercialista che genera per il cliente
//   nomeCliente  — per mostrare il nome nella UI (es. "Mario Rossi")
//   modaleTitolo — titolo del modal (es. "Crea sito per Mario Rossi")

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pratiche: any[]
  targetUserId: string
  businessId?: string          // se business sta generando per un cliente
  nomeCliente?: string         // es. "Mario Rossi" o nome impresa
  modaleTitolo?: string
  mostraTitoloPannello?: boolean
  onSitoGenerato?: (sitoId: string, praticaId: string) => void
}

export default function PannelloGeneraSito({
  pratiche,
  targetUserId,
  businessId,
  nomeCliente,
  modaleTitolo,
  mostraTitoloPannello = true,
  onSitoGenerato,
}: Props) {
  const router = useRouter()
  const [generando, setGenerando] = useState<string | null>(null)
  const [sitiGenerati, setSitiGenerati] = useState<Record<string, string>>({})
  const [praticaSelezionata, setPraticaSelezionata] = useState<any>(null)
  const [form, setForm] = useState({
    descrizione: '',
    servizi: '',
    telefono: '',
    email: '',
    indirizzo: '',
    orari: '',
  })

  const praticheAttive = pratiche.filter(p =>
    ['pagata', 'firma_inviata', 'in_revisione_admin', 'in_lavorazione', 'inviata_ente', 'completata'].includes(p.stato)
  )

  const apriForm = (p: any) => {
    setPraticaSelezionata(p)
    setForm({ descrizione: '', servizi: '', telefono: '', email: '', indirizzo: '', orari: '' })
  }

  const generaSito = async () => {
    if (!praticaSelezionata) return
    const praticaId = praticaSelezionata.id
    setGenerando(praticaId)
    setPraticaSelezionata(null)

    try {
      const res = await fetch('/api/sito/genera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          praticaId,
          clienteUserId: targetUserId,   // il cliente target
          businessId: businessId ?? null, // se business, chi genera
          datiManuali: {
            nomeImpresa: praticaSelezionata.nome_impresa,
            settore: praticaSelezionata.tipo_attivita ?? '',
            comuneSede: praticaSelezionata.comune_sede,
            provinciaSede: praticaSelezionata.provincia_sede,
            descrizione: form.descrizione,
            servizi: form.servizi.split('\n').map(s => s.trim()).filter(Boolean),
            telefono: form.telefono,
            email: form.email,
            indirizzo: form.indirizzo,
            orari: form.orari,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error ?? 'Errore generazione sito.')
        return
      }

      if (data.sitoId) {
        setSitiGenerati(prev => ({ ...prev, [praticaId]: data.sitoId }))
        onSitoGenerato?.(data.sitoId, praticaId)
        // Naviga alla pagina sito solo se non è un business che gestisce cliente
        if (!businessId) router.push(`/dashboard/sito/${data.sitoId}`)
      }
    } finally {
      setGenerando(null)
    }
  }

  if (praticheAttive.length === 0) return (
    <div className="text-center py-8 text-z-muted/50 text-sm">
      Nessuna pratica attiva. Il cliente deve avere almeno una pratica pagata.
    </div>
  )

  return (
    <div>
      {/* Modal raccolta dati */}
      {praticaSelezionata && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-z-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-head font-bold text-z-light text-lg">
                    {modaleTitolo ?? 'Crea sito web'}
                  </h2>
                  <p className="text-z-muted text-xs mt-0.5">
                    {praticaSelezionata.nome_impresa} · {praticaSelezionata.comune_sede}
                    {nomeCliente && <span className="ml-1">· Cliente: {nomeCliente}</span>}
                  </p>
                </div>
                <button onClick={() => setPraticaSelezionata(null)} className="text-z-muted/40 hover:text-z-muted text-2xl leading-none">×</button>
              </div>

              <p className="text-z-muted text-sm mb-5">
                Più informazioni fornisci, più il sito sarà personalizzato.
                L'AI userà questi dati per generare testi, scegliere i colori e ottimizzare per Google.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label-field">Descrivi l'attività *</label>
                  <textarea
                    value={form.descrizione}
                    onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
                    placeholder={`Es: ${praticaSelezionata.nome_impresa} è un/a ${praticaSelezionata.tipo_attivita?.toLowerCase() ?? 'attività'} a ${praticaSelezionata.comune_sede}. Offriamo...`}
                    className="input-field min-h-[90px] resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="label-field">Servizi offerti (uno per riga)</label>
                  <textarea
                    value={form.servizi}
                    onChange={e => setForm(p => ({ ...p, servizi: e.target.value }))}
                    placeholder={`Es:\nServizio 1\nServizio 2\nServizio 3`}
                    className="input-field min-h-[80px] resize-none text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">Telefono</label>
                    <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                      placeholder="+39 333 1234567" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="label-field">Email contatti</label>
                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="info@impresa.it" className="input-field text-sm" />
                  </div>
                </div>

                <div>
                  <label className="label-field">Indirizzo</label>
                  <input value={form.indirizzo} onChange={e => setForm(p => ({ ...p, indirizzo: e.target.value }))}
                    placeholder={`Via Roma 10, ${praticaSelezionata.comune_sede}`} className="input-field text-sm" />
                </div>

                <div>
                  <label className="label-field">Orari di apertura</label>
                  <input value={form.orari} onChange={e => setForm(p => ({ ...p, orari: e.target.value }))}
                    placeholder="Es: Lun-Sab 9:00-19:00, Dom chiuso" className="input-field text-sm" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setPraticaSelezionata(null)} className="btn-secondary flex-1 justify-center text-sm">Annulla</button>
                <button
                  onClick={generaSito}
                  disabled={!form.descrizione.trim()}
                  className="btn-primary flex-1 justify-center text-sm disabled:opacity-50"
                >
                  🚀 Genera sito →
                </button>
              </div>
              <p className="text-xs text-z-muted/40 text-center mt-3">
                La generazione richiede 2-3 minuti. {businessId ? 'Il cliente riceverà una email.' : 'Riceverai una email quando è pronto.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Titolo pannello */}
      {mostraTitoloPannello && !businessId && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⭐</span>
          <div>
            <h2 className="font-head font-bold text-z-light text-xl">Funzioni Piano Pro</h2>
            <p className="text-z-muted text-xs mt-0.5">Sito web, logo AI e Google Business inclusi</p>
          </div>
        </div>
      )}

      {/* Lista pratiche */}
      <div className="space-y-3">
        {praticheAttive.map(p => {
          const sitoId = sitiGenerati[p.id]
          const staGenerando = generando === p.id

          return (
            <div key={p.id} className="bg-z-mid border border-white/8 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-z-light text-sm truncate">{p.nome_impresa}</h3>
                  <p className="text-z-muted/60 text-xs mt-0.5">{p.comune_sede} ({p.provincia_sede})</p>
                </div>

                {staGenerando && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 shrink-0">
                    <div className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    In generazione...
                  </div>
                )}

                {!sitoId && !staGenerando && (
                  <button onClick={() => apriForm(p)} className="btn-primary text-xs py-2 px-4 shrink-0">
                    🌐 Genera sito
                  </button>
                )}

                {sitoId && !staGenerando && (
                  <a href={`/dashboard/sito/${sitoId}`} target={businessId ? '_blank' : undefined}
                    className="btn-secondary text-xs py-2 px-4 shrink-0">
                    ✏️ Gestisci sito →
                  </a>
                )}
              </div>

              {staGenerando && (
                <div className="mt-4 bg-z-darker rounded-xl p-4 space-y-1 text-xs text-z-muted/60">
                  <p>🎨 Generazione logo AI...</p>
                  <p>✍️ Scrittura testi SEO ottimizzati...</p>
                  <p>🌐 Pubblicazione sito...</p>
                  <p>📍 Preparazione guida Google Business...</p>
                </div>
              )}

              {sitoId && !staGenerando && (
                <div className="mt-3 bg-z-green/8 border border-z-green/20 rounded-xl px-4 py-3">
                  <p className="text-z-green text-xs font-bold">✅ Sito generato!</p>
                  <p className="text-z-muted/60 text-xs mt-0.5">
                    {businessId
                      ? 'Il cliente ha ricevuto una email con il link al sito e la guida Google Business.'
                      : 'Il sito è online. Hai ricevuto anche la guida per Google Business via email.'}
                  </p>
                </div>
              )}

              {!sitoId && !staGenerando && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { icon: '🌐', label: 'Sito web', desc: 'Pubblicato su dominio dedicato' },
                    { icon: '🎨', label: 'Logo AI', desc: 'Personalizzato per il brand' },
                    { icon: '📍', label: 'Google Business', desc: 'Guida con dati pre-compilati' },
                  ].map(f => (
                    <div key={f.label} className="bg-z-darker rounded-xl p-3 text-center">
                      <div className="text-xl mb-1">{f.icon}</div>
                      <p className="text-z-light text-xs font-bold">{f.label}</p>
                      <p className="text-z-muted/50 text-[10px] mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}