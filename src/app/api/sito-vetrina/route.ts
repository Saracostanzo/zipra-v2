// PATH: src/app/api/sito-vetrina/route.ts
//
// ⚠️  DEPRECATO — usa /api/sito/genera invece.
// Questo file esiste solo per retrocompatibilità con eventuali chiamate vecchie.
// Rimanda tutto a /api/sito/genera con gli stessi parametri.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Trasla il vecchio formato { praticaId, datiAggiuntivi } nel nuovo { praticaId, datiManuali }
  const nuovoBody = {
    praticaId: body.praticaId,
    datiManuali: body.datiManuali ?? body.datiAggiuntivi ?? null,
    clienteUserId: body.clienteUserId ?? null,
    businessId: body.businessId ?? null,
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const res = await fetch(`${origin}/api/sito/genera`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' },
    body: JSON.stringify(nuovoBody),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}