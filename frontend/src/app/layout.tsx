import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'InvestIQ - Real Estate Investment Analytics',
  description: 'Analyze properties across 6 investment strategies: Long-term Rental, Short-term Rental, BRRRR, Fix & Flip, House Hacking, and Wholesale',
  icons: {
    icon: '/images/investiq-logo-icon.png',
    apple: '/images/investiq-logo-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e8eef3' },
    { media: '(prefers-color-scheme: dark)', color: '#07172e' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="antialiased">
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans bg-neutral-50 text-navy-900 dark:bg-navy-900 dark:text-neutral-100 transition-colors duration-300">
        <Providers>
          {/* Header - conditionally rendered based on route (hidden on landing pages) */}
          <Header />

          {/* Main content */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
