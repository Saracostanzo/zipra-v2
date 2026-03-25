export type DocumentoStep = {
  id?: string;
  code?: string;
  titolo: string;
  descrizione?: string;
  obbligatorio?: boolean;
  tipoCompilazione?: "upload" | "zipra";
  tags?: string[];
  comeOttenerlo?: string;
};

const TITLE_ALIASES: Record<string, string> = {
  // Documento identità
  "documento di identita": "documento_identita",
  "documento identita": "documento_identita",
  "documento identità": "documento_identita",
  "documento di identità": "documento_identita",
  "carta d identita": "documento_identita",
  "carta di identita": "documento_identita",
  "carta d'identita": "documento_identita",
  "carta d'identità": "documento_identita",
  "passaporto": "documento_identita",
  "patente": "documento_identita",

  // PEC
  "pec": "pec",
  "posta elettronica certificata": "pec",

  // Procura — TUTTO gestito da Zipra, il cliente firma solo via OTP sul telefono
  "procura digitale": "procura_digitale",
  "procura speciale": "procura_digitale",
  "procura speciale digitale": "procura_digitale",
  "firma digitale": "procura_digitale",
  "firma digitale attiva": "procura_digitale",
  "firma digitale per procure": "procura_digitale",
  "firma digitale attiva per procure e pratiche telematiche": "procura_digitale",
  "modello procura digitale": "procura_digitale",
  "modello procura digitale utilizzato con clienti per verifica legale": "procura_digitale",
  "modello procura tipo da utilizzare con i clienti": "procura_digitale",

  // Titolo di studio
  "titolo di studio": "titolo_studio",
  "attestazioni competenze informatiche": "titolo_studio",
  "titolo di studio o attestazioni competenze informatiche": "titolo_studio",

  // IBAN — Zipra raccoglie l'IBAN direttamente nel profilo, non serve documento
  "iban": "iban",
  "coordinate bancarie iban": "iban",
  "coordinate bancarie iban per addebiti f24": "iban",
  "iban per addebiti": "iban",
  "iban per addebiti accrediti": "iban",
};

const DOCUMENTO_CANONICO: Record<
  string,
  Pick<DocumentoStep, "titolo" | "descrizione" | "tipoCompilazione" | "obbligatorio" | "comeOttenerlo">
> = {
  documento_identita: {
    titolo: "Documento di identità",
    descrizione: "Carta d'identità, passaporto o patente in corso di validità.",
    tipoCompilazione: "upload",
    obbligatorio: true,
    comeOttenerlo: "Carica un documento di identità valido e leggibile, fronte/retro se necessario.",
  },

  pec: {
    titolo: "PEC (Posta Elettronica Certificata)",
    descrizione: "Zipra attiva e registra la PEC a nome della tua impresa — non devi fare nulla.",
    tipoCompilazione: "zipra",
    obbligatorio: true,
    comeOttenerlo: "Ci serviranno i dati anagrafici e dell'impresa per l'attivazione.",
  },

  // FIX: la procura NON è un documento che il cliente deve avere o caricare.
  // Zipra opera con procura speciale firmata digitalmente via OTP SMS (Yousign).
  // Il cliente riceve un'email, clicca il link, firma in 30 secondi con il telefono.
  // Non serve nessuna firma digitale personale del cliente.
  procura_digitale: {
    titolo: "Procura speciale Zipra",
    descrizione: "Zipra prepara la procura e te la invia via email. La firmi in 30 secondi con un codice SMS — nessuna firma digitale personale richiesta.",
    tipoCompilazione: "zipra",
    obbligatorio: true,
    comeOttenerlo: "Ricevi l'email dopo il pagamento — firmi dal telefono con OTP SMS.",
  },

  titolo_studio: {
    titolo: "Titolo di studio o attestazioni competenze",
    descrizione: "Diploma, laurea o attestato di qualifica professionale, se richiesto per l'attività.",
    tipoCompilazione: "upload",
    obbligatorio: true,
    comeOttenerlo: "Carica il documento più rilevante per la tua attività regolamentata.",
  },

  // FIX: l'IBAN non è un documento da caricare — lo raccogliamo nel profilo utente
  // durante l'onboarding o dalla dashboard. Non serve un file allegato.
  iban: {
    titolo: "IBAN per pratiche INPS/F24",
    descrizione: "Zipra raccoglie il tuo IBAN direttamente nel profilo — non devi allegare nessun documento.",
    tipoCompilazione: "zipra",
    obbligatorio: false,
    comeOttenerlo: "Inserisci l'IBAN nella sezione Profilo della dashboard quando richiesto.",
  },
};

function normalizeText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalCodeFromTitle(title: string): string {
  const normalized = normalizeText(title);
  return TITLE_ALIASES[normalized] || normalized.replace(/\s+/g, "_");
}

function isGarbageDescription(description?: string): boolean {
  const d = normalizeText(description);
  if (!d) return false;
  const blacklist = [
    "ho fatto un sito",
    "disbrigo pratiche",
    "intelligenza artificiale",
    "lavora conprocura",
    "lavora con procura",
    "sia dal clienrte",
    "sia dal cliente",
    "commercialisti e caf a lecce",
  ];
  return blacklist.some((bad) => d.includes(bad));
}

function mergeDocumento(existing: DocumentoStep, incoming: DocumentoStep): DocumentoStep {
  return {
    ...existing,
    ...incoming,
    titolo: existing.titolo || incoming.titolo,
    descrizione:
      !existing.descrizione || isGarbageDescription(existing.descrizione)
        ? incoming.descrizione
        : existing.descrizione,
    comeOttenerlo:
      !existing.comeOttenerlo || isGarbageDescription(existing.comeOttenerlo)
        ? incoming.comeOttenerlo
        : existing.comeOttenerlo,
    obbligatorio: existing.obbligatorio ?? incoming.obbligatorio ?? true,
    tipoCompilazione: existing.tipoCompilazione || incoming.tipoCompilazione,
    tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])],
  };
}

export function cleanDocumentiNecessari(items: DocumentoStep[]): DocumentoStep[] {
  const map = new Map<string, DocumentoStep>();

  for (const raw of items) {
    if (!raw?.titolo) continue;

    const code = raw.code || canonicalCodeFromTitle(raw.titolo);
    const canonico = DOCUMENTO_CANONICO[code];

    const normalizedItem: DocumentoStep = {
      ...raw,
      code,
      titolo: canonico?.titolo || raw.titolo,
      descrizione:
        !raw.descrizione || isGarbageDescription(raw.descrizione)
          ? canonico?.descrizione || raw.descrizione
          : raw.descrizione,
      tipoCompilazione: canonico?.tipoCompilazione || raw.tipoCompilazione || "upload",
      obbligatorio: canonico?.obbligatorio ?? raw.obbligatorio ?? true,
      comeOttenerlo:
        !raw.comeOttenerlo || isGarbageDescription(raw.comeOttenerlo)
          ? canonico?.comeOttenerlo || raw.comeOttenerlo
          : raw.comeOttenerlo,
    };

    if (!map.has(code)) {
      map.set(code, normalizedItem);
    } else {
      map.set(code, mergeDocumento(map.get(code)!, normalizedItem));
    }
  }

  return Array.from(map.values());
}