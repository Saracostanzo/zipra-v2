import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generaTuttoSitoVetrina, DatiSitoVetrina } from "@/lib/sito/generator";

/**
 * POST /api/sito/genera
 *
 * Genera sito + logo + guida Google Business per:
 *   - Cliente privato Piano Pro
 *   - Commercialista per i suoi clienti (Piano Business con crediti)
 *
 * Body:
 *   praticaId: string (opzionale — prende i dati dalla pratica)
 *   datiManuali: DatiSitoVetrina (opzionale — override manuale)
 *   clienteUserId: string (opzionale — per commercialisti che generano per cliente)
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { praticaId, datiManuali, clienteUserId } = await req.json();
  const adminSupabase = createAdminClient();

  // Recupera profilo
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("piano, tipo_account, nome, cognome, email, telefono")
    .eq("id", user.id)
    .single();

  // Controlla autorizzazione
  const isPro = profile?.piano === "pro";
  const isBusiness = ["commercialista", "caf", "agenzia"].includes(
    profile?.tipo_account ?? "",
  );
  const isAdmin = profile?.piano === "admin"; // per test

  if (!isPro && !isBusiness && !isAdmin) {
    return NextResponse.json(
      {
        error: "Piano Pro o Business richiesto",
        upgradeUrl: "/prezzi",
      },
      { status: 403 },
    );
  }

  // Per i business: controlla crediti sito disponibili
  if (isBusiness && !isAdmin) {
    const { data: business } = await adminSupabase
      .from("business_accounts")
      .select("id, piano")
      .eq("owner_id", user.id)
      .single();

    if (business) {
      // Conta siti generati questo mese
      const inizioMese = new Date();
      inizioMese.setDate(1);
      inizioMese.setHours(0, 0, 0, 0);

      const { count } = await adminSupabase
        .from("siti_vetrina")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", inizioMese.toISOString());

      const limiteMensile = business.piano === "white_label" ? 999 : 3;
      if ((count ?? 0) >= limiteMensile) {
        return NextResponse.json(
          {
            error: `Hai raggiunto il limite di ${limiteMensile} siti questo mese`,
            upgradeUrl: "/prezzi",
          },
          { status: 403 },
        );
      }
    }
  }

  // Determina l'utente destinatario (il cliente, non il commercialista)
  const targetUserId = clienteUserId ?? user.id;

  // Costruisce i dati sito
  let datiSito: DatiSitoVetrina | null = datiManuali ?? null;

  if (!datiSito && praticaId) {
    const { data: pratica } = await adminSupabase
      .from("pratiche")
      .select("*, user:profiles(nome, cognome, email, telefono)")
      .eq("id", praticaId)
      .single();

    if (pratica) {
      datiSito = {
        nomeImpresa: pratica.nome_impresa,
        settore: pratica.tipo_attivita,
        comuneSede: pratica.comune_sede,
        provinciaSede: pratica.provincia_sede,
        descrizioneAttivita: pratica.analisi_ai ?? pratica.tipo_attivita,
        telefono: pratica.user?.telefono,
        email: pratica.user?.email ?? profile?.email ?? "",
      };
    }
  }

  if (!datiSito) {
    // Fallback dai dati profilo
    datiSito = {
      nomeImpresa: `${profile?.nome} ${profile?.cognome}`,
      settore: "Attività professionale",
      comuneSede: "",
      provinciaSede: "",
      descrizioneAttivita: "Attività professionale",
      email: profile?.email ?? "",
      telefono: profile?.telefono,
    };
  }

  // Aggiunge dati white label se è un commercialista
  if (isBusiness) {
    const { data: business } = await adminSupabase
      .from("business_accounts")
      .select("nome, logo_url")
      .eq("owner_id", user.id)
      .single();

    if (business) {
      datiSito.nomeStudio = business.nome;
      datiSito.logoStudioUrl = business.logo_url;
    }
  }

  // Avvia generazione asincrona
  (async () => {
    await generaTuttoSitoVetrina({
      userId: targetUserId,
      praticaId,
      dati: datiSito!,
      isWhiteLabel: isBusiness,
    });
  })();

  return NextResponse.json({
    success: true,
    message:
      "Generazione avviata — riceverai email con sito e guida Google Business in pochi minuti",
  });
}
