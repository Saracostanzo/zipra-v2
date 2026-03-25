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
 * L'utente dal suo punto di vista:
 *   - Riceve 2 email di firma (può sembrare 1 se le uniamo in futuro)
 *   - Ogni firma richiede 30 secondi e un codice SMS
 *   - Non capisce cosa sta firmando tecnicamente — vede solo "documenti Zipra"
 *   - Nell'app vede solo "✓ Documenti firmati" quando è tutto completato
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
// Questi sono i poteri che chiediamo al cliente di conferirci in anticipo

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

  // Recupera dati utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, cognome, codice_fiscale, email, telefono")
    .eq("id", userId)
    .single();

  if (!profile?.email) {
    console.error("Onboarding firma: profilo non trovato per", userId);
    return;
  }

  // Recupera dati pratica se disponibile
  let pratica: any = null;
  if (praticaId) {
    const { data } = await supabase
      .from("pratiche")
      .select(
        "nome_impresa, comune_sede, provincia_sede, tipo_attivita, forma_giuridica",
      )
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

    // Archivia bozza
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

    // Invia a firma
    const risultato = await creaRichiestaDiFirma({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      email: profile.email,
      telefono: profile.telefono ?? "+393331234567",
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
      // Salva stato firma nel DB
      await supabase.from("deleghe").insert({
        user_id: userId,
        pratica_id: praticaId ?? null,
        tipo: "contratto_servizio",
        pratiche_coperte: JSON.stringify([
          "Tutte le pratiche del piano " + piano,
        ]),
        stato: "inviata_firma",
        yousign_signature_request_id: risultato.requestId,
        data_invio: new Date().toISOString(),
        data_scadenza: dataScadenza,
      });
    }
  } catch (e) {
    console.error("Errore invio contratto:", e);
  }
}

// ─── Logica assegnazione commercialista affiliato ────────────────────────────
//
// Quando Zipra assegna un commercialista affiliato a un cliente privato
// (scenario: cliente paga Base/Pro e ha bisogno di un commercialista per alcune pratiche),
// il sistema deve far firmare il mandato professionale al cliente.
//
// Questo accade DOPO che il cliente ha già firmato contratto + procura a Zipra.
// Il mandato è in AGGIUNTA — copre solo il rapporto cliente↔commercialista.
//
// Da chiamare in: /api/admin/pratiche/[id]/incarico quando il professionista
// è un commercialista affiliato (non esterno già noto al cliente).

export async function assegnaCommercilistaAffiliatoACliente({
  clienteUserId,
  praticaId,
  commercialistaEmail,
  commercialistaNome,
  tipiIncarico,
}: {
  clienteUserId: string;
  praticaId: string;
  commercialistaEmail: string;
  commercialistaNome: string;
  tipiIncarico: string[];
}) {
  const supabase = createAdminClient();

  // Trova o crea il business account del commercialista
  const { data: professionista } = await supabase
    .from("professionisti")
    .select("id")
    .eq("email", commercialistaEmail)
    .single();

  // Cerca se esiste già un business account per questo commercialista
  const { data: businessCommercialista } = await supabase
    .from("business_accounts")
    .select("id")
    .eq("piano", "business_base")
    .limit(1)
    .single();

  if (businessCommercialista) {
    // Genera e invia il mandato professionale al cliente
    // (il cliente deve autorizzare il commercialista prima che possa operare per lui)
    await generaMandatoIncaricoProfessionale({
      clienteUserId,
      businessId: businessCommercialista.id,
      tipiIncarico,
    });
  } else {
    // Il commercialista non ha ancora un account Zipra Business —
    // genera comunque il mandato con i dati del professionista
    const { data: cliente } = await supabase
      .from("profiles")
      .select("nome, cognome, codice_fiscale, email, telefono")
      .eq("id", clienteUserId)
      .single();

    if (cliente) {
      // Notifica admin che il commercialista va invitato su Zipra Business
      await supabase.from("admin_notes").insert({
        pratica_id: praticaId,
        admin_id: clienteUserId, // placeholder
        nota: `ATTENZIONE: Commercialista ${commercialistaNome} (${commercialistaEmail}) non ha account Zipra Business. Invitarlo ad iscriversi per gestire questa pratica.`,
        tipo: "nota",
      });
    }
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

    // Archivia bozza
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

    // Invia a firma — questa è la seconda firma, poche ore dopo la prima
    const risultato = await creaRichiestaDiFirma({
      nome: profile.nome ?? "Cliente",
      cognome: profile.cognome ?? "",
      email: profile.email,
      telefono: profile.telefono ?? "+393331234567",
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

      // Aggiorna flag sul profilo
      await supabase
        .from("profiles")
        .update({
          firma_digitale_autorizzata: false, // diventa true quando firma
        })
        .eq("id", userId);
    }
  } catch (e) {
    console.error("Errore invio procura:", e);
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

  // Aggiorna stato delega
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

  // Se era il contratto → invia la procura speciale
  if (delega.tipo === "contratto_servizio") {
    // Piccolo delay per non sovraccaricare l'utente con due email simultanee
    setTimeout(
      () => {
        inviaProccuraSpeciale({
          userId: delega.user_id,
          praticaId: delega.pratica_id ?? undefined,
        });
      },
      2 * 60 * 1000,
    ); // 2 minuti dopo
  }

  // Se era la procura → ora abbiamo campo libero
  if (delega.tipo === "procura_speciale") {
    await supabase
      .from("profiles")
      .update({
        firma_digitale_autorizzata: true,
      })
      .eq("id", delega.user_id);

    // Notifica utente (minimale — non spieghiamo i dettagli tecnici)
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

    // Sblocca la pratica per la lavorazione admin
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
//
// PERCHÉ I BUSINESS NON HANNO BISOGNO DI PROCURA VERSO ZIPRA:
//
// Il commercialista/CAF opera con la PROPRIA firma digitale professionale.
// Zipra è il loro software gestionale — come un gestionale contabile qualsiasi.
// Il rapporto legale è:
//
//   Cliente ←→ Commercialista  (mandato professionale già firmato tra loro)
//   Commercialista ←→ Zipra    (contratto B2B — abbonamento Business)
//
// Zipra non è mai nella catena di firma delle pratiche del commercialista.
// Il commercialista firma lui stesso con la sua CNS/firma remota professionale.
//
// CASO SPECIALE — mandato incarico opzionale:
// Se il commercialista vuole usare Zipra per far firmare digitalmente
// il mandato professionale al suo cliente (per comodità, non obbligo),
// può farlo con la funzione generaMandatoIncaricoProfessionale() qui sotto.
// Non è obbligatorio — è una feature di comodità.

export async function avviaOnboardingBusiness(userId: string) {
  const supabase = createAdminClient();

  // Imposta direttamente autorizzato — hanno già firma professionale
  await supabase
    .from("profiles")
    .update({
      firma_digitale_autorizzata: true,
    })
    .eq("id", userId);

  // Salva solo un record di riferimento nella tabella firme_digitali
  await supabase.from("firme_digitali").upsert(
    {
      user_id: userId,
      stato: "attiva",
      provider: "yousign", // placeholder — usano il loro provider
      tipo: "token", // presumiamo CNS professionale
      nome_certificato: "Firma professionale propria — non gestita da Zipra",
      data_emissione: new Date().toISOString(),
      // Scadenza generosa — loro rinnovano autonomamente
      data_scadenza: new Date(
        Date.now() + 3 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    { onConflict: "user_id" },
  );

  // Nessuna email di firma — solo notifica benvenuto
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
// Quando un commercialista aggiunge un cliente a Zipra,
// QUEL CLIENTE deve firmare contratto + procura (non il commercialista).

export async function avviaOnboardingFirmaClienteBusiness({
  clienteUserId,
  businessId,
  praticaId,
}: {
  clienteUserId: string;
  businessId: string;
  praticaId?: string;
}) {
  const supabase = createAdminClient();

  // Recupera dati business per personalizzare i documenti
  const { data: business } = await supabase
    .from("business_accounts")
    .select("nome, tipo")
    .eq("id", businessId)
    .single();

  // Il flusso è identico al cliente privato —
  // ma il contratto menziona che il servizio è erogato tramite [nome studio]
  // In futuro si può personalizzare il PDF con il logo del commercialista (white label)
  await avviaOnboardingFirma({
    userId: clienteUserId,
    praticaId,
    piano: "base", // il piano lo gestisce il business, non il cliente direttamente
    importo: 0, // il business ha già pagato — il cliente non vede prezzi
  });
}

// ─── Feature opzionale: mandato incarico professionale ───────────────────────
// Il commercialista può usare questa funzione per far firmare digitalmente
// il mandato professionale al suo cliente TRAMITE Zipra.
// NON è obbligatorio — è una comodità. Il commercialista lo usa se vuole
// evitare di stampare e raccogliere la firma su carta.
//
// Il documento generato è tra CLIENTE e COMMERCIALISTA — Zipra non è parte.

export async function generaMandatoIncaricoProfessionale({
  clienteUserId,
  businessId,
  tipiIncarico,
}: {
  clienteUserId: string;
  businessId: string;
  tipiIncarico: string[];
}) {
  const supabase = createAdminClient();

  const { data: cliente } = await supabase
    .from("profiles")
    .select("nome, cognome, codice_fiscale, email, telefono")
    .eq("id", clienteUserId)
    .single();

  const { data: business } = await supabase
    .from("business_accounts")
    .select("nome, tipo, partita_iva, indirizzo")
    .eq("id", businessId)
    .single();

  const { data: owner } = await supabase
    .from("profiles")
    .select("nome, cognome")
    .eq(
      "id",
      (
        await supabase
          .from("business_accounts")
          .select("owner_id")
          .eq("id", businessId)
          .single()
      ).data?.owner_id,
    )
    .single();

  if (!cliente || !business) return null;

  // Genera il PDF del mandato tra cliente e studio professionale
  const { PDFDocument, StandardFonts, rgb, PageSizes } =
    await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width: w, height: h } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const norm = await doc.embedFont(StandardFonts.Helvetica);

  const VERDE = rgb(0, 0.769, 0.549);
  const SCURO = rgb(0.051, 0.067, 0.09);
  const GRIGIO = rgb(0.4, 0.45, 0.52);
  const dataOggi = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Header — logo studio (non Zipra — questo è un documento tra cliente e studio)
  page.drawRectangle({ x: 0, y: h - 80, width: w, height: 80, color: SCURO });
  page.drawText(business.nome, {
    x: 48,
    y: h - 48,
    size: 18,
    font: bold,
    color: VERDE,
  });
  page.drawText(`${business.tipo.toUpperCase()} — Mandato professionale`, {
    x: 48,
    y: h - 66,
    size: 8,
    font: norm,
    color: rgb(0.5, 0.55, 0.6),
  });
  page.drawText(`Data: ${dataOggi}`, {
    x: w - 160,
    y: h - 48,
    size: 8,
    font: norm,
    color: GRIGIO,
  });

  let y = h - 100;
  const r = (t: string, f: any, s = 9, c = SCURO) => {
    page.drawText(t.substring(0, 92), { x: 48, y, size: s, font: f, color: c });
    y -= s + 5;
  };
  const sp = (n = 8) => {
    y -= n;
  };

  r("MANDATO DI INCARICO PROFESSIONALE", bold, 14);
  sp(14);

  r("PROFESSIONISTA INCARICATO", bold, 8, GRIGIO);
  sp(4);
  r(`${business.nome}`, bold, 10);
  r(`Rappresentato da: ${owner?.nome ?? ""} ${owner?.cognome ?? ""}`, norm, 9);
  if (business.partita_iva) r(`P.IVA: ${business.partita_iva}`, norm, 9);
  if (business.indirizzo) r(`Sede: ${business.indirizzo}`, norm, 9);
  sp(12);

  r("CLIENTE", bold, 8, GRIGIO);
  sp(4);
  r(`${cliente.nome} ${cliente.cognome}`, bold, 10);
  if (cliente.codice_fiscale) r(`C.F.: ${cliente.codice_fiscale}`, norm, 9);
  r(`Email: ${cliente.email}`, norm, 9);
  sp(12);

  r("OGGETTO DELL'INCARICO", bold, 8, GRIGIO);
  sp(4);
  r(
    "Il cliente incarica il professionista di svolgere le seguenti attività:",
    norm,
    9,
  );
  sp(6);
  for (const inc of tipiIncarico) {
    r(`• ${inc}`, norm, 9);
    sp(2);
  }
  sp(12);

  r("STRUMENTI UTILIZZATI", bold, 8, GRIGIO);
  sp(4);
  r(
    "Il professionista potrà avvalersi di software gestionali e piattaforme digitali (tra cui Zipra)",
    norm,
    9,
  );
  r(
    "per la gestione delle pratiche, nel rispetto della normativa sulla privacy e del segreto professionale.",
    norm,
    9,
  );
  sp(12);

  r(
    "Il presente mandato è disciplinato dal Codice Civile e dalle norme deontologiche di categoria.",
    norm,
    8,
    GRIGIO,
  );
  sp(24);

  r("FIRMA DEL CLIENTE", bold, 8, GRIGIO);
  sp(8);
  r(
    `${cliente.nome} ${cliente.cognome} — C.F. ${cliente.codice_fiscale ?? ""}`,
    norm,
    9,
  );
  sp(4);
  page.drawRectangle({
    x: 48,
    y: y - 10,
    width: 220,
    height: 44,
    borderColor: VERDE,
    borderWidth: 1,
  });
  page.drawText("[ CAMPO FIRMA DIGITALE ]", {
    x: 68,
    y: y + 12,
    size: 8,
    font: norm,
    color: GRIGIO,
  });

  const pdfBuffer = Buffer.from(await doc.save());

  // Invia a firma via Yousign — ma il documento è tra cliente e studio
  const risultato = await creaRichiestaDiFirma({
    nome: cliente.nome ?? "",
    cognome: cliente.cognome ?? "",
    email: cliente.email,
    telefono: cliente.telefono ?? "+393331234567",
    pdfBuffer,
    nomePDF: `Mandato-incarico-${business.nome.replace(/\s/g, "-")}.pdf`,
    tipoFirma: "advanced_electronic_signature",
    campiDaFirmare: [{ pagina: 1, x: 48, y: 110, larghezza: 220, altezza: 44 }],
    externalId: `mandato-${clienteUserId}-${businessId}`,
  });

  if (risultato) {
    // Salva come delega tra cliente e studio (non tra cliente e Zipra)
    await supabase.from("deleghe").insert({
      user_id: clienteUserId,
      tipo: "procura_speciale",
      pratiche_coperte: JSON.stringify(tipiIncarico),
      stato: "inviata_firma",
      yousign_signature_request_id: risultato.requestId,
      data_invio: new Date().toISOString(),
      data_scadenza: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("it-IT"),
    });
  }

  return risultato;
}
