import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvaDocumento } from "@/lib/archivio/ricevute";
import { inviaNotifica } from "@/lib/notifications/service";
import { Resend } from "resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface DatiSitoVetrina {
  nomeImpresa: string;
  settore: string;
  comuneSede: string;
  provinciaSede: string;
  descrizioneAttivita: string;
  telefono?: string;
  email: string;
  indirizzo?: string;
  orari?: string;
  // Branding
  colori?: { primario: string; secondario: string; accento: string };
  font?: string;
  // Per white label commercialista
  logoStudioUrl?: string;
  nomeStudio?: string;
}

export interface SitoGenerato {
  html: string;
  testi: {
    headline: string;
    sottotitolo: string;
    descrizione: string;
    servizi: string[];
    cta: string;
    metaDescription: string;
    paroleChiaveLocali: string[];
  };
  colori: { primario: string; secondario: string; accento: string };
  font: string;
  urlPubblicato?: string;
  nomeDominio?: string;
}

// ─── 1. Genera contenuti AI personalizzati ────────────────────────────────────

export async function generaContenutiSitoAI(
  dati: DatiSitoVetrina,
): Promise<any> {
  const res = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Sei un copywriter esperto di marketing locale italiano. 
Crea contenuti ottimizzati per il sito web di questa nuova impresa.

Dati impresa:
- Nome: ${dati.nomeImpresa}
- Settore: ${dati.settore}
- Città: ${dati.comuneSede} (${dati.provinciaSede})
- Descrizione: ${dati.descrizioneAttivita}

Rispondi SOLO con JSON valido:
{
  "headline": "Titolo principale (max 7 parole, include la città)",
  "sottotitolo": "Sottotitolo descrittivo (max 12 parole)",
  "descrizione": "Paragrafo chi siamo (3-4 frasi, tono caldo e professionale, menziona la città)",
  "servizi": ["Servizio 1", "Servizio 2", "Servizio 3", "Servizio 4"],
  "cta": "Testo bottone contatto (3-4 parole, es: Chiamaci oggi, Prenota ora)",
  "metaDescription": "Descrizione SEO 155 caratteri con città e settore",
  "paroleChiaveLocali": ["keyword1 città", "keyword2 città", "keyword3 città"],
  "colori": {
    "primario": "#ESADECIMALE appropriato per il settore",
    "secondario": "#ESADECIMALE colore chiaro complementare",
    "accento": "#ESADECIMALE colore accento vivace"
  },
  "font": "Nome font Google appropriato per il settore (es: Playfair Display, Montserrat, Lato)"
}`,
      },
    ],
  });

  const text = res.content[0].type === "text" ? res.content[0].text : "";
  return JSON.parse(
    text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim(),
  );
}

// ─── 2. Genera HTML sito completo ─────────────────────────────────────────────

export function generaHTMLSito(
  dati: DatiSitoVetrina,
  testi: any,
  logoUrl?: string,
): string {
  const { headline, sottotitolo, descrizione, servizi, cta, metaDescription } =
    testi;
  const colori = testi.colori ?? {
    primario: "#1a56db",
    secondario: "#f3f4f6",
    accento: "#16a34a",
  };
  const font = testi.font ?? "Inter";
  const fontUrl = font.replace(/ /g, "+");

  const emojiServizi = ["⭐", "🔑", "💡", "🤝", "✅", "🎯", "💼", "🏆"];

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${dati.nomeImpresa} — ${dati.comuneSede}</title>
<meta name="description" content="${metaDescription}">
<meta property="og:title" content="${dati.nomeImpresa}">
<meta property="og:description" content="${metaDescription}">
<meta name="geo.region" content="IT-${dati.provinciaSede}">
<meta name="geo.placename" content="${dati.comuneSede}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${fontUrl}:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --p: ${colori.primario};
  --s: ${colori.secondario};
  --a: ${colori.accento};
  --font: '${font}', sans-serif;
  --dark: #111827;
  --gray: #6b7280;
  --light: #f9fafb;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);color:var(--dark);background:#fff;-webkit-font-smoothing:antialiased}

/* NAV */
nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.logo{font-size:20px;font-weight:700;color:var(--p);text-decoration:none}
.nav-cta{background:var(--a);color:#fff;padding:10px 20px;font-size:14px;font-weight:600;border:none;cursor:pointer;text-decoration:none;border-radius:6px;transition:opacity .2s}
.nav-cta:hover{opacity:.9}

/* HERO */
.hero{background:linear-gradient(135deg,var(--p) 0%,color-mix(in srgb,var(--p) 70%,#000) 100%);color:#fff;padding:80px 24px;text-align:center}
.hero-badge{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);padding:6px 16px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border-radius:20px;margin-bottom:20px}
.hero h1{font-size:clamp(28px,5vw,54px);font-weight:700;line-height:1.15;margin-bottom:16px;max-width:700px;margin-left:auto;margin-right:auto}
.hero p{font-size:18px;opacity:.9;max-width:520px;margin:0 auto 32px;line-height:1.6}
.hero-cta{background:var(--a);color:#fff;padding:16px 36px;font-size:16px;font-weight:700;border:none;cursor:pointer;text-decoration:none;border-radius:8px;display:inline-block;transition:transform .2s,box-shadow .2s}
.hero-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.2)}

/* TRUST BAR */
.trust{background:var(--s);padding:20px 24px;text-align:center;border-bottom:1px solid #e5e7eb}
.trust-items{display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.trust-item{font-size:13px;color:var(--gray);display:flex;align-items:center;gap:6px}
.trust-item span:first-child{color:var(--a);font-size:16px}

/* SERVIZI */
.section{padding:72px 24px}
.section-title{text-align:center;margin-bottom:48px}
.section-title h2{font-size:clamp(24px,4vw,36px);font-weight:700;color:var(--dark)}
.section-title p{color:var(--gray);font-size:16px;margin-top:8px}
.servizi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:960px;margin:0 auto}
.servizio-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;text-align:center;transition:transform .2s,box-shadow .2s}
.servizio-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.1)}
.servizio-icon{font-size:32px;margin-bottom:12px}
.servizio-card h3{font-size:16px;font-weight:600;color:var(--dark)}

/* CHI SIAMO */
.about{background:var(--s);padding:72px 24px}
.about-inner{max-width:760px;margin:0 auto;text-align:center}
.about h2{font-size:32px;font-weight:700;margin-bottom:20px}
.about p{font-size:16px;color:var(--gray);line-height:1.8}

/* CONTATTI */
.contatti{background:var(--dark);color:#fff;padding:64px 24px}
.contatti-inner{max-width:640px;margin:0 auto;text-align:center}
.contatti h2{font-size:28px;font-weight:700;margin-bottom:8px}
.contatti p{color:rgba(255,255,255,.6);margin-bottom:32px}
.contatti-grid{display:flex;flex-direction:column;gap:16px;align-items:center}
.contatto-item{display:flex;align-items:center;gap:12px;font-size:16px}
.contatto-item a{color:#fff;text-decoration:none}
.contatto-item a:hover{color:var(--a)}
.contatto-badge{background:var(--a);color:#fff;padding:6px 12px;font-size:12px;font-weight:600;border-radius:4px;letter-spacing:.05em}

/* FOOTER */
footer{background:#000;color:rgba(255,255,255,.4);padding:20px 24px;text-align:center;font-size:12px}
footer a{color:rgba(255,255,255,.4)}

@media(max-width:600px){
  .hero{padding:56px 16px}
  .trust-items{gap:20px}
  .section{padding:48px 16px}
}
</style>
</head>
<body>

<nav>
  ${
    logoUrl
      ? `<img src="${logoUrl}" alt="${dati.nomeImpresa}" style="height:40px;object-fit:contain">`
      : `<a href="#" class="logo">${dati.nomeImpresa}</a>`
  }
  <a href="#contatti" class="nav-cta">${cta}</a>
</nav>

<section class="hero">
  <div class="hero-badge">${dati.settore} · ${dati.comuneSede}</div>
  <h1>${headline}</h1>
  <p>${sottotitolo}</p>
  <a href="#contatti" class="hero-cta">${cta}</a>
</section>

<div class="trust">
  <div class="trust-items">
    <div class="trust-item"><span>✓</span> Attività regolarmente registrata</div>
    <div class="trust-item"><span>✓</span> Sede a ${dati.comuneSede}</div>
    <div class="trust-item"><span>✓</span> Disponibile per appuntamenti</div>
  </div>
</div>

<section class="section">
  <div class="section-title">
    <h2>I nostri servizi</h2>
    <p>Cosa possiamo fare per te</p>
  </div>
  <div class="servizi-grid">
    ${(servizi ?? [])
      .map(
        (s: string, i: number) => `
    <div class="servizio-card">
      <div class="servizio-icon">${emojiServizi[i % emojiServizi.length]}</div>
      <h3>${s}</h3>
    </div>`,
      )
      .join("")}
  </div>
</section>

<section class="about">
  <div class="about-inner">
    <h2>Chi siamo</h2>
    <p>${descrizione}</p>
  </div>
</section>

<section class="contatti" id="contatti">
  <div class="contatti-inner">
    <h2>${cta}</h2>
    <p>Siamo a ${dati.comuneSede} — contattaci quando vuoi</p>
    <div class="contatti-grid">
      ${
        dati.telefono
          ? `
      <div class="contatto-item">
        <span>📞</span>
        <a href="tel:${dati.telefono}">${dati.telefono}</a>
        <span class="contatto-badge">Chiamaci</span>
      </div>`
          : ""
      }
      <div class="contatto-item">
        <span>✉️</span>
        <a href="mailto:${dati.email}">${dati.email}</a>
      </div>
      ${
        dati.indirizzo
          ? `
      <div class="contatto-item">
        <span>📍</span>
        <span>${dati.indirizzo}, ${dati.comuneSede} (${dati.provinciaSede})</span>
      </div>`
          : `
      <div class="contatto-item">
        <span>📍</span>
        <span>${dati.comuneSede} (${dati.provinciaSede})</span>
      </div>`
      }
      ${
        dati.orari
          ? `
      <div class="contatto-item">
        <span>🕐</span>
        <span>${dati.orari}</span>
      </div>`
          : ""
      }
    </div>
  </div>
</section>

<footer>
  <p>© ${new Date().getFullYear()} ${dati.nomeImpresa} · ${dati.comuneSede} · 
  Sito creato con <a href="https://zipra.it">Zipra ⚡</a></p>
</footer>

</body>
</html>`;
}

// ─── 3. Genera logo con Replicate ──────────────────────────────────────────────

export async function generaLogoAI(
  nomeImpresa: string,
  settore: string,
  colori: { primario: string; accento: string },
): Promise<string | null> {
  if (!process.env.REPLICATE_API_TOKEN) return null;

  try {
    const prompt = `Minimalist professional logo for "${nomeImpresa}", ${settore} business Italy. 
Clean vector style, white background, single abstract icon above company name. 
Color scheme: ${colori.primario} and ${colori.accento}. Modern, trustworthy, local business aesthetic.
No complex gradients, no shadows, simple geometric shapes.`;

    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-schnell",
        input: {
          prompt,
          width: 512,
          height: 512,
          num_outputs: 1,
          output_format: "png",
        },
      }),
    });

    let prediction = await res.json();
    let attempts = 0;

    while (prediction.status !== "succeeded" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        },
      );
      prediction = await poll.json();
      attempts++;
    }

    return prediction.output?.[0] ?? null;
  } catch (e) {
    console.error("Logo generation error:", e);
    return null;
  }
}

// ─── 4. Pubblica su Vercel ────────────────────────────────────────────────────

export async function pubblicaSuVercel(
  html: string,
  nomeProgetto: string,
): Promise<string | null> {
  if (!process.env.ZIPRA_VERCEL_TOKEN) return null;

  const slugProgetto = nomeProgetto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);

  try {
    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
       Authorization: `Bearer ${process.env.ZIPRA_VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `zipra-sito-${slugProgetto}`,
        files: [{ file: "index.html", data: html, encoding: "utf8" }],
        projectSettings: { framework: null },
        target: "production",
      }),
    });
    const data = await res.json();
    return data.url ? `https://${data.url}` : null;
  } catch (e) {
    console.error("Vercel deploy error:", e);
    return null;
  }
}

// ─── 5. Genera PDF istruzioni Google Business ─────────────────────────────────

export async function generaGuidaGoogleBusiness(dati: {
  nomeImpresa: string;
  settore: string;
  comuneSede: string;
  provinciaSede: string;
  indirizzo?: string;
  telefono?: string;
  email: string;
  sitoPubblicato?: string;
  orari?: string;
  descrizioneBreve: string;
  paroleChiave?: string[];
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width: w, height: h } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const norm = await doc.embedFont(StandardFonts.Helvetica);

  const VERDE = rgb(0, 0.769, 0.549);
  const SCURO = rgb(0.067, 0.094, 0.153);
  const GRIGIO = rgb(0.427, 0.478, 0.573);
  const GIALLO = rgb(0.984, 0.737, 0.02);
  const BLU = rgb(0.259, 0.522, 0.957);

  // Header
  page.drawRectangle({ x: 0, y: h - 85, width: w, height: 85, color: SCURO });
  page.drawText("zipra ⚡", {
    x: 48,
    y: h - 52,
    size: 20,
    font: bold,
    color: VERDE,
  });
  page.drawText("GUIDA CONFIGURAZIONE GOOGLE BUSINESS PROFILE", {
    x: 48,
    y: h - 71,
    size: 8,
    font: bold,
    color: rgb(0.5, 0.55, 0.65),
  });
  page.drawText("Generata il " + new Date().toLocaleDateString("it-IT"), {
    x: w - 180,
    y: h - 52,
    size: 8,
    font: norm,
    color: GRIGIO,
  });

  let y = h - 105;

  const r = (t: string, f: any, s = 9, c = SCURO, indent = 0) => {
    const maxChars = Math.floor((w - 96 - indent) / (s * 0.52));
    const words = t.split(" ");
    let line = "";
    for (const word of words) {
      if ((line + word).length > maxChars) {
        if (line.trim()) {
          page.drawText(line.trim(), {
            x: 48 + indent,
            y,
            size: s,
            font: f,
            color: c,
          });
          y -= s + 4;
        }
        line = word + " ";
      } else {
        line += word + " ";
      }
    }
    if (line.trim()) {
      page.drawText(line.trim(), {
        x: 48 + indent,
        y,
        size: s,
        font: f,
        color: c,
      });
      y -= s + 4;
    }
  };
  const sp = (n = 8) => {
    y -= n;
  };
  const box = (label: string, value: string) => {
    page.drawRectangle({
      x: 48,
      y: y - 6,
      width: w - 96,
      height: 24,
      color: rgb(0.97, 0.98, 0.99),
    });
    page.drawText(label + ":", {
      x: 52,
      y: y + 4,
      size: 8,
      font: bold,
      color: GRIGIO,
    });
    page.drawText(value, {
      x: 160,
      y: y + 4,
      size: 9,
      font: norm,
      color: SCURO,
    });
    y -= 28;
  };

  // Intro
  r(
    `Ciao! Abbiamo preparato tutto per configurare la scheda Google Business di ${dati.nomeImpresa}.`,
    bold,
    10,
  );
  r(
    "Segui questi passi in ordine — ci vogliono circa 15-20 minuti.",
    norm,
    9,
    GRIGIO,
  );
  sp(4);
  page.drawRectangle({
    x: 48,
    y: y - 8,
    width: w - 96,
    height: 28,
    color: rgb(0.94, 0.99, 0.96),
  });
  page.drawText(
    "✅  I tuoi dati sono già compilati qui sotto — copia e incolla!",
    {
      x: 54,
      y: y + 6,
      size: 9,
      font: bold,
      color: rgb(0.1, 0.5, 0.3),
    },
  );
  y -= 36;
  sp(8);

  // Sezione dati pre-compilati
  page.drawText("I TUOI DATI — COPIA E INCOLLA IN GOOGLE BUSINESS", {
    x: 48,
    y,
    size: 8,
    font: bold,
    color: VERDE,
  });
  y -= 20;
  box("Nome attività", dati.nomeImpresa);
  box("Categoria principale", `${dati.settore} — ${dati.comuneSede}`);
  box(
    "Indirizzo",
    dati.indirizzo
      ? `${dati.indirizzo}, ${dati.comuneSede} (${dati.provinciaSede})`
      : `${dati.comuneSede} (${dati.provinciaSede})`,
  );
  if (dati.telefono) box("Telefono", dati.telefono);
  box("Sito web", dati.sitoPubblicato ?? `(inserisci ${dati.email})`);
  if (dati.orari) box("Orari", dati.orari);
  sp(4);

  // Descrizione ottimizzata
  page.drawText("Descrizione ottimizzata (copia esattamente):", {
    x: 48,
    y,
    size: 8,
    font: bold,
    color: GRIGIO,
  });
  y -= 16;
  page.drawRectangle({
    x: 48,
    y: y - 40,
    width: w - 96,
    height: 52,
    color: rgb(0.98, 0.99, 1),
  });
  r(dati.descrizioneBreve, norm, 8.5, SCURO, 4);
  sp(8);

  if (dati.paroleChiave && dati.paroleChiave.length > 0) {
    box("Parole chiave da usare", dati.paroleChiave.join(" · "));
    sp(4);
  }

  // Steps
  sp(4);
  page.drawText("PASSI DA SEGUIRE", {
    x: 48,
    y,
    size: 8,
    font: bold,
    color: VERDE,
  });
  y -= 20;

  const steps = [
    {
      num: "1",
      titolo: "Vai su Google Business Profile",
      testo:
        "Apri il browser e vai su business.google.com — accedi con il tuo account Google.",
    },
    {
      num: "2",
      titolo: 'Clicca "Aggiungi la tua attività"',
      testo:
        'Cerca il nome della tua attività nella barra di ricerca. Se non esiste, clicca "Aggiungi la tua attività su Google".',
    },
    {
      num: "3",
      titolo: "Inserisci i dati usando la tabella qui sopra",
      testo:
        "Copia e incolla i dati pre-compilati dalla sezione in alto. Per la descrizione: usa esattamente il testo fornito.",
    },
    {
      num: "4",
      titolo: "Verifica l'attività",
      testo:
        "Google deve verificare che l'attività esista davvero. Le opzioni sono: SMS/chiamata al numero indicato, oppure cartolina postale (arriva in 5-14 giorni). Scegli SMS se disponibile — è il più veloce.",
    },
    {
      num: "5",
      titolo: "Carica le foto",
      testo:
        "Aggiungi almeno 5 foto: foto del locale (esterno e interno), foto di te al lavoro, logo aziendale. Le attività con foto ricevono il 42% di richieste di indicazioni in più.",
    },
    {
      num: "6",
      titolo: "Attiva i messaggi",
      testo:
        'Nella sezione "Messaggi" attiva la ricezione di messaggi diretti da Google Maps. I clienti potranno scriverti direttamente.',
    },
  ];

  for (const step of steps) {
    if (y < 120) break; // Evita di andare fuori pagina
    page.drawRectangle({
      x: 48,
      y: y - 4,
      width: 24,
      height: 24,
      color: VERDE,
    });
    page.drawText(step.num, {
      x: 56,
      y: y + 6,
      size: 11,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText(step.titolo, {
      x: 80,
      y: y + 8,
      size: 9,
      font: bold,
      color: SCURO,
    });
    r(step.testo, norm, 8, GRIGIO, 32);
    sp(6);
  }

  // Footer
  page.drawLine({
    start: { x: 48, y: 55 },
    end: { x: w - 48, y: 55 },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText("Hai difficoltà? Scrivici a info@zipra.it — ti aiutiamo noi.", {
    x: 48,
    y: 38,
    size: 8,
    font: norm,
    color: GRIGIO,
  });
  page.drawText("zipra.it", {
    x: w - 80,
    y: 38,
    size: 8,
    font: bold,
    color: VERDE,
  });

  return Buffer.from(await doc.save());
}

// ─── 6. Orchestratore principale — genera tutto ────────────────────────────────

export async function generaTuttoSitoVetrina({
  userId,
  praticaId,
  businessId,
  dati,
  isWhiteLabel = false,
}: {
  userId: string;
  praticaId?: string;
  businessId?: string;
  dati: DatiSitoVetrina;
  isWhiteLabel?: boolean;
}): Promise<void> {
  const supabase = createAdminClient();

  // Crea record sito in stato generazione
  const { data: sitoRecord } = await supabase
    .from("siti_vetrina")
    .insert({
      user_id: userId,
      pratica_id: praticaId ?? null,
      stato: "generazione",
    })
    .select("id")
    .single();

  const sitoId = sitoRecord?.id;

  try {
    // Step 1: Genera contenuti AI
    console.log(`[Sito] Generazione contenuti AI per ${dati.nomeImpresa}...`);
    const testi = await generaContenutiSitoAI(dati);

    // Step 2: Genera logo (se Replicate configurato)
    console.log(`[Sito] Generazione logo...`);
    const logoUrl = await generaLogoAI(dati.nomeImpresa, dati.settore, {
      primario: testi.colori?.primario ?? "#1a56db",
      accento: testi.colori?.accento ?? "#16a34a",
    });

    // Step 3: Genera HTML sito
    const html = generaHTMLSito(dati, testi, logoUrl ?? undefined);

    // Step 4: Pubblica su Vercel
    console.log(`[Sito] Deploy su Vercel...`);
    const urlPubblicato = await pubblicaSuVercel(
      html,
      `${dati.nomeImpresa}-${dati.comuneSede}`,
    );
    const nomeDominio = urlPubblicato
      ? urlPubblicato.replace("https://", "")
      : `zipra-${dati.nomeImpresa.toLowerCase().replace(/\s/g, "-")}.vercel.app`;

    // Step 5: Genera PDF Google Business
    console.log(`[Sito] Generazione guida Google Business...`);
    const pdfGoogleBusiness = await generaGuidaGoogleBusiness({
      nomeImpresa: dati.nomeImpresa,
      settore: dati.settore,
      comuneSede: dati.comuneSede,
      provinciaSede: dati.provinciaSede,
      indirizzo: dati.indirizzo,
      telefono: dati.telefono,
      email: dati.email,
      sitoPubblicato: urlPubblicato ?? undefined,
      orari: dati.orari,
      descrizioneBreve: testi.descrizione,
      paroleChiave: testi.paroleChiaveLocali,
    });

    // Archivia guida Google Business
    const docId = await salvaDocumento({
      userId,
      praticaId,
      nome: `guida-google-business-${dati.nomeImpresa.replace(/\s/g, "-")}.pdf`,
      descrizione: "Guida configurazione Google Business Profile",
      tipo: "altro",
      buffer: pdfGoogleBusiness,
      mimeType: "application/pdf",
      tags: ["google-business", "marketing", "sito"],
    });

    // Archivia anche l'HTML del sito
    await salvaDocumento({
      userId,
      praticaId,
      nome: `sito-${dati.nomeImpresa.replace(/\s/g, "-")}.html`,
      descrizione: "HTML sito vetrina",
      tipo: "altro",
      buffer: Buffer.from(html),
      mimeType: "text/html",
      tags: ["sito", "html"],
    });

    // Aggiorna record sito nel DB
    await supabase
      .from("siti_vetrina")
      .update({
        stato: urlPubblicato ? "pubblicato" : "revisione",
        url_pubblicato: urlPubblicato,
        nome_dominio: nomeDominio,
        testi,
        logo_url: logoUrl,
        colori: testi.colori,
        font: testi.font,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sitoId);

    // Recupera email utente per le notifiche
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("id", userId)
      .single();

    // Avvia Google Business in parallelo — non blocca l'email del sito
    (async () => {
      try {
        const { creaGoogleBusinessCompleto } =
          await import("@/lib/google/business");
        await creaGoogleBusinessCompleto({
          userId,
          praticaId,
          dati: {
            nomeImpresa: dati.nomeImpresa,
            settore: dati.settore,
            categoriaGoogle: dati.settore,
            descrizione: testi.descrizione,
            indirizzo: dati.indirizzo ?? "",
            citta: dati.comuneSede,
            provincia: dati.provinciaSede,
            cap: "",
            telefono: dati.telefono ?? "",
            email: dati.email,
            sitoWeb: urlPubblicato ?? undefined,
            fotoProfilo: logoUrl ?? undefined,
          },
          logoUrl: logoUrl ?? undefined,
          isWhiteLabel,
          nomeStudio: dati.nomeStudio,
        });
      } catch (e) {
        console.error("[Google Business]", e);
      }
    })();

    // Invia email sito
    await inviaEmailSitoCompleto({
      nome: profile?.nome ?? "Cliente",
      email: profile?.email ?? dati.email,
      nomeImpresa: dati.nomeImpresa,
      urlSito: urlPubblicato ?? `https://${nomeDominio}`,
      logoUrl: logoUrl ?? undefined,
      pdfGoogleBusinessBuffer: pdfGoogleBusiness,
      isWhiteLabel,
      nomeStudio: dati.nomeStudio,
    });

    // Invia credenziali editor (PIN accesso) — email separata
    await inviaCredenzialiEditor(userId, sitoId, dati.nomeImpresa);

    // Notifica in-app
    await inviaNotifica({
      userId,
      tipo: "sito_pronto",
      titolo: "🌐 Il tuo sito è online!",
      messaggio: `Il sito di ${dati.nomeImpresa} è pronto${urlPubblicato ? ". Trovi anche la guida per Google Business in email." : "."}`,
      praticaId,
      azioneUrl: `/dashboard/sito/${sitoId}`,
      templateData: {
        nome_impresa: dati.nomeImpresa,
        nome_dominio: nomeDominio,
        url_sito: urlPubblicato ?? `https://${nomeDominio}`,
      },
      canali: ["db", "email"],
    });
  } catch (e) {
    console.error("[Sito] Errore generazione:", e);
    await supabase
      .from("siti_vetrina")
      .update({ stato: "errore" })
      .eq("id", sitoId);
  }
}

// ─── 7. Email consegna sito + Google Business ─────────────────────────────────

// ─── Genera PIN e invia credenziali accesso editor ────────────────────────────

async function inviaCredenzialiEditor(
  userId: string,
  sitoId: string,
  nomeImpresa: string,
) {
  const { getOrCreaAccountSito } = await import("@/lib/sito/editor");
  const account = await getOrCreaAccountSito(sitoId, userId);

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", userId)
    .single();
  if (!profile) return;

  await resend.emails.send({
    from: "Zipra <notifiche@zipra.it>",
    to: profile.email,
    subject: `🔑 Accesso editor sito — ${nomeImpresa}`,
    html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb">
  <div style="background:#0D1117;padding:22px;text-align:center">
    <span style="color:#00C48C;font-weight:900;font-size:20px">zipra ⚡</span>
  </div>
  <div style="padding:28px">
    <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Puoi modificare il tuo sito quando vuoi</h2>
    <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 20px">
      Ciao <strong>${profile.nome}</strong>! Hai accesso libero all'editor del sito.
      Parla con l'AI di Zipra per cambiare testi, aggiungere foto o aggiornare le informazioni.
      È gratuito e ci vogliono pochi secondi.
    </p>
    <div style="background:#1e293b;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
      <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px">Il tuo PIN di accesso</p>
      <p style="color:#f1f5f9;font-size:36px;font-weight:900;font-family:monospace;letter-spacing:.3em;margin:0">${account.pin}</p>
    </div>
    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/sito-editor/${sitoId}?pin=${account.pin}"
       style="display:block;background:#00C48C;color:#0D1117;text-decoration:none;font-weight:700;
              padding:14px;text-align:center;border-radius:6px;font-size:15px;margin:20px 0">
      ✏️ Vai all'editor del sito →
    </a>
    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Salva questo PIN — ti serve ogni volta per accedere all'editor.
    </p>
  </div>
</div>`,
  });
}

async function inviaEmailSitoCompleto({
  nome,
  email,
  nomeImpresa,
  urlSito,
  logoUrl,
  pdfGoogleBusinessBuffer,
  isWhiteLabel,
  nomeStudio,
}: {
  nome: string;
  email: string;
  nomeImpresa: string;
  urlSito: string;
  logoUrl?: string;
  pdfGoogleBusinessBuffer: Buffer;
  isWhiteLabel: boolean;
  nomeStudio?: string;
}) {
  const mittente =
    isWhiteLabel && nomeStudio
      ? `${nomeStudio} <notifiche@zipra.it>`
      : "Zipra <notifiche@zipra.it>";

  const logoBase64 = pdfGoogleBusinessBuffer.toString("base64");

  await resend.emails.send({
    from: mittente,
    to: email,
    subject: `🎉 Il sito di ${nomeImpresa} è online — + Guida Google Business`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;color:#111827}
.container{max-width:580px;margin:0 auto;background:#fff;border:1px solid #e5e7eb}
.header{background:#0D1117;padding:28px;text-align:center}
.header-logo{font-size:22px;font-weight:900;color:#00C48C}
.body{padding:36px}
h2{font-size:22px;font-weight:700;margin:0 0 12px;color:#111827}
p{font-size:15px;line-height:1.7;color:#4b5563;margin:0 0 14px}
.site-box{background:#f0fdf4;border:2px solid #00C48C;padding:20px;margin:20px 0;border-radius:8px;text-align:center}
.site-url{font-size:20px;font-weight:700;color:#059669;word-break:break-all}
.features{background:#f8fafc;border-left:3px solid #00C48C;padding:16px 20px;margin:20px 0}
.features p{margin:4px 0;font-size:14px}
.cta{display:block;background:#00C48C;color:#fff!important;text-decoration:none;font-weight:700;padding:16px;text-align:center;margin:24px 0;border-radius:6px;font-size:16px}
.google-box{background:#fff7ed;border:1px solid #fed7aa;padding:20px;margin:20px 0;border-radius:8px}
.google-box h3{font-size:16px;font-weight:700;color:#c2410c;margin:0 0 8px}
.footer{padding:20px 36px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af}
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="header-logo">${isWhiteLabel && nomeStudio ? nomeStudio : "zipra ⚡"}</div>
  </div>
  <div class="body">
    <h2>🎉 Il tuo sito è online, ${nome}!</h2>
    <p>Abbiamo preparato <strong>tre cose</strong> per far partire la tua presenza online:</p>

    <div class="site-box">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Il tuo sito web</p>
      <div class="site-url">${urlSito}</div>
    </div>

    <div class="features">
      <p>✅ <strong>Sito web professionale</strong> — già online e indicizzabile da Google</p>
      <p>✅ <strong>Logo aziendale</strong> — generato su misura per ${nomeImpresa}</p>
      <p>✅ <strong>Guida Google Business</strong> — allegata a questa email (PDF)</p>
    </div>

    <a href="${urlSito}" class="cta">🌐 Visita il tuo sito →</a>

    <div class="google-box">
      <h3>📍 Prossimo passo: Google Business Profile</h3>
      <p style="font-size:14px;color:#92400e;margin:0">
        Abbiamo allegato a questa email una <strong>guida PDF con tutti i tuoi dati già compilati</strong>.
        Aprila, segui i 6 passi, e in 15-20 minuti la tua attività apparirà su Google Maps.
        Le attività con scheda Google ricevono <strong>5 volte più contatti</strong> di chi non ce l'ha.
      </p>
    </div>

    <p style="font-size:13px;color:#6b7280">
      Vuoi personalizzare il sito con le tue foto o cambiare qualcosa?
      Scrivici a <a href="mailto:info@zipra.it" style="color:#00C48C">info@zipra.it</a>
    </p>
  </div>
  <div class="footer">
    ${isWhiteLabel && nomeStudio ? `Servizio offerto da ${nomeStudio} tramite Zipra` : "Zipra S.r.l. — zipra.it"}
  </div>
</div>
</body>
</html>`,
    attachments: [
      {
        filename: `Guida-Google-Business-${nomeImpresa.replace(/\s/g, "-")}.pdf`,
        content: logoBase64,
      },
    ],
  });
}
