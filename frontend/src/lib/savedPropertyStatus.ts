/**
 * Shared display config and formatters for saved-property status.
 *
 * Single source of truth for status colors, labels, currency/date helpers
 * used by the Saved Properties list page AND the Dashboard pipeline kanban.
 */

import type { PropertyStatus } from '@/types/savedProperty'

export interface StatusConfig {
  label: string
  /** Tailwind color class — text color */
  color: string
  /** Tailwind color class — background tint */
  bg: string
}

export const STATUS_CONFIG: Record<PropertyStatus, StatusConfig> = {
  prospecting:     { label: 'Watching / Analyzing', color: 'text-[var(--accent-sky)]',      bg: 'bg-[var(--color-sky-dim)]' },
  pursuing:        { label: 'Pursue / Outreach',    color: 'text-[var(--status-info)]',     bg: 'bg-[var(--surface-elevated)]' },
  negotiating:     { label: 'Negotiating',          color: 'text-[var(--status-warning)]',  bg: 'bg-[rgba(251,191,36,0.10)]' },
  under_contract:  { label: 'Under Contract',       color: 'text-[var(--status-warning)]',  bg: 'bg-[rgba(251,191,36,0.18)]' },
  owned:           { label: 'Owned',                color: 'text-[var(--status-positive)]', bg: 'bg-[rgba(52,211,153,0.10)]' },
  passed:          { label: 'Passed',               color: 'text-[var(--text-secondary)]',  bg: 'bg-[var(--surface-elevated)]' },
  archived:        { label: 'Archived',             color: 'text-[var(--text-label)]',      bg: 'bg-[var(--surface-elevated)]' },
}

/** Pipeline stages shown on the dashboard kanban (excludes passed/archived). */
export const PIPELINE_STAGES: PropertyStatus[] = [
  'prospecting',
  'pursuing',
  'negotiating',
  'under_contract',
  'owned',
]

export const STRATEGY_LABELS: Record<string, string> = {
  ltr: 'Long-Term Rental',
  str: 'Short-Term Rental',
  flip: 'Fix & Flip',
  brrrr: 'BRRRR',
  wholesale: 'Wholesale',
  subject_to: 'Subject-To',
}

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
