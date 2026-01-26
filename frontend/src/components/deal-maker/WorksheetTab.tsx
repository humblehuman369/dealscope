/**
 * WorksheetTab - Premium accordion tab with refined styling
 * Features: Smooth animations, gradient buttons, polished output box
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
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm">
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br from-teal/20 to-cyan-500/20 border-2 border-teal shadow-sm">
        <span className="text-sm font-bold text-teal">{order}</span>
      </div>
    )
  }

  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600">
      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">{order}</span>
    </div>
  )
}

// =============================================================================
// TAB ICON
// =============================================================================

const TAB_ICONS: Record<string, React.ReactNode> = {
  '🏠': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </svg>
  ),
  '🏛': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/>
    </svg>
  ),
  '🔧': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"/>
    </svg>
  ),
  '💰': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  '📊': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
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
  const lineIcon = TAB_ICONS[icon]

  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-2xl mx-4 mb-3 overflow-hidden transition-all duration-300 ${
        isExpanded 
          ? 'shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 ring-1 ring-teal/20' 
          : 'shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700'
      }`}
    >
      {/* Tab Header */}
      <button
        className={`w-full flex justify-between items-center py-4 px-5 transition-all ${
          isExpanded ? 'bg-slate-50/50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} order={order} />
          
          {/* Icon */}
          <span className={`${status === 'active' ? 'text-teal' : status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}`}>
            {lineIcon || <span className="text-lg">{icon}</span>}
          </span>
          
          {/* Title */}
          <span 
            className={`text-[15px] font-semibold ${
              status === 'pending' 
                ? 'text-slate-400 dark:text-slate-500' 
                : 'text-slate-800 dark:text-white'
            }`}
          >
            {title}
          </span>
        </div>

        <div 
          className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown 
            className={`w-5 h-5 ${
              status === 'active' ? 'text-teal' : 'text-slate-400 dark:text-slate-500'
            }`} 
          />
        </div>
      </button>

      {/* Expanded Content with animation */}
      <div 
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-700">
          {/* Slider inputs */}
          <div className="mb-5">
            {children}
          </div>

          {/* Derived Output Box */}
          {derivedOutput && (
            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-900/50 rounded-xl p-5 mb-5 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal via-cyan-400 to-teal" />
              
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2">
                {derivedOutput.label}
              </span>
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {derivedOutput.value}
              </span>
            </div>
          )}

          {/* Continue Button */}
          <button
            className="w-full relative overflow-hidden rounded-xl py-4 font-bold text-[15px] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #0d9488 50%, #0891b2 100%)',
              backgroundSize: '200% 200%',
              boxShadow: '0 4px 14px -2px rgba(8, 145, 178, 0.4), 0 2px 4px -1px rgba(8, 145, 178, 0.2)',
            }}
            onClick={onContinue}
          >
            {isLastTab ? 'Finish & Save Deal' : 'Continue to Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WorksheetTab
