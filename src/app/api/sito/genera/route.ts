// PATH: src/app/api/sito/genera/route.ts
//
// Unica route per generare siti vetrina.
// Funziona per: Piano Pro (cliente) e Piano Business (commercialista per cliente)
//
// Body:
//   praticaId:     string   — pratica del cliente
//   datiManuali:   object   — dati inseriti nel form (descrizione, servizi, telefono...)
//   clienteUserId: string?  — solo business: userId del cliente target
//   businessId:    string?  — solo business: ID account business
//
// Ritorna: { sitoId, stato: 'generazione' }

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviaNotifica } from '@/lib/notifications/service'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { praticaId, datiManuali, clienteUserId, businessId } = await req.json()
  const admin = createAdminClient()

  // ── Recupera profilo di chi fa la richiesta ───────────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('piano, tipo_account, nome, cognome, email, telefono')
    .eq('id', user.id)
    .single()

  const isPro = profile?.piano === 'pro'
  const isBusiness =
    ['commercialista', 'caf', 'agenzia', 'patronato'].includes(profile?.tipo_account ?? '') ||
    ['business', 'business_pro'].includes(profile?.piano ?? '')
  const isAdminTest = profile?.piano === 'admin'

  if (!isPro && !isBusiness && !isAdminTest) {
    return NextResponse.json({ error: 'Piano Pro o Business richiesto', upgradeUrl: '/prezzi' }, { status: 403 })
  }

  // ── Determina il cliente target ───────────────────────────────────────────
  const targetUserId = (isBusiness && clienteUserId) ? clienteUserId : user.id

  // Business: verifica appartenenza cliente + limite mensile
  if (isBusiness && clienteUserId && businessId) {
    const { data: relazione } = await admin
      .from('business_clienti')
      .select('id')
      .eq('business_id', businessId)
      .eq('cliente_id', clienteUserId)
      .single()

    if (!relazione) {
      return NextResponse.json({ error: 'Cliente non trovato nel tuo account' }, { status: 403 })
    }

    const inizioMese = new Date()
    inizioMese.setDate(1); inizioMese.setHours(0, 0, 0, 0)
    const { count } = await admin
      .from('siti_vetrina')
      .select('id', { count: 'exact' })
      .eq('generato_da_business_id', businessId)
      .gte('created_at', inizioMese.toISOString())

    const limite = profile?.piano === 'business_pro' ? 999 : 3
    if ((count ?? 0) >= limite) {
      return NextResponse.json({
        error: `Hai raggiunto il limite di ${limite} siti questo mese. Passa a Business Pro per siti illimitati.`,
        upgradeUrl: '/prezzi',
      }, { status: 403 })
    }
  }

  // ── Verifica pratica ──────────────────────────────────────────────────────
  const { data: pratica } = await admin
    .from('pratiche')
    .select('id, nome_impresa, tipo_attivita, comune_sede, provincia_sede, analisi_ai')
    .eq('id', praticaId)
    .eq('user_id', targetUserId)
    .single()

  if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

  // ── Crea record sito in DB (ritorna subito l'id al client) ────────────────
  const { data: sito, error: sitoError } = await admin
    .from('siti_vetrina')
    .insert({
      user_id: targetUserId,
      pratica_id: praticaId,
      generato_da_business_id: businessId ?? null,
      stato: 'generazione',
      testi: {
        // Salva i dati del form — usati nella generazione background
        descrizione_utente: datiManuali?.descrizione ?? '',
        servizi_utente: datiManuali?.servizi ?? [],
        telefono: datiManuali?.telefono ?? profile?.telefono ?? '',
        email: datiManuali?.email ?? profile?.email ?? '',
        indirizzo: datiManuali?.indirizzo ?? '',
        orari: datiManuali?.orari ?? '',
      },
    })
    .select('id')
    .single()

  if (sitoError || !sito) {
    console.error('[sito/genera] Errore creazione record:', sitoError?.message)
    return NextResponse.json({ error: 'Errore interno creazione sito' }, { status: 500 })
  }

  // ── waitUntil mantiene vivo il processo Vercel dopo la risposta ───────────
  waitUntil(
    generaInBackground({
      sitoId: sito.id,
      targetUserId,
      businessId: businessId ?? null,
      pratica,
      datiManuali: datiManuali ?? {},
      admin,
    }).catch(e => console.error('[sito/genera] Errore background:', e?.message))
  )

  // Risponde subito con il sitoId — il client naviga a /dashboard/sito/[id]
  return NextResponse.json({ sitoId: sito.id, stato: 'generazione' })
}

// ── Generazione asincrona ─────────────────────────────────────────────────────
async function generaInBackground({
  sitoId,
  targetUserId,
  businessId,
  pratica,
  datiManuali,
  admin,
}: {
  sitoId: string
  targetUserId: string
  businessId: string | null
  pratica: any
  datiManuali: any
  admin: ReturnType<typeof createAdminClient>
}) {
  try {
    let urlPubblicato: string | null = null
    let logoUrl: string | null = null
    let testi: any = null

    // Prova a usare il generatore AI completo
    try {
      const generator = await import('@/lib/sito/generator')

      // generaContenutiSitoAI genera solo i testi — non crea record DB
      const datiPerAI = {
        nomeImpresa: pratica.nome_impresa,
        settore: pratica.tipo_attivita ?? '',
        comuneSede: pratica.comune_sede,
        provinciaSede: pratica.provincia_sede ?? '',
        descrizioneAttivita: datiManuali?.descrizione ?? pratica.tipo_attivita ?? '',
        telefono: datiManuali?.telefono ?? '',
        email: datiManuali?.email ?? '',
        indirizzo: datiManuali?.indirizzo ?? '',
        orari: datiManuali?.orari ?? '',
        servizi: datiManuali?.servizi ?? [],
        isWhiteLabel: !!businessId,
      }

      testi = await generator.generaContenutiSitoAI(datiPerAI)

      // Genera logo se Replicate è configurato
      try {
        logoUrl = await generator.generaLogoAI(
          pratica.nome_impresa,
          pratica.tipo_attivita ?? '',
          { primario: testi?.colori?.primario ?? '#1a56db', accento: testi?.colori?.accento ?? '#16a34a' }
        )
      } catch { logoUrl = null }

      // Genera HTML e pubblica su Vercel
      const html = generator.generaHTMLSito(datiPerAI, testi, logoUrl ?? undefined)
      try {
        urlPubblicato = await generator.pubblicaSuVercel(
          html,
          `${pratica.nome_impresa}-${pratica.comune_sede}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        )
      } catch (e: any) {
        console.warn('[sito/genera] Vercel publish fallito:', e.message)
      }

      // Genera e archivia guida Google Business
      try {
        const { generaGuidaGoogleBusiness } = generator
        const { salvaDocumento } = await import('@/lib/archivio/ricevute')
        const pdfGuida = await generaGuidaGoogleBusiness({
          nomeImpresa: pratica.nome_impresa,
          settore: pratica.tipo_attivita ?? '',
          comuneSede: pratica.comune_sede,
          provinciaSede: pratica.provincia_sede ?? '',
          indirizzo: datiManuali?.indirizzo,
          telefono: datiManuali?.telefono,
          email: datiManuali?.email ?? '',
          sitoPubblicato: urlPubblicato ?? undefined,
          orari: datiManuali?.orari,
          descrizioneBreve: testi?.descrizione ?? '',
          paroleChiave: testi?.paroleChiaveLocali,
        })
        await salvaDocumento({
          userId: targetUserId,
          praticaId: pratica.id,
          nome: `guida-google-business-${pratica.nome_impresa.replace(/\s/g, '-')}.pdf`,
          descrizione: 'Guida configurazione Google Business Profile',
          tipo: 'altro',
          buffer: pdfGuida,
          mimeType: 'application/pdf',
          tags: ['google-business', 'marketing'],
        })
      } catch (e: any) {
        console.warn('[sito/genera] Guida Google Business fallita:', e.message)
      }

    } catch (e: any) {
      // Generatore AI non disponibile — usa fallback manuale
      console.warn('[sito/genera] Generatore AI non disponibile, uso fallback:', e.message)
      testi = {
        headline: pratica.nome_impresa,
        sottotitolo: `${pratica.tipo_attivita ?? 'Attività'} a ${pratica.comune_sede}`,
        descrizione: datiManuali?.descrizione ?? '',
        servizi: datiManuali?.servizi ?? [],
        telefono: datiManuali?.telefono ?? '',
        email: datiManuali?.email ?? '',
        indirizzo: datiManuali?.indirizzo ?? '',
        orari: datiManuali?.orari ?? '',
        cta: 'Contattaci',
        metaDescription: `${pratica.nome_impresa} — ${pratica.tipo_attivita ?? ''} a ${pratica.comune_sede}`,
      }
    }

    const nomeDominio = urlPubblicato
      ? urlPubblicato.replace('https://', '')
      : `zipra-${pratica.nome_impresa.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.vercel.app`

    // Aggiorna il record sito creato prima
    await admin.from('siti_vetrina').update({
      stato: urlPubblicato ? 'pubblicato' : 'revisione',
      url_pubblicato: urlPubblicato,
      nome_dominio: nomeDominio,
      testi,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', sitoId)

    // Notifica utente target
    await inviaNotifica({
      userId: targetUserId,
      tipo: 'sito_pronto',
      titolo: urlPubblicato ? '🌐 Il tuo sito è online!' : '🌐 Sito in preparazione',
      messaggio: urlPubblicato
        ? `Il sito di ${pratica.nome_impresa} è pronto su ${nomeDominio}. Controlla anche la guida Google Business in email.`
        : `Il sito di ${pratica.nome_impresa} è stato preparato. Il team Zipra lo pubblicherà a breve.`,
      praticaId: pratica.id,
      azioneUrl: `/dashboard/sito/${sitoId}`,
      canali: ['db', 'email'],
    })

    console.log(`[sito/genera] ✅ Completato — sito ${sitoId}`)
  } catch (e: any) {
    console.error('[sito/genera] Errore fatale background:', e.message)
    await admin.from('siti_vetrina')
      .update({ stato: 'errore', updated_at: new Date().toISOString() })
      .eq('id', sitoId)
  }
}