import type { Metadata, Viewport } from 'next'
import { Inter, Source_Sans_3, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LayoutWrapper } from '@/components/LayoutWrapper'
import { Toaster } from '@/components/feedback'
import { SentryInit } from '@/components/SentryInit'

// ── Self-hosted fonts via next/font ────────────────
// Eliminates render-blocking requests to fonts.googleapis.com.
// Fonts are downloaded at build time and served from the same origin.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-source-sans',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DealGapIQ - Real Estate Investment Analytics',
  description: 'Analyze properties across 6 investment strategies: Long-term Rental, Short-term Rental, BRRRR, Fix & Flip, House Hacking, and Wholesale',
  icons: {
    icon: '/images/dealgapiq-logo-icon.png',
    apple: '/images/dealgapiq-logo-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark antialiased ${inter.variable} ${sourceSans.variable} ${dmSans.variable} ${spaceMono.variable}`}>
      <body className="font-sans bg-black text-slate-body transition-colors duration-300">
        <SentryInit />
        <Providers>
          {/* Layout with unified AppHeader */}
          <LayoutWrapper>
            {children}
          </LayoutWrapper>

          {/* Toast notifications */}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
