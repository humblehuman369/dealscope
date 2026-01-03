'use client'

import { Bell, Settings, ScanLine, Search, Sun, Moon, User, LogOut, ChevronDown, LayoutDashboard, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { usePropertyStore } from '@/stores'

export default function Header() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Get the last viewed property from the store
  const { currentProperty, recentSearches } = usePropertyStore()
  
  // Get the property analytics URL - use last viewed property if available
  const propertyAnalyticsUrl = useMemo(() => {
    // First check currentProperty
    if (currentProperty?.address) {
      return `/property?address=${encodeURIComponent(currentProperty.address)}`
    }
    // Fall back to most recent search
    if (recentSearches.length > 0) {
      return `/property?address=${encodeURIComponent(recentSearches[0].address)}`
    }
    // Default to base property page
    return '/property'
  }, [currentProperty, recentSearches])

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
  
  // Hide header on home page (scanner), landing pages, and strategy pages since they have their own headers
  // NOTE: This must be AFTER all hooks to follow React Rules of Hooks
  if (pathname === '/' || pathname === '/landing' || pathname === '/landing2' || pathname?.startsWith('/strategies')) {
    return null
  }

  return (
    <header className="bg-navy-50 dark:bg-navy-900 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="container-brand">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/images/investiq-logo-icon.png" 
                alt="InvestIQ" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-bold text-navy-900 dark:text-white">
                Invest<span className="text-brand-500">IQ</span>
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-5">
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/' ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-navy-900 dark:hover:text-white'
                }`}
              >
                <ScanLine className="w-4 h-4" />
                Scan
              </Link>
              <Link 
                href="/search" 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/search' ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-navy-900 dark:hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link 
                href={propertyAnalyticsUrl} 
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname?.startsWith('/property') ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-navy-900 dark:hover:text-white'
                }`}
                title={currentProperty?.address || recentSearches[0]?.address || 'Property Analytics'}
              >
                <BarChart3 className="w-4 h-4" />
                Property Analytics
              </Link>
              <Link 
                href="/photos" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/photos' ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-navy-900 dark:hover:text-white'
                }`}
              >
                Photos
              </Link>
              {isAuthenticated && (
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname === '/dashboard' ? 'text-brand-500 dark:text-brand-400' : 'text-neutral-600 dark:text-neutral-400 hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
            </nav>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Context-aware navigation buttons */}
            {isAuthenticated && pathname === '/dashboard' && (
              <Link
                href="/search"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-all shadow-brand"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </Link>
            )}
            {isAuthenticated && pathname === '/search' && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-all shadow-brand"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            
            {/* Theme Toggle Switch */}
            <button
              onClick={toggleTheme}
              className="relative inline-flex items-center justify-center p-2 rounded-lg bg-neutral-100 dark:bg-navy-800 hover:bg-neutral-200 dark:hover:bg-navy-700 transition-colors duration-200"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <div className="relative w-12 h-6 rounded-full bg-neutral-300 dark:bg-neutral-600 transition-colors duration-300">
                <div 
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-navy-900 shadow-md transition-all duration-300 flex items-center justify-center ${
                    theme === 'dark' ? 'left-[26px]' : 'left-0.5'
                  }`}
                >
                  {theme === 'light' ? (
                    <Sun className="w-3 h-3 text-warning-500" />
                  ) : (
                    <Moon className="w-3 h-3 text-brand-400" />
                  )}
                </div>
              </div>
            </button>
            
            <button 
              className="relative p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
            </button>
            <button 
              className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {/* Auth Buttons / User Menu */}
            {isAuthenticated && user ? (
              /* User Menu */
              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-navy-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {user.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </button>
                
                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
                    <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                      <p className="text-sm font-medium text-navy-900 dark:text-white">{user.full_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      onClick={() => {
                        setShowUserMenu(false)
                      }}
                    >
                      <User className="w-4 h-4" />
                      Your Profile
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-neutral-100 dark:hover:bg-navy-700"
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
                  className="btn-ghost btn-sm"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')}
                  className="btn-primary btn-sm"
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
