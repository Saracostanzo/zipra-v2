'use client'
import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface Messaggio {
  ruolo: 'user' | 'assistant'
  testo: string
  modifica?: {
    tipo: string
    campo: string
    valore: string
    applicabile: boolean
  }
  richiedeImmagine?: boolean
}

export default function SitoEditorPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sitoId = params.id as string
  const pinParam = searchParams.get('pin') ?? ''

  const [pin, setPin] = useState(pinParam)
  const [accesso, setAccesso] = useState(!!pinParam)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const [messaggi, setMessaggi] = useState<Messaggio[]>([{
    ruolo: 'assistant',
    testo: 'Ciao! Sono l\'assistente Zipra per il tuo sito. Dimmi cosa vuoi modificare — testi, informazioni di contatto, orari, servizi offerti o immagini. Posso aggiornare il sito in pochi secondi. 🌐',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [modificaPendente, setModificaPendente] = useState<any | null>(null)
  const [applicando, setApplicando] = useState(false)
  const [urlSito, setUrlSito] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi])

  // Carica URL sito
  useEffect(() => {
    if (!accesso || !sitoId) return
    fetch(`/api/sito/${sitoId}?pin=${pin}`)
      .then(r => r.json())
      .then(d => d.urlPubblicato && setUrlSito(d.urlPubblicato))
      .catch(() => {})
  }, [accesso, sitoId, pin])

  const verificaPin = () => {
    if (pinInput.length !== 6) { setPinError('Il PIN è di 6 cifre'); return }
    setPin(pinInput)
    setAccesso(true)
    setPinError('')
  }

  const invia = async (testo?: string, immagineUrl?: string) => {
    const msg = testo ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    setMessaggi(prev => [...prev, { ruolo: 'user', testo: msg }])

    try {
      const res = await fetch('/api/sito/modifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitoId,
          messaggio: msg,
          immagineUrl,
          pinAccesso: pin,
        }),
      })
      const data = await res.json()

      const nuovoMsg: Messaggio = {
        ruolo: 'assistant',
        testo: data.risposta,
        modifica: data.modifica,
        richiedeImmagine: data.richiedeImmagine,
      }
      setMessaggi(prev => [...prev, nuovoMsg])

      if (data.modifica?.applicabile) {
        setModificaPendente(data.modifica)
      }
    } catch {
      setMessaggi(prev => [...prev, {
        ruolo: 'assistant',
        testo: 'Scusa, c\'è stato un problema. Riprova tra un momento.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const confermaMoodifica = async () => {
    if (!modificaPendente) return
    setApplicando(true)

    try {
      const res = await fetch('/api/sito/modifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitoId,
          pinAccesso: pin,
          applicaModificaConfermata: true,
          campo: modificaPendente.campo,
          valore: modificaPendente.valore,
          tipo: modificaPendente.tipo,
        }),
      })
      const data = await res.json()

      setMessaggi(prev => [...prev, {
        ruolo: 'assistant',
        testo: data.messaggio,
      }])

      if (data.urlNuovo) setUrlSito(data.urlNuovo)
      setModificaPendente(null)
    } finally {
      setApplicando(false)
    }
  }

  const gestisciUploadImmagine = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Upload tramite API archivio
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nome', file.name)
    formData.append('tipo', 'altro')

    const res = await fetch('/api/archivio', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.success) {
      await invia(`Ho caricato questa immagine, aggiungila al sito`, data.url)
    }
  }

  // ── Schermata PIN ────────────────────────────────────────────────────────────

  if (!accesso) {
    return (
      <div className="min-h-screen bg-z-darker flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="font-head text-3xl font-bold text-z-light">zipra</span>
            <span className="w-2 h-2 rounded-full bg-z-green inline-block ml-2 mb-1" />
            <p className="text-z-muted font-body text-sm mt-2">Editor sito vetrina</p>
          </div>

          <div className="bg-z-mid border border-white/8 p-8">
            <h2 className="font-head font-bold text-xl text-z-light mb-2">Accedi al tuo sito</h2>
            <p className="text-z-muted font-body text-sm mb-6">
              Inserisci il PIN di 6 cifre che hai ricevuto via email.
            </p>

            <label className="label-field">PIN di accesso</label>
            <input
              type="text"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && verificaPin()}
              placeholder="000000"
              className="input-field font-mono text-2xl text-center tracking-[.5em] mb-2"
              maxLength={6}
              autoFocus
            />
            {pinError && <p className="text-xs text-red-400 font-mono mb-3">{pinError}</p>}

            <button
              onClick={verificaPin}
              disabled={pinInput.length !== 6}
              className="btn-primary w-full justify-center mt-2"
            >
              Accedi →
            </button>

            <p className="text-xs font-mono text-z-muted/40 text-center mt-4">
              Non hai il PIN? Controlla l'email ricevuta da Zipra quando il sito è stato creato.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Editor principale ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-z-darker flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 bg-z-dark sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-head font-bold text-z-light">zipra</span>
            <span className="w-1.5 h-1.5 rounded-full bg-z-green" />
            <span className="text-xs font-mono text-z-muted/50">Editor sito</span>
          </div>
          {urlSito && (
            <a
              href={urlSito}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-z-green/70 hover:text-z-green flex items-center gap-1 transition-colors"
            >
              🌐 Vedi sito
            </a>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* Cosa puoi fare */}
        {messaggi.length === 1 && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[
              { emoji: '✏️', testo: 'Cambia il titolo principale' },
              { emoji: '📝', testo: 'Aggiorna la descrizione' },
              { emoji: '📋', testo: 'Modifica i servizi offerti' },
              { emoji: '📞', testo: 'Aggiorna telefono o orari' },
              { emoji: '🖼️', testo: 'Aggiungi una foto' },
              { emoji: '📍', testo: 'Cambia l\'indirizzo' },
            ].map(({ emoji, testo }) => (
              <button
                key={testo}
                onClick={() => invia(testo)}
                className="text-left px-3 py-2.5 border border-white/8 bg-z-mid text-xs font-body text-z-muted/70
                           hover:border-z-green/30 hover:text-z-light transition-all duration-150 flex items-center gap-2"
              >
                <span>{emoji}</span>{testo}
              </button>
            ))}
          </div>
        )}

        {/* Messaggi */}
        {messaggi.map((m, i) => (
          <div key={i} className={`flex ${m.ruolo === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%]">
              <div className={`px-4 py-3 text-sm font-body leading-relaxed
                ${m.ruolo === 'user'
                  ? 'bg-z-green text-z-dark font-medium'
                  : 'bg-z-mid border border-white/8 text-z-muted'
                }`}>
                {m.testo}
              </div>

              {/* Card modifica da confermare */}
              {m.modifica?.applicabile && modificaPendente?.campo === m.modifica.campo && (
                <div className="mt-2 border border-z-green/25 bg-z-green/5 p-4 animate-fade-in">
                  <p className="text-xs font-mono text-z-green/70 mb-2 uppercase tracking-wider">
                    Modifica proposta — {m.modifica.campo}
                  </p>
                  <p className="text-sm font-body text-z-light mb-3 bg-z-dark px-3 py-2">
                    "{m.modifica.valore}"
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confermaMoodifica}
                      disabled={applicando}
                      className="btn-primary text-xs py-2 flex-1 justify-center"
                    >
                      {applicando ? '⏳ Applicando...' : '✅ Sì, aggiorna il sito'}
                    </button>
                    <button
                      onClick={() => {
                        setModificaPendente(null)
                        setMessaggi(prev => [...prev, {
                          ruolo: 'assistant',
                          testo: 'Ok, nessuna modifica. Dimmi pure come vuoi cambiarlo.',
                        }])
                      }}
                      className="btn-secondary text-xs py-2 px-4 justify-center"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {/* Richiesta upload immagine */}
              {m.richiedeImmagine && (
                <div className="mt-2 border border-white/8 bg-z-mid p-4">
                  <p className="text-xs font-mono text-z-muted/50 mb-3">Carica la tua immagine</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={gestisciUploadImmagine}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-secondary text-xs py-2 w-full justify-center"
                  >
                    📁 Scegli file dal dispositivo
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-z-mid border border-white/8 px-4 py-3 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-z-green/60 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/8 bg-z-dark sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-secondary text-xs py-2.5 px-3 shrink-0"
            title="Carica immagine"
          >
            🖼️
          </button>
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            onChange={gestisciUploadImmagine}
            className="hidden"
          />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && invia()}
            placeholder="Es: Cambia il titolo in... · Aggiungi il servizio... · Aggiorna gli orari..."
            className="input-field flex-1 py-2.5 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => invia()}
            disabled={!input.trim() || loading}
            className="btn-primary py-2.5 px-4 shrink-0"
          >
            →
          </button>
        </div>
        <p className="text-center text-[10px] font-mono text-z-muted/25 pb-2">
          Modifiche gratuite incluse nel tuo piano · Zipra ⚡
        </p>
      </div>
    </div>
  )
}
