import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { CATALOGO } from '@/lib/catalogo'
import { ATTIVITA_REGOLAMENTATE, type AttivitaRegolamentata } from '@/lib/catalogo/attivita-regolamentate'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function cercaAttivitaKB(idea: string): AttivitaRegolamentata | null {
  const q = idea.toLowerCase()
  return ATTIVITA_REGOLAMENTATE.find(a => {
    const termini = [a.id, a.nome, a.nome_breve, ...a.nomi_alternativi].map(k => k.toLowerCase())
    return termini.some(t => q.includes(t))
  }) ?? null
}

export async function POST(req: NextRequest) {
  try {
    const { idea, settore, forma_giuridica, comune, provincia, ha_locale, serve_alimenti } = await req.json()
    if (!idea) return NextResponse.json({ error: 'Idea mancante' }, { status: 400 })

    // 1. Cerca nel knowledge base locale
    const attivitaKB = cercaAttivitaKB(idea)

    // 2. Normative specifiche per comune dal DB Supabase
    let normativeDB: any[] = []
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data } = await supabase
        .from('normative_sources')
        .select('titolo, contenuto, categoria')
        .or('comune.ilike.%' + comune + '%,comune.is.null')
        .eq('attivo', true)
        .order('data_scraping', { ascending: false })
        .limit(6)
      normativeDB = data ?? []
    } catch (e) {
      console.warn('DB normative non disponibile:', e)
    }

    // 3. Costruisce contesto per l'AI dai dati del KB
    let contestoKB = 'Attivita non trovata nel KB — usa la tua conoscenza della burocrazia italiana.'

    if (attivitaKB) {
      const docsUtente = attivitaKB.documenti
        .filter(d => d.fonte === 'utente' && !d.zipra_lo_fa)
        .map(d => '- ' + d.nome + ': ' + d.descrizione)
        .join('\n') || 'Solo documento di identita'

      const docsZipra = attivitaKB.documenti
        .filter(d => d.zipra_lo_fa)
        .map(d => '- ' + d.nome)
        .join('\n') || 'PEC, estratto INPS, SCIA, ComUnica'

      const entiZipra = attivitaKB.comunicazioni_enti
        .map(c => '- ' + c.ente + ': ' + c.cosa_fa_zipra)
        .join('\n')

      contestoKB = 'DATI DAL NOSTRO DATABASE (usa come fonte primaria):\n'
        + 'Attivita: ' + attivitaKB.nome + '\n'
        + 'Legge: ' + attivitaKB.legge_riferimento + '\n'
        + 'ATECO: ' + attivitaKB.codici_ateco.join(', ') + '\n'
        + 'Iter: ' + attivitaKB.iter.join(' > ') + '\n\n'
        + 'DOCUMENTI CHE PORTA LUTENTE (metti in documenti_necessari):\n' + docsUtente + '\n\n'
        + 'DOCUMENTI CHE FA ZIPRA (NON mettere in documenti_necessari):\n' + docsZipra + '\n\n'
        + 'ENTI GESTITI DA ZIPRA:\n' + entiZipra + '\n\n'
        + 'Cosa fa l\'utente: ' + attivitaKB.cosa_deve_fare_utente.join(', ')
    }

    const contestoNormative = normativeDB.length > 0
      ? 'NORMATIVE AGGIORNATE PER ' + comune.toUpperCase() + ':\n'
        + normativeDB.map(n => '[' + n.categoria + '] ' + n.titolo + ': ' + n.contenuto.slice(0, 200)).join('\n\n')
      : ''

    const praticheCatalogo = CATALOGO
      .filter(p => !p.forme_giuridiche?.length || p.forme_giuridiche.includes(forma_giuridica))
      .map(p => '- ' + p.titolo)
      .join('\n')

    // 4. Prompt per l'AI — restituisce codici_ateco come ARRAY (possono essere multipli)
    const prompt = 'Sei l\'assistente burocratico di Zipra con accesso ai nostri dati aggiornati.\n\n'
      + 'RICHIESTA:\n'
      + 'Attivita: ' + idea + '\n'
      + 'Forma giuridica: ' + forma_giuridica + '\n'
      + 'Comune: ' + comune + ' (' + provincia + ')\n'
      + 'Ha locale fisico: ' + (ha_locale ? 'Si' : 'No') + '\n'
      + 'Manipola alimenti: ' + (serve_alimenti ? 'Si' : 'No') + '\n\n'
      + contestoKB + '\n\n'
      + contestoNormative + '\n\n'
      + 'PRATICHE CATALOGO ZIPRA:\n' + praticheCatalogo + '\n\n'
      + 'Rispondi SOLO con JSON valido, senza markdown, senza backtick:\n'
      + '{\n'
      + '  "codici_ateco": ["XX.XX.XX", "YY.YY.YY"],\n'
      + '  "descrizione_ateco": "descrizione sintetica attivita principale",\n'
      + '  "iter": ["Step 1", "Step 2", "Step 3"],\n'
      + '  "pratiche": ["pratiche burocratiche obbligatorie in ordine"],\n'
      + '  "documenti_necessari": ["SOLO documenti che l\'utente porta fisicamente"],\n'
      + '  "tempi_totali": "15-30 giorni",\n'
      + '  "note_importanti": "note specifiche per questo comune o attivita"\n'
      + '}\n\n'
      + 'REGOLE ASSOLUTE:\n'
      + '1. codici_ateco e\' SEMPRE un array, anche se e\' uno solo\n'
      + '2. iter e\' un array di step procedurali in ordine cronologico\n'
      + '3. documenti_necessari contiene SOLO cio che l\'utente porta fisicamente\n'
      + '4. MAI mettere in documenti_necessari: PEC, estratto INPS, casellario, DURC, visure, SCIA, ComUnica — li fa Zipra\n'
      + '5. Se l\'attivita ha 2 codici ATECO principali, mettili entrambi nell\'array'

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const testo = response.content[0].type === 'text' ? response.content[0].text : ''
    let risultato: any

    try {
      const pulito = testo.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      risultato = JSON.parse(pulito)
    } catch {
      // Fallback diretto dal KB senza AI
      risultato = {
        codici_ateco: attivitaKB?.codici_ateco ?? [],
        descrizione_ateco: attivitaKB?.nome ?? null,
        iter: attivitaKB?.iter ?? [],
        pratiche: attivitaKB?.iter ?? [],
        documenti_necessari: attivitaKB?.documenti
          .filter(d => d.fonte === 'utente' && !d.zipra_lo_fa)
          .map(d => d.nome) ?? ['Documento di identita'],
        tempi_totali: '15-30 giorni',
        note_importanti: null,
      }
    }

    // Normalizza codici_ateco — se l'AI ha restituito stringa invece di array, converti
    if (typeof risultato.codici_ateco === 'string') {
      risultato.codici_ateco = [risultato.codici_ateco]
    }
    if (!Array.isArray(risultato.codici_ateco)) {
      risultato.codici_ateco = attivitaKB?.codici_ateco ?? []
    }

    // Retrocompatibilità — tieni anche codice_ateco singolo per le query vecchie
    risultato.codice_ateco = risultato.codici_ateco[0] ?? null

    // Pulizia post-AI — rimuove documenti che fa Zipra anche se l'AI li ha messi
    const ZIPRA_GESTISCE = [
      'pec', 'posta elettronica certificata',
      'casellario', 'certificato penale', 'carichi pendenti',
      'estratto contributivo', 'estratto inps',
      'durc', 'documento unico di regolarita',
      'visura camerale', 'visura catastale',
      'codice fiscale', 'tesserino fiscale',
      'certificato di residenza', 'autocertificazione',
      'dichiarazione sostitutiva', 'requisiti morali',
      'scia', 'comunica', 'modulo', 'istanza',
    ]
    if (Array.isArray(risultato.documenti_necessari)) {
      risultato.documenti_necessari = risultato.documenti_necessari.filter((doc: string) => {
        const d = doc.toLowerCase()
        return !ZIPRA_GESTISCE.some(k => d.includes(k))
      })
    }

    risultato.da_knowledge_base = !!attivitaKB
    risultato.normative_trovate = normativeDB.length

    return NextResponse.json(risultato)

  } catch (error) {
    console.error('Errore analizza API:', error)
    return NextResponse.json({
      codici_ateco: [],
      codice_ateco: null,
      iter: [],
      pratiche: [],
      documenti_necessari: ['Documento di identita'],
      tempi_totali: '15-30 giorni',
    }, { status: 200 })
  }
}