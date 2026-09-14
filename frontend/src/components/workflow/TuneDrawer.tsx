'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useFocusTrap } from '@/components/ui/useFocusTrap'

export interface TuneDrawerProps {
  open: boolean
  onClose: () => void
  onReset: () => void
  resetLabel: string
  children: ReactNode
}

export function TuneDrawer({ open, onClose, onReset, resetLabel, children }: TuneDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Tune the numbers"
    >
      <button
        type="button"
        className="absolute inset-0 border-0 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        aria-label="Close tune drawer"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col outline-none sm:max-w-2xl motion-reduce:transition-none transition-transform duration-200"
        style={{
          background: 'var(--surface-card)',
          borderLeft: '1px solid var(--border-default)',
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <h2 className="m-0 text-[16px] font-semibold" style={{ color: 'var(--text-heading)' }}>
            Tune the numbers
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full border-0 bg-transparent cursor-pointer text-[15px]"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">{children}</div>

        <div
          className="flex flex-wrap items-center justify-end gap-3 px-4 pt-3 shrink-0"
          style={{
            borderTop: '1px solid var(--border-default)',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            background: 'var(--surface-card)',
          }}
        >
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center min-h-11 px-4 text-[14px] font-semibold rounded-full border bg-transparent cursor-pointer"
            style={{ color: 'var(--text-body)', borderColor: 'var(--border-strong)' }}
          >
            {resetLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-11 px-5 text-[14px] font-semibold rounded-full border-0 cursor-pointer"
            style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
