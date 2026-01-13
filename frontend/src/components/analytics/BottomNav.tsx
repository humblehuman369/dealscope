'use client'

import React from 'react'
import { Home, BarChart3, Bookmark, Settings, Search } from 'lucide-react'

/**
 * BottomNav Component
 * 
 * Fixed bottom navigation for mobile analytics view.
 * Provides quick access to main app sections.
 */

interface BottomNavProps {
  activeTab?: 'home' | 'analytics' | 'saved' | 'search' | 'settings'
  onNavigate?: (tab: string) => void
}

export function BottomNav({ activeTab = 'analytics', onNavigate }: BottomNavProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1426]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/[0.06] z-50 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeTab
          
          return (
            <button
              key={id}
              onClick={() => onNavigate?.(id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-teal' 
                  : 'text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60'
              }`}
            >
              <Icon 
                className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`}
              />
              <span className={`text-[0.6rem] font-medium ${isActive ? 'text-teal' : ''}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-teal rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * BottomNavSpacer Component
 * 
 * Adds appropriate spacing at the bottom of content to prevent
 * content from being hidden behind the fixed navigation.
 */
export function BottomNavSpacer() {
  return <div className="h-20 safe-area-pb" />
}

/**
 * AnalyticsBottomBar Component
 * 
 * A contextual bottom bar specifically for the analytics view.
 * Shows quick actions like Save, Share, and Generate LOI.
 */

interface AnalyticsBottomBarProps {
  onSave?: () => void
  onShare?: () => void
  onGenerateLOI?: () => void
  isSaved?: boolean
}

export function AnalyticsBottomBar({ 
  onSave, 
  onShare, 
  onGenerateLOI,
  isSaved = false 
}: AnalyticsBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0b1426]/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/[0.06] z-50 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center gap-2 p-3">
        {/* Save Button */}
        <button
          onClick={onSave}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            isSaved 
              ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
              : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-white/70 dark:border-white/10 dark:hover:bg-white/[0.1]'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-green-500' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>

        {/* Generate LOI Button - Primary CTA */}
        <button
          onClick={onGenerateLOI}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal to-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-teal/20 hover:shadow-teal/30 transition-shadow"
        >
          📝 Generate LOI
        </button>

        {/* Share Button */}
        <button
          onClick={onShare}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.05] text-white/70 border border-white/10 rounded-xl font-medium text-sm hover:bg-white/[0.1] transition-colors"
        >
          Share
        </button>
      </div>
    </div>
  )
}

export default BottomNav
