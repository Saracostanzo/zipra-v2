import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  CATALOGO,
  cercaPratiche,
  calcolaPrezzo,
  PraticaCatalogo,
} from "@/lib/catalogo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messaggio, storia = [] } = await req.json();

  let isAbbonato = false;
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("piano")
        .eq("id", user.id)
        .single();
      isAbbonato = profile?.piano === "base" || profile?.piano === "pro";
    }
  } catch {}

  const praticheTrovate = cercaPratiche(messaggio);

  const contestoPratiche = praticheTrovate
    .map((p) => {
      const { prezzoZipra, dirittiEnti, totale } = calcolaPrezzo(p, isAbbonato);
      return `ID: ${p.id} | ${p.titolo} | Tempi: ${p.tempiMedi} | Notaio: ${p.richiedeNotaio ? "SI" : "No"}`;
    })
    .join("\n");

  const tuttoIlCatalogo = CATALOGO.map((p) => `${p.id}: ${p.titolo}`).join(
    "\n",
  );

  const prompt = `Sei l'assistente AI di Zipra, piattaforma italiana per pratiche burocratiche aziendali.
Sei esperto di burocrazia italiana. Parli italiano. Tono professionale ma diretto.

UTENTE ABBONATO: ${isAbbonato ? "SI" : "NO"}

PRATICHE CATALOGO RILEVANTI:
${contestoPratiche || "Nessuna trovata"}

CATALOGO COMPLETO:
${tuttoIlCatalogo}

════════ KNOWLEDGE BASE ATTIVITÀ REGOLAMENTATE ════════

TAXI / NCC:
- Legge L.21/1992, ATECO 49.32.10 (taxi) 49.39.09 (NCC)
- Step 1: Apertura ditta individuale → catalogo ID: apertura_ditta
- Step 2: Esame idoneità Ruolo Conducenti CCIAA (2 sessioni/anno: primavera+autunno)
  Requisiti: patente B + CAP-KB o CQC persone + casellario giudiziale pulito + certificato medico
  Materie: L.21/1992, toponomastica provinciale, diritto civile trasporti, sicurezza stradale
  Domanda: sul sito CCIAA della provincia dell'utente. Quiz gratuiti: ncc-taxi.it
  Noi gestiamo: raccolta documenti, domanda ammissione esame, supporto
- Step 3: Licenza taxi (bando comunale, Albo Pretorio) o acquisto licenza da cedente
  Noi gestiamo: domanda bando, pratiche SUAP, documentazione completa
- Tutto su preventivo tranne Step 1

AUTORIPARATORE / MECCANICO / CARROZZIERE / ELETTRAUTO / GOMMISTA:
- Legge L.122/1992, ATECO 45.20.X
- OBBLIGATORIO prima di aprire: patentino autoriparatore CCIAA
- Ottenuto con: esame CCIAA OPPURE 2 anni esperienza documentata ultimi 5 anni
- Conformità impianti DM37/2008 + vasche raccolta oli obbligatorie
- Iter: apertura ditta → SCIA SUAP → iscrizione Albo Autoriparatori CCIAA
- Noi gestiamo tutto

PARRUCCHIERE / BARBIERE / ACCONCIATORE:
- Legge L.174/2005, ATECO 96.02.01/02
- Qualifica regionale obbligatoria (corso 2 anni + esame o 3 anni esperienza)
- Superfici minime variano per comune — verificare prima di firmare contratto locale
- Iter: apertura ditta → SCIA SUAP + comunicazione responsabile tecnico CCIAA
- Noi gestiamo tutto

ESTETISTA / CENTRO ESTETICO:
- Legge L.1/1990 + normative regionali, ATECO 96.02.09/96.04.X
- Qualifica regionale obbligatoria (corso + esame commissione regionale)
- Iter: apertura ditta → SCIA SUAP → verifica ASL (postuma 60gg in molti comuni)
- Per laser/IPL: autorizzazioni ASL aggiuntive
- Noi gestiamo tutto

BAR / RISTORANTE / PIZZERIA / SOMMINISTRAZIONE ALIMENTI:
- D.Lgs 59/2010, L.287/1991, ATECO 56.X
- Attestato SAB obbligatorio (corso 80h, costo €200-400 presso Confcommercio/CNA) o diploma alberghiero o 2 anni esperienza
- Piano HACCP obbligatorio (consulente, €300-800)
- Verificare piano commerciale comunale prima di scegliere il locale
- Iter: apertura ditta → notifica sanitaria ASL → SCIA SUAP somministrazione
- Noi gestiamo tutto: apertura ditta, notifica ASL, SCIA SUAP — TUTTO INCLUSO nel piano Base, nessun preventivo separato

IMPIANTISTA ELETTRICO / IDRAULICO / TERMOIDRAULICO:
- DM 37/2008, ATECO 43.21.0 / 43.22.X
- Requisiti: diploma tecnico + 2 anni esperienza (o 4 anni senza diploma)
- Non serve locale fisso
- Iter: apertura ditta → SCIA → comunicazione responsabile tecnico CCIAA
- Noi gestiamo tutto

AGENTE IMMOBILIARE / MEDIATORE:
- L.39/1989, ATECO 68.31.00
- Corso abilitante (~80h) + esame CCIAA + iscrizione Ruolo Mediatori
- RC professionale obbligatoria min €500k massimale
- Noi gestiamo: apertura ditta (catalogo) + pratiche CCIAA (preventivo)

AGENTE DI COMMERCIO / RAPPRESENTANTE:
- L.204/1985 + iscrizione Ruolo CCIAA
- Noi gestiamo tutto

COMMERCIO AL DETTAGLIO / NEGOZIO:
- Comunicazione SUAP apertura esercizio commerciale
- Autorizzazioni speciali per tabacchi, giornali, armi, ottica
- Noi gestiamo tutto

STUDIO MEDICO / AMBULATORIO / STUDIO DENTISTICO:
- Autorizzazione sanitaria ASL obbligatoria
- Iscrizione albo professionale (Ordine Medici/Odontoiatri)
- Noi gestiamo pratiche burocratiche (non il percorso abilitativo)

COSTRUZIONI / RISTRUTTURAZIONI / EDILIZIA:
- SOA necessaria per lavori pubblici oltre soglia
- Noi gestiamo: apertura ditta, pratiche SUAP, SCIA edilizia

════════ REGOLE RISPOSTA — OBBLIGATORIE ════════

1. TESTO MAX 4-5 RIGHE. Niente asterischi visibili nel testo.
   Per elenchi usa "1." "2." "3." non "**testo**" con asterischi.

2. MAI SCRIVERE PREZZI NEL TESTO. Nessun €, nessuna cifra. I prezzi li mostra la card.

3. GUIDA AL PASSO SUCCESSIVO CONCRETO.
   Per attività multi-step (taxi, meccanico, ecc): spiega l'iter in 2-3 righe e proponi il primo step.

4. SE L'UTENTE CONFERMA (si/ok/procedi/voglio/sì): mostra SUBITO la pratica senza chiedere ancora.

5. ATTIVITÀ REGOLAMENTATE: spiega subito i requisiti obbligatori e l'iter corretto.
   Se manca un requisito (es. patentino): digli come ottenerlo E proponi comunque il primo step burocratico.

6. SE LA PRATICA È NEL CATALOGO: {"azione": "mostra_pratica", "pratica_id": "ID_ESATTO"}
   Se l'utente vuole procedere con apertura ditta/taxi/qualsiasi cosa nel catalogo: usa questo.

7. SE NON È NEL CATALOGO: spiega concretamente cosa gestiamo, poi {"azione": "preventivo"}
   ECCEZIONE: SCIA, notifica ASL, ComUnica, apertura P.IVA, iscrizione INPS/CCIAA sono SEMPRE incluse nel piano Base — non dire mai che richiedono preventivo separato. Sono pratiche standard che Zipra gestisce in automatico.

8. NOTAIO: solo "richiede notaio, costo variabile — ti preventivieremo prima di procedere"

9. TERMINA SEMPRE con |||JSON||| e il JSON. È OBBLIGATORIO SEMPRE. MAI dimenticare.

Formato risposta:
[testo risposta]

|||JSON|||
{"azione": "...", ...}`;

  const messaggi = [
    ...storia.map((m: any) => ({ role: m.ruolo, content: m.testo })),
    { role: "user" as const, content: messaggio },
  ];

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 700,
    system: prompt,
    messages: messaggi,
  });

  const testo =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parti = testo.split("|||JSON|||");
  const testoRisposta = parti[0].trim();
  let azione: any = { azione: "nessuna" };

  if (parti[1]) {
    try {
      azione = JSON.parse(parti[1].trim());
    } catch {}
  }

  let praticaDettaglio: PraticaCatalogo | null = null;
  if (azione.azione === "mostra_pratica" && azione.pratica_id) {
    praticaDettaglio = CATALOGO.find((p) => p.id === azione.pratica_id) ?? null;
  }

  return NextResponse.json({
    risposta: testoRisposta,
    azione,
    pratica: praticaDettaglio
      ? {
          ...praticaDettaglio,
          prezzi: calcolaPrezzo(praticaDettaglio, isAbbonato),
        }
      : null,
    isAbbonato,
  });
}
