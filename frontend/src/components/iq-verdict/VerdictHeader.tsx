'use client'

/**
 * VerdictHeader Component
 * 
 * Fresh header design with:
 * - Dark navy brand bar with DealMakerIQ logo and icons
 * - White tab bar with pill-style active tab
 * 
 * Based on the design system tokens and reference layout:
 * ┌─────────────────────────────────────────────────┐
 * │  DealMakerIQ          [🔍] [👤]                 │  ← Dark navy bar
 * │  by InvestIQ                                    │
 * ├─────────────────────────────────────────────────┤
 * │  [Analyze]  Details  Sale Comps  Rent  Dashboard│  ← White tab bar
 * └─────────────────────────────────────────────────┘
 */

import React from 'react'
import { Search, User } from 'lucide-react'
import { colors, spacing } from './verdict-design-tokens'

// ===================
// TYPES
// ===================

export type VerdictTab = 'analyze' | 'details' | 'sale-comps' | 'rent' | 'dashboard'

interface VerdictHeaderProps {
  /** Currently active tab */
  activeTab: VerdictTab
  /** Callback when a tab is clicked */
  onTabChange?: (tab: VerdictTab) => void
  /** Callback when search icon is clicked */
  onSearchClick?: () => void
  /** Callback when profile icon is clicked */
  onProfileClick?: () => void
  /** Whether to show the tab bar */
  showTabs?: boolean
}

// ===================
// TAB CONFIGURATION
// ===================

const TABS: { id: VerdictTab; label: string }[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'details', label: 'Details' },
  { id: 'sale-comps', label: 'Sale Comps' },
  { id: 'rent', label: 'Rent' },
  { id: 'dashboard', label: 'Dashboard' },
]

// ===================
// COMPONENT
// ===================

export function VerdictHeader({
  activeTab,
  onTabChange,
  onSearchClick,
  onProfileClick,
  showTabs = true,
}: VerdictHeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      {/* Brand Bar - Dark Navy */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: colors.background.deepNavy }}
      >
        {/* Logo */}
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.text.white }}
            >
              DealMaker
            </span>
            <span 
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.brand.teal }}
            >
              IQ
            </span>
          </div>
          <span 
            className="text-[10px] font-medium -mt-0.5"
            style={{ color: colors.text.tertiary }}
          >
            by InvestIQ
          </span>
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSearchClick}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Search properties"
          >
            <Search 
              className="w-5 h-5" 
              style={{ color: colors.text.muted }}
            />
          </button>
          <button
            onClick={onProfileClick}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Profile"
          >
            <User 
              className="w-5 h-5" 
              style={{ color: colors.text.muted }}
            />
          </button>
        </div>
      </div>

      {/* Tab Bar - White */}
      {showTabs && (
        <div 
          className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-hide"
          style={{ 
            backgroundColor: colors.background.white,
            borderBottom: `1px solid ${colors.ui.border}`,
          }}
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium 
                  transition-all whitespace-nowrap
                  ${isActive 
                    ? 'shadow-sm' 
                    : 'hover:bg-slate-100'
                  }
                `}
                style={{
                  backgroundColor: isActive ? colors.brand.teal : 'transparent',
                  color: isActive ? colors.text.white : colors.text.secondary,
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      )}
    </header>
  )
}

export default VerdictHeader
