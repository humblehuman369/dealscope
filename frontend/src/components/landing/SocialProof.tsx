'use client';

import React from 'react';

interface Testimonial {
  quote: string;
  initials: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote: 'I used to spend 45 minutes per property on a spreadsheet. DealGapIQ gives me a better answer in under a minute. The Deal Gap concept alone changed how I evaluate deals.',
    initials: 'MR',
    name: 'Michael R.',
    role: 'Portfolio investor \u00b7 12 properties',
  },
  {
    quote: "The Income Value calculation is something I\u2019ve never seen anywhere else. Knowing exactly where breakeven sits \u2014 before I even tour a property \u2014 saves me from chasing bad deals.",
    initials: 'TL',
    name: 'Tamara L.',
    role: 'BRRRR investor \u00b7 Denver, CO',
  },
  {
    quote: "I was skeptical of another calculator tool. But seeing the actual assumptions behind the numbers \u2014 and being able to change them \u2014 that\u2019s what convinced me to pay for Pro.",
    initials: 'JK',
    name: 'James K.',
    role: 'CPA & buy-and-hold investor',
  },
];

function renderQuote(quote: string) {
  if (quote.includes('DealGapIQ')) {
    const parts = quote.split('DealGapIQ');
    return (
      <>
        {parts[0]}
        <strong>DealGap<span style={{ color: 'var(--accent-sky)' }}>IQ</span></strong>
        {parts[1]}
      </>
    );
  }
  return quote;
}

export function SocialProof() {
  return (
    <section style={{ padding: '80px 24px' }}>
      <p style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '1.5px',
        textTransform: 'uppercase' as const,
        color: 'var(--accent-sky)',
        textAlign: 'center',
        marginBottom: 40,
      }}>
        What Early Users Are Saying
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        maxWidth: 1060,
        margin: '0 auto',
      }}>
        {testimonials.map((t, i) => (
          <div
            key={i}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 14,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 20,
            }}
          >
            <p style={{
              fontSize: 14,
              color: 'var(--text-body)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              margin: 0,
              flex: 1,
            }}>
              &ldquo;{renderQuote(t.quote)}&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
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
              }}>
                {t.initials}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>{t.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
