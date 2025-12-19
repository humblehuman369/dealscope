import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DealScope - Real Estate Investment Analytics',
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
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <a href="/" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <span className="text-xl font-bold text-gray-900">DealScope</span>
                    </a>
                  </div>
                  <nav className="hidden md:flex items-center space-x-6">
                    <a href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">Search</a>
                    <a href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">Dashboard</a>
                    <a href="/strategies" className="text-sm font-medium text-gray-600 hover:text-gray-900">Strategies</a>
                  </nav>
                  <div className="flex items-center space-x-4">
                    <button className="btn-secondary text-sm">Sign In</button>
                    <button className="btn-primary text-sm">Get Started</button>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main>
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="text-sm text-gray-500">
                    © 2025 DealScope. Real Estate Investment Analytics.
                  </div>
                  <div className="flex space-x-6 mt-4 md:mt-0">
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
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
