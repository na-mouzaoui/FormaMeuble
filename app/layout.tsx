import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FormaMeuble — Concepteur de mobilier',
  description: 'Configurez votre meuble sur mesure et demandez votre devis personnalisé.',
  applicationName: 'FormaMeuble',
  openGraph: {
    title: 'FormaMeuble — Concepteur de mobilier',
    description: 'Configurez votre meuble sur mesure et demandez votre devis personnalisé.',
    siteName: 'FormaMeuble',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FormaMeuble — Concepteur de mobilier',
    description: 'Configurez votre meuble sur mesure et demandez votre devis personnalisé.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#fbfcfa',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
