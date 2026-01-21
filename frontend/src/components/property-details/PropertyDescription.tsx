'use client'

import { useState } from 'react'

interface PropertyDescriptionProps {
  description: string
}

/**
 * PropertyDescription Component
 * 
 * Displays the property description with expandable text
 * for longer descriptions.
 */
export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = description.length > 400
  const displayText = expanded || !isLong ? description : description.slice(0, 400) + '...'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-3">
        Description
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

/**
 * PropertyDescriptionSkeleton
 * Loading state for the property description
 */
export function PropertyDescriptionSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className={`h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ${
              i === 3 ? 'w-3/4' : 'w-full'
            }`} 
          />
        ))}
      </div>
    </div>
  )
}
