// PATH: src/app/api/firma/verifica/route.ts
//
// Verifica stato firma su Yousign e aggiorna DB automaticamente.
// Se deleghe è vuota, cerca direttamente su Yousign per external_id.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE = process.env.YOUSIGN_SANDBOX === 'true'
  ? 'https://api-sandbox.yousign.app/v3'
  : 'https://api.yousign.app/v3'

const H = () => ({
  Authorization: `Bearer ${process.env.YOUSIGN_API_KEY!}`,
  'Content-Type': 'application/json',
})

async function getStatoDaYousign(requestId: string) {
  try {
    const res = await fetch(`${BASE}/signature_requests/${requestId}`, { headers: H() })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 'done') return { stato: 'firmata', dataFirma: data.signers?.[0]?.signed_at }
    if (data.status === 'ongoing') return { stato: 'in_attesa' }
    if (data.status === 'expired' || data.status === 'canceled') return { stato: 'scaduta' }
    return null
  } catch { return null }
}

async function cercaRichiestaPerExternalId(externalId: string): Promise<string | null> {
  try {
    // Yousign v3 permette di filtrare per external_id
    const res = await fetch(
      `${BASE}/signature_requests?external_id=${encodeURIComponent(externalId)}&limit=1`,
      { headers: H() }
    )
    if (!res.ok) return null
    const data = await res.json()
    const requests = data?.data ?? data?.signature_requests ?? []
    if (requests.length > 0) return requests[0].id
    return null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, praticaId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId mancante' }, { status: 400 })

    const supabase = createAdminClient()

    // ── 1. Prova prima con le deleghe nel DB ────────────────────────────
    const { data: deleghe } = await supabase
      .from('deleghe')
      .select('id, tipo, yousign_signature_request_id, stato')
      .eq('user_id', userId)
      .in('stato', ['inviata_firma', 'in_attesa'])
      .order('created_at', { ascending: false })

    if (deleghe && deleghe.length > 0) {
      for (const delega of deleghe) {
        if (!delega.yousign_signature_request_id) continue
        const stato = await getStatoDaYousign(delega.yousign_signature_request_id)

        if (stato?.stato === 'firmata') {
          await supabase.from('deleghe')
            .update({ stato: 'firmata', data_firma: stato.dataFirma ?? new Date().toISOString() })
            .eq('id', delega.id)

          if (delega.tipo === 'procura_speciale') {
            await supabase.from('profiles')
              .update({ firma_digitale_autorizzata: true })
              .eq('id', userId)
            if (praticaId) {
              await supabase.from('pratiche')
                .update({ stato: 'in_revisione_admin' })
                .eq('id', praticaId)
            }
          }

          if (delega.tipo === 'contratto_servizio') {
            const { data: procuraEsistente } = await supabase
              .from('deleghe').select('id')
              .eq('user_id', userId).eq('tipo', 'procura_speciale').maybeSingle()
            if (!procuraEsistente) {
              try {
                await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/onboarding/firma/solo-procura`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: userId, pratica_id: praticaId }),
                })
              } catch {}
            }
          }
        }
      }

      const { data: profiloAggiornato } = await supabase
        .from('profiles').select('firma_digitale_autorizzata').eq('id', userId).single()

      return NextResponse.json({
        firmato: profiloAggiornato?.firma_digitale_autorizzata ?? false,
        messaggio: profiloAggiornato?.firma_digitale_autorizzata
          ? 'Firma verificata e registrata!'
          : 'Firma non ancora completata. Controlla la tua email.',
      })
    }

    // ── 2. Deleghe vuote — cerca direttamente su Yousign per external_id ──
    console.log('[firma/verifica] Deleghe vuote, cerco su Yousign per external_id...')

    // Pattern external_id usati in avviaOnboardingFirma
    const externalIds = [
      `procura-${userId}`,
      `contratto-${userId}`,
    ]

    for (const extId of externalIds) {
      const requestId = await cercaRichiestaPerExternalId(extId)
      if (!requestId) continue

      console.log(`[firma/verifica] Trovata richiesta ${requestId} per external_id ${extId}`)
      const stato = await getStatoDaYousign(requestId)

      if (stato?.stato === 'firmata') {
        const tipo = extId.startsWith('procura') ? 'procura_speciale' : 'contratto_servizio'

        // Salva la delega nel DB per future verifiche
        await supabase.from('deleghe').upsert({
          user_id: userId,
          pratica_id: praticaId ?? null,
          tipo,
          yousign_signature_request_id: requestId,
          stato: 'firmata',
          data_firma: stato.dataFirma ?? new Date().toISOString(),
        }, { onConflict: 'yousign_signature_request_id' })

        if (tipo === 'procura_speciale') {
          await supabase.from('profiles')
            .update({ firma_digitale_autorizzata: true })
            .eq('id', userId)
          if (praticaId) {
            await supabase.from('pratiche')
              .update({ stato: 'in_revisione_admin' })
              .eq('id', praticaId)
          }

          const { data: profilo } = await supabase
            .from('profiles').select('firma_digitale_autorizzata').eq('id', userId).single()
          return NextResponse.json({
            firmato: true,
            messaggio: 'Firma verificata e registrata! La dashboard si aggiornerà.',
          })
        }

        // Contratto firmato ma procura non ancora trovata
        return NextResponse.json({
          firmato: false,
          messaggio: 'Contratto firmato ✓ — aspetta qualche minuto e riceverai la procura speciale via email.',
        })
      }

      if (stato?.stato === 'in_attesa') {
        return NextResponse.json({
          firmato: false,
          messaggio: 'La firma non è ancora completata. Controlla la tua email e usa il link Yousign.',
        })
      }
    }

    // ── 3. Niente trovato — controlla se è già firmata nel profilo ─────
    const { data: profilo } = await supabase
      .from('profiles').select('firma_digitale_autorizzata').eq('id', userId).single()

    if (profilo?.firma_digitale_autorizzata) {
      return NextResponse.json({ firmato: true, messaggio: 'Firma già registrata.' })
    }

    return NextResponse.json({
      firmato: false,
      messaggio: 'Nessuna firma trovata su Yousign. Usa il link nell\'email ricevuta per firmare, poi riprova.',
    })
  } catch (e: any) {
    console.error('[firma/verifica]', e)
    return NextResponse.json({ error: e.message ?? 'Errore' }, { status: 500 })
  }
}