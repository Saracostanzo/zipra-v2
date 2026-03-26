// PATH: src/app/api/pratiche/invia-revisione/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { praticaId } = await req.json()
  if (!praticaId) return NextResponse.json({ error: 'praticaId mancante' }, { status: 400 })

  const admin = createAdminClient()

  const { data: pratica } = await admin
    .from('pratiche')
    .select('id, stato, user_id, nome_impresa')
    .eq('id', praticaId)
    .eq('user_id', user.id)
    .single()

  if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

  const statiValidi = ['bozza', 'pagata', 'firma_inviata']
  if (!statiValidi.includes(pratica.stato)) {
    return NextResponse.json({ error: `Pratica già in stato "${pratica.stato}"` }, { status: 400 })
  }

  const { error } = await admin
    .from('pratiche')
    .update({ stato: 'in_revisione_admin', updated_at: new Date().toISOString() })
    .eq('id', praticaId)

  if (error) return NextResponse.json({ error: 'Errore aggiornamento pratica' }, { status: 500 })

  try {
    await admin.from('todo_admin').insert({
      tipo: 'pratica_da_revisionare',
      priorita: 'alta',
      descrizione: `Pratica "${pratica.nome_impresa}" inviata in revisione dall'utente.`,
      istruzioni: JSON.stringify([
        `1. Vai su /admin/pratiche/${praticaId}`,
        '2. Controlla i documenti caricati',
        '3. Avvia le pratiche presso gli enti',
      ]),
      pratica_id: praticaId,
    })
  } catch {}

  return NextResponse.json({ ok: true, nuovoStato: 'in_revisione_admin' })
}