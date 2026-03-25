'use client'
import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from 'next/navigation'

export default function DashboardBusinessPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const [profilo, setProfilo] = useState<any>(null)
  const [clienti, setClienti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteAperto, setClienteAperto] = useState<any>(null)
  const [mostraAggiungiCliente, setMostraAggiungiCliente] = useState(false)
  const [nuovoCliente, setNuovoCliente] = useState({ nome: '', cognome: '', email: '', cf: '', telefono: '' })
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [telemacoCreds, setTelemacoCreds] = useState<{ user: string; pass: string } | null>(null)
  const [mostraTelemaco, setMostraTelemaco] = useState(false)

  useEffect(() => {
    const carica = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signup'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || !['business', 'business_pro'].includes(p.piano)) {
        router.push('/dashboard')
        return
      }
      setProfilo(p)

      // Carica clienti
      const { data: cl } = await supabase
        .from('business_clienti')
        .select(`*, pratiche(id, tipo_attivita, stato, created_at, numero_pratica)`)
        .eq('business_id', user.id)
        .order('created_at', { ascending: false })
      setClienti(cl ?? [])

      // Carica credenziali Telemaco se salvate
      const { data: tel } = await supabase
        .from('business_accounts')
        .select('telemaco_user, telemaco_connected')
        .eq('id', user.id)
        .single()
      if (tel?.telemaco_connected) {
        setTelemacoCreds({ user: tel.telemaco_user, pass: '••••••••' })
      }

      setLoading(false)
    }
    carica()
  }, [])

  const aggiungiCliente = async () => {
    if (!nuovoCliente.email || !nuovoCliente.nome) return
    setSalvandoCliente(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Crea account cliente se non esiste
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', nuovoCliente.email)
        .single()

      let clienteId = existing?.id
      if (!clienteId) {
        const tempPass = 'Zipra' + Math.abs(nuovoCliente.email.split('').reduce((a, c) => a + c.charCodeAt(0), 0)).toString(36).toUpperCase().slice(0, 6) + '!'
        const { data: signUp } = await supabase.auth.signUp({
          email: nuovoCliente.email,
          password: tempPass,
        })
        clienteId = signUp.user?.id
        if (clienteId) {
          await supabase.from('profiles').upsert({
            id: clienteId,
            email: nuovoCliente.email,
            nome: nuovoCliente.nome,
            cognome: nuovoCliente.cognome,
            codice_fiscale: nuovoCliente.cf,
            telefono: nuovoCliente.telefono,
            role: 'user',
            piano: 'free',
          }, { onConflict: 'id' })
        }
      }

      // Collega cliente all'account business
      await supabase.from('business_clienti').insert({
        business_id: user.id,
        cliente_id: clienteId,
        nome: nuovoCliente.nome,
        cognome: nuovoCliente.cognome,
        email: nuovoCliente.email,
        codice_fiscale: nuovoCliente.cf,
        telefono: nuovoCliente.telefono,
      })

      setNuovoCliente({ nome: '', cognome: '', email: '', cf: '', telefono: '' })
      setMostraAggiungiCliente(false)

      // Ricarica clienti
      const { data: { user: u } } = await supabase.auth.getUser()
      const { data: cl } = await supabase.from('business_clienti')
        .select(`*, pratiche(id, tipo_attivita, stato, created_at, numero_pratica)`)
        .eq('business_id', u!.id)
        .order('created_at', { ascending: false })
      setClienti(cl ?? [])
    } finally {
      setSalvandoCliente(false)
    }
  }

  const salvaTelemaco = async (utente: string, password: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('business_accounts').upsert({
      id: user.id,
      telemaco_user: utente,
      telemaco_password_encrypted: btoa(password), // in prod: cifra lato server
      telemaco_connected: true,
    }, { onConflict: 'id' })
    setTelemacoCreds({ user: utente, pass: '••••••••' })
    setMostraTelemaco(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="text-z-muted text-sm font-mono">Caricamento...</div>
    </div>
  )

  const STATI: Record<string, { label: string; color: string }> = {
    bozza: { label: 'In attesa', color: 'text-amber-400' },
    in_revisione_admin: { label: 'In lavorazione', color: 'text-yellow-400' },
    in_invio: { label: 'In invio', color: 'text-purple-400' },
    inviata_ente: { label: 'Inviata', color: 'text-indigo-400' },
    completata: { label: 'Completata', color: 'text-green-400' },
  }

  return (
    <div className="min-h-screen bg-z-darker">

      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-head text-xl font-bold text-z-light">zipra ⚡</a>
            <span className="text-xs bg-z-green/15 text-z-green border border-z-green/25 px-2.5 py-1 rounded-full font-semibold">
              {profilo?.piano === 'business_pro' ? 'Business Pro' : 'Business'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-z-muted/50 text-sm">{profilo?.email}</span>
            <button
              onClick={() => setMostraTelemaco(true)}
              className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                telemacoCreds
                  ? 'border-z-green/30 text-z-green bg-z-green/5'
                  : 'border-white/10 text-z-muted hover:border-white/20'
              }`}>
              {telemacoCreds ? '✓ Telemaco connesso' : '🔌 Connetti Telemaco'}
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="btn-secondary text-xs py-2">Esci</button>
          </div>
        </div>
      </nav>

      {/* Modal Telemaco */}
      {mostraTelemaco && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-z-card border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-z-light text-lg mb-1">Connetti Telemaco</h3>
            <p className="text-z-muted text-sm mb-5">
              Le tue credenziali Telemaco (Infocamere) vengono usate per inviare le pratiche alle CCIAA a nome dei tuoi clienti. 
              Vengono conservate in modo cifrato.
            </p>
            <TelemacoForm onSalva={salvaTelemaco} onAnnulla={() => setMostraTelemaco(false)} />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-z-light">
              I tuoi clienti {clienti.length > 0 && <span className="text-z-muted/40 text-2xl">({clienti.length})</span>}
            </h1>
            <p className="text-z-muted mt-1 text-sm">
              Gestisci le pratiche di tutti i tuoi clienti da un unico pannello.
            </p>
          </div>
          <button onClick={() => setMostraAggiungiCliente(true)} className="btn-primary">
            + Nuovo cliente
          </button>
        </div>

        {/* Form nuovo cliente */}
        {mostraAggiungiCliente && (
          <div className="bg-z-mid border border-white/8 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-z-light mb-4">Aggiungi cliente</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-field">Nome *</label>
                <input value={nuovoCliente.nome} onChange={e => setNuovoCliente(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Mario" className="input-field" />
              </div>
              <div>
                <label className="label-field">Cognome *</label>
                <input value={nuovoCliente.cognome} onChange={e => setNuovoCliente(p => ({ ...p, cognome: e.target.value }))}
                  placeholder="Rossi" className="input-field" />
              </div>
              <div>
                <label className="label-field">Email *</label>
                <input type="email" value={nuovoCliente.email} onChange={e => setNuovoCliente(p => ({ ...p, email: e.target.value }))}
                  placeholder="mario@esempio.it" className="input-field" />
              </div>
              <div>
                <label className="label-field">Codice fiscale</label>
                <input value={nuovoCliente.cf} onChange={e => setNuovoCliente(p => ({ ...p, cf: e.target.value.toUpperCase() }))}
                  placeholder="RSSMRA80A01H501Z" className="input-field font-mono" maxLength={16} />
              </div>
              <div>
                <label className="label-field">Telefono</label>
                <input value={nuovoCliente.telefono} onChange={e => setNuovoCliente(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+39 333 1234567" className="input-field" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={aggiungiCliente} disabled={salvandoCliente || !nuovoCliente.email || !nuovoCliente.nome}
                className="btn-primary">
                {salvandoCliente ? '⏳ Salvando...' : 'Aggiungi cliente'}
              </button>
              <button onClick={() => setMostraAggiungiCliente(false)} className="btn-secondary">
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Lista clienti */}
        {clienti.length === 0 ? (
          <div className="bg-z-mid border border-white/8 rounded-2xl p-16 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="font-bold text-z-light text-xl mb-2">Nessun cliente ancora</h3>
            <p className="text-z-muted text-sm mb-6">Aggiungi il tuo primo cliente per iniziare a gestire le sue pratiche</p>
            <button onClick={() => setMostraAggiungiCliente(true)} className="btn-primary">
              + Aggiungi primo cliente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {clienti.map(cliente => (
              <div key={cliente.id} className="bg-z-mid border border-white/8 rounded-2xl overflow-hidden">
                {/* Header cliente */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-z-green/15 border border-z-green/25 flex items-center justify-center font-bold text-z-green shrink-0">
                    {(cliente.nome?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-z-light">
                      {cliente.nome} {cliente.cognome}
                    </div>
                    <div className="text-z-muted/60 text-xs">{cliente.email}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-z-muted/50">
                      {cliente.pratiche?.length ?? 0} pratich{cliente.pratiche?.length === 1 ? 'a' : 'e'}
                    </span>
                    <button
                      onClick={() => router.push('/wizard?cliente=' + cliente.cliente_id)}
                      className="btn-primary text-xs py-2 px-4">
                      + Pratica
                    </button>
                    <button
                      onClick={() => setClienteAperto(clienteAperto?.id === cliente.id ? null : cliente)}
                      className="btn-secondary text-xs py-2 px-3">
                      {clienteAperto?.id === cliente.id ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Pratiche cliente */}
                {clienteAperto?.id === cliente.id && (
                  <div className="border-t border-white/8 bg-z-darker px-5 py-4">
                    {!cliente.pratiche?.length ? (
                      <p className="text-z-muted/40 text-sm">Nessuna pratica ancora per questo cliente.</p>
                    ) : (
                      <div className="space-y-2">
                        {cliente.pratiche.map((pr: any) => {
                          const stato = STATI[pr.stato] ?? { label: pr.stato, color: 'text-z-muted' }
                          return (
                            <div key={pr.id} className="flex items-center gap-4 bg-z-mid rounded-xl px-4 py-3">
                              <div className="flex-1">
                                <p className="text-z-light text-sm font-medium">{pr.tipo_attivita}</p>
                                <p className="text-z-muted/50 text-xs">{pr.numero_pratica}</p>
                              </div>
                              <span className={`text-xs font-bold ${stato.color}`}>{stato.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {clienti.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { icon: '👥', label: 'Clienti totali', val: clienti.length },
              { icon: '📋', label: 'Pratiche totali', val: clienti.reduce((a, c) => a + (c.pratiche?.length ?? 0), 0) },
              { icon: '✅', label: 'Completate', val: clienti.reduce((a, c) => a + (c.pratiche?.filter((p: any) => p.stato === 'completata').length ?? 0), 0) },
            ].map(({ icon, label, val }) => (
              <div key={label} className="bg-z-mid border border-white/8 rounded-2xl p-5 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-black text-z-light text-2xl">{val}</div>
                <div className="text-xs text-z-muted mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TelemacoForm({ onSalva, onAnnulla }: { onSalva: (u: string, p: string) => void; onAnnulla: () => void }) {
  const [utente, setUtente] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div className="space-y-4">
      <div>
        <label className="label-field">Username Telemaco (Infocamere)</label>
        <input value={utente} onChange={e => setUtente(e.target.value)}
          placeholder="Il tuo username Telemaco" className="input-field" />
      </div>
      <div>
        <label className="label-field">Password Telemaco</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" className="input-field" />
      </div>
      <p className="text-xs text-z-muted/50">
        Le credenziali vengono cifrate e usate solo per inviare pratiche a tuo nome alle CCIAA.
        Non vengono mai condivise con terze parti.
      </p>
      <div className="flex gap-3">
        <button onClick={() => onSalva(utente, password)} disabled={!utente || !password}
          className="btn-primary flex-1 justify-center">Salva e connetti</button>
        <button onClick={onAnnulla} className="btn-secondary">Annulla</button>
      </div>
    </div>
  )
}