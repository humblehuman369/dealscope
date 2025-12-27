'use client'

import { Bell, Settings, ScanLine, Search, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

export default function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  
  // Hide header on home page (scanner) since it has its own header
  if (pathname === '/') {
    return null
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">InvestIQ</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-5">
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ScanLine className="w-4 h-4" />
                Scan
              </Link>
              <Link 
                href="/search" 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/search' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link 
                href="/property" 
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/property') ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/photos" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/photos' ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Photos
              </Link>
            </nav>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle Switch */}
            <button
              onClick={toggleTheme}
              className="relative inline-flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors duration-200"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <div className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-slate-600 transition-colors duration-300">
                <div 
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 shadow-md transition-all duration-300 flex items-center justify-center ${
                    theme === 'dark' ? 'left-[26px]' : 'left-0.5'
                  }`}
                >
                  {theme === 'light' ? (
                    <Sun className="w-3 h-3 text-amber-500" />
                  ) : (
                    <Moon className="w-3 h-3 text-indigo-400" />
                  )}
                </div>
              </div>
            </button>
            
            <button className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
            </button>
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2 ml-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
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

