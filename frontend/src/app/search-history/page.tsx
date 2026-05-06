'use client'

/**
 * /search-history → /saved-properties?tab=recent redirect.
 *
 * Phase 15 unified Recent Searches and Saved Properties under a single
 * tabbed page. Kept as a stub for old bookmarks for ~90 days.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchHistoryRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/saved-properties?tab=recent')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)] grid-fade">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-label)]">
          Moved
        </p>
        <h1 className="mt-2 text-xl font-bold text-[var(--text-heading)]">
          Search History is now part of Saved Properties
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Redirecting…</p>
      </div>
    </div>
  )
}
