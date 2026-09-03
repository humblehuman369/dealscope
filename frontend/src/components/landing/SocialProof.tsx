'use client'

import React from 'react'
import { TESTIMONIALS } from '@/lib/testimonials'

function renderQuote(quote: string) {
  if (quote.includes('DealGapIQ')) {
    const parts = quote.split('DealGapIQ')
    return (
      <>
        {parts[0]}
        <strong>
          DealGap<span style={{ color: 'var(--accent-sky)' }}>IQ</span>
        </strong>
        {parts[1]}
      </>
    )
  }
  return quote
}

/** `compact` tightens the section for placement directly under a hero. */
export function SocialProof({ compact = false }: { compact?: boolean }) {
  return (
    <section
      style={{ padding: compact ? '32px 24px 40px' : '80px 24px' }}
      aria-label="What early users are saying"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '1.5px',
          textTransform: 'uppercase' as const,
          color: 'var(--accent-sky)',
          textAlign: 'center',
          marginBottom: compact ? 20 : 40,
        }}
      >
        What Early Users Are Saying
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          maxWidth: 1060,
          margin: '0 auto',
        }}
      >
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              padding: compact ? '20px 20px' : '28px 24px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 20,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-body)',
                lineHeight: 1.7,
                fontStyle: 'italic',
                margin: 0,
                flex: 1,
              }}
            >
              &ldquo;{renderQuote(t.quote)}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--accent-sky)',
                  flexShrink: 0,
                }}
              >
                {t.initials}
              </div>
              <div>
                <p
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}
                >
                  {t.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
