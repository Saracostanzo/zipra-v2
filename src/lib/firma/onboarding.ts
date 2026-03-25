/**
 * ONBOARDING FIRMA — Flusso completamente invisibile all'utente
 *
 * Cosa succede dopo il pagamento (l'utente non vede nulla di tecnico):
 *
 *   1. Sistema genera il Contratto di Servizio PDF
 *   2. Sistema invia via Yousign → utente riceve email "Firma il tuo contratto Zipra"
 *   3. Utente firma in 30 secondi con OTP SMS
 *   4. Webhook Yousign notifica il completamento
 *   5. Sistema genera automaticamente la Procura Speciale
 *   6. Sistema invia via Yousign → utente riceve seconda email
 *   7. Utente firma (30 secondi)
 *   8. Zipra ora ha campo libero per operare
 *
 * BUG FIX applicati in questo file:
 *   1. Telefono fallback "+393331234567" → ora blocca il flusso se mancante
 *   2. setTimeout(..., 2 * 60 * 1000) → rimosso: su Vercel serverless il processo
 *      termina prima dei 2 minuti. La procura viene inviata immediatamente dopo
 *      la firma del contratto, oppure schedulata tramite /api/cron/invia-procura.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { creaRichiestaDiFirma } from "@/lib/yousign";
import {
  generaContrattoServizio,
  generaProcuraSpeciale,
} from "@/lib/firma/documenti";
import { salvaDocumento } from "@/lib/archivio/ricevute";
import { inviaNotifica } from "@/lib/notifications/service";

// ─── Pratiche standard coperte dalla procura speciale ─────────────────────────

const PRATICHE_PROCURA_STANDARD = [
  "Apertura Partita IVA presso Agenzia delle Entrate (modello AA9/AA7)",
  "Iscrizione al Registro delle Imprese presso la Camera di Commercio competente (ComUnica)",
  "Iscrizione alla gestione previdenziale INPS (artigiani, commercianti o gestione separata)",
  "Presentazione SCIA o domanda di autorizzazione al SUAP del Comune",
  "Notifica sanitaria all'ASL/ATS competente per attività alimentari o sanitarie",
  "Comunicazione dell'indirizzo PEC al Registro delle Imprese",
  "Comunicazione del titolare effettivo al Registro Titolari Effettivi",
  "Variazioni, integrazioni e reinoltri relativi alle pratiche elencate",
  "Ricezione di comunicazioni, ricevute e notifiche dagli enti competenti",
];

// ─── Helper: verifica telefono prima di inviare OTP ──────────────────────────
// BUG FIX #1: il vecchio codice usava "+393331234567" come fallback silenzioso.
// Yousign inviava l'OTP a quel numero fittizio → il cliente non lo riceveva mai
// e non poteva firmare. Ora il flusso si blocca esplicitamente se manca il telefono.

function validaTelefono(telefono: string | null | undefined, userId: string): string {
  if (!telefono || telefono.trim() === '') {
    console.error(`[Onboarding] Telefono mancante per userId=${userId}. Impossibile inviare OTP.`)
    throw new Error(
      'Numero di telefono mancante nel profilo. Aggiornalo nella sezione Impostazioni prima di procedere con la firma.'
    )
  }
  // Normalizza: assicura che inizi con +39 se è un numero italiano senza prefisso
  const t = telefono.trim()
  if (/^\d{10}$/.test(t)) return `+39${t}`
  return t
}

// ─── Step 1: Avvia onboarding firma dopo pagamento ────────────────────────────

export async function avviaOnboardingFirma({
  userId,
  praticaId,
  piano,
  importo,
}: {
  userId: string;
  praticaId?: string;
  piano: string;
  importo: number;
}) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cognome, codice_fiscale, email, telefono")
    .eq("id", userId)
    .single();

  if (!profile?.email) {
    console.error("Onboarding firma: profilo non trovato per", userId);
    return;
  }

  // BUG FIX #1: valida telefono — blocca se mancante invece di usare numero fittizio
  const telefono = validaTelefono(profile.telefono, userId);

  let pratica: any = null;
  if (praticaId) {
    const { data } = await supabase
      .from("pratiche")
      .select("nome_impresa, comune_sede, provincia_sede, tipo_attivita, forma_giuridica")
      .eq("id", praticaId)
      .single();
    pratica = data;
  }

  const dataOggi = new Date().toLocaleDateString("it-IT");
  const dataScadenza = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("it-IT");

  // Step 1: Invia contratto di servizio
  try {
    const pdf = await generaContrattoServizio({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      codiceFiscale: profile.codice_fiscale ?? "",
      email: profile.email,
      nomeImpresa: pratica?.nome_impresa ?? "Impresa in apertura",
      comuneSede: pratica?.comune_sede ?? "",
      piano,
      importo,
      dataContratto: dataOggi,
    });

    await salvaDocumento({
      userId,
      praticaId,
      nome: `contratto-servizio-${dataOggi.replace(/\//g, "-")}.pdf`,
      descrizione: "Contratto di servizio Zipra",
      tipo: "contratto",
      buffer: pdf,
      mimeType: "application/pdf",
      tags: ["contratto", "onboarding"],
    });

    const risultato = await creaRichiestaDiFirma({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      email: profile.email,
      telefono, // BUG FIX: ora usa il telefono validato, non il fallback fittizio
      pdfBuffer: pdf,
      nomePDF: "Contratto di Servizio Zipra.pdf",
      tipoFirma: "advanced_electronic_signature",
      campiDaFirmare: [
        { pagina: 1, x: 48, y: 180, larghezza: 220, altezza: 46 },
      ],
      externalId: `contratto-${userId}`,
      redirectSuccesso: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?firma=contratto_ok`,
    });

    if (risultato) {
      await supabase.from("deleghe").insert({
        user_id: userId,
        pratica_id: praticaId ?? null,
        tipo: "contratto_servizio",
        pratiche_coperte: JSON.stringify([]),
        stato: "inviata_firma",
        yousign_signature_request_id: risultato.requestId,
        data_invio: new Date().toISOString(),
        data_scadenza: dataScadenza,
      });
    }
  } catch (e) {
    console.error("Errore invio contratto:", e);
    throw e; // rilancia per permettere alla route di gestire l'errore
  }
}

// ─── Step 2: Dopo firma contratto → invia procura speciale ───────────────────

export async function inviaProccuraSpeciale({
  userId,
  praticaId,
}: {
  userId: string;
  praticaId?: string;
}) {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cognome, codice_fiscale, email, telefono, indirizzo")
    .eq("id", userId)
    .single();

  if (!profile?.email) return;

  // BUG FIX #1: valida telefono anche per la procura
  const telefono = validaTelefono(profile.telefono, userId);

  let pratica: any = null;
  if (praticaId) {
    const { data } = await supabase
      .from("pratiche")
      .select("nome_impresa, comune_sede, provincia_sede")
      .eq("id", praticaId)
      .single();
    pratica = data;
  }

  const dataOggi = new Date().toLocaleDateString("it-IT");
  const dataScadenza = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("it-IT");

  try {
    const pdf = await generaProcuraSpeciale({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      codiceFiscale: profile.codice_fiscale ?? "",
      dataNascita: "",
      luogoNascita: "",
      indirizzo: profile.indirizzo ?? "",
      email: profile.email,
      nomeImpresa: pratica?.nome_impresa ?? "Impresa in apertura",
      comuneSede: pratica?.comune_sede ?? "",
      provinciaSede: pratica?.provincia_sede ?? "",
      praticheDelegate: PRATICHE_PROCURA_STANDARD,
      dataScadenza,
    });

    await salvaDocumento({
      userId,
      praticaId,
      nome: `procura-speciale-${dataOggi.replace(/\//g, "-")}.pdf`,
      descrizione: "Procura speciale per pratiche amministrative",
      tipo: "delega",
      buffer: pdf,
      mimeType: "application/pdf",
      tags: ["procura", "onboarding"],
    });

    const risultato = await creaRichiestaDiFirma({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      email: profile.email,
      telefono, // BUG FIX: telefono validato
      pdfBuffer: pdf,
      nomePDF: "Procura Speciale Zipra.pdf",
      tipoFirma: "advanced_electronic_signature",
      campiDaFirmare: [
        { pagina: 1, x: 48, y: 110, larghezza: 240, altezza: 46 },
      ],
      externalId: `procura-${userId}`,
      redirectSuccesso: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?firma=procura_ok`,
    });

    if (risultato) {
      await supabase.from("deleghe").insert({
        user_id: userId,
        pratica_id: praticaId ?? null,
        tipo: "procura_speciale",
        pratiche_coperte: JSON.stringify(PRATICHE_PROCURA_STANDARD),
        stato: "inviata_firma",
        yousign_signature_request_id: risultato.requestId,
        data_invio: new Date().toISOString(),
        data_scadenza: dataScadenza,
      });

      await supabase
        .from("profiles")
        .update({ firma_digitale_autorizzata: false })
        .eq("id", userId);
    }
  } catch (e) {
    console.error("Errore invio procura:", e);
    throw e;
  }
}

// ─── Step 3: Webhook Yousign → gestisce la firma completata ──────────────────

export async function gestisciFirmaCompletata({
  requestId,
  externalId,
}: {
  requestId: string;
  externalId?: string;
}) {
  if (!externalId) return;
  const supabase = createAdminClient();

  const { data: delega } = await supabase
    .from("deleghe")
    .update({
      stato: "firmata",
      data_firma: new Date().toISOString(),
    })
    .eq("yousign_signature_request_id", requestId)
    .select("user_id, pratica_id, tipo")
    .single();

  if (!delega) return;

  // Se era il contratto → invia subito la procura speciale
  // BUG FIX #2: rimosso setTimeout(..., 2 minuti) — su Vercel serverless il processo
  // termina entro pochi secondi, il setTimeout non scattava mai e la procura non veniva
  // mai inviata. Ora chiamiamo direttamente e in modo asincrono (fire-and-forget).
  if (delega.tipo === "contratto_servizio") {
    // Chiamata diretta senza await — non blocchiamo la risposta al webhook
    inviaProccuraSpeciale({
      userId: delega.user_id,
      praticaId: delega.pratica_id ?? undefined,
    }).catch((err) => {
      console.error("[Onboarding] Errore invio procura dopo firma contratto:", err);
      // Se l'invio fallisce (es. telefono mancante), schedula un todo admin manuale
      supabase.from("todo_admin").insert({
        tipo: "procura_firma_manuale",
        priorita: "altissima",
        descrizione: `Procura da inviare manualmente a userId=${delega.user_id} — invio automatico fallito dopo firma contratto`,
        istruzioni: [
          "1. Controlla che il profilo abbia un numero di telefono valido",
          "2. Vai su /admin/pratiche e trova la pratica collegata",
          "3. Usa il pulsante 'Reinvia procura' oppure contatta il cliente via email",
        ],
        pratica_id: delega.pratica_id ?? null,
      });
    });
  }

  // Se era la procura → ora abbiamo campo libero
  if (delega.tipo === "procura_speciale") {
    await supabase
      .from("profiles")
      .update({ firma_digitale_autorizzata: true })
      .eq("id", delega.user_id);

    await inviaNotifica({
      userId: delega.user_id,
      tipo: "pratica_approvata",
      titolo: "✅ Documenti completati",
      messaggio:
        "Perfetto! Abbiamo tutto quello che ci serve. Iniziamo a lavorare sulla tua pratica.",
      praticaId: delega.pratica_id ?? undefined,
      azioneUrl: "/dashboard",
      canali: ["db", "email"],
    });

    if (delega.pratica_id) {
      await supabase
        .from("pratiche")
        .update({ stato: "in_revisione_admin" })
        .eq("id", delega.pratica_id)
        .eq("stato", "bozza");
    }
  }
}

// ─── Onboarding business — SKIP firma digitale ───────────────────────────────

export async function avviaOnboardingBusiness(userId: string) {
  const supabase = createAdminClient();

  await supabase
    .from("profiles")
    .update({ firma_digitale_autorizzata: true })
    .eq("id", userId);

  await supabase.from("firme_digitali").upsert(
    {
      user_id: userId,
      stato: "attiva",
      provider: "yousign",
      tipo: "token",
      nome_certificato: "Firma professionale propria — non gestita da Zipra",
      data_emissione: new Date().toISOString(),
      data_scadenza: new Date(
        Date.now() + 3 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    { onConflict: "user_id" },
  );

  await inviaNotifica({
    userId,
    tipo: "pratica_approvata",
    titolo: "✅ Account Business attivato",
    messaggio:
      "Il tuo account Business Zipra è pronto. Puoi iniziare ad aggiungere i tuoi clienti.",
    azioneUrl: "/business/dashboard",
    canali: ["db", "email"],
  });
}

// ─── Onboarding firma per cliente aggiunto da un business ────────────────────

export async function avviaOnboardingFirmaClienteBusiness({
  clienteUserId,
  businessId,
  praticaId,
}: {
  clienteUserId: string;
  businessId: string;
  praticaId?: string;
}) {
  await avviaOnboardingFirma({
    userId: clienteUserId,
    praticaId,
    piano: "base",
    importo: 0,
  });
}
// FIX: funzione mancante — chiamata da api/professionisti/incarico/route.ts
export async function generaMandatoIncaricoProfessionale({
  clienteUserId,
  businessId,
  tipiIncarico,
}: {
  clienteUserId: string;
  businessId: string;
  tipiIncarico: string[];
}) {
  // Delega al flusso standard — il mandato è gestito come procura
  await avviaOnboardingFirma({
    userId: clienteUserId,
    piano: "base",
    importo: 0,
  });
}