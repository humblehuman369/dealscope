'use client'

import { 
  Bell, Settings, ScanLine, Search, Sun, Moon, User, LogOut, 
  ChevronDown, LayoutDashboard, BarChart3, Image, History, 
  GitCompare, FileSpreadsheet, Menu, X, CreditCard, Briefcase
} from 'lucide-react'
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
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const toolsMenuRef = useRef<HTMLDivElement>(null)
  
  const { currentProperty, recentSearches } = usePropertyStore()
  
  const propertyAnalyticsUrl = useMemo(() => {
    if (currentProperty?.address) {
      return `/property?address=${encodeURIComponent(currentProperty.address)}`
    }
    if (recentSearches.length > 0) {
      return `/property?address=${encodeURIComponent(recentSearches[0].address)}`
    }
    return '/property'
  }, [currentProperty, recentSearches])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Hide header on certain pages
  if (pathname === '/' || pathname === '/landing' || pathname === '/landing2' || pathname === '/search' || pathname?.startsWith('/strategies')) {
    return null
  }
  
  const isPropertyPage = pathname?.startsWith('/property') || pathname === '/analytics-demo'
  if (isPropertyPage) {
    return null
  }

  const isActive = (path: string) => pathname === path
  const isActivePrefix = (prefix: string) => pathname?.startsWith(prefix)

  const navLinkClass = (active: boolean) => `
    text-sm font-medium transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg
    ${active 
      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' 
      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-navy-800'
    }
  `

  const toolsItems = [
    { href: propertyAnalyticsUrl, icon: BarChart3, label: 'Property Analytics', active: isActivePrefix('/property') },
    { href: '/photos', icon: Image, label: 'Photos', active: isActive('/photos') },
    { href: '/compare', icon: GitCompare, label: 'Compare', active: isActive('/compare') },
    { href: '/search-history', icon: History, label: 'Search History', active: isActive('/search-history') },
  ]

  return (
    <header className="bg-white dark:bg-navy-900 border-b border-neutral-200 dark:border-neutral-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          
          {/* Left: Logo & Primary Nav */}
          <div className="flex items-center gap-1">
            <Link href="/" className="flex items-center mr-6">
              <img 
                src={theme === 'dark' ? "/images/InvestIQ Logo 3D (Dark View).png" : "/images/InvestIQ Logo 3D (Light View).png"}
                alt="InvestIQ" 
                className="h-8 object-contain"
              />
            </Link>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {isAuthenticated && (
                <Link href="/dashboard" className={navLinkClass(isActive('/dashboard'))}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              
              <Link href="/search" className={navLinkClass(isActive('/search'))}>
                <Search className="w-4 h-4" />
                Search
              </Link>
              
              <Link href="/" className={navLinkClass(isActive('/scan'))}>
                <ScanLine className="w-4 h-4" />
                Scan
              </Link>

              {/* Tools Dropdown */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className={`
                    text-sm font-medium transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg
                    ${showToolsMenu 
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' 
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-navy-800'
                    }
                  `}
                >
                  <Briefcase className="w-4 h-4" />
                  Tools
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showToolsMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showToolsMenu && (
                  <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
                    {toolsItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowToolsMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          item.active 
                            ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' 
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle - Minimal */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-navy-800 transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {/* Notifications */}
            {isAuthenticated && (
              <button 
                className="relative p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-navy-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
              </button>
            )}
            
            {/* User Menu / Auth */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-navy-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-neutral-700 dark:text-neutral-300 max-w-[100px] truncate">
                    {user.full_name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-navy-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
                    <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{user.full_name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/billing"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      >
                        <CreditCard className="w-4 h-4" />
                        Billing
                      </Link>
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    </div>
                    
                    <div className="border-t border-neutral-100 dark:border-neutral-700 py-1">
                      <button
                        onClick={() => {
                          logout()
                          setShowUserMenu(false)
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-neutral-100 dark:hover:bg-navy-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button 
                  onClick={() => setShowAuthModal('login')}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-navy-800"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-700 py-3">
            <nav className="flex flex-col gap-1">
              {isAuthenticated && (
                <Link 
                  href="/dashboard" 
                  onClick={() => setShowMobileMenu(false)}
                  className={navLinkClass(isActive('/dashboard'))}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
              <Link 
                href="/search" 
                onClick={() => setShowMobileMenu(false)}
                className={navLinkClass(isActive('/search'))}
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link 
                href="/" 
                onClick={() => setShowMobileMenu(false)}
                className={navLinkClass(false)}
              >
                <ScanLine className="w-4 h-4" />
                Scan
              </Link>
              
              <div className="border-t border-neutral-200 dark:border-neutral-700 my-2" />
              <p className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tools</p>
              
              {toolsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={navLinkClass(item.active)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              
              {!isAuthenticated && (
                <>
                  <div className="border-t border-neutral-200 dark:border-neutral-700 my-2" />
                  <button 
                    onClick={() => {
                      setShowAuthModal('login')
                      setShowMobileMenu(false)
                    }}
                    className="text-sm font-medium text-neutral-600 dark:text-neutral-300 px-3 py-2 text-left"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setShowAuthModal('register')
                      setShowMobileMenu(false)
                    }}
                    className="mx-3 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
                  >
                    Get Started
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
