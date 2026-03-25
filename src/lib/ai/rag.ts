import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Genera embedding con Voyage AI ──────────────────────────────────────────
async function generaEmbedding(testo: string): Promise<number[]> {
  // Testo troppo corto → embedding inutile, salta
  if (!testo || testo.trim().length < 10) return [];

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: testo.slice(0, 4000), // limite sicuro per Voyage
      model: "voyage-3", // 1024 dimensioni
    }),
  });

  if (!response.ok) {
    console.error("Voyage API error:", response.status, await response.text());
    return [];
  }

  const data = await response.json();

  // Risposta vuota o malformata → salta
  if (!data?.data?.[0]?.embedding) {
    console.error(
      "Voyage embedding vuoto:",
      JSON.stringify(data).slice(0, 200),
    );
    return [];
  }

  return data.data[0].embedding;
}

// ─── Cerca normative locali rilevanti ────────────────────────────────────────
export async function cercaNormativeLocali({
  query,
  comune,
  tipoAttivita,
  categoria,
  limit = 5,
}: {
  query: string;
  comune?: string;
  tipoAttivita?: string;
  categoria?: string;
  limit?: number;
}) {
  const supabase = createAdminClient();
  try {
    const embedding = await generaEmbedding(query);
    if (!embedding.length) return []; // embedding vuoto → salta ricerca

    const { data, error } = await supabase.rpc("cerca_normative", {
      query_embedding: embedding,
      comune_filter: comune ?? null,
      categoria_filter: categoria ?? null,
      match_count: limit,
    });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("RAG search error:", e);
    return [];
  }
}

// ─── Analisi AI con gerarchia delle fonti ────────────────────────────────────
//
// GERARCHIA:
//   1. SARI/ComUnica       → struttura ufficiale pratiche camerali
//   2. Normative locali    → requisiti specifici comune/provincia
//   3. Fonti nazionali     → regole generali (Agenzia Entrate, INPS, ecc.)
//   4. Claude gap filling  → completa dove le fonti sono lacunose
//
export async function analizzaPraticaConRAG(wizardData: any) {
  // ── STRATO 1: SARI/ComUnica ─────────────────────────────────────────────
  const normativeSARI = await cercaNormativeLocali({
    query: `${wizardData.formaGiuridica} ComUnica codice atto apertura ${wizardData.tipoAttivita}`,
    categoria: "cciaa",
    limit: 5,
  });

  // ── STRATO 2: Normative locali ──────────────────────────────────────────
  const normativeLocali = await cercaNormativeLocali({
    query: `apertura ${wizardData.tipoAttivita} SUAP ${wizardData.comuneSede} requisiti`,
    comune: wizardData.comuneSede,
    limit: 6,
  });

  const normativeCCIAA = await cercaNormativeLocali({
    query: `Camera Commercio ${wizardData.provinciaSede} apertura impresa ${wizardData.formaGiuridica}`,
    comune: wizardData.comuneSede,
    categoria: "cciaa",
    limit: 4,
  });

  const normativeASL =
    wizardData.serveAlimenti ||
    wizardData.tipoAttivita === "sanitario" ||
    wizardData.tipoAttivita === "estetica_benessere"
      ? await cercaNormativeLocali({
          query: `ASL notifica sanitaria ${wizardData.tipoAttivita} ${wizardData.comuneSede} requisiti HACCP`,
          comune: wizardData.comuneSede,
          categoria: "asl",
          limit: 4,
        })
      : [];

  // ── STRATO 3: Fonti nazionali ────────────────────────────────────────────
  const normativeNazionali = await cercaNormativeLocali({
    query: `${wizardData.tipoAttivita} ${wizardData.formaGiuridica} apertura partita IVA INPS`,
    limit: 4,
  });

  const sariCompleto =
    normativeSARI.length >= 2 &&
    normativeSARI.some((n: any) => n.similarity > 0.75);
  const localeCompleto = normativeLocali.length >= 2;

  const sezioni = [];
  if (normativeSARI.length > 0) {
    sezioni.push(`### FONTI SARI/ComUnica (struttura ufficiale pratiche camerali)
${normativeSARI.map((n: any) => `[${n.fonte_nome}] similarity: ${(n.similarity * 100).toFixed(0)}%\n${n.contenuto}`).join("\n---\n")}`);
  }
  if (normativeLocali.length > 0 || normativeCCIAA.length > 0) {
    const locali = [...normativeLocali, ...normativeCCIAA];
    sezioni.push(`### NORMATIVE LOCALI — ${wizardData.comuneSede} (${wizardData.provinciaSede}) [aggiornate settimanalmente]
${locali.map((n: any) => `[${n.fonte_nome}]\n${n.contenuto}`).join("\n---\n")}`);
  }
  if (normativeASL.length > 0) {
    sezioni.push(`### NORMATIVE SANITARIE/ASL
${normativeASL.map((n: any) => `[${n.fonte_nome}]\n${n.contenuto}`).join("\n---\n")}`);
  }
  if (normativeNazionali.length > 0) {
    sezioni.push(`### FONTI NAZIONALI (Agenzia Entrate, INPS, normativa generale)
${normativeNazionali.map((n: any) => `[${n.fonte_nome}]\n${n.contenuto}`).join("\n---\n")}`);
  }

  const contesto = sezioni.join("\n\n════════════════════════════════════\n\n");

  const prompt = `Sei un esperto di normativa italiana per l'apertura di imprese, con accesso a fonti aggiornate.
NOTA SUL CONTESTO:
- Fonti SARI trovate: ${normativeSARI.length} (${sariCompleto ? "SUFFICIENTE" : "LACUNOSO — usa gap filling"})
- Normative locali trovate: ${normativeLocali.length} (${localeCompleto ? "SUFFICIENTE" : "LACUNOSO — usa conoscenza generale"})
- Se SARI è lacunoso: integra con tutte le normative disponibili e la tua conoscenza del diritto commerciale italiano
- Se le normative locali sono lacunose: usa le regole nazionali standard e segnalalo nelle avvertenze
════════════════════════════════════
CONTESTO NORMATIVO DISPONIBILE:
${contesto || "ATTENZIONE: Nessuna fonte trovata nel RAG. Usa esclusivamente la tua conoscenza del diritto commerciale italiano e segnalalo nelle avvertenze."}
════════════════════════════════════
DATI IMPRESA:
- Descrizione: ${wizardData.descrizioneAttivita}
- Settore: ${wizardData.tipoAttivita}
- Forma giuridica: ${wizardData.formaGiuridica}
- Nome impresa: ${wizardData.nomeImpresa}
- Sede: ${wizardData.comuneSede} (${wizardData.provinciaSede})
- Locale fisico aperto al pubblico: ${wizardData.haLocale ? "Sì" : "No"}
- Tratta o somministra alimenti: ${wizardData.serveAlimenti ? "Sì" : "No"}
ISTRUZIONI:
1. Usa le fonti SARI per la struttura delle pratiche camerali (codici atto, moduli)
2. Usa le normative locali per requisiti specifici del comune
3. Se una fonte è lacunosa, completa con la tua conoscenza e segnalalo
4. Genera TUTTE le pratiche necessarie, anche quelle non coperte da SARI
5. Per attività regolamentate (parrucchieri, estetisti, bar, ristoranti, sanitario) aggiungi SEMPRE i requisiti specifici di settore
6. Indica sempre la fonte usata per ogni pratica
Rispondi SOLO con JSON valido, senza testo prima o dopo:
{
  "codiceAteco": "XX.XX.XX",
  "descrizioneAteco": "descrizione attività",
  "analisiAI": "Analisi personalizzata 3-4 frasi. Cita le fonti usate. Segnala se SARI era lacunoso e come hai integrato.",
  "qualitaFonti": {
    "sari": "${sariCompleto ? "completo" : "lacunoso"}",
    "locale": "${localeCompleto ? "completo" : "lacunoso"}",
    "noteSuFonti": "breve nota su eventuali gap e come li hai gestiti"
  },
  "avvertenze": [
    "avvertenza specifica se normativa locale non trovata",
    "avvertenza se interpretazione locale potrebbe differire"
  ],
  "pratiche": [
    {
      "id": "id_pratica_standard",
      "obbligatorio": true,
      "nota": "nota specifica con fonte",
      "tipo_invio": "automatico_api | manuale_admin | guidato_utente",
      "fonte": "SARI | locale | nazionale | gap_filling"
    }
  ],
  "praticheExtra": [
    {
      "id": "id_univoco_snake_case",
      "titolo": "Titolo pratica",
      "descrizione": "Descrizione dettagliata",
      "ente": "Ente competente",
      "obbligatorio": true,
      "tipo_invio": "manuale_admin",
      "tempi": "X giorni",
      "costo": "€ XXX o Gratuito",
      "documenti_richiesti": ["documento 1", "documento 2"],
      "nota": "Note specifiche con fonte normativa",
      "fonte": "SARI | locale | nazionale | gap_filling",
      "riferimento_normativo": "Es: D.Lgs 114/1998 art. 7, oppure Regolamento Comune di X",
      "order": 10
    }
  ]
}`;

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const result = JSON.parse(clean);

  console.log(
    `[RAG] Pratica ${wizardData.nomeImpresa} — SARI: ${result.qualitaFonti?.sari}, Locale: ${result.qualitaFonti?.locale}`,
  );
  return result;
}

// ─── Indicizza un nuovo documento normativo ───────────────────────────────────
export async function indicizzaNormativa({
  titolo,
  contenuto,
  fonteUrl,
  fonteNome,
  comune,
  provincia,
  tipoAttivita,
  categoria,
}: {
  titolo: string;
  contenuto: string;
  fonteUrl?: string;
  fonteNome: string;
  comune?: string;
  provincia?: string;
  tipoAttivita?: string;
  categoria: string;
}) {
  const supabase = createAdminClient();

  // Hash per evitare duplicati
  const encoder = new TextEncoder();
  const data = encoder.encode(contenuto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Cerca record esistente per fonte_url
  const { data: esistente } = await supabase
    .from("normative_sources")
    .select("id, hash_contenuto")
    .eq("fonte_url", fonteUrl ?? "")
    .maybeSingle();

  // Se esiste e il contenuto non è cambiato → salta
  if (esistente && esistente.hash_contenuto === hash) {
    return { skipped: true, id: esistente.id };
  }

  const embedding = await generaEmbedding(`${titolo}\n\n${contenuto}`);

  // Embedding vuoto → salta
  if (!embedding.length) {
    console.warn(`Embedding vuoto per "${titolo}" — saltato`);
    return { skipped: true, reason: "embedding_vuoto" };
  }

  // Se esiste ma il contenuto è cambiato → aggiorna
  if (esistente) {
    const { error } = await supabase
      .from("normative_sources")
      .update({
        titolo,
        contenuto,
        fonte_nome: fonteNome,
        comune,
        provincia,
        tipo_attivita: tipoAttivita,
        categoria,
        embedding,
        hash_contenuto: hash,
        aggiornato_at: new Date().toISOString(),
      })
      .eq("id", esistente.id);
    if (error) throw error;
    return { updated: true, id: esistente.id };
  }

  // Non esiste → inserisci
  const { data: inserted, error } = await supabase
    .from("normative_sources")
    .insert({
      titolo,
      contenuto,
      fonte_url: fonteUrl,
      fonte_nome: fonteNome,
      comune,
      provincia,
      tipo_attivita: tipoAttivita,
      categoria,
      embedding,
      hash_contenuto: hash,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { inserted: true, id: inserted.id };
}
