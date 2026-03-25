import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

// 🔹 PIANI REALI (solo quelli che hai davvero)
export type PianoId =
  | "base"
  | "pro"
  | "mantenimento"
  | "business"
  | "business_pro";

// 🔹 PRATICHE
export type PraticaId =
  | "apertura_ditta"
  | "apertura_srl"
  | "variazione_sede"
  | "variazione_ateco"
  | "nomina_admin"
  | "aggiunta_socio"
  | "aumento_capitale"
  | "cessazione_ditta"
  | "liquidazione_srl"
  | "deposito_bilancio"
  | "suap_modifica"
  | "rinnovo_sanitario"
  | "trasformazione"
  | "subentro"
  | "inps_variazione"
  | "bar_ristorante"
  | "parrucchiere"
  | "estetista"
  | "autoriparatore"
  | "impiantista"
  | "taxi_ncc"
  | "mediatore"
  | "agente_commercio"
  | "commercio_dettaglio"
  | "studio_medico"
  | "tatuatore"
  | "panificio"
  | "farmacia"
  | "edilizia";

type CheckoutParams = {
  userId: string;
  email: string;
  pianoId?: PianoId | null;
  praticaId?: PraticaId | null;
  successUrl: string;
  cancelUrl: string;
};

export async function creaCheckoutSession({
  userId,
  email,
  pianoId,
  praticaId,
  successUrl,
  cancelUrl,
}: CheckoutParams) {
  let priceId: string | undefined;
  let mode: "payment" | "subscription" = "payment";

  // 🔹 ABBONAMENTI
  if (pianoId) {
    mode = "subscription";

    const mapPiani: Record<PianoId, string> = {
      base: process.env.STRIPE_PRICE_BASE!,
      pro: process.env.STRIPE_PRICE_PRO!,
      mantenimento: process.env.STRIPE_PRICE_MANTENIMENTO!,
      business: process.env.STRIPE_PRICE_BUSINESS!,
      business_pro: process.env.STRIPE_PRICE_BUSINESS_PRO!,
    };

    priceId = mapPiani[pianoId];
  }

  // 🔹 PRATICHE SINGOLE
  if (praticaId) {
    mode = "payment";

    const mapPratiche: Record<PraticaId, string> = {
      apertura_ditta: process.env.STRIPE_PRICE_APERTURA_DITTA!,
      apertura_srl: process.env.STRIPE_PRICE_APERTURA_SRL!,
      variazione_sede: process.env.STRIPE_PRICE_VARIAZIONE_SEDE!,
      variazione_ateco: process.env.STRIPE_PRICE_VARIAZIONE_ATECO!,
      nomina_admin: process.env.STRIPE_PRICE_NOMINA_ADMIN!,
      aggiunta_socio: process.env.STRIPE_PRICE_AGGIUNTA_SOCIO!,
      aumento_capitale: process.env.STRIPE_PRICE_AUMENTO_CAPITALE!,
      cessazione_ditta: process.env.STRIPE_PRICE_CESSAZIONE_DITTA!,
      liquidazione_srl: process.env.STRIPE_PRICE_LIQUIDAZIONE_SRL!,
      deposito_bilancio: process.env.STRIPE_PRICE_DEPOSITO_BILANCIO!,
      suap_modifica: process.env.STRIPE_PRICE_SUAP_MODIFICA!,
      rinnovo_sanitario: process.env.STRIPE_PRICE_RINNOVO_SANITARIO!,
      trasformazione: process.env.STRIPE_PRICE_TRASFORMAZIONE!,
      subentro: process.env.STRIPE_PRICE_SUBENTRO!,
      inps_variazione: process.env.STRIPE_PRICE_INPS_VARIAZIONE!,
      bar_ristorante: process.env.STRIPE_PRICE_BAR_RISTORANTE!,
      parrucchiere: process.env.STRIPE_PRICE_PARRUCCHIERE!,
      estetista: process.env.STRIPE_PRICE_ESTETISTA!,
      autoriparatore: process.env.STRIPE_PRICE_AUTORIPARATORE!,
      impiantista: process.env.STRIPE_PRICE_IMPIANTISTA!,
      taxi_ncc: process.env.STRIPE_PRICE_TAXI_NCC!,
      mediatore: process.env.STRIPE_PRICE_MEDIATORE!,
      agente_commercio: process.env.STRIPE_PRICE_AGENTE_COMMERCIO!,
      commercio_dettaglio: process.env.STRIPE_PRICE_COMMERCIO_DETTAGLIO!,
      studio_medico: process.env.STRIPE_PRICE_STUDIO_MEDICO!,
      tatuatore: process.env.STRIPE_PRICE_TATUATORE!,
      panificio: process.env.STRIPE_PRICE_PANIFICIO!,
      farmacia: process.env.STRIPE_PRICE_FARMACIA!,
      edilizia: process.env.STRIPE_PRICE_EDILIZIA!,
    };

    priceId = mapPratiche[praticaId];
  }

  if (!priceId) {
    throw new Error("Price ID non trovato");
  }

  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      pianoId: pianoId || "",
      praticaId: praticaId || "",
    },
  });

  return session.url!;
}