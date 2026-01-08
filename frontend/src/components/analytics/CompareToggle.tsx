'use client'

import React from 'react'

/**
 * CompareToggle Component
 * 
 * A toggle switch for comparing "At IQ Target" vs "At List Price" views.
 * Shows metrics at different purchase price scenarios.
 * 
 * Features:
 * - Two-option toggle
 * - Animated background indicator
 * - Shows active state clearly
 */

type CompareView = 'target' | 'list'

interface CompareToggleProps {
  /** Currently active view */
  activeView: CompareView
  /** Callback when view changes */
  onChange: (view: CompareView) => void
  /** Custom labels */
  labels?: {
    target: string
    list: string
  }
}

export function CompareToggle({
  activeView,
  onChange,
  labels = { target: 'At IQ Target', list: 'At List Price' }
}: CompareToggleProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="inline-flex bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
        <ToggleButton
          label={labels.target}
          isActive={activeView === 'target'}
          variant="target"
          onClick={() => onChange('target')}
        />
        <ToggleButton
          label={labels.list}
          isActive={activeView === 'list'}
          variant="list"
          onClick={() => onChange('list')}
        />
      </div>
    </div>
  )
}

interface ToggleButtonProps {
  label: string
  isActive: boolean
  variant: 'target' | 'list'
  onClick: () => void
}

function ToggleButton({ label, isActive, variant, onClick }: ToggleButtonProps) {
  const getActiveClasses = () => {
    if (!isActive) return 'text-white/50 hover:text-white/70'
    
    if (variant === 'target') {
      return 'bg-green-500/20 text-green-500'
    }
    return 'bg-white/10 text-white'
  }

  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-[0.7rem] font-semibold rounded-lg transition-all duration-200 ${getActiveClasses()}`}
    >
      {label}
    </button>
  )
}

/**
 * CompareToggleInline Component
 * 
 * A more compact inline version.
 */

interface CompareToggleInlineProps {
  activeView: CompareView
  onChange: (view: CompareView) => void
}

export function CompareToggleInline({ activeView, onChange }: CompareToggleInlineProps) {
  return (
    <div className="flex items-center gap-2 text-[0.65rem]">
      <button
        onClick={() => onChange('target')}
        className={`font-medium transition-colors ${
          activeView === 'target' ? 'text-green-500' : 'text-white/40 hover:text-white/60'
        }`}
      >
        @Target
      </button>
      <span className="text-white/20">|</span>
      <button
        onClick={() => onChange('list')}
        className={`font-medium transition-colors ${
          activeView === 'list' ? 'text-white' : 'text-white/40 hover:text-white/60'
        }`}
      >
        @List
      </button>
    </div>
  )
}

/**
 * PriceComparisonHeader Component
 * 
 * Shows both prices with toggle indicator.
 */

interface PriceComparisonHeaderProps {
  targetPrice: number
  listPrice: number
  activeView: CompareView
  onChange: (view: CompareView) => void
}

export function PriceComparisonHeader({
  targetPrice,
  listPrice,
  activeView,
  onChange
}: PriceComparisonHeaderProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 mb-4">
      <button
        onClick={() => onChange('target')}
        className={`flex-1 text-center transition-all ${
          activeView === 'target' ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <div className="text-[0.55rem] text-green-500 uppercase tracking-wide">IQ Target</div>
        <div className={`text-base font-bold ${activeView === 'target' ? 'text-green-500' : 'text-white/60'}`}>
          {formatCurrency(targetPrice)}
        </div>
      </button>

      {/* Toggle indicator */}
      <div className="px-3">
        <div 
          className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
            activeView === 'target' ? 'bg-green-500/30' : 'bg-white/10'
          }`}
          onClick={() => onChange(activeView === 'target' ? 'list' : 'target')}
        >
          <div 
            className={`w-4 h-4 rounded-full transition-all ${
              activeView === 'target' 
                ? 'bg-green-500 translate-x-0' 
                : 'bg-white translate-x-6'
            }`}
          />
        </div>
      </div>

      <button
        onClick={() => onChange('list')}
        className={`flex-1 text-center transition-all ${
          activeView === 'list' ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <div className="text-[0.55rem] text-white/50 uppercase tracking-wide">List Price</div>
        <div className={`text-base font-bold ${activeView === 'list' ? 'text-white' : 'text-white/60'}`}>
          {formatCurrency(listPrice)}
        </div>
      </button>
    </div>
  )
}

export default CompareToggle
