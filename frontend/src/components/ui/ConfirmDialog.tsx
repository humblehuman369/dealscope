'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Trap keyboard focus inside a container element.
 * Returns a keydown handler to attach to the container.
 */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const el = containerRef.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [containerRef, active])
}

export interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' shows a red confirm button, 'info' shows blue */
  variant?: 'danger' | 'info'
}

/**
 * ConfirmDialog — dark-themed modal that replaces window.confirm() and window.alert().
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDialog}
 *     title="Remove property?"
 *     description="This cannot be undone."
 *     variant="danger"
 *     onConfirm={() => { deleteProperty(); setShowDialog(false) }}
 *     onCancel={() => setShowDialog(false)}
 *   />
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus confirm button on open, trap Escape key
  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  // Keyboard focus trap — Tab cycles within the dialog
  useFocusTrap(panelRef, open)

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onCancel()
    },
    [onCancel],
  )

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: '#0f172a',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3
          id="confirm-dialog-title"
          className="text-lg font-bold mb-2"
          style={{ color: '#f1f5f9' }}
        >
          {title}
        </h3>

        {description && (
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#94a3b8' }}>
            {description}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{
              background: isDanger
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #0EA5E9 0%, #0e7490 100%)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * InfoDialog — for non-destructive informational messages (replaces window.alert).
 * Same component, simplified API with only "Got it" button.
 */
export function InfoDialog({
  open,
  onClose,
  title,
  description,
  closeLabel = 'Got it',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  closeLabel?: string
  children?: React.ReactNode
}) {
  const infoPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useFocusTrap(infoPanelRef, open)

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-dialog-title"
    >
      <div
        ref={infoPanelRef}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: '#0f172a',
          border: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3
          id="info-dialog-title"
          className="text-lg font-bold mb-2"
          style={{ color: '#f1f5f9' }}
        >
          {title}
        </h3>

        {description && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
            {description}
          </p>
        )}

        {children}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            autoFocus
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0e7490 100%)' }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
