'use client'

/**
 * DealMakerHeader Component
 * 
 * Universal header for all pages in the DealMakerIQ app.
 * Features:
 * - DealMakerIQ branding with "by InvestIQ" subtext
 * - Search icon that opens SearchPropertyModal
 * - Auth-aware buttons (Dashboard when signed in, Sign In/Get Started when not)
 * 
 * Auto-hides on pages that use CompactHeader to avoid duplicate headers.
 */

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

// Pages that have their own header and should not show DealMakerHeader
const PAGES_WITH_OWN_HEADER = [
  '/',               // Landing page (has its own header)
  '/compare',        // Sales Comps (uses CompactHeader)
  '/rental-comps',   // Rental Comps (uses CompactHeader)
  '/verdict',        // Verdict IQ (uses CompactHeader)
  '/deal-maker',     // Deal Maker (uses CompactHeader)
  '/property',       // Property Details (uses CompactHeader)
  '/analyzing',      // Analyzing page (full-screen)
]

interface DealMakerHeaderProps {
  /** Hide the search icon (useful on search page) */
  hideSearch?: boolean
  /** Additional CSS classes for the header container */
  className?: string
}

export function DealMakerHeader({ hideSearch = false, className = '' }: DealMakerHeaderProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth()
  const [showSearchModal, setShowSearchModal] = useState(false)
  const pathname = usePathname()

  // Hide header on pages that have their own header
  const shouldHide = PAGES_WITH_OWN_HEADER.some(path => 
    path === '/' ? pathname === '/' : pathname?.startsWith(path)
  )
  
  if (shouldHide) {
    return null
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 w-full bg-white/95 dark:bg-[#0b1426]/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.08] z-50 transition-colors duration-200 ${className}`}>
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
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

            {/* Auth Buttons */}
            {isAuthenticated && user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-90 transition-all border border-gray-900 dark:border-white"
              >
                Dashboard
              </Link>
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
                  Get Started
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
