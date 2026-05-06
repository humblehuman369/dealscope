'use client'

/**
 * /pipeline → /dashboard redirect.
 *
 * Phase 10B unified the Active Projects board into the dashboard kanban.
 * This page used to render a separate strategy-grouped post-purchase board;
 * now the same view (with full pre-purchase funnel attached) lives at
 * ``/dashboard``. Kept as a client redirect so any old bookmarks land in
 * the right place. Plan to keep this stub for ~90 days, then remove.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PipelineRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] grid-fade">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-label)]">
          Moved
        </p>
        <h1 className="mt-2 text-xl font-bold text-[var(--text-heading)]">
          Active Projects is now part of the Dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Redirecting…</p>
      </div>
    </div>
  )
}
