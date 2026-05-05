'use client'

import { useRehabBudgetSummary } from '@/hooks/useSavedProperties'

/** Shows rehab actuals vs seeded estimate when a saved property has a budget. */
export function RehabBudgetBanner({ propertyId }: { propertyId: string }) {
  const q = useRehabBudgetSummary(propertyId)
  if (q.isLoading || q.isError || !q.data) return null
  const { variance_pct, variance } = q.data
  const v = parseFloat(variance_pct)
  const dollars = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(parseFloat(variance))
  return (
    <div className="mx-4 sm:mx-6 mb-3 rounded-xl px-4 py-3 border border-[var(--border-default)] bg-[var(--surface-elevated)] text-sm">
      <span className="font-semibold text-[var(--text-heading)]">Rehab actuals vs estimate: </span>
      <span style={{ color: v > 0 ? 'var(--status-negative)' : 'var(--status-positive)' }}>
        {v > 0 ? '+' : ''}
        {variance_pct}% ({dollars})
      </span>
    </div>
  )
}
