// PATH: src/app/api/stripe/checkout/route.ts
//
// Body atteso:
//   pianoId    — "base"|"pro"|... per abbonamenti
//   praticaId — UUID database pratica (solo metadata, MAI per price lookup)
//   singola     — "true" per pratica singola a pagamento variabile

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { creaCheckoutSession, PianoId } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato — effettua il login' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 }) }

  const { pianoId, praticaId, singola } = body

  if (!pianoId && !singola) {
    return NextResponse.json(
      { error: 'Specifica pianoId (abbonamento) oppure singola=true (pratica singola)' },
      { status: 400 }
    )
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zipra-v2.vercel.app'

  try {
    let url: string

    if (singola === 'true' || singola === true) {
      // Pratica singola — recupera importo dalla pratica
      let importo = 199 // default
      if (praticaId) {
        const { data: pratica } = await supabase
          .from('pratiche')
          .select('tipo_attivita, nome_impresa')
          .eq('id', praticaId)
          .single()
        if (pratica?.tipo_attivita?.toLowerCase().includes('srl')) importo = 299
      }

      // Crea sessione Stripe con importo variabile
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email!,
        locale: 'it',
        billing_address_collection: 'required',
        line_items: [{
          price_data: {
            currency: 'eur',
            unit_amount: importo * 100,
            product_data: {
              name: 'Zipra — Pratica singola',
              description: 'Apertura e gestione pratica amministrativa',
            },
          },
          quantity: 1,
        }],
        success_url: `${origin}/checkout/successo?piano=singola&pratica=${praticaId ?? ''}`,
        cancel_url: `${origin}/checkout/annullato`,
        metadata: {
          userId: user.id,
          pianoId: 'singola',
          praticaId: praticaId ?? '',
        },
      })

      url = session.url!
    } else {
      // Abbonamento
      url = await creaCheckoutSession({
        userId: user.id,
        email: user.email!,
        pianoId: pianoId as PianoId,
        praticaId: praticaId ?? null,
        successUrl: `${origin}/checkout/successo?piano=${pianoId}&pratica=${praticaId ?? ''}`,
        cancelUrl: `${origin}/checkout/annullato`,
      })
    }

    return NextResponse.json({ url })
  } catch (e: any) {
    console.error('[Stripe checkout]', e?.message, { pianoId, praticaId, userId: user.id })
    return NextResponse.json({ error: e?.message ?? 'Errore creazione checkout' }, { status: 500 })
  }
}