import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { pubblicaSuVercel } from "@/lib/sito/generator";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Limiti del sito vetrina ──────────────────────────────────────────────────
// L'AI può modificare SOLO questi elementi — niente di più

const COSA_PUO_MODIFICARE = `
Puoi modificare SOLO questi elementi del sito vetrina:
  - headline: il titolo principale della hero (max 10 parole)
  - sottotitolo: il sottotitolo hero (max 15 parole)  
  - descrizione: paragrafo "chi siamo" (max 5 frasi)
  - servizi: lista di 2-6 servizi offerti (max 30 caratteri ciascuno)
  - cta: testo del bottone di contatto (max 5 parole)
  - telefono: numero di telefono
  - email: indirizzo email contatti
  - indirizzo: indirizzo fisico
  - orari: orari di apertura per giorno
  - immagini: foto del locale, del team, dei prodotti (caricate dall'utente)

NON puoi modificare:
  - La struttura del sito (layout, sezioni, nav)
  - I colori e il font (fanno parte del brand)
  - Il dominio o l'URL
  - Il codice del sito
  - Le informazioni fiscali/legali

Se l'utente chiede qualcosa fuori da questi limiti, spiega gentilmente
che per modifiche strutturali deve contattare il supporto Zipra.
`;

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface MessaggioChat {
  ruolo: "user" | "assistant";
  messaggio: string;
  tipo_modifica?: string;
  campo_modificato?: string;
  valore_nuovo?: string;
  immagine_url?: string;
}

export interface RispostaEditor {
  risposta: string;
  modifica?: {
    tipo: string;
    campo: string;
    valore: string;
    applicabile: boolean;
  };
  richiedeImmagine?: boolean;
}

// ─── Gestisce un messaggio nella chat del sito editor ────────────────────────

export async function gestisciMessaggioEditor({
  sitoId,
  userId,
  messaggio,
  immagineUrl,
}: {
  sitoId: string;
  userId: string;
  messaggio: string;
  immagineUrl?: string;
}): Promise<RispostaEditor> {
  const supabase = createAdminClient();

  // Recupera il sito e i suoi dati attuali
  const { data: sito } = await supabase
    .from("siti_vetrina")
    .select("*")
    .eq("id", sitoId)
    .single();

  if (!sito) return { risposta: "Sito non trovato." };

  // Recupera storico chat (ultimi 10 messaggi)
  const { data: storico } = await supabase
    .from("sito_modifiche")
    .select("ruolo, messaggio")
    .eq("sito_id", sitoId)
    .order("created_at", { ascending: false })
    .limit(10);

  const storicoOrdinato = (storico ?? []).reverse();

  // Contenuto attuale del sito
  const testi = sito.testi ?? {};
  const contestoSito = `
STATO ATTUALE DEL SITO:
- Headline: "${testi.headline ?? ""}"
- Sottotitolo: "${testi.sottotitolo ?? ""}"
- Descrizione: "${testi.descrizione ?? ""}"
- Servizi: ${JSON.stringify(testi.servizi ?? [])}
- CTA: "${testi.cta ?? ""}"
- Telefono: "${sito.testi?.telefono ?? ""}"
- Email: "${sito.testi?.email ?? ""}"
- Indirizzo: "${sito.testi?.indirizzo ?? ""}"
- Orari: "${sito.testi?.orari ?? ""}"
`;

  const prompt = `Sei l'assistente AI di Zipra per la gestione del sito vetrina.
Aiuti il titolare dell'impresa a modificare il contenuto del suo sito.
Sei amichevole, preciso, e lavori SOLO nell'ambito consentito.

${COSA_PUO_MODIFICARE}

${contestoSito}

REGOLE DI RISPOSTA:
1. Se l'utente vuole modificare qualcosa di consentito:
   - Proponi il testo/valore aggiornato
   - Chiedi conferma prima di applicare
   - Usa un tono conversazionale
2. Se ha già confermato (dice "sì", "ok", "perfetto", "confermo", "va bene"):
   - Applica la modifica
   - Termina con |||MODIFICA|||{"tipo":"testo","campo":"NOME_CAMPO","valore":"NUOVO_VALORE"}
3. Se chiede immagini:
   - Invitalo ad allegare la foto nella chat
   - Termina con |||RICHIEDI_IMMAGINE|||
4. Se è fuori dai limiti:
   - Spiega gentilmente cosa puoi e non puoi fare
   - Suggerisci di scrivere a info@zipra.it per modifiche strutturali
5. Rispondi sempre in italiano, max 3-4 frasi

NOMI DEI CAMPI (usa esattamente questi):
headline, sottotitolo, descrizione, servizi, cta, telefono, email, indirizzo, orari`;

  // Costruisce i messaggi per Claude
  const messaggi = [
    ...storicoOrdinato.map((m) => ({
      role: m.ruolo as "user" | "assistant",
      content: m.messaggio,
    })),
    {
      role: "user" as const,
      content: immagineUrl
        ? `[L'utente ha allegato un'immagine: ${immagineUrl}]\n${messaggio}`
        : messaggio,
    },
  ];

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    system: prompt,
    messages: messaggi,
  });

  const testo =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Estrae eventuale modifica dal JSON
  let modifica: RispostaEditor["modifica"] = undefined;
  let richiedeImmagine = false;
  let rispostaPulita = testo;

  if (testo.includes("|||MODIFICA|||")) {
    const parti = testo.split("|||MODIFICA|||");
    rispostaPulita = parti[0].trim();
    try {
      const datiModifica = JSON.parse(parti[1].trim());
      modifica = {
        tipo: datiModifica.tipo,
        campo: datiModifica.campo,
        valore: datiModifica.valore,
        applicabile: true,
      };
    } catch {}
  }

  if (testo.includes("|||RICHIEDI_IMMAGINE|||")) {
    rispostaPulita = testo.replace("|||RICHIEDI_IMMAGINE|||", "").trim();
    richiedeImmagine = true;
  }

  // Salva messaggio utente nel DB
  await supabase.from("sito_modifiche").insert({
    sito_id: sitoId,
    user_id: userId,
    ruolo: "user",
    messaggio,
    immagine_url: immagineUrl ?? null,
  });

  // Salva risposta AI nel DB
  await supabase.from("sito_modifiche").insert({
    sito_id: sitoId,
    user_id: userId,
    ruolo: "assistant",
    messaggio: rispostaPulita,
    tipo_modifica: modifica?.tipo ?? null,
    campo_modificato: modifica?.campo ?? null,
    valore_nuovo: modifica?.valore ?? null,
    applicata: false,
  });

  return { risposta: rispostaPulita, modifica, richiedeImmagine };
}

// ─── Applica una modifica approvata al sito ───────────────────────────────────

export async function applicaModifica({
  sitoId,
  userId,
  campo,
  valore,
  tipo,
}: {
  sitoId: string;
  userId: string;
  campo: string;
  valore: string;
  tipo: string;
}): Promise<{ success: boolean; urlNuovo?: string }> {
  const supabase = createAdminClient();

  const { data: sito } = await supabase
    .from("siti_vetrina")
    .select("*")
    .eq("id", sitoId)
    .single();

  if (!sito) return { success: false };

  // Aggiorna i testi nel DB
  const testiAggiornati = { ...(sito.testi ?? {}) };

  if (campo === "servizi" && tipo === "testo") {
    // Valore può essere un array JSON o una stringa
    try {
      testiAggiornati.servizi = JSON.parse(valore);
    } catch {
      testiAggiornati.servizi = valore.split(",").map((s: string) => s.trim());
    }
  } else if (tipo === "immagine") {
    // Gestisce upload immagine
    testiAggiornati[campo] = valore;
  } else {
    testiAggiornati[campo] = valore;
  }

  // Rigenera l'HTML del sito con i nuovi testi
  const { generaHTMLSito } = await import("@/lib/sito/generator");

  const nuovoHTML = generaHTMLSito(
    {
      nomeImpresa: sito.testi?.nomeImpresa ?? "",
      settore: sito.testi?.settore ?? "",
      comuneSede: sito.testi?.citta ?? "",
      provinciaSede: sito.testi?.provincia ?? "",
      descrizioneAttivita: testiAggiornati.descrizione ?? "",
      telefono: testiAggiornati.telefono,
      email: testiAggiornati.email ?? "",
      indirizzo: testiAggiornati.indirizzo,
      orari: testiAggiornati.orari,
    },
    testiAggiornati,
    sito.logo_url ?? undefined,
  );

  // Rideploya su Vercel
  const nuovoUrl = await pubblicaSuVercel(
    nuovoHTML,
    sito.nome_dominio ?? `sito-${sitoId}`,
  );

  // Aggiorna DB
  await supabase
    .from("siti_vetrina")
    .update({
      testi: testiAggiornati,
      url_pubblicato: nuovoUrl ?? sito.url_pubblicato,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sitoId);

  // Segna la modifica come applicata
  await supabase
    .from("sito_modifiche")
    .update({ applicata: true })
    .eq("sito_id", sitoId)
    .eq("campo_modificato", campo)
    .eq("applicata", false)
    .order("created_at", { ascending: false })
    .limit(1);

  return { success: true, urlNuovo: nuovoUrl ?? undefined };
}

// ─── Crea o recupera l'account sito per un utente ─────────────────────────────

export async function getOrCreaAccountSito(
  sitoId: string,
  userId: string,
): Promise<{
  pin: string;
  email: string;
}> {
  const supabase = createAdminClient();

  // Controlla se esiste già
  const { data: esistente } = await supabase
    .from("sito_account")
    .select("*")
    .eq("sito_id", sitoId)
    .single();

  if (esistente) {
    return { pin: esistente.pin_accesso, email: esistente.email_notifiche };
  }

  // Recupera email utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  // Genera PIN 6 cifre
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  await supabase.from("sito_account").insert({
    sito_id: sitoId,
    user_id: userId,
    pin_accesso: pin,
    email_notifiche: profile?.email ?? "",
  });

  return { pin, email: profile?.email ?? "" };
}
