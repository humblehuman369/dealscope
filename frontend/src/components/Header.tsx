'use client'

import { Bell, Settings, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-semibold text-gray-900">InvestIQ</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-5">
              <Link 
                href="/scan" 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/scan' ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ScanLine className="w-4 h-4" />
                Scan
              </Link>
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/' ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search
              </Link>
              <Link 
                href="/property" 
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/property') ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/photos" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/photos' ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Photos
              </Link>
            </nav>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2 ml-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Sign In
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

