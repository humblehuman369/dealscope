'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { SubTab, SubTabId, Strategy } from './types'

/**
 * SubTabNav Component
 * 
 * REDESIGNED: Numbered tabs with line indicator above.
 * 
 * Features:
 * - Line above with active indicator that moves
 * - Numbered badges (1, 2, 3...) for each tab
 * - Active tab has highlighted number
 * - Clean design without background pills
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
  const activeIndex = tabs.findIndex(t => t.id === activeTab)
  
  return (
    <div className="mb-4">
      {/* Top line with active indicator */}
      <div className="relative h-[2px] bg-gray-200 dark:bg-white/[0.08] mb-3">
        {/* Active indicator */}
        <div 
          className="absolute top-0 h-[2px] bg-gradient-to-r from-teal to-blue-500 transition-all duration-300 ease-out"
          style={{
            left: `${(activeIndex / tabs.length) * 100}%`,
            width: `${100 / tabs.length}%`,
          }}
        />
      </div>

      {/* Tab buttons with numbers */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => (
          <SubTabButton
            key={tab.id}
            tab={tab}
            number={index + 1}
            isActive={tab.id === activeTab}
            onClick={() => onChange(tab.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface SubTabButtonProps {
  tab: SubTab
  number: number
  isActive: boolean
  onClick: () => void
}

function SubTabButton({ tab, number, isActive, onClick }: SubTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
    >
      {/* Numbered badge */}
      <span 
        className={`w-5 h-5 flex items-center justify-center text-[0.65rem] font-bold rounded-full transition-all ${
          isActive 
            ? 'bg-gradient-to-r from-teal to-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/40'
        }`}
      >
        {number}
      </span>
      
      {/* Tab label */}
      <span 
        className={`text-[0.72rem] font-medium transition-colors ${
          isActive 
            ? 'text-teal dark:text-teal font-semibold' 
            : 'text-gray-600 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/70'
        }`}
      >
        {tab.label}
      </span>
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
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-2 py-1 text-[0.6rem] font-medium rounded-md transition-all whitespace-nowrap ${
            tab.id === activeTab
              ? 'text-teal font-semibold'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
          }`}
        >
          <span className={`w-4 h-4 flex items-center justify-center text-[0.55rem] font-bold rounded-full ${
            tab.id === activeTab
              ? 'bg-gradient-to-r from-teal to-blue-500 text-white'
              : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/30'
          }`}>
            {index + 1}
          </span>
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
  const activeIndex = tabs.findIndex(t => t.id === activeTab)
  
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
          {/* Tab number indicator */}
          <span className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full bg-gradient-to-r from-teal to-blue-500 text-white">
            {activeIndex + 1}
          </span>
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
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-[0.8rem] transition-colors ${
                tab.id === activeTab
                  ? 'bg-teal/10 dark:bg-teal/10 text-teal font-semibold'
                  : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              <span className={`w-5 h-5 flex items-center justify-center text-[0.6rem] font-bold rounded-full ${
                tab.id === activeTab
                  ? 'bg-gradient-to-r from-teal to-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/40'
              }`}>
                {index + 1}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubTabNav
