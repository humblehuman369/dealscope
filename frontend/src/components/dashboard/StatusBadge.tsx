'use client'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  watching:       { label: 'Watching',       bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-700 dark:text-slate-300' },
  analyzing:      { label: 'Analyzing',      bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-700 dark:text-blue-300' },
  contacted:      { label: 'Contacted',      bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-300' },
  negotiating:    { label: 'Negotiating',    bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-700 dark:text-amber-300' },
  under_contract: { label: 'Under Contract', bg: 'bg-teal-100 dark:bg-teal-900/30',     text: 'text-teal-700 dark:text-teal-300' },
  owned:          { label: 'Owned',          bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-700 dark:text-green-300' },
  passed:         { label: 'Passed',         bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-700 dark:text-red-300' },
  sold:           { label: 'Sold',           bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
}

export const PROPERTY_STATUSES = Object.keys(STATUS_CONFIG)

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const c = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()),
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
  }
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  return <span className={`inline-flex items-center rounded-full font-medium ${c.bg} ${c.text} ${sz}`}>{c.label}</span>
}
