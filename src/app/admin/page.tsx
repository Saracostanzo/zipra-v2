'use client'

// PATH: src/app/admin/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

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

interface Pratica {
  id: string
  user_id: string
  tipo_attivita: string
  stato: string
  procura_firmata: boolean
  procura_url?: string
  dati_wizard: Record<string, any>
  created_at: string
}

interface Profile {
  id: string
  email: string
  nome: string
  cognome: string
  codice_fiscale?: string
  data_nascita?: string
  luogo_nascita?: string
  indirizzo?: string
  telefono?: string
}

const PRIORITA_COLORS = {
  altissima: 'bg-red-100 border-red-400 text-red-800',
  alta: 'bg-orange-100 border-orange-400 text-orange-800',
  media: 'bg-yellow-100 border-yellow-400 text-yellow-800',
  bassa: 'bg-gray-100 border-gray-300 text-gray-700',
}

export default function AdminPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [todos, setTodos] = useState<TodoAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pratiche' | 'todo'>('pratiche')
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)

  const caricaDati = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    const [{ data: prat }, { data: tod }] = await Promise.all([
      supabase.from('pratiche')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('todo_admin')
        .select('*')
        .eq('completato', false)
        .order('priorita', { ascending: true })
        .limit(50),
    ])

    setPratiche(prat ?? [])
    setTodos(tod ?? [])

    // Carica profili utenti
    if (prat && prat.length > 0) {
      const userIds = [...new Set(prat.map((p: any) => p.user_id))]
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, nome, cognome, codice_fiscale, telefono')
        .in('id', userIds)
      if (profs) {
        const map: Record<string, Profile> = {}
        profs.forEach((p: any) => { map[p.id] = p })
        setProfiles(map)
      }
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => { caricaDati() }, [caricaDati])

  const marcaTodoCompletato = async (id: string) => {
    await supabase.from('todo_admin').update({
      completato: true,
      completato_il: new Date().toISOString(),
    }).eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-z-green/30 border-t-z-green rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-z-darker">
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
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

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/8">
          {(['pratiche', 'todo'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-6 py-2.5 text-sm font-medium capitalize transition-all ${activeTab === t
                ? 'text-z-green border-b-2 border-z-green'
                : 'text-z-muted/50 hover:text-z-muted'}`}>
              {t}
              {t === 'todo' && todos.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {todos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pratiche */}
        {activeTab === 'pratiche' && (
          <div className="space-y-3">
            {pratiche.length === 0 && (
              <div className="text-center text-z-muted py-12">Nessuna pratica ancora</div>
            )}
            {pratiche.map(p => {
              const prof = profiles[p.user_id]
              return (
                <div key={p.id}
                  onClick={() => router.push(`/admin/pratiche/${p.id}`)}
                  className="bg-z-mid border border-white/8 p-4 cursor-pointer hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 font-mono ${
                      p.stato === 'bozza' ? 'bg-gray-400/10 text-gray-400' :
                      p.stato === 'completata' ? 'bg-green-400/10 text-green-400' :
                      'bg-yellow-400/10 text-yellow-400'
                    }`}>{p.stato}</span>
                    <span className="text-xs text-z-muted/40 font-mono">
                      {new Date(p.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="font-bold text-z-light text-sm mb-1">{p.tipo_attivita}</div>
                  {prof && (
                    <div className="text-xs text-z-muted/60">
                      {prof.nome} {prof.cognome} · {prof.email}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Todo */}
        {activeTab === 'todo' && (
          <div className="space-y-3">
            {todos.length === 0 && (
              <div className="text-center text-z-muted py-12">Nessun todo in sospeso</div>
            )}
            {todos.map(todo => (
              <div key={todo.id}
                className={`border rounded-xl p-4 ${PRIORITA_COLORS[todo.priorita] || 'bg-gray-100 border-gray-300'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">{todo.descrizione}</div>
                    <div className="text-xs opacity-70">
                      {new Date(todo.creato_il || '').toLocaleDateString('it-IT')}
                    </div>
                    <button
                      onClick={() => setExpandedTodo(expandedTodo === todo.id ? null : todo.id)}
                      className="text-xs underline mt-2 opacity-70 hover:opacity-100">
                      {expandedTodo === todo.id ? 'Nascondi istruzioni' : 'Mostra istruzioni'}
                    </button>
                    {expandedTodo === todo.id && (
                      <div className="mt-3 bg-white/80 rounded-lg p-3 border">
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {typeof todo.istruzioni === 'string'
                            ? todo.istruzioni
                            : JSON.stringify(todo.istruzioni, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => marcaTodoCompletato(todo.id)}
                    className="shrink-0 bg-white border border-current rounded-lg px-4 py-2 text-sm font-medium hover:opacity-80 transition">
                    Fatto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}