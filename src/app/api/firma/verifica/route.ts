// PATH: src/app/api/firma/verifica/route.ts
// Verifica stato firma su Yousign e aggiorna DB automaticamente.
// Necessario in sandbox perché Yousign sandbox non supporta webhook.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStatoFirma } from '@/lib/yousign'

export async function POST(req: NextRequest) {
  try {
    const { userId, praticaId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId mancante' }, { status: 400 })

    const supabase = createAdminClient()

    // Cerca deleghe in attesa di firma
    const { data: deleghe } = await supabase
      .from('deleghe')
      .select('id, tipo, yousign_signature_request_id, stato')
      .eq('user_id', userId)
      .in('stato', ['inviata_firma', 'in_attesa'])
      .order('created_at', { ascending: false })

    if (!deleghe || deleghe.length === 0) {
      const { data: profilo } = await supabase
        .from('profiles')
        .select('firma_digitale_autorizzata')
        .eq('id', userId)
        .single()
      return NextResponse.json({
        firmato: profilo?.firma_digitale_autorizzata ?? false,
        messaggio: profilo?.firma_digitale_autorizzata
          ? 'Firma già registrata'
          : 'Nessuna firma in attesa trovata',
      })
    }

    for (const delega of deleghe) {
      if (!delega.yousign_signature_request_id) continue
      const stato = await getStatoFirma(delega.yousign_signature_request_id)

      if (stato?.stato === 'firmata') {
        await supabase
          .from('deleghe')
          .update({ stato: 'firmata', data_firma: stato.dataFirma ?? new Date().toISOString() })
          .eq('id', delega.id)

        if (delega.tipo === 'procura_speciale') {
          await supabase
            .from('profiles')
            .update({ firma_digitale_autorizzata: true })
            .eq('id', userId)

          if (praticaId) {
            await supabase
              .from('pratiche')
              .update({ stato: 'in_revisione_admin' })
              .eq('id', praticaId)
          }
        }

        if (delega.tipo === 'contratto_servizio') {
          const { data: procuraEsistente } = await supabase
            .from('deleghe')
            .select('id')
            .eq('user_id', userId)
            .eq('tipo', 'procura_speciale')
            .maybeSingle()

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
      .from('profiles')
      .select('firma_digitale_autorizzata')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      firmato: profiloAggiornato?.firma_digitale_autorizzata ?? false,
      messaggio: profiloAggiornato?.firma_digitale_autorizzata
        ? 'Firma verificata e registrata!'
        : 'Firma non ancora completata. Controlla la tua email.',
    })
  } catch (e: any) {
    console.error('[firma/verifica]', e)
    return NextResponse.json({ error: e.message ?? 'Errore' }, { status: 500 })
  }
}