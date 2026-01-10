'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { SubTab, SubTabId, Strategy } from './types'

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
  
  // Use gradient for active state (matching strategy pills)
  const activeClasses = isActive
    ? "bg-gradient-to-r from-brand-500 dark:from-teal to-blue-500 text-white shadow-[0_2px_10px_rgba(0,175,168,0.4)]"
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
              ? 'bg-gradient-to-r from-brand-500 dark:from-teal to-blue-500 text-white'
              : 'text-neutral-500 dark:text-white/50 hover:text-neutral-700 dark:hover:text-white/70'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/**
 * SubTabDropdown Component
 * 
 * A dropdown version that clearly ties to the selected strategy.
 * Shows strategy name + current view selection.
 */

interface SubTabDropdownProps {
  /** Available tabs */
  tabs: SubTab[]
  /** Currently active tab ID */
  activeTab: SubTabId
  /** Callback when tab changes */
  onChange: (tabId: SubTabId) => void
  /** Currently selected strategy */
  strategy?: Strategy
}

export function SubTabDropdown({ tabs, activeTab, onChange, strategy }: SubTabDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const activeTabData = tabs.find(t => t.id === activeTab)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (tabId: SubTabId) => {
    onChange(tabId)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative mb-4">
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-xl hover:bg-gray-200 dark:hover:bg-white/[0.06] transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Strategy indicator */}
          {strategy && (
            <span className="text-lg">{strategy.icon}</span>
          )}
          <div className="text-left">
            <div className="text-[0.65rem] text-gray-500 dark:text-white/50 uppercase tracking-wide">
              {strategy ? `${strategy.shortName} Details` : 'View Details'}
            </div>
            <div className="text-[0.85rem] font-semibold text-gray-800 dark:text-white">
              {activeTabData?.label || 'Select View'}
            </div>
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 dark:text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-navy-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left text-[0.8rem] transition-colors ${
                tab.id === activeTab
                  ? 'bg-brand-500/10 dark:bg-teal/10 text-brand-600 dark:text-teal font-semibold'
                  : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === activeTab && (
                <span className="text-brand-500 dark:text-teal">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubTabNav
