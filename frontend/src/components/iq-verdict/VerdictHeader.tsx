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
 * │  [Analyze]  Details  Sale Comps  Rent Comps  Dashboard│  ← White tab bar
 * └─────────────────────────────────────────────────┘
 */

import React from 'react'
import { Search, User } from 'lucide-react'
import { colors, spacing } from './verdict-design-tokens'

// ===================
// TYPES
// ===================

export type VerdictTab = 'analyze' | 'details' | 'price-checker' | 'dashboard'

interface VerdictHeaderProps {
  /** Currently active tab */
  activeTab: VerdictTab
  /** Callback when a tab is clicked */
  onTabChange?: (tab: VerdictTab) => void
  /** Callback when logo is clicked - navigate to homepage */
  onLogoClick?: () => void
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
  { id: 'analyze', label: 'VerdictIQ' },
  { id: 'details', label: 'Details' },
  { id: 'price-checker', label: 'PriceCheckerIQ' },
  { id: 'dashboard', label: 'Dashboard' },
]

// ===================
// COMPONENT
// ===================

export function VerdictHeader({
  activeTab,
  onTabChange,
  onLogoClick,
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
        {/* Logo - Clickable to go home */}
        <button 
          onClick={onLogoClick}
          className="flex flex-col cursor-pointer bg-transparent border-none hover:opacity-80 transition-opacity"
        >
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
            className="text-[12px] font-medium -mt-0.5 text-left"
            style={{ color: colors.text.white }}
          >
            by InvestIQ
          </span>
        </button>

        {/* Right Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSearchClick}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Search properties"
          >
            <Search 
              className="w-5 h-5" 
              style={{ color: colors.text.white }}
            />
          </button>
          <button
            onClick={onProfileClick}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            aria-label="Profile"
          >
            <User 
              className="w-5 h-5" 
              style={{ color: colors.text.white }}
            />
          </button>
        </div>
      </div>

      {/* Tab Bar - White, rectangular tabs touching side by side */}
      {showTabs && (
        <div 
          className="flex items-stretch overflow-x-auto scrollbar-hide"
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
                  flex-1 px-4 py-[7px] text-sm font-medium 
                  transition-all whitespace-nowrap border-r last:border-r-0
                `}
                style={{
                  backgroundColor: isActive ? colors.background.deepNavy : 'transparent',
                  color: isActive ? colors.text.white : colors.text.secondary,
                  borderColor: colors.ui.border,
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
