import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'

// ─── Helpers tipografici ──────────────────────────────────────────────────────

const VERDE = rgb(0, 0.769, 0.549)
const SCURO = rgb(0.051, 0.067, 0.09)
const GRIGIO = rgb(0.4, 0.45, 0.52)
const ROSSO_SOFT = rgb(0.8, 0.15, 0.15)

async function baseDoc() {
  const doc = await PDFDocument.create()
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const norm = await doc.embedFont(StandardFonts.Helvetica)
  return { doc, bold, norm }
}

function addHeader(page: any, bold: any, norm: any, w: number, h: number, titolo: string, sottotitolo: string) {
  page.drawRectangle({ x: 0, y: h - 90, width: w, height: 90, color: SCURO })
  page.drawText('zipra', { x: 48, y: h - 52, size: 22, font: bold, color: VERDE })
  page.drawText(titolo, { x: 48, y: h - 72, size: 8, font: bold, color: rgb(0.6, 0.65, 0.7) })
  page.drawText(sottotitolo, { x: w - 240, y: h - 52, size: 8, font: norm, color: rgb(0.4, 0.45, 0.5) })
}

function addFooter(page: any, norm: any, w: number) {
  page.drawLine({ start: { x: 48, y: 55 }, end: { x: w - 48, y: 55 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) })
  page.drawText('Zipra S.r.l. — zipra.it', { x: 48, y: 38, size: 7, font: norm, color: GRIGIO })
  page.drawText('Documento generato automaticamente — valido ai sensi del D.Lgs. 82/2005 (CAD)', {
    x: 48, y: 26, size: 6.5, font: norm, color: rgb(0.6, 0.6, 0.6),
  })
}

// ─── 1. CONTRATTO DI SERVIZIO ─────────────────────────────────────────────────
// Firmato all'acquisto del piano — autorizza Zipra ad operare come intermediario

export async function generaContrattoServizio(dati: {
  nome: string
  cognome: string
  codiceFiscale: string
  email: string
  nomeImpresa: string
  comuneSede: string
  piano: string
  importo: number
  dataContratto: string
}): Promise<Buffer> {
  const { doc, bold, norm } = await baseDoc()
  const page = doc.addPage(PageSizes.A4)
  const { width: w, height: h } = page.getSize()

  addHeader(page, bold, norm, w, h, 'CONTRATTO DI SERVIZIO', `Data: ${dati.dataContratto}`)

  let y = h - 110

  const scrivi = (testo: string, font: any, size = 9, colore = SCURO, indent = 0) => {
    // Wrapping semplice per linee lunghe
    const maxW = w - 96 - indent
    const charsPerLine = Math.floor(maxW / (size * 0.52))
    if (testo.length <= charsPerLine) {
      page.drawText(testo, { x: 48 + indent, y, size, font, color: colore })
      y -= size + 5
    } else {
      const parole = testo.split(' ')
      let riga = ''
      for (const parola of parole) {
        if ((riga + parola).length > charsPerLine) {
          page.drawText(riga.trim(), { x: 48 + indent, y, size, font, color: colore })
          y -= size + 4
          riga = parola + ' '
        } else {
          riga += parola + ' '
        }
      }
      if (riga.trim()) {
        page.drawText(riga.trim(), { x: 48 + indent, y, size, font, color: colore })
        y -= size + 4
      }
    }
  }

  const spazio = (n = 8) => { y -= n }

  scrivi('CONTRATTO DI SERVIZIO PER APERTURA IMPRESA', bold, 13, SCURO)
  spazio(4)
  scrivi(`Piano: ${dati.piano.toUpperCase()} — €${dati.importo.toFixed(2)}`, norm, 9, GRIGIO)
  spazio(16)

  // Parti
  scrivi('PARTI DEL CONTRATTO', bold, 9, GRIGIO)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  spazio(8)

  scrivi('PRESTATORE DI SERVIZI', bold, 8, VERDE)
  spazio(4)
  scrivi('Zipra S.r.l. — P.IVA 12345678901 — Via Roma 1, 73100 Lecce (LE)', norm, 9)
  scrivi('in qualità di software house accreditata Infocamere per l\'invio telematico pratiche', norm, 9, GRIGIO)
  spazio(10)

  scrivi('CLIENTE', bold, 8, VERDE)
  spazio(4)
  scrivi(`${dati.nome} ${dati.cognome} — C.F. ${dati.codiceFiscale}`, bold, 9)
  scrivi(`Email: ${dati.email}`, norm, 9, GRIGIO)
  scrivi(`Impresa da aprire: ${dati.nomeImpresa} — Sede: ${dati.comuneSede}`, norm, 9, GRIGIO)
  spazio(16)

  // Oggetto
  scrivi('OGGETTO DEL CONTRATTO', bold, 9, GRIGIO)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  spazio(8)

  scrivi('Il Cliente incarica Zipra S.r.l. di svolgere, in qualità di intermediario abilitato, le seguenti attività:', norm, 9)
  spazio(6)

  const servizi = [
    'Analisi della situazione specifica e identificazione delle pratiche necessarie',
    'Compilazione e trasmissione telematica delle pratiche al Registro delle Imprese (ComUnica)',
    'Coordinamento con Agenzia delle Entrate, INPS, SUAP e altri enti competenti',
    'Archiviazione digitale di tutta la documentazione prodotta',
    'Notifica in tempo reale dello stato di avanzamento tramite email e SMS',
    'Reinoltro gratuito in caso di reiezione tecnica da parte degli enti',
  ]

  for (const s of servizi) {
    scrivi(`• ${s}`, norm, 9, SCURO, 8)
    spazio(2)
  }
  spazio(14)

  // Autorizzazione
  scrivi('AUTORIZZAZIONE AD OPERARE', bold, 9, GRIGIO)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  spazio(8)

  scrivi('Il Cliente, con la firma del presente contratto, autorizza espressamente Zipra S.r.l. a:', norm, 9)
  spazio(6)

  const autorizzazioni = [
    'Firmare e trasmettere pratiche ComUnica in qualità di intermediario accreditato Infocamere',
    'Accedere ai portali istituzionali (SUAP, Agenzia Entrate, INPS) per le pratiche di competenza',
    'Conservare e trattare i dati personali nel rispetto del GDPR (Reg. UE 2016/679)',
    'Comunicare con gli enti competenti per conto del Cliente relativamente alle pratiche commissionate',
  ]

  for (const a of autorizzazioni) {
    scrivi(`• ${a}`, norm, 9, SCURO, 8)
    spazio(2)
  }
  spazio(14)

  // Esclusioni
  scrivi('ESCLUSIONI — PRATICHE CON PROFESSIONISTI ABILITATI', bold, 9, ROSSO_SOFT)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.9, 0.85, 0.85) })
  spazio(8)

  scrivi('Il presente contratto NON copre le pratiche che per legge richiedono un professionista abilitato:', norm, 9)
  spazio(6)
  scrivi('• Costituzione di SRL/SPA: richiede atto notarile (costo a carico del Cliente, preventivato separatamente)', norm, 9, ROSSO_SOFT, 8)
  spazio(2)
  scrivi('• Deposito bilancio e dichiarazioni fiscali: richiedono firma di dottore commercialista (€40 aggiuntivi)', norm, 9, ROSSO_SOFT, 8)
  spazio(14)

  // Condizioni economiche
  scrivi('CONDIZIONI ECONOMICHE', bold, 9, GRIGIO)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  spazio(8)

  scrivi(`Corrispettivo piano ${dati.piano}: €${dati.importo.toFixed(2)} IVA inclusa — pagamento unico`, norm, 9)
  scrivi('Reinoltri e correzioni tecniche: inclusi nel corrispettivo, senza costi aggiuntivi', norm, 9)
  scrivi('Pratiche con notaio: a preventivo, costo comunicato prima di procedere', norm, 9)
  scrivi('Pratiche con commercialista affiliato: €40,00 aggiuntivi, comunicati prima di procedere', norm, 9)
  spazio(18)

  // Firma
  scrivi('FIRMA DEL CLIENTE', bold, 9, GRIGIO)
  spazio(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  spazio(10)
  scrivi(`${dati.nome} ${dati.cognome} — C.F. ${dati.codiceFiscale}`, norm, 9)
  spazio(4)
  scrivi('Data e ora firma: ___________________________', norm, 9, GRIGIO)
  spazio(6)
  scrivi('Firma digitale qualificata (eIDAS AES/QES):', norm, 8, GRIGIO)
  spazio(30)
  // Box firma
  page.drawRectangle({ x: 48, y, width: 220, height: 44, borderColor: VERDE, borderWidth: 1 })
  page.drawText('[ CAMPO FIRMA DIGITALE ]', { x: 70, y: y + 16, size: 8, font: norm, color: GRIGIO })
  spazio(-44)
  spazio(14)

  addFooter(page, norm, w)

  return Buffer.from(await doc.save())
}

// ─── 2. PROCURA SPECIALE ──────────────────────────────────────────────────────
// Per pratiche che richiedono dichiarazioni personali del cliente

export async function generaProcuraSpeciale(dati: {
  nome: string
  cognome: string
  codiceFiscale: string
  dataNascita: string
  luogoNascita: string
  indirizzo: string
  email: string
  nomeImpresa: string
  comuneSede: string
  provinciaSede: string
  praticheDelegate: string[]
  dataScadenza: string
}): Promise<Buffer> {
  const { doc, bold, norm } = await baseDoc()
  const page = doc.addPage(PageSizes.A4)
  const { width: w, height: h } = page.getSize()
  const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  addHeader(page, bold, norm, w, h, 'PROCURA SPECIALE', `Data: ${dataOggi}`)

  let y = h - 110

  const r = (t: string, f: any, s = 9, c = SCURO, i = 0) => {
    const chars = Math.floor((w - 96 - i) / (s * 0.52))
    if (t.length <= chars) { page.drawText(t, { x: 48 + i, y, size: s, font: f, color: c }); y -= s + 5 }
    else {
      const words = t.split(' '); let line = ''
      for (const w2 of words) {
        if ((line + w2).length > chars) { page.drawText(line.trim(), { x: 48 + i, y, size: s, font: f, color: c }); y -= s + 4; line = w2 + ' ' }
        else line += w2 + ' '
      }
      if (line.trim()) { page.drawText(line.trim(), { x: 48 + i, y, size: s, font: f, color: c }); y -= s + 4 }
    }
  }
  const sp = (n = 8) => { y -= n }

  r('PROCURA SPECIALE PER PRATICHE AMMINISTRATIVE', bold, 13)
  sp(4)
  r(`Lecce, ${dataOggi}`, norm, 9, GRIGIO)
  sp(16)

  r('Il/La sottoscritto/a:', bold, 9, GRIGIO)
  sp(6)
  r(`${dati.nome} ${dati.cognome}`, bold, 10)
  r(`Codice Fiscale: ${dati.codiceFiscale}`, norm, 9)
  r(`Nato/a il ${dati.dataNascita} a ${dati.luogoNascita}`, norm, 9)
  r(`Residente in: ${dati.indirizzo}`, norm, 9)
  sp(12)

  r('NOMINA PROCURATORE SPECIALE:', bold, 9, GRIGIO)
  sp(6)
  r('Zipra S.r.l.', bold, 10, VERDE)
  r('P.IVA 12345678901 — Sede legale: Via Roma 1, 73100 Lecce (LE)', norm, 9)
  r('in qualità di software house intermediaria accreditata Infocamere', norm, 9, GRIGIO)
  sp(12)

  r('CON IL PRESENTE ATTO CONFERISCE PROCURA SPECIALE per:', bold, 9, GRIGIO)
  sp(6)

  for (const p of dati.praticheDelegate) {
    r(`• ${p}`, norm, 9, SCURO, 8)
    sp(2)
  }
  sp(10)

  r(`relativamente all'impresa: ${dati.nomeImpresa}`, norm, 9)
  r(`con sede in: ${dati.comuneSede} (${dati.provinciaSede})`, norm, 9)
  sp(12)

  r('POTERI CONFERITI:', bold, 9, GRIGIO)
  sp(6)
  r('Il procuratore è autorizzato a compiere tutti gli atti necessari per le pratiche elencate, tra cui:', norm, 9)
  sp(6)

  const poteri = [
    'Presentare e sottoscrivere istanze, domande e dichiarazioni agli enti competenti',
    'Trasmettere telematicamente le pratiche al Registro delle Imprese tramite ComUnica/Telemaco',
    'Ricevere, in nome e per conto del mandante, le comunicazioni e ricevute degli enti',
    'Effettuare rettifiche e integrazioni richieste dagli enti, anche in seguito a reiezione',
    'Accedere ai portali istituzionali (SUAP, Agenzia Entrate, INPS) per le pratiche commissionate',
  ]

  for (const p of poteri) {
    r(`• ${p}`, norm, 9, SCURO, 8)
    sp(2)
  }
  sp(12)

  r('LIMITI DELLA PROCURA:', bold, 9, ROSSO_SOFT)
  sp(6)
  r('La presente procura speciale è limitata alle pratiche elencate e scade automaticamente al loro completamento', norm, 9)
  r(`o comunque entro il: ${dati.dataScadenza}`, norm, 9)
  r('Non è conferita alcuna procura per atti notarili, costituzione societaria o sottoscrizione di contratti.', norm, 9, ROSSO_SOFT)
  sp(12)

  r('REVOCA:', bold, 9, GRIGIO)
  sp(6)
  r('La presente procura può essere revocata in qualsiasi momento con comunicazione scritta a info@zipra.it', norm, 9)
  sp(20)

  r('FIRMA DEL MANDANTE', bold, 9, GRIGIO)
  sp(4)
  page.drawLine({ start: { x: 48, y }, end: { x: w - 48, y }, thickness: 0.3, color: rgb(0.88, 0.88, 0.88) })
  sp(10)
  r(`${dati.nome} ${dati.cognome} — C.F. ${dati.codiceFiscale}`, norm, 9)
  sp(4)
  r('Firma digitale qualificata (eIDAS AES):', norm, 8, GRIGIO)
  sp(28)
  page.drawRectangle({ x: 48, y, width: 240, height: 46, borderColor: VERDE, borderWidth: 1 })
  page.drawText('[ CAMPO FIRMA DIGITALE ]', { x: 72, y: y + 18, size: 8, font: norm, color: GRIGIO })
  sp(-46)
  sp(14)

  addFooter(page, norm, w)

  return Buffer.from(await doc.save())
}

// ─── 3. FASCICOLO NOTAIO ─────────────────────────────────────────────────────
// Pre-compila tutto — il notaio riceve un fascicolo pronto, deve solo formalizzare

export async function generaFascicoloNotaio(dati: {
  tipoAtti: string
  nomeImpresa: string
  soci: { nome: string; cognome: string; cf: string; quota: number; indirizzo: string }[]
  sedeLegale: string
  codiceAteco: string
  oggettoSociale: string
  capitoleSociale: number
  amministratore: string
  dataDesiderata?: string
  noteSpecifiche?: string
}): Promise<Buffer> {
  const { doc, bold, norm } = await baseDoc()
  const page = doc.addPage(PageSizes.A4)
  const { width: w, height: h } = page.getSize()
  const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  addHeader(page, bold, norm, w, h, 'FASCICOLO PRE-COMPILATO PER UFFICIO NOTARILE', `Generato: ${dataOggi}`)

  let y = h - 110
  const r = (t: string, f: any, s = 9, c = SCURO, i = 0) => {
    page.drawText(t.substring(0, 90), { x: 48 + i, y, size: s, font: f, color: c })
    y -= s + 5
  }
  const sp = (n = 8) => { y -= n }
  const sez = (titolo: string) => {
    sp(8)
    page.drawRectangle({ x: 48, y: y - 4, width: w - 96, height: 20, color: rgb(0.95, 0.98, 0.97) })
    page.drawText(titolo, { x: 52, y, size: 8, font: bold, color: VERDE })
    y -= 22
  }

  r(`FASCICOLO: ${dati.tipoAtti.toUpperCase()}`, bold, 14)
  sp(4)
  r('Documento pre-compilato da Zipra — da formalizzare a cura del Notaio', norm, 9, GRIGIO)
  sp(4)
  page.drawRectangle({ x: 48, y: y - 4, width: w - 96, height: 22, color: rgb(1, 0.97, 0.93) })
  r('⚠️  COSTO NOTAIO A CARICO DEL CLIENTE — preventivo richiesto prima di procedere', bold, 8, rgb(0.7, 0.35, 0))
  sp(16)

  sez('DATI IMPRESA')
  r(`Nome/Denominazione: ${dati.nomeImpresa}`, norm, 9)
  r(`Sede legale: ${dati.sedeLegale}`, norm, 9)
  r(`Codice ATECO: ${dati.codiceAteco}`, norm, 9)
  r(`Oggetto sociale: ${dati.oggettoSociale}`, norm, 9)
  r(`Capitale sociale: €${dati.capitoleSociale.toLocaleString('it-IT')}`, norm, 9)
  r(`Amministratore unico/Presidente CdA: ${dati.amministratore}`, norm, 9)

  sez('SOCI E QUOTE')
  for (const socio of dati.soci) {
    r(`${socio.nome} ${socio.cognome} — CF: ${socio.cf}`, bold, 9)
    r(`Residenza: ${socio.indirizzo} — Quota: ${socio.quota}%  (€${(dati.capitoleSociale * socio.quota / 100).toLocaleString('it-IT')})`, norm, 9, GRIGIO)
    sp(4)
  }

  sez('NOTE PER IL NOTAIO')
  r(dati.noteSpecifiche ?? 'Nessuna nota specifica. Procedere con atto standard.', norm, 9)
  if (dati.dataDesiderata) r(`Data desiderata per la stipula: ${dati.dataDesiderata}`, norm, 9, GRIGIO)
  sp(8)
  r('Per informazioni: info@zipra.it — Il cliente è stato contattato telefonicamente.', norm, 8, GRIGIO)

  addFooter(page, norm, w)

  return Buffer.from(await doc.save())
}

// ─── 4. FASCICOLO COMMERCIALISTA ─────────────────────────────────────────────

export async function generaFascicoloCommercialista(dati: {
  tipoIncarico: string
  nomeImpresa: string
  codiceFiscaleTitolare: string
  nomeTitolare: string
  cognomeTitolare: string
  partitaIva?: string
  codiceAteco: string
  periodoRiferimento: string
  datiContabili?: Record<string, string | number>
  notePratica?: string
}): Promise<Buffer> {
  const { doc, bold, norm } = await baseDoc()
  const page = doc.addPage(PageSizes.A4)
  const { width: w, height: h } = page.getSize()
  const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  addHeader(page, bold, norm, w, h, 'INCARICO AL COMMERCIALISTA AFFILIATO', `Generato: ${dataOggi}`)

  let y = h - 110
  const r = (t: string, f: any, s = 9, c = SCURO, i = 0) => {
    page.drawText(t.substring(0, 90), { x: 48 + i, y, size: s, font: f, color: c }); y -= s + 5
  }
  const sp = (n = 8) => { y -= n }
  const sez = (titolo: string) => {
    sp(8)
    page.drawRectangle({ x: 48, y: y - 4, width: w - 96, height: 20, color: rgb(0.98, 0.97, 0.95) })
    page.drawText(titolo, { x: 52, y, size: 8, font: bold, color: rgb(0.7, 0.4, 0) })
    y -= 22
  }

  r(`INCARICO: ${dati.tipoIncarico.toUpperCase()}`, bold, 14)
  sp(4)
  r('Fascicolo pre-compilato da Zipra — il commercialista firma e trasmette', norm, 9, GRIGIO)
  sp(4)
  page.drawRectangle({ x: 48, y: y - 4, width: w - 96, height: 22, color: rgb(0.95, 0.98, 0.97) })
  r('✅  COMPENSO COMMERCIALISTA: €40,00 — già inclusi nel piano del cliente', bold, 8, VERDE)
  sp(16)

  sez('DATI CLIENTE / IMPRESA')
  r(`Impresa: ${dati.nomeImpresa}`, norm, 9)
  r(`Titolare: ${dati.nomeTitolare} ${dati.cognomeTitolare} — CF: ${dati.codiceFiscaleTitolare}`, norm, 9)
  if (dati.partitaIva) r(`Partita IVA: ${dati.partitaIva}`, norm, 9)
  r(`Codice ATECO: ${dati.codiceAteco}`, norm, 9)
  r(`Periodo di riferimento: ${dati.periodoRiferimento}`, norm, 9)

  if (dati.datiContabili && Object.keys(dati.datiContabili).length > 0) {
    sez('DATI CONTABILI / DOCUMENTAZIONE')
    for (const [k, v] of Object.entries(dati.datiContabili)) {
      r(`${k}: ${v}`, norm, 9)
    }
  }

  sez('ISTRUZIONI')
  r(dati.notePratica ?? 'Procedere con la pratica standard per il tipo di incarico indicato.', norm, 9)
  sp(8)
  r('Una volta completato, inviare ricevuta/conferma a: pratiche@zipra.it', norm, 9, GRIGIO)
  r('Indicare nell\'oggetto email: numero pratica Zipra (indicato sopra)', norm, 9, GRIGIO)

  addFooter(page, norm, w)

  return Buffer.from(await doc.save())
}
