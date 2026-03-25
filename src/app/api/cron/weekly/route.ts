import { NextRequest, NextResponse } from "next/server";
import { runScrapingJob } from "@/lib/scraper";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastAdempimento } from "@/lib/notifications/service";

// Questo endpoint viene chiamato da Vercel Cron ogni settimana
// Configura in vercel.json: { "crons": [{ "path": "/api/cron/weekly", "schedule": "0 8 * * 1" }] }

export async function GET(req: NextRequest) {
  // Verifica autorizzazione cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const risultati: any = { scraping: null, adempimenti: null };

  // 1. Scraping normative locali (comuni + CCIAA, rotazione settimanale)
  try {
    risultati.scraping = await runScrapingJob("incrementale");
    console.log("✅ Scraping normative completato:", risultati.scraping);
  } catch (e) {
    console.error("❌ Scraping fallito:", e);
    risultati.scraping = { error: String(e) };
  }

  // 2. Scraping SARI — pratiche ufficiali ComUnica (ogni settimana, è veloce)
  try {
    const { scrapeSARI } = await import("@/lib/sari/scraper");
    risultati.sari = await scrapeSARI();
    console.log("✅ SARI indicizzato:", risultati.sari);
  } catch (e) {
    console.error("❌ SARI scraping fallito:", e);
    risultati.sari = { error: String(e) };
  }

  // 2. Controlla adempimenti in scadenza (prossimi 30 giorni)
  try {
    const supabase = createAdminClient();
    const oggi = new Date();
    const tra30giorni = new Date(oggi.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data: adempimentiInScadenza } = await supabase
      .from("adempimenti")
      .select("id, titolo, scadenza")
      .eq("attivo", true)
      .gte("scadenza", oggi.toISOString().split("T")[0])
      .lte("scadenza", tra30giorni.toISOString().split("T")[0]);

    let notificheInviate = 0;
    for (const adempimento of adempimentiInScadenza ?? []) {
      await broadcastAdempimento(adempimento.id);
      notificheInviate++;
    }

    risultati.adempimenti = {
      trovati: adempimentiInScadenza?.length ?? 0,
      notificheInviate,
    };
  } catch (e) {
    risultati.adempimenti = { error: String(e) };
  }

  return NextResponse.json({ success: true, ...risultati });
}
