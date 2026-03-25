// src/app/api/enti/casellario/route.ts
// Casellario Giudiziale — Ministero della Giustizia
// Portale: https://servizi.giustizia.it/servizi/certificati_online
// Con procura speciale di Zipra: possiamo richiederlo per conto del cliente
// Accesso: come intermediario abilitato (CAF/patronato) con credenziali GIUSTIZIA

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ─── Stato richiesta ───────────────────────────────────────────────────────
interface CasellarioRequest {
  pratica_id: string;
  codice_fiscale: string;
  nome: string;
  cognome: string;
  data_nascita: string; // YYYY-MM-DD
  luogo_nascita: string;
  tipo: "penale" | "carichi_pendenti" | "entrambi";
}

interface CasellarioResponse {
  success: boolean;
  documento_url?: string; // URL Supabase Storage del PDF
  numero_richiesta?: string;
  stato?: "richiesto" | "pronto" | "errore";
  messaggio?: string;
  // Se in modalità MOCK (pre-accreditamento):
  mock?: boolean;
  istruzioni_manuali?: string;
}

// ─── Configurazione ────────────────────────────────────────────────────────
const GIUSTIZIA_BASE_URL =
  process.env.GIUSTIZIA_API_URL || "https://portale.giustizia.it/api";
const GIUSTIZIA_CLIENT_ID = process.env.GIUSTIZIA_CLIENT_ID;
const GIUSTIZIA_CLIENT_SECRET = process.env.GIUSTIZIA_CLIENT_SECRET;
const GIUSTIZIA_USERNAME = process.env.GIUSTIZIA_USERNAME; // Username intermediario
const GIUSTIZIA_PASSWORD = process.env.GIUSTIZIA_PASSWORD;

// ─── ROUTE POST: Richiedi casellario ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  // Verifica autenticazione admin
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

  const body: CasellarioRequest = await req.json();
  const {
    pratica_id,
    codice_fiscale,
    nome,
    cognome,
    data_nascita,
    luogo_nascita,
    tipo,
  } = body;

  // Verifica che la pratica esista e abbia procura firmata
  const { data: pratica } = await supabase
    .from("pratiche")
    .select("id, user_id, stato, procura_firmata, procura_url")
    .eq("id", pratica_id)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  if (!pratica.procura_firmata) {
    return NextResponse.json(
      {
        error:
          "Procura speciale non ancora firmata dal cliente. Non possiamo richiedere documenti per suo conto senza delega.",
        action_required: "Invia reminder firma procura al cliente",
      },
      { status: 400 },
    );
  }

  try {
    // ─── PRODUZIONE: usa API Giustizia ──────────────────────────────────
    if (GIUSTIZIA_CLIENT_ID && GIUSTIZIA_CLIENT_SECRET) {
      // Step 1: Ottieni token
      const tokenRes = await fetch(`${GIUSTIZIA_BASE_URL}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: GIUSTIZIA_CLIENT_ID,
          client_secret: GIUSTIZIA_CLIENT_SECRET,
          scope: "casellario:read",
        }),
      });
      const { access_token } = await tokenRes.json();

      // Step 2: Richiedi certificato
      const certRes = await fetch(
        `${GIUSTIZIA_BASE_URL}/v1/casellario/richiesta`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
            "X-Intermediario": "ZIPRA-SRL",
            "X-Procura-Riferimento": pratica.procura_url || "",
          },
          body: JSON.stringify({
            soggetto: {
              codice_fiscale,
              nome,
              cognome,
              data_nascita,
              luogo_nascita,
            },
            tipo_certificato: tipo,
            uso: "ATTIVITA_IMPRENDITORIALE",
            intermediario: {
              denominazione: "Zipra S.r.l.",
              cf_piva: process.env.ZIPRA_CF_PIVA,
              riferimento_pratica: pratica_id,
            },
          }),
        },
      );

      const cert = await certRes.json();

      if (cert.documento_base64) {
        // Salva PDF su Supabase Storage
        const pdfBuffer = Buffer.from(cert.documento_base64, "base64");
        const fileName = `casellario_${codice_fiscale}_${Date.now()}.pdf`;

        await supabase.storage
          .from("documenti-pratiche")
          .upload(`${pratica_id}/${fileName}`, pdfBuffer, {
            contentType: "application/pdf",
          });

        const { data: urlData } = supabase.storage
          .from("documenti-pratiche")
          .getPublicUrl(`${pratica_id}/${fileName}`);

        // Aggiorna pratica con documento recuperato
        await supabase.from("documenti_pratica").upsert({
          pratica_id,
          tipo: "casellario_giudiziale",
          nome_file: fileName,
          url: urlData.publicUrl,
          recuperato_da: "zipra_api",
          data_recupero: new Date().toISOString(),
        });

        // Log azione admin
        await supabase.from("azioni_admin").insert({
          pratica_id,
          admin_id: user.id,
          tipo: "documento_recuperato",
          dettaglio: `Casellario giudiziale recuperato automaticamente via API Giustizia`,
        });

        return NextResponse.json({
          success: true,
          documento_url: urlData.publicUrl,
          numero_richiesta: cert.numero_richiesta,
          stato: "pronto",
        } as CasellarioResponse);
      }

      // Se asincrono (documento in elaborazione)
      if (cert.numero_richiesta) {
        await supabase.from("documenti_pratica").upsert({
          pratica_id,
          tipo: "casellario_giudiziale",
          stato: "in_elaborazione",
          numero_richiesta: cert.numero_richiesta,
          recuperato_da: "zipra_api",
        });
        return NextResponse.json({
          success: true,
          numero_richiesta: cert.numero_richiesta,
          stato: "richiesto",
          messaggio: "Casellario in elaborazione — sarà disponibile in 24-48h",
        } as CasellarioResponse);
      }
    }

    // ─── MODALITÀ MOCK (pre-accreditamento) ─────────────────────────────
    // Salva la richiesta come todo per l'admin — la farà manualmente
    await supabase.from("todo_admin").insert({
      pratica_id,
      tipo: "richiedi_casellario_manuale",
      priorita: "alta",
      descrizione: `Richiedere casellario giudiziale per ${nome} ${cognome} (CF: ${codice_fiscale})`,
      istruzioni: [
        "1. Vai su https://servizi.giustizia.it/servizi/certificati_online",
        "2. Accedi con credenziali intermediario Zipra",
        '3. Seleziona "Certificato penale" o "Carichi pendenti"',
        "4. CF soggetto: " + codice_fiscale,
        "5. Scarica PDF e carica su Supabase Storage pratica " + pratica_id,
      ].join("\n"),
      dati: {
        codice_fiscale,
        nome,
        cognome,
        data_nascita,
        luogo_nascita,
        tipo,
      },
      completato: false,
      creato_il: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      mock: true,
      stato: "richiesto",
      messaggio:
        "API Giustizia non ancora configurata — richiesta aggiunta alla coda manuale admin",
      istruzioni_manuali:
        "Vai in Admin > Pratiche > Todo per completare manualmente",
    } as CasellarioResponse);
  } catch (error) {
    console.error("Errore casellario:", error);
    return NextResponse.json(
      {
        success: false,
        messaggio: "Errore nella richiesta casellario",
        error: String(error),
      },
      { status: 500 },
    );
  }
}

// ─── ROUTE GET: Controlla stato richiesta in corso ────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pratica_id = searchParams.get("pratica_id");
  const numero_richiesta = searchParams.get("numero_richiesta");

  if (!pratica_id || !numero_richiesta) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  if (!GIUSTIZIA_CLIENT_ID) {
    return NextResponse.json({
      stato: "mock",
      messaggio: "API non configurata",
    });
  }

  try {
    const tokenRes = await fetch(`${GIUSTIZIA_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: GIUSTIZIA_CLIENT_ID!,
        client_secret: GIUSTIZIA_CLIENT_SECRET!,
      }),
    });
    const { access_token } = await tokenRes.json();

    const statusRes = await fetch(
      `${GIUSTIZIA_BASE_URL}/v1/casellario/${numero_richiesta}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const status = await statusRes.json();

    return NextResponse.json({
      stato: status.stato,
      documento_url: status.documento_url,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
