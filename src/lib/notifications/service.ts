import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { TipoNotifica, Notifica } from "@/types";

const resend = new Resend(process.env.RESEND_API_KEY);

// Twilio è opzionale - solo se configurato
let twilioClient: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = require("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
}

// ─── Templates email ──────────────────────────────────────────────────────────

const EMAIL_TEMPLATES: Record<
  TipoNotifica,
  (data: any) => { subject: string; html: string }
> = {
  pratica_in_revisione: (d) => ({
    subject: `📋 La tua pratica ${d.numero_pratica} è in revisione — Zipra`,
    html: emailBase(
      `
      <h2>La tua pratica è in revisione</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Abbiamo ricevuto la tua richiesta per <strong>${d.nome_impresa}</strong>.</p>
      <p>Il nostro team sta analizzando le pratiche necessarie. Ti notificheremo appena pronta per la tua firma.</p>
      <div class="info-box">
        <strong>Numero pratica:</strong> ${d.numero_pratica}<br>
        <strong>Attività:</strong> ${d.nome_impresa} — ${d.comune_sede}
      </div>
    `,
      d.azione_url,
      "Segui lo stato della pratica",
    ),
  }),

  inviata_utente: (d) => ({
    subject: `✅ Pratica pronta per la tua revisione — ${d.numero_pratica}`,
    html: emailBase(
      `
      <h2>La tua pratica è pronta!</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Abbiamo preparato tutto quello che serve per aprire <strong>${d.nome_impresa}</strong>.</p>
      <p>Controlla il riepilogo, firma digitalmente e dai il via libera all'invio. Ci vogliono meno di 2 minuti.</p>
      <div class="info-box">
        <strong>Pratiche preparate:</strong> ${d.num_pratiche}<br>
        <strong>Prossimo step:</strong> Revisione e firma
      </div>
    `,
      d.azione_url,
      "👉 Rivedi e firma ora",
    ),
  }),

  firma_richiesta: (d) => ({
    subject: `✍️ Firma richiesta per la pratica ${d.numero_pratica}`,
    html: emailBase(
      `
      <h2>Firma richiesta</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Per procedere con l'invio della pratica <strong>${d.numero_pratica}</strong> è necessaria la tua firma digitale.</p>
      <p>Accedi all'app e firma in un click — ci vuole meno di un minuto.</p>
    `,
      d.azione_url,
      "✍️ Firma ora",
    ),
  }),

  pratica_completata: (d) => ({
    subject: `🎉 Pratica completata! ${d.nome_impresa} è ufficiale — Zipra`,
    html: emailBase(
      `
      <h2>Congratulazioni! 🎉</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p><strong>${d.nome_impresa}</strong> è ufficialmente registrata!</p>
      <p>Tutte le pratiche sono state completate con successo. Scarica il riepilogo completo dalla tua area personale.</p>
      <div class="info-box" style="background:#f0fdf4;border-color:#16a34a;">
        <strong>✅ Pratiche completate</strong><br>
        ${d.pratiche_completate?.join("<br>") ?? ""}
      </div>
    `,
      d.azione_url,
      "Vai alla tua area personale",
    ),
  }),

  adempimento_scadenza: (d) => ({
    subject: `⚠️ Adempimento in scadenza: ${d.titolo}`,
    html: emailBase(
      `
      <h2>Adempimento in scadenza</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>C'è un adempimento importante che riguarda la tua attività:</p>
      <div class="info-box" style="background:#fff7ed;border-color:#f59e0b;">
        <strong>${d.titolo}</strong><br>
        ${d.descrizione}<br><br>
        <strong>Scadenza:</strong> ${d.scadenza}
      </div>
      <p>Accedi all'app per gestirlo in pochi click.</p>
    `,
      d.azione_url,
      "⚡ Gestisci adempimento",
    ),
  }),

  normativa_aggiornata: (d) => ({
    subject: `📢 Aggiornamento normativo che ti riguarda — Zipra`,
    html: emailBase(
      `
      <h2>Aggiornamento normativo</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>C'è un aggiornamento normativo che potrebbe riguardare la tua attività:</p>
      <div class="info-box">
        <strong>${d.titolo}</strong><br>
        ${d.descrizione}
      </div>
    `,
      d.azione_url,
      "Scopri cosa cambia",
    ),
  }),

  pratica_respinta: (d) => ({
    subject: `❌ Pratica ${d.numero_pratica} — richiesta integrazione`,
    html: emailBase(
      `
      <h2>Integrazione richiesta</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>La pratica <strong>${d.numero_pratica}</strong> necessita di alcune integrazioni prima di poter essere inviata.</p>
      <div class="info-box" style="background:#fef2f2;border-color:#ef4444;">
        <strong>Note del team:</strong><br>
        ${d.note_admin}
      </div>
    `,
      d.azione_url,
      "Vai alla pratica",
    ),
  }),

  pratica_approvata: (d) => ({
    subject: `✅ Pratica ${d.numero_pratica} approvata e in invio`,
    html: emailBase(
      `
      <h2>Pratica approvata!</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Hai approvato la pratica <strong>${d.numero_pratica}</strong>. Stiamo procedendo con l'invio agli enti competenti.</p>
      <p>Ti aggiorneremo appena completato.</p>
    `,
      d.azione_url,
      "Segui lo stato",
    ),
  }),

  integrazione_richiesta: (d) => ({
    subject: `📎 Documenti aggiuntivi richiesti — ${d.numero_pratica}`,
    html: emailBase(
      `
      <h2>Documenti richiesti</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Per completare la pratica abbiamo bisogno di alcuni documenti aggiuntivi.</p>
      <div class="info-box">
        ${d.documenti_richiesti?.map((d: string) => `• ${d}`).join("<br>") ?? ""}
      </div>
    `,
      d.azione_url,
      "Carica i documenti",
    ),
  }),

  sito_pronto: (d) => ({
    subject: `🌐 Il tuo sito è online! — ${d.nome_dominio}`,
    html: emailBase(
      `
      <h2>Il tuo sito è live! 🚀</h2>
      <p>Ciao <strong>${d.nome}</strong>,</p>
      <p>Il sito vetrina di <strong>${d.nome_impresa}</strong> è online:</p>
      <div class="info-box" style="background:#f0fdf4;border-color:#16a34a;text-align:center;">
        <a href="${d.url_sito}" style="font-size:18px;font-weight:bold;color:#16a34a;">${d.url_sito}</a>
      </div>
    `,
      d.url_sito,
      "🌐 Visita il tuo sito",
    ),
  }),
};

function emailBase(
  content: string,
  ctaUrl?: string,
  ctaLabel?: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
  .container { max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; }
  .header { background: #0D1117; padding: 24px; text-align: center; }
  .header span { font-size: 24px; font-weight: 900; color: white; letter-spacing: -0.5px; }
  .header span em { color: #00C48C; font-style: normal; }
  .body { padding: 32px; }
  h2 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #111827; }
  p { font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 12px; }
  .info-box { background: #f8fafc; border-left: 3px solid #00C48C; padding: 12px 16px; margin: 16px 0; font-size: 14px; line-height: 1.7; }
  .cta { display: block; background: #00C48C; color: #0D1117 !important; text-decoration: none; font-weight: 700; padding: 14px 24px; text-align: center; margin: 24px 0 0; font-size: 15px; }
  .footer { padding: 20px 32px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><span>zip<em>ra</em> ⚡</span></div>
  <div class="body">
    ${content}
    ${ctaUrl ? `<a href="${ctaUrl.startsWith("http") ? ctaUrl : `${process.env.NEXT_PUBLIC_BASE_URL}${ctaUrl}`}" class="cta">${ctaLabel || "Vai all'app"}</a>` : ""}
  </div>
  <div class="footer">
    Zipra — Apertura imprese senza burocrazia<br>
    Le informazioni non sostituiscono la consulenza professionale.
  </div>
</div>
</body>
</html>`;
}

// ─── SMS templates ────────────────────────────────────────────────────────────

const SMS_TEMPLATES: Partial<Record<TipoNotifica, (d: any) => string>> = {
  inviata_utente: (d) =>
    `Zipra: la pratica ${d.numero_pratica} è pronta per la tua firma. Accedi: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
  adempimento_scadenza: (d) =>
    `Zipra ⚠️ Adempimento in scadenza: ${d.titolo}. Scadenza: ${d.scadenza}. Accedi all'app.`,
  pratica_completata: (d) =>
    `Zipra 🎉 ${d.nome_impresa} è ufficialmente registrata! Accedi per il riepilogo.`,
  firma_richiesta: (d) =>
    `Zipra ✍️ Firma richiesta per pratica ${d.numero_pratica}. Accedi: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
};

// ─── Main notification function ───────────────────────────────────────────────

export async function inviaNotifica({
  userId,
  tipo,
  titolo,
  messaggio,
  praticaId,
  azioneUrl,
  azioneLabe,
  templateData,
  canali = ["db", "email"],
}: {
  userId: string;
  tipo: TipoNotifica;
  titolo: string;
  messaggio: string;
  praticaId?: string;
  azioneUrl?: string;
  azioneLabe?: string;
  templateData?: any;
  canali?: ("db" | "email" | "sms")[];
}) {
  const supabase = createAdminClient();
  let emailSent = false;
  let smsSent = false;

  // 1. Salva nel DB
  if (canali.includes("db")) {
    await supabase.from("notifiche").insert({
      user_id: userId,
      tipo,
      titolo,
      messaggio,
      pratica_id: praticaId ?? null,
      azione_url: azioneUrl ?? null,
      azione_label: azioneLabe ?? null,
      inviata_email: false,
      inviata_sms: false,
    });
  }

  // 2. Recupera dati utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, nome, cognome, telefono")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const data = { ...templateData, nome: profile.nome, email: profile.email };

  // 3. Invia email
  if (canali.includes("email") && EMAIL_TEMPLATES[tipo]) {
    try {
      const { subject, html } = EMAIL_TEMPLATES[tipo](data);
      await resend.emails.send({
        from: "Zipra <notifiche@zipra.it>",
        to: profile.email,
        subject,
        html,
      });
      emailSent = true;
    } catch (e) {
      console.error("Email error:", e);
    }
  }

  // 4. Invia SMS
  if (
    canali.includes("sms") &&
    twilioClient &&
    profile.telefono &&
    SMS_TEMPLATES[tipo]
  ) {
    try {
      const body = SMS_TEMPLATES[tipo]!(data);
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_FROM_NUMBER,
        to: profile.telefono,
      });
      smsSent = true;
    } catch (e) {
      console.error("SMS error:", e);
    }
  }

  // 5. Aggiorna flags nel DB
  if (emailSent || smsSent) {
    await supabase
      .from("notifiche")
      .update({ inviata_email: emailSent, inviata_sms: smsSent })
      .eq("user_id", userId)
      .eq("tipo", tipo)
      .order("created_at", { ascending: false })
      .limit(1);
  }
}

// ─── Broadcast adempimento a tutti gli utenti interessati ────────────────────

export async function broadcastAdempimento(adempimentoId: string) {
  const supabase = createAdminClient();

  const { data: adempimento } = await supabase
    .from("adempimenti")
    .select("*")
    .eq("id", adempimentoId)
    .single();

  if (!adempimento) return;

  // Trova utenti con pratiche nelle forme giuridiche/settori interessati
  let query = supabase
    .from("pratiche")
    .select(
      "user_id, nome_impresa, forma_giuridica, tipo_attivita, comune_sede",
    )
    .eq("stato", "completata");

  if (adempimento.forme_giuridiche?.length > 0) {
    query = query.in("forma_giuridica", adempimento.forme_giuridiche);
  }

  const { data: pratiche } = await query;
  if (!pratiche) return;

  const userIds = [...new Set(pratiche.map((p) => p.user_id))];

  for (const userId of userIds) {
    // Evita duplicati
    const { data: esistente } = await supabase
      .from("adempimenti_notificati")
      .select("id")
      .eq("adempimento_id", adempimentoId)
      .eq("user_id", userId)
      .single();

    if (esistente) continue;

    await inviaNotifica({
      userId,
      tipo: "adempimento_scadenza",
      titolo: adempimento.titolo,
      messaggio: adempimento.descrizione,
      azioneUrl: `/dashboard/adempimenti/${adempimentoId}`,
      templateData: {
        titolo: adempimento.titolo,
        descrizione: adempimento.descrizione,
        scadenza: new Date(adempimento.scadenza).toLocaleDateString("it-IT"),
      },
      canali: ["db", "email", "sms"],
    });

    await supabase.from("adempimenti_notificati").insert({
      adempimento_id: adempimentoId,
      user_id: userId,
    });
  }
}

// ─── Template email reiezione ente ────────────────────────────────────────────
// Aggiunto a EMAIL_TEMPLATES esistente — funzione separata per non rompere l'export

export async function notificaReiezone({
  userId,
  praticaId,
  ente,
  motivoReiezione,
  numeroPratica,
  nomeImpresa,
}: {
  userId: string;
  praticaId: string;
  ente: string;
  motivoReiezione: string;
  numeroPratica: string;
  nomeImpresa: string;
}) {
  await inviaNotifica({
    userId,
    tipo: "pratica_respinta",
    titolo: `⚠️ Pratica ${numeroPratica} respinta da ${ente}`,
    messaggio: `${ente} ha respinto la pratica per ${nomeImpresa}. Motivo: ${motivoReiezione}. Stiamo già lavorando alla correzione — il reinoltro è gratuito.`,
    praticaId,
    azioneUrl: `/dashboard/pratiche/${praticaId}`,
    azioneLabe: "Vedi dettagli",
    templateData: {
      numero_pratica: numeroPratica,
      nome_impresa: nomeImpresa,
      ente,
      note_admin: motivoReiezione,
    },
    canali: ["db", "email", "sms"],
  });
}

export async function notificaReinoltro({
  userId,
  praticaId,
  ente,
  numeroPratica,
  nomeImpresa,
}: {
  userId: string;
  praticaId: string;
  ente: string;
  numeroPratica: string;
  nomeImpresa: string;
}) {
  await inviaNotifica({
    userId,
    tipo: "pratica_in_revisione",
    titolo: `🔄 Pratica ${numeroPratica} reinoltrata a ${ente}`,
    messaggio: `Abbiamo corretto e reinviato la pratica per ${nomeImpresa} a ${ente}. Il reinoltro è completamente gratuito. Ti aggiorneremo sull'esito.`,
    praticaId,
    azioneUrl: `/dashboard/pratiche/${praticaId}`,
    templateData: {
      numero_pratica: numeroPratica,
      nome_impresa: nomeImpresa,
    },
    canali: ["db", "email"],
  });
}
