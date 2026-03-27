// PATH: src/app/api/abbonamento/annulla/route.ts
//
// Cancella l'abbonamento Stripe con cancel_at_period_end=true
// → il piano rimane attivo fino alla data di scadenza
// → dopo la scadenza Stripe invia subscription.deleted e noi mettiamo piano=free

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
    .select('stripe_subscription_id, piano, stripe_subscription_period_end')
    .eq('id', user.id)
    .single()

  if (!profilo?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Nessun abbonamento attivo trovato' }, { status: 400 })
  }

  try {
    // Cancella a fine periodo — non subito
    const sub = await stripe.subscriptions.update(profilo.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Aggiorna DB
    await admin.from('profiles').update({
      stripe_cancel_at_period_end: true,
      stripe_subscription_status: 'cancellato', // interno: cancellato ma ancora attivo
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    const scadenza = new Date(sub.current_period_end * 1000).toLocaleDateString('it-IT')

    return NextResponse.json({
      ok: true,
      messaggio: `Abbonamento cancellato. Continui ad avere accesso completo fino al ${scadenza}.`,
      scadenza: new Date(sub.current_period_end * 1000).toISOString(),
    })
  } catch (e: any) {
    console.error('[annulla abbonamento]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}