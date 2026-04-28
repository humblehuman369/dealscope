'use client'

import type { ReactNode } from 'react'

interface DealStructuresNarrativeProps {
  paragraphs: string[]
}

/**
 * 5th-grade-level walkthrough of the Three Paths.
 * Sits above the ThreePathsPanel as the primary text — the cards are the scannable reference.
 */
export function DealStructuresNarrative({ paragraphs }: DealStructuresNarrativeProps): ReactNode {
  if (!paragraphs || paragraphs.length === 0) return null
  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 10,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 720,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--accent-sky)',
        }}
      >
        In plain English
      </p>
      {paragraphs.map((paragraph, idx) => (
        <p
          key={idx}
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: idx === paragraphs.length - 1 ? 'var(--text-heading)' : 'var(--text-body)',
            fontWeight: idx === paragraphs.length - 1 ? 600 : 400,
          }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}
