'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
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
  bozza:               { label: 'Bozza',          color: 'text-gray-400',  bg: 'bg-gray-400/10' },
  in_revisione_admin:  { label: 'In revisione',   color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  inviata_utente:      { label: 'Inviata utente', color: 'text-blue-400',  bg: 'bg-blue-400/10' },
  approvata_utente:    { label: 'Approvata',      color: 'text-cyan-400',  bg: 'bg-cyan-400/10' },
  in_invio:            { label: 'In invio',       color: 'text-purple-400', bg: 'bg-purple-400/10' },
  inviata_ente:        { label: 'Inviata ente',   color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  completata:          { label: 'Completata',     color: 'text-green-400',  bg: 'bg-green-400/10' },
  respinta_ente:       { label: 'Respinta ente',  color: 'text-red-400',   bg: 'bg-red-400/10' },
  in_reinoltro:        { label: 'In reinoltro',   color: 'text-orange-400', bg: 'bg-orange-400/10' },
  richiede_integrazione: { label: 'Integrazione', color: 'text-amber-400', bg: 'bg-amber-400/10' },
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

  // Professionisti mock — in produzione vengono da DB
  const [professionisti] = useState([
    { id: '1', nome: 'Mario Rossi', tipo: 'commercialista', email: 'mario@studiorossi.it', citta: 'Lecce', province: ['LE', 'BR'] },
    { id: '2', nome: 'Anna Bianchi', tipo: 'notaio', email: 'anna.bianchi@notaio.it', citta: 'Lecce', province: ['LE'] },
  ])

  const praticheFiltrate = pratiche.filter(p => {
    if (filtro !== 'tutte' && p.stato !== filtro) return false
    if (ricerca && !p.nome_impresa.toLowerCase().includes(ricerca.toLowerCase()) &&
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
    // TODO: send email via Resend
    alert('✅ Pratica inviata all\'utente per revisione')
  }

  const inviaAgliEnti = async () => {
    if (!selezionata) return
    await aggiornaPratica(selezionata.id, 'in_invio')
    alert('✅ Pratica inviata agli enti — in lavorazione')
  }

  const segnaCompletata = async () => {
    if (!selezionata) return
    await aggiornaPratica(selezionata.id, 'completata')
    alert('✅ Pratica segnata come completata')
  }

  const inviaReminderPagamento = async () => {
    if (!selezionata) return
    alert(`📧 Reminder pagamento inviato a ${selezionata.user?.email}`)
  }

  const getAnalisi = () => {
    if (!selezionata?.analisi_ai) return null
    try { return JSON.parse(selezionata.analisi_ai) } catch { return null }
  }

  const analisi = getAnalisi()
  const profFiltrati = professionisti.filter(p =>
    p.tipo === tipoProf &&
    (p.province.includes(selezionata?.provincia_sede ?? '') || p.citta.toLowerCase().includes(selezionata?.comune_sede?.toLowerCase() ?? ''))
  )

  return (
    <div className="min-h-screen bg-z-darker">
      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-head text-xl font-bold text-z-light">zipra ⚡</span>
            <span className="text-xs font-mono text-z-green/60 border border-z-green/20 px-2 py-0.5">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/professionisti" className="btn-secondary text-xs py-2">👔 Professionisti</a>
            <a href="/dashboard" className="btn-secondary text-xs py-2">← App</a>
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
          {/* Filtri */}
          <div className="flex gap-2 mb-3">
            <input value={ricerca} onChange={e => setRicerca(e.target.value)}
              placeholder="Cerca nome, numero, utente..."
              className="input-field flex-1 py-2 text-sm" />
            <select value={filtro} onChange={e => setFiltro(e.target.value)}
              className="input-field py-2 text-sm w-44">
              <option value="tutte">Tutte le pratiche</option>
              <option value="bozza">Bozza (non pagate)</option>
              <option value="in_revisione_admin">In revisione</option>
              <option value="inviata_utente">Inviata utente</option>
              <option value="approvata_utente">Approvata utente</option>
              <option value="in_invio">In invio</option>
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
                <div key={p.id} onClick={() => { setSelezionata(p); setNoteAdmin(p.note_admin ?? ''); setTab('analisi') }}
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
                  {/* Badge pagamento */}
                  {p.stato === 'bozza' && (
                    <div className="mt-2 text-[10px] font-mono text-amber-400/70 bg-amber-400/8 px-2 py-1">
                      ⏳ In attesa di pagamento
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Pannello dettaglio */}
        {selezionata && (
          <div className="flex-1 bg-z-mid border border-white/8 self-start sticky top-20">
            {/* Header pannello */}
            <div className="border-b border-white/8 p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-z-green">{selezionata.numero_pratica}</div>
                <div className="font-head font-bold text-z-light mt-0.5">{selezionata.nome_impresa}</div>
                <div className="text-xs text-z-muted mt-0.5">
                  {selezionata.user?.nome} {selezionata.user?.cognome} — {selezionata.user?.email}
                </div>
              </div>
              <button onClick={() => setSelezionata(null)} className="text-z-muted/40 hover:text-z-muted text-lg">×</button>
            </div>

            {/* Tab */}
            <div className="flex border-b border-white/8">
              {([
                { id: 'analisi', label: '🧠 Analisi AI' },
                { id: 'azioni', label: '⚡ Azioni' },
                { id: 'professionisti', label: '👔 Professionisti' },
                { id: 'pagamento', label: '💳 Pagamento' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-xs font-mono transition-all ${tab === t.id ? 'text-z-green border-b-2 border-z-green' : 'text-z-muted/50 hover:text-z-muted'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(100vh-280px)]">

              {/* TAB: ANALISI AI */}
              {tab === 'analisi' && (
                <div className="space-y-4">
                  {/* Codice ATECO */}
                  {analisi?.codice_ateco && (
                    <div className="flex items-center gap-3 bg-z-darker p-4">
                      <div className="bg-z-green/10 border border-z-green/20 px-3 py-2 text-center shrink-0">
                        <div className="font-mono font-bold text-z-green">{analisi.codice_ateco}</div>
                        <div className="text-[9px] font-mono text-z-muted/40 uppercase">ATECO</div>
                      </div>
                      <div>
                        <div className="font-bold text-z-light text-sm">{analisi.descrizione_ateco}</div>
                        <div className="text-xs text-z-muted mt-0.5">Codice attività</div>
                      </div>
                    </div>
                  )}

                  {/* Pratiche da gestire */}
                  {analisi?.pratiche && analisi.pratiche.length > 0 && (
                    <div>
                      <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">
                        Pratiche da gestire
                      </div>
                      <div className="space-y-2">
                        {analisi.pratiche.map((p: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 bg-z-darker p-3">
                            <span className="text-z-green text-xs mt-0.5">✓</span>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-z-light">{typeof p === 'string' ? p : p.titolo}</div>
                              {p.ente && <div className="text-xs text-z-muted">{p.ente}</div>}
                            </div>
                            {p.tempi && <div className="text-xs font-mono text-z-muted/40">{p.tempi}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documenti necessari */}
                  {analisi?.documenti_necessari && analisi.documenti_necessari.length > 0 && (
                    <div>
                      <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">
                        Documenti necessari dall'utente
                      </div>
                      <div className="space-y-1">
                        {analisi.documenti_necessari.map((d: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-z-muted py-1 border-b border-white/5 last:border-0">
                            <span className="text-blue-400 text-xs">📎</span>{d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Serve professionista */}
                  {analisi?.serve_notaio && (
                    <div className="bg-amber-400/8 border border-amber-400/20 p-4">
                      <div className="text-sm font-bold text-amber-400 mb-1">⚠️ Richiede Notaio</div>
                      <div className="text-xs text-amber-400/70">{analisi.note_notaio ?? 'Atto costitutivo richiede atto notarile per legge'}</div>
                      <button onClick={() => setTab('professionisti')} className="mt-2 text-xs text-amber-400 underline">
                        → Seleziona notaio
                      </button>
                    </div>
                  )}
                  {analisi?.serve_commercialista && (
                    <div className="bg-blue-400/8 border border-blue-400/20 p-4">
                      <div className="text-sm font-bold text-blue-400 mb-1">ℹ️ Richiede Commercialista</div>
                      <div className="text-xs text-blue-400/70">{analisi.note_commercialista ?? 'Necessario per deposito bilancio o adempimenti fiscali'}</div>
                      <button onClick={() => setTab('professionisti')} className="mt-2 text-xs text-blue-400 underline">
                        → Seleziona commercialista
                      </button>
                    </div>
                  )}

                  {/* Note AI */}
                  {analisi?.note_importanti && (
                    <div className="bg-z-darker p-4 text-xs text-z-muted/70 leading-relaxed">
                      ℹ️ {analisi.note_importanti}
                    </div>
                  )}

                  {!analisi && (
                    <div className="text-z-muted/40 text-sm text-center py-8">
                      Nessuna analisi AI disponibile per questa pratica.
                    </div>
                  )}
                </div>
              )}

              {/* TAB: AZIONI */}
              {tab === 'azioni' && (
                <div className="space-y-4">
                  <div>
                    <label className="label-field">Note per l'utente (opzionali)</label>
                    <textarea value={noteAdmin} onChange={e => setNoteAdmin(e.target.value)}
                      placeholder="Es: Ho verificato i requisiti locali, ti ho aggiunto la pratica per..."
                      className="input-field min-h-[80px] resize-none text-sm" />
                  </div>

                  <div className="space-y-2">
                    {/* Invia riepilogo all'utente */}
                    <button onClick={inviaAUtente} disabled={!!loading}
                      className="btn-primary w-full justify-center py-3">
                      📧 Invia riepilogo piano all'utente
                    </button>
                    <p className="text-xs text-z-muted/40 text-center">
                      L'utente riceve email con il piano completo e può confermare
                    </p>
                  </div>

                  <div className="border-t border-white/8 pt-4 space-y-2">
                    <div className="text-xs font-mono text-z-muted/50 uppercase tracking-wider mb-2">
                      Dopo conferma utente
                    </div>
                    {/* Invia agli enti */}
                    <button onClick={inviaAgliEnti} disabled={!!loading}
                      className="w-full py-3 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-sm hover:bg-purple-500/30 transition-all">
                      🚀 Invia alle istituzioni (Telemaco/CCIAA/INPS)
                    </button>

                    <button onClick={() => aggiornaPratica(selezionata.id, 'richiede_integrazione', noteAdmin)}
                      disabled={!!loading}
                      className="w-full py-2.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm hover:bg-amber-400/15 transition-all">
                      📎 Richiedi documenti mancanti
                    </button>

                    <button onClick={segnaCompletata} disabled={!!loading}
                      className="w-full py-2.5 bg-green-400/10 border border-green-400/20 text-green-400 text-sm hover:bg-green-400/15 transition-all">
                      ✅ Segna come completata
                    </button>
                  </div>

                  <div className="border-t border-white/8 pt-4">
                    <button onClick={() => router.push(`/admin/pratiche/${selezionata.id}`)}
                      className="w-full py-2.5 border border-white/8 text-z-muted text-sm hover:border-white/20 transition-all">
                      ✏️ Apri e modifica pratica completa
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
                        {t === 'commercialista' ? '📊 Commercialista' : '⚖️ Notaio'}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-z-muted/50 font-mono">
                    Professionisti disponibili per {selezionata.comune_sede} ({selezionata.provincia_sede})
                  </div>

                  {profFiltrati.length === 0 ? (
                    <div className="text-z-muted/40 text-sm text-center py-4">
                      Nessun {tipoProf} configurato per questa provincia.
                      <button onClick={() => setMostraAggiuntaProfessionista(true)}
                        className="block mx-auto mt-2 text-z-green text-xs underline">
                        + Aggiungi professionista
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profFiltrati.map(p => (
                        <div key={p.id} className="bg-z-darker p-4 border border-white/8">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-z-light text-sm">{p.nome}</div>
                              <div className="text-xs text-z-muted mt-0.5">{p.email}</div>
                              <div className="text-xs text-z-muted/50 mt-0.5">
                                {p.citta} · Province: {p.province.join(', ')}
                              </div>
                            </div>
                            <button
                              onClick={() => setEmailProf(p.email)}
                              className={`text-xs py-1.5 px-3 border transition-all ${emailProf === p.email ? 'border-z-green bg-z-green/10 text-z-green' : 'border-white/8 text-z-muted hover:border-white/20'}`}>
                              {emailProf === p.email ? '✓ Selezionato' : 'Seleziona'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {emailProf && (
                    <button
                      onClick={() => alert(`📧 Fascicolo inviato a ${emailProf}`)}
                      className="btn-primary w-full justify-center py-3 mt-2">
                      📁 Invia fascicolo a {emailProf}
                    </button>
                  )}

                  <button onClick={() => setMostraAggiuntaProfessionista(!mostraAggiuntaProfessionista)}
                    className="w-full py-2 border border-white/8 text-z-muted/50 text-xs hover:border-white/15 transition-all">
                    + Aggiungi nuovo professionista
                  </button>

                  {mostraAggiuntaProfessionista && (
                    <div className="bg-z-darker p-4 border border-white/8 space-y-3">
                      <div className="text-xs font-mono text-z-muted/50 uppercase mb-2">Nuovo professionista</div>
                      {[
                        { campo: 'nome', label: 'Nome completo', placeholder: 'Mario Rossi' },
                        { campo: 'email', label: 'Email', placeholder: 'mario@studio.it' },
                        { campo: 'pec', label: 'PEC', placeholder: 'mario@pec.it' },
                        { campo: 'citta', label: 'Città', placeholder: 'Lecce' },
                        { campo: 'province', label: 'Province (es. LE,BR)', placeholder: 'LE,BR' },
                      ].map(({ campo, label, placeholder }) => (
                        <div key={campo}>
                          <label className="label-field">{label}</label>
                          <input
                            value={nuovoProf[campo as keyof typeof nuovoProf]}
                            onChange={e => setNuovoProf(prev => ({ ...prev, [campo]: e.target.value }))}
                            placeholder={placeholder}
                            className="input-field text-sm py-2" />
                        </div>
                      ))}
                      <div>
                        <label className="label-field">Tipo</label>
                        <select value={nuovoProf.tipo}
                          onChange={e => setNuovoProf(prev => ({ ...prev, tipo: e.target.value }))}
                          className="input-field text-sm py-2">
                          <option value="commercialista">Commercialista</option>
                          <option value="notaio">Notaio</option>
                        </select>
                      </div>
                      <button onClick={() => {
                        alert(`✅ ${nuovoProf.nome} aggiunto (salvare nel DB in produzione)`)
                        setMostraAggiuntaProfessionista(false)
                      }} className="btn-primary w-full justify-center py-2 text-sm">
                        Salva professionista
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: PAGAMENTO */}
              {tab === 'pagamento' && (
                <div className="space-y-4">
                  <div className={`p-4 border ${selezionata.stato === 'bozza' ? 'border-amber-400/30 bg-amber-400/5' : 'border-green-400/30 bg-green-400/5'}`}>
                    <div className={`font-bold text-sm ${selezionata.stato === 'bozza' ? 'text-amber-400' : 'text-green-400'}`}>
                      {selezionata.stato === 'bozza' ? '⏳ In attesa di pagamento' : '✅ Pagamento ricevuto'}
                    </div>
                    <div className="text-xs text-z-muted mt-1">
                      Piano utente: <span className="text-z-light font-bold">{selezionata.user?.piano?.toUpperCase() ?? 'FREE'}</span>
                    </div>
                  </div>

                  {selezionata.stato === 'bozza' && (
                    <button onClick={inviaReminderPagamento}
                      className="w-full py-3 bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold text-sm hover:bg-amber-400/15 transition-all">
                      📧 Invia reminder pagamento all'utente
                    </button>
                  )}

                  <div className="bg-z-darker p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-z-muted">Utente</span>
                      <span className="text-z-light">{selezionata.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-z-muted">Piano</span>
                      <span className="text-z-light">{selezionata.user?.piano}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-z-muted">Costo stimato</span>
                      <span className="text-z-green font-bold">€{analisi?.costo_stimato ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}