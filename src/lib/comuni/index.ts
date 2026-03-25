// src/lib/comuni/index.ts
// Tutti i capoluoghi di provincia + comuni sopra 15.000 abitanti
// Con provincia, CAP principale e regione

export interface Comune {
  nome: string
  provincia: string   // sigla 2 lettere
  cap: string         // CAP principale
  regione: string
}

export const COMUNI_ITALIANI: Comune[] = [
  // ─── ABRUZZO ────────────────────────────────────────────────────────
  { nome: 'L\'Aquila', provincia: 'AQ', cap: '67100', regione: 'Abruzzo' },
  { nome: 'Teramo', provincia: 'TE', cap: '64100', regione: 'Abruzzo' },
  { nome: 'Pescara', provincia: 'PE', cap: '65100', regione: 'Abruzzo' },
  { nome: 'Chieti', provincia: 'CH', cap: '66100', regione: 'Abruzzo' },
  { nome: 'Lanciano', provincia: 'CH', cap: '66034', regione: 'Abruzzo' },
  { nome: 'Vasto', provincia: 'CH', cap: '66054', regione: 'Abruzzo' },
  { nome: 'Avezzano', provincia: 'AQ', cap: '67051', regione: 'Abruzzo' },
  { nome: 'Sulmona', provincia: 'AQ', cap: '67039', regione: 'Abruzzo' },
  // ─── BASILICATA ─────────────────────────────────────────────────────
  { nome: 'Potenza', provincia: 'PZ', cap: '85100', regione: 'Basilicata' },
  { nome: 'Matera', provincia: 'MT', cap: '75100', regione: 'Basilicata' },
  // ─── CALABRIA ───────────────────────────────────────────────────────
  { nome: 'Catanzaro', provincia: 'CZ', cap: '88100', regione: 'Calabria' },
  { nome: 'Reggio Calabria', provincia: 'RC', cap: '89100', regione: 'Calabria' },
  { nome: 'Cosenza', provincia: 'CS', cap: '87100', regione: 'Calabria' },
  { nome: 'Crotone', provincia: 'KR', cap: '88900', regione: 'Calabria' },
  { nome: 'Vibo Valentia', provincia: 'VV', cap: '89900', regione: 'Calabria' },
  { nome: 'Lamezia Terme', provincia: 'CZ', cap: '88046', regione: 'Calabria' },
  { nome: 'Rende', provincia: 'CS', cap: '87036', regione: 'Calabria' },
  // ─── CAMPANIA ───────────────────────────────────────────────────────
  { nome: 'Napoli', provincia: 'NA', cap: '80100', regione: 'Campania' },
  { nome: 'Salerno', provincia: 'SA', cap: '84100', regione: 'Campania' },
  { nome: 'Avellino', provincia: 'AV', cap: '83100', regione: 'Campania' },
  { nome: 'Benevento', provincia: 'BN', cap: '82100', regione: 'Campania' },
  { nome: 'Caserta', provincia: 'CE', cap: '81100', regione: 'Campania' },
  { nome: 'Giugliano in Campania', provincia: 'NA', cap: '80014', regione: 'Campania' },
  { nome: 'Torre del Greco', provincia: 'NA', cap: '80059', regione: 'Campania' },
  { nome: 'Pozzuoli', provincia: 'NA', cap: '80078', regione: 'Campania' },
  { nome: 'Castellammare di Stabia', provincia: 'NA', cap: '80053', regione: 'Campania' },
  { nome: 'Portici', provincia: 'NA', cap: '80055', regione: 'Campania' },
  { nome: 'Ercolano', provincia: 'NA', cap: '80056', regione: 'Campania' },
  { nome: 'Scafati', provincia: 'SA', cap: '84018', regione: 'Campania' },
  { nome: 'Pagani', provincia: 'SA', cap: '84016', regione: 'Campania' },
  { nome: 'Battipaglia', provincia: 'SA', cap: '84091', regione: 'Campania' },
  { nome: 'Afragola', provincia: 'NA', cap: '80021', regione: 'Campania' },
  { nome: 'Acerra', provincia: 'NA', cap: '80011', regione: 'Campania' },
  { nome: 'Marano di Napoli', provincia: 'NA', cap: '80016', regione: 'Campania' },
  { nome: 'Nocera Inferiore', provincia: 'SA', cap: '84014', regione: 'Campania' },
  // ─── EMILIA-ROMAGNA ─────────────────────────────────────────────────
  { nome: 'Bologna', provincia: 'BO', cap: '40100', regione: 'Emilia-Romagna' },
  { nome: 'Modena', provincia: 'MO', cap: '41100', regione: 'Emilia-Romagna' },
  { nome: 'Parma', provincia: 'PR', cap: '43100', regione: 'Emilia-Romagna' },
  { nome: 'Reggio Emilia', provincia: 'RE', cap: '42100', regione: 'Emilia-Romagna' },
  { nome: 'Ferrara', provincia: 'FE', cap: '44100', regione: 'Emilia-Romagna' },
  { nome: 'Ravenna', provincia: 'RA', cap: '48100', regione: 'Emilia-Romagna' },
  { nome: 'Forlì', provincia: 'FC', cap: '47100', regione: 'Emilia-Romagna' },
  { nome: 'Cesena', provincia: 'FC', cap: '47023', regione: 'Emilia-Romagna' },
  { nome: 'Rimini', provincia: 'RN', cap: '47900', regione: 'Emilia-Romagna' },
  { nome: 'Piacenza', provincia: 'PC', cap: '29100', regione: 'Emilia-Romagna' },
  { nome: 'Imola', provincia: 'BO', cap: '40026', regione: 'Emilia-Romagna' },
  { nome: 'Carpi', provincia: 'MO', cap: '41012', regione: 'Emilia-Romagna' },
  { nome: 'Sassuolo', provincia: 'MO', cap: '41049', regione: 'Emilia-Romagna' },
  { nome: 'Faenza', provincia: 'RA', cap: '48018', regione: 'Emilia-Romagna' },
  // ─── FRIULI-VENEZIA GIULIA ──────────────────────────────────────────
  { nome: 'Trieste', provincia: 'TS', cap: '34100', regione: 'Friuli-Venezia Giulia' },
  { nome: 'Udine', provincia: 'UD', cap: '33100', regione: 'Friuli-Venezia Giulia' },
  { nome: 'Pordenone', provincia: 'PN', cap: '33170', regione: 'Friuli-Venezia Giulia' },
  { nome: 'Gorizia', provincia: 'GO', cap: '34170', regione: 'Friuli-Venezia Giulia' },
  // ─── LAZIO ──────────────────────────────────────────────────────────
  { nome: 'Roma', provincia: 'RM', cap: '00100', regione: 'Lazio' },
  { nome: 'Latina', provincia: 'LT', cap: '04100', regione: 'Lazio' },
  { nome: 'Frosinone', provincia: 'FR', cap: '03100', regione: 'Lazio' },
  { nome: 'Viterbo', provincia: 'VT', cap: '01100', regione: 'Lazio' },
  { nome: 'Rieti', provincia: 'RI', cap: '02100', regione: 'Lazio' },
  { nome: 'Guidonia Montecelio', provincia: 'RM', cap: '00012', regione: 'Lazio' },
  { nome: 'Fiumicino', provincia: 'RM', cap: '00054', regione: 'Lazio' },
  { nome: 'Civitavecchia', provincia: 'RM', cap: '00053', regione: 'Lazio' },
  { nome: 'Tivoli', provincia: 'RM', cap: '00019', regione: 'Lazio' },
  { nome: 'Pomezia', provincia: 'RM', cap: '00040', regione: 'Lazio' },
  { nome: 'Velletri', provincia: 'RM', cap: '00049', regione: 'Lazio' },
  { nome: 'Aprilia', provincia: 'LT', cap: '04011', regione: 'Lazio' },
  { nome: 'Anzio', provincia: 'RM', cap: '00042', regione: 'Lazio' },
  // ─── LIGURIA ────────────────────────────────────────────────────────
  { nome: 'Genova', provincia: 'GE', cap: '16100', regione: 'Liguria' },
  { nome: 'La Spezia', provincia: 'SP', cap: '19100', regione: 'Liguria' },
  { nome: 'Savona', provincia: 'SV', cap: '17100', regione: 'Liguria' },
  { nome: 'Imperia', provincia: 'IM', cap: '18100', regione: 'Liguria' },
  { nome: 'Sanremo', provincia: 'IM', cap: '18038', regione: 'Liguria' },
  // ─── LOMBARDIA ──────────────────────────────────────────────────────
  { nome: 'Milano', provincia: 'MI', cap: '20100', regione: 'Lombardia' },
  { nome: 'Brescia', provincia: 'BS', cap: '25100', regione: 'Lombardia' },
  { nome: 'Bergamo', provincia: 'BG', cap: '24100', regione: 'Lombardia' },
  { nome: 'Monza', provincia: 'MB', cap: '20900', regione: 'Lombardia' },
  { nome: 'Como', provincia: 'CO', cap: '22100', regione: 'Lombardia' },
  { nome: 'Varese', provincia: 'VA', cap: '21100', regione: 'Lombardia' },
  { nome: 'Pavia', provincia: 'PV', cap: '27100', regione: 'Lombardia' },
  { nome: 'Mantova', provincia: 'MN', cap: '46100', regione: 'Lombardia' },
  { nome: 'Cremona', provincia: 'CR', cap: '26100', regione: 'Lombardia' },
  { nome: 'Lecco', provincia: 'LC', cap: '23900', regione: 'Lombardia' },
  { nome: 'Lodi', provincia: 'LO', cap: '26900', regione: 'Lombardia' },
  { nome: 'Sondrio', provincia: 'SO', cap: '23100', regione: 'Lombardia' },
  { nome: 'Busto Arsizio', provincia: 'VA', cap: '21052', regione: 'Lombardia' },
  { nome: 'Sesto San Giovanni', provincia: 'MI', cap: '20099', regione: 'Lombardia' },
  { nome: 'Cinisello Balsamo', provincia: 'MI', cap: '20092', regione: 'Lombardia' },
  { nome: 'Bergamo Alta', provincia: 'BG', cap: '24129', regione: 'Lombardia' },
  { nome: 'Seregno', provincia: 'MB', cap: '20831', regione: 'Lombardia' },
  { nome: 'Vigevano', provincia: 'PV', cap: '27029', regione: 'Lombardia' },
  { nome: 'Gallarate', provincia: 'VA', cap: '21013', regione: 'Lombardia' },
  // ─── MARCHE ─────────────────────────────────────────────────────────
  { nome: 'Ancona', provincia: 'AN', cap: '60100', regione: 'Marche' },
  { nome: 'Pesaro', provincia: 'PU', cap: '61121', regione: 'Marche' },
  { nome: 'Ascoli Piceno', provincia: 'AP', cap: '63100', regione: 'Marche' },
  { nome: 'Macerata', provincia: 'MC', cap: '62100', regione: 'Marche' },
  { nome: 'Fermo', provincia: 'FM', cap: '63900', regione: 'Marche' },
  { nome: 'Senigallia', provincia: 'AN', cap: '60019', regione: 'Marche' },
  { nome: 'Fano', provincia: 'PU', cap: '61032', regione: 'Marche' },
  // ─── MOLISE ─────────────────────────────────────────────────────────
  { nome: 'Campobasso', provincia: 'CB', cap: '86100', regione: 'Molise' },
  { nome: 'Isernia', provincia: 'IS', cap: '86170', regione: 'Molise' },
  // ─── PIEMONTE ───────────────────────────────────────────────────────
  { nome: 'Torino', provincia: 'TO', cap: '10100', regione: 'Piemonte' },
  { nome: 'Alessandria', provincia: 'AL', cap: '15100', regione: 'Piemonte' },
  { nome: 'Asti', provincia: 'AT', cap: '14100', regione: 'Piemonte' },
  { nome: 'Biella', provincia: 'BI', cap: '13900', regione: 'Piemonte' },
  { nome: 'Cuneo', provincia: 'CN', cap: '12100', regione: 'Piemonte' },
  { nome: 'Novara', provincia: 'NO', cap: '28100', regione: 'Piemonte' },
  { nome: 'Verbania', provincia: 'VB', cap: '28900', regione: 'Piemonte' },
  { nome: 'Vercelli', provincia: 'VC', cap: '13100', regione: 'Piemonte' },
  { nome: 'Moncalieri', provincia: 'TO', cap: '10024', regione: 'Piemonte' },
  { nome: 'Rivoli', provincia: 'TO', cap: '10098', regione: 'Piemonte' },
  { nome: 'Collegno', provincia: 'TO', cap: '10093', regione: 'Piemonte' },
  { nome: 'Alba', provincia: 'CN', cap: '12051', regione: 'Piemonte' },
  // ─── PUGLIA ─────────────────────────────────────────────────────────
  { nome: 'Bari', provincia: 'BA', cap: '70100', regione: 'Puglia' },
  { nome: 'Lecce', provincia: 'LE', cap: '73100', regione: 'Puglia' },
  { nome: 'Taranto', provincia: 'TA', cap: '74100', regione: 'Puglia' },
  { nome: 'Foggia', provincia: 'FG', cap: '71100', regione: 'Puglia' },
  { nome: 'Brindisi', provincia: 'BR', cap: '72100', regione: 'Puglia' },
  { nome: 'Barletta', provincia: 'BT', cap: '76121', regione: 'Puglia' },
  { nome: 'Andria', provincia: 'BT', cap: '76123', regione: 'Puglia' },
  { nome: 'Trani', provincia: 'BT', cap: '76125', regione: 'Puglia' },
  { nome: 'Altamura', provincia: 'BA', cap: '70022', regione: 'Puglia' },
  { nome: 'Molfetta', provincia: 'BA', cap: '70056', regione: 'Puglia' },
  { nome: 'Bitonto', provincia: 'BA', cap: '70032', regione: 'Puglia' },
  { nome: 'Cerignola', provincia: 'FG', cap: '71042', regione: 'Puglia' },
  { nome: 'Manfredonia', provincia: 'FG', cap: '71043', regione: 'Puglia' },
  { nome: 'Bisceglie', provincia: 'BT', cap: '76011', regione: 'Puglia' },
  { nome: 'Modugno', provincia: 'BA', cap: '70026', regione: 'Puglia' },
  { nome: 'Giovinazzo', provincia: 'BA', cap: '70054', regione: 'Puglia' },
  { nome: 'Monopoli', provincia: 'BA', cap: '70043', regione: 'Puglia' },
  { nome: 'Corato', provincia: 'BA', cap: '70033', regione: 'Puglia' },
  { nome: 'Fasano', provincia: 'BR', cap: '72015', regione: 'Puglia' },
  { nome: 'Gallipoli', provincia: 'LE', cap: '73014', regione: 'Puglia' },
  { nome: 'Nardò', provincia: 'LE', cap: '73048', regione: 'Puglia' },
  { nome: 'Maglie', provincia: 'LE', cap: '73024', regione: 'Puglia' },
  { nome: 'Galatina', provincia: 'LE', cap: '73013', regione: 'Puglia' },
  { nome: 'Martina Franca', provincia: 'TA', cap: '74015', regione: 'Puglia' },
  { nome: 'Grottaglie', provincia: 'TA', cap: '74023', regione: 'Puglia' },
  // ─── SARDEGNA ───────────────────────────────────────────────────────
  { nome: 'Cagliari', provincia: 'CA', cap: '09100', regione: 'Sardegna' },
  { nome: 'Sassari', provincia: 'SS', cap: '07100', regione: 'Sardegna' },
  { nome: 'Olbia', provincia: 'OT', cap: '07026', regione: 'Sardegna' },
  { nome: 'Nuoro', provincia: 'NU', cap: '08100', regione: 'Sardegna' },
  { nome: 'Oristano', provincia: 'OR', cap: '09170', regione: 'Sardegna' },
  { nome: 'Alghero', provincia: 'SS', cap: '07041', regione: 'Sardegna' },
  { nome: 'Quartu Sant\'Elena', provincia: 'CA', cap: '09045', regione: 'Sardegna' },
  // ─── SICILIA ────────────────────────────────────────────────────────
  { nome: 'Palermo', provincia: 'PA', cap: '90100', regione: 'Sicilia' },
  { nome: 'Catania', provincia: 'CT', cap: '95100', regione: 'Sicilia' },
  { nome: 'Messina', provincia: 'ME', cap: '98100', regione: 'Sicilia' },
  { nome: 'Siracusa', provincia: 'SR', cap: '96100', regione: 'Sicilia' },
  { nome: 'Ragusa', provincia: 'RG', cap: '97100', regione: 'Sicilia' },
  { nome: 'Trapani', provincia: 'TP', cap: '91100', regione: 'Sicilia' },
  { nome: 'Agrigento', provincia: 'AG', cap: '92100', regione: 'Sicilia' },
  { nome: 'Caltanissetta', provincia: 'CL', cap: '93100', regione: 'Sicilia' },
  { nome: 'Enna', provincia: 'EN', cap: '94100', regione: 'Sicilia' },
  { nome: 'Marsala', provincia: 'TP', cap: '91025', regione: 'Sicilia' },
  { nome: 'Gela', provincia: 'CL', cap: '93012', regione: 'Sicilia' },
  { nome: 'Vittoria', provincia: 'RG', cap: '97019', regione: 'Sicilia' },
  { nome: 'Bagheria', provincia: 'PA', cap: '90011', regione: 'Sicilia' },
  { nome: 'Misterbianco', provincia: 'CT', cap: '95045', regione: 'Sicilia' },
  { nome: 'Acireale', provincia: 'CT', cap: '95024', regione: 'Sicilia' },
  { nome: 'Licata', provincia: 'AG', cap: '92027', regione: 'Sicilia' },
  { nome: 'Mazara del Vallo', provincia: 'TP', cap: '91026', regione: 'Sicilia' },
  { nome: 'Sciacca', provincia: 'AG', cap: '92019', regione: 'Sicilia' },
  // ─── TOSCANA ────────────────────────────────────────────────────────
  { nome: 'Firenze', provincia: 'FI', cap: '50100', regione: 'Toscana' },
  { nome: 'Prato', provincia: 'PO', cap: '59100', regione: 'Toscana' },
  { nome: 'Livorno', provincia: 'LI', cap: '57100', regione: 'Toscana' },
  { nome: 'Arezzo', provincia: 'AR', cap: '52100', regione: 'Toscana' },
  { nome: 'Pisa', provincia: 'PI', cap: '56100', regione: 'Toscana' },
  { nome: 'Siena', provincia: 'SI', cap: '53100', regione: 'Toscana' },
  { nome: 'Pistoia', provincia: 'PT', cap: '51100', regione: 'Toscana' },
  { nome: 'Lucca', provincia: 'LU', cap: '55100', regione: 'Toscana' },
  { nome: 'Massa', provincia: 'MS', cap: '54100', regione: 'Toscana' },
  { nome: 'Grosseto', provincia: 'GR', cap: '58100', regione: 'Toscana' },
  { nome: 'Carrara', provincia: 'MS', cap: '54033', regione: 'Toscana' },
  { nome: 'Poggibonsi', provincia: 'SI', cap: '53036', regione: 'Toscana' },
  { nome: 'Empoli', provincia: 'FI', cap: '50053', regione: 'Toscana' },
  // ─── TRENTINO-ALTO ADIGE ────────────────────────────────────────────
  { nome: 'Trento', provincia: 'TN', cap: '38100', regione: 'Trentino-Alto Adige' },
  { nome: 'Bolzano', provincia: 'BZ', cap: '39100', regione: 'Trentino-Alto Adige' },
  { nome: 'Merano', provincia: 'BZ', cap: '39012', regione: 'Trentino-Alto Adige' },
  { nome: 'Rovereto', provincia: 'TN', cap: '38068', regione: 'Trentino-Alto Adige' },
  // ─── UMBRIA ─────────────────────────────────────────────────────────
  { nome: 'Perugia', provincia: 'PG', cap: '06100', regione: 'Umbria' },
  { nome: 'Terni', provincia: 'TR', cap: '05100', regione: 'Umbria' },
  { nome: 'Foligno', provincia: 'PG', cap: '06034', regione: 'Umbria' },
  { nome: 'Città di Castello', provincia: 'PG', cap: '06012', regione: 'Umbria' },
  // ─── VALLE D'AOSTA ──────────────────────────────────────────────────
  { nome: 'Aosta', provincia: 'AO', cap: '11100', regione: 'Valle d\'Aosta' },
  // ─── VENETO ─────────────────────────────────────────────────────────
  { nome: 'Venezia', provincia: 'VE', cap: '30100', regione: 'Veneto' },
  { nome: 'Verona', provincia: 'VR', cap: '37100', regione: 'Veneto' },
  { nome: 'Padova', provincia: 'PD', cap: '35100', regione: 'Veneto' },
  { nome: 'Vicenza', provincia: 'VI', cap: '36100', regione: 'Veneto' },
  { nome: 'Treviso', provincia: 'TV', cap: '31100', regione: 'Veneto' },
  { nome: 'Rovigo', provincia: 'RO', cap: '45100', regione: 'Veneto' },
  { nome: 'Belluno', provincia: 'BL', cap: '32100', regione: 'Veneto' },
  { nome: 'Mestre', provincia: 'VE', cap: '30170', regione: 'Veneto' },
  { nome: 'Chioggia', provincia: 'VE', cap: '30015', regione: 'Veneto' },
  { nome: 'Bassano del Grappa', provincia: 'VI', cap: '36061', regione: 'Veneto' },
  { nome: 'Schio', provincia: 'VI', cap: '36015', regione: 'Veneto' },
  { nome: 'Jesolo', provincia: 'VE', cap: '30016', regione: 'Veneto' },
  { nome: 'Thiene', provincia: 'VI', cap: '36016', regione: 'Veneto' },
  { nome: 'San Donà di Piave', provincia: 'VE', cap: '30027', regione: 'Veneto' },
  { nome: 'Montebelluna', provincia: 'TV', cap: '31044', regione: 'Veneto' },
]

// Ricerca con fuzzy matching (ignora accenti e maiuscole)
export function cercaComuni(query: string): Comune[] {
  if (!query || query.length < 2) return []
  const q = normalizza(query)
  return COMUNI_ITALIANI
    .filter(c => normalizza(c.nome).startsWith(q) || normalizza(c.nome).includes(q))
    .sort((a, b) => {
      // Prima quelli che iniziano con la query
      const aStarts = normalizza(a.nome).startsWith(q)
      const bStarts = normalizza(b.nome).startsWith(q)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return a.nome.localeCompare(b.nome)
    })
    .slice(0, 8)
}

export function trovaComuneEsatto(nome: string): Comune | null {
  const n = normalizza(nome)
  return COMUNI_ITALIANI.find(c => normalizza(c.nome) === n) ?? null
}

function normalizza(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}