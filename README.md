# ⚡ Zipra — Dal Download al Sito Online
## Guida Completa Step by Step
---

## Indice e tempi stimati

| # | Cosa fai | Tempo |
|---|---------|-------|
| [1](#step-1) | Installi Node.js sul computer | 5 min |
| [2](#step-2) | Crei il database su Supabase | 15 min |
| [3](#step-3) | Crei account Anthropic (AI Claude) | 5 min |
| [4](#step-4) | Crei account Voyage AI | 5 min |
| [5](#step-5) | Crei account Resend (email) | 5 min |
| [6](#step-6) | Decomprimi e configuri il progetto | 10 min |
| [7](#step-7) | Avvii l'app sul tuo computer | 2 min |
| [8](#step-8) | Crei il tuo account admin | 5 min |
| [9](#step-9) | Pubblichi online su Vercel | 20 min |
| [10](#step-10) | Pagamenti con Stripe | 20 min |
| [11](#step-11) | Firme digitali con Yousign | 10 min |
| [12](#step-12) | Google Business Profile API | 30 min + 1-3 gg approvazione |
| [13](#step-13) | SMS con Twilio (opzionale) | 10 min |
| [14](#step-14) | Loghi AI con Replicate (opzionale) | 5 min |
| [15](#step-15) | Accreditamento Telemaco/Infocamere | 30 min + 2-4 sett. attesa |
| [16](#step-16) | Scraping normative settimanale | 5 min |
| [17](#step-17) | Collaudo finale | 20 min |

**Totale prima configurazione: 3-4 ore** (escluse attese approvazioni esterne)

---

## Cos'è Zipra in breve

Zipra è una piattaforma web italiana che gestisce la burocrazia per le imprese:

- **Privati** che vogliono aprire un'impresa → wizard AI → checklist → Zipra invia le pratiche agli enti al posto loro
- **Chi ha già un'impresa** → catalogo 26 pratiche → chatbot AI → pagamento → Zipra gestisce
- **Commercialisti / CAF / Patronati** → piano Business → gestiscono tutti i loro clienti da un'unica dashboard

Il software invia le pratiche alle Camere di Commercio (via Telemaco), coordina con notai e commercialisti, genera siti web, crea la scheda Google Business, e tiene tutto archiviato.

---

## Step 1 — Installa Node.js {#step-1}

Node.js è il motore che fa girare l'app localmente.

### Mac
1. Vai su **https://nodejs.org**
2. Clicca il bottone verde **"LTS"**
3. Apri il file `.pkg` scaricato → Continua → Installa
4. Riavvia il Mac

### Windows
1. Vai su **https://nodejs.org**
2. Clicca **"LTS"** → scarica il file `.msi`
3. Aprilo → Next → Next → Install (tutto default)
4. Riavvia il computer

### Verifica
Apri il Terminale (Mac: `Cmd+Spazio` → scrivi "Terminale") o il Prompt dei comandi (Windows: tasto Windows → scrivi "cmd"):

```
node --version
```

Deve rispondere con qualcosa tipo `v20.11.0` ✅

Se dice "comando non trovato" → riavvia e riprova.

---

## Step 2 — Database Supabase {#step-2}

### 2a. Crea l'account
1. Vai su **https://supabase.com** → "Start your project" → "Sign up"
2. Registrati con Google o email
3. Conferma l'email se richiesto

### 2b. Crea il progetto
1. Clicca **"New project"**
2. Compila:
   - **Name:** `zipra`
   - **Database Password:** scegli una password sicura — **SALVALA subito**
   - **Region:** `West EU (Frankfurt)` — il più vicino all'Italia
3. Clicca **"Create new project"** → attendi 2-3 minuti

### 2c. Carica lo schema del database
Questo crea tutte le tabelle necessarie (utenti, pratiche, documenti, firme, ecc.)

1. Decomprimi `zipra-v2-FINALE.zip` → si crea la cartella `zipra-v2`
2. Apri `zipra-v2/supabase/schema.sql` con un editor di testo:
   - **Mac:** click destro → Apri con → TextEdit
   - **Windows:** click destro → Apri con → Blocco note
3. Seleziona tutto (`Cmd+A` o `Ctrl+A`) e copia (`Cmd+C` o `Ctrl+C`)
4. Su Supabase → menu sinistro → **"SQL Editor"** → **"New query"**
5. Clicca nell'area bianca e incolla (`Cmd+V` o `Ctrl+V`)
6. Clicca **"Run"** (in basso a destra) o premi `Ctrl+Enter`
7. Deve apparire: `Success. No rows returned` ✅

Se appare testo rosso → vai a [Risoluzione Problemi](#problemi)

### 2d. Abilita pgvector (per ricerca AI)
1. Menu sinistro → **"Database"** → **"Extensions"**
2. Cerca `vector` nella barra di ricerca
3. Assicurati che il toggle sia **verde/attivo**

### 2e. Crea bucket documenti
1. Menu sinistro → **"Storage"** → **"New bucket"**
2. Name: `documenti`
3. **"Public bucket"** → lascia **disattivato**
4. Clicca **"Create bucket"**

### 2f. Copia le chiavi API
1. Menu sinistro in fondo → **"Settings"** → **"API"**
2. Salva questi tre valori in un documento di testo:

```
Project URL:   https://XXXXX.supabase.co
anon public:   eyJhbGci... (stringa lunghissima)
service_role:  eyJhbGci... (SEGRETISSIMA — non condividerla mai)
```

---

## Step 3 — Anthropic (AI Claude) {#step-3}

### Crea account
1. Vai su **https://console.anthropic.com** → "Sign up"
2. Registrati → conferma email

### Aggiungi credito
1. Menu → **"Billing"** → **"Add credit"**
2. Aggiungi **$5** (circa €5) — bastano per centinaia di pratiche (~$0.01 per analisi)

### Crea chiave API
1. Menu → **"API Keys"** → **"Create Key"**
2. Nome: `zipra`
3. Clicca **"Create Key"**
4. ⚠️ **La chiave appare UNA volta sola.** Copiala subito. Inizia con `sk-ant-`

---

## Step 4 — Voyage AI (ricerca normative) {#step-4}

Trasforma le normative in formato ricercabile dall'AI. Piano gratuito sufficiente per iniziare.

1. Vai su **https://www.voyageai.com** → "Get started"
2. Registrati con email
3. Dashboard → **"API Keys"** → crea una chiave
4. Copiala. Inizia con `pa-`

---

## Step 5 — Resend (email) {#step-5}

Manda le email agli utenti: notifiche pratiche, credenziali, ricevute.

1. Vai su **https://resend.com** → "Start for free"
2. Registrati → conferma email
3. Menu → **"API Keys"** → **"Create API Key"**
4. Nome: `zipra` → Permission: `Full access` → "Add"
5. Copia la chiave. Inizia con `re_`

> Le prime email partono da `onboarding@resend.dev`. Quando avrai un dominio (es. zipra.it) configurerai il tuo indirizzo — spiegato al [Step 9](#step-9).

---

## Step 6 — Configura il progetto {#step-6}

### 6a. Apri il Terminale nella cartella del progetto

**Mac:**
1. Apri Terminale
2. Scrivi `cd ` (con spazio)
3. Trascina la cartella `zipra-v2` nel Terminale
4. Premi Invio

**Windows:**
1. Apri la cartella `zipra-v2` in Esplora risorse
2. Clicca sulla barra dell'indirizzo → scrivi `cmd` → Invio

### 6b. Installa i pacchetti
```
npm install --legacy-peer-deps
```
Attendi 1-3 minuti. Quando riappare il cursore, ha finito.

### 6c. Crea il file di configurazione

**Mac:**
```
cp .env.example .env.local
```

**Windows:**
```
copy .env.example .env.local
```

### 6d. Compila il file `.env.local`

Apri `.env.local` con un editor di testo.

**Mac:** nel Terminale scrivi `open .env.local`
**Windows:** nel prompt scrivi `notepad .env.local`

Compila queste righe (sostituisci con i tuoi valori reali):

```
# ── SUPABASE ──────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://tuocodice.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ── AI ────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...

# ── EMAIL ─────────────────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── APP ───────────────────────────────────────────────────────────
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CRON_SECRET=scegli-una-parola-segreta-qualsiasi
```

**Regole:** niente spazi intorno all'`=`, niente virgolette, salva il file.

---

## Step 7 — Avvia l'app {#step-7}

Nel Terminale:
```
npm run dev
```


Attendi finché non appare:
```
▲ Next.js 14
- Local: http://localhost:3000
✓ Ready in 2.3s
```

Apri il browser su **http://localhost:3000**

✅ Vedi la homepage Zipra con sfondo scuro → tutto funziona
❌ Vedi un errore → vai a [Risoluzione Problemi](#problemi)

> Il Terminale deve restare aperto mentre usi l'app. Per fermarla: `Ctrl+C`

---

## Step 8 — Crea il tuo account admin {#step-8}

### 8a. Registrati
1. Vai su `http://localhost:3000/auth/signup`
2. Inserisci la tua email reale e una password
3. Controlla la casella email → clicca il link di conferma Supabase
4. Torna all'app → completa l'onboarding (scegli "Voglio aprire la mia impresa" per testare)

### 8b. Imposta il tuo account come admin
1. Vai su Supabase → **"SQL Editor"** → **"New query"**
2. Incolla questo (con la tua email):

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'tua@email.com';
```

3. Clicca **"Run"** → deve dire `Success. 1 rows affected`

### 8c. Verifica
Vai su `http://localhost:3000/admin` → deve apparire la dashboard admin ✅

---

# ⚡ Zipra — Guida Completa Setup e Configurazione
## Versione 2 — aggiornata con API enti, procura speciale, todo admin

---

## Indice

| # | Cosa fai | Tempo | Stato |
|---|---------|-------|-------|
| [1](#step-1) | Node.js | 5 min | ✅ |
| [2](#step-2) | Supabase — database | 15 min | ✅ |
| [3](#step-3) | Anthropic (AI Claude) | 5 min | ✅ |
| [4](#step-4) | Voyage AI | 5 min | ✅ |
| [5](#step-5) | Resend (email) | 5 min | ✅ |
| [6](#step-6) | Configura progetto e .env | 10 min | ✅ |
| [7](#step-7) | Avvia app locale | 2 min | ✅ |
| [8](#step-8) | Account admin | 5 min | ✅ |
| [9](#step-9) | Vercel — deploy online | 20 min | ← SEI QUI |
| [10](#step-10) | Stripe — pagamenti | 20 min | |
| [11](#step-11) | Yousign — firma digitale e procura | 15 min | |
| [12](#step-12) | Procura speciale — test end-to-end | 10 min | |
| [13](#step-13) | API enti — test modalità mock | 10 min | |
| [14](#step-14) | INPS API — test | 15 min | |
| [15](#step-15) | Casellario Giustizia — test | 15 min | |
| [16](#step-16) | SUAP impresainungiorno — test | 15 min | |
| [17](#step-17) | ComUnica Telemaco — test | 20 min | |
| [18](#step-18) | Flusso pratica completa end-to-end | 30 min | |
| [19](#step-19) | Google Business Profile API | 30 min + 1-3gg | |
| [20](#step-20) | Twilio SMS (opzionale) | 10 min | |
| [21](#step-21) | Replicate loghi AI (opzionale) | 5 min | |
| [22](#step-22) | Telemaco/Infocamere — accreditamento reale | 30 min + 2-4 sett. | |
| [23](#step-23) | Scraping normative settimanale | 5 min | |
| [24](#step-24) | Collaudo finale completo | 30 min | |

---



### 9a. Crea account GitHub

1. Vai su **https://github.com** → "Sign up"
2. Registrati → conferma email

### 9b. Carica il codice su GitHub

Nel terminale dentro la cartella `zipra-v2`:

```bash
git init
git add .
git commit -m "Zipra v2 — prima versione"
```

Su GitHub → clicca **"+"** → **"New repository"**:
- Name: `zipra-v2`
- Seleziona **"Private"**
- Clicca **"Create repository"**

GitHub ti mostra dei comandi. Copia e incolla la riga `git remote add origin https://...`, poi:

```bash
git push -u origin main
```

### 9c. Deploy su Vercel

1. Vai su **https://vercel.com** → "Sign up" → "Continue with GitHub"
2. Dashboard → **"Add New Project"** → seleziona `zipra-v2` → "Import"
3. **NON cliccare Deploy ancora**

### 9d. Aggiungi variabili d'ambiente su Vercel

Nella sezione **"Environment Variables"** aggiungi tutte le variabili del tuo `.env.local` una per una. Seleziona sempre: ✅ Production ✅ Preview ✅ Development

Per ora metti queste obbligatorie:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VOYAGE_API_KEY
RESEND_API_KEY
NEXT_PUBLIC_BASE_URL        → https://zipra-v2.vercel.app (aggiorna dopo)
CRON_SECRET
```

Poi clicca **"Deploy"** → attendi 2-3 minuti.

### 9e. Aggiorna URL base

Dopo il deploy Vercel ti dà un URL tipo `https://zipra-v2-abc123.vercel.app`:
1. Vercel → progetto → **Settings → Environment Variables**
2. Modifica `NEXT_PUBLIC_BASE_URL` con il tuo URL reale
3. **Deployments → "Redeploy"**

### 9f. Rimetti il tuo account come admin sul database Vercel

Dopo il deploy il database è lo stesso (Supabase) quindi il tuo account admin funziona già.
Se hai problemi:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'zipra.dev@gmail.com';
```

### 9g. Dominio personalizzato (opzionale)

1. Vercel → Settings → **"Domains"** → "Add" → inserisci il tuo dominio
2. Vercel ti mostra record DNS da aggiungere al tuo registrar (Aruba, Register.it, GoDaddy)
3. Aggiungi i record DNS → attendi 30 min - 48 ore

---

## Step 10 — Stripe (pagamenti) {#step-10}

### 10a. Crea account

1. Vai su **https://stripe.com** → "Start now"
2. Registrati → verifica email

### 10b. Crea i prodotti

Vai su **"Products"** → **"Add product"** — crea questi 6:

| Nome | Tipo | Prezzo |
|------|------|--------|
| Zipra Base | One time | €149 |
| Zipra Pro | One time | €249 |
| Zipra Mantenimento | Recurring Monthly | €29 |
| Zipra Business | Recurring Monthly | €199 |
| Zipra Business Pro | Recurring Monthly | €299 |

Per ogni prodotto copia il **Price ID** (formato `price_1Abc...`).

### 10c. Chiavi API

**"Developers"** → **"API keys"**:
- **Publishable key:** `pk_test_...`
- **Secret key:** `sk_test_...`

### 10d. Webhook

1. **"Developers"** → **"Webhooks"** → **"Add endpoint"**
2. URL: `https://tuodominio.vercel.app/api/stripe/webhook`
3. Seleziona eventi: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copia il **Signing secret** (`whsec_...`)

### 10e. Variabili .env.local e Vercel

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_MANTENIMENTO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_BUSINESS_PRO=price_...
```

### 10f. Test pagamento

1. Vai su `/prezzi` → "Acquista" Piano Base
2. Carta test: `4242 4242 4242 4242` · `12/30` · `123`
3. ✅ Redirect pagina successo → Supabase tabella `pagamenti` ha un record

---

## Step 11 — Yousign (firma digitale e procura speciale) {#step-11}

Yousign gestisce due documenti fondamentali:
- **Contratto di servizio** → firmato al primo pagamento
- **Procura speciale** → firmata alla registrazione → abilita Zipra ad agire per conto del cliente

### 11a. Crea account Sandbox

1. Vai su **https://yousign.com** → "Start free trial"
2. Registrati → nel dashboard seleziona **Sandbox** (non Production)
3. **Developers → API Keys** → crea chiave → copiala

### 11b. Configura webhook

1. Yousign → **Developers → Webhooks** → "Add webhook"
2. **URL:** `https://tuodominio.vercel.app/api/firma/webhook`
3. **Environment:** Sandbox
4. **Subscribed events:** seleziona tutto oppure almeno:
   - `signature_request.activated`
   - `signer.done`
   - `signature_request.done`
   - `signature_request.expired`
5. Salva → copia il **Webhook Secret**

### 11c. Variabili

```env
YOUSIGN_API_KEY=il_tuo_api_key_sandbox
YOUSIGN_SANDBOX=true
YOUSIGN_WEBHOOK_SECRET=il_tuo_webhook_secret
```

### 11d. Come funziona in Sandbox

In modalità sandbox:
- Le email di firma vengono inviate normalmente
- L'OTP SMS viene simulato — Yousign mostra un link diretto senza richiedere SMS reale
- I PDF firmati vengono generati normalmente
- Puoi firmare tu stesso per testare il flusso completo

---

## Step 12 — Procura speciale — test end-to-end {#step-12}

La procura speciale è il documento legale che autorizza Zipra ad agire per conto del cliente presso CCIAA, SUAP, INPS, Agenzia delle Entrate e Ministero della Giustizia.

### Come testare il flusso completo

**1. Registra un utente test**

Vai su `/auth/signup` e crea un account con:
- Email: una tua email reale (riceverai il link di firma)
- Compila tutti i dati anagrafici (codice fiscale, data nascita, residenza, telefono)

**2. Verifica che la procura venga inviata**

Dopo la registrazione il sistema chiama automaticamente `/api/procura` che:
- Genera il PDF della procura con i tuoi dati
- Lo carica su Yousign Sandbox
- Invia email con link di firma
- Se Yousign non è configurato → crea un todo admin manuale

Controlla:
- ✅ Email ricevuta da Yousign con oggetto "Firma richiesta — Zipra"
- ✅ Supabase → tabella `profiles` → colonna `yousign_procura_id` popolata

**3. Firma il documento**

Clicca il link nell'email → si apre Yousign Sandbox → firma con OTP (in sandbox ti dà il codice direttamente senza SMS).

**4. Verifica la firma registrata**

Supabase → tabella `profiles` → controlla:
- `procura_firmata = true`
- `procura_firmata_il` ha una data
- `procura_url` ha l'URL del PDF firmato

**Se Yousign non è ancora configurato (modalità mock):**

Il sistema crea automaticamente un todo admin. Vai su `/admin/pratiche/[id]` → tab "Todo" → vedrai la richiesta con istruzioni manuali.

---

## Step 13 — API enti — test modalità mock {#step-13}

Tutte le API degli enti italiani funzionano in **doppia modalità**:

| Modalità | Quando | Cosa succede |
|----------|--------|--------------|
| **Mock** | API key non configurata | Crea todo admin con istruzioni manuali dettagliate |
| **Reale** | API key configurata | Chiama l'ente e salva il documento su Supabase Storage |

**Il mock è completamente funzionale per partire.** Tutto viene tracciato e gestibile dall'admin.

### Esegui il SQL schema v2

Prima di testare le API enti assicurati di aver eseguito `schema-zipra-v2-completo.sql` su Supabase → SQL Editor. Questo crea le tabelle:
- `todo_admin` — lista attività manuali admin
- `documenti_pratica` — documenti recuperati per ogni pratica
- `azioni_admin` — log di tutte le azioni

### Testa la pagina admin pratica singola

1. Crea una pratica dal wizard
2. Vai su `/admin/pratiche/[id]` (usa l'ID dalla tabella pratiche)
3. Dovresti vedere 5 tab: Overview, Todo, Documenti, Invia agli enti, Log

Se la pagina non esiste ancora: metti il file `admin-pratica-singola.tsx` in `src/app/admin/pratiche/[id]/page.tsx`.

---

## Step 14 — INPS API {#step-14}

### Cosa fa

Recupera automaticamente per conto del cliente:
- Estratto contributivo (storico versamenti)
- Posizione previdenziale attuale
- Verifica debiti contributivi

Necessario per: documentare esperienza lavorativa (impiantisti, autoriparatori, ecc.)

### Accesso API INPS — come ottenerlo

L'INPS ha un portale API ufficiale per intermediari abilitati (patronati, CAF, consulenti del lavoro).

**Percorso ufficiale:**
1. Vai su **https://api.inps.it**
2. Sezione "Per gli sviluppatori" → registra la tua applicazione
3. Seleziona le API necessarie: `estratto-conto-previdenziale`, `posizione-assicurativa`
4. Compila il modulo di richiesta indicando che operi come intermediario
5. Attendi approvazione (1-2 settimane)

**Nel frattempo usa la modalità mock:**

Qualsiasi richiesta a `/api/enti/inps` senza `INPS_CLIENT_ID` configurato crea automaticamente un todo admin con istruzioni passo-passo per recuperare il documento manualmente dal portale INPS.

### Test mock

1. Vai su `/admin/pratiche/[id]` → tab "Invia agli enti"
2. Clicca "Estratto contributivo INPS"
3. ✅ Appare messaggio "Todo aggiunto"
4. Vai su tab "Todo" → vedi le istruzioni manuali con CF del cliente

### Variabili (dopo accreditamento)

```env
INPS_API_URL=https://api.inps.it/api
INPS_CLIENT_ID=il_tuo_client_id
INPS_CLIENT_SECRET=il_tuo_client_secret
```

---

## Step 15 — Casellario Giudiziale (Ministero Giustizia) {#step-15}

### Cosa fa

Richiede automaticamente il certificato penale e carichi pendenti.
Necessario per: taxi, NCC, vigilanza privata, mediatori, agenti di commercio.

### Accesso — come ottenerlo

Il Ministero della Giustizia permette ai soggetti abilitati (CAF, patronati, intermediari) di richiedere certificati online per conto di terzi.

**Percorso ufficiale:**
1. Vai su **https://servizi.giustizia.it**
2. Cerca "certificati online per intermediari"
3. Registra la tua organizzazione come intermediario abilitato
4. Ricevi credenziali di accesso

**Nel frattempo usa la modalità mock:**

Qualsiasi richiesta a `/api/enti/casellario` senza `GIUSTIZIA_CLIENT_ID` configurato crea un todo admin con le istruzioni per richiederlo manualmente su `servizi.giustizia.it`.

### Test mock

1. Crea una pratica taxi o NCC
2. Vai su `/admin/pratiche/[id]` → tab "Invia agli enti"
3. Clicca "Richiedi Casellario"
4. ✅ Se la procura è firmata → todo creato con istruzioni
5. ✅ Se la procura NON è firmata → errore con bottone "Invia reminder procura"

### Variabili (dopo accreditamento)

```env
GIUSTIZIA_API_URL=https://portale.giustizia.it/api
GIUSTIZIA_CLIENT_ID=il_tuo_client_id
GIUSTIZIA_CLIENT_SECRET=il_tuo_client_secret
```

---

## Step 16 — SUAP impresainungiorno.gov.it {#step-16}

### Cosa fa

Invia automaticamente le SCIA (Segnalazioni Certificate di Inizio Attività) al Comune per:
bar, ristoranti, negozi, parrucchieri, estetisti, pulizie, facchinaggio, autoriparatori, ecc.

### Accesso API SUAP — come ottenerlo

Il portale nazionale `impresainungiorno.gov.it` ha API per intermediari abilitati.

**Percorso ufficiale:**
1. Vai su **https://www.impresainungiorno.gov.it**
2. Sezione "Per intermediari" → richiedi accreditamento
3. Indica che operi come intermediario per pratiche SCIA
4. Attendi accreditamento (2-4 settimane)

**Nel frattempo usa la modalità mock:**

Qualsiasi richiesta a `/api/enti/suap` senza `SUAP_API_KEY` configurata crea un todo admin con:
- Tipo di SCIA da inviare
- Comune di destinazione
- Dati del cliente pre-compilati
- Link diretto al portale SUAP del comune
- Istruzioni passo-passo per l'invio manuale

### Test mock

1. Crea una pratica "apertura bar" o "parrucchiere"
2. Vai su `/admin/pratiche/[id]` → tab "Invia agli enti"
3. Clicca "Invia SCIA SUAP"
4. ✅ Todo creato con istruzioni complete per invio manuale

### Variabili (dopo accreditamento)

```env
SUAP_API_URL=https://www.impresainungiorno.gov.it/api
SUAP_API_KEY=il_tuo_api_key
```

---

## Step 17 — ComUnica Telemaco {#step-17}

### Cosa fa

ComUnica è il canale unico per aprire un'impresa: invia in un solo colpo a:
- Camera di Commercio (iscrizione Registro Imprese)
- Agenzia delle Entrate (apertura P.IVA)
- INPS (iscrizione gestione artigiani/commercianti)
- INAIL (se attività a rischio)

### Accesso Telemaco — come ottenerlo (TEST)

Infocamere ha un ambiente di test (staging) per sviluppatori.

**Percorso ufficiale:**
1. Vai su **https://www.infocamere.it** → sezione sviluppatori
2. Cerca "ambiente di test Telemaco" o "staging webtelemaco"
3. Registra la tua applicazione come software house intermediaria
4. Ricevi credenziali test

**Accreditamento reale** (vedi [Step 22](#step-22)) richiede società costituita con P.IVA e firma digitale CNS.

**Nel frattempo usa la modalità mock:**

Qualsiasi richiesta a `/api/enti/comunica` senza `TELEMACO_USER` configurato crea un todo admin con:
- Tipo di pratica ComUnica da inviare
- Moduli necessari (S1, S5, I1, UL, SCIA_xxx)
- Dati cliente pre-compilati
- Link diretto a Telemaco o impresainungiorno
- Istruzioni passo-passo per l'invio manuale con firma digitale

### Test mock

1. Crea una pratica "apertura ditta individuale"
2. Completa il wizard con tutti i dati (indirizzo sede, ATECO, data inizio)
3. Vai su `/admin/pratiche/[id]` → tab "Invia agli enti"
4. Verifica che la procura sia firmata (obbligatoria)
5. Clicca "Invia ComUnica"
6. ✅ Todo creato con istruzioni complete + tutti i dati pre-compilati
7. Vai su tab "Todo" → espandi → vedi moduli da compilare, dati CF, ATECO, sede

### Variabili (dopo accreditamento)

```env
TELEMACO_URL=https://webtelemaco.infocamere.it/wspratic/rest
TELEMACO_USER=il_tuo_username
TELEMACO_PASS=la_tua_password
ZIPRA_CF_PIVA=CODICE_FISCALE_ZIPRA_SRL
```

---

## Step 18 — Flusso pratica completa end-to-end {#step-18}

Questo è il test più importante. Simula una pratica reale dalla registrazione all'invio.

### Flusso completo da testare

**1. Registrazione utente**
- Vai su `/auth/signup`
- Inserisci dati reali (email, nome, CF, data nascita, residenza, telefono)
- ✅ Procura speciale inviata via Yousign (o todo mock creato)
- ✅ Redirect alla dashboard

**2. Firma procura**
- Utente apre email Yousign → firma (in sandbox: OTP automatico)
- ✅ Supabase: `profiles.procura_firmata = true`

**3. Wizard apertura impresa**
- Vai su `/wizard`
- Compila tutti i 7 step:
  - Step 1: tipo attività (es. "voglio aprire un bar")
  - Step 2: forma giuridica (ditta individuale)
  - Step 3: dati sede (comune, indirizzo, CAP, provincia)
  - Step 4: dati personali (CF, data nascita confermati)
  - Step 5: codice ATECO (AI suggerisce automaticamente)
  - Step 6: documenti (carica CI, eventuali attestati)
  - Step 7: riepilogo → invia
- ✅ Pratica creata in Supabase con `stato = 'in_revisione_admin'`

**4. Admin riceve la pratica**
- Vai su `/admin`
- ✅ Vedi la nuova pratica nella lista
- Clicca sulla pratica → `/admin/pratiche/[id]`
- ✅ Overview con tutti i dati del wizard
- ✅ Tab Todo mostra automaticamente le azioni da fare per quel tipo di pratica

**5. Admin invia agli enti (mock)**
- Tab "Invia agli enti"
- ✅ Procura firmata → bottoni attivi
- Clicca "Invia ComUnica" → todo creato con istruzioni
- Clicca "Invia SCIA SUAP" → todo creato con istruzioni
- Se taxi/NCC: Clicca "Richiedi Casellario" → todo creato

**6. Admin completa i todo manualmente**
- Tab "Todo"
- Segui le istruzioni per ogni todo
- Clicca "✓ Fatto" per completare
- ✅ Pratica avanza di stato

**7. Cambio stato pratica**
- Dropdown stato → seleziona "completata"
- ✅ Log registra il cambio
- ✅ (Se Resend configurato) Utente riceve email notifica

### Checklist test end-to-end

```
□ Registrazione con dati completi
□ Procura inviata (Yousign o todo mock)
□ Procura firmata e registrata in DB
□ Wizard completato (tutti 7 step)
□ Pratica creata in Supabase
□ Admin vede pratica in /admin
□ Pagina pratica singola caricata
□ Tab Todo mostra azioni corrette
□ ComUnica → todo con istruzioni
□ SCIA SUAP → todo con istruzioni
□ Casellario → todo con istruzioni (se pertinente)
□ Todo completati manualmente
□ Stato pratica aggiornato
□ Log azioni registrato
```

---

## Step 19 — Google Business Profile API {#step-19}

### Cosa fa

Per piano Pro: crea automaticamente la scheda Google Business del cliente con tutti i dati dell'impresa.

### 19a. Crea progetto Google Cloud

1. Vai su **https://console.cloud.google.com**
2. In alto → selettore progetto → **"New Project"**
3. Nome: `zipra-prod` → Crea

### 19b. Abilita Business Profile API

1. Menu → **"APIs & Services"** → **"Enable APIs and Services"**
2. Cerca **"Business Profile API"** → clicca → **"Enable"**

### 19c. Crea Service Account

1. Menu → **"IAM & Admin"** → **"Service Accounts"** → **"Create Service Account"**
2. Nome: `zipra-service` → Crea
3. Clicca sul service account → tab **"Keys"** → **"Add Key"** → JSON
4. Si scarica un file `.json` — aprilo e copia `client_email` e `private_key`

### 19d. Richiedi accesso all'API

⚠️ Obbligatorio — Google richiede approvazione manuale.

1. Vai su **https://developers.google.com/my-business/content/prereqs**
2. Compila il modulo di accesso
3. Descrivi: *"Piattaforma italiana che crea schede Google Business per imprenditori che aprono nuove attività, operando come intermediario con procura speciale firmata digitalmente."*
4. Attendi 1-3 giorni lavorativi

### 19e. Variabili

```env
GOOGLE_PROJECT_ID=zipra-prod
GOOGLE_CLIENT_EMAIL=zipra-service@zipra-prod.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## Step 20 — Twilio SMS (opzionale) {#step-20}

1. Vai su **https://www.twilio.com/try-twilio** → registrati (€15 credito gratuito)
2. Console → copia **Account SID** e **Auth Token**
3. **Phone Numbers → Buy a number** → filtra Italy (~€1/mese)

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+390XXXXXXXXXX
```

---

## Step 21 — Replicate loghi AI (opzionale) {#step-21}

1. Vai su **https://replicate.com** → Sign up con GitHub
2. **Account → API Tokens → Create token**
3. **Billing → Add payment method** (~$0.003 per logo)

```env
REPLICATE_API_TOKEN=r8_...
```

---

## Step 22 — Telemaco/Infocamere — accreditamento reale {#step-22}

Questo ti permette di inviare ComUnica direttamente senza intervento manuale.

### Cosa ti serve prima di fare domanda

1. **Società costituita** con P.IVA attiva e visura camerale recente (max 3 mesi)
2. **Firma digitale CNS** — se non ce l'hai:
   - Ufficio postale → chiedi "CNS" o "Carta Nazionale dei Servizi"
   - Oppure online: **https://www.namirial.com** o **https://www.aruba.it** → "Firma Digitale Remota"
   - Costo: €20-50/anno
   - La firma **remota** è la più comoda — funziona da app
3. **PEC aziendale** registrata nel Registro Imprese

### Come fare domanda

1. Vai su **https://www.infocamere.it**
2. Cerca "accreditamento intermediari telematici" o "software house Telemaco"
3. Scarica il modulo di richiesta
4. Compila indicando:
   - Ragione sociale: Zipra S.r.l.
   - P.IVA: la tua
   - Nome software: `Zipra`
   - Descrizione: gestione pratiche camerali e ComUnica per conto di terzi via piattaforma web, con procura speciale firmata digitalmente dall'utente finale
5. Allega: visura camerale + documento d'identità legale rappresentante
6. Invia tutto via **PEC** aziendale all'indirizzo indicato nel modulo
7. Attendi 2-4 settimane

### Dopo l'accreditamento

Infocamere ti manda username e password. Aggiorna il `.env.local` e Vercel:

```env
TELEMACO_URL=https://webtelemaco.infocamere.it/wspratic/rest
TELEMACO_USER=il_tuo_username
TELEMACO_PASS=la_tua_password
ZIPRA_CF_PIVA=CODICE_FISCALE_ZIPRA_SRL
```

Da questo momento "Invia ComUnica" dall'admin invierà **realmente** la pratica alla CCIAA.

---

## Step 23 — Scraping normative settimanale {#step-23}

Ogni lunedì l'app scarica le normative aggiornate da 105 SUAP e CCIAA italiane.

### Su Vercel (piano Pro $20/mese)

Il file `vercel.json` contiene già il cron — si attiva automaticamente.

### Alternativa gratuita: cron-job.org

1. Vai su **https://cron-job.org** → crea account gratuito
2. **Cronjobs → Create cronjob**:
   - URL: `https://tuodominio.vercel.app/api/cron/weekly`
   - Schedule: ogni lunedì alle 8:00
   - Method: GET
   - Headers → `Authorization: Bearer IL-TUO-CRON-SECRET`
3. Salva

### Prima indicizzazione manuale

```bash
# Mac/Linux
curl -H "Authorization: Bearer IL-TUO-CRON-SECRET" http://localhost:3000/api/cron/weekly

# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/weekly" -Headers @{Authorization="Bearer IL-TUO-CRON-SECRET"}
```

Richiede 15-20 minuti. Verifica su Supabase:

```sql
SELECT COUNT(*) FROM normative_sources;
-- Deve essere 500+ ✅
```

---

## Step 24 — Collaudo finale completo {#step-24}

### Test 1 — Registrazione con procura

1. Vai su `/auth/signup`
2. Compila tutti i dati inclusi CF, data nascita, residenza, telefono
3. ✅ Email Yousign ricevuta con procura da firmare
4. Firma → ✅ Dashboard utente con procura firmata

### Test 2 — Wizard completo

1. Vai su `/wizard`
2. Attività: `Voglio aprire un bar a Lecce`
3. Completa tutti i 7 step
4. ✅ Pratica creata → redirect dashboard

### Test 3 — Admin riceve e gestisce pratica

1. Vai su `/admin`
2. ✅ Nuova pratica visibile
3. Clicca → `/admin/pratiche/[id]`
4. ✅ 5 tab funzionanti: Overview, Todo, Documenti, Invia agli enti, Log
5. Tab "Invia agli enti" → clicca "Invia ComUnica"
6. ✅ Todo creato con istruzioni complete
7. Tab "Todo" → segna come completato
8. ✅ Log registra l'azione

### Test 4 — Chatbot AI

1. Homepage → chatbot
2. Scrivi: `devo aprire una parrucchiera a Milano`
3. ✅ AI risponde con iter, documenti, costi
4. ✅ Card con toggle abbonamento/singola pratica

### Test 5 — Pagamento Stripe

1. Vai su `/prezzi` → "Acquista" Piano Base
2. Carta: `4242 4242 4242 4242` · `12/30` · `123`
3. ✅ Redirect successo → Supabase tabella `pagamenti` aggiornata

### Test 6 — API enti mock complete

Per ogni tipo di pratica verifica che il mock crei todo corretti:

| Pratica | API da testare |
|---------|---------------|
| Apertura ditta | ComUnica |
| Bar/ristorante | ComUnica + SCIA SUAP |
| Taxi/NCC | ComUnica + Casellario |
| Meccanico | ComUnica + SCIA SUAP |
| Parrucchiere | ComUnica + SCIA SUAP |
| Impiantista | ComUnica |

### Checklist finale

```
□ Registrazione con tutti i dati anagrafici
□ Procura Yousign inviata e firmabile
□ Wizard 7 step completabile
□ Pratica creata con dati_wizard popolato
□ Admin vede pratica in lista
□ Pagina pratica singola con 5 tab
□ ComUnica → todo con istruzioni
□ SCIA SUAP → todo con istruzioni  
□ Casellario → todo con istruzioni
□ INPS → todo con istruzioni
□ Pagamento Stripe funzionante
□ Chatbot risponde con card pratica
□ Catalogo attività regolamentate visibile
□ Deploy Vercel funzionante
□ Variabili env tutte su Vercel
```

---

## Variabili d'ambiente — riepilogo completo

```env
# ── SUPABASE ─────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── AI ───────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=

# ── EMAIL ────────────────────────────────────────────────────────
RESEND_API_KEY=

# ── APP ──────────────────────────────────────────────────────────
NEXT_PUBLIC_BASE_URL=https://tuodominio.it
CRON_SECRET=scegli-una-parola-segreta

# ── STRIPE ───────────────────────────────────────────────────────
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASE=
STRIPE_PRICE_PRO=
STRIPE_PRICE_MANTENIMENTO=
STRIPE_PRICE_BUSINESS=
STRIPE_PRICE_BUSINESS_PRO=

# ── YOUSIGN ──────────────────────────────────────────────────────
YOUSIGN_API_KEY=
YOUSIGN_SANDBOX=true
YOUSIGN_WEBHOOK_SECRET=

# ── API ENTI (mock finché non configurati) ───────────────────────
# Ministero Giustizia — casellario giudiziale
GIUSTIZIA_API_URL=https://portale.giustizia.it/api
GIUSTIZIA_CLIENT_ID=
GIUSTIZIA_CLIENT_SECRET=

# INPS — estratto contributivo e posizione previdenziale
INPS_API_URL=https://api.inps.it/api
INPS_CLIENT_ID=
INPS_CLIENT_SECRET=

# SUAP — impresainungiorno.gov.it
SUAP_API_URL=https://www.impresainungiorno.gov.it/api
SUAP_API_KEY=

# ComUnica Telemaco — Infocamere
TELEMACO_URL=https://webtelemaco.infocamere.it/wspratic/rest
TELEMACO_USER=
TELEMACO_PASS=

# Zipra come intermediario (obbligatorio per tutte le API enti)
ZIPRA_CF_PIVA=

# ── GOOGLE BUSINESS ──────────────────────────────────────────────
GOOGLE_PROJECT_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_ADMIN_EMAIL=
GOOGLE_ADMIN_DOMAIN=

# ── TWILIO (opzionale) ───────────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ── REPLICATE (opzionale) ────────────────────────────────────────
REPLICATE_API_TOKEN=

# ── VERCEL (per deploy siti vetrina) ─────────────────────────────
VERCEL_TOKEN=
```

---

## Struttura file da copiare nel progetto

| File scaricato | Percorso nel progetto |
|---|---|
| `schema-zipra-v2-completo.sql` | Supabase → SQL Editor → esegui |
| `signup-con-procura.tsx` | `src/app/auth/signup/page.tsx` |
| `procura-route-fixed.ts` | `src/app/api/procura/route.ts` |
| `api-comunica-route.ts` | `src/app/api/enti/comunica/route.ts` |
| `api-casellario-route.ts` | `src/app/api/enti/casellario/route.ts` |
| `api-inps-route.ts` | `src/app/api/enti/inps/route.ts` |
| `api-suap-route.ts` | `src/app/api/enti/suap/route.ts` |
| `admin-pratica-singola.tsx` | `src/app/admin/pratiche/[id]/page.tsx` |
| `attivita-regolamentate-completo.ts` | `src/lib/catalogo/attivita-regolamentate.ts` |
| `catalogo-prezzi-aggiornati.ts` | `src/lib/catalogo/index.ts` |
| `ChatbotAI-new.tsx` | `src/components/chatbot/ChatbotAI.tsx` |
| `chatbot-route-new.ts` | `src/app/api/chatbot/route.ts` |
| `analizza-route.ts` | `src/app/api/analizza/route.ts` |
| `dashboard-new.tsx` | `src/app/dashboard/page.tsx` |
| `prezzi-new.tsx` | `src/app/prezzi/page.tsx` |
| `home-new.tsx` | `src/app/page.tsx` |
| `wizard-documenti.tsx` | `src/app/wizard/page.tsx` |
| `attivita-regolamentate-scraper.ts` | `src/lib/scraper/attivita-regolamentate.ts` |
| `SezioneAttivitaRegolamentate.tsx` | `src/components/SezioneAttivitaRegolamentate.tsx` |
| `AdminPraticheClient-new.tsx` | `src/app/admin/AdminPraticheClient.tsx` |

---

## Logica mock → reale per ogni API ente

Tutte le route `/api/enti/*` seguono questa logica:

```
Se API key configurata in .env
  → chiama API reale dell'ente
  → salva documento su Supabase Storage
  → aggiorna documenti_pratica
Altrimenti
  → crea todo_admin con istruzioni manuali complete
  → salva stato 'richiesto' su documenti_pratica
  → admin gestisce manualmente dall'interfaccia
```

**Quindi puoi partire subito senza nessuna API configurata.** Tutto è tracciato e gestibile.
Mano a mano che ottieni gli accreditamenti, aggiungi le chiavi al `.env` e le API si attivano automaticamente senza modificare codice.

---

*Zipra v2 · Next.js 14 · Supabase · Claude AI · Yousign · Stripe · Telemaco · Vercel*