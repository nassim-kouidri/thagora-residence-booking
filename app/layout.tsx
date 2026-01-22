import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Thagora',
    template: '%s | Thagora',
  },
  description: "Application de réservation des espaces communs de la résidence.",
  icons: {
    icon: [
      // Réutilise le logo existant (public/logo.jpeg) en attendant un favicon dédié.
      { url: '/logo.jpeg' },
    ],
    apple: [{ url: '/logo.jpeg' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
