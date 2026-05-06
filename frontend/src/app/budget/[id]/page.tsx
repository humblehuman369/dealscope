'use client'

/**
 * /budget/[id] → /deals/[id]?tab=budget redirect.
 *
 * Phase 11C: the canonical home for budget tracking is the deal workflow
 * page's Budget tab. This stub is kept so old bookmarks land in the right
 * place. Plan to retain ~90 days, then remove.
 */

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BudgetRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/deals/${id}?tab=budget`)
  }, [router, id])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] grid-fade">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-label)]">
          Moved
        </p>
        <h1 className="mt-2 text-xl font-bold text-[var(--text-heading)]">
          Budget lives on the Deal page now
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Redirecting…</p>
      </div>
    </div>
  )
}
