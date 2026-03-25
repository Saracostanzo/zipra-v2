// src/app/api/onboarding/firma/route.ts
// Avvia il flusso firma dopo il pagamento
// Usa le funzioni già esistenti in lib/firma/onboarding.ts

import { NextRequest, NextResponse } from "next/server";
import {
  avviaOnboardingFirma,
  avviaOnboardingBusiness,
} from "@/lib/firma/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { user_id, pratica_id, piano, importo = 149 } = await req.json();

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id obbligatorio" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Carica profilo per capire il tipo di account
  const { data: profilo } = await supabase
    .from("profiles")
    .select("piano, firma_digitale_autorizzata")
    .eq("id", user_id)
    .single();

  try {
    if (piano === "business" || piano === "business_pro") {
      // Business (CAF/commercialisti) — non hanno bisogno di procura verso Zipra
      // Usano la loro firma professionale
      await avviaOnboardingBusiness(user_id);
      return NextResponse.json({
        ok: true,
        tipo: "business",
        messaggio:
          "Account business attivato. Nessuna firma richiesta — usi la tua firma professionale.",
      });
    }

    // Privati — flusso standard: contratto + procura speciale
    await avviaOnboardingFirma({
      userId: user_id,
      praticaId: pratica_id,
      piano: piano ?? profilo?.piano ?? "base",
      importo,
    });

    return NextResponse.json({
      ok: true,
      tipo: "privato",
      messaggio:
        "Email di firma inviata. Contratto di servizio → poi procura speciale (2 minuti in totale).",
    });
  } catch (e: any) {
    console.error("Errore avvio firma:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — controlla stato firma per un utente
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId)
    return NextResponse.json({ error: "user_id mancante" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: profilo } = await supabase
    .from("profiles")
    .select("firma_digitale_autorizzata")
    .eq("id", userId)
    .single();

  const { data: deleghe } = await supabase
    .from("deleghe")
    .select("tipo, stato, data_firma")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const contratto = deleghe?.find((d) => d.tipo === "contratto_servizio");
  const procura = deleghe?.find((d) => d.tipo === "procura_speciale");

  return NextResponse.json({
    firma_autorizzata: profilo?.firma_digitale_autorizzata ?? false,
    contratto_stato: contratto?.stato ?? null,
    procura_stato: procura?.stato ?? null,
    tutto_firmato: profilo?.firma_digitale_autorizzata === true,
  });
}
