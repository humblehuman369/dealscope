'use client'

import { 
  Bell, Search, Sun, Moon, User, LogOut, 
  ChevronDown, LayoutDashboard, BarChart3, Image, History, 
  GitCompare, Menu, X, CreditCard, Settings, Home
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { usePropertyStore } from '@/stores'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

/**
 * Universal Header Component
 * 
 * Compact, refined header that displays across the entire site
 * except for the landing page.
 * 
 * Features:
 * - 48px compact height
 * - Clean logo with hover effect
 * - Streamlined navigation with icon + text
 * - Refined dropdown menus
 * - Responsive mobile menu
 * - Theme toggle
 * - User avatar with dropdown
 */
export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  const { currentProperty, recentSearches } = usePropertyStore()
  
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
  if (hiddenPaths.includes(pathname || '')) {
    return null
  }

  const isActive = (path: string) => pathname === path
  const isActivePrefix = (prefix: string) => pathname?.startsWith(prefix)

  // Navigation items
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', auth: true },
    { href: '/search', icon: Search, label: 'Search', auth: false },
    { href: propertyAnalyticsUrl, icon: BarChart3, label: 'Analyze', auth: false },
    { href: '/compare', icon: GitCompare, label: 'Compare', auth: false },
  ]

  // User menu items
  const userMenuItems = [
    { href: '/profile', icon: User, label: 'Profile' },
    { href: '/billing', icon: CreditCard, label: 'Billing' },
    { href: '/search-history', icon: History, label: 'History' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <header className="header-universal">
      <div className="header-container">
        {/* Logo */}
        <Link href="/" className="header-logo">
          <img 
            src={theme === 'dark' ? "/images/InvestIQ Logo 3D (Dark View).png" : "/images/InvestIQ Logo 3D (Light View).png"}
            alt="InvestIQ" 
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="header-nav">
          {navItems.map((item) => {
            // Skip auth-required items for non-authenticated users
            if (item.auth && !isAuthenticated) return null
            
            // Special case: Search opens modal
            if (item.label === 'Search') {
              return (
                <button 
                  key="search"
                  onClick={() => setShowSearchModal(true)}
                  className="header-nav-link"
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
                className={`header-nav-link ${active ? 'active' : ''}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="header-icon-btn"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
          </button>
          
          {/* Notifications - Authenticated only */}
          {isAuthenticated && (
            <button className="header-icon-btn header-notif" aria-label="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              <span className="header-notif-dot" />
            </button>
          )}
          
          {/* User Menu / Auth Buttons */}
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="header-user-btn"
              >
                <div className="header-avatar">
                  {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {/* User Dropdown */}
              {showUserMenu && (
                <div className="header-dropdown">
                  <div className="header-dropdown-header">
                    <p className="font-medium text-neutral-900 dark:text-white truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
                  </div>
                  
                  <div className="header-dropdown-section">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowUserMenu(false)}
                        className="header-dropdown-item"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  
                  <div className="header-dropdown-section border-t border-neutral-100 dark:border-neutral-700">
                    <button
                      onClick={() => {
                        logout()
                        setShowUserMenu(false)
                      }}
                      className="header-dropdown-item text-danger-600 dark:text-danger-400"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="header-auth-btns">
              <button 
                onClick={() => setShowAuthModal('login')}
                className="header-signin-btn"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowAuthModal('register')}
                className="header-cta-btn"
              >
                Get Started
              </button>
            </div>
          )}
          
          {/* Mobile Menu Toggle */}
          <button 
            className="header-mobile-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="header-mobile-menu">
          <nav className="header-mobile-nav">
            {navItems.map((item) => {
              if (item.auth && !isAuthenticated) return null
              
              const active = item.href === '/dashboard' 
                ? isActive('/dashboard')
                : item.href.startsWith('/property') 
                  ? isActivePrefix('/property')
                  : isActive(item.href)
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`header-mobile-link ${active ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Additional mobile links */}
            <Link href="/photos" className={`header-mobile-link ${isActive('/photos') ? 'active' : ''}`}>
              <Image className="w-5 h-5" />
              Photos
            </Link>
            <Link href="/search-history" className={`header-mobile-link ${isActive('/search-history') ? 'active' : ''}`}>
              <History className="w-5 h-5" />
              History
            </Link>
            
            {!isAuthenticated && (
              <div className="header-mobile-auth">
                <button 
                  onClick={() => setShowAuthModal('login')}
                  className="header-mobile-signin"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthModal('register')}
                  className="header-mobile-cta"
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
  )
}
