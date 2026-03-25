import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zipra — Pratiche burocratiche per imprese italiane',
  description: 'Apri la tua impresa, gestisci modifiche e adempimenti. L\'AI pensa a tutto.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
