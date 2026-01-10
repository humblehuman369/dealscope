'use client'

import React from 'react'
import { useTheme } from '@/context/ThemeContext'

interface DesktopHeaderProps {
  onBack?: () => void
  showBackButton?: boolean
}

/**
 * Desktop-specific header for the analytics page.
 * Features:
 * - Back button navigation
 * - InvestIQ branding
 * - Theme toggle (dark/light mode)
 */
export function DesktopHeader({ onBack, showBackButton = true }: DesktopHeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="desktop-app-header">
      {/* Back Button */}
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
      ) : (
        <div style={{ width: 44 }} />
      )}

      {/* Center Logo */}
      <div className="desktop-header-center">
        <h1 className="desktop-header-logo">
          Invest<span>IQ</span>
        </h1>
      </div>

      {/* Right Side Actions */}
      <div className="desktop-header-right">
        <button 
          className="desktop-theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            // Sun icon for dark mode (click to go light)
            <span className="icon-sun">☀️</span>
          ) : (
            // Moon icon for light mode (click to go dark)
            <span className="icon-moon">🌙</span>
          )}
        </button>
      </div>
    </header>
  )
}

export default DesktopHeader
