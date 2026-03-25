/**
 * YOUSIGN v3 — Integrazione completa firma digitale e deleghe
 *
 * Flusso corretto v3:
 *   1. POST /signature_requests                        → crea la richiesta (senza documenti)
 *   2. POST /signature_requests/:id/documents          → carica PDF (NON /documents standalone)
 *   3. POST /signature_requests/:id/signatories        → aggiungi firmatario
 *   4. POST /signature_requests/:id/signature_fields   → campo firma visivo
 *   5. POST /signature_requests/:id/activate           → invia email al cliente
 *   6. GET  /signature_requests/:id/signatories/:sid   → ottieni link firma
 *
 * API docs: https://developers.yousign.com/reference
 * Sandbox:  https://staging-api.yousign.app/v3
 * Prod:     https://api.yousign.app/v3
 */

const BASE =
  process.env.YOUSIGN_SANDBOX === 'true'
    ? 'https://staging-api.yousign.app/v3'
    : 'https://api.yousign.app/v3'

// Header JSON — NON usato per le chiamate multipart (FormData gestisce Content-Type da solo)
const H = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.YOUSIGN_API_KEY!}`,
  'Content-Type': 'application/json',
})

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export interface YousignSigner {
  info: {
    first_name: string
    last_name: string
    email: string
    phone_number: string // formato +39XXXXXXXXXX
    locale: 'it'
  }
  signature_level:
    | 'electronic_signature'
    | 'advanced_electronic_signature'
    | 'qualified_electronic_signature'
  signature_authentication_mode: 'otp_sms' | 'otp_email' | 'no_otp'
  redirect_urls?: {
    success?: string
    error?: string
  }
}

export interface SignatureRequest {
  id: string
  status: 'draft' | 'ongoing' | 'done' | 'deleted' | 'expired' | 'canceled'
  signers: { id: string; status: string; signature_link?: string }[]
  documents: { id: string }[]
  audit_trail_locale: string
}

// ─── 1. Crea richiesta di firma ────────────────────────────────────────────────

export async function creaRichiestaDiFirma({
  nome,
  cognome,
  email,
  telefono,
  pdfBuffer,
  nomePDF,
  tipoFirma = 'advanced_electronic_signature',
  campiDaFirmare,
  externalId,
  redirectSuccesso,
}: {
  nome: string
  cognome: string
  email: string
  telefono: string
  pdfBuffer: Buffer
  nomePDF: string
  tipoFirma?: YousignSigner['signature_level']
  campiDaFirmare?: { pagina: number; x: number; y: number; larghezza: number; altezza: number }[]
  externalId?: string
  redirectSuccesso?: string
}): Promise<{ requestId: string; signerId: string; signLink: string } | null> {
  try {
    // ── Step 1: Crea la signature request (SENZA documenti — si aggiungono dopo) ──
    const requestRes = await fetch(`${BASE}/signature_requests`, {
      method: 'POST',
      headers: H(),
      body: JSON.stringify({
        name: nomePDF.replace('.pdf', ''),
        delivery_mode: 'email',
        timezone: 'Europe/Rome',
        audit_trail_locale: 'it',
        ...(externalId ? { external_id: externalId } : {}),
        email_notification: {
          sender: {
            name: 'Zipra',
            email: 'notifiche@zipra.it',
          },
          signers: [
            {
              request_subject: 'Firma richiesta — Zipra',
              request_body: `Gentile ${nome},\n\nCi siamo quasi! Per completare l'apertura della tua impresa con Zipra, ti chiediamo di firmare digitalmente questo documento. Bastano 30 secondi.\n\nClicca il bottone qui sotto per firmare.\n\nTeam Zipra`,
              signed_notification: true,
            },
          ],
        },
      }),
    })

    if (!requestRes.ok) {
      console.error('Yousign create request error:', requestRes.status, await requestRes.text())
      return null
    }
    const { id: requestId } = await requestRes.json()
    console.log('[Yousign] Signature request creata:', requestId)

    // ── Step 2: Carica il documento PDF sotto la signature request ──────────────
    // IMPORTANTE: NON impostare Content-Type — FormData lo imposta da solo con il boundary
    const formData = new FormData()
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer
    formData.append(
      'file',
      new Blob([arrayBuffer], { type: 'application/pdf' }),
      nomePDF.endsWith('.pdf') ? nomePDF : `${nomePDF}.pdf`
    )
    formData.append('nature', 'signable_document')

    const uploadRes = await fetch(`${BASE}/signature_requests/${requestId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.YOUSIGN_API_KEY!}`,
        // NON aggiungere Content-Type qui — FormData lo gestisce autonomamente
      },
      body: formData,
    })

    if (!uploadRes.ok) {
      console.error('Yousign upload error:', uploadRes.status, await uploadRes.text())
      return null
    }
    const { id: documentId } = await uploadRes.json()
    console.log('[Yousign] Documento caricato:', documentId)

    // ── Step 3: Aggiungi il firmatario ──────────────────────────────────────────
    const signerRes = await fetch(`${BASE}/signature_requests/${requestId}/signatories`, {
      method: 'POST',
      headers: H(),
      body: JSON.stringify({
        info: {
          first_name: nome,
          last_name: cognome,
          email,
          phone_number: telefono,
          locale: 'it',
        },
        signature_level: tipoFirma,
        signature_authentication_mode: 'otp_sms',
        ...(redirectSuccesso
          ? {
              redirect_urls: {
                success: redirectSuccesso,
                error: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?firma=errore`,
              },
            }
          : {}),
      }),
    })

    if (!signerRes.ok) {
      console.error('Yousign add signatory error:', signerRes.status, await signerRes.text())
      return null
    }
    const { id: signerId } = await signerRes.json()
    console.log('[Yousign] Firmatario aggiunto:', signerId)

    // ── Step 4: Aggiungi campo firma visivo ─────────────────────────────────────
    const campo = campiDaFirmare?.[0] ?? {
      pagina: 1,
      x: 50,
      y: 700,
      larghezza: 200,
      altezza: 50,
    }

    const fieldsRes = await fetch(`${BASE}/signature_requests/${requestId}/signature_fields`, {
      method: 'POST',
      headers: H(),
      body: JSON.stringify({
        document_id: documentId,
        signatory_id: signerId,
        type: 'signature',
        page: campo.pagina,
        x: campo.x,
        y: campo.y,
        width: campo.larghezza,
        height: campo.altezza,
      }),
    })

    if (!fieldsRes.ok) {
      // Non bloccante — il campo firma è visivo, la firma funziona comunque
      console.warn('Yousign add field warning:', fieldsRes.status, await fieldsRes.text())
    }

    // ── Step 5: Attiva (invia email al cliente) ─────────────────────────────────
    const activateRes = await fetch(`${BASE}/signature_requests/${requestId}/activate`, {
      method: 'POST',
      headers: H(),
    })

    if (!activateRes.ok) {
      console.error('Yousign activate error:', activateRes.status, await activateRes.text())
      return null
    }
    console.log('[Yousign] Richiesta attivata, email inviata a', email)

    // ── Step 6: Recupera il link di firma ───────────────────────────────────────
    const signerDetailRes = await fetch(
      `${BASE}/signature_requests/${requestId}/signatories/${signerId}`,
      { headers: H() }
    )
    const signerDetail = signerDetailRes.ok ? await signerDetailRes.json() : {}

    return {
      requestId,
      signerId,
      signLink: signerDetail.signature_link ?? '',
    }
  } catch (e) {
    console.error('Yousign creaRichiestaDiFirma error:', e)
    return null
  }
}

// ─── 2. Controlla stato firma ──────────────────────────────────────────────────

export async function getStatoFirma(requestId: string): Promise<{
  stato: 'in_attesa' | 'firmata' | 'scaduta' | 'errore'
  dataFirma?: string
  pdfFirmatoUrl?: string
} | null> {
  try {
    const res = await fetch(`${BASE}/signature_requests/${requestId}`, { headers: H() })
    if (!res.ok) return null
    const data = await res.json()

    if (data.status === 'done') {
      const docId = data.documents?.[0]?.id
      return {
        stato: 'firmata',
        dataFirma: data.signers?.[0]?.signed_at,
        pdfFirmatoUrl: docId
          ? `${BASE}/signature_requests/${requestId}/documents/${docId}/download`
          : undefined,
      }
    }

    if (data.status === 'expired' || data.status === 'canceled') return { stato: 'scaduta' }
    if (data.status === 'ongoing') return { stato: 'in_attesa' }
    return { stato: 'errore' }
  } catch {
    return null
  }
}

// ─── 3. Scarica PDF firmato ────────────────────────────────────────────────────

export async function scaricaPDFFirmato(requestId: string, documentId: string): Promise<Buffer | null> {
  try {
    const res = await fetch(
      `${BASE}/signature_requests/${requestId}/documents/${documentId}/download`,
      { headers: H() }
    )
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

// ─── 4. Webhook parser ────────────────────────────────────────────────────────
//
// Gli event_type corretti in v3:
//   'signature_request.done'      → tutta la richiesta completata (evento principale)
//   'signature_request.declined'  → firmatario ha rifiutato
//   'signature_request.expired'   → scaduta
//   'signer.done'                 → singolo firmatario ha firmato (con più firmatari)
//   'signer.notified'             → email inviata al firmatario

export function parseYousignWebhook(body: unknown): {
  tipo: 'firmata' | 'rifiutata' | 'visualizzata' | 'scaduta' | 'altro'
  requestId: string
  signerId?: string
  externalId?: string
} {
  const b = body as Record<string, unknown>
  const eventType = (b?.event_name ?? b?.event_type ?? '') as string
  const sr = (b?.data as Record<string, unknown>)
    ?.signature_request as Record<string, unknown> | undefined
  const signer = (b?.data as Record<string, unknown>)
    ?.signer as Record<string, unknown> | undefined

  const requestId = (sr?.id ?? '') as string
  const signerId = signer?.id as string | undefined
  const externalId = sr?.external_id as string | undefined

  if (eventType === 'signature_request.done') return { tipo: 'firmata', requestId, signerId, externalId }
  if (eventType === 'signature_request.declined') return { tipo: 'rifiutata', requestId, signerId, externalId }
  if (eventType === 'signature_request.expired') return { tipo: 'scaduta', requestId, externalId }
  if (eventType === 'signer.done') return { tipo: 'firmata', requestId, signerId, externalId }
  if (eventType === 'signer.notified') return { tipo: 'visualizzata', requestId, signerId, externalId }

  return { tipo: 'altro', requestId, externalId }
}