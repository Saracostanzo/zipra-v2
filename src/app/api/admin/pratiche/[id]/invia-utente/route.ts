import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviaNotifica } from "@/lib/notifications/service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createServerSupabaseClient();

  // Verifica admin
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

  const { nota } = await req.json();
  const praticaId = params.id;
  const adminSupabase = createAdminClient();

  // Recupera pratica con utente
  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*, user:profiles(id, nome, cognome, email), checklist_items(id)")
    .eq("id", praticaId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  // Aggiorna stato pratica
  await adminSupabase
    .from("pratiche")
    .update({
      stato: "inviata_utente",
      note_admin: nota || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", praticaId);

  // Salva nota admin
  if (nota) {
    await adminSupabase.from("admin_notes").insert({
      pratica_id: praticaId,
      admin_id: user.id,
      nota,
      tipo: "nota",
    });
  }

  // Invia notifica all'utente (email + SMS + in-app)
  await inviaNotifica({
    userId: pratica.user_id,
    tipo: "inviata_utente",
    titolo: "La tua pratica è pronta per la revisione",
    messaggio: `Abbiamo preparato la pratica per ${pratica.nome_impresa}. Controlla, firma e dai il via libera.`,
    praticaId,
    azioneUrl: `/dashboard/pratiche/${praticaId}/revisione`,
    azioneLabe: "Rivedi e firma",
    templateData: {
      numero_pratica: pratica.numero_pratica,
      nome_impresa: pratica.nome_impresa,
      num_pratiche: pratica.checklist_items?.length ?? 0,
    },
    canali: ["db", "email", "sms"],
  });

  return NextResponse.json({ success: true });
}
