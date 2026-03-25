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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    console.error("Stripe webhook signature error:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 💣 EVENTO PRINCIPALE
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata || {};

    const userId = metadata.userId;
    const pianoId = metadata.pianoId;
    const praticaId = metadata.praticaId;

    const email = session.customer_details?.email;

    if (!userId) {
      console.error("Webhook: userId mancante");
      return NextResponse.json({ received: true });
    }

    // 🧠 IDMPOTENZA → evita doppie esecuzioni
    if (praticaId) {
      const { data: pratica } = await supabase
        .from("pratiche")
        .select("stripe_session_id")
        .eq("id", praticaId)
        .single();

      if (pratica?.stripe_session_id === session.id) {
        console.log("Webhook già processato, skip");
        return NextResponse.json({ received: true });
      }
    }

    // 🔹 AGGIORNA PIANO (se abbonamento)
    if (pianoId) {
      await supabase
        .from("profiles")
        .update({
          piano: pianoId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    // 🔹 AGGIORNA PRATICA (pagata)
    if (praticaId) {
      await supabase
        .from("pratiche")
        .update({
          pagato: true,
          pagato_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stato: "pagata", // 🔥 stato corretto
        })
        .eq("id", praticaId);
    }

    // 🔹 RECUPERA PROFILO
    const { data: profilo } = await supabase
      .from("profiles")
      .select("firma_digitale_autorizzata")
      .eq("id", userId)
      .single();

    // 🔹 AVVIA FIRMA
    if (!profilo?.firma_digitale_autorizzata) {
      console.log("Avvio firma digitale...");

      await avviaOnboardingFirma({
        userId,
        praticaId: praticaId || undefined,
        piano: pianoId || "base",
        importo: 0,
      });

      // stato firma
      if (praticaId) {
        await supabase
          .from("pratiche")
          .update({ stato: "firma_inviata" })
          .eq("id", praticaId);
      }
    } else {
      // 🔥 già firmato → vai avanti subito
      if (praticaId) {
        await supabase
          .from("pratiche")
          .update({ stato: "in_lavorazione" })
          .eq("id", praticaId);
      }
    }

    console.log(
      `[Stripe] OK pagamento → user: ${userId} piano: ${pianoId} pratica: ${praticaId}`
    );
  }

  // 🔴 PAGAMENTO FALLITO
  if (event.type === "invoice.payment_failed") {
    console.error("[Stripe] pagamento fallito");
  }

  return NextResponse.json({ received: true });
}