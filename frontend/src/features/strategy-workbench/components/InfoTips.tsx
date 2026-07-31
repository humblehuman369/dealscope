'use client'

/**
 * Info tooltips for the Deal Gap price cards.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { useEffect, useRef, useState } from 'react'

/**
 * MarketPriceInfoTip — explains how Market Price is derived for off-market homes.
 * Renders a tiny circled-"i" trigger in the corner of the Market Price card.
 * Hover reveals it on desktop; tap toggles it on mobile (with outside-click dismiss).
 */
export function MarketPriceInfoTip() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div ref={ref} className="absolute top-1 right-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="What is Market Price?"
        aria-expanded={open}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${open ? 'var(--accent-sky)' : 'var(--text-secondary)'}`,
          background: 'transparent',
          color: open ? 'var(--accent-sky)' : 'var(--text-secondary)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: -4,
            width: 260,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-body)',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            letterSpacing: 'normal',
            textTransform: 'none',
            textAlign: 'left',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
            zIndex: 60,
          }}
        >
          {/* Caret pointing up to the icon */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: 6,
              width: 10,
              height: 10,
              background: 'var(--surface-elevated)',
              borderTop: '1px solid var(--border-default)',
              borderLeft: '1px solid var(--border-default)',
              transform: 'rotate(45deg)',
            }}
          />
          <strong style={{ color: 'var(--accent-sky)' }}>Market Price</strong> is an{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>automated estimate</strong> (not a list
          price) for <strong style={{ color: 'var(--accent-sky)' }}>Off-market</strong> homes, which
          aren&apos;t currently for sale. Deal Gap and Price Gap use this value—if you{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>adjust</strong> the price, the gaps will
          update too.
        </div>
      )}
    </div>
  )
}

/** Info tooltip on the Income Value price card — explains $0 cash-flow breakeven. */
export function IncomeValueInfoTip() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div ref={ref} className="absolute top-1 right-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="What is Income Value?"
        aria-expanded={open}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${open ? 'var(--status-warning)' : 'var(--text-secondary)'}`,
          background: 'transparent',
          color: open ? 'var(--status-warning)' : 'var(--text-secondary)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: -4,
            width: 280,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-body)',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            letterSpacing: 'normal',
            textTransform: 'none',
            textAlign: 'left',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
            zIndex: 60,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: 6,
              width: 10,
              height: 10,
              background: 'var(--surface-elevated)',
              borderTop: '1px solid var(--border-default)',
              borderLeft: '1px solid var(--border-default)',
              transform: 'rotate(45deg)',
            }}
          />
          <strong style={{ color: 'var(--status-warning)' }}>Income Value</strong> is the max
          price where rent fully covers your loan payment and operating costs—annual cash flow
          ≈ $0.{' '}
          <strong style={{ color: 'var(--status-warning)' }}>Target Buy</strong> is ~5% below
          that for a margin of safety.
        </div>
      )}
    </div>
  )
}
