'use client'

/**
 * Modal — accessible, themeable modal primitive.
 *
 * Behaviour wired in by default (do not rebuild these in consumers):
 *   - Backdrop click closes (toggle via `closeOnBackdropClick={false}`)
 *   - Escape key closes  (toggle via `closeOnEscape={false}`)
 *   - Focus is moved into the modal on open (first focusable child or
 *     `initialFocusRef` if provided), and Tab/Shift+Tab cycle inside
 *     via `useFocusTrap`
 *   - Focus is returned to the previously-focused element on close
 *   - Body scroll is locked while open (avoids scroll-bleed on mobile)
 *   - aria-modal, role="dialog", aria-labelledby wired automatically
 *
 * Surfaces use semantic theme tokens — never hardcode hex.
 *
 * Migration target for P2.5: every ad-hoc modal in the app
 * (AuthModal, UpgradeModal, IQWelcomeModal, PitchScriptModal,
 * GenerateLOIModal, VideoModal, CompPhotosModal, TryItNowModal,
 * SearchPropertyModal, ConfirmDialog) should reduce to a thin shell
 * that composes `<Modal>` with their content.
 */

import { useCallback, useEffect, useId, useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const SIZE_MAX_WIDTH: Record<ModalSize, string> = {
  sm: '24rem', // ~384px — confirm-style dialogs
  md: '28rem', // ~448px — auth, single-form modals
  lg: '36rem', // ~576px — multi-step or richer content
  xl: '50rem', // ~800px — video, gallery, comparison
  full: '100%', // viewport-bound
}

export interface ModalProps {
  /** Controlled open state. */
  open: boolean
  /** Called when the user dismisses the modal (Escape, backdrop, X button). */
  onClose: () => void
  /**
   * Accessible label. Pass either `aria-label` for an icon/text-only
   * modal, or render a `<h2 id={...}>` and pass its id as `aria-labelledby`.
   * If neither is supplied, an aria-label is auto-generated from `title`.
   */
  'aria-label'?: string
  'aria-labelledby'?: string
  /**
   * Optional heading to render in the default header. If you render your
   * own header inside `children`, pass `title={undefined}` and supply
   * `aria-labelledby` instead.
   */
  title?: React.ReactNode
  /** Defaults to `md`. */
  size?: ModalSize
  /** Defaults to `true`. */
  closeOnBackdropClick?: boolean
  /** Defaults to `true`. */
  closeOnEscape?: boolean
  /**
   * Element to focus on open. Defaults to the first focusable descendant.
   * Use this for forms where the user expects to start typing immediately
   * (e.g. a search input).
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** Hide the default close (X) button if you render your own. */
  hideCloseButton?: boolean
  /**
   * Render the children edge-to-edge with no inner padding. Use for video,
   * image, or map content where the visual fills the panel. Header
   * (title/close) is also skipped when `fullBleed` is true and no `title`
   * is provided — caller is responsible for any close affordance.
   */
  fullBleed?: boolean
  /** Additional class on the panel — for size/spacing tweaks. */
  panelClassName?: string
  /** Additional inline style on the panel — escape hatch for special cases. */
  panelStyle?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Lock body scroll while any modal is open. Reference-counted so multiple
 * stacked modals don't fight each other.
 */
let scrollLockCount = 0
let originalBodyOverflow: string | null = null

function acquireScrollLock(): void {
  if (typeof document === 'undefined') return
  if (scrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

function releaseScrollLock(): void {
  if (typeof document === 'undefined') return
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow ?? ''
    originalBodyOverflow = null
  }
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  initialFocusRef,
  hideCloseButton = false,
  fullBleed = false,
  panelClassName = '',
  panelStyle,
  children,
  ...ariaProps
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const autoTitleId = useId()
  const titleId = ariaProps['aria-labelledby'] ?? (title ? `modal-title-${autoTitleId}` : undefined)

  // Body scroll lock — paired acquire/release tied to mount/unmount of an open modal.
  useEffect(() => {
    if (!open) return
    acquireScrollLock()
    return () => releaseScrollLock()
  }, [open])

  // Save / restore focus across the modal's lifecycle, and move focus inside
  // when it opens.
  useEffect(() => {
    if (!open) return

    if (typeof document !== 'undefined') {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    }

    // Defer one tick so any conditionally-rendered focusables exist.
    const id = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ??
        panelRef.current
      target?.focus()
    }, 0)

    return () => {
      window.clearTimeout(id)
      // Restore focus to whatever opened the modal so keyboard users
      // continue from where they were.
      previouslyFocusedRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  // Escape-to-close. Window-level listener so it works regardless of
  // current focus inside the modal.
  useEffect(() => {
    if (!open || !closeOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeOnEscape, onClose])

  // Tab cycle.
  useFocusTrap(panelRef, open)

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (!closeOnBackdropClick) return
      if (e.target === e.currentTarget) onClose()
    },
    [closeOnBackdropClick, onClose],
  )

  if (!open) return null

  const ariaLabel = ariaProps['aria-label'] ?? (typeof title === 'string' ? title : undefined)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(6px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      {...(titleId ? { 'aria-labelledby': titleId } : {})}
      {...(!titleId && ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full rounded-2xl overflow-hidden outline-none ${panelClassName}`}
        style={{
          maxWidth: SIZE_MAX_WIDTH[size],
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-dropdown)',
          ...panelStyle,
        }}
      >
        {/* Header is suppressed in fullBleed mode unless an explicit title
            is provided — full-bleed content (video, image, map) usually
            owns its own close affordance overlaid on the content. */}
        {(title || (!hideCloseButton && !fullBleed)) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
            {title ? (
              <h2
                {...(titleId ? { id: titleId } : {})}
                className="text-xl font-bold m-0"
                style={{ color: 'var(--text-heading)' }}
              >
                {title}
              </h2>
            ) : (
              <span aria-hidden="true" />
            )}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full transition-colors hover:bg-[var(--surface-card-hover)] flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={fullBleed ? '' : 'px-6 pb-6 pt-2'}>{children}</div>
      </div>
    </div>
  )
}

export default Modal
