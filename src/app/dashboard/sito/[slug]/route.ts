// PATH: src/app/sito/[slug]/route.ts
// Proxy che serve il sito vetrina da Supabase Storage come HTML renderizzato

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const admin = createAdminClient()

  // Scarica l'HTML da Supabase Storage
  const { data, error } = await admin.storage
    .from('siti-vetrina')
    .download(`siti/${slug}/index.html`)

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