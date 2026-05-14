import type { Metadata, Viewport } from 'next'
import { Inter, Poppins, Source_Sans_3, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { LayoutWrapper } from '@/components/LayoutWrapper'
import { Toaster } from '@/components/feedback'
import { SentryInit } from '@/components/SentryInit'
import { AnalyticsAndConsent } from '@/components/AnalyticsAndConsent'
import { ThemeHydrationScript } from '@/components/theme/ThemeHydrationScript'
import { SiteJsonLd } from '@/components/seo/SiteJsonLd'

// ── Self-hosted fonts via next/font ────────────────
// Eliminates render-blocking requests to fonts.googleapis.com.
// Fonts are downloaded at build time and served from the same origin.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
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

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

export const metadata: Metadata = {
  metadataBase: new URL(canonicalBase),
  title: defaultTitle,
  description: defaultDescription,
  alternates: { canonical: '/' },
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
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification ? { other: { 'msvalidate.01': bingVerification } } : {}),
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`antialiased ${poppins.variable} ${inter.variable} ${sourceSans.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <head>
        <ThemeHydrationScript />
        <SiteJsonLd />
      </head>
      <body className="font-sans min-h-screen flex flex-col text-[var(--text-body)] transition-colors duration-300">
        <SentryInit />
        <Providers>
          {/* Layout with unified AppHeader */}
          <LayoutWrapper>{children}</LayoutWrapper>

          {/* Toast notifications */}
          <Toaster />
          <AnalyticsAndConsent />
        </Providers>
      </body>
    </html>
  )
}
