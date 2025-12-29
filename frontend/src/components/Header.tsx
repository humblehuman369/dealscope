'use client'

import { Bell, Settings, ScanLine, Search, Sun, Moon, User, LogOut, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

export default function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Hide header on home page (scanner) since it has its own header
  if (pathname === '/') {
    return null
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            
            {/* Auth Buttons / User Menu */}
            {isAuthenticated && user ? (
              /* User Menu */
              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => {
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Header.tsx:137',message:'Profile link clicked',data:{href:'/profile',pathname:window.location.pathname,user:user?.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
                        // #endregion
                        setShowUserMenu(false)
                      }}
                    >
                      <User className="w-4 h-4" />
                      Your Profile
                    </Link>
                    <Link
                      href="/saved"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Saved Properties
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Sign In / Get Started Buttons */
              <div className="hidden sm:flex items-center space-x-2 ml-2">
                <button 
                  onClick={() => setShowAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
