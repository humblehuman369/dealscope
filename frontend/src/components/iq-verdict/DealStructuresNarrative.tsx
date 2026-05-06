'use client'

import type { ReactNode } from 'react'

interface DealStructuresNarrativeProps {
  paragraphs: string[]
}

/**
 * 5th-grade-level walkthrough of the Three Paths.
 * Sits above the FourPathsPanel as the primary text — the cards are the scannable reference.
 */
export function DealStructuresNarrative({ paragraphs }: DealStructuresNarrativeProps): ReactNode {
  if (!paragraphs || paragraphs.length === 0) return null
  return (
    <div
      style={{
        marginTop: 12,
        padding: '16px 18px',
        borderRadius: 10,
        background:
          'linear-gradient(0deg, var(--sky-tint-fill, transparent), var(--sky-tint-fill, transparent)), var(--surface-card)',
        border: '1px solid var(--sky-tint-border, var(--border-default))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-heading)',
        }}
      >
        In plain English
      </p>
      {paragraphs.map((paragraph, idx) => (
        <p
          key={idx}
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
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
