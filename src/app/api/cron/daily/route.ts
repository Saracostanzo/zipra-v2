// src/app/api/cron/daily/route.ts
// Gira ogni giorno alle 9:00 — controlla scadenze e manda reminder
// Configurato in vercel.json o cron-job.org

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role per leggere tutti gli utenti
)
const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Scadenze fisse annuali per tipo attività ─────────────────────────────────
const SCADENZE_ANNUALI = [
  {
    id: 'diritto_camerale',
    titolo: 'Diritto annuale Camera di Commercio',
    descrizione: 'Il diritto annuale CCIAA va pagato entro il 30 giugno di ogni anno tramite modello F24.',
    mese: 5, // giugno (0-indexed)
    giorno: 16, // reminder 2 settimane prima = 16 maggio
    giorni_anticipo: 30,
    link: 'https://www.registroimprese.it/diritto-annuale',
    importo_indicativo: 'da €44 a €1.100 a seconda del fatturato',
  },
  {
    id: 'inps_artigiani_commercianti_q1',
    titolo: 'Contributi INPS — 1° rata trimestrale',
    descrizione: 'Prima rata contributi fissi INPS artigiani/commercianti. Scadenza: 16 maggio.',
    mese: 4, // maggio
    giorno: 1, // reminder 15 giorni prima
    giorni_anticipo: 15,
    importo_indicativo: '~€900 (importo fisso 2024)',
  },
  {
    id: 'inps_artigiani_commercianti_q2',
    titolo: 'Contributi INPS — 2° rata trimestrale',
    descrizione: 'Seconda rata contributi fissi INPS. Scadenza: 20 agosto.',
    mese: 7, // agosto
    giorno: 5,
    giorni_anticipo: 15,
    importo_indicativo: '~€900',
  },
  {
    id: 'inps_artigiani_commercianti_q3',
    titolo: 'Contributi INPS — 3° rata trimestrale',
    descrizione: 'Terza rata contributi fissi INPS. Scadenza: 16 novembre.',
    mese: 10, // novembre
    giorno: 1,
    giorni_anticipo: 15,
    importo_indicativo: '~€900',
  },
  {
    id: 'inps_artigiani_commercianti_q4',
    titolo: 'Contributi INPS — 4° rata trimestrale',
    descrizione: 'Quarta rata contributi fissi INPS. Scadenza: 16 febbraio.',
    mese: 1, // febbraio
    giorno: 1,
    giorni_anticipo: 15,
    importo_indicativo: '~€900',
  },
  {
    id: 'dichiarazione_redditi',
    titolo: 'Dichiarazione dei redditi — scadenza',
    descrizione: 'Modello Redditi o 730. Scadenza: 30 novembre. Affidati al tuo commercialista.',
    mese: 10, // novembre
    giorno: 15,
    giorni_anticipo: 15,
  },
  {
    id: 'iva_annuale',
    titolo: 'Liquidazione IVA annuale',
    descrizione: 'Se in regime ordinario: liquidazione IVA annuale entro 16 marzo.',
    mese: 2, // marzo
    giorno: 1,
    giorni_anticipo: 15,
  },
  {
    id: 'rinnovo_pec',
    titolo: 'Rinnovo PEC annuale',
    descrizione: 'La PEC aziendale va rinnovata ogni anno. Zipra può gestire il rinnovo per te.',
    mese: 11, // dicembre — reminder generico
    giorno: 1,
    giorni_anticipo: 30,
  },
]

// ─── Verifica autorizzazione cron ─────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// ─── Route principale ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const oggi = new Date()
  const risultati: string[] = []
  let emailInviate = 0

  try {
    // Carica tutti gli utenti con piano base o pro (hanno il servizio adempimenti)
    const { data: profili } = await supabase
      .from('profiles')
      .select('id, email, nome, piano')
      .in('piano', ['base', 'pro', 'free']) // anche free — promemoria utili per tutti
      .not('email', 'is', null)

    if (!profili?.length) {
      return NextResponse.json({ messaggio: 'Nessun utente trovato', emailInviate: 0 })
    }

    // Carica pratiche attive per utente
    const { data: pratiche } = await supabase
      .from('pratiche')
      .select('id, user_id, tipo_attivita, forma_giuridica, stato, created_at')
      .in('stato', ['completata', 'inviata_ente', 'bozza'])

    // Mappa user_id → pratiche
    const pratichePerUtente = new Map<string, any[]>()
    for (const p of pratiche ?? []) {
      const lista = pratichePerUtente.get(p.user_id) ?? []
      lista.push(p)
      pratichePerUtente.set(p.user_id, lista)
    }

    // Controlla ogni scadenza
    for (const scadenza of SCADENZE_ANNUALI) {
      // La scadenza reale
      const dataScadenza = new Date(oggi.getFullYear(), scadenza.mese, scadenza.giorno + scadenza.giorni_anticipo)
      
      // Siamo nel giorno giusto per mandare il reminder?
      const reminderDate = new Date(oggi.getFullYear(), scadenza.mese, scadenza.giorno)
      const isOggiIlGiornoGiusto = (
        oggi.getMonth() === reminderDate.getMonth() &&
        oggi.getDate() === reminderDate.getDate()
      )

      if (!isOggiIlGiornoGiusto) continue

      risultati.push(`📅 Scadenza attiva: ${scadenza.titolo}`)

      // Manda email a tutti gli utenti con pratica attiva
      for (const profilo of profili) {
        const praticheutente = pratichePerUtente.get(profilo.id) ?? []
        
        // Manda solo se ha almeno una pratica (ha un'impresa)
        if (praticheutente.length === 0 && scadenza.id !== 'diritto_camerale') continue

        // Controlla se già notificato quest'anno
        const { data: giàNotificato } = await supabase
          .from('adempimenti_notificati')
          .select('id')
          .eq('user_id', profilo.id)
          .eq('adempimento_id', `${scadenza.id}_${oggi.getFullYear()}`)
          .single()

        if (giàNotificato) continue

        // Invia email
        const { error: emailError } = await resend.emails.send({
          from: 'Zipra <notifiche@zipra.it>',
          to: profilo.email,
          subject: `⏰ Scadenza imminente: ${scadenza.titolo}`,
          html: buildEmailReminder(profilo.nome ?? 'Imprenditore', scadenza, dataScadenza),
        })

        if (!emailError) {
          emailInviate++
          
          // Segna come notificato
          await supabase.from('adempimenti_notificati').upsert({
            user_id: profilo.id,
            adempimento_id: `${scadenza.id}_${oggi.getFullYear()}`,
            notificato_at: new Date().toISOString(),
          })

          // Crea notifica in-app
          await supabase.from('notifiche').insert({
            user_id: profilo.id,
            tipo: 'scadenza',
            titolo: `⏰ ${scadenza.titolo}`,
            messaggio: scadenza.descrizione,
            letta: false,
            azione_url: scadenza.link ?? '/dashboard',
            azione_label: 'Vedi dettagli',
          })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      scadenze_verificate: SCADENZE_ANNUALI.length,
      scadenze_attive_oggi: risultati.length,
      email_inviate: emailInviate,
      utenti_verificati: profili.length,
      risultati,
    })

  } catch (e: any) {
    console.error('Cron daily error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── Template email reminder ──────────────────────────────────────────────────
function buildEmailReminder(nome: string, scadenza: typeof SCADENZE_ANNUALI[0], dataScadenza: Date): string {
  const dataFormattata = dataScadenza.toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #0f1623; color: #e8edf5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto;">
    
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 28px; font-weight: 900; color: #00C48C;">zipra ⚡</span>
    </div>

    <div style="background: #1a2235; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px;">
      
      <div style="font-size: 32px; margin-bottom: 16px;">⏰</div>
      
      <h2 style="margin: 0 0 8px; font-size: 20px; color: #e8edf5;">
        Ciao ${nome}, scadenza in arrivo
      </h2>
      
      <div style="background: rgba(0,196,140,0.08); border: 1px solid rgba(0,196,140,0.2); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-weight: 700; color: #00C48C; font-size: 16px;">
          ${scadenza.titolo}
        </p>
        <p style="margin: 0; color: #8896aa; font-size: 13px;">
          Scadenza: <strong style="color: #e8edf5;">${dataFormattata}</strong>
          ${scadenza.giorni_anticipo ? ` — tra ${scadenza.giorni_anticipo} giorni` : ''}
        </p>
      </div>

      <p style="color: #c4cdd9; line-height: 1.6; font-size: 14px;">
        ${scadenza.descrizione}
      </p>

      ${scadenza.importo_indicativo ? `
      <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #8896aa;">
          💰 Importo indicativo: <strong style="color: #e8edf5;">${scadenza.importo_indicativo}</strong>
        </p>
      </div>
      ` : ''}

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07);">
        <p style="color: #4d6070; font-size: 12px; margin: 0;">
          Hai ricevuto questa email perché hai un'impresa registrata su Zipra.<br>
          Per disattivare i reminder: <a href="https://zipra.it/dashboard/impostazioni" style="color: #00C48C;">vai alle impostazioni</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}