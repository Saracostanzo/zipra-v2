// PATH: src/app/api/stripe/webhook/route.ts
//
// Riceve eventi Stripe dopo pagamenti.
// Legge metadata: { userId, pianoId, praticaDbId }
// Aggiorna pratica, avvia firma Yousign.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { avviaOnboardingFirma } from "@/lib/firma/onboarding";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "Firma mancante" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error("[Stripe webhook] Firma non valida:", e.message);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    const userId      = meta.userId;
    const pianoId     = meta.pianoId || null;
    const praticaDbId = meta.praticaDbId || null;

    console.log("[Stripe webhook] checkout.session.completed", { userId, pianoId, praticaDbId });

    if (!userId) {
      console.error("[Stripe webhook] userId mancante nei metadata — skip");
      return NextResponse.json({ received: true });
    }

    // ── Idempotenza ────────────────────────────────────────────────────────
    if (praticaDbId) {
      const { data: existing } = await supabase
        .from("pratiche").select("stripe_session_id").eq("id", praticaDbId).single();
      if (existing?.stripe_session_id === session.id) {
        console.log("[Stripe webhook] Già processato, skip");
        return NextResponse.json({ received: true });
      }
    }

    // ── Aggiorna piano profilo (solo abbonamenti) ──────────────────────────
    if (pianoId && pianoId !== "singola") {
      await supabase.from("profiles")
        .update({ piano: pianoId, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // ── Aggiorna pratica → "pagata" + salva piano reale pagato ────────────
    if (praticaDbId) {
      await supabase.from("pratiche").update({
        pagato: true,
        pagato_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stato: "pagata",
        piano: pianoId ?? "singola",  // salva il piano reale — non il default "base" del wizard
      }).eq("id", praticaDbId);
    }

    // ── Avvia firma Yousign ────────────────────────────────────────────────
    const { data: profilo } = await supabase
      .from("profiles").select("firma_digitale_autorizzata, telefono").eq("id", userId).single();

    if (!profilo?.firma_digitale_autorizzata) {
      if (!profilo?.telefono) {
        console.warn("[Stripe webhook] Telefono mancante per", userId);
        try {
          await supabase.from("todo_admin").insert({
            tipo: "procura_firma_manuale",
            priorita: "altissima",
            descrizione: `Utente ${userId} ha pagato ma manca il telefono nel profilo. Invia procura manualmente.`,
            istruzioni: JSON.stringify([
              "1. Contatta l'utente e chiedigli di aggiungere il numero di telefono nel profilo",
              "2. Vai su /admin e usa 'Reinvia procura' dopo che ha aggiunto il telefono",
            ]),
            pratica_id: praticaDbId,
          });
        } catch {}
        if (praticaDbId) {
          await supabase.from("pratiche").update({ stato: "in_revisione_admin" }).eq("id", praticaDbId);
        }
      } else {
        // Calcola importo corretto in base al piano reale
        const importo = pianoId === "pro" ? 249
          : pianoId === "business_pro" ? 299
          : pianoId === "business" ? 199
          : pianoId === "base" ? 149
          : 199  // singola default

        try {
          await avviaOnboardingFirma({
            userId,
            praticaId: praticaDbId ?? undefined,
            piano: pianoId ?? "singola",
            importo,
          });
          if (praticaDbId) {
            await supabase.from("pratiche").update({ stato: "firma_inviata" }).eq("id", praticaDbId);
          }
          console.log("[Stripe webhook] Firma avviata per", userId);
        } catch (err: any) {
          console.error("[Stripe webhook] Errore avvio firma:", err.message);
          try {
            await supabase.from("todo_admin").insert({
              tipo: "procura_firma_manuale",
              priorita: "altissima",
              descrizione: `Errore avvio firma per userId=${userId}: ${err.message}`,
              istruzioni: JSON.stringify([
                "1. Verifica YOUSIGN_API_KEY su Vercel",
                "2. Verifica telefono nel profilo utente",
                "3. Usa 'Reinvia procura' dall'admin panel",
              ]),
              pratica_id: praticaDbId,
            });
          } catch {}
          if (praticaDbId) {
            await supabase.from("pratiche").update({ stato: "in_revisione_admin" }).eq("id", praticaDbId);
          }
        }
      }
    } else {
      // Già firmato → sblocca direttamente
      if (praticaDbId) {
        await supabase.from("pratiche").update({ stato: "in_lavorazione" }).eq("id", praticaDbId);
      }
    }

    console.log(`[Stripe webhook] OK → user:${userId} piano:${pianoId} pratica:${praticaDbId}`);
  }

  if (event.type === "invoice.payment_failed") {
    console.error("[Stripe webhook] Pagamento fallito:", event.data.object);
  }

  return NextResponse.json({ received: true });
}