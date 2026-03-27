// PATH: src/app/api/sito/genera/route.ts
//
// Genera sito + logo + Google Business per:
//   1. Cliente Piano Pro → targetUserId = user.id (auto)
//   2. Commercialista per un cliente → targetUserId = clienteUserId, businessId fornito
//
// Body:
//   praticaId:     string   — pratica da cui prendere i dati base
//   datiManuali:   object   — dati inseriti dall'utente nel form
//   clienteUserId: string?  — solo business: userId del cliente target
//   businessId:    string?  — solo business: ID account business

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviaNotifica } from "@/lib/notifications/service";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { praticaId, datiManuali, clienteUserId, businessId } =
    await req.json();
  const admin = createAdminClient();

  // ── Recupera profilo chi fa la richiesta ──────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("piano, tipo_account, nome, cognome, email, telefono")
    .eq("id", user.id)
    .single();

  const isPro = profile?.piano === "pro";
  const isBusiness =
    ["commercialista", "caf", "agenzia", "patronato"].includes(
      profile?.tipo_account ?? "",
    ) || ["business", "business_pro"].includes(profile?.piano ?? "");

  if (!isPro && !isBusiness) {
    return NextResponse.json(
      { error: "Piano Pro o Business richiesto", upgradeUrl: "/prezzi" },
      { status: 403 },
    );
  }

  // ── Determina il cliente target ───────────────────────────────────────────
  // Pro: genera per se stesso
  // Business: genera per il cliente specificato
  const targetUserId = isBusiness && clienteUserId ? clienteUserId : user.id;

  // Se business, verifica che il cliente appartenga al business
  if (isBusiness && clienteUserId && businessId) {
    const { data: relazione } = await admin
      .from("business_clienti")
      .select("id")
      .eq("business_id", businessId)
      .eq("cliente_id", clienteUserId)
      .single();

    if (!relazione) {
      return NextResponse.json(
        { error: "Cliente non trovato nel tuo account" },
        { status: 403 },
      );
    }

    // Controlla limite siti mensili per il piano business
    const inizioMese = new Date();
    inizioMese.setDate(1);
    inizioMese.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("siti_vetrina")
      .select("id", { count: "exact" })
      .eq("generato_da_business_id", businessId)
      .gte("created_at", inizioMese.toISOString());

    const limite = profile?.piano === "business_pro" ? 999 : 3;
    if ((count ?? 0) >= limite) {
      return NextResponse.json(
        {
          error: `Hai raggiunto il limite di ${limite} siti questo mese. Passa a Business Pro per siti illimitati.`,
          upgradeUrl: "/prezzi",
        },
        { status: 403 },
      );
    }
  }

  // ── Verifica pratica ──────────────────────────────────────────────────────
  const { data: pratica } = await admin
    .from("pratiche")
    .select("*")
    .eq("id", praticaId)
    .eq("user_id", targetUserId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  // ── Crea record sito in stato "generazione" ───────────────────────────────
  const { data: sito, error: sitoError } = await admin
    .from("siti_vetrina")
    .insert({
      user_id: targetUserId,
      pratica_id: praticaId,
      generato_da_business_id: businessId ?? null,
      stato: "generazione",
      testi: {
        descrizione_utente: datiManuali?.descrizione ?? "",
        servizi_utente: datiManuali?.servizi ?? [],
        telefono: datiManuali?.telefono ?? "",
        email: datiManuali?.email ?? "",
        indirizzo: datiManuali?.indirizzo ?? "",
        orari: datiManuali?.orari ?? "",
      },
    })
    .select("id")
    .single();

  if (sitoError || !sito) {
    console.error("[sito/genera] Errore creazione record:", sitoError);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }

  // ── Avvia generazione in background ──────────────────────────────────────
  generaInBackground({
    sitoId: sito.id,
    targetUserId,
    businessId: businessId ?? null,
    pratica,
    datiManuali,
    admin,
  }).catch((e) => console.error("[sito/genera] Errore background:", e));

  return NextResponse.json({ sitoId: sito.id, stato: "generazione" });
}

async function generaInBackground({
  sitoId,
  targetUserId,
  businessId,
  pratica,
  datiManuali,
  admin,
}: {
  sitoId: string;
  targetUserId: string;
  businessId: string | null;
  pratica: any;
  datiManuali: any;
  admin: any;
}) {
  try {
    let urlPubblicato: string | null = null;
    let logoUrl: string | null = null;
    let testi: any = {};

    // Prova il generatore completo — fallback a revisione manuale se non disponibile
    try {
      const { generaTuttoSitoVetrina } = await import("@/lib/sito/generator");
      const risultato = await generaTuttoSitoVetrina({
        userId: targetUserId,
        praticaId: pratica.id,
        dati: {
          nomeImpresa: pratica.nome_impresa,
          settore: pratica.tipo_attivita ?? "",
          comuneSede: pratica.comune_sede,
          provinciaSede: pratica.provincia_sede,
          descrizione: datiManuali?.descrizione ?? "",
          servizi: datiManuali?.servizi ?? [],
          telefono: datiManuali?.telefono ?? "",
          email: datiManuali?.email ?? "",
          indirizzo: datiManuali?.indirizzo ?? "",
          orari: datiManuali?.orari ?? "",
        },
        isWhiteLabel: !!businessId,
      });
      urlPubblicato = risultato?.urlPubblicato ?? null;
      logoUrl = risultato?.logoUrl ?? null;
      testi = risultato?.testi ?? {};
    } catch (e: any) {
      console.warn(
        "[sito/genera] Generatore non disponibile, revisione manuale:",
        e.message,
      );
      testi = {
        headline: `${pratica.nome_impresa}`,
        sottotitolo: `${pratica.tipo_attivita ?? ""} a ${pratica.comune_sede}`,
        descrizione: datiManuali?.descrizione ?? "",
        servizi: datiManuali?.servizi ?? [],
        telefono: datiManuali?.telefono ?? "",
        email: datiManuali?.email ?? "",
        indirizzo: datiManuali?.indirizzo ?? "",
        orari: datiManuali?.orari ?? "",
      };
    }

    const nomeDominio = urlPubblicato
      ? urlPubblicato.replace("https://", "")
      : `zipra-${pratica.nome_impresa
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")}.vercel.app`;

    await admin
      .from("siti_vetrina")
      .update({
        stato: urlPubblicato ? "pubblicato" : "revisione",
        url_pubblicato: urlPubblicato,
        nome_dominio: nomeDominio,
        testi,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sitoId);

    // Notifica utente target (il cliente)
    await inviaNotifica({
      userId: targetUserId,
      tipo: "sito_pronto",
      titolo: urlPubblicato
        ? "🌐 Il tuo sito è online!"
        : "🌐 Sito in preparazione",
      messaggio: urlPubblicato
        ? `Il sito di ${pratica.nome_impresa} è pronto su ${nomeDominio}. Controlla anche la guida Google Business in email.`
        : `Il sito di ${pratica.nome_impresa} è stato preparato. Il team Zipra lo pubblicherà presto.`,
      praticaId: pratica.id,
      azioneUrl: `/dashboard/sito/${sitoId}`,
      canali: ["db", "email"],
    });

    console.log(
      `[sito/genera] ✅ Completato — sito ${sitoId} per user ${targetUserId}`,
    );
  } catch (e: any) {
    console.error("[sito/genera] Errore background:", e.message);
    await admin
      .from("siti_vetrina")
      .update({ stato: "errore", updated_at: new Date().toISOString() })
      .eq("id", sitoId);
  }
}
