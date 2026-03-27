// PATH: src/app/api/abbonamento/riattiva/route.ts
//
// Riattiva un abbonamento che era stato cancellato a fine periodo
// (se ancora dentro il periodo pagato)

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profilo } = await admin
    .from('profiles')
    .select('stripe_subscription_id, stripe_cancel_at_period_end')
    .eq('id', user.id)
    .single()

  if (!profilo?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Nessun abbonamento trovato' }, { status: 400 })
  }

  if (!profilo.stripe_cancel_at_period_end) {
    return NextResponse.json({ error: 'L\'abbonamento non è in stato di cancellazione' }, { status: 400 })
  }

  try {
    await stripe.subscriptions.update(profilo.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    await admin.from('profiles').update({
      stripe_cancel_at_period_end: false,
      stripe_subscription_status: 'attivo',
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    return NextResponse.json({ ok: true, messaggio: 'Abbonamento riattivato. Il rinnovo automatico è stato ripristinato.' })
  } catch (e: any) {
    console.error('[riattiva abbonamento]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}