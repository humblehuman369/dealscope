import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InvestIQ - Real Estate Investment Analytics',
  description: 'Analyze properties across 6 investment strategies: Long-term Rental, Short-term Rental, BRRRR, Fix & Flip, House Hacking, and Wholesale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            {/* Header with property selection */}
            <Header />

            {/* Main content */}
            <main>
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="text-xs text-gray-500">
                    © 2025 InvestIQ. Real Estate Investment Analytics.
                  </div>
                  <div className="flex space-x-5 mt-3 md:mt-0">
                    <a href="#" className="text-xs text-gray-500 hover:text-gray-700">Privacy</a>
                    <a href="#" className="text-xs text-gray-500 hover:text-gray-700">Terms</a>
                    <a href="#" className="text-xs text-gray-500 hover:text-gray-700">Contact</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
