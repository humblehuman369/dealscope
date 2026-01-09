'use client'

import React from 'react'
import { SubTab, SubTabId } from './types'

/**
 * SubTabNav Component
 * 
 * Horizontal tab navigation for switching between sub-views within a strategy.
 * Each strategy has different sub-tabs based on relevant analytics.
 * 
 * Common sub-tabs:
 * - Metrics: Core KPIs and benchmarks
 * - Funding: Loan details and capital structure
 * - 10-Year: Long-term projections
 * - Growth: Appreciation and equity growth
 * - Score: Deal quality scoring
 * - What-If: Sensitivity analysis
 * - Buyer: End buyer analysis (Wholesale)
 * - Comps: Comparable properties
 */

interface SubTabNavProps {
  /** Available tabs */
  tabs: SubTab[]
  /** Currently active tab ID */
  activeTab: SubTabId
  /** Callback when tab changes */
  onChange: (tabId: SubTabId) => void
}

export function SubTabNav({ tabs, activeTab, onChange }: SubTabNavProps) {
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-0.5">
      {tabs.map((tab) => (
        <SubTabButton
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTab}
          onClick={() => onChange(tab.id)}
        />
      ))}
    </div>
  )
}

interface SubTabButtonProps {
  tab: SubTab
  isActive: boolean
  onClick: () => void
}

function SubTabButton({ tab, isActive, onClick }: SubTabButtonProps) {
  const baseClasses = "px-3 py-2 text-[0.7rem] font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
  
  const activeClasses = isActive
    ? "bg-brand-500 dark:bg-teal text-white shadow-[0_2px_8px_rgba(0,175,168,0.35)]"
    : "bg-neutral-100 dark:bg-white/[0.03] text-neutral-600 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-white/[0.06] hover:text-neutral-800 dark:hover:text-white/80 transition-colors"

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
    >
      {tab.label}
    </button>
  )
}

/**
 * Strategy-specific tab configurations
 */

export const LTR_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'funding', label: 'Funding' },
  { id: '10year', label: '10-Year' },
  { id: 'growth', label: 'Growth' },
  { id: 'score', label: 'Score' },
  { id: 'whatif', label: 'What-If' }
]

export const STR_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'funding', label: 'Funding' },
  { id: '10year', label: '10-Year' },
  { id: 'growth', label: 'Growth' },
  { id: 'score', label: 'Score' },
  { id: 'whatif', label: 'What-If' }
]

export const BRRRR_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'funding', label: 'Funding' },
  { id: '10year', label: '10-Year' },
  { id: 'growth', label: 'Growth' },
  { id: 'score', label: 'Score' },
  { id: 'whatif', label: 'What-If' }
]

export const FLIP_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'funding', label: 'Funding' },
  { id: 'comps', label: 'Comps' },
  { id: 'score', label: 'Score' },
  { id: 'whatif', label: 'What-If' }
]

export const HOUSE_HACK_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'funding', label: 'Funding' },
  { id: '10year', label: '10-Year' },
  { id: 'growth', label: 'Growth' },
  { id: 'score', label: 'Score' },
  { id: 'whatif', label: 'What-If' }
]

export const WHOLESALE_TABS: SubTab[] = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'buyer', label: 'Buyer' },
  { id: 'comps', label: 'Comps' },
  { id: 'score', label: 'Score' }
]

/**
 * Get tabs for a specific strategy
 */
export function getStrategyTabs(strategyId: string): SubTab[] {
  switch (strategyId) {
    case 'ltr': return LTR_TABS
    case 'str': return STR_TABS
    case 'brrrr': return BRRRR_TABS
    case 'flip': return FLIP_TABS
    case 'house_hack': return HOUSE_HACK_TABS
    case 'wholesale': return WHOLESALE_TABS
    default: return LTR_TABS
  }
}

/**
 * SubTabNavCompact Component
 * 
 * A more compact version with smaller buttons.
 */

interface SubTabNavCompactProps {
  tabs: SubTab[]
  activeTab: SubTabId
  onChange: (tabId: SubTabId) => void
}

export function SubTabNavCompact({ tabs, activeTab, onChange }: SubTabNavCompactProps) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-2 py-1 text-[0.6rem] font-medium rounded-md transition-all whitespace-nowrap ${
            tab.id === activeTab
              ? 'bg-brand-500 dark:bg-teal text-white'
              : 'text-neutral-500 dark:text-white/50 hover:text-neutral-700 dark:hover:text-white/70'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default SubTabNav
