import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generaContenutiSito,
  generaHtmlSito,
  pubblicaSitoVercel,
  generaLogo,
} from "@/lib/ai/sito-vetrina";
import { inviaNotifica } from "@/lib/notifications/service";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { praticaId } = await req.json();
  const adminSupabase = createAdminClient();

  // Verifica piano Pro
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("piano, nome, cognome, email, telefono")
    .eq("id", user.id)
    .single();

  if (profile?.piano !== "pro") {
    return NextResponse.json({ error: "Piano Pro richiesto" }, { status: 403 });
  }

  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*")
    .eq("id", praticaId)
    .eq("user_id", user.id)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  // Crea record sito in stato 'generazione'
  const { data: sito } = await adminSupabase
    .from("siti_vetrina")
    .insert({
      user_id: user.id,
      pratica_id: praticaId,
      stato: "generazione",
    })
    .select("id")
    .single();

  // Processo asincrono (non aspettiamo)
  (async () => {
    try {
      // 1. Genera contenuti AI
      const testi = await generaContenutiSito(pratica);

      // 2. Genera logo (opzionale)
      const logoUrl = await generaLogo(
        pratica.nome_impresa,
        pratica.tipo_attivita,
      );

      // 3. Genera HTML
      const html = generaHtmlSito({
        nomeImpresa: pratica.nome_impresa,
        comune: pratica.comune_sede,
        telefono: profile.telefono,
        email: profile.email,
        testi,
        logoUrl: logoUrl ?? undefined,
      });

      // 4. Pubblica su Vercel
      const nomeProgetto = `zipra-${pratica.nome_impresa
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}`;
      const urlPubblicato = await pubblicaSitoVercel(html, nomeProgetto);

      // 5. Salva nel DB
      const nomeDominio = `${nomeProgetto}.vercel.app`;
      await adminSupabase
        .from("siti_vetrina")
        .update({
          stato: urlPubblicato ? "pubblicato" : "revisione",
          url_pubblicato: urlPubblicato,
          nome_dominio: nomeDominio,
          testi,
          logo_url: logoUrl,
          colori: testi.colori,
          font: testi.font,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sito!.id);

      // 6. Notifica utente
      await inviaNotifica({
        userId: user.id,
        tipo: "sito_pronto",
        titolo: "🌐 Il tuo sito è online!",
        messaggio: `Il sito di ${pratica.nome_impresa} è pronto${urlPubblicato ? `: ${urlPubblicato}` : ""}`,
        praticaId,
        azioneUrl: `/dashboard/sito/${sito!.id}`,
        templateData: {
          nome_impresa: pratica.nome_impresa,
          nome_dominio: nomeDominio,
          url_sito: urlPubblicato ?? `https://${nomeDominio}`,
        },
        canali: ["db", "email"],
      });
    } catch (e) {
      console.error("Errore generazione sito:", e);
      await adminSupabase
        .from("siti_vetrina")
        .update({ stato: "errore" })
        .eq("id", sito!.id);
    }
  })();

  return NextResponse.json({ success: true, sitoId: sito?.id });
}
