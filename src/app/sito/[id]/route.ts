import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const admin = createAdminClient()

  const { data, error } = await admin.storage
    .from('siti-vetrina')
    .download(`siti/${id}/index.html`)

  if (error || !data) {
    return new NextResponse('Sito non trovato', { status: 404 })
  }

  const html = await data.text()

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}