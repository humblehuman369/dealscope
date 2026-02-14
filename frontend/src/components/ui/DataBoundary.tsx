'use client'

/**
 * DataBoundary — Consistent loading / error / empty state wrapper.
 *
 * Drop-in replacement for the common three-branch ternary pattern:
 *   isLoading ? <Spinner /> : error ? <Error /> : data.length === 0 ? <Empty /> : <List />
 *
 * Styled for the dark-fintech design system (true-black base, sky-400 accents).
 */

import { ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface DataBoundaryProps {
  /** True while the initial data load is in progress */
  isLoading: boolean
  /** Error message to display (null/undefined = no error) */
  error?: string | null
  /** True when the fetched data collection is empty */
  isEmpty?: boolean
  /** Callback to retry the failed request */
  onRetry?: () => void
  /** Icon element for the empty state */
  emptyIcon?: ReactNode
  /** Headline for the empty state */
  emptyTitle?: string
  /** Description text for the empty state */
  emptyDescription?: string
  /** CTA button/element for the empty state */
  emptyAction?: ReactNode
  /** Content to render when data is loaded and non-empty */
  children: ReactNode
}

export function DataBoundary({
  isLoading,
  error,
  isEmpty = false,
  onRetry,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  children,
}: DataBoundaryProps) {
  // ── Loading ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400" />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-sm text-red-400 mb-4 max-w-sm">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.14] text-slate-300 font-semibold rounded-lg text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    )
  }

  // ── Empty ─────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        {emptyIcon && (
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
            {emptyIcon}
          </div>
        )}
        <h4 className="text-lg font-semibold text-slate-100 mb-2">
          {emptyTitle}
        </h4>
        {emptyDescription && (
          <p className="text-slate-400 mb-6 max-w-sm">{emptyDescription}</p>
        )}
        {emptyAction}
      </div>
    )
  }

  // ── Data ──────────────────────────────────────
  return <>{children}</>
}
