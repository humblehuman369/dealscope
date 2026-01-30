'use client'

import { 
  Bell, Search, Sun, Moon, User, LogOut, 
  ChevronDown, LayoutDashboard, Image, History, 
  Menu, X, CreditCard, Settings, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { usePropertyStore, useUIStore } from '@/stores'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

// Strategy definitions for the dropdown
const strategies = [
  { id: 'ltr', label: 'Long-term Rental' },
  { id: 'str', label: 'Short-term Rental' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Fix & Flip' },
  { id: 'househack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
]
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

/**
 * Universal Header Component - Tailwind Version
 * 
 * Uses exact same container classes as page content for perfect alignment:
 * - max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8
 */
export default function Header() {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Header.tsx:mount',message:'Header component mounted',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
  }, []);
  // #endregion

  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  const { currentProperty, recentSearches } = usePropertyStore()
  const { activeStrategy, setActiveStrategy } = useUIStore()
  
  // Detect worksheet page context
  const isWorksheetPage = pathname?.startsWith('/worksheet/')
  const worksheetPropertyId = isWorksheetPage ? pathname?.split('/')[2] : null
  
  // Only show Strategy Analysis dropdown on worksheet pages (not on IQ Verdict or other pages)
  const showStrategyAnalysis = isWorksheetPage
  
  // Strategy Analysis dropdown state - declared before useEffect that references them
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false)
  const strategyDropdownRef = useRef<HTMLDivElement>(null)
  
  // Dynamic property analytics URL
  const propertyAnalyticsUrl = useMemo(() => {
    if (currentProperty?.address) {
      return `/property?address=${encodeURIComponent(currentProperty.address)}`
    }
    if (recentSearches.length > 0) {
      return `/property?address=${encodeURIComponent(recentSearches[0].address)}`
    }
    return '/search'
  }, [currentProperty, recentSearches])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(event.target as Node)) {
        setShowStrategyDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false)
  }, [pathname])
  
  // Only hide header on landing pages
  const hiddenPaths = ['/', '/landing', '/landing2']
  const isHidden = hiddenPaths.includes(pathname || '')
  
  if (isHidden) {
    return null
  }

  const isActive = (path: string) => pathname === path
  const isActivePrefix = (prefix: string) => pathname?.startsWith(prefix)

  // Navigation items
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', auth: true },
    { href: '/search', icon: Search, label: 'Search', auth: false },
  ]

  // User menu items
  const userMenuItems = [
    { href: '/profile', icon: User, label: 'Profile' },
    { href: '/billing', icon: CreditCard, label: 'Billing' },
    { href: '/search-history', icon: History, label: 'History' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
    <header className="fixed top-0 left-0 right-0 w-full bg-white/95 dark:bg-[#0b1426]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.08] z-50 transition-colors duration-200">
      {/* Container - centered with max-width */}
      <div className="max-w-[480px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
          <img 
            src={theme === 'dark' ? "/images/InvestIQ Logo 3D (Dark View).png" : "/images/InvestIQ Logo 3D (Light View).png"}
            alt="InvestIQ"
            className="h-7 w-auto object-contain"
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {/* Strategy Analysis Dropdown - Only show on worksheet pages */}
          {showStrategyAnalysis && (
            <div className="relative" ref={strategyDropdownRef}>
              <button
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white rounded-lg transition-all whitespace-nowrap hover:opacity-90"
                style={{ backgroundColor: '#007ea7' }}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Strategy Analysis</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStrategyDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showStrategyDropdown && worksheetPropertyId && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-[220px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-[100]">
                  {/* Investment Strategies - shown on worksheet pages */}
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Investment Strategies</span>
                  </div>
                  <div className="py-1">
                    {strategies.map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => {
                          setShowStrategyDropdown(false)
                          if (strategy.id !== activeStrategy) {
                            setActiveStrategy(strategy.id)
                            router.push(`/worksheet/${worksheetPropertyId}/${strategy.id}`)
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors ${
                          activeStrategy === strategy.id 
                            ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-medium">{strategy.label}</span>
                        {activeStrategy === strategy.id && (
                          <CheckCircle2 className="w-4 h-4 ml-auto text-teal-600 dark:text-teal-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {navItems.map((item) => {
            if (item.auth && !isAuthenticated) return null
            
            // Special case: Search opens modal
            if (item.label === 'Search') {
              return (
                <button 
                  key="search"
                  onClick={() => setShowSearchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-all whitespace-nowrap"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            }
            
            const active = item.href === '/dashboard' 
              ? isActive('/dashboard')
              : item.href.startsWith('/property') || item.href.startsWith('/search?')
                ? isActivePrefix('/property')
                : isActive(item.href)
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap ${
                  active 
                    ? 'text-teal bg-teal/[0.08] dark:text-cyan-400 dark:bg-cyan-400/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-all"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          </button>
          
          {/* Notifications - Authenticated only */}
          {isAuthenticated && (
            <button 
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-all" 
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border-[1.5px] border-white dark:border-[#0b1426]" />
            </button>
          )}
          
          {/* User Menu / Auth Buttons */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 py-1 px-2 pl-1 rounded-[10px] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal to-cyan-400 flex items-center justify-center text-white text-xs font-semibold">
                  {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-[100]">
                  <div className="px-3.5 py-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  
                  <div className="py-1.5">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  
                  <div className="py-1.5 border-t border-slate-100 dark:border-white/[0.06]">
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left"
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
                className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowAuthModal('register')}
                className="px-3.5 py-1.5 text-[13px] font-semibold text-white bg-gradient-to-br from-teal to-teal-600 rounded-lg hover:translate-y-[-1px] hover:shadow-[0_4px_12px_rgba(8,145,178,0.3)] transition-all"
              >
                Get Started
              </button>
            </div>
          )}
          
          {/* Mobile Menu Toggle */}
          <button 
            className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-all"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0b1426]">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {/* Strategy Analysis - prominent mobile button - Only show on worksheet pages */}
            {showStrategyAnalysis && (
              <Link 
                href="/analyzing"
                className="flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium rounded-[10px] transition-all text-white mb-2"
                style={{ backgroundColor: '#007ea7' }}
              >
                <BarChart3 className="w-5 h-5" />
                Strategy Analysis
              </Link>
            )}
            
            {navItems.map((item) => {
              if (item.auth && !isAuthenticated) return null
              
              // Special case: Search opens modal
              if (item.label === 'Search') {
                return (
                  <button 
                    key="mobile-search"
                    onClick={() => {
                      setShowMobileMenu(false)
                      setShowSearchModal(true)
                    }}
                    className="flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium rounded-[10px] transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-teal dark:hover:text-cyan-400 text-left"
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              }
              
              const active = item.href === '/dashboard' 
                ? isActive('/dashboard')
                : item.href.startsWith('/property') 
                  ? isActivePrefix('/property')
                  : isActive(item.href)
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium rounded-[10px] transition-all ${
                    active 
                      ? 'bg-slate-100 dark:bg-white/[0.04] text-teal dark:text-cyan-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-teal dark:hover:text-cyan-400'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Additional mobile links */}
            <Link 
              href="/photos" 
              className={`flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium rounded-[10px] transition-all ${
                isActive('/photos') 
                  ? 'bg-slate-100 dark:bg-white/[0.04] text-teal dark:text-cyan-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-teal dark:hover:text-cyan-400'
              }`}
            >
              <Image className="w-5 h-5" />
              Photos
            </Link>
            <Link 
              href="/search-history" 
              className={`flex items-center gap-3 px-3.5 py-3 text-[15px] font-medium rounded-[10px] transition-all ${
                isActive('/search-history') 
                  ? 'bg-slate-100 dark:bg-white/[0.04] text-teal dark:text-cyan-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-teal dark:hover:text-cyan-400'
              }`}
            >
              <History className="w-5 h-5" />
              History
            </Link>
            
            {!isAuthenticated && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.06] flex flex-col gap-2">
                <button 
                  onClick={() => setShowAuthModal('login')}
                  className="w-full py-3 text-[15px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-[10px] transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')}
                  className="w-full py-3 text-[15px] font-semibold text-white bg-gradient-to-br from-teal to-teal-600 rounded-[10px] text-center"
                >
                  Get Started
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
      
      {/* Search Property Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </header>
    
    {/* Spacer div - takes up same height as fixed header to prevent content overlap */}
    <div className="h-12" aria-hidden="true" />
    </>
  )
}
