import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Genera contenuti sito con AI ────────────────────────────────────────────

export async function generaContenutiSito(pratica: any): Promise<any> {
  const prompt = `Sei un copywriter esperto di marketing locale italiano.
Genera i contenuti per il sito web di questa nuova impresa:

- Nome: ${pratica.nome_impresa}
- Settore: ${pratica.tipo_attivita}
- Comune: ${pratica.comune_sede}
- Descrizione: ${pratica.analisi_ai ?? ""}

Rispondi SOLO con JSON valido:
{
  "headline": "Titolo principale accattivante (max 8 parole)",
  "sottotitolo": "Sottotitolo che spiega cosa fa (max 15 parole)",
  "descrizione": "Paragrafo descrittivo dell'attività (3-4 frasi, tono professionale ma caldo)",
  "servizi": ["Servizio 1", "Servizio 2", "Servizio 3", "Servizio 4"],
  "cta": "Testo del bottone di contatto (es: Prenota ora, Chiamaci, Scrivici)",
  "colori": {
    "primario": "#XXXXXX",
    "secondario": "#XXXXXX",
    "accento": "#XXXXXX"
  },
  "font": "Nome font Google adatto al settore",
  "meta_description": "Descrizione SEO (max 160 caratteri)"
}`;

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(clean);
}

// ─── Genera HTML del sito vetrina ────────────────────────────────────────────

export function generaHtmlSito(dati: {
  nomeImpresa: string;
  comune: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  testi: any;
  logoUrl?: string;
}): string {
  const { nomeImpresa, comune, telefono, email, indirizzo, testi, logoUrl } =
    dati;
  const {
    headline,
    sottotitolo,
    descrizione,
    servizi,
    cta,
    colori,
    font,
    meta_description,
  } = testi;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${nomeImpresa} — ${comune}</title>
<meta name="description" content="${meta_description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${font?.replace(/ /g, "+")}:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: ${colori?.primario ?? "#1a56db"};
    --secondary: ${colori?.secondario ?? "#f3f4f6"};
    --accent: ${colori?.accento ?? "#16a34a"};
    --font: '${font}', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); color: #111827; line-height: 1.6; }

  /* Nav */
  nav { background: white; border-bottom: 1px solid #e5e7eb; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
  .logo { font-size: 20px; font-weight: 700; color: var(--primary); }

  /* Hero */
  .hero { background: linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 80%, black) 100%); color: white; padding: 80px 24px; text-align: center; }
  .hero h1 { font-size: clamp(28px, 5vw, 52px); font-weight: 700; margin-bottom: 16px; line-height: 1.2; }
  .hero p { font-size: 18px; opacity: 0.9; max-width: 560px; margin: 0 auto 32px; }
  .btn-hero { background: var(--accent); color: white; padding: 14px 32px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; text-decoration: none; display: inline-block; border-radius: 4px; }

  /* Servizi */
  .servizi { padding: 72px 24px; background: var(--secondary); }
  .servizi h2 { text-align: center; font-size: 28px; font-weight: 700; margin-bottom: 40px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; max-width: 900px; margin: 0 auto; }
  .card { background: white; padding: 28px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
  .card-icon { width: 48px; height: 48px; background: var(--primary); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
  .card h3 { font-size: 15px; font-weight: 600; color: #111827; }

  /* About */
  .about { padding: 72px 24px; max-width: 700px; margin: 0 auto; text-align: center; }
  .about h2 { font-size: 28px; font-weight: 700; margin-bottom: 20px; }
  .about p { font-size: 16px; color: #4b5563; }

  /* Contatti */
  .contatti { background: #111827; color: white; padding: 56px 24px; text-align: center; }
  .contatti h2 { font-size: 28px; font-weight: 700; margin-bottom: 24px; }
  .contatti-info { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; font-size: 15px; opacity: 0.8; }
  .contatti-info a { color: white; text-decoration: none; }

  /* Footer */
  footer { background: #0d1117; color: #6b7280; padding: 20px; text-align: center; font-size: 13px; }

  @media (max-width: 600px) {
    .hero { padding: 56px 16px; }
    .servizi, .about { padding: 48px 16px; }
  }
</style>
</head>
<body>

<nav>
  ${logoUrl ? `<img src="${logoUrl}" alt="${nomeImpresa}" style="height:40px;">` : `<span class="logo">${nomeImpresa}</span>`}
  <a href="#contatti" class="btn-hero" style="padding:10px 20px;font-size:14px;">${cta ?? "Contattaci"}</a>
</nav>

<section class="hero">
  <h1>${headline}</h1>
  <p>${sottotitolo}</p>
  <a href="#contatti" class="btn-hero">${cta ?? "Scrivici ora"}</a>
</section>

<section class="servizi" id="servizi">
  <h2>I nostri servizi</h2>
  <div class="grid">
    ${(servizi ?? [])
      .map(
        (s: string, i: number) => `
    <div class="card">
      <div class="card-icon">${["⭐", "🔑", "💡", "🤝"][i % 4]}</div>
      <h3>${s}</h3>
    </div>`,
      )
      .join("")}
  </div>
</section>

<section class="about" id="about">
  <h2>Chi siamo</h2>
  <p>${descrizione}</p>
</section>

<section class="contatti" id="contatti">
  <h2>${cta ?? "Contattaci"}</h2>
  <div class="contatti-info">
    ${telefono ? `<span>📞 <a href="tel:${telefono}">${telefono}</a></span>` : ""}
    ${email ? `<span>✉️ <a href="mailto:${email}">${email}</a></span>` : ""}
    ${indirizzo ? `<span>📍 ${indirizzo}, ${comune}</span>` : `<span>📍 ${comune}</span>`}
  </div>
</section>

<footer>
  © ${new Date().getFullYear()} ${nomeImpresa} · Sito creato con Zipra ⚡
</footer>

</body>
</html>`;
}

// ─── Pubblica sito su Vercel ──────────────────────────────────────────────────

export async function pubblicaSitoVercel(
  html: string,
  nomeProgetto: string,
): Promise<string | null> {
  if (!process.env.VERCEL_TOKEN) return null;

  try {
    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nomeProgetto.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
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

// ─── Genera logo con Replicate ────────────────────────────────────────────────

export async function generaLogo(
  nomeImpresa: string,
  settore: string,
): Promise<string | null> {
  if (!process.env.REPLICATE_API_TOKEN) return null;

  try {
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-schnell",
        input: {
          prompt: `Professional minimalist logo for "${nomeImpresa}", ${settore} business, Italy. Clean vector style, white background, single icon, modern typography. No text except company name.`,
          width: 512,
          height: 512,
          num_outputs: 1,
        },
      }),
    });
    const prediction = await res.json();

    // Poll per il risultato
    let result = prediction;
    let attempts = 0;
    while (result.status !== "succeeded" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        },
      );
      result = await pollRes.json();
      attempts++;
    }

    return result.output?.[0] ?? null;
  } catch (e) {
    console.error("Logo generation error:", e);
    return null;
  }
}
