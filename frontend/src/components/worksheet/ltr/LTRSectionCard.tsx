'use client'

import React, { useState, ReactNode } from 'react'

export interface SectionCardProps {
  title: string
  accentColor?: string
  children: ReactNode
  defaultExpanded?: boolean
}

export function LTRSectionCard({ 
  title, 
  children, 
  accentColor = '#4dd0e1',
  defaultExpanded = true 
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-1 h-6 rounded-full" 
            style={{ backgroundColor: accentColor }} 
          />
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <span className={`text-slate-400 dark:text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          &#x25BE;
        </span>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
