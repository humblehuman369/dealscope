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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--accent-sky)]" />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--status-negative)]/20 bg-[var(--status-negative)]/10">
          <AlertCircle className="h-7 w-7 text-[var(--status-negative)]" />
        </div>
        <p className="mb-4 max-w-sm text-sm text-[var(--status-negative)]">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-body)] transition-all hover:border-[var(--border-focus)]"
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
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
            {emptyIcon}
          </div>
        )}
        <h4 className="mb-2 text-lg font-semibold text-[var(--text-heading)]">
          {emptyTitle}
        </h4>
        {emptyDescription && (
          <p className="mb-6 max-w-sm text-[var(--text-secondary)]">{emptyDescription}</p>
        )}
        {emptyAction}
      </div>
    )
  }

  // ── Data ──────────────────────────────────────
  return <>{children}</>
}
