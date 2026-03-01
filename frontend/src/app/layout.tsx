import type { Metadata, Viewport } from 'next'
import { Inter, Source_Sans_3, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LayoutWrapper } from '@/components/LayoutWrapper'
import { Toaster } from '@/components/feedback'
import { SentryInit } from '@/components/SentryInit'
import { AnalyticsAndConsent } from '@/components/AnalyticsAndConsent'

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

const defaultTitle = 'DealGapIQ - Real Estate Investment Analytics'
const defaultDescription =
  'Analyze properties across 6 investment strategies: Long-term Rental, Short-term Rental, BRRRR, Fix & Flip, House Hacking, and Wholesale'
const canonicalBase =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : 'https://dealgapiq.com'

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: 'website',
    url: canonicalBase,
    siteName: 'DealGapIQ',
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
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
          <AnalyticsAndConsent />
        </Providers>
      </body>
    </html>
  )
}
