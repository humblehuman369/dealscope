'use client'

import React from 'react'

interface DesktopBottomNavProps {
  onSave?: () => void
  onShare?: () => void
  onGenerateLOI?: () => void
  isSaved?: boolean
  isLoading?: boolean
}

/**
 * Desktop-specific bottom navigation bar for property analytics.
 * Features:
 * - Save property action
 * - Generate LOI primary CTA
 * - Share action
 */
export function DesktopBottomNav({
  onSave,
  onShare,
  onGenerateLOI,
  isSaved = false,
  isLoading = false,
}: DesktopBottomNavProps) {
  return (
    <nav className="desktop-bottom-nav">
      {/* Save Button */}
      <button 
        className={`desktop-nav-item ${isSaved ? 'active' : ''}`}
        onClick={onSave}
        disabled={isLoading}
        aria-label={isSaved ? 'Property saved' : 'Save property'}
      >
        <span className="icon">{isSaved ? '📍' : '📌'}</span>
        <span>{isSaved ? 'Saved' : 'Save'}</span>
      </button>

      {/* Primary CTA - Generate LOI */}
      <button 
        className="desktop-nav-btn-primary"
        onClick={onGenerateLOI}
        disabled={isLoading}
      >
        <span>📝</span>
        <span>Generate LOI</span>
      </button>

      {/* Share Button */}
      <button 
        className="desktop-nav-item"
        onClick={onShare}
        disabled={isLoading}
        aria-label="Share property"
      >
        <span className="icon">📤</span>
        <span>Share</span>
      </button>
    </nav>
  )
}

export default DesktopBottomNav
