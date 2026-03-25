import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generaFascicoloNotaio,
  generaFascicoloCommercialista,
} from "@/lib/firma/documenti";
import { salvaDocumento, getUrlFirmato } from "@/lib/archivio/ricevute";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/professionisti/incarico
 *
 * Invia il fascicolo pre-compilato al notaio o commercialista.
 * L'admin inserisce l'email del professionista scelto per quella pratica.
 *
 * Per il notaio: specifica il costo a parte PRIMA di procedere
 * Per il commercialista: +€40 già inclusi nel preventivo
 */
export async function POST(req: NextRequest) {
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

  const {
    praticaId,
    tipoProfessionista, // 'notaio' | 'commercialista'
    emailProfessionista, // inserita manualmente dall'admin
    nomeProfessionista,
    tipoIncarico,
    costoPreventivato, // solo per notaio — da comunicare al cliente prima
    datiAggiuntivi, // dati specifici per il fascicolo
  } = await req.json();

  if (!praticaId || !tipoProfessionista || !emailProfessionista) {
    return NextResponse.json(
      { error: "Campi obbligatori mancanti" },
      { status: 400 },
    );
  }

  const adminSupabase = createAdminClient();

  // Recupera dati pratica + utente
  const { data: pratica } = await adminSupabase
    .from("pratiche")
    .select("*, user:profiles(nome, cognome, codice_fiscale, email, telefono)")
    .eq("id", praticaId)
    .single();

  if (!pratica)
    return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 });

  // ── Se è il notaio → prima notifica il cliente del costo ──────────────────
  if (tipoProfessionista === "notaio" && costoPreventivato) {
    const { Resend: ResendLib } = await import("resend");
    const r = new ResendLib(process.env.RESEND_API_KEY);
    await r.emails.send({
      from: "Zipra <notifiche@zipra.it>",
      to: pratica.user.email,
      subject: `📋 Preventivo notaio per la pratica ${pratica.numero_pratica}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#0D1117;padding:24px;text-align:center">
            <span style="color:#00C48C;font-weight:900;font-size:22px">zipra ⚡</span>
          </div>
          <div style="padding:32px">
            <h2 style="color:#111827">Costo notaio per la tua pratica</h2>
            <p>Ciao <strong>${pratica.user.nome}</strong>,</p>
            <p>Per completare la pratica <strong>${pratica.numero_pratica}</strong> (${pratica.nome_impresa}) 
            è necessario un atto notarile — questo è obbligatorio per legge e non dipende da noi.</p>
            <div style="background:#f8fafc;border-left:3px solid #f59e0b;padding:16px;margin:20px 0">
              <strong>Costo stimato notaio:</strong><br>
              <span style="font-size:22px;font-weight:bold;color:#111827">€${costoPreventivato}</span>
              <br><small style="color:#6b7280">Costo a tuo carico, separato dal piano Zipra</small>
            </div>
            <p>Questo importo è <strong>separato</strong> dal costo del tuo piano Zipra e viene pagato 
            direttamente al notaio. Noi ci occupiamo di preparare tutto il fascicolo — tu dovrai 
            recarti dal notaio una sola volta per la firma.</p>
            <p>Rispondere a questa email con <strong>"CONFERMO"</strong> per procedere, 
            oppure contattaci se hai domande.</p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/pratiche/${praticaId}" 
               style="display:block;background:#00C48C;color:#0D1117;text-decoration:none;
                      font-weight:bold;padding:14px;text-align:center;margin-top:24px">
              Vai alla pratica →
            </a>
          </div>
        </div>
      `,
    });

    // Salva nota admin
    await adminSupabase.from("admin_notes").insert({
      pratica_id: praticaId,
      admin_id: user.id,
      nota: `Preventivo notaio inviato al cliente: €${costoPreventivato} — in attesa di conferma cliente`,
      tipo: "nota",
    });

    return NextResponse.json({ success: true, azione: "preventivo_inviato" });
  }

  // ── Genera il fascicolo PDF ────────────────────────────────────────────────
  let pdfBuffer: Buffer | null = null;
  let nomeFascicolo = "";

  if (tipoProfessionista === "notaio") {
    pdfBuffer = await generaFascicoloNotaio({
      tipoAtti: tipoIncarico,
      nomeImpresa: pratica.nome_impresa,
      soci: datiAggiuntivi?.soci ?? [
        {
          nome: pratica.user.nome,
          cognome: pratica.user.cognome,
          cf: pratica.user.codice_fiscale ?? "",
          quota: 100,
          indirizzo: "",
        },
      ],
      sedeLegale: `${pratica.comune_sede} (${pratica.provincia_sede})`,
      codiceAteco: pratica.codice_ateco ?? "",
      oggettoSociale: datiAggiuntivi?.oggettoSociale ?? pratica.tipo_attivita,
      capitoleSociale: datiAggiuntivi?.capitoleSociale ?? 10000,
      amministratore: `${pratica.user.nome} ${pratica.user.cognome}`,
      dataDesiderata: datiAggiuntivi?.dataDesiderata,
      noteSpecifiche: datiAggiuntivi?.note,
    });
    nomeFascicolo = `fascicolo-notaio-${pratica.numero_pratica}.pdf`;
  }

  if (tipoProfessionista === "commercialista") {
    pdfBuffer = await generaFascicoloCommercialista({
      tipoIncarico,
      nomeImpresa: pratica.nome_impresa,
      codiceFiscaleTitolare: pratica.user.codice_fiscale ?? "",
      nomeTitolare: pratica.user.nome,
      cognomeTitolare: pratica.user.cognome,
      partitaIva: datiAggiuntivi?.partitaIva,
      codiceAteco: pratica.codice_ateco ?? "",
      periodoRiferimento:
        datiAggiuntivi?.periodo ?? new Date().getFullYear().toString(),
      datiContabili: datiAggiuntivi?.datiContabili,
      notePratica: datiAggiuntivi?.note,
    });
    nomeFascicolo = `fascicolo-commercialista-${pratica.numero_pratica}.pdf`;
  }

  if (!pdfBuffer)
    return NextResponse.json(
      { error: "Errore generazione fascicolo" },
      { status: 500 },
    );

  // ── Archivia il fascicolo ──────────────────────────────────────────────────
  const docId = await salvaDocumento({
    userId: pratica.user_id,
    praticaId,
    nome: nomeFascicolo,
    descrizione: `Fascicolo ${tipoProfessionista} — ${tipoIncarico}`,
    tipo: "contratto",
    buffer: pdfBuffer,
    mimeType: "application/pdf",
    tags: [tipoProfessionista, "fascicolo", tipoIncarico],
  });

  // ── Invia email al professionista ──────────────────────────────────────────
  const anno = new Date().getFullYear();
  const fascPath = `${pratica.user_id}/${anno}/contratto/${nomeFascicolo}`;
  const fascUrl = await getUrlFirmato(fascPath, 86400 * 7); // link valido 7 giorni

  const compenso =
    tipoProfessionista === "commercialista"
      ? "€40,00 (già inclusi nel piano del cliente)"
      : "A preventivo separato";

  await resend.emails.send({
    from: "Zipra Pratiche <pratiche@zipra.it>",
    to: emailProfessionista,
    subject: `[Zipra] Incarico ${tipoIncarico} — ${pratica.nome_impresa} — ${pratica.numero_pratica}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0D1117;padding:20px">
          <span style="color:#00C48C;font-weight:900;font-size:20px">zipra ⚡</span>
          <span style="color:#6b7280;font-size:12px;margin-left:12px">Incarico professionista</span>
        </div>
        <div style="padding:28px;background:#fff;border:1px solid #e5e7eb">
          <p>Gentile <strong>${nomeProfessionista ?? "Professionista"}</strong>,</p>
          <p>Le inviamo un incarico dalla piattaforma Zipra per conto del nostro cliente.</p>
          
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f9fafb">
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;font-size:13px">Pratica</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${pratica.numero_pratica}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;font-size:13px">Impresa</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${pratica.nome_impresa}</td>
            </tr>
            <tr style="background:#f9fafb">
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;font-size:13px">Tipo incarico</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${tipoIncarico}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;font-size:13px">Cliente</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${pratica.user.nome} ${pratica.user.cognome} — ${pratica.user.email}</td>
            </tr>
            <tr style="background:#f0fdf4">
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;font-size:13px">Compenso</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;color:#16a34a;font-weight:bold">${compenso}</td>
            </tr>
          </table>

          ${
            fascUrl
              ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;margin:16px 0;border-radius:4px">
            <p style="margin:0 0 8px;font-weight:bold">📎 Fascicolo pre-compilato allegato:</p>
            <a href="${fascUrl}" style="color:#16a34a;word-break:break-all">${fascUrl}</a>
            <p style="margin:8px 0 0;font-size:12px;color:#6b7280">Link valido 7 giorni</p>
          </div>
          `
              : ""
          }

          <p style="margin-top:20px">Una volta completato l'incarico, risponda a questa email con:</p>
          <ul style="font-size:13px">
            <li>Conferma del completamento</li>
            <li>Numero di protocollo (se disponibile)</li>
            <li>Copia della ricevuta dell'ente</li>
          </ul>
          <p style="font-size:13px;color:#6b7280">Nell'oggetto della risposta mantenga il riferimento: <strong>${pratica.numero_pratica}</strong></p>
        </div>
        <div style="padding:16px;background:#f9fafb;font-size:11px;color:#9ca3af">
          Zipra S.r.l. — pratiche@zipra.it — zipra.it
        </div>
      </div>
    `,
  });

  // ── Salva incarico nel DB ──────────────────────────────────────────────────

  // Cerca o crea professionista nel DB
  let professionistaId: string | null = null;
  const { data: profEsistente } = await adminSupabase
    .from("professionisti")
    .select("id")
    .eq("email", emailProfessionista)
    .single();

  if (profEsistente) {
    professionistaId = profEsistente.id;
  } else {
    const nomeParts = (nomeProfessionista ?? "Professionista Esterno").split(
      " ",
    );
    const { data: nuovoPro } = await adminSupabase
      .from("professionisti")
      .insert({
        nome: nomeParts[0] ?? "N/D",
        cognome: nomeParts.slice(1).join(" ") || "N/D",
        tipo: tipoProfessionista,
        email: emailProfessionista,
      })
      .select("id")
      .single();
    professionistaId = nuovoPro?.id ?? null;
  }

  if (professionistaId) {
    await adminSupabase.from("incarichi_professionisti").insert({
      pratica_id: praticaId,
      professionista_id: professionistaId,
      tipo_incarico: tipoIncarico,
      stato: "inviato",
      email_inviata_at: new Date().toISOString(),
      fascicolo_url: fascUrl,
    });
  }

  // ── Se è un commercialista affiliato a un cliente privato → genera mandato ──
  // Controlla se il cliente è un privato (non ha già un mandato con questo commercialista)
  const { data: clienteProfilo } = await adminSupabase
    .from("profiles")
    .select("tipo_account")
    .eq("id", pratica.user_id)
    .single();

  if (
    tipoProfessionista === "commercialista" &&
    clienteProfilo?.tipo_account === "privato"
  ) {
    // Verifica se esiste già un mandato firmato tra questo cliente e commercialista
    const { data: mandatoEsistente } = await adminSupabase
      .from("deleghe")
      .select("id, stato")
      .eq("user_id", pratica.user_id)
      .eq("tipo", "procura_speciale")
      .like("pratiche_coperte", `%${tipoIncarico}%`)
      .single();

    if (!mandatoEsistente || mandatoEsistente.stato !== "firmata") {
      // Nessun mandato esistente → genera e invia al cliente
      // Il cliente deve autorizzare questo commercialista prima che possa operare
      const businessDellaCom = await adminSupabase
        .from("business_accounts")
        .select("id, nome")
        .eq(
          "owner_id",
          (
            await adminSupabase
              .from("professionisti")
              .select("id")
              .eq("email", emailProfessionista)
              .single()
          ).data?.id ?? "",
        )
        .single();

      if (businessDellaCom.data) {
        const { generaMandatoIncaricoProfessionale } =
          await import("@/lib/firma/onboarding");
        await generaMandatoIncaricoProfessionale({
          clienteUserId: pratica.user_id,
          businessId: businessDellaCom.data.id,
          tipiIncarico: [tipoIncarico],
        });

        // Nota: il fascicolo viene inviato al commercialista solo DOPO
        // che il cliente ha firmato il mandato (gestito dal webhook Yousign)
        // Per ora segna come "in attesa di mandato"
        await adminSupabase.from("admin_notes").insert({
          pratica_id: praticaId,
          admin_id: user.id,
          nota: `Mandato professionale inviato al cliente per autorizzare ${nomeProfessionista ?? emailProfessionista}. Il fascicolo sarà inviato al commercialista dopo la firma.`,
          tipo: "nota",
        });
      } else {
        // Commercialista non ha account Business Zipra —
        // procedi comunque ma l'admin deve gestire manualmente il mandato
        await adminSupabase.from("admin_notes").insert({
          pratica_id: praticaId,
          admin_id: user.id,
          nota: `NOTA: ${emailProfessionista} non ha account Zipra Business. Il mandato professionale con il cliente va gestito fuori da Zipra (es. cartaceo o email diretta).`,
          tipo: "nota",
        });
      }
    }
    // Se mandato già firmato → procedi normalmente con l'invio del fascicolo
  }

  // ── Aggiorna stato pratica ─────────────────────────────────────────────────
  await adminSupabase
    .from("pratiche")
    .update({ stato: "in_invio", updated_at: new Date().toISOString() })
    .eq("id", praticaId);

  // ── Nota admin ─────────────────────────────────────────────────────────────
  await adminSupabase.from("admin_notes").insert({
    pratica_id: praticaId,
    admin_id: user.id,
    nota: `Fascicolo inviato a ${tipoProfessionista} (${emailProfessionista}) per: ${tipoIncarico}`,
    tipo: "nota",
  });

  return NextResponse.json({
    success: true,
    azione: "fascicolo_inviato",
    professionista: emailProfessionista,
    fascicolo: nomeFascicolo,
  });
}
