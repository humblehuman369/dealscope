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
          toast: 'group toast bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700',
          title: 'text-slate-900 dark:text-white font-medium',
          description: 'text-slate-600 dark:text-slate-400',
          actionButton: 'bg-teal-500 text-white hover:bg-teal-600',
          cancelButton: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          closeButton: 'bg-slate-100 dark:bg-navy-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          success: 'border-green-200 dark:border-green-800',
          error: 'border-red-200 dark:border-red-800',
          warning: 'border-amber-200 dark:border-amber-800',
          info: 'border-blue-200 dark:border-blue-800',
        },
      }}
    />
  )
}

// Re-export toast function for convenience
export { toast } from 'sonner'
