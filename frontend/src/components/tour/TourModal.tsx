'use client'

import { useEffect, useRef } from 'react'
import { useFocusTrap } from '@/components/ui/useFocusTrap'

interface TourModalProps {
  open: boolean
  title: string
  children: React.ReactNode
  primaryLabel?: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  skipLabel?: string
  onSkip?: () => void
  stepLabel?: string
  footer?: React.ReactNode
}

export function TourModal({
  open,
  title,
  children,
  primaryLabel = 'Show Me →',
  secondaryLabel,
  onPrimary,
  onSecondary,
  skipLabel = 'Skip',
  onSkip,
  stepLabel,
  footer,
}: TourModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onSkip])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      role="presentation"
      onClick={() => onSkip?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-modal-title"
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--accent-sky)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {stepLabel && (
          <span
            className="absolute top-4 right-4 text-xs font-medium"
            style={{ color: 'var(--text-label)' }}
          >
            {stepLabel}
          </span>
        )}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="absolute top-4 right-16 text-xs font-semibold hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            {skipLabel}
          </button>
        )}
        <h2
          id="tour-modal-title"
          className="text-lg font-bold pr-20"
          style={{ color: 'var(--text-heading)' }}
        >
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </div>
        {footer}
        {!footer && (onPrimary || onSecondary) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {onPrimary && primaryLabel && (
              <button
                type="button"
                onClick={onPrimary}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--accent-sky)', color: '#fff' }}
              >
                {primaryLabel}
              </button>
            )}
            {onSecondary && secondaryLabel && (
              <button
                type="button"
                onClick={onSecondary}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-heading)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
