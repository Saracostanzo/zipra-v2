'use client'
import Link from 'next/link'
import { useState } from 'react'

const ATTIVITA = [
  {
    id: 'taxi_ncc',
    emoji: '🚕',
    nome: 'Taxi / NCC',
    legge: 'L. 21/1992',
    requisiti: ['Patente B + CAP-KB', 'Esame CCIAA (2x/anno)', 'Licenza comunale'],
    cosa_facciamo: 'Gestiamo tutta la documentazione, ti seguiamo dall\'apertura ditta all\'esame fino al bando comunale',
    alert: null,
  },
  {
    id: 'autoriparatori',
    emoji: '🔧',
    nome: 'Meccanico / Officina',
    legge: 'L. 122/1992',
    requisiti: ['Patentino autoriparatore CCIAA', 'Conformità impianti locale', 'Iscrizione Albo'],
    cosa_facciamo: 'Verifichiamo se hai i requisiti, gestiamo SCIA SUAP e iscrizione Albo Autoriparatori',
    alert: '⚠️ Patentino obbligatorio prima di aprire',
  },
  {
    id: 'acconciatori',
    emoji: '✂️',
    nome: 'Parrucchiere / Barbiere',
    legge: 'L. 174/2005',
    requisiti: ['Qualifica regionale', 'Superfici minime locali', 'Responsabile tecnico CCIAA'],
    cosa_facciamo: 'Verifichiamo i requisiti del tuo comune, gestiamo SCIA e tutte le comunicazioni obbligatorie',
    alert: '⚠️ Superfici minime variano per comune',
  },
  {
    id: 'estetisti',
    emoji: '💆',
    nome: 'Estetista / Centro estetico',
    legge: 'L. 1/1990',
    requisiti: ['Qualifica regionale', 'Verifica ASL locale', 'SCIA al SUAP'],
    cosa_facciamo: 'Gestiamo apertura ditta, SCIA e coordinamento con ASL per la verifica igienico-sanitaria',
    alert: null,
  },
  {
    id: 'bar',
    emoji: '☕',
    nome: 'Bar / Ristorante',
    legge: 'D.Lgs 59/2010',
    requisiti: ['Attestato SAB', 'Piano HACCP', 'Verifica piano commerciale comunale'],
    cosa_facciamo: 'Gestiamo notifica ASL, SCIA somministrazione e verifica preventiva della zona',
    alert: '⚠️ Alcune zone comunali sono sature',
  },
  {
    id: 'impiantisti',
    emoji: '⚡',
    nome: 'Impiantista / Elettricista',
    legge: 'DM 37/2008',
    requisiti: ['Diploma tecnico + esperienza', 'Responsabile tecnico CCIAA'],
    cosa_facciamo: 'Gestiamo apertura ditta, SCIA e comunicazione responsabile tecnico — anche senza locale fisso',
    alert: null,
  },
  {
    id: 'mediatori',
    emoji: '🏠',
    nome: 'Agente immobiliare',
    legge: 'L. 39/1989',
    requisiti: ['Corso abilitante + esame CCIAA', 'Iscrizione Ruolo Mediatori', 'RC professionale'],
    cosa_facciamo: 'Gestiamo apertura ditta e tutte le pratiche CCIAA per l\'iscrizione al ruolo',
    alert: null,
  },
  {
    id: 'commercio',
    emoji: '🛍️',
    nome: 'Negozio / Commercio',
    legge: 'D.Lgs 114/1998',
    requisiti: ['Comunicazione apertura SUAP', 'Autorizzazioni specifiche per settore'],
    cosa_facciamo: 'Gestiamo comunicazione di apertura, autorizzazioni speciali (tabacchi, farmaci, armi, ottica)',
    alert: null,
  },
]

export default function SezioneAttivitaRegolamentate() {
  const [aperta, setAperta] = useState<string | null>(null)

  return (
    <section className="border-t border-white/8 py-20 bg-z-dark">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/10 border border-amber-400/25 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              Aggiornato ogni settimana · 105 province monitorate
            </span>
          </div>

          <h2 className="font-head text-4xl font-bold text-z-light mb-4">
            Attività con requisiti speciali?<br />
            <span className="text-amber-400">Ci pensiamo noi.</span>
          </h2>
          <p className="text-z-muted font-body text-lg max-w-2xl mx-auto">
            Taxi, meccanici, parrucchieri, estetisti, bar — queste attività hanno requisiti
            professionali, superfici minime e autorizzazioni che cambiano comune per comune.
            Zipra monitora tutte le 105 province italiane ogni settimana. Zero errori.
          </p>
        </div>

        {/* Griglia attività */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {ATTIVITA.map(a => (
            <div key={a.id}>
              <button
                onClick={() => setAperta(aperta === a.id ? null : a.id)}
                className={`w-full text-left p-5 border transition-all duration-200 ${
                  aperta === a.id
                    ? 'border-amber-400/40 bg-amber-400/5'
                    : 'border-white/8 bg-z-mid hover:border-white/20'
                }`}>
                <div className="text-2xl mb-3">{a.emoji}</div>
                <div className="font-head font-bold text-z-light text-sm mb-1">{a.nome}</div>
                <div className="text-[10px] font-mono text-z-muted/40 mb-2">{a.legge}</div>
                {a.alert && (
                  <div className="text-[10px] font-mono text-amber-400/70 mt-1">{a.alert}</div>
                )}
                <div className={`text-xs font-mono mt-2 transition-colors ${aperta === a.id ? 'text-amber-400' : 'text-z-muted/40'}`}>
                  {aperta === a.id ? '▲ chiudi' : '▼ dettagli'}
                </div>
              </button>

              {/* Pannello dettaglio */}
              {aperta === a.id && (
                <div className="border border-t-0 border-amber-400/40 bg-amber-400/3 p-4">
                  <div className="mb-3">
                    <div className="text-[10px] font-mono text-amber-400/60 uppercase tracking-wider mb-2">
                      Requisiti obbligatori
                    </div>
                    <div className="space-y-1">
                      {a.requisiti.map(r => (
                        <div key={r} className="flex items-start gap-2 text-xs text-z-muted">
                          <span className="text-amber-400 shrink-0 mt-0.5">→</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-[10px] font-mono text-z-green/60 uppercase tracking-wider mb-1">
                      Cosa gestiamo noi
                    </div>
                    <p className="text-xs text-z-muted leading-relaxed">{a.cosa_facciamo}</p>
                  </div>
                  <Link
                    href={`/?attivita=${a.id}`}
                    className="block w-full text-center py-2.5 bg-z-green text-z-dark text-xs font-bold hover:bg-green-400 transition-all">
                    Inizia con {a.nome} →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Banner aggiornamento */}
        <div className="bg-z-mid border border-white/8 p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <div className="font-head font-bold text-z-light text-lg mb-2">
              🔄 Aggiornato ogni lunedì automaticamente
            </div>
            <p className="text-z-muted text-sm leading-relaxed">
              Ogni settimana Zipra scansiona i siti di tutte le 105 Camere di Commercio,
              105 SUAP comunali e le fonti regionali per aggiornare requisiti, superfici minime,
              date esami e procedure locali. Se un comune cambia le regole, lo sappiamo entro 7 giorni.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0">
            {[
              { val: '105', label: 'CCIAA monitorate' },
              { val: '105', label: 'SUAP comunali' },
              { val: '20', label: 'Regioni coperte' },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="font-head font-bold text-z-green text-2xl">{val}</div>
                <div className="text-[10px] font-mono text-z-muted/50 mt-0.5 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs font-mono text-z-muted/30">
            Non trovi la tua attività? Scrivici nel chatbot — la gestiamo su preventivo.
          </p>
        </div>
      </div>
    </section>
  )
}