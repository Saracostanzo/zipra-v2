// src/app/api/checkout/webhook/route.ts
// Stripe chiama questo endpoint dopo ogni pagamento completato
// Aggiorna il piano utente e avvia il flusso firma

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { avviaOnboardingFirma } from "@/lib/firma/onboarding";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (e: any) {
    console.error("Stripe webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const {
      piano,
      pratica_id,
      user_id: metaUserId,
      user_email: metaEmail,
    } = session.metadata ?? {};
    const customerEmail = session.customer_details?.email ?? metaEmail;

    if (!customerEmail) {
      console.error("Stripe webhook: email cliente mancante");
      return NextResponse.json({ received: true });
    }

    // Usa user_id dai metadata se disponibile, altrimenti cerca per email
    let userId = metaUserId;
    let profilo: any = null;

    if (userId) {
      const { data } = await supabase
        .from("profiles")
        .select("id, piano, firma_digitale_autorizzata")
        .eq("id", userId)
        .single();
      profilo = data;
    }

    if (!profilo && customerEmail) {
      const { data } = await supabase
        .from("profiles")
        .select("id, piano, firma_digitale_autorizzata")
        .ilike("email", customerEmail ?? "")
        .single();
      profilo = data;
      if (profilo) userId = profilo.id;
    }

    if (!profilo || !userId) {
      console.error("Stripe webhook: utente non trovato", {
        metaUserId,
        customerEmail,
      });
      return NextResponse.json({ received: true });
    }

    // Aggiorna piano
    if (piano && piano !== "singola") {
      await supabase.from("profiles").update({ piano }).eq("id", userId);
    }

    // Aggiorna stato pratica
    if (pratica_id) {
      await supabase
        .from("pratiche")
        .update({
          stato: "in_revisione_admin",
          pagato: true,
          pagato_at: new Date().toISOString(),
          stripe_session_id: session.id,
        })
        .eq("id", pratica_id);
    }

    // Avvia firma SOLO se non ha già firmato
    // (la procura vale per tutte le pratiche — non serve rifirmare)
    if (!profilo.firma_digitale_autorizzata) {
      const importo = piano === "pro" ? 249 : piano === "base" ? 149 : 0;
      await avviaOnboardingFirma({
        userId,
        praticaId: pratica_id || undefined,
        piano: piano ?? "base",
        importo,
      });
    } else {
      // Ha già firmato → sblocca pratica direttamente
      if (pratica_id) {
        await supabase
          .from("pratiche")
          .update({ stato: "in_revisione_admin" })
          .eq("id", pratica_id);
      }
    }

    console.log(
      `[Stripe] Pagamento completato: ${customerEmail} — piano: ${piano}`,
    );
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    console.error("[Stripe] Pagamento fallito:", invoice.customer_email);
    // TODO: notifica utente e metti pratica in pausa
  }

  return NextResponse.json({ received: true });
}
