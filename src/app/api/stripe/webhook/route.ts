// PATH: src/app/api/stripe/webhook/route.ts
//
// Gestisce TUTTI gli eventi Stripe rilevanti:
// checkout.session.completed     → pagamento iniziale ok
// customer.subscription.updated  → cambio stato abbonamento
// customer.subscription.deleted  → abbonamento cancellato definitivamente
// invoice.payment_succeeded      → rinnovo annuale ok
// invoice.payment_failed         → rinnovo fallito → banner rinnova
// invoice.payment_action_required → richiede autenticazione SCA

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { avviaOnboardingFirma } from '@/lib/firma/onboarding'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Mappa stato Stripe → stato interno Zipra
function mappaStatoStripe(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':    return 'attivo'
    case 'trialing':  return 'trial'
    case 'past_due':  return 'scaduto_pagamento'   // pagamento fallito, in retry
    case 'unpaid':    return 'sospeso'              // retry esauriti, accesso bloccato
    case 'canceled':  return 'cancellato'           // cancellato, accesso fino a period_end
    case 'incomplete': return 'incompleto'          // pagamento iniziale fallito
    case 'incomplete_expired': return 'scaduto'     // pagamento iniziale mai completato
    case 'paused':    return 'in_pausa'
    default:          return stripeStatus
  }
}

async function aggiornaStatoAbbonamento(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  subscription: Stripe.Subscription,
  pianoId?: string
) {
  const statoInterno = mappaStatoStripe(subscription.status)
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()
  const cancelAtPeriodEnd = subscription.cancel_at_period_end

  // Se cancellato a fine periodo, il piano rimane attivo fino alla scadenza
  const pianoEffettivo = (statoInterno === 'attivo' || (statoInterno === 'cancellato' && cancelAtPeriodEnd))
    ? (pianoId ?? undefined)
    : undefined

  await supabase.from('profiles').update({
    ...(pianoEffettivo ? { piano: pianoEffettivo } : {}),
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: statoInterno,
    stripe_subscription_period_end: periodEnd,
    stripe_cancel_at_period_end: cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  }).eq('id', userId)

  console.log(`[Stripe webhook] Abbonamento ${subscription.id} → ${statoInterno} per user ${userId}`)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Firma mancante' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    console.error('[Stripe webhook] Firma non valida:', e.message)
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ── 1. CHECKOUT COMPLETATO (primo pagamento) ────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata ?? {}
    const userId = meta.userId
    const pianoId = meta.pianoId || null
    const praticaDbId = meta.praticaDbId || null

    if (!userId) {
      console.error('[Stripe webhook] userId mancante nei metadata')
      return NextResponse.json({ received: true })
    }

    // Idempotenza
    if (praticaDbId) {
      const { data: existing } = await supabase
        .from('pratiche').select('stripe_session_id').eq('id', praticaDbId).single()
      if (existing?.stripe_session_id === session.id) {
        console.log('[Stripe webhook] Già processato, skip')
        return NextResponse.json({ received: true })
      }
    }

    // Aggiorna piano profilo (solo abbonamenti)
    if (pianoId && pianoId !== 'singola') {
      await supabase.from('profiles').update({
        piano: pianoId,
        stripe_subscription_status: 'attivo',
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
    }

    // Aggiorna pratica
    if (praticaDbId) {
      await supabase.from('pratiche').update({
        pagato: true,
        pagato_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stato: 'pagata',
        piano: pianoId ?? 'singola',
      }).eq('id', praticaDbId)
    }

    // Se abbonamento, salva subscription_id
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      await supabase.from('profiles').update({
        stripe_subscription_id: sub.id,
        stripe_subscription_status: mappaStatoStripe(sub.status),
        stripe_subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        stripe_cancel_at_period_end: sub.cancel_at_period_end,
      }).eq('id', userId)
    }

    // Avvia firma Yousign
    const { data: profilo } = await supabase
      .from('profiles').select('firma_digitale_autorizzata, telefono').eq('id', userId).single()

    if (!profilo?.firma_digitale_autorizzata) {
      if (!profilo?.telefono) {
        try {
          await supabase.from('todo_admin').insert({
            tipo: 'procura_firma_manuale', priorita: 'altissima',
            descrizione: `Utente ${userId} ha pagato ma manca il telefono. Invia procura manualmente.`,
            istruzioni: JSON.stringify(['1. Contatta l\'utente per telefono', '2. Usa Reinvia procura dopo che ha aggiunto il telefono']),
            pratica_id: praticaDbId,
          })
        } catch {}
        if (praticaDbId) await supabase.from('pratiche').update({ stato: 'in_revisione_admin' }).eq('id', praticaDbId)
      } else {
        const importo = pianoId === 'pro' ? 249 : pianoId === 'business_pro' ? 299 : pianoId === 'business' ? 199 : pianoId === 'base' ? 149 : 199
        try {
          await avviaOnboardingFirma({ userId, praticaId: praticaDbId ?? undefined, piano: pianoId ?? 'singola', importo })
          if (praticaDbId) await supabase.from('pratiche').update({ stato: 'firma_inviata' }).eq('id', praticaDbId)
        } catch (err: any) {
          console.error('[Stripe webhook] Errore avvio firma:', err.message)
          try {
            await supabase.from('todo_admin').insert({
              tipo: 'procura_firma_manuale', priorita: 'altissima',
              descrizione: `Errore avvio firma per userId=${userId}: ${err.message}`,
              pratica_id: praticaDbId,
            })
          } catch {}
          if (praticaDbId) await supabase.from('pratiche').update({ stato: 'in_revisione_admin' }).eq('id', praticaDbId)
        }
      }
    } else {
      if (praticaDbId) await supabase.from('pratiche').update({ stato: 'in_lavorazione' }).eq('id', praticaDbId)
    }
  }

  // ── 2. ABBONAMENTO AGGIORNATO (cambio stato, cancellazione programmata) ─────
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = await getUserIdDaCustomer(supabase, sub.customer as string)
    if (userId) {
      // Recupera il piano dai metadata o dall'item price
      const pianoId = sub.metadata?.pianoId ?? null
      await aggiornaStatoAbbonamento(supabase, userId, sub, pianoId ?? undefined)

      // Se cancel_at_period_end attivato → lascia piano attivo, aggiorna solo flag
      if (sub.cancel_at_period_end) {
        console.log(`[Stripe webhook] Abbonamento ${sub.id} cancellato a fine periodo per user ${userId}`)
      }

      // Se scaduto pagamento → blocca accesso nuove pratiche (ma non cancella)
      if (sub.status === 'past_due' || sub.status === 'unpaid') {
        await supabase.from('profiles').update({
          stripe_subscription_status: mappaStatoStripe(sub.status),
        }).eq('id', userId)
      }
    }
  }

  // ── 3. ABBONAMENTO ELIMINATO (cancel immediato o dopo period_end) ───────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = await getUserIdDaCustomer(supabase, sub.customer as string)
    if (userId) {
      await supabase.from('profiles').update({
        piano: 'free',
        stripe_subscription_status: 'cancellato',
        stripe_subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        stripe_cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      console.log(`[Stripe webhook] Abbonamento definitivamente cancellato per user ${userId}`)
    }
  }

  // ── 4. RINNOVO RIUSCITO ─────────────────────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    if (invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const userId = await getUserIdDaCustomer(supabase, sub.customer as string)
      if (userId) {
        await supabase.from('profiles').update({
          stripe_subscription_status: 'attivo',
          stripe_subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          stripe_cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }).eq('id', userId)
        console.log(`[Stripe webhook] Rinnovo ok per user ${userId}`)
      }
    }
  }

  // ── 5. RINNOVO FALLITO ──────────────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    if (invoice.subscription) {
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const userId = await getUserIdDaCustomer(supabase, sub.customer as string)
      if (userId) {
        await supabase.from('profiles').update({
          stripe_subscription_status: mappaStatoStripe(sub.status), // past_due
          updated_at: new Date().toISOString(),
        }).eq('id', userId)
        console.error(`[Stripe webhook] Pagamento fallito per user ${userId}`)
        // TODO: invia email all'utente con link per aggiornare metodo di pagamento
      }
    }
  }

  return NextResponse.json({ received: true })
}

// Trova userId dal customer Stripe
async function getUserIdDaCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  // Prima cerca per stripe_customer_id nel profilo
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  if (data?.id) return data.id

  // Fallback: cerca per email tramite Stripe
  try {
    const customer = await new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
      .customers.retrieve(customerId) as Stripe.Customer
    if (customer.email) {
      const { data: byEmail } = await supabase
        .from('profiles').select('id').ilike('email', customer.email).single()
      return byEmail?.id ?? null
    }
  } catch {}
  return null
}