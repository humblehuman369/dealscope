'use client'

/**
 * StrategySelectDropdown — compact replacement for the 6-pill strategy selector.
 * Trigger uses the active strategy's color so the page reads as color-coded
 * without the visual noise of six full-width pills.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import { useEffect, useRef, useState } from 'react'

export type StrategyOption = { id: string; label: string; color: string; preferred?: boolean }

export function StrategySelectDropdown({
  options,
  activeId,
  onChange,
}: {
  options: StrategyOption[]
  activeId: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const active = options.find((o) => o.id === activeId) ?? options[0]
  if (!active) return null

  return (
    <div ref={ref} className="relative w-full sm:w-72 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Strategy: ${active.label}`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all"
        style={{
          background: 'transparent',
          color: active.color,
          border: `0.5px solid ${active.color}`,
          boxShadow: open ? `0 0 0 2px ${active.color}33` : undefined,
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: active.color,
              flexShrink: 0,
            }}
          />
          <span className="truncate">{active.label}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          style={{
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : undefined,
            flexShrink: 0,
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Investment strategy"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl py-1"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          {options.map((opt) => {
            const isActive = opt.id === activeId
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left transition-colors"
                  style={{
                    background: isActive ? `${opt.color}1f` : 'transparent',
                    color: isActive ? opt.color : 'var(--text-heading)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opt.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate flex-1">{opt.label}</span>
                  {opt.preferred && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        background: 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      Your strategy
                    </span>
                  )}
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path
                        d="M4 10.5L8 14.5L16 6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
