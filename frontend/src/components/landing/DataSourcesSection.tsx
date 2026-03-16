'use client'

import React, { useState, useEffect, useRef } from 'react'

const fontBody = "var(--font-dm-sans), 'DM Sans', sans-serif"
const fontData = "var(--font-space-mono), 'Space Mono', monospace"
const teal = 'var(--accent-sky)'
const muted = 'var(--text-body)'
const mutedDim = 'var(--text-label)'

const PROPERTY_VALUES = [
  { source: 'IQ Estimate', value: 858789, isIQ: true },
  { source: 'Zillow', value: 807300 },
  { source: 'RentCast', value: 963000 },
  { source: 'Redfin', value: 793256 },
  { source: 'Realtor.com', value: 805600 },
]

const MONTHLY_RENTS: { source: string; value: number | null; isIQ?: boolean; unavailable?: boolean }[] = [
  { source: 'IQ Estimate', value: 4999, isIQ: true },
  { source: 'Zillow', value: 4974 },
  { source: 'RentCast', value: 5070 },
  { source: 'Redfin', value: 4953 },
  { source: 'Realtor.com', value: null, unavailable: true },
]

function AnimatedNumber({ value, visible, delay = 0 }: { value: number | null; visible: boolean; delay?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!visible || !value) return
    const timer = setTimeout(() => {
      const duration = 900
      const startTime = performance.now()
      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(value * eased))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timer)
  }, [visible, value, delay])

  return <>{value ? `$${display.toLocaleString()}` : 'Unavailable'}</>
}

function DataColumn({ title, data, visible }: {
  title: string
  data: typeof PROPERTY_VALUES | typeof MONTHLY_RENTS
  visible: boolean
}) {
  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{
        fontSize: 11,
        fontFamily: fontData,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.12em',
        color: muted,
        marginBottom: 16,
        paddingLeft: 12,
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
        {data.map((row, i) => {
          const isIQ = 'isIQ' in row && row.isIQ
          const unavailable = 'unavailable' in row && row.unavailable
          return (
            <div
              key={row.source}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                background: isIQ ? 'var(--color-sky-dim)' : 'transparent',
                border: isIQ
                  ? '1px solid var(--border-focus)'
                  : '1px solid transparent',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-12px)',
                transition: `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: isIQ
                    ? `2px solid ${teal}`
                    : '2px solid var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isIQ && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: teal,
                    }} />
                  )}
                </div>
                <span style={{
                  fontFamily: fontBody,
                  fontSize: 14,
                  color: isIQ ? 'var(--text-heading)' : muted,
                  fontWeight: isIQ ? 600 : 400,
                }}>
                  {isIQ ? 'IQ Estimate' : row.source}
                </span>
              </div>
              <span style={{
                fontFamily: fontData,
                fontSize: 14,
                color: isIQ ? teal : unavailable ? mutedDim : muted,
                fontWeight: isIQ ? 600 : 400,
                fontStyle: unavailable ? 'italic' : 'normal',
              }}>
                <AnimatedNumber value={row.value} visible={visible} delay={i * 80} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DataSourcesSection() {
  const [visible, setVisible] = useState(false)
  const [cardHover, setCardHover] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--surface-base)',
        padding: '100px 24px',
        fontFamily: fontBody,
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Section label */}
        <div style={{
          textAlign: 'center' as const,
          marginBottom: 16,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <span style={{
            fontFamily: fontData,
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            color: teal,
          }}>
            Powered by Real Data
          </span>
        </div>

        {/* Heading */}
        <h2 style={{
          textAlign: 'center' as const,
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 700,
          color: 'var(--text-heading)',
          lineHeight: 1.2,
          margin: '0 0 14px 0',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
        }}>
          We Don&apos;t Guess. We Compare.
        </h2>

        {/* Subheading */}
        <p style={{
          textAlign: 'center' as const,
          fontSize: 'clamp(15px, 2vw, 17px)',
          color: muted,
          lineHeight: 1.6,
          maxWidth: 600,
          margin: '0 auto 52px auto',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
        }}>
          Every analysis cross-references multiple data sources to give you
          one reliable IQ&nbsp;Estimate — not a single source of truth,
          but the{' '}
          <em style={{ color: 'var(--text-heading)', fontStyle: 'italic' }}>best</em>{' '}
          source of truth.
        </p>

        {/* Data Card */}
        <div
          onMouseEnter={() => setCardHover(true)}
          onMouseLeave={() => setCardHover(false)}
          style={{
            background: 'var(--surface-base)',
            border: cardHover
              ? '1px solid var(--border-focus)'
              : '1px solid var(--border-default)',
            boxShadow: cardHover
              ? 'var(--shadow-card-hover)'
              : 'var(--shadow-card)',
            borderRadius: 16,
            padding: 'clamp(24px, 4vw, 40px)',
            position: 'relative' as const,
            overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.98)',
            transition:
              'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s, ' +
              'border 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default',
          }}
        >
          {/* Card label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="9" width="3" height="6" rx="0.5" fill={teal} opacity="0.6" />
              <rect x="6" y="5" width="3" height="10" rx="0.5" fill={teal} opacity="0.8" />
              <rect x="11" y="1" width="3" height="14" rx="0.5" fill={teal} />
            </svg>
            <span style={{
              fontFamily: fontData,
              fontSize: 11,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              color: teal,
            }}>Data Sources</span>
          </div>

          {/* Two columns */}
          <div style={{
            display: 'flex',
            gap: 'clamp(24px, 4vw, 48px)',
            flexWrap: 'wrap' as const,
          }}>
            <DataColumn title="Property Value" data={PROPERTY_VALUES} visible={visible} />
            <DataColumn title="Monthly Rent" data={MONTHLY_RENTS} visible={visible} />
          </div>

          {/* Center gradient divider */}
          <div style={{
            marginTop: 28,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, var(--border-default), var(--accent-sky), var(--border-default), transparent)',
          }} />

          {/* Bottom note */}
          <div style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.8s',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ marginTop: 2, flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke={teal} strokeWidth="1.5" opacity="0.5" />
              <path d="M8 5v4M8 11v0.5" stroke={teal} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{
              fontFamily: fontBody,
              fontSize: 13,
              color: mutedDim,
              lineHeight: 1.6,
            }}>
              Our IQ Estimate uses a weighted algorithm across all available
              sources, accounting for data freshness, market coverage, and
              historical accuracy to produce the most reliable valuation.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
