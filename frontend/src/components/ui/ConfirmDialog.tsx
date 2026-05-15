'use client'

import { useEffect, useRef } from 'react'
import { Modal } from './Modal'

export interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' shows a red confirm button, 'info' shows blue. */
  variant?: 'danger' | 'info'
}

/**
 * ConfirmDialog — modal that replaces window.confirm().
 *
 * Now built on the shared <Modal> primitive (P2.4) for focus trap, escape,
 * backdrop click, return-focus and body scroll lock. Public API unchanged
 * — every existing callsite continues to work without edits.
 *
 * The confirm button is the initial focus target so a keyboard user can
 * press Enter to commit (or Tab once + Enter to cancel).
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
  const isDanger = variant === 'danger'

  // Modal moves initial focus to the first focusable child by default —
  // for a confirm dialog the user expects focus on the primary action,
  // not the cancel button. We use Modal's `initialFocusRef` to override.
  // (The ref is wired below; useEffect keeps the focus after rapid open
  //  toggles where Modal's initial focus may have already fired.)
  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      hideCloseButton
      initialFocusRef={confirmRef as React.RefObject<HTMLElement | null>}
    >
      {description && (
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: 'var(--surface-elevated)',
            color: 'var(--text-body)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          ref={confirmRef}
          onClick={onConfirm}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
          style={{
            background: isDanger
              ? 'linear-gradient(135deg, var(--status-negative) 0%, #991b1b 100%)'
              : 'linear-gradient(135deg, var(--accent-brand-blue) 0%, var(--accent-sky) 100%)',
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

/**
 * InfoDialog — non-destructive informational message (replaces window.alert).
 * Same primitive, simpler API: single "Got it" button.
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
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title} hideCloseButton>
      {description && (
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}

      {children}

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
          style={{
            background:
              'linear-gradient(135deg, var(--accent-brand-blue) 0%, var(--accent-sky) 100%)',
          }}
        >
          {closeLabel}
        </button>
      </div>
    </Modal>
  )
}
