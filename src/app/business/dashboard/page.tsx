import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import BusinessDashboardClient from './BusinessDashboardClient'

export default async function BusinessDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, business_accounts(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.tipo_account || profile.tipo_account === 'privato') {
    redirect('/dashboard')
  }

  const { data: business } = await supabase
    .from('business_accounts')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/onboarding')

  // Clienti del business con le loro pratiche
  const { data: clienti } = await supabase
    .from('business_clienti')
    .select(`
      *,
      cliente:profiles(id, nome, cognome, email, piano, created_at),
      pratiche:pratiche(id, nome_impresa, stato, comune_sede, tipo_attivita, created_at)
    `)
    .eq('business_id', business.id)
    .order('aggiunto_at', { ascending: false })

  // Stats pratiche
  const tutteLePratiche = clienti?.flatMap(c => c.pratiche) ?? []
  const stats = {
    totaleClienti: clienti?.length ?? 0,
    praticheTotali: tutteLePratiche.length,
    praticheAttive: tutteLePratiche.filter(p => !['completata', 'bozza'].includes(p.stato)).length,
    praticheCompletate: tutteLePratiche.filter(p => p.stato === 'completata').length,
  }

  return <BusinessDashboardClient business={business} clienti={clienti ?? []} stats={stats} />
}
