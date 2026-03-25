'use client'
// src/app/admin/pratica/[id]/page.tsx
// Pagina admin SINGOLA PRATICA con:
// - Stato documenti (automatici + manuali)
// - Todo list enti (cosa manca, chi deve fare cosa)
// - Azioni: invia ComUnica, richiedi casellario, invia SCIA, ecc.
// - Log tutte le azioni effettuate

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface TodoAdmin {
  id: string
  tipo: string
  priorita: 'altissima' | 'alta' | 'media' | 'bassa'
  descrizione: string
  istruzioni: string
  dati: Record<string, any>
  completato: boolean
  creato_il: string
  completato_il?: string
}

interface DocumentoPratica {
  id: string
  tipo: string
  nome_file: string
  url?: string
  stato: 'presente' | 'mancante' | 'in_elaborazione' | 'richiesto'
  recuperato_da: 'utente' | 'zipra_api' | 'zipra_genera' | 'manuale'
  data_recupero?: string
}

interface AzioneAdmin {
  id: string
  tipo: string
  dettaglio: string
  created_at: string
}

interface Pratica {
  id: string
  user_id: string
  tipo_pratica: string
  stato: string
  procura_firmata: boolean
  procura_url?: string
  numero_pratica_cciaa?: string
  numero_pratica_suap?: string
  dati_wizard: Record<string, any>
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  codice_fiscale?: string
  data_nascita?: string
  luogo_nascita?: string
  residenza?: string
  telefono?: string
}

const PRIORITA_COLORS = {
  altissima: 'bg-red-100 border-red-400 text-red-800',
  alta: 'bg-orange-100 border-orange-400 text-orange-800',
  media: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  bassa: 'bg-gray-100 border-gray-300 text-gray-700',
}

const PRIORITA_BADGE = {
  altissima: 'bg-red-500 text-white',
  alta: 'bg-orange-500 text-white',
  media: 'bg-yellow-500 text-white',
  bassa: 'bg-gray-400 text-white',
}

export default function AdminPraticaSingola({ params }: { params: { id: string } }) {
  const supabase = createBrowserSupabaseClient()
  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [todos, setTodos] = useState<TodoAdmin[]>([])
  const [documenti, setDocumenti] = useState<DocumentoPratica[]>([])
  const [azioni, setAzioni] = useState<AzioneAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documenti' | 'todo' | 'azioni' | 'invia'>('overview')
  const [operazioneInCorso, setOperazioneInCorso] = useState<string | null>(null)
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)

  const caricaDati = useCallback(async () => {
    setLoading(true)
    const { data: praticaData } = await supabase.from('pratiche').select('*').eq('id', params.id).single()
    setPratica(praticaData)

    if (praticaData) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', praticaData.user_id).single()
      setProfile(profileData)
    }

    const { data: todosData } = await supabase.from('todo_admin').select('*').eq('pratica_id', params.id).order('creato_il', { ascending: false })
    setTodos(todosData || [])

    const { data: docData } = await supabase.from('documenti_pratica').select('*').eq('pratica_id', params.id)
    setDocumenti(docData || [])

    const { data: azioniData } = await supabase.from('azioni_admin').select('*').eq('pratica_id', params.id).order('created_at', { ascending: false })
    setAzioni(azioniData || [])

    setLoading(false)
  }, [params.id, supabase])

  useEffect(() => { caricaDati() }, [caricaDati])

  // ─── Azioni API ───────────────────────────────────────────────────────

  const richiediCasellario = async () => {
    if (!profile || !pratica) return
    setOperazioneInCorso('casellario')
    try {
      const res = await fetch('/api/enti/casellario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pratica_id: pratica.id,
          codice_fiscale: profile.codice_fiscale,
          nome: profile.full_name.split(' ')[0],
          cognome: profile.full_name.split(' ').slice(1).join(' '),
          data_nascita: profile.data_nascita,
          luogo_nascita: profile.luogo_nascita,
          tipo: 'entrambi',
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.messaggio || 'Casellario richiesto con successo')
        caricaDati()
      } else {
        alert('Errore: ' + (data.error || 'Sconosciuto'))
      }
    } finally {
      setOperazioneInCorso(null)
    }
  }

  const richiediINPS = async (tipo: string) => {
    if (!profile || !pratica) return
    setOperazioneInCorso(`inps_${tipo}`)
    try {
      const res = await fetch('/api/enti/inps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pratica_id: pratica.id, codice_fiscale: profile.codice_fiscale, tipo })
      })
      const data = await res.json()
      alert(data.messaggio || (data.success ? 'OK' : 'Errore'))
      caricaDati()
    } finally {
      setOperazioneInCorso(null)
    }
  }

  const inviaComunica = async () => {
    if (!profile || !pratica) return
    const dati = pratica.dati_wizard
    setOperazioneInCorso('comunica')
    try {
      const res = await fetch('/api/enti/comunica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pratica_id: pratica.id,
          tipo: dati.tipo_pratiche || 'apertura_ditta_individuale',
          dati_impresa: {
            tipo_impresa: dati.tipo_impresa || 'ditta_individuale',
            codice_fiscale_titolare: profile.codice_fiscale,
            nome: profile.full_name.split(' ')[0],
            cognome: profile.full_name.split(' ').slice(1).join(' '),
            data_nascita: profile.data_nascita,
            luogo_nascita: profile.luogo_nascita,
            residenza: { via: '', civico: '', comune: '', cap: '', provincia: '' },
            sede_impresa: {
              via: dati.via_sede || '',
              civico: dati.civico_sede || '',
              comune: dati.comune_sede || '',
              cap: dati.cap_sede || '',
              provincia: dati.provincia_sede || '',
              codice_comune: dati.codice_comune || '',
            },
            codice_ateco: dati.codice_ateco || '',
            descrizione_attivita: dati.attivita || '',
            regime_fiscale: dati.regime_fiscale || 'forfettario',
            data_inizio: dati.data_inizio || new Date().toISOString().split('T')[0],
          }
        })
      })
      const result = await res.json()
      alert(result.messaggio || (result.success ? 'ComUnica inviata' : 'Errore'))
      caricaDati()
    } finally {
      setOperazioneInCorso(null)
    }
  }

  const inviaSCIA = async () => {
    if (!profile || !pratica) return
    const dati = pratica.dati_wizard
    setOperazioneInCorso('suap')
    try {
      const res = await fetch('/api/enti/suap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pratica_id: pratica.id,
          tipo_scia: dati.tipo_scia || dati.attivita_id,
          dati_impresa: { codice_fiscale: profile.codice_fiscale, ...dati },
          comune_codice: dati.codice_comune,
        })
      })
      const result = await res.json()
      alert(result.messaggio || (result.success ? 'SCIA inviata' : 'Errore'))
      caricaDati()
    } finally {
      setOperazioneInCorso(null)
    }
  }

  const inviaRinvioFirmaProcura = async () => {
    if (!profile || !pratica) return
    setOperazioneInCorso('procura_reminder')
    try {
      const res = await fetch('/api/procura/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pratica_id: pratica.id, email: profile.email, nome: profile.full_name })
      })
      const result = await res.json()
      alert(result.messaggio || 'Reminder inviato')
    } finally {
      setOperazioneInCorso(null)
    }
  }

  const marcaTodoCompletato = async (todo_id: string) => {
    await supabase.from('todo_admin').update({
      completato: true,
      completato_il: new Date().toISOString(),
    }).eq('id', todo_id)
    caricaDati()
  }

  const cambiaStato = async (nuovo_stato: string) => {
    await supabase.from('pratiche').update({ stato: nuovo_stato }).eq('id', params.id)
    await supabase.from('azioni_admin').insert({
      pratica_id: params.id,
      tipo: 'cambio_stato',
      dettaglio: `Stato cambiato in: ${nuovo_stato}`,
    })
    caricaDati()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Caricamento pratica...</p>
      </div>
    </div>
  )

  if (!pratica) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500">Pratica non trovata</p>
    </div>
  )

  const todosAperti = todos.filter(t => !t.completato)
  const todosCompletati = todos.filter(t => t.completato)
  const procuraOK = pratica.procura_firmata

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <a href="/admin" className="text-blue-600 hover:underline text-sm">← Tutte le pratiche</a>
              <h1 className="text-xl font-bold text-gray-900 mt-1">
                {pratica.tipo_pratica?.replace(/_/g, ' ')}
              </h1>
              <p className="text-sm text-gray-500">{profile?.full_name} — {profile?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Badge stato */}
              <StatoBadge stato={pratica.stato} />
              {/* Procura */}
              {procuraOK ? (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">✅ Procura firmata</span>
              ) : (
                <button onClick={inviaRinvioFirmaProcura} disabled={!!operazioneInCorso} className="bg-orange-100 text-orange-700 border border-orange-300 px-3 py-1 rounded-full text-xs font-medium hover:bg-orange-200 transition">
                  ⚠️ Procura non firmata — Invia reminder
                </button>
              )}
              {/* Cambio stato rapido */}
              <select onChange={e => cambiaStato(e.target.value)} value={pratica.stato} className="text-sm border border-gray-300 rounded-lg px-2 py-1">
                {['ricevuta', 'in_revisione', 'documenti_mancanti', 'approvata', 'in_lavorazione', 'inviata_cciaa', 'inviata_suap', 'completata', 'rifiutata'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-gray-200">
            {([
              { id: 'overview', label: 'Overview' },
              { id: 'todo', label: `Todo ${todosAperti.length > 0 ? `(${todosAperti.length})` : ''}`, urgent: todosAperti.some(t => t.priorita === 'altissima') },
              { id: 'documenti', label: `Documenti (${documenti.length})` },
              { id: 'invia', label: '🚀 Invia agli enti' },
              { id: 'azioni', label: `Log (${azioni.length})` },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t transition relative ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {'urgent' in tab && tab.urgent && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        {/* ─── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Dati Cliente</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Nome', profile?.full_name],
                  ['Email', profile?.email],
                  ['Telefono', profile?.telefono || '—'],
                  ['Codice Fiscale', profile?.codice_fiscale || '—'],
                  ['Data nascita', profile?.data_nascita || '—'],
                  ['Luogo nascita', profile?.luogo_nascita || '—'],
                  ['Residenza', profile?.residenza || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-gray-900 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Dati Pratica</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['ID', pratica.id.substring(0, 8) + '...'],
                  ['Tipo', pratica.tipo_pratica],
                  ['Stato', pratica.stato],
                  ['Creata il', new Date(pratica.created_at).toLocaleDateString('it-IT')],
                  ['N. CCIAA', pratica.numero_pratica_cciaa || '—'],
                  ['N. SUAP', pratica.numero_pratica_suap || '—'],
                  ['Procura', pratica.procura_firmata ? '✅ Firmata' : '❌ Non firmata'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-gray-900 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {/* Dati wizard */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Dati inseriti nel Wizard</h3>
              <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-64">
                <pre className="text-xs text-gray-700">{JSON.stringify(pratica.dati_wizard, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ─── TODO LIST ─────────────────────────────────────────────────── */}
        {activeTab === 'todo' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Todo — {todosAperti.length} aperte, {todosCompletati.length} completate
              </h2>
            </div>

            {todosAperti.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <p className="text-green-700 font-medium">✅ Nessuna todo aperta — pratica in ordine!</p>
              </div>
            )}

            {/* Todos aperte */}
            {todosAperti.map(todo => (
              <div key={todo.id} className={`border-l-4 rounded-xl p-5 ${PRIORITA_COLORS[todo.priorita]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITA_BADGE[todo.priorita]}`}>
                        {todo.priorita.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">{todo.tipo.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(todo.creato_il).toLocaleDateString('it-IT')}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{todo.descrizione}</p>
                    
                    {/* Istruzioni espandibili */}
                    <button
                      onClick={() => setExpandedTodo(expandedTodo === todo.id ? null : todo.id)}
                      className="text-sm text-blue-600 hover:underline mt-2"
                    >
                      {expandedTodo === todo.id ? '▲ Nascondi istruzioni' : '▼ Mostra istruzioni dettagliate'}
                    </button>
                    
                    {expandedTodo === todo.id && (
                      <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{todo.istruzioni}</pre>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => marcaTodoCompletato(todo.id)}
                    className="shrink-0 bg-white border border-current rounded-lg px-4 py-2 text-sm font-medium hover:bg-opacity-80 transition"
                  >
                    ✓ Fatto
                  </button>
                </div>
              </div>
            ))}

            {/* Todos completate (compresse) */}
            {todosCompletati.length > 0 && (
              <details className="mt-6">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  {todosCompletati.length} todo completate (clicca per espandere)
                </summary>
                <div className="mt-3 space-y-2">
                  {todosCompletati.map(todo => (
                    <div key={todo.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-60">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 line-through">{todo.descrizione}</p>
                        <span className="text-xs text-gray-400">
                          ✅ {todo.completato_il ? new Date(todo.completato_il).toLocaleDateString('it-IT') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ─── DOCUMENTI ─────────────────────────────────────────────────── */}
        {activeTab === 'documenti' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Documenti ({documenti.length})</h2>
            {documenti.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
                Nessun documento ancora caricato per questa pratica
              </div>
            )}
            {documenti.map(doc => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{doc.tipo.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-500">{doc.nome_file}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      doc.stato === 'presente' ? 'bg-green-100 text-green-700' :
                      doc.stato === 'in_elaborazione' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>{doc.stato}</span>
                    <span className="text-xs text-gray-400">
                      {doc.recuperato_da === 'zipra_api' ? '🤖 Auto-recuperato' :
                       doc.recuperato_da === 'utente' ? '👤 Caricato dal cliente' :
                       doc.recuperato_da === 'zipra_genera' ? '📝 Generato da Zipra' : '🖐 Manuale'}
                    </span>
                    {doc.data_recupero && <span className="text-xs text-gray-400">{new Date(doc.data_recupero).toLocaleDateString('it-IT')}</span>}
                  </div>
                </div>
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                    Visualizza →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── INVIA AGLI ENTI ───────────────────────────────────────────── */}
        {activeTab === 'invia' && (
          <div className="space-y-6">
            {!procuraOK && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800 font-medium">⛔ Procura speciale non firmata</p>
                <p className="text-red-600 text-sm mt-1">Il cliente deve firmare la procura prima che Zipra possa agire per suo conto.</p>
                <button onClick={inviaRinvioFirmaProcura} disabled={!!operazioneInCorso} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                  {operazioneInCorso === 'procura_reminder' ? '...' : '📧 Invia reminder firma procura'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              
              {/* ComUnica */}
              <div className={`bg-white border rounded-xl p-5 ${!procuraOK ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl">🏛️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">ComUnica (Telemaco)</h3>
                    <p className="text-xs text-gray-500">P.IVA + CCIAA + INPS + INAIL in un colpo</p>
                  </div>
                  {pratica.numero_pratica_cciaa && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Inviata</span>}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Invia la comunicazione unica di apertura impresa al Registro Imprese.
                  Include apertura P.IVA e iscrizione INPS automaticamente.
                </p>
                <button
                  onClick={inviaComunica}
                  disabled={!!operazioneInCorso || !!pratica.numero_pratica_cciaa}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {operazioneInCorso === 'comunica' ? '⏳ Invio...' : pratica.numero_pratica_cciaa ? '✅ Già inviata' : '🚀 Invia ComUnica'}
                </button>
              </div>

              {/* SCIA SUAP */}
              <div className={`bg-white border rounded-xl p-5 ${!procuraOK ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xl">📋</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">SCIA SUAP</h3>
                    <p className="text-xs text-gray-500">impresainungiorno.gov.it</p>
                  </div>
                  {pratica.numero_pratica_suap && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Inviata</span>}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Invia la SCIA al Comune per avvio attività.
                  Necessaria per attività regolamentate con locale fisico.
                </p>
                <button
                  onClick={inviaSCIA}
                  disabled={!!operazioneInCorso || !!pratica.numero_pratica_suap}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {operazioneInCorso === 'suap' ? '⏳ Invio...' : pratica.numero_pratica_suap ? '✅ Già inviata' : '🚀 Invia SCIA SUAP'}
                </button>
              </div>

              {/* Casellario */}
              <div className={`bg-white border rounded-xl p-5 ${!procuraOK ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xl">⚖️</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Casellario Giudiziale</h3>
                    <p className="text-xs text-gray-500">Ministero della Giustizia</p>
                  </div>
                  {documenti.find(d => d.tipo === 'casellario_giudiziale') && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Presente</span>}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Richiede automaticamente il certificato penale + carichi pendenti.
                  Richiesto per: taxi, NCC, vigilanza, mediatori.
                </p>
                <button
                  onClick={richiediCasellario}
                  disabled={!!operazioneInCorso || !!documenti.find(d => d.tipo === 'casellario_giudiziale')}
                  className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                >
                  {operazioneInCorso === 'casellario' ? '⏳ Richiesta...' : documenti.find(d => d.tipo === 'casellario_giudiziale') ? '✅ Già presente' : '📄 Richiedi Casellario'}
                </button>
              </div>

              {/* INPS */}
              <div className={`bg-white border rounded-xl p-5 ${!procuraOK ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl">🏦</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">INPS</h3>
                    <p className="text-xs text-gray-500">Estratto contributivo + posizione</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Recupera l'estratto contributivo per documentare l'esperienza lavorativa
                  o verifica la posizione previdenziale attuale.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['estratto_contributivo', 'iscrizione_gestione'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => richiediINPS(tipo)}
                      disabled={!!operazioneInCorso}
                      className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                    >
                      {operazioneInCorso === `inps_${tipo}` ? '⏳' : tipo.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Enti non automatizzabili — solo guida */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h3 className="font-semibold text-yellow-900 mb-3">⚠️ Enti da gestire manualmente (todo in coda)</h3>
              <p className="text-sm text-yellow-800 mb-3">
                I seguenti enti non hanno API pubbliche disponibili o richiedono accreditamento futuro.
                Le relative azioni sono già state aggiunte automaticamente alla Todo list quando pertinenti.
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { ente: 'ASL', cosa: 'Notifica sanitaria / Autorizzazione', quando: 'Bar, ristoranti, macellerie, studi medici' },
                  { ente: 'Prefettura', cosa: 'Licenza prefettizia', quando: 'Vigilanza privata, investigatori' },
                  { ente: 'Regione', cosa: 'Autorizzazione attività turistica', quando: 'Agenzie viaggi, guide turistiche' },
                  { ente: 'MIT / Motorizzazione', cosa: 'Verifica patente e abilitazioni', quando: 'Taxi, NCC, autoscuole' },
                  { ente: 'Ordini professionali', cosa: 'Verifica iscrizione albo', quando: 'Medici, avvocati, commercialisti' },
                  { ente: 'ADM (Dogane)', cosa: 'Bandi tabaccherie', quando: 'Tabaccherie' },
                ].map(item => (
                  <div key={item.ente} className="bg-white rounded-lg p-3 border border-yellow-200">
                    <p className="font-semibold text-gray-900">{item.ente}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.cosa}</p>
                    <p className="text-xs text-yellow-700 mt-1 italic">{item.quando}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── LOG AZIONI ────────────────────────────────────────────────── */}
        {activeTab === 'azioni' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Log azioni ({azioni.length})</h2>
            {azioni.length === 0 && <p className="text-gray-500 text-sm">Nessuna azione registrata</p>}
            {azioni.map(azione => (
              <div key={azione.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{azione.tipo.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{new Date(azione.created_at).toLocaleString('it-IT')}</span>
                </div>
                <p className="text-sm text-gray-700">{azione.dettaglio}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    ricevuta: 'bg-blue-100 text-blue-700',
    in_revisione: 'bg-yellow-100 text-yellow-700',
    documenti_mancanti: 'bg-orange-100 text-orange-700',
    approvata: 'bg-green-100 text-green-700',
    in_lavorazione: 'bg-purple-100 text-purple-700',
    inviata_cciaa: 'bg-teal-100 text-teal-700',
    inviata_suap: 'bg-cyan-100 text-cyan-700',
    completata: 'bg-emerald-100 text-emerald-700',
    rifiutata: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[stato] || 'bg-gray-100 text-gray-600'}`}>
      {stato.replace(/_/g, ' ')}
    </span>
  )
}