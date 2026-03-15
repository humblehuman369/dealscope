'use client'

import { useState } from 'react'

interface PropertyDescriptionProps {
  description: string
}

/**
 * PropertyDescription Component
 * 
 * Expandable property description with generous line-height for readability.
 * Body text uses the second-tier slate (#CBD5E1) at weight 400.
 */
export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = description.length > 400
  const displayText = expanded || !isLong ? description : description.slice(0, 400) + '...'

  return (
    <div
      className="rounded-[14px] p-6"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: `1px solid var(--border-subtle)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
        style={{ color: 'var(--accent-sky)' }}
      >
        Description
      </div>
      <p
        className="text-base leading-[1.65] whitespace-pre-line"
        style={{ color: 'var(--text-body)', fontWeight: 400 }}
      >
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-base font-semibold transition-colors hover:brightness-125"
          style={{ color: 'var(--accent-sky)' }}
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
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-card)', border: `1px solid var(--border-subtle)` }}
    >
      <div className="h-3 w-20 rounded animate-pulse mb-3" style={{ backgroundColor: 'var(--surface-elevated)' }} />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className={`h-4 rounded animate-pulse ${i === 3 ? 'w-3/4' : 'w-full'}`}
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          />
        ))}
      </div>
    </div>
  )
}
