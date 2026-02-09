'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import Link from 'next/link'

interface DesktopHeaderProps {
  onBack?: () => void
  showBackButton?: boolean
}

/**
 * Desktop-specific header for the analytics page.
 * Consolidated header features:
 * - Back button navigation
 * - InvestIQ branding (compact)
 * - Theme toggle (sun icon preferred)
 * - Sign In / Get Started buttons (compact)
 */
export function DesktopHeader({ onBack, showBackButton = true }: DesktopHeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const isDark = theme === 'dark'

  return (
    <header className="desktop-app-header">
      {/* Left: Back Button + Logo */}
      <div className="desktop-header-left">
        {showBackButton ? (
          <button 
            className="desktop-back-btn" 
            onClick={onBack}
            aria-label="Go back"
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : null}

        {/* Logo - Left aligned */}
        <Link href="/" className="desktop-header-logo-link">
          <h1 className="desktop-header-logo">
            Invest<span>IQ</span>
          </h1>
        </Link>
      </div>

      {/* Right Side Actions - Compact */}
      <div className="desktop-header-right">
        {/* Theme Toggle - Sun icon only */}
        <button 
          className="desktop-theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Auth Buttons - Compact */}
        {isAuthenticated && user ? (
          <Link 
            href="/search"
            className="desktop-auth-btn desktop-auth-primary"
          >
            {user.full_name?.split(' ')[0] || 'Search'}
          </Link>
        ) : (
          <>
            <button 
              onClick={() => openAuthModal('login')}
              className="desktop-auth-btn desktop-auth-ghost"
            >
              Sign In
            </button>
            <button 
              onClick={() => openAuthModal('register')}
              className="desktop-auth-btn desktop-auth-primary"
            >
              Get Started
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default DesktopHeader
