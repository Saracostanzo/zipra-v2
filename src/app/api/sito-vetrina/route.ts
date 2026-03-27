// PATH: src/app/api/sito-vetrina/route.ts
//
// Riceve praticaId + datiAggiuntivi dal form utente
// Avvia la generazione asincrona e ritorna subito il sitoId

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviaNotifica } from '@/lib/notifications/service'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { praticaId, datiAggiuntivi } = await req.json()
  const admin = createAdminClient()

  // Verifica piano Pro
  const { data: profile } = await admin
    .from('profiles')
    .select('piano, nome, cognome, email, telefono')
    .eq('id', user.id)
    .single()

  if (profile?.piano !== 'pro') {
    return NextResponse.json({ error: 'Piano Pro richiesto' }, { status: 403 })
  }

  const { data: pratica } = await admin
    .from('pratiche')
    .select('*')
    .eq('id', praticaId)
    .eq('user_id', user.id)
    .single()

  if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

  // Crea subito il record sito in stato "generazione" — ritorna l'id al client
  const { data: sito, error: sitoError } = await admin
    .from('siti_vetrina')
    .insert({
      user_id: user.id,
      pratica_id: praticaId,
      stato: 'generazione',
      testi: {
        // Salva i dati aggiuntivi forniti dall'utente per usarli nella generazione
        descrizione_utente: datiAggiuntivi?.descrizione ?? '',
        servizi_utente: datiAggiuntivi?.servizi ?? [],
        telefono: datiAggiuntivi?.telefono ?? profile?.telefono ?? '',
        email: datiAggiuntivi?.email ?? profile?.email ?? '',
        indirizzo: datiAggiuntivi?.indirizzo ?? '',
        orari: datiAggiuntivi?.orari ?? '',
      },
    })
    .select('id')
    .single()

  if (sitoError || !sito) {
    return NextResponse.json({ error: 'Errore creazione record sito' }, { status: 500 })
  }

  // Avvia generazione in background (non blocchiamo la risposta)
  generaSitoInBackground({
    sitoId: sito.id,
    userId: user.id,
    pratica,
    profile,
    datiAggiuntivi,
    admin,
  }).catch(e => console.error('[sito-vetrina] Errore generazione background:', e))

  // Ritorna subito il sitoId — il client redirige a /dashboard/sito/[id]
  return NextResponse.json({ sitoId: sito.id, stato: 'generazione' })
}

async function generaSitoInBackground({
  sitoId, userId, pratica, profile, datiAggiuntivi, admin
}: {
  sitoId: string
  userId: string
  pratica: any
  profile: any
  datiAggiuntivi: any
  admin: any
}) {
  try {
    // Prova a importare il generatore — se non disponibile usa fallback
    let urlPubblicato: string | null = null
    let logoUrl: string | null = null
    let testi: any = {}

    try {
      const { generaSitoCompleto } = await import('@/lib/sito/generator')
      const risultato = await generaSitoCompleto({
        userId,
        praticaId: pratica.id,
        dati: {
          nomeImpresa: pratica.nome_impresa,
          settore: pratica.tipo_attivita ?? pratica.settore ?? '',
          comuneSede: pratica.comune_sede,
          provinciaSede: pratica.provincia_sede,
          telefono: datiAggiuntivi?.telefono ?? profile?.telefono ?? '',
          email: datiAggiuntivi?.email ?? profile?.email ?? '',
          indirizzo: datiAggiuntivi?.indirizzo ?? '',
          orari: datiAggiuntivi?.orari ?? '',
          descrizione: datiAggiuntivi?.descrizione ?? '',
          servizi: datiAggiuntivi?.servizi ?? [],
        },
      })
      urlPubblicato = risultato?.urlPubblicato ?? null
      logoUrl = risultato?.logoUrl ?? null
      testi = risultato?.testi ?? {}
    } catch (e: any) {
      console.warn('[sito-vetrina] generaSitoCompleto non disponibile:', e.message)
      // Fallback: segna come revisione manuale
      testi = {
        headline: `${pratica.nome_impresa} — ${pratica.comune_sede}`,
        sottotitolo: datiAggiuntivi?.descrizione?.slice(0, 100) ?? '',
        descrizione: datiAggiuntivi?.descrizione ?? '',
        servizi: datiAggiuntivi?.servizi ?? [],
        telefono: datiAggiuntivi?.telefono ?? '',
        email: datiAggiuntivi?.email ?? '',
        indirizzo: datiAggiuntivi?.indirizzo ?? '',
        orari: datiAggiuntivi?.orari ?? '',
      }
    }

    const nomeDominio = urlPubblicato
      ? urlPubblicato.replace('https://', '')
      : `zipra-${pratica.nome_impresa.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.vercel.app`

    // Aggiorna record sito
    await admin.from('siti_vetrina').update({
      stato: urlPubblicato ? 'pubblicato' : 'revisione',
      url_pubblicato: urlPubblicato,
      nome_dominio: nomeDominio,
      testi,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', sitoId)

    // Notifica in-app
    await inviaNotifica({
      userId,
      tipo: 'sito_pronto',
      titolo: urlPubblicato ? '🌐 Il tuo sito è online!' : '🌐 Sito in revisione',
      messaggio: urlPubblicato
        ? `Il sito di ${pratica.nome_impresa} è pronto su ${nomeDominio}.`
        : `Il sito di ${pratica.nome_impresa} è stato preparato ed è in revisione. Il team Zipra lo pubblicherà presto.`,
      praticaId: pratica.id,
      azioneUrl: `/dashboard/sito/${sitoId}`,
      canali: ['db', 'email'],
    })

    console.log(`[sito-vetrina] Generazione completata per sito ${sitoId}`)
  } catch (e: any) {
    console.error('[sito-vetrina] Errore generazione background:', e.message)
    await admin.from('siti_vetrina').update({
      stato: 'errore',
      updated_at: new Date().toISOString(),
    }).eq('id', sitoId)
  }
}