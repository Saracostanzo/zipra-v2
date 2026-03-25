// src/app/api/checkout/crea-sessione/route.ts
// Crea una sessione Stripe Checkout
// Dopo pagamento Stripe redirecta a success_url con ?session_id=xxx

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

const PRICE_IDS: Record<string, string> = {
  base: process.env.STRIPE_PRICE_BASE ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  mantenimento: process.env.STRIPE_PRICE_MANTENIMENTO ?? "",
  business: process.env.STRIPE_PRICE_BUSINESS ?? "",
  business_pro: process.env.STRIPE_PRICE_BUSINESS_PRO ?? "",
};

export async function POST(req: NextRequest) {
  const {
    piano,
    pratica_id,
    importo,
    success_url,
    cancel_url,
    user_email,
    user_id,
  } = await req.json();

  const supabase = createAdminClient();

  try {
    // Per piani con Price ID Stripe predefinito
    const priceId = PRICE_IDS[piano];

    let session;

    if (priceId) {
      // Base e Pro sono abbonamenti annuali, Mantenimento/Business mensili
      const isSubscription = [
        "base",
        "pro",
        "mantenimento",
        "business",
        "business_pro",
      ].includes(piano);
      session = await stripe.checkout.sessions.create({
        mode: isSubscription ? "subscription" : "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: success_url + "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url,
        metadata: {
          piano,
          pratica_id: pratica_id ?? "",
          user_id: user_id ?? "",
          user_email: user_email ?? "",
        },
        customer_email: user_email || undefined,
        locale: "it",
        billing_address_collection: "required",
      });
    } else {
      // Pratica singola — importo variabile
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: importo * 100, // Stripe vuole i centesimi
              product_data: {
                name: `Zipra — Pratica singola`,
                description: `Apertura pratica`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: success_url + "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url,
        metadata: {
          piano: "singola",
          pratica_id: pratica_id ?? "",
          user_id: user_id ?? "",
          user_email: user_email ?? "",
        },
        customer_email: user_email || undefined,
        locale: "it",
        billing_address_collection: "required",
      });
    }

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (e: any) {
    console.error("Stripe error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
