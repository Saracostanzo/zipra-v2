// PATH: src/lib/stripe/index.ts
//
// CONCETTI CHIAVE — mai confonderli:
//   praticaDbId    = UUID del record in tabella `pratiche` (es. "10b79b32-...")
//                    → usato SOLO come metadata Stripe, MAI per cercare il price
//   pianoId        = ID piano abbonamento (es. "base") → determina il priceId Stripe
//   praticaStripeId = ID prodotto Stripe per pratiche singole (es. "apertura_ditta")
//                    → non usato nel flusso wizard (il wizard usa sempre un piano)

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export type PianoId = "base" | "pro" | "mantenimento" | "business" | "business_pro";

export type PraticaStripeId =
  | "apertura_ditta" | "apertura_srl" | "variazione_sede" | "variazione_ateco"
  | "nomina_admin" | "aggiunta_socio" | "aumento_capitale" | "cessazione_ditta"
  | "liquidazione_srl" | "deposito_bilancio" | "suap_modifica" | "rinnovo_sanitario"
  | "trasformazione" | "subentro" | "inps_variazione" | "bar_ristorante"
  | "parrucchiere" | "estetista" | "autoriparatore" | "impiantista" | "taxi_ncc"
  | "mediatore" | "agente_commercio" | "commercio_dettaglio" | "studio_medico"
  | "tatuatore" | "panificio" | "farmacia" | "edilizia";

// Alias retrocompatibilità
export type PraticaId = PraticaStripeId;

// ─── PIANI — usato da checkout/successo per mostrare nome e prezzo ─────────
export const PIANI: Record<PianoId, { nome: string; importo: number; descrizione: string }> = {
  base:         { nome: "Piano Base",     importo: 149, descrizione: "Apertura impresa completa + tutte le variazioni per 12 mesi" },
  pro:          { nome: "Piano Pro",      importo: 249, descrizione: "Piano Base + sito web + Google Business + logo AI" },
  mantenimento: { nome: "Mantenimento",   importo: 29,  descrizione: "Adempimenti annuali, notifiche scadenze, sconto 20% pratiche" },
  business:     { nome: "Business",       importo: 199, descrizione: "Per CAF, commercialisti e patronati" },
  business_pro: { nome: "Business Pro",   importo: 299, descrizione: "Business + siti vetrina illimitati" },
};

// ─── creaCheckoutSession ──────────────────────────────────────────────────────
export async function creaCheckoutSession({
  userId,
  email,
  pianoId,
  praticaStripeId,
  praticaDbId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  pianoId?: PianoId | null;
  praticaStripeId?: PraticaStripeId | null;  // per pratiche singole fuori wizard
  praticaDbId?: string | null;               // UUID db — SOLO metadata, mai per price
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  let priceId: string | undefined;
  let mode: "payment" | "subscription" = "payment";

  // ── Abbonamento (flusso wizard) ───────────────────────────────────────────
  if (pianoId) {
    mode = "subscription";
    const map: Record<PianoId, string> = {
      base:         process.env.STRIPE_PRICE_BASE!,
      pro:          process.env.STRIPE_PRICE_PRO!,
      mantenimento: process.env.STRIPE_PRICE_MANTENIMENTO!,
      business:     process.env.STRIPE_PRICE_BUSINESS!,
      business_pro: process.env.STRIPE_PRICE_BUSINESS_PRO!,
    };
    priceId = map[pianoId];
    if (!priceId) throw new Error(
      `Price ID mancante per piano "${pianoId}". Controlla STRIPE_PRICE_${pianoId.toUpperCase()} su Vercel.`
    );
  }

  // ── Pratica singola (solo se non è abbonamento) ───────────────────────────
  if (!pianoId && praticaStripeId) {
    mode = "payment";
    const map: Record<PraticaStripeId, string> = {
      apertura_ditta:       process.env.STRIPE_PRICE_APERTURA_DITTA!,
      apertura_srl:         process.env.STRIPE_PRICE_APERTURA_SRL!,
      variazione_sede:      process.env.STRIPE_PRICE_VARIAZIONE_SEDE!,
      variazione_ateco:     process.env.STRIPE_PRICE_VARIAZIONE_ATECO!,
      nomina_admin:         process.env.STRIPE_PRICE_NOMINA_ADMIN!,
      aggiunta_socio:       process.env.STRIPE_PRICE_AGGIUNTA_SOCIO!,
      aumento_capitale:     process.env.STRIPE_PRICE_AUMENTO_CAPITALE!,
      cessazione_ditta:     process.env.STRIPE_PRICE_CESSAZIONE_DITTA!,
      liquidazione_srl:     process.env.STRIPE_PRICE_LIQUIDAZIONE_SRL!,
      deposito_bilancio:    process.env.STRIPE_PRICE_DEPOSITO_BILANCIO!,
      suap_modifica:        process.env.STRIPE_PRICE_SUAP_MODIFICA!,
      rinnovo_sanitario:    process.env.STRIPE_PRICE_RINNOVO_SANITARIO!,
      trasformazione:       process.env.STRIPE_PRICE_TRASFORMAZIONE!,
      subentro:             process.env.STRIPE_PRICE_SUBENTRO!,
      inps_variazione:      process.env.STRIPE_PRICE_INPS_VARIAZIONE!,
      bar_ristorante:       process.env.STRIPE_PRICE_BAR_RISTORANTE!,
      parrucchiere:         process.env.STRIPE_PRICE_PARRUCCHIERE!,
      estetista:            process.env.STRIPE_PRICE_ESTETISTA!,
      autoriparatore:       process.env.STRIPE_PRICE_AUTORIPARATORE!,
      impiantista:          process.env.STRIPE_PRICE_IMPIANTISTA!,
      taxi_ncc:             process.env.STRIPE_PRICE_TAXI_NCC!,
      mediatore:            process.env.STRIPE_PRICE_MEDIATORE!,
      agente_commercio:     process.env.STRIPE_PRICE_AGENTE_COMMERCIO!,
      commercio_dettaglio:  process.env.STRIPE_PRICE_COMMERCIO_DETTAGLIO!,
      studio_medico:        process.env.STRIPE_PRICE_STUDIO_MEDICO!,
      tatuatore:            process.env.STRIPE_PRICE_TATUATORE!,
      panificio:            process.env.STRIPE_PRICE_PANIFICIO!,
      farmacia:             process.env.STRIPE_PRICE_FARMACIA!,
      edilizia:             process.env.STRIPE_PRICE_EDILIZIA!,
    };
    priceId = map[praticaStripeId];
    if (!priceId) throw new Error(`Price ID mancante per pratica "${praticaStripeId}".`);
  }

  if (!priceId) throw new Error("Né pianoId né praticaStripeId forniti.");

  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: email,
    locale: "it",
    billing_address_collection: "required",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      pianoId:      pianoId ?? "",
      praticaDbId:  praticaDbId ?? "",   // UUID database — letto dal webhook
    },
  });

  return session.url!;
}

export default stripe;