'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toast Notification Provider
 * 
 * Renders the toast container with DealGapIQ styling.
 * Add this component to the root layout.
 * 
 * Usage:
 * ```tsx
 * import { toast } from 'sonner'
 * 
 * // Success toast
 * toast.success('Property saved to watchlist')
 * 
 * // Error toast
 * toast.error('Failed to save property')
 * 
 * // Loading toast with promise
 * toast.promise(saveProperty(), {
 *   loading: 'Saving property...',
 *   success: 'Property saved!',
 *   error: 'Failed to save property'
 * })
 * 
 * // Custom toast
 * toast('Hello!', {
 *   description: 'This is a description',
 *   action: {
 *     label: 'Undo',
 *     onClick: () => undoAction()
 *   }
 * })
 * ```
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'group toast border border-[var(--border-default)] bg-[var(--surface-card)]',
          title: 'font-medium text-[var(--text-heading)]',
          description: 'text-[var(--text-secondary)]',
          actionButton: 'bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)]',
          cancelButton: 'bg-[var(--surface-elevated)] text-[var(--text-body)] hover:bg-[var(--surface-card-hover)]',
          closeButton: 'bg-[var(--surface-elevated)] text-[var(--text-label)] hover:text-[var(--text-heading)]',
          success: 'border-[var(--status-positive)]',
          error: 'border-[var(--status-negative)]',
          warning: 'border-[var(--status-warning)]',
          info: 'border-[var(--status-info)]',
        },
      }}
    />
  )
}

// Re-export toast function for convenience
export { toast } from 'sonner'
