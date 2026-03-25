import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviaNotifica } from "@/lib/notifications/service";
import { StatoPratica } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
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
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const { stato, nota }: { stato: StatoPratica; nota?: string } =
    await req.json();
  const praticaId = params.id;
  const adminSupabase = createAdminClient();

  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*, user:profiles(id, nome, cognome, email)")
    .eq("id", praticaId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Non trovata" }, { status: 404 });

  await adminSupabase
    .from("pratiche")
    .update({
      stato,
      note_admin: nota ?? pratica.note_admin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", praticaId);

  if (nota) {
    await adminSupabase.from("admin_notes").insert({
      pratica_id: praticaId,
      admin_id: user.id,
      nota,
      tipo:
        stato === "completata"
          ? "approvazione"
          : stato === "respinta"
            ? "respinta"
            : "modifica",
    });
  }

  // Notifiche contestuali
  const notifiche: Partial<Record<StatoPratica, any>> = {
    completata: {
      tipo: "pratica_completata" as const,
      titolo: "🎉 Pratica completata!",
      messaggio: `${pratica.nome_impresa} è ufficialmente registrata.`,
      templateData: {
        numero_pratica: pratica.numero_pratica,
        nome_impresa: pratica.nome_impresa,
      },
    },
    richiede_integrazione: {
      tipo: "integrazione_richiesta" as const,
      titolo: "Documenti aggiuntivi richiesti",
      messaggio:
        nota ??
        "Sono necessari documenti aggiuntivi per completare la pratica.",
      templateData: {
        numero_pratica: pratica.numero_pratica,
        note_admin: nota,
      },
    },
    respinta: {
      tipo: "pratica_respinta" as const,
      titolo: "Pratica — integrazione richiesta",
      messaggio: nota ?? "La pratica necessita di modifiche.",
      templateData: {
        numero_pratica: pratica.numero_pratica,
        note_admin: nota,
      },
    },
  };

  if (notifiche[stato]) {
    const n = notifiche[stato];
    await inviaNotifica({
      userId: pratica.user_id,
      tipo: n.tipo,
      titolo: n.titolo,
      messaggio: n.messaggio,
      praticaId,
      azioneUrl: `/dashboard/pratiche/${praticaId}`,
      templateData: n.templateData,
      canali: ["db", "email"],
    });
  }

  return NextResponse.json({ success: true });
}
