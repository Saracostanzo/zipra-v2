import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { creaCheckoutSession, PianoId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { pianoId, praticaId } = await req.json();

  if (!pianoId)
    return NextResponse.json(
      { error: "Piano non specificato" },
      { status: 400 },
    );

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const url = await creaCheckoutSession({
      userId: user.id,
      email: user.email!,
      pianoId: pianoId as PianoId,
      praticaId,
      successUrl: `${origin}/checkout/successo?piano=${pianoId}&pratica=${praticaId ?? ""}`,
      cancelUrl: `${origin}/checkout/annullato`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json(
      { error: "Errore creazione checkout" },
      { status: 500 },
    );
  }
}
