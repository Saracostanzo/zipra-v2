'use client'
import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from 'next/navigation'
import { CATALOGO } from '@/lib/catalogo'

const STATI = [
  { id: 'bozza',              label: 'In attesa pagamento', icon: '💳', color: 'text-amber-400' },
  { id: 'in_revisione_admin', label: 'In revisione',        icon: '🔍', color: 'text-yellow-400' },
  { id: 'inviata_utente',     label: 'Piano pronto',        icon: '📋', color: 'text-blue-400' },
  { id: 'approvata_utente',   label: 'Approvata',           icon: '✅', color: 'text-cyan-400' },
  { id: 'in_invio',           label: 'In invio agli enti',  icon: '📤', color: 'text-purple-400' },
  { id: 'inviata_ente',       label: 'Inviata',             icon: '🏛️', color: 'text-indigo-400' },
  { id: 'completata',         label: 'Completata',          icon: '🎉', color: 'text-green-400' },
  { id: 'respinta_ente',      label: 'In correzione',       icon: '🔄', color: 'text-orange-400' },
]

// ─── Pannello upsell Mantenimento — per pratiche successive all'abbonamento ──
function PannelloMantenimento({ pianoAttivo }: { pianoAttivo: boolean }) {
  if (pianoAttivo) return null
  return (
    <div className="border-t border-white/8 bg-z-darker px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-z-light font-bold text-sm">🗄️ Vuoi conservare i documenti di questa pratica?</p>
          <p className="text-z-muted/60 text-xs mt-1">
            Aggiungi il <strong className="text-z-green">Mantenimento a €29/mese</strong> — archivio documenti,
            notifiche scadenze automatiche e sconto 20% su tutte le pratiche future.
          </p>
        </div>
        <a href="/prezzi" className="btn-secondary text-xs py-2 px-4 shrink-0 whitespace-nowrap">
          Scopri →
        </a>
      </div>
    </div>
  )
}

// ─── Pratiche correlate — sempre visibili, con stato abbonamento ─────────────
function PraticheCorrrelate({ pratica, pianoAttivo }: { pratica: any, pianoAttivo: boolean }) {
  const router = useRouter()

  const praticheSuggerite = CATALOGO.filter(p => {
    if (p.id === 'apertura_ditta' || p.id === 'apertura_srl') return false
    const correlate = [
      'variazione_sede', 'variazione_ateco', 'variazione_pec',
      'suap_modifica', 'deposito_bilancio', 'diritto_annuale',
      'rinnovo_sanitario', 'cessazione_ditta',
    ]
    return correlate.includes(p.id)
  }).slice(0, 4)

  if (praticheSuggerite.length === 0) return null

  return (
    <div className="border-t border-white/8 bg-z-darker px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono text-z-muted/50 uppercase tracking-wider">
          ⚡ Pratiche incluse nel piano
        </p>
        {!pianoAttivo && (
          <a href="/prezzi" className="text-xs text-z-green underline">
            Attiva abbonamento →
          </a>
        )}
      </div>

      {!pianoAttivo && (
        <div className="bg-z-green/5 border border-z-green/15 rounded-xl px-4 py-3 mb-3">
          <p className="text-z-muted text-xs">
            🔒 Con il piano Base a <strong className="text-z-green">€149/anno</strong> tutte queste pratiche sono incluse — paghi solo i diritti agli enti.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {praticheSuggerite.map(p => (
          <button
            key={p.id}
            onClick={() => pianoAttivo ? router.push('/wizard?pratica=' + p.id) : router.push('/prezzi')}
            className={`flex items-center justify-between gap-2 border rounded-xl px-4 py-3 text-left transition-all group ${
              pianoAttivo
                ? 'bg-z-mid hover:bg-z-card border-white/8 hover:border-z-green/30'
                : 'bg-z-mid/50 border-white/5 opacity-70'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-z-light text-sm font-medium truncate">{p.titolo}</p>
              <p className="text-z-muted/50 text-xs mt-0.5">
                {pianoAttivo
                  ? (p.dirittiEnti > 0 ? `Solo €${p.dirittiEnti} diritti enti` : 'Completamente gratis')
                  : `€${p.prezzoZipra} + €${p.dirittiEnti} enti`
                }
              </p>
            </div>
            <span className={`text-lg shrink-0 transition-colors ${pianoAttivo ? 'text-z-green/50 group-hover:text-z-green' : 'text-z-muted/30'}`}>
              {pianoAttivo ? '→' : '🔒'}
            </span>
          </button>
        ))}
      </div>

      {pianoAttivo && (
        <p className="text-xs text-z-muted/30 mt-3">
          Tutte le pratiche di variazione e modifica sono incluse — paghi solo i diritti agli enti.
        </p>
      )}
    </div>
  )
}

// ─── Pannello dettaglio pratica con upload documenti ─────────────────────────
function PannelloDettaglioPratica({
  pratica,
  analisi,
  onDocumentUploaded,
  isPrimaPratica = false,
}: {
  pratica: any
  analisi: any
  onDocumentUploaded: () => void
  isPrimaPratica?: boolean
}) {
  const supabase = createBrowserSupabaseClient()
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadOk, setUploadOk] = useState<Set<string>>(new Set())

  // Documenti che deve caricare l'utente (fonte utente, non zipra)
  const docDaCaricare: { id: string; nome: string }[] = analisi?.documenti_mancanti ?? []

  // Documenti che gestisce Zipra — dinamici basati sull'analisi AI
  const docZipra = (() => {
    const base = [
      { nome: 'PEC aziendale', desc: 'Zipra la attiva e registra per te' },
      { nome: 'SCIA / ComUnica', desc: 'Zipra compila e invia agli enti' },
      { nome: 'Moduli CCIAA', desc: 'Zipra li predispone e invia' },
    ]
    // Casellario solo per attività che lo richiedono per legge
    const attivitaConCasellario = [
      'taxi', 'ncc', 'autista', 'mediatore', 'agente', 'vigilanza',
      'impiantista', 'elettricista', 'autoriparatore', 'meccanico',
      'estetista', 'tatuatore', 'armiere', 'giochi', 'scommesse',
    ]
    const tipo = (pratica.tipo_attivita ?? '').toLowerCase()
    if (attivitaConCasellario.some(k => tipo.includes(k))) {
      base.splice(1, 0, { nome: 'Casellario giudiziale', desc: 'Zipra lo richiede al Ministero della Giustizia' })
    }
    // Estratto INPS solo se c'è iscrizione previdenziale
    const iterAnalisi = (analisi?.iter ?? []).join(' ').toLowerCase()
    if (iterAnalisi.includes('inps') || iterAnalisi.includes('previdenz')) {
      base.splice(-1, 0, { nome: 'Estratto contributivo INPS', desc: 'Zipra lo recupera dal portale INPS' })
    }
    // HACCP solo se serve alimenti
    if (pratica.serve_alimenti || tipo.includes('bar') || tipo.includes('ristoran') || tipo.includes('alimentar') || tipo.includes('pizzer')) {
      base.push({ nome: 'Notifica sanitaria ASL', desc: 'Zipra la presenta all\'ASL competente' })
    }
    return base
  })()

  const uploadDocumento = async (docId: string, docNome: string, file: File) => {
    setUploading(docId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const path = `${user.id}/pratiche/${pratica.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('documenti').upload(path, file)
      if (error) { console.error(error); return }

      // Salva riferimento documento
      await supabase.from('documenti').insert({
        pratica_id: pratica.id,
        nome: docNome,
        tipo: 'input_utente',
        url: path,
        mime_type: file.type,
        size: file.size,
      })

      setUploadOk(prev => new Set(Array.from(prev).concat(docId)))
      onDocumentUploaded()
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="border-t border-white/8 bg-z-darker">
      <div className="p-5 grid md:grid-cols-2 gap-6">

        {/* COLONNA SX — Cosa gestisce Zipra */}
        <div>
          <div className="text-xs font-mono text-z-green/60 uppercase tracking-wider mb-3">
            ✨ Zipra gestisce per te
          </div>
          <div className="space-y-2">
            {docZipra.map(d => (
              <div key={d.nome} className="flex items-start gap-2.5 py-1">
                <span className="text-z-green text-sm shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-z-light text-sm font-medium">{d.nome}</p>
                  <p className="text-z-muted/50 text-xs">{d.desc}</p>
                </div>
              </div>
            ))}
            {/* Iter dettagliato — campo pratiche dall'analisi AI */}
            {analisi?.pratiche?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/6">
                <div className="text-xs font-mono text-z-muted/50 uppercase mb-2">Iter procedurale</div>
                {analisi.pratiche.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                    <span className="text-z-green/60 shrink-0 font-mono">{i + 1}.</span>
                    <span className="text-z-muted/70">{typeof step === 'string' ? step : (step as any).titolo}</span>
                  </div>
                ))}
              </div>
            )}
            {/* ATECO e forma giuridica */}
            {(analisi?.codice_ateco || pratica.forma_giuridica) && (
              <div className="mt-3 pt-3 border-t border-white/6 space-y-2">
                {analisi?.codice_ateco && (
                  <div>
                    <span className="text-xs font-mono text-z-muted/50 uppercase">Codice ATECO </span>
                    <span className="text-xs font-mono text-z-green/70">{analisi.codice_ateco}</span>
                    {analisi?.descrizione_ateco && (
                      <span className="text-xs text-z-muted/50 ml-1">— {analisi.descrizione_ateco}</span>
                    )}
                  </div>
                )}
                {pratica.forma_giuridica && (
                  <div>
                    <span className="text-xs font-mono text-z-muted/50 uppercase">Forma giuridica </span>
                    <span className="text-xs text-z-light">{pratica.forma_giuridica.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                  </div>
                )}
                {analisi?.tempi_totali && (
                  <div>
                    <span className="text-xs font-mono text-z-muted/50 uppercase">Tempi stimati </span>
                    <span className="text-xs text-z-light">{analisi.tempi_totali}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DX — Documenti da caricare */}
        <div>
          <div className="text-xs font-mono text-blue-400/60 uppercase tracking-wider mb-3">
            📎 Documenti da caricare
          </div>

          {docDaCaricare.length === 0 ? (
            <div className="bg-z-green/8 border border-z-green/20 rounded-xl p-4 text-sm text-z-muted">
              <span className="text-z-green font-bold">✓ Tutto pronto!</span> Non mancano documenti.
            </div>
          ) : (
            <div className="space-y-2">
              {docDaCaricare.map((doc: any) => {
                const docId = doc.id ?? doc.nome
                const caricato = uploadOk.has(docId)
                return (
                  <div key={docId} className={`rounded-xl p-3 border transition-all ${
                    caricato
                      ? 'border-z-green/30 bg-z-green/5'
                      : 'border-white/8 bg-z-mid'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-z-light text-sm font-medium truncate">{doc.nome}</p>
                        {caricato && <p className="text-z-green text-xs mt-0.5">✓ Caricato</p>}
                      </div>
                      {caricato ? (
                        <span className="text-z-green text-lg shrink-0">✓</span>
                      ) : (
                        <label className="shrink-0 cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            disabled={uploading === docId}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) uploadDocumento(docId, doc.nome, f)
                            }}
                          />
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-all ${
                            uploading === docId
                              ? 'bg-white/10 text-z-muted cursor-wait'
                              : 'bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30'
                          }`}>
                            {uploading === docId ? '⏳ Caricamento...' : '📎 Carica'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-z-muted/40 mt-2">
                Puoi caricare i documenti in qualsiasi momento — non blocca la lavorazione.
              </p>
            </div>
          )}

          {/* Costi — prima pratica = prezzo abbonamento, successive = listino */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-z-mid rounded-xl p-3 text-center">
              {isPrimaPratica ? (
                // Prima pratica — mostra il prezzo dell'abbonamento
                pratica.piano === 'pro' ? (
                  <>
                    <div className="font-bold text-z-green text-lg">€249</div>
                    <div className="text-[10px] text-z-muted/50">Piano Pro / anno</div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-z-green text-lg">€149</div>
                    <div className="text-[10px] text-z-muted/50">Piano Base / anno</div>
                  </>
                )
              ) : (
                // Pratica successiva — prezzo di listino dal catalogo
                (() => {
                  const tipoL = (pratica.tipo_attivita ?? '').toLowerCase()
                  const cat = CATALOGO.find(c =>
                    tipoL.includes('srl') ? c.id === 'apertura_srl' : c.id === 'apertura_ditta'
                  ) ?? CATALOGO.find(c => c.id === 'apertura_ditta')
                  return cat ? (
                    <div>
                      <div className="font-bold text-z-green text-lg">€{cat.prezzoZipra + cat.dirittiEnti}</div>
                      <div className="text-[10px] text-z-muted/50">€{cat.prezzoZipra} Zipra + €{cat.dirittiEnti} enti</div>
                    </div>
                  ) : null
                })()
              )}
            </div>
            {analisi?.tempi_totali && (
              <div className="flex-1 bg-z-mid rounded-xl p-3 text-center">
                <div className="font-bold text-z-light text-lg">{analisi.tempi_totali}</div>
                <div className="text-[10px] text-z-muted/50">giorni stimati</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [pratiche, setPratiche] = useState<any[]>([])
  const [profilo, setProfilo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [praticaAperta, setPraticaAperta] = useState<any>(null)
  const [mostraToastMantenimento, setMostraToastMantenimento] = useState(false)
  const [toastNuovaPratica, setToastNuovaPratica] = useState(false)
  const [toastTempPassword, setToastTempPassword] = useState<{email: string, password: string} | null>(null)

  useEffect(() => {
    // Controlla se c'è una password temporanea da mostrare
    const raw = sessionStorage.getItem('zipra_temp_password')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        setToastTempPassword(data)
        sessionStorage.removeItem('zipra_temp_password')
      } catch {}
    }
  }, [])

  useEffect(() => {
    const carica = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signup'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfilo(p)

      if (p?.piano === 'base') setMostraToastMantenimento(true)

      const { data: pr } = await supabase.from('pratiche')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setPratiche(pr ?? [])
      setLoading(false)

      // Se arrivo dal wizard con pratica appena creata → aprila subito
      const params = new URLSearchParams(window.location.search)
      const praticaIdParam = params.get('pratica')
      const nuova = params.get('nuova') === '1'
      if (praticaIdParam && pr) {
        const trovata = pr.find((p: any) => p.id === praticaIdParam)
        if (trovata) {
          setPraticaAperta(trovata)
          if (nuova) setToastNuovaPratica(true)
        }
      }
    }
    carica()
  }, [])

  const getAnalisi = (pratica: any) => {
    if (!pratica?.analisi_ai) return null
    try { return JSON.parse(pratica.analisi_ai) } catch { return null }
  }

  const caricaDatiPratica = async (praticaId: string) => {
    const { data } = await supabase.from('pratiche').select('*').eq('id', praticaId).single()
    if (data) {
      setPratiche(prev => prev.map(p => p.id === praticaId ? data : p))
      setPraticaAperta(data)
    }
  }

  const getStatoInfo = (stato: string) => STATI.find(s => s.id === stato) ?? STATI[0]

  if (loading) return (
    <div className="min-h-screen bg-z-darker flex items-center justify-center">
      <div className="text-z-muted font-mono text-sm">Caricamento...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-z-darker">

      {/* Toast password temporanea — utente appena registrato dal wizard */}
      {toastTempPassword && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4 bg-z-card border border-z-green/30 rounded-2xl shadow-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🎉</span>
            <div className="flex-1">
              <p className="font-bold text-white text-sm mb-1">Account creato automaticamente!</p>
              <p className="text-slate-300 text-sm mb-3">Puoi accedere con queste credenziali. Cambia la password quando vuoi dalle impostazioni.</p>
              <div className="bg-slate-900/60 rounded-xl p-3 space-y-1.5 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white">{toastTempPassword.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password temporanea:</span>
                  <span className="text-z-green font-bold">{toastTempPassword.password}</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">📧 Ti abbiamo inviato un'email di conferma. Clicca il link per attivare l'account.</p>
            </div>
            <button onClick={() => setToastTempPassword(null)} className="text-slate-500 hover:text-white text-xl shrink-0">×</button>
          </div>
        </div>
      )}

      {/* Toast pratica creata */}


      {/* Nav */}
      <nav className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-head text-xl font-bold text-z-light">zipra ⚡</a>
          <div className="flex items-center gap-3">
            <a href="/pratiche" className="text-sm text-z-muted/60 hover:text-z-muted">Servizi</a>
            <a href="/prezzi" className="text-sm text-z-muted/60 hover:text-z-muted">Prezzi</a>
            <span className="text-z-muted/30 text-sm">{profilo?.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="btn-secondary text-xs py-2">Esci</button>
            <a href="/dashboard/impostazioni" className="btn-ghost text-xs py-2">⚙️ Impostazioni</a>
          </div>
        </div>
      </nav>

      {/* Toast mantenimento per piano base */}
      {mostraToastMantenimento && (
        <div className="bg-z-green/10 border-b border-z-green/20 py-3 px-6">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-z-green text-sm">⭐</span>
              <span className="text-sm text-z-light">
                Sei nel piano Base. Aggiungi il <strong>Mantenimento a €29/mese</strong> per adempimenti annuali automatici e sconto 20% su tutte le pratiche.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href="/prezzi" className="text-xs text-z-green underline">Scopri →</a>
              <button onClick={() => setMostraToastMantenimento(false)} className="text-z-muted/40 hover:text-z-muted text-lg ml-3">×</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-head text-3xl font-bold text-z-light">
              Ciao{profilo?.nome ? `, ${profilo.nome}` : ''}! 👋
            </h1>
            <p className="text-z-muted mt-1">
              Piano: <span className="text-z-green font-bold uppercase">{profilo?.piano ?? 'free'}</span>
              {profilo?.piano === 'pro' && <span className="ml-2 text-xs text-z-green/60">• Mantenimento incluso</span>}
            </p>
          </div>
          <a href="/wizard" className="btn-primary">+ Nuova pratica</a>
        </div>

        {/* Banner firma procura — se non ancora firmata e ha una pratica */}
        {pratiche.length > 0 && !profilo?.procura_firmata && (
          <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">✍️</span>
              <div>
                <p className="font-bold text-z-light text-sm">Firma la procura speciale</p>
                <p className="text-z-muted/70 text-xs mt-0.5">
                  Autorizza Zipra a operare per tuo conto presso CCIAA, INPS, SUAP e Agenzia delle Entrate.
                  Ci vogliono 2 minuti.
                </p>
              </div>
            </div>
            <a href={`/onboarding/firma?pratica=${pratiche[pratiche.length - 1]?.id}`}
              className="btn-primary text-sm py-2 px-4 shrink-0 whitespace-nowrap">
              ✍️ Firma ora →
            </a>
          </div>
        )}
        {pratiche.length === 0 ? (
          <div className="bg-z-mid border border-white/8 p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-head font-bold text-z-light text-xl mb-2">Nessuna pratica ancora</h3>
            <p className="text-z-muted text-sm mb-8">Descrivi la tua idea e l'AI prepara il piano completo in 30 secondi</p>
            <a href="/wizard" className="btn-primary text-base py-4 px-10">🚀 Inizia ora — è gratis</a>
          </div>
        ) : (
          <div className="space-y-3">
            {pratiche.map(p => {
              const statoInfo = getStatoInfo(p.stato)
              const analisi = getAnalisi(p)
              return (
                <div key={p.id} className="bg-z-mid border border-white/8 hover:border-white/15 transition-all">
                  <div className="p-5 flex items-center gap-4">
                    {/* Icona stato */}
                    <div className="text-2xl shrink-0">{statoInfo.icon}</div>

                    {/* Info pratica */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-head font-bold text-z-light truncate">{p.nome_impresa}</h3>
                        {analisi?.codice_ateco && (
                          <span className="text-[10px] font-mono text-z-green/60 bg-z-green/8 px-1.5 py-0.5 shrink-0">
                            {analisi.codice_ateco}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-z-muted/60">
                        <span>{p.comune_sede} ({p.provincia_sede})</span>
                        <span>·</span>
                        <span className="font-mono">{p.numero_pratica}</span>
                        <span>·</span>
                        <span className={`font-bold ${statoInfo.color}`}>{statoInfo.label}</span>
                      </div>
                    </div>

                    {/* Bottoni azione */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Riepilogo — sempre disponibile */}
                      <button
                        onClick={() => setPraticaAperta(praticaAperta?.id === p.id ? null : p)}
                        className="btn-secondary text-xs py-2 px-4">
                        📋 Riepilogo
                      </button>

                      {/* Paga — solo se in bozza */}
                      {p.stato === 'bozza' && (
                        <a href={`/checkout?pratica=${p.id}`}
                          className="btn-primary text-xs py-2 px-4">
                          💳 Paga e invia
                        </a>
                      )}

                      {/* Scarica ricevuta — solo se completata */}
                      {p.stato === 'completata' && (
                        <button className="btn-secondary text-xs py-2 px-4 text-green-400 border-green-400/30">
                          📥 Ricevuta
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar stato */}
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-1">
                      {['bozza', 'in_revisione_admin', 'in_invio', 'inviata_ente', 'completata'].map((s, i) => {
                        const stati = ['bozza', 'in_revisione_admin', 'approvata_utente', 'in_invio', 'inviata_ente', 'completata']
                        const idx = stati.indexOf(p.stato)
                        const passato = i <= Math.max(0, stati.indexOf(s) <= idx ? i : -1)
                        const corrente = s === p.stato
                        return (
                          <div key={s} className="flex-1 h-1 rounded"
                            style={{ background: corrente ? '#00C48C' : passato ? '#00C48C40' : 'rgba(255,255,255,0.08)' }} />
                        )
                      })}
                    </div>
                  </div>

                  {/* Pannello riepilogo espandibile */}
                  {praticaAperta?.id === p.id && (
                    <PannelloDettaglioPratica
                      pratica={p}
                      analisi={analisi}
                      onDocumentUploaded={() => caricaDatiPratica(p.id)}
                      isPrimaPratica={pratiche.indexOf(p) === pratiche.length - 1}
                    />
                  )}

                  {/* Pratiche correlate — SOLO sulla prima pratica (la più vecchia = ultimo nell'array DESC) */}
                  {pratiche.indexOf(p) === pratiche.length - 1 ? (
                    <PraticheCorrrelate
                      pratica={p}
                      pianoAttivo={profilo?.piano === 'base' || profilo?.piano === 'pro'}
                    />
                  ) : (
                    // Pratiche successive — upsell Mantenimento, non pratiche gratis
                    <PannelloMantenimento pianoAttivo={profilo?.piano === 'mantenimento' || profilo?.piano === 'pro'} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Sezione archivio */}
        {pratiche.length > 0 && (
          <div className="mt-10">
            <h2 className="font-head font-bold text-z-light text-xl mb-4">🗄️ Archivio e conservazione</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: '📄', label: 'Pratiche', count: pratiche.length, link: '#' },
                { icon: '📥', label: 'Ricevute', count: pratiche.filter(p => p.stato === 'completata').length, link: '#' },
                { icon: '📁', label: 'Documenti', count: 0, link: '#' },
              ].map(({ icon, label, count, link }) => (
                <a key={label} href={link}
                  className="bg-z-mid border border-white/8 p-5 hover:border-white/20 transition-all text-center">
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="font-bold text-z-light text-2xl">{count}</div>
                  <div className="text-xs text-z-muted mt-1">{label}</div>
                </a>
              ))}
            </div>
            <p className="text-xs text-z-muted/30 mt-3 text-center">
              Zipra conserva tutti i tuoi documenti in modo sicuro e conforme alla normativa italiana.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}