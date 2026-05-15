'use client'

import React from 'react'
import { Loader2, AlertTriangle, Search, ArrowLeft } from 'lucide-react'

interface BaseStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

/**
 * LoadingProperty — Consistent loading state for any property-dependent screen.
 * Uses the design system surface tokens.
 */
export function LoadingProperty({ message = 'Loading property data...' }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-[var(--surface-base)] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-sky)]" />
        <p className="text-lg font-medium text-[var(--text-body)]">{message}</p>
        <p className="text-sm text-[var(--text-secondary)] max-w-xs">
          We’re fetching the latest valuations, rent estimates, and market data.
        </p>
      </div>
    </div>
  )
}

/**
 * EmptyProperty — When no property data is available (no error, just absence).
 * Provides clear next actions for the investor.
 */
export function EmptyProperty({
  title = 'No Property Selected',
  message = 'Search for an address to begin analyzing investment strategies, cash flow, and deal metrics.',
  actionLabel = 'Search Properties',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: BaseStateProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-[var(--surface-base)] px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-elevated)]">
          <Search className="h-8 w-8 text-[var(--text-secondary)]" />
        </div>

        <h2 className="mb-3 text-2xl font-bold text-[var(--text-heading)]">{title}</h2>
        <p className="mb-8 text-[var(--text-secondary)]">{message}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sky)] px-8 py-3 text-base font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-sky)]/90"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] px-8 py-3 text-base font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-elevated)]"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ErrorProperty — When property data fails to load.
 * Offers recovery actions and clear messaging.
 */
export function ErrorProperty({
  title = 'Unable to Load Property',
  message = 'We couldn’t retrieve the latest data for this address. This can happen due to temporary network issues or when a property is off-market.',
  actionLabel = 'Try Again',
  onAction,
  secondaryActionLabel = 'Go Back',
  onSecondaryAction,
}: BaseStateProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center bg-[var(--surface-base)] px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h2 className="mb-3 text-2xl font-bold text-[var(--text-heading)]">{title}</h2>
        <p className="mb-8 text-[var(--text-secondary)]">{message}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-sky)] px-8 py-3 text-base font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-sky)]/90"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] px-8 py-3 text-base font-medium text-[var(--text-body)] transition hover:bg-[var(--surface-elevated)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
