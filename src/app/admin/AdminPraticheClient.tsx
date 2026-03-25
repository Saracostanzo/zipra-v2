'use client'

// PATH: src/app/admin/AdminPraticheClient.tsx

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

interface Pratica {
  id: string
  numero_pratica: string
  tipo_attivita: string
  forma_giuridica: string
  nome_impresa: string
  comune_sede: string
  provincia_sede: string
  stato: string
  codice_ateco: string | null
  analisi_ai: string | null
  note_admin: string | null
  created_at: string
  pagamento_stato?: string
  user: { id: string; nome: string | null; cognome: string | null; email: string; telefono: string | null; piano: string }
  checklist_items: { id: string; stato: string; completato: boolean }[]
}

interface Stats {
  totali: number
  inRevisione: number
  inviate: number
  respinte: number
  completate: number
}

const STATO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bozza:                 { label: 'Bozza',            color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  pagata:                { label: 'Pagata',            color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  firma_inviata:         { label: 'Firma inviata',     color: 'text-blue-300',   bg: 'bg-blue-300/10' },
  in_revisione_admin:    { label: 'In revisione',      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  inviata_utente:        { label: 'Inviata utente',    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  approvata_utente:      { label: 'Approvata',         color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  in_invio:              { label: 'In invio',          color: 'text-purple-400', bg: 'bg-purple-400/10' },
  in_lavorazione:        { label: 'In lavorazione',    color: 'text-indigo-300', bg: 'bg-indigo-300/10' },
  inviata_ente:          { label: 'Inviata ente',      color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  completata:            { label: 'Completata',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  respinta_ente:         { label: 'Respinta ente',     color: 'text-red-400',    bg: 'bg-red-400/10' },
  in_reinoltro:          { label: 'In reinoltro',      color: 'text-orange-400', bg: 'bg-orange-400/10' },
  richiede_integrazione: { label: 'Integrazione',      color: 'text-amber-400',  bg: 'bg-amber-400/10' },
}

export default function AdminPraticheClient({ pratiche: iniziali, stats }: { pratiche: Pratica[]; stats: Stats }) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [pratiche, setPratiche] = useState(iniziali)
  const [selezionata, setSelezionata] = useState<Pratica | null>(null)
  const [filtro, setFiltro] = useState('tutte')
  const [ricerca, setRicerca] = useState('')
  const [noteAdmin, setNoteAdmin] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<'analisi' | 'azioni' | 'professionisti' | 'pagamento'>('analisi')
  const [emailProf, setEmailProf] = useState('')
  const [tipoProf, setTipoProf] = useState<'commercialista' | 'notaio'>('commercialista')
  const [mostraAggiuntaProfessionista, setMostraAggiuntaProfessionista] = useState(false)
  const [nuovoProf, setNuovoProf] = useState({ nome: '', email: '', pec: '', citta: '', province: '', tipo: 'commercialista' })

  const [professionisti] = useState([
    { id: '1', nome: 'Mario Rossi', tipo: 'commercialista', email: 'mario@studiorossi.it', citta: 'Lecce', province: ['LE', 'BR'] },
    { id: '2', nome: 'Anna Bianchi', tipo: 'notaio', email: 'anna.bianchi@notaio.it', citta: 'Lecce', province: ['LE'] },
  ])

  const praticheFiltrate = pratiche.filter(p => {
    if (filtro !== 'tutte' && p.stato !== filtro) return false
    if (ricerca &&
      !p.nome_impresa.toLowerCase().includes(ricerca.toLowerCase()) &&
      !p.numero_pratica.toLowerCase().includes(ricerca.toLowerCase()) &&
      !`${p.user?.nome} ${p.user?.cognome}`.toLowerCase().includes(ricerca.toLowerCase())) return false
    return true
  })

  const aggiornaPratica = async (id: string, stato: string, note?: string) => {
    setLoading(id)
    const updates: any = { stato, updated_at: new Date().toISOString() }
    if (note) updates.note_admin = note
    const { error } = await supabase.from('pratiche').update(updates).eq('id', id)
    if (!error) {
      setPratiche(prev => prev.map(p => p.id === id ? { ...p, stato, note_admin: note ?? p.note_admin } : p))
      if (selezionata?.id === id) setSelezionata(prev => prev ? { ...prev, stato, note_admin: note ?? prev.note_admin } : null)
    }
    setLoading(null)
  }

  const inviaAUtente = async () => {
    if (!selezionata) return
    await aggiornaPratica(selezionata.id, 'inviata_utente', noteAdmin || undefined)
    alert('Pratica inviata all\'utente per revisione')
  }

  const inviaAgliEnti = async () => {
    if (!selezionata) return
    await aggiornaPratica(selezionata.id, 'in_invio')
    alert('Pratica inviata agli enti — in lavorazione')
  }

  const segnaCompletata = async () => {
    if (!selezionata) return
    await aggiornaPratica(selezionata.id, 'completata')
    alert('Pratica segnata come completata')
  }

  const getAnalisi = () => {
    if (!selezionata?.analisi_ai) return null
    try { return JSON.parse(selezionata.analisi_ai) } catch { return null }
  }

  const analisi = getAnalisi()
  const profFiltrati = professionisti.filter(p =>
    p.tipo === tipoProf &&
    (p.province.includes(selezionata?.provincia_sede ?? '') ||
     p.citta.toLowerCase().includes(selezionata?.comune_sede?.toLowerCase() ?? ''))
  )

  return (
    <div className="min-h-screen bg-z-darker">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-head text-xl font-bold text-z-light">zipra</span>
            <span className="text-xs font-mono text-z-green/60 border border-z-green/20 px-2 py-0.5">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="btn-secondary text-xs py-2">App</a>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="btn-secondary text-xs py-2">Esci</button>
          </div>
        </div>
      </nav>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-4 grid grid-cols-5 gap-3">
        {[
          { label: 'Totali', val: stats.totali, filtro: 'tutte', color: 'text-z-light' },
          { label: 'In revisione', val: stats.inRevisione, filtro: 'in_revisione_admin', color: 'text-yellow-400' },
          { label: 'In invio', val: stats.inviate, filtro: 'in_invio', color: 'text-purple-400' },
          { label: 'Respinte', val: stats.respinte, filtro: 'respinta_ente', color: 'text-red-400' },
          { label: 'Completate', val: stats.completate, filtro: 'completata', color: 'text-green-400' },
        ].map(s => (
          <button key={s.label} onClick={() => setFiltro(s.filtro)}
            className={`bg-z-mid border p-4 text-center transition-all ${filtro === s.filtro ? 'border-z-green/40' : 'border-white/8 hover:border-white/15'}`}>
            <div className={`font-head text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs font-mono text-z-muted/50 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 flex gap-4">
        {/* Lista pratiche */}
        <div className={`${selezionata ? 'w-2/5' : 'w-full'} transition-all`}>
          <div className="flex gap-2 mb-3">
            <input value={ricerca} onChange={e => setRicerca(e.target.value)}
              placeholder="Cerca nome, numero, utente..."
              className="input-field flex-1 py-2 text-sm" />
            <select value={filtro} onChange={e => setFiltro(e.target.value)}
              className="input-field py-2 text-sm w-44">
              <option value="tutte">Tutte le pratiche</option>
              <option value="bozza">Bozza</option>
              <option value="pagata">Pagate</option>
              <option value="firma_inviata">Firma inviata</option>
              <option value="in_revisione_admin">In revisione</option>
              <option value="in_lavorazione">In lavorazione</option>
              <option value="completata">Completate</option>
              <option value="respinta_ente">Respinte ente</option>
            </select>
          </div>

          <div className="space-y-2">
            {praticheFiltrate.length === 0 && (
              <div className="bg-z-mid border border-white/8 p-8 text-center text-z-muted text-sm">
                Nessuna pratica trovata
              </div>
            )}
            {praticheFiltrate.map(p => {
              const cfg = STATO_CONFIG[p.stato] ?? { label: p.stato, color: 'text-z-muted', bg: 'bg-white/5' }
              const a = p.analisi_ai ? (() => { try { return JSON.parse(p.analisi_ai!) } catch { return null } })() : null
              return (
                <div key={p.id}
                  onClick={() => { setSelezionata(p); setNoteAdmin(p.note_admin ?? ''); setTab('analisi') }}
                  className={`bg-z-mid border p-4 cursor-pointer transition-all hover:border-white/20 ${selezionata?.id === p.id ? 'border-z-green/40' : 'border-white/8'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-z-muted/40">{p.numero_pratica}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-z-muted/30">
                      {new Date(p.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="font-head font-bold text-z-light text-sm mb-1">{p.nome_impresa}</div>
                  <div className="text-xs text-z-muted/60 truncate">{p.tipo_attivita}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-z-muted/50">
                      {p.user?.nome} {p.user?.cognome} · {p.comune_sede} ({p.provincia_sede})
                    </div>
                    {a?.codice_ateco && (
                      <span className="text-[10px] font-mono text-z-green/60 bg-z-green/8 px-1.5 py-0.5">
                        {a.codice_ateco}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pannello dettaglio */}
        {selezionata && (
          <div className="flex-1 bg-z-mid border border-white/8 self-start sticky top-20">
            {/* Header */}
            <div className="border-b border-white/8 p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-z-muted/40">{selezionata.numero_pratica}</div>
                <div className="font-head font-bold text-z-light">{selezionata.nome_impresa}</div>
                <div className="text-xs text-z-muted mt-0.5">{selezionata.tipo_attivita}</div>
              </div>
              <button onClick={() => setSelezionata(null)} className="text-z-muted/40 hover:text-z-muted text-xl">×</button>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/8 flex">
              {(['analisi', 'azioni', 'professionisti', 'pagamento'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-mono capitalize transition-all ${tab === t ? 'text-z-green border-b-2 border-z-green' : 'text-z-muted/50 hover:text-z-muted'}`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* TAB: ANALISI */}
              {tab === 'analisi' && (
                <div className="space-y-4">
                  {/* Dati utente */}
                  <div>
                    <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">Cliente</div>
                    <div className="bg-z-darker p-3 space-y-1">
                      <div className="text-sm font-bold text-z-light">
                        {selezionata.user?.nome} {selezionata.user?.cognome}
                      </div>
                      <div className="text-xs text-z-muted">{selezionata.user?.email}</div>
                      {selezionata.user?.telefono && (
                        <div className="text-xs text-z-muted">{selezionata.user.telefono}</div>
                      )}
                      <div className="text-xs text-z-muted/50">Piano: {selezionata.user?.piano}</div>
                    </div>
                  </div>

                  {/* Dati pratica */}
                  <div>
                    <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">Pratica</div>
                    <div className="bg-z-darker p-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-z-muted/50">Forma giuridica</span>
                        <span className="text-z-light">{selezionata.forma_giuridica}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-z-muted/50">Sede</span>
                        <span className="text-z-light">{selezionata.comune_sede} ({selezionata.provincia_sede})</span>
                      </div>
                      {analisi?.codice_ateco && (
                        <div className="flex justify-between">
                          <span className="text-z-muted/50">ATECO</span>
                          <span className="text-z-green font-mono">{analisi.codice_ateco}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checklist AI */}
                  {analisi?.checklist && analisi.checklist.length > 0 && (
                    <div>
                      <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">
                        Checklist pratiche
                      </div>
                      <div className="space-y-1.5">
                        {analisi.checklist.map((p: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 bg-z-darker p-2.5 text-xs">
                            <span className="text-z-green/60 shrink-0">→</span>
                            <div className="flex-1">
                              <div className="text-z-light font-medium">{typeof p === 'string' ? p : p.titolo}</div>
                              {p.ente && <div className="text-z-muted/50 mt-0.5">{p.ente}</div>}
                            </div>
                            {p.tempi && <div className="text-xs font-mono text-z-muted/40 shrink-0">{p.tempi}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note admin */}
                  <div>
                    <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">Note admin</div>
                    <textarea
                      value={noteAdmin}
                      onChange={e => setNoteAdmin(e.target.value)}
                      placeholder="Note interne (non visibili al cliente)..."
                      rows={3}
                      className="input-field w-full text-sm resize-none"
                    />
                    <button
                      onClick={() => aggiornaPratica(selezionata.id, selezionata.stato, noteAdmin)}
                      disabled={!!loading}
                      className="mt-1 text-xs text-z-green/70 hover:text-z-green underline">
                      Salva nota
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: AZIONI */}
              {tab === 'azioni' && (
                <div className="space-y-3">
                  <button onClick={inviaAUtente} disabled={!!loading}
                    className="w-full py-3 bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-sm hover:bg-blue-500/25 transition-all">
                    Invia all&apos;utente per revisione
                  </button>
                  <button onClick={inviaAgliEnti} disabled={!!loading}
                    className="w-full py-3 bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-sm hover:bg-purple-500/25 transition-all">
                    Invia agli enti
                  </button>
                  <button onClick={() => aggiornaPratica(selezionata.id, 'richiede_integrazione', noteAdmin)}
                    disabled={!!loading}
                    className="w-full py-2.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm hover:bg-amber-400/15 transition-all">
                    Richiedi documenti mancanti
                  </button>
                  <button onClick={segnaCompletata} disabled={!!loading}
                    className="w-full py-2.5 bg-green-400/10 border border-green-400/20 text-green-400 text-sm hover:bg-green-400/15 transition-all">
                    Segna come completata
                  </button>
                  <div className="border-t border-white/8 pt-3">
                    <button onClick={() => router.push(`/admin/pratiche/${selezionata.id}`)}
                      className="w-full py-2.5 border border-white/8 text-z-muted text-sm hover:border-white/20 transition-all">
                      Apri dettaglio completo
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: PROFESSIONISTI */}
              {tab === 'professionisti' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {(['commercialista', 'notaio'] as const).map(t => (
                      <button key={t} onClick={() => setTipoProf(t)}
                        className={`flex-1 py-2 text-sm font-bold transition-all ${tipoProf === t ? 'bg-z-green text-z-dark' : 'border border-white/8 text-z-muted hover:border-white/20'}`}>
                        {t === 'commercialista' ? 'Commercialista' : 'Notaio'}
                      </button>
                    ))}
                  </div>
                  {profFiltrati.length === 0 ? (
                    <div className="text-z-muted/40 text-sm text-center py-4">
                      Nessun {tipoProf} per questa provincia.
                      <button onClick={() => setMostraAggiuntaProfessionista(true)}
                        className="block mx-auto mt-2 text-z-green text-xs underline">
                        Aggiungi professionista
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profFiltrati.map(p => (
                        <div key={p.id} className="bg-z-darker p-4 border border-white/8 flex items-start justify-between">
                          <div>
                            <div className="font-bold text-z-light text-sm">{p.nome}</div>
                            <div className="text-xs text-z-muted mt-0.5">{p.email}</div>
                            <div className="text-xs text-z-muted/50 mt-0.5">{p.citta} · {p.province.join(', ')}</div>
                          </div>
                          <button onClick={() => setEmailProf(p.email)}
                            className={`text-xs py-1.5 px-3 border transition-all ${emailProf === p.email ? 'border-z-green bg-z-green/10 text-z-green' : 'border-white/8 text-z-muted hover:border-white/20'}`}>
                            {emailProf === p.email ? 'Selezionato' : 'Seleziona'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {emailProf && (
                    <button onClick={() => alert(`Fascicolo inviato a ${emailProf}`)}
                      className="btn-primary w-full justify-center py-3 mt-2">
                      Invia fascicolo a {emailProf}
                    </button>
                  )}
                </div>
              )}

              {/* TAB: PAGAMENTO */}
              {tab === 'pagamento' && (
                <div className="space-y-3 text-sm">
                  <div className="bg-z-darker p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-z-muted/50">Stato</span>
                      <span className={selezionata.stato === 'bozza' ? 'text-amber-400' : 'text-z-green'}>
                        {selezionata.stato === 'bozza' ? 'In attesa di pagamento' : 'Pagato'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-z-muted/50">Piano</span>
                      <span className="text-z-light">{selezionata.user?.piano}</span>
                    </div>
                  </div>
                  {selezionata.stato === 'bozza' && (
                    <button onClick={() => alert(`Reminder pagamento inviato a ${selezionata.user?.email}`)}
                      className="w-full py-2.5 border border-amber-400/30 text-amber-400 text-sm hover:bg-amber-400/10 transition-all">
                      Invia reminder pagamento
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}