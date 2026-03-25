// src/app/api/enti/inps/route.ts
// INPS — Estratto contributivo, iscrizione gestioni, verifica posizione
// API: https://api.inps.it
// Accesso: PIN azienda INPS come intermediario (patronato/CAF)

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INPS_BASE_URL = process.env.INPS_API_URL || "https://api.inps.it/api";
const INPS_CLIENT_ID = process.env.INPS_CLIENT_ID;
const INPS_CLIENT_SECRET = process.env.INPS_CLIENT_SECRET;

// ─── POST: Recupera dati INPS per una pratica ────────────────────────────
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

  const { pratica_id, codice_fiscale, tipo } = await req.json();
  // tipo: 'estratto_contributivo' | 'iscrizione_gestione' | 'posizione_debitoria'

  const { data: pratica } = await supabase
    .from("pratiche")
    .select("procura_firmata, procura_url")
    .eq("id", pratica_id)
    .single();

  if (!pratica?.procura_firmata) {
    return NextResponse.json(
      {
        error:
          "Procura speciale non firmata — necessaria per accedere ai dati INPS del cliente",
      },
      { status: 400 },
    );
  }

  // ─── PRODUZIONE ──────────────────────────────────────────────────────
  if (INPS_CLIENT_ID) {
    try {
      // Auth INPS OAuth2
      const tokenRes = await fetch("https://api.inps.it/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: INPS_CLIENT_ID,
          client_secret: INPS_CLIENT_SECRET!,
          scope: "estratto_contributivo posizione_assicurativa",
        }),
      });
      const { access_token } = await tokenRes.json();

      let endpoint = "";
      if (tipo === "estratto_contributivo")
        endpoint = `/soggetti/${codice_fiscale}/estratto-contributivo`;
      if (tipo === "iscrizione_gestione")
        endpoint = `/soggetti/${codice_fiscale}/posizione-assicurativa`;
      if (tipo === "posizione_debitoria")
        endpoint = `/soggetti/${codice_fiscale}/debiti`;

      const res = await fetch(`${INPS_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-Intermediario-CF": process.env.ZIPRA_CF_PIVA!,
          "X-Delega-Id": pratica.procura_url || "",
        },
      });

      const data = await res.json();

      // Salva su Supabase
      if (data.documento_pdf) {
        const pdfBuffer = Buffer.from(data.documento_pdf, "base64");
        const fileName = `inps_${tipo}_${codice_fiscale}_${Date.now()}.pdf`;
        await supabase.storage
          .from("documenti-pratiche")
          .upload(`${pratica_id}/${fileName}`, pdfBuffer, {
            contentType: "application/pdf",
          });
        const { data: urlData } = supabase.storage
          .from("documenti-pratiche")
          .getPublicUrl(`${pratica_id}/${fileName}`);
        await supabase
          .from("documenti_pratica")
          .upsert({
            pratica_id,
            tipo,
            nome_file: fileName,
            url: urlData.publicUrl,
            recuperato_da: "zipra_api",
            data_recupero: new Date().toISOString(),
          });
        return NextResponse.json({
          success: true,
          documento_url: urlData.publicUrl,
          dati: data.estratto,
        });
      }

      // Se dati strutturati (no PDF)
      await supabase
        .from("documenti_pratica")
        .upsert({
          pratica_id,
          tipo,
          dati_json: data,
          recuperato_da: "zipra_api",
          data_recupero: new Date().toISOString(),
        });
      return NextResponse.json({ success: true, dati: data });
    } catch (err) {
      console.error("INPS API error:", err);
      // Fallback a mock
    }
  }

  // ─── MOCK / TODO MANUALE ─────────────────────────────────────────────
  const istruzioniPerTipo: Record<string, string[]> = {
    estratto_contributivo: [
      "1. Accedi a myinps.inps.it con credenziali intermediario Zipra",
      "2. Cerca il soggetto per CF: " + codice_fiscale,
      '3. Seleziona "Estratto Conto Previdenziale"',
      "4. Scarica PDF e carica su Supabase Storage pratica " + pratica_id,
    ],
    iscrizione_gestione: [
      "1. Accedi al portale INPS aziende",
      "2. Verifica iscrizione gestione artigiani/commercianti per CF: " +
        codice_fiscale,
      "3. Stampa conferma iscrizione e carica su Supabase Storage",
    ],
    posizione_debitoria: [
      "1. Accedi portale INPS intermediario",
      "2. Verifica posizione debitoria CF: " + codice_fiscale,
      "3. Scarica attestazione e carica su Supabase Storage",
    ],
  };

  await supabase.from("todo_admin").insert({
    pratica_id,
    tipo: `inps_${tipo}`,
    priorita: tipo === "posizione_debitoria" ? "alta" : "media",
    descrizione: `INPS — ${tipo.replace(/_/g, " ")} per CF ${codice_fiscale}`,
    istruzioni: (istruzioniPerTipo[tipo] || ["Consulta manuale INPS"]).join(
      "\n",
    ),
    dati: { codice_fiscale, tipo },
    completato: false,
    creato_il: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    mock: true,
    messaggio: `Todo aggiunto: INPS ${tipo} da recuperare manualmente`,
  });
}
