// PATH: src/lib/yousign/index.ts

const BASE =
  process.env.YOUSIGN_SANDBOX === 'true'
    ? 'https://api-sandbox.yousign.app/v3'
    : 'https://api.yousign.app/v3'

const H = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.YOUSIGN_API_KEY!}`,
  'Content-Type': 'application/json',
})

export interface YousignSigner {
  info: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
    locale: 'it'
  }
  signature_level:
    | 'electronic_signature'
    | 'advanced_electronic_signature'
    | 'qualified_electronic_signature'
  signature_authentication_mode: 'otp_sms' | 'otp_email' | 'no_otp'
}

export interface SignatureRequest {
  id: string
  status: 'draft' | 'ongoing' | 'done' | 'deleted' | 'expired' | 'canceled'
  signers: { id: string; status: string; signature_link?: string }[]
  documents: { id: string }[]
  audit_trail_locale: string
}

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
  redirectSuccesso, // ignorato in trial, mantenuto per compatibilità
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
    // ── Step 1: Crea la signature request ──────────────────────────────────
    const requestRes = await fetch(`${BASE}/signature_requests`, {
      method: 'POST',
      headers: H(),
      body: JSON.stringify({
        name: nomePDF.replace('.pdf', ''),
        delivery_mode: 'email',
        timezone: 'Europe/Rome',
        audit_trail_locale: 'it',
        ...(externalId ? { external_id: externalId } : {}),
      }),
    })

    if (!requestRes.ok) {
      console.error('Yousign create request error:', requestRes.status, await requestRes.text())
      return null
    }
    const { id: requestId } = await requestRes.json()
    console.log('[Yousign] Signature request creata:', requestId)

    // ── Step 2: Carica il documento PDF ────────────────────────────────────
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
      headers: { Authorization: `Bearer ${process.env.YOUSIGN_API_KEY!}` },
      body: formData,
    })

    if (!uploadRes.ok) {
      console.error('Yousign upload error:', uploadRes.status, await uploadRes.text())
      return null
    }
    const { id: documentId } = await uploadRes.json()
    console.log('[Yousign] Documento caricato:', documentId)

    // ── Step 3: Aggiungi il firmatario ──────────────────────────────────────
    const signerRes = await fetch(`${BASE}/signature_requests/${requestId}/signers`, {
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
        // redirect_urls non permesso in trial Yousign
      }),
    })

    if (!signerRes.ok) {
      console.error('Yousign add signer error:', signerRes.status, await signerRes.text())
      return null
    }
    const { id: signerId } = await signerRes.json()
    console.log('[Yousign] Firmatario aggiunto:', signerId)

    // ── Step 4: Aggiungi campo firma visivo ─────────────────────────────────
    // ENDPOINT CORRETTO: /documents/:docId/fields  (non /signature_fields)
    const campo = campiDaFirmare?.[0] ?? {
      pagina: 1,
      x: 50,
      y: 700,
      larghezza: 200,
      altezza: 50,
    }

    const fieldsRes = await fetch(
      `${BASE}/signature_requests/${requestId}/documents/${documentId}/fields`,
      {
        method: 'POST',
        headers: H(),
        body: JSON.stringify({
          signer_id: signerId,
          type: 'signature',
          page: campo.pagina,
          x: campo.x,
          y: campo.y,
          width: campo.larghezza,
          height: campo.altezza,
        }),
      }
    )

    if (!fieldsRes.ok) {
      console.warn('Yousign add field warning:', fieldsRes.status, await fieldsRes.text())
    } else {
      console.log('[Yousign] Campo firma aggiunto')
    }

    // ── Step 5: Attiva — invia email al cliente ─────────────────────────────
    const activateRes = await fetch(`${BASE}/signature_requests/${requestId}/activate`, {
      method: 'POST',
      headers: H(),
    })

    if (!activateRes.ok) {
      console.error('Yousign activate error:', activateRes.status, await activateRes.text())
      return null
    }
    console.log('[Yousign] Richiesta attivata, email inviata a', email)

    // ── Step 6: Recupera il link di firma ───────────────────────────────────
    const signerDetailRes = await fetch(
      `${BASE}/signature_requests/${requestId}/signers/${signerId}`,
      { headers: H() }
    )
    const signerDetail = signerDetailRes.ok ? await signerDetailRes.json() : {}
    console.log('[Yousign] Link firma:', signerDetail.signature_link ?? 'non disponibile')

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

export async function scaricaPDFFirmato(
  requestId: string,
  documentId: string
): Promise<Buffer | null> {
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