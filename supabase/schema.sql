-- ═══════════════════════════════════════════════════════════════════════════
-- ZIPRA — SCHEMA COMPLETO v2
-- Drop tutto e ricrea da zero — schema base + nuove tabelle procura/todo
-- Esegui intero file su Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── DROP tutto nell'ordine corretto (figli prima dei padri) ─────────────

DROP TABLE IF EXISTS azioni_admin CASCADE;
DROP TABLE IF EXISTS todo_admin CASCADE;
DROP TABLE IF EXISTS documenti_pratica CASCADE;
DROP TABLE IF EXISTS incarichi_professionisti CASCADE;
DROP TABLE IF EXISTS professionisti CASCADE;
DROP TABLE IF EXISTS reiezone_pratiche CASCADE;
DROP TABLE IF EXISTS ricevute_pratiche CASCADE;
DROP TABLE IF EXISTS archivio_documenti CASCADE;
DROP TABLE IF EXISTS pagamenti CASCADE;
DROP TABLE IF EXISTS business_clienti CASCADE;
DROP TABLE IF EXISTS business_accounts CASCADE;
DROP TABLE IF EXISTS admin_notes CASCADE;
DROP TABLE IF EXISTS sito_modifiche CASCADE;
DROP TABLE IF EXISTS sito_account CASCADE;
DROP TABLE IF EXISTS siti_vetrina CASCADE;
DROP TABLE IF EXISTS adempimenti_notificati CASCADE;
DROP TABLE IF EXISTS adempimenti CASCADE;
DROP TABLE IF EXISTS notifiche CASCADE;
DROP TABLE IF EXISTS documenti CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS deleghe CASCADE;
DROP TABLE IF EXISTS firme_digitali CASCADE;
DROP TABLE IF EXISTS pratiche CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop sequenze
DROP SEQUENCE IF EXISTS numero_pratica_seq CASCADE;
DROP SEQUENCE IF EXISTS numero_ricevuta_seq CASCADE;

-- Drop funzioni
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS genera_numero_pratica() CASCADE;
DROP FUNCTION IF EXISTS genera_numero_ricevuta() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cerca_normative(vector, text, text, int) CASCADE;

-- Drop tabella normative (ha estensione vector)
DROP TABLE IF EXISTS normative_sources CASCADE;

-- ─── Estensioni ──────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── FUNZIONE updated_at (riusata da più tabelle) ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── PROFILES ────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  -- Dati anagrafici base
  nome TEXT,
  cognome TEXT,
  full_name TEXT,
  telefono TEXT,
  -- Dati anagrafici completi (per pratiche e procura)
  codice_fiscale TEXT,
  data_nascita DATE,
  luogo_nascita TEXT,
  residenza TEXT,
  -- Dati impresa
  indirizzo TEXT,
  sito_web TEXT,
  ragione_sociale TEXT,
  partita_iva TEXT,
  tipo_account TEXT DEFAULT 'privato' CHECK (tipo_account IN (
    'privato','business','caf','commercialista','agenzia','patronato'
  )),
  -- Ruolo e piano
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  piano TEXT NOT NULL DEFAULT 'free' CHECK (piano IN ('free', 'base', 'pro')),
  -- Procura speciale Zipra
  procura_firmata BOOLEAN DEFAULT FALSE,
  procura_url TEXT,
  procura_firmata_il TIMESTAMPTZ,
  procura_bozza_url TEXT,
  yousign_procura_id TEXT,
  procura_richiesta_il TIMESTAMPTZ,
  -- Firma digitale
  firma_digitale_autorizzata BOOLEAN DEFAULT FALSE,
  firma_digitale_url TEXT,
  -- Stripe
  stripe_customer_id TEXT,
  -- Stato
  onboarding_completato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: crea profilo automaticamente al signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── PRATICHE ────────────────────────────────────────────────────────────

CREATE SEQUENCE numero_pratica_seq START 1;

CREATE TABLE pratiche (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  numero_pratica TEXT UNIQUE NOT NULL DEFAULT 'TMP-' || uuid_generate_v4(),
  -- Dati attività
  tipo_attivita TEXT NOT NULL,
  forma_giuridica TEXT NOT NULL,
  nome_impresa TEXT NOT NULL,
  comune_sede TEXT NOT NULL,
  provincia_sede TEXT NOT NULL,
  ha_locale BOOLEAN DEFAULT FALSE,
  serve_alimenti BOOLEAN DEFAULT FALSE,
  codice_ateco TEXT,
  descrizione_ateco TEXT,
  -- Dati wizard completi
  dati_wizard JSONB DEFAULT '{}',
  -- Analisi AI
  analisi_ai TEXT,
  -- Stato pratica
  stato TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN (
    'bozza','in_revisione_admin','inviata_utente','in_revisione_utente',
    'approvata_utente','in_invio','inviata_ente','respinta_ente',
    'in_reinoltro','reinoltrata','completata','respinta',
    'richiede_integrazione','pagata','approvata','in_lavorazione',
    'inviata_cciaa','inviata_suap'
  )),
  -- Note
  note_admin TEXT,
  note_utente TEXT,
  -- Procura speciale
  procura_firmata BOOLEAN DEFAULT FALSE,
  procura_url TEXT,
  procura_firmata_il TIMESTAMPTZ,
  procura_bozza_url TEXT,
  yousign_procura_id TEXT,
  procura_richiesta_il TIMESTAMPTZ,
  -- Numeri pratiche enti
  numero_pratica_cciaa TEXT,
  numero_pratica_suap TEXT,
  -- Date
  data_invio_cciaa TIMESTAMPTZ,
  data_invio TIMESTAMPTZ,
  data_completamento TIMESTAMPTZ,
  -- Contatori
  num_reiezone INTEGER DEFAULT 0,
  ultimo_motivo_reiezione TEXT,
  data_ultima_reiezione TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION genera_numero_pratica()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_pratica := 'ZP-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('numero_pratica_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_numero_pratica
  BEFORE INSERT ON pratiche
  FOR EACH ROW EXECUTE FUNCTION genera_numero_pratica();

CREATE TRIGGER pratiche_updated_at
  BEFORE UPDATE ON pratiche
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── TODO ADMIN ──────────────────────────────────────────────────────────

CREATE TABLE todo_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  priorita TEXT NOT NULL DEFAULT 'media' CHECK (priorita IN ('altissima','alta','media','bassa')),
  descrizione TEXT NOT NULL,
  istruzioni TEXT,
  dati JSONB DEFAULT '{}',
  completato BOOLEAN DEFAULT FALSE,
  creato_il TIMESTAMPTZ DEFAULT NOW(),
  completato_il TIMESTAMPTZ,
  completato_da UUID REFERENCES profiles(id)
);

CREATE INDEX idx_todo_pratica ON todo_admin(pratica_id);
CREATE INDEX idx_todo_completato ON todo_admin(completato);
CREATE INDEX idx_todo_priorita ON todo_admin(priorita);

-- ─── DOCUMENTI PRATICA ───────────────────────────────────────────────────

CREATE TABLE documenti_pratica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome_file TEXT,
  url TEXT,
  stato TEXT DEFAULT 'presente' CHECK (stato IN ('presente','mancante','in_elaborazione','richiesto')),
  recuperato_da TEXT CHECK (recuperato_da IN ('utente','zipra_api','zipra_genera','manuale')),
  data_recupero TIMESTAMPTZ DEFAULT NOW(),
  numero_richiesta TEXT,
  dati_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_pratica ON documenti_pratica(pratica_id);
CREATE INDEX idx_doc_tipo ON documenti_pratica(tipo);

-- ─── AZIONI ADMIN ────────────────────────────────────────────────────────

CREATE TABLE azioni_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  tipo TEXT NOT NULL,
  dettaglio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_azioni_pratica ON azioni_admin(pratica_id);

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────

CREATE TABLE checklist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  titolo TEXT NOT NULL,
  descrizione TEXT,
  ente TEXT NOT NULL,
  obbligatorio BOOLEAN DEFAULT TRUE,
  tipo_invio TEXT DEFAULT 'manuale_admin' CHECK (tipo_invio IN (
    'automatico_api','manuale_admin','guidato_utente'
  )),
  stato TEXT DEFAULT 'da_fare' CHECK (stato IN (
    'da_fare','in_corso','completata','non_applicabile'
  )),
  tempi TEXT,
  costo TEXT,
  documenti_richiesti JSONB DEFAULT '[]',
  note TEXT,
  api_endpoint TEXT,
  "order" INTEGER DEFAULT 0,
  completato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTI (upload utente) ───────────────────────────────────────────

CREATE TABLE documenti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'input_utente' CHECK (tipo IN (
    'input_utente','generato','firmato','inviato'
  )),
  url TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  richiede_firma BOOLEAN DEFAULT FALSE,
  firmato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICHE ───────────────────────────────────────────────────────────

CREATE TABLE notifiche (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  titolo TEXT NOT NULL,
  messaggio TEXT NOT NULL,
  letta BOOLEAN DEFAULT FALSE,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE SET NULL,
  azione_url TEXT,
  azione_label TEXT,
  inviata_email BOOLEAN DEFAULT FALSE,
  inviata_sms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ADEMPIMENTI ─────────────────────────────────────────────────────────

CREATE TABLE adempimenti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titolo TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  scadenza DATE NOT NULL,
  tipo TEXT CHECK (tipo IN ('nazionale','regionale','comunale','camerale')),
  enti_interessati JSONB DEFAULT '[]',
  forme_giuridiche JSONB DEFAULT '[]',
  settori JSONB DEFAULT '[]',
  comuni JSONB DEFAULT '[]',
  urgente BOOLEAN DEFAULT FALSE,
  fonte_url TEXT,
  attivo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE adempimenti_notificati (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  adempimento_id UUID REFERENCES adempimenti(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notificato_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(adempimento_id, user_id)
);

-- ─── NORMATIVE RAG ───────────────────────────────────────────────────────

CREATE TABLE normative_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titolo TEXT NOT NULL,
  contenuto TEXT NOT NULL,
  fonte_url TEXT,
  fonte_nome TEXT,
  comune TEXT,
  provincia TEXT,
  tipo_attivita TEXT,
  categoria TEXT CHECK (categoria IN (
    'suap','cciaa','agenzia_entrate','inps','asl','vvf','generale'
  )),
  embedding vector(1536),
  data_scraping TIMESTAMPTZ DEFAULT NOW(),
  hash_contenuto TEXT,
  attivo BOOLEAN DEFAULT TRUE
);

CREATE INDEX normative_embedding_idx ON normative_sources
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION cerca_normative(
  query_embedding vector(1536),
  comune_filter TEXT DEFAULT NULL,
  categoria_filter TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, titolo TEXT, contenuto TEXT, fonte_url TEXT,
  fonte_nome TEXT, comune TEXT, categoria TEXT, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.titolo, n.contenuto, n.fonte_url, n.fonte_nome,
    n.comune, n.categoria, 1 - (n.embedding <=> query_embedding) AS similarity
  FROM normative_sources n
  WHERE n.attivo = TRUE
    AND (comune_filter IS NULL OR n.comune ILIKE '%' || comune_filter || '%')
    AND (categoria_filter IS NULL OR n.categoria = categoria_filter)
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── SITI VETRINA ────────────────────────────────────────────────────────

CREATE TABLE siti_vetrina (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE SET NULL,
  nome_dominio TEXT,
  url_pubblicato TEXT,
  stato TEXT DEFAULT 'generazione' CHECK (stato IN (
    'generazione','revisione','pubblicato','errore'
  )),
  colori JSONB DEFAULT '{"primario":"#1a56db","secondario":"#f3f4f6","accento":"#16a34a"}',
  font TEXT DEFAULT 'Inter',
  testi JSONB DEFAULT '{}',
  logo_url TEXT,
  vercel_deployment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER siti_vetrina_updated_at
  BEFORE UPDATE ON siti_vetrina
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ADMIN NOTES ─────────────────────────────────────────────────────────

CREATE TABLE admin_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  nota TEXT NOT NULL,
  tipo TEXT DEFAULT 'nota' CHECK (tipo IN ('nota','modifica','approvazione','respinta')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BUSINESS ACCOUNTS ───────────────────────────────────────────────────

CREATE TABLE business_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('caf','commercialista','agenzia','patronato','altro')),
  partita_iva TEXT,
  indirizzo TEXT,
  logo_url TEXT,
  colore_primario TEXT DEFAULT '#00C48C',
  dominio_custom TEXT,
  piano TEXT DEFAULT 'business_base' CHECK (piano IN ('business_base','business_pro','white_label')),
  stripe_subscription_id TEXT,
  max_clienti INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER business_accounts_updated_at
  BEFORE UPDATE ON business_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE business_clienti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id UUID REFERENCES business_accounts(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  aggiunto_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  UNIQUE(business_id, cliente_id)
);

-- ─── PAGAMENTI ───────────────────────────────────────────────────────────

CREATE TABLE pagamenti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  piano TEXT NOT NULL,
  importo INTEGER NOT NULL,
  valuta TEXT DEFAULT 'eur',
  stato TEXT DEFAULT 'pending' CHECK (stato IN (
    'pending','completed','failed','refunded','cancelled'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ARCHIVIO DOCUMENTI ──────────────────────────────────────────────────

CREATE TABLE archivio_documenti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE SET NULL,
  business_id UUID REFERENCES business_accounts(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'ricevuta_pratica','documento_identita','atto_costitutivo',
    'visura','bilancio','contratto','delega','altro'
  )),
  categoria TEXT DEFAULT 'generale',
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'documenti',
  mime_type TEXT,
  size_bytes INTEGER,
  anno_riferimento INTEGER,
  scadenza DATE,
  tags JSONB DEFAULT '[]',
  condiviso_con JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RICEVUTE PRATICHE ───────────────────────────────────────────────────

CREATE SEQUENCE numero_ricevuta_seq START 1;

CREATE TABLE ricevute_pratiche (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  numero_ricevuta TEXT UNIQUE NOT NULL DEFAULT 'TMP-' || uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'invio_telematico','conferma_suap','conferma_asl',
    'apertura_piva','iscrizione_inps','completamento'
  )),
  ente TEXT NOT NULL,
  numero_protocollo TEXT,
  data_protocollo DATE,
  contenuto JSONB NOT NULL,
  pdf_url TEXT,
  inviata_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION genera_numero_ricevuta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_ricevuta := 'RIC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('numero_ricevuta_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_numero_ricevuta
  BEFORE INSERT ON ricevute_pratiche
  FOR EACH ROW EXECUTE FUNCTION genera_numero_ricevuta();

-- ─── REIAZIONI PRATICHE ──────────────────────────────────────────────────

CREATE TABLE reiezone_pratiche (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE SET NULL,
  ente TEXT NOT NULL,
  motivo_reiezione TEXT NOT NULL,
  dettagli_tecnici TEXT,
  data_reiezione TIMESTAMPTZ DEFAULT NOW(),
  correzioni_apportate TEXT,
  data_reinoltro TIMESTAMPTZ,
  numero_protocollo_reinoltro TEXT,
  reinoltro_gratuito BOOLEAN DEFAULT TRUE,
  reinoltro_riuscito BOOLEAN,
  note_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FIRME DIGITALI ──────────────────────────────────────────────────────

CREATE TABLE firme_digitali (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stato TEXT DEFAULT 'non_richiesta' CHECK (stato IN (
    'non_richiesta','richiesta','in_attesa_cliente','attiva','scaduta','revocata'
  )),
  provider TEXT DEFAULT 'yousign' CHECK (provider IN ('yousign','namirial','aruba')),
  provider_user_id TEXT,
  provider_cert_id TEXT,
  data_emissione TIMESTAMPTZ,
  data_scadenza TIMESTAMPTZ,
  nome_certificato TEXT,
  email_certificato TEXT,
  tipo TEXT DEFAULT 'remota' CHECK (tipo IN ('remota','token')),
  yousign_member_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DELEGHE ─────────────────────────────────────────────────────────────

CREATE TABLE deleghe (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'contratto_servizio','procura_speciale','procura_notarile'
  )),
  pratiche_coperte JSONB NOT NULL DEFAULT '[]',
  stato TEXT DEFAULT 'bozza' CHECK (stato IN (
    'bozza','inviata_firma','firmata','scaduta','revocata'
  )),
  yousign_signature_request_id TEXT,
  yousign_document_id TEXT,
  data_invio TIMESTAMPTZ,
  data_firma TIMESTAMPTZ,
  data_scadenza DATE,
  pdf_bozza_url TEXT,
  pdf_firmato_url TEXT,
  ip_firma TEXT,
  user_agent_firma TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFESSIONISTI ──────────────────────────────────────────────────────

CREATE TABLE professionisti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'commercialista','notaio','avvocato','consulente_lavoro'
  )),
  email TEXT NOT NULL,
  email_pec TEXT,
  telefono TEXT,
  indirizzo TEXT,
  province_coperte JSONB DEFAULT '[]',
  specializzazioni JSONB DEFAULT '[]',
  tariffa_media NUMERIC(10,2),
  note TEXT,
  attivo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incarichi_professionisti (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pratica_id UUID REFERENCES pratiche(id) ON DELETE CASCADE NOT NULL,
  professionista_id UUID REFERENCES professionisti(id) NOT NULL,
  tipo_incarico TEXT NOT NULL,
  stato TEXT DEFAULT 'inviato' CHECK (stato IN (
    'inviato','in_lavorazione','completato','respinto'
  )),
  email_inviata_at TIMESTAMPTZ,
  fascicolo_url TEXT,
  note_professionista TEXT,
  data_completamento TIMESTAMPTZ,
  numero_protocollo TEXT,
  ricevuta_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SITO EDITOR ─────────────────────────────────────────────────────────

CREATE TABLE sito_modifiche (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sito_id UUID REFERENCES siti_vetrina(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('user','assistant')),
  messaggio TEXT NOT NULL,
  tipo_modifica TEXT CHECK (tipo_modifica IN (
    'testo','immagine','colore','sezione','contatti','orari','servizi'
  )),
  campo_modificato TEXT,
  valore_precedente TEXT,
  valore_nuovo TEXT,
  applicata BOOLEAN DEFAULT FALSE,
  immagine_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sito_account (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sito_id UUID REFERENCES siti_vetrina(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pin_accesso TEXT NOT NULL,
  email_notifiche TEXT,
  ultimo_accesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pratiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti_pratica ENABLE ROW LEVEL SECURITY;
ALTER TABLE azioni_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE siti_vetrina ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivio_documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE ricevute_pratiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE reiezone_pratiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE firme_digitali ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleghe ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE incarichi_professionisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE sito_modifiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE sito_account ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_policy" ON profiles FOR ALL
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Pratiche
CREATE POLICY "pratiche_policy" ON pratiche FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Todo admin (solo admin)
CREATE POLICY "todo_admin_policy" ON todo_admin FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Documenti pratica
CREATE POLICY "doc_pratica_select" ON documenti_pratica FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM pratiche p WHERE p.id = pratica_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "doc_pratica_admin" ON documenti_pratica FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Azioni admin (solo admin)
CREATE POLICY "azioni_admin_policy" ON azioni_admin FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Checklist
CREATE POLICY "checklist_policy" ON checklist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pratiche p WHERE p.id = pratica_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

-- Documenti upload
CREATE POLICY "documenti_policy" ON documenti FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pratiche p WHERE p.id = pratica_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

-- Notifiche
CREATE POLICY "notifiche_policy" ON notifiche FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Siti vetrina
CREATE POLICY "siti_policy" ON siti_vetrina FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Admin notes
CREATE POLICY "admin_notes_policy" ON admin_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Business
CREATE POLICY "business_policy" ON business_accounts FOR ALL
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "business_clienti_policy" ON business_clienti FOR ALL
  USING (EXISTS (
    SELECT 1 FROM business_accounts ba WHERE ba.id = business_id
    AND (ba.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  ) OR cliente_id = auth.uid());

-- Pagamenti
CREATE POLICY "pagamenti_policy" ON pagamenti FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Archivio
CREATE POLICY "archivio_policy" ON archivio_documenti FOR ALL
  USING (
    user_id = auth.uid()
    OR (condiviso_con)::jsonb ? auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ricevute
CREATE POLICY "ricevute_policy" ON ricevute_pratiche FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Reiazioni
CREATE POLICY "reiezone_policy" ON reiezone_pratiche FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pratiche p WHERE p.id = pratica_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

-- Firme e deleghe
CREATE POLICY "firme_policy" ON firme_digitali FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "deleghe_policy" ON deleghe FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Professionisti
CREATE POLICY "professionisti_read" ON professionisti FOR SELECT USING (TRUE);
CREATE POLICY "professionisti_admin" ON professionisti FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "incarichi_policy" ON incarichi_professionisti FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pratiche p WHERE p.id = pratica_id
    AND (p.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ))
  ));

-- Sito modifiche
CREATE POLICY "sito_modifiche_policy" ON sito_modifiche FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "sito_account_policy" ON sito_account FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('documenti', 'documenti', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documenti-pratiche', 'documenti-pratiche', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "storage_documenti_utente" ON storage.objects FOR ALL
  USING (
    bucket_id = 'documenti'
    AND (
      name LIKE (auth.uid()::text || '/%')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "storage_pratiche_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documenti-pratiche'
    AND (
      name LIKE (auth.uid()::text || '/%')
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "storage_pratiche_admin" ON storage.objects FOR ALL
  USING (
    bucket_id = 'documenti-pratiche'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- RIMETTI IL TUO ACCOUNT ADMIN DOPO IL DROP
-- Sostituisci l'email con la tua
-- ═══════════════════════════════════════════════════════════════════════════

-- UPDATE profiles SET role = 'admin' WHERE email = 'zipra.dev@gmail.com';

SELECT 'Schema Zipra v2 installato correttamente!' AS risultato;