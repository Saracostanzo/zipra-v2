// src/app/api/onboarding/firma/solo-procura/route.ts
// Usata quando l'utente ha già un'attività aperta e firma digitale
// Invia solo la procura speciale — salta il contratto di servizio

import { NextRequest, NextResponse } from 'next/server'
import { inviaProccuraSpeciale } from '@/lib/firma/onboarding'

export async function POST(req: NextRequest) {
  const { user_id, pratica_id } = await req.json()

  if (!user_id) {
    return NextResponse.json({ error: 'user_id obbligatorio' }, { status: 400 })
  }

  try {
    await inviaProccuraSpeciale({ userId: user_id, praticaId: pratica_id })
    return NextResponse.json({
      ok: true,
      messaggio: 'Procura speciale inviata via email. Firma in 30 secondi.',
    })
  } catch (e: any) {
    console.error('Errore solo-procura:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}