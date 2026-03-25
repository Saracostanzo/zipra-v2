// scripts/crea-prodotti-stripe.ts
// Crea tutti i prodotti e price ID su Stripe dal catalogo Zipra
// Esegui UNA SOLA VOLTA in modalità test:
//   npx ts-node scripts/crea-prodotti-stripe.ts
// Output: aggiorna automaticamente .env.local con tutti i STRIPE_PRICE_xxx

import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// ─── Abbonamenti ───────────────────────────────────────────────────────────────
const ABBONAMENTI = [
  {
    key: 'STRIPE_PRICE_BASE',
    nome: 'Zipra Piano Base',
    desc: 'Apertura impresa completa + tutte le variazioni per 12 mesi. PEC inclusa. Paghi solo i diritti agli enti.',
    importo: 14900,
    tipo: 'recurring' as const,
    interval: 'year' as const,
  },
  {
    key: 'STRIPE_PRICE_PRO',
    nome: 'Zipra Piano Pro',
    desc: 'Piano Base + sito web professionale + Google Business + logo AI + mantenimento annuale incluso.',
    importo: 24900,
    tipo: 'recurring' as const,
    interval: 'year' as const,
  },
  {
    key: 'STRIPE_PRICE_MANTENIMENTO',
    nome: 'Zipra Mantenimento',
    desc: 'Adempimenti annuali automatici, notifiche scadenze, sconto 20% su tutte le pratiche.',
    importo: 2900,
    tipo: 'recurring' as const,
    interval: 'month' as const,
  },
  {
    key: 'STRIPE_PRICE_BUSINESS',
    nome: 'Zipra Business',
    desc: 'Per CAF, commercialisti e patronati. Dashboard clienti, gestione pratiche illimitata.',
    importo: 19900,
    tipo: 'recurring' as const,
    interval: 'month' as const,
  },
  {
    key: 'STRIPE_PRICE_BUSINESS_PRO',
    nome: 'Zipra Business Pro',
    desc: 'Business + siti vetrina illimitati per i clienti + Google Business per ogni cliente.',
    importo: 29900,
    tipo: 'recurring' as const,
    interval: 'month' as const,
  },
]

// ─── Pratiche singole dal catalogo ────────────────────────────────────────────
const PRATICHE = [
  { key: 'STRIPE_PRICE_APERTURA_DITTA',      id: 'apertura_ditta',         nome: 'Apertura ditta individuale',              importo: 7900  },
  { key: 'STRIPE_PRICE_APERTURA_SRL',        id: 'apertura_srl',           nome: 'Costituzione S.r.l.',                     importo: 14900 },
  { key: 'STRIPE_PRICE_VARIAZIONE_SEDE',     id: 'variazione_sede',        nome: 'Variazione sede legale',                  importo: 2900  },
  { key: 'STRIPE_PRICE_VARIAZIONE_ATECO',    id: 'variazione_ateco',       nome: 'Variazione codice ATECO',                 importo: 2900  },
  { key: 'STRIPE_PRICE_NOMINA_ADMIN',        id: 'nomina_amministratore',  nome: 'Nomina / cambio amministratore',          importo: 3900  },
  { key: 'STRIPE_PRICE_AGGIUNTA_SOCIO',      id: 'aggiunta_socio',         nome: 'Aggiunta / variazione soci',              importo: 7900  },
  { key: 'STRIPE_PRICE_AUMENTO_CAPITALE',    id: 'aumento_capitale',       nome: 'Aumento capitale sociale',                importo: 6900  },
  { key: 'STRIPE_PRICE_CESSAZIONE_DITTA',    id: 'cessazione_ditta',       nome: 'Cessazione ditta individuale',            importo: 2900  },
  { key: 'STRIPE_PRICE_LIQUIDAZIONE_SRL',    id: 'liquidazione_srl',       nome: 'Liquidazione e cancellazione S.r.l.',     importo: 6900  },
  { key: 'STRIPE_PRICE_DEPOSITO_BILANCIO',   id: 'deposito_bilancio',      nome: 'Deposito bilancio esercizio',             importo: 4900  },
  { key: 'STRIPE_PRICE_DIRITTO_ANNUALE',     id: 'diritto_annuale',        nome: 'Diritto annuale Camera di Commercio',     importo: 0     }, // gestito da Zipra
  { key: 'STRIPE_PRICE_SUAP_MODIFICA',       id: 'suap_modifica',          nome: 'Modifica autorizzazione SUAP',            importo: 4900  },
  { key: 'STRIPE_PRICE_RINNOVO_SANITARIO',   id: 'rinnovo_sanitario',      nome: 'Rinnovo autorizzazione sanitaria ASL',    importo: 4900  },
  { key: 'STRIPE_PRICE_TRASFORMAZIONE',      id: 'trasformazione',         nome: 'Trasformazione societaria',               importo: 14900 },
  { key: 'STRIPE_PRICE_SUBENTRO',            id: 'subentro_attivita',      nome: 'Subentro in attività esistente',          importo: 7900  },
  { key: 'STRIPE_PRICE_INPS_VARIAZIONE',     id: 'inps_variazione',        nome: 'Variazione posizione INPS',               importo: 4900  },
  // Attività regolamentate — il nostro punto di forza
  { key: 'STRIPE_PRICE_BAR_RISTORANTE',      id: 'bar_ristorante',         nome: 'Apertura bar / ristorante / pizzeria',    importo: 9900  },
  { key: 'STRIPE_PRICE_PARRUCCHIERE',        id: 'parrucchiere',           nome: 'Apertura parrucchiere / barbiere',        importo: 8900  },
  { key: 'STRIPE_PRICE_ESTETISTA',           id: 'estetista',              nome: 'Apertura centro estetico',                importo: 8900  },
  { key: 'STRIPE_PRICE_AUTORIPARATORE',      id: 'autoriparatore',         nome: 'Apertura officina / autoriparatore',      importo: 9900  },
  { key: 'STRIPE_PRICE_IMPIANTISTA',         id: 'impiantista',            nome: 'Apertura impiantista elettrico/idraulico', importo: 8900 },
  { key: 'STRIPE_PRICE_TAXI_NCC',            id: 'taxi_ncc',               nome: 'Licenza taxi / NCC',                      importo: 14900 },
  { key: 'STRIPE_PRICE_MEDIATORE',           id: 'mediatore_immobiliare',  nome: 'Abilitazione mediatore immobiliare',      importo: 9900  },
  { key: 'STRIPE_PRICE_AGENTE_COMMERCIO',    id: 'agente_commercio',       nome: 'Iscrizione agente di commercio',          importo: 7900  },
  { key: 'STRIPE_PRICE_COMMERCIO_DETTAGLIO', id: 'commercio_dettaglio',    nome: 'Apertura negozio / commercio al dettaglio', importo: 6900 },
  { key: 'STRIPE_PRICE_STUDIO_MEDICO',       id: 'studio_medico',          nome: 'Apertura studio medico / ambulatorio',    importo: 9900  },
  { key: 'STRIPE_PRICE_TATUATORE',           id: 'tatuatore',              nome: 'Apertura studio tatuaggi / piercing',     importo: 7900  },
  { key: 'STRIPE_PRICE_PANIFICIO',           id: 'panificio',              nome: 'Apertura panificio / pastificio',         importo: 8900  },
  { key: 'STRIPE_PRICE_FARMACIA',            id: 'farmacia',               nome: 'Pratiche farmacia / parafarmacia',        importo: 19900 },
  { key: 'STRIPE_PRICE_EDILIZIA',            id: 'edilizia',               nome: 'Apertura impresa edile / costruzioni',    importo: 7900  },
]

async function creaProdotto(nome: string, desc: string): Promise<string> {
  const prod = await stripe.products.create({
    name: nome,
    description: desc,
    metadata: { fonte: 'zipra_catalogo' },
  })
  return prod.id
}

async function creaPrezzo(prodId: string, importo: number, tipo: 'one_time' | 'recurring', interval?: 'month' | 'year'): Promise<string> {
  if (importo === 0) {
    // Pratiche gratuite (PEC, titolare effettivo ecc.) — non creare price su Stripe
    return 'GRATUITA'
  }
  const params: Stripe.PriceCreateParams = {
    product: prodId,
    currency: 'eur',
    unit_amount: importo,
    ...(tipo === 'recurring' ? {
      recurring: { interval: interval! }
    } : {}),
  }
  const price = await stripe.prices.create(params)
  return price.id
}

async function eliminaTuttiIProdotti() {
  console.log('🗑️  Eliminazione prodotti esistenti...')
  let count = 0
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const prodotti = await stripe.products.list({
      limit: 100,
      active: true,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const prod of prodotti.data) {
      // Archivia tutti i prezzi del prodotto
      const prezzi = await stripe.prices.list({ product: prod.id, limit: 100 })
      for (const price of prezzi.data) {
        if (price.active) {
          await stripe.prices.update(price.id, { active: false })
        }
      }
      // Archivia il prodotto
      await stripe.products.update(prod.id, { active: false })
      count++
      process.stdout.write('.')
    }

    hasMore = prodotti.has_more
    if (prodotti.data.length > 0) {
      startingAfter = prodotti.data[prodotti.data.length - 1].id
    }
  }
  console.log(`\n✓ Eliminati ${count} prodotti`)
}

async function main() {
  // Prima elimina tutto
  await eliminaTuttiIProdotti()

  console.log('\n🚀 Creazione prodotti Stripe per Zipra...\n')
  console.log(`📡 Modalità: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? '🟡 TEST' : '🔴 PRODUZIONE'}\n`)

  const nuoveVars: Record<string, string> = {}

  // ── Abbonamenti ──────────────────────────────────────────────────────────────
  console.log('─── Abbonamenti ────────────────────────────────────')
  for (const piano of ABBONAMENTI) {
    try {
      process.stdout.write(`  ${piano.nome}... `)
      const prodId = await creaProdotto(piano.nome, piano.desc)
      const priceId = await creaPrezzo(prodId, piano.importo, piano.tipo, piano.interval)
      nuoveVars[piano.key] = priceId
      console.log(`✓ ${priceId}`)
    } catch (e: any) {
      console.log(`✗ ERRORE: ${e.message}`)
    }
  }

  // ── Pratiche singole ─────────────────────────────────────────────────────────
  console.log('\n─── Pratiche singole ───────────────────────────────')
  for (const pratica of PRATICHE) {
    try {
      process.stdout.write(`  ${pratica.nome}... `)
      if (pratica.importo === 0) {
        nuoveVars[pratica.key] = 'GRATUITA'
        console.log('⊘ gratuita — saltata')
        continue
      }
      const prodId = await creaProdotto(
        `Zipra — ${pratica.nome}`,
        `Pratica singola: ${pratica.nome}. Gestita da Zipra per conto del cliente.`
      )
      const priceId = await creaPrezzo(prodId, pratica.importo, 'one_time')
      nuoveVars[pratica.key] = priceId
      console.log(`✓ ${priceId}`)
    } catch (e: any) {
      console.log(`✗ ERRORE: ${e.message}`)
    }
  }

  // ── Aggiorna .env.local ───────────────────────────────────────────────────────
  console.log('\n─── Aggiornamento .env.local ───────────────────────')
  const envPath = path.join(process.cwd(), '.env.local')
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  for (const [key, value] of Object.entries(nuoveVars)) {
    if (value === 'GRATUITA') continue
    const regex = new RegExp(`^${key}=.*$`, 'm')
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`)
    } else {
      envContent += `\n${key}=${value}`
    }
    console.log(`  ${key}=${value}`)
  }

  fs.writeFileSync(envPath, envContent)

  // ── Stampa riepilogo ─────────────────────────────────────────────────────────
  console.log('\n✅ Fatto! .env.local aggiornato con tutti i Price ID.\n')
  console.log('Prossimi passi:')
  console.log('  1. Riavvia il server: npm run dev')
  console.log('  2. Testa il checkout con carta 4242 4242 4242 4242')
  console.log('  3. Verifica i prodotti su https://dashboard.stripe.com/test/products\n')
}

main().catch(console.error)