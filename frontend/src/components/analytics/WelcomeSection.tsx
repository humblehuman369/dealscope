'use client'

import React from 'react'

interface WelcomeSectionProps {
  isCollapsed: boolean
  onToggle: () => void
}

/**
 * WelcomeSection - Expandable/collapsible welcome message
 * 
 * Shows full welcome message when expanded (no strategy selected)
 * Shows condensed tagline when collapsed (strategy selected)
 */
export function WelcomeSection({ isCollapsed, onToggle }: WelcomeSectionProps) {
  return (
    <div 
      className={`
        rounded-2xl border transition-all duration-300 cursor-pointer
        ${isCollapsed 
          ? 'p-3 bg-transparent border-brand-500/10 dark:border-[#4dd0e1]/10' 
          : 'p-6 bg-gradient-to-br from-brand-500/8 to-blue-500/4 dark:from-[#4dd0e1]/8 dark:to-[#0465f2]/4 border-brand-500/20 dark:border-[#4dd0e1]/20'
        }
      `}
      onClick={onToggle}
    >
      {/* Expanded State */}
      {!isCollapsed && (
        <>
          <h3 className="text-lg font-bold text-brand-500 dark:text-[#4dd0e1] mb-4">
            Welcome to InvestIQ
          </h3>
          <p className="text-[15px] text-gray-700 dark:text-white/85 leading-relaxed mb-4">
            IQ analyzed the deal, local market, then generated 6 investment strategies for you that reveal 6 methods to profit.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Explore all 6 models and if you have questions, ask IQ.
          </p>
        </>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <p className="text-center text-sm text-gray-600 dark:text-white/60">
          Most investors see list price.{' '}
          <span className="text-brand-500 dark:text-[#4dd0e1] font-semibold">
            IQ investors see 6 profit paths.
          </span>
        </p>
      )}
    </div>
  )
}
