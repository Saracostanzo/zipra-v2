// ═══════════════════════════════════════════════════════════════════════════
// src/app/api/enti/suap/route.ts
// SUAP — impresainungiorno.gov.it
// Invio SCIA per attività commerciali e produttive al Comune
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUAP_BASE =
  process.env.SUAP_API_URL || "https://www.impresainungiorno.gov.it/api";
const SUAP_API_KEY = process.env.SUAP_API_KEY;

type TipoSCIA =
  | "somministrazione_alimenti"
  | "commercio_dettaglio"
  | "commercio_ingrosso"
  | "artigianato"
  | "acconciatori"
  | "estetisti"
  | "pulizie"
  | "facchinaggio"
  | "autoriparatori"
  | "panificio"
  | "palestra"
  | "manutenzione_verde"
  | "taxi_ncc"
  | "cessazione"
  | "variazione";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const { pratica_id, tipo_scia, dati_impresa, dati_locale, comune_codice } =
    await req.json();

  const { data: pratica } = await supabase
    .from("pratiche")
    .select("procura_firmata, procura_url")
    .eq("id", pratica_id)
    .single();
  if (!pratica?.procura_firmata) {
    return NextResponse.json(
      { error: "Procura speciale obbligatoria per invio SCIA" },
      { status: 400 },
    );
  }

  if (SUAP_API_KEY) {
    try {
      const res = await fetch(`${SUAP_BASE}/scia/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": SUAP_API_KEY,
          "X-Intermediario-PIVA": process.env.ZIPRA_CF_PIVA!,
        },
        body: JSON.stringify({
          comune: comune_codice,
          tipo_scia,
          impresa: dati_impresa,
          locale: dati_locale,
          procura_riferimento: pratica.procura_url,
        }),
      });

      const result = await res.json();
      if (result.numero_pratica) {
        await supabase
          .from("pratiche")
          .update({
            numero_pratica_suap: result.numero_pratica,
            stato: "inviata_suap",
          })
          .eq("id", pratica_id);
        await supabase
          .from("azioni_admin")
          .insert({
            pratica_id,
            admin_id: user.id,
            tipo: "scia_inviata",
            dettaglio: `SCIA ${tipo_scia} inviata al SUAP di ${comune_codice}. Numero: ${result.numero_pratica}`,
          });
        return NextResponse.json({
          success: true,
          numero_pratica: result.numero_pratica,
        });
      }
    } catch (err) {
      console.error("SUAP error:", err);
    }
  }

  // Mock: genera todo manuale
  await supabase.from("todo_admin").insert({
    pratica_id,
    tipo: "scia_suap_manuale",
    priorita: "alta",
    descrizione: `SCIA ${tipo_scia} al SUAP di ${comune_codice || dati_impresa?.comune}`,
    istruzioni: [
      `1. Vai su https://www.impresainungiorno.gov.it`,
      `2. Accedi con credenziali intermediario Zipra`,
      `3. Nuovo procedimento > ${tipo_scia}`,
      `4. Comune: ${comune_codice || dati_impresa?.comune}`,
      `5. CF titolare: ${dati_impresa?.codice_fiscale}`,
      `6. Allega: procura speciale firmata (URL: ${pratica.procura_url})`,
      `7. Firma digitale Zipra e invia`,
      `8. Annota numero pratica SUAP in Supabase > pratiche > ${pratica_id}`,
    ].join("\n"),
    dati: { tipo_scia, dati_impresa, comune_codice },
    completato: false,
    creato_il: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    mock: true,
    messaggio: "Todo SUAP creato per invio manuale",
  });
}
