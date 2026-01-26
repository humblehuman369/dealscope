/**
 * WorksheetTab - Accordion tab component for Deal Maker worksheet
 * Features: Expand/collapse, status indicators, derived output box, continue button
 */

'use client'

import React from 'react'
import { ChevronUp, ChevronDown, Check } from 'lucide-react'
import { WorksheetTabProps, TabStatus } from './types'

// =============================================================================
// STATUS INDICATOR
// =============================================================================

interface StatusIndicatorProps {
  status: TabStatus
  order: number
}

function StatusIndicator({ status, order }: StatusIndicatorProps) {
  if (status === 'completed') {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500">
        <Check className="w-3.5 h-3.5 text-white" />
      </div>
    )
  }

  return (
    <div 
      className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
        status === 'active' 
          ? 'border-teal bg-teal/10' 
          : 'border-slate-300 bg-slate-50'
      }`}
    >
      <span 
        className={`text-xs font-bold ${
          status === 'active' ? 'text-teal' : 'text-slate-500'
        }`}
      >
        {order}
      </span>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WorksheetTab({
  config,
  isExpanded,
  onToggle,
  onContinue,
  children,
  derivedOutput,
  isLastTab = false,
}: WorksheetTabProps) {
  const { title, icon, status, order } = config

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl mx-4 mb-2 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Tab Header */}
      <button
        className={`w-full flex justify-between items-center py-3.5 px-4 transition-colors ${
          isExpanded ? 'border-b border-slate-100 dark:border-slate-700' : ''
        } ${status === 'completed' ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          <StatusIndicator status={status} order={order} />
          
          {/* Icon and Title */}
          <span className="text-lg">{icon}</span>
          <span 
            className={`text-base font-semibold ${
              status === 'pending' 
                ? 'text-slate-400 dark:text-slate-500' 
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center">
          {isExpanded ? (
            <ChevronUp className={`w-5 h-5 ${status === 'pending' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${status === 'pending' ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`} />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-5">
          {/* Slider inputs */}
          <div className="mb-4">
            {children}
          </div>

          {/* Derived Output Box */}
          {derivedOutput && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
                {derivedOutput.label}
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {derivedOutput.value}
              </span>
            </div>
          )}

          {/* Continue Button */}
          <button
            className="w-full bg-teal hover:bg-teal/90 text-white rounded-xl py-3.5 font-bold text-base transition-all shadow-md hover:shadow-lg"
            onClick={onContinue}
          >
            {isLastTab ? 'Finish & Save Deal' : 'Continue to Next →'}
          </button>
        </div>
      )}
    </div>
  )
}

export default WorksheetTab
