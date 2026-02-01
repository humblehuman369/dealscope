'use client'

/**
 * DealMakerHeader Component
 * 
 * Universal header for all pages in the DealMakerIQ app.
 * Features:
 * - DealMakerIQ branding with "by InvestIQ" subtext
 * - Search icon that opens SearchPropertyModal
 * - Sign In / Register buttons (unauthenticated)
 * - Dashboard button + User dropdown with Logout (authenticated)
 * 
 * Auto-hides on pages that use CompactHeader to avoid duplicate headers.
 */

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

// Pages that use CompactHeader and should not show DealMakerHeader
const PAGES_WITH_COMPACT_HEADER = [
  '/compare',        // Sales Comps
  '/rental-comps',   // Rental Comps
  '/verdict',        // Verdict IQ
  '/deal-maker',     // Deal Maker
  '/property',       // Property Details
]

interface DealMakerHeaderProps {
  /** Hide the search icon (useful on search page) */
  hideSearch?: boolean
  /** Additional CSS classes for the header container */
  className?: string
}

export function DealMakerHeader({ hideSearch = false, className = '' }: DealMakerHeaderProps) {
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Hide header on pages that have CompactHeader
  const shouldHide = PAGES_WITH_COMPACT_HEADER.some(path => pathname?.startsWith(path))
  
  if (shouldHide) {
    return null
  }

  // Get user initial for avatar
  const userInitial = user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
  const displayName = user?.full_name || user?.email || 'User'

  const handleLogout = () => {
    setShowUserDropdown(false)
    logout()
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 w-full bg-white/95 dark:bg-[#0b1426]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.08] z-50 transition-colors duration-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo / Branding */}
          <Link href="/" className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              DealMaker<span className="text-cyan-500">IQ</span>
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">
              by InvestIQ
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            {!hideSearch && (
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all"
                aria-label="Search properties"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Auth Section */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {/* Dashboard Button */}
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-full transition-all"
                >
                  Dashboard
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-1.5 py-1 px-2 pl-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
                      {userInitial}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-[100]">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                        {user?.email && user?.full_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        )}
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAuthModal('login')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuthModal('register')}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full hover:opacity-90 transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from being hidden under fixed header */}
      <div className="h-14" aria-hidden="true" />

      {/* Search Property Modal */}
      <SearchPropertyModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  )
}

export default DealMakerHeader
