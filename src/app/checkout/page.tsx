"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function CheckoutPage() {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [praticaId, setPraticaId] = useState<string | null>(null);
  const [piano, setPiano] = useState<string>("base");
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const pid = searchParams.get("pratica");
    const pianoParam = searchParams.get("piano");

    if (pid) setPraticaId(pid);
    if (pianoParam) setPiano(pianoParam);
  }, [searchParams]);

  async function avviaCheckout() {
    setErrore(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/checkout");
        return;
      }

      const body: Record<string, string> = {};

      if (praticaId) body.praticaId = praticaId;
      if (piano) body.pianoId = piano;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Errore checkout");
      }

      if (!data?.url) {
        throw new Error("URL checkout non restituito");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Errore checkout:", err);
      setErrore(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-z-darker text-z-light px-6 py-12">
      <div className="max-w-2xl mx-auto bg-z-mid border border-white/10 p-8">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>

        <div className="space-y-3 mb-6 text-sm text-z-muted">
          <p>
            <strong className="text-z-light">Piano:</strong> {piano || "—"}
          </p>
          <p>
            <strong className="text-z-light">Pratica:</strong> {praticaId || "—"}
          </p>
        </div>

        {errore && (
          <div className="mb-4 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {errore}
          </div>
        )}

        <button
          onClick={avviaCheckout}
          disabled={loading}
          className="bg-z-green text-z-dark font-bold px-6 py-3 disabled:opacity-50"
        >
          {loading ? "Reindirizzamento..." : "Procedi al pagamento"}
        </button>
      </div>
    </main>
  );
}