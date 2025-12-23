import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

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
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                  <div className="flex items-center gap-8">
                    <a href="/" className="flex items-center">
                      <span className="text-lg font-semibold text-gray-900">InvestIQ</span>
                    </a>
                    <nav className="flex items-center space-x-5">
                      <a href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">Search</a>
                      <a href="/property" className="text-sm font-medium text-gray-600 hover:text-gray-900">Dashboard</a>
                      <a href="/photos" className="text-sm font-medium text-gray-600 hover:text-gray-900">Photos</a>
                    </nav>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Sign In</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors">Get Started</button>
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
