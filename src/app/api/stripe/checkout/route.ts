// PATH: src/app/api/stripe/checkout/route.ts
//
// Body atteso dal frontend:
//   pianoId    — "base"|"pro"|... per abbonamenti (wizard)
//   praticaDbId — UUID database pratica (metadata only, non price lookup)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { creaCheckoutSession, PianoId, PraticaStripeId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato — effettua il login" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 }) }

  const { pianoId, praticaDbId, praticaStripeId } = body;

  if (!pianoId && !praticaStripeId) {
    return NextResponse.json(
      { error: "Specifica pianoId (abbonamento) oppure praticaStripeId (pratica singola)" },
      { status: 400 }
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://zipra-v2.vercel.app";

  try {
    const url = await creaCheckoutSession({
      userId: user.id,
      email: user.email!,
      pianoId: pianoId as PianoId ?? null,
      praticaStripeId: praticaStripeId as PraticaStripeId ?? null,
      praticaDbId: praticaDbId ?? null,
      successUrl: `${origin}/checkout/successo?piano=${pianoId ?? ""}&pratica=${praticaDbId ?? ""}`,
      cancelUrl: `${origin}/checkout/annullato`,
    });
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("[Stripe checkout]", e?.message, { pianoId, praticaDbId, userId: user.id });
    return NextResponse.json({ error: e?.message ?? "Errore creazione checkout" }, { status: 500 });
  }
}