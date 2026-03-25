// src/app/api/auth/benvenuto/route.ts
// Manda email di benvenuto con credenziali temporanee
// Chiamata dal wizard dopo la creazione automatica dell'account

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, password, nome } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e password obbligatorie' }, { status: 400 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  const { error } = await resend.emails.send({
    from: 'Zipra <notifiche@zipra.it>',
    to: email,
    subject: '✅ Account Zipra creato — le tue credenziali di accesso',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #0f1623; color: #e8edf5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto;">
    
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 28px; font-weight: 900; color: #00C48C;">zipra ⚡</span>
    </div>

    <div style="background: #1a2235; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px;">
      
      <h2 style="margin: 0 0 8px; font-size: 22px; color: #e8edf5;">
        Benvenuto${nome ? `, ${nome}` : ''}! 🎉
      </h2>
      <p style="color: #8896aa; margin: 0 0 24px; font-size: 15px;">
        Il tuo account Zipra è stato creato automaticamente durante la compilazione della pratica.
        Ecco le tue credenziali per accedere alla dashboard.
      </p>

      <div style="background: rgba(0,196,140,0.08); border: 1px solid rgba(0,196,140,0.25); border-radius: 14px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 12px; color: #00C48C; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Le tue credenziali</p>
        <div style="margin-bottom: 10px;">
          <p style="margin: 0 0 2px; font-size: 12px; color: #8896aa;">Email</p>
          <p style="margin: 0; font-size: 15px; color: #e8edf5; font-weight: 600;">${email}</p>
        </div>
        <div>
          <p style="margin: 0 0 2px; font-size: 12px; color: #8896aa;">Password temporanea</p>
          <p style="margin: 0; font-size: 20px; color: #00C48C; font-weight: 900; font-family: monospace; letter-spacing: 0.05em;">${password}</p>
        </div>
      </div>

      <div style="background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.2); border-radius: 10px; padding: 14px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #ffc107;">
          ⚠️ <strong>Cambia la password al primo accesso.</strong> Usa una password sicura che solo tu conosca.
        </p>
      </div>

      <a href="${baseUrl}/dashboard" 
         style="display: block; text-align: center; background: #00C48C; color: #0f1623; font-weight: 700; font-size: 15px; padding: 14px 24px; border-radius: 12px; text-decoration: none; margin-bottom: 20px;">
        Accedi alla tua dashboard →
      </a>

      <div style="border-top: 1px solid rgba(255,255,255,0.07); padding-top: 20px; margin-top: 8px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #c4cdd9;">
          <strong>Cosa trovi nella dashboard:</strong>
        </p>
        <ul style="margin: 0; padding-left: 16px; color: #8896aa; font-size: 13px; line-height: 1.8;">
          <li>La tua pratica in lavorazione con stato aggiornato</li>
          <li>I documenti da caricare (se ce ne sono)</li>
          <li>Notifiche e aggiornamenti sulla pratica</li>
          <li>Cambio password nelle impostazioni</li>
        </ul>
      </div>
    </div>

    <p style="text-align: center; color: #4d6070; font-size: 12px; margin-top: 24px;">
      Zipra S.r.l. — Burocrazia semplice per le imprese italiane<br>
      <a href="${baseUrl}" style="color: #00C48C; text-decoration: none;">zipra.it</a>
    </p>
  </div>
</body>
</html>`,
  })

  if (error) {
    console.error('Errore invio email benvenuto:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}