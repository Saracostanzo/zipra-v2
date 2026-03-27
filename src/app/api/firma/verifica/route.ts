// PATH: src/app/api/firma/verifica/route.ts
//
// Verifica firma su Yousign e aggiorna DB.
// In sandbox (no webhook) chiama inviaProccuraSpeciale direttamente
// quando trova il contratto firmato.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviaProccuraSpeciale } from '@/lib/firma/onboarding'

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
    const res = await fetch(
      `${BASE}/signature_requests?external_id=${encodeURIComponent(externalId)}&limit=1`,
      { headers: H() }
    )
    if (!res.ok) return null
    const data = await res.json()
    const requests = data?.data ?? data?.signature_requests ?? []
    return requests.length > 0 ? requests[0].id : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, praticaId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId mancante' }, { status: 400 })

    const supabase = createAdminClient()

    // ── 1. Cerca deleghe in attesa nel DB ──────────────────────────────────
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
        if (stato?.stato !== 'firmata') continue

        // Aggiorna delega
        await supabase.from('deleghe')
          .update({ stato: 'firmata', data_firma: stato.dataFirma ?? new Date().toISOString() })
          .eq('id', delega.id)

        if (delega.tipo === 'contratto_servizio') {
          // Contratto firmato → invia procura speciale direttamente (no webhook in sandbox)
          const { data: procuraEsistente } = await supabase
            .from('deleghe').select('id').eq('user_id', userId).eq('tipo', 'procura_speciale').maybeSingle()

          if (!procuraEsistente) {
            console.log('[firma/verifica] Contratto firmato → avvio procura speciale...')
            try {
              await inviaProccuraSpeciale({ userId, praticaId: praticaId ?? undefined })
            } catch (e: any) {
              console.error('[firma/verifica] Errore invio procura:', e.message)
            }
          }

          return NextResponse.json({
            firmato: false,
            messaggio: '✅ Contratto firmato! Ti abbiamo inviato la procura speciale via email. Firmala e torna qui per verificare.',
          })
        }

        if (delega.tipo === 'procura_speciale') {
          await supabase.from('profiles').update({ firma_digitale_autorizzata: true }).eq('id', userId)
          if (praticaId) {
            await supabase.from('pratiche').update({ stato: 'in_revisione_admin' }).eq('id', praticaId)
          }
          return NextResponse.json({ firmato: true, messaggio: '✅ Procura firmata! La dashboard si aggiornerà.' })
        }
      }

      const { data: profiloAggiornato } = await supabase.from('profiles').select('firma_digitale_autorizzata').eq('id', userId).single()
      return NextResponse.json({
        firmato: profiloAggiornato?.firma_digitale_autorizzata ?? false,
        messaggio: profiloAggiornato?.firma_digitale_autorizzata
          ? '✅ Firma verificata!'
          : 'Firma non ancora completata. Controlla la tua email.',
      })
    }

    // ── 2. Niente in DB → cerca su Yousign per external_id ────────────────
    console.log('[firma/verifica] Deleghe vuote, cerco su Yousign per external_id...')

    for (const extId of [`procura-${userId}`, `contratto-${userId}`]) {
      const requestId = await cercaRichiestaPerExternalId(extId)
      if (!requestId) continue

      const stato = await getStatoDaYousign(requestId)

      if (stato?.stato === 'firmata') {
        const tipo = extId.startsWith('procura') ? 'procura_speciale' : 'contratto_servizio'

        // Salva delega nel DB
        await supabase.from('deleghe').upsert({
          user_id: userId,
          pratica_id: praticaId ?? null,
          tipo,
          yousign_signature_request_id: requestId,
          stato: 'firmata',
          data_firma: stato.dataFirma ?? new Date().toISOString(),
        }, { onConflict: 'yousign_signature_request_id' })

        if (tipo === 'procura_speciale') {
          await supabase.from('profiles').update({ firma_digitale_autorizzata: true }).eq('id', userId)
          if (praticaId) await supabase.from('pratiche').update({ stato: 'in_revisione_admin' }).eq('id', praticaId)
          return NextResponse.json({ firmato: true, messaggio: '✅ Procura firmata! La dashboard si aggiornerà.' })
        }

        if (tipo === 'contratto_servizio') {
          // Contratto trovato e firmato → invia procura
          const { data: procuraEsistente } = await supabase
            .from('deleghe').select('id').eq('user_id', userId).eq('tipo', 'procura_speciale').maybeSingle()
          if (!procuraEsistente) {
            try {
              await inviaProccuraSpeciale({ userId, praticaId: praticaId ?? undefined })
            } catch (e: any) {
              console.error('[firma/verifica] Errore invio procura (external_id path):', e.message)
            }
          }
          return NextResponse.json({
            firmato: false,
            messaggio: '✅ Contratto firmato! Ti abbiamo inviato la procura speciale via email. Firmala e torna qui.',
          })
        }
      }

      if (stato?.stato === 'in_attesa') {
        return NextResponse.json({
          firmato: false,
          messaggio: 'La firma non è ancora completata. Usa il link nell\'email Yousign.',
        })
      }
    }

    // ── 3. Controlla se già firmato nel profilo ────────────────────────────
    const { data: profilo } = await supabase.from('profiles').select('firma_digitale_autorizzata').eq('id', userId).single()
    if (profilo?.firma_digitale_autorizzata) {
      return NextResponse.json({ firmato: true, messaggio: 'Firma già registrata.' })
    }

    return NextResponse.json({
      firmato: false,
      messaggio: 'Nessuna firma trovata su Yousign. Apri il link nell\'email ricevuta e firma, poi riprova.',
    })
  } catch (e: any) {
    console.error('[firma/verifica]', e)
    return NextResponse.json({ error: e.message ?? 'Errore server' }, { status: 500 })
  }
}