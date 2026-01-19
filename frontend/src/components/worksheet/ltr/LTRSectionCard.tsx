'use client'

import React, { useState, ReactNode } from 'react'

export interface SectionCardProps {
  title: string
  icon?: ReactNode
  accentColor?: string
  children: ReactNode
  defaultExpanded?: boolean
  isComplete?: boolean
}

export function LTRSectionCard({ 
  title, 
  icon,
  children, 
  accentColor,
  defaultExpanded = true,
  isComplete = false
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  // Chevron icon
  const ChevronIcon = () => (
    <svg 
      className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
  
  // Check icon for complete state
  const CheckIcon = () => (
    <div className="w-4 h-4 rounded-full bg-teal-600 dark:bg-teal-400 flex items-center justify-center">
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  )
  
  return (
    <div className={`bg-white dark:bg-surface-800 rounded-xl shadow-card overflow-hidden transition-shadow hover:shadow-card-hover ${
      expanded ? 'ring-2 ring-teal-600/20 dark:ring-teal-400/20' : 'border border-surface-100 dark:border-surface-700'
    }`}>
      {/* Header */}
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/30"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-teal-600 dark:text-teal-400">{icon}</span>}
          <span className="text-sm font-semibold text-navy dark:text-white">{title}</span>
          {isComplete && <CheckIcon />}
        </div>
        <ChevronIcon />
      </button>
      
      {/* Content with smooth transition */}
      <div className={`transition-all duration-300 ease-out ${
        expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <div className="px-4 pb-4 pt-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
