'use client'

import { useState } from 'react'

interface PropertyDescriptionProps {
  description: string
}

/**
 * PropertyDescription — Compact description block matching the address-bar detail panel.
 * Truncates at 200 chars with a Read more toggle.
 */
export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = description.length > 200
  const displayText = expanded || !isLong ? description : description.slice(0, 200) + '...'

  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--accent-sky)' }}
      >
        Description
      </div>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-body)' }}
      >
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs font-semibold"
          style={{ color: 'var(--accent-sky)' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

export function PropertyDescriptionSkeleton() {
  return (
    <div>
      <div
        className="h-3 w-20 rounded animate-pulse mb-3"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded animate-pulse ${i === 2 ? 'w-3/4' : 'w-full'}`}
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          />
        ))}
      </div>
    </div>
  )
}
