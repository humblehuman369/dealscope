'use client'

import type { ReactNode } from 'react'

interface DealStructuresNarrativeProps {
  paragraphs: string[]
}

// Map each scannable tag (e.g. "RENT", "TERMS") to the same family accent color
// used by the matching FourPaths card so the narrative and cards read as one unit.
const TAG_COLOR: Record<string, string> = {
  RENT: '#a78bfa',
  TERMS: 'var(--accent-sky)',
  PRICE: '#84cc16',
  BLEND: '#8b5cf6',
  LOAN: 'var(--accent-sky)',
  RATE: 'var(--accent-sky)',
  CASH: '#22c55e',
  'LIVE-IN': '#f97316',
  COMBO: '#8b5cf6',
}

const TAG_PATTERN = /^([A-Z][A-Z-]{1,15}) → /

/**
 * 5th-grade-level walkthrough of the Three Paths.
 * Sits above the FourPathsPanel as the primary text — the cards are the scannable reference.
 *
 * Path paragraphs that begin with a "TAG → " prefix render the tag as a colored
 * eyebrow so readers can scan the section the same way they scan the cards.
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
        <span style={{ color: 'var(--accent-sky)' }}>Here&apos;s</span> the deal in plain English
      </p>
      {paragraphs.map((paragraph, idx) => {
        const isCloser = idx === paragraphs.length - 1
        const match = TAG_PATTERN.exec(paragraph)
        const tag = match?.[1]
        const body = match ? paragraph.slice(match[0].length) : paragraph
        const tagColor = (tag && TAG_COLOR[tag]) || 'var(--accent-sky)'

        return (
          <p
            key={idx}
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.55,
              color: isCloser ? 'var(--text-heading)' : 'var(--text-body)',
              fontWeight: isCloser ? 600 : 400,
            }}
          >
            {tag && (
              <span
                style={{
                  display: 'inline-block',
                  marginRight: 8,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: tagColor,
                }}
              >
                {tag} <span aria-hidden="true">→</span>
              </span>
            )}
            {body}
          </p>
        )
      })}
    </div>
  )
}
