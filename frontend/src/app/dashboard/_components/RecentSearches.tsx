'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, ChevronRight, History } from 'lucide-react'
import { useSearchHistoryStats } from '@/hooks/useSearchHistory'
import { formatRelativeDate } from '@/lib/savedPropertyStatus'

export function RecentSearches() {
  const router = useRouter()
  const stats = useSearchHistoryStats()

  const recent = (stats.data?.recent_searches ?? []).slice(0, 5)

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--text-heading)]">
          <Clock className="w-4 h-4 text-[var(--accent-sky)]" />
          Recent Searches
        </h2>
        <Link
          href="/search-history"
          className="text-xs text-[var(--text-label)] hover:text-[var(--accent-sky)] transition-colors inline-flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {stats.isLoading ? (
        <div className="px-5 py-6 text-sm text-[var(--text-label)]">Loading…</div>
      ) : recent.length === 0 ? (
        <div className="px-5 py-6 text-sm text-[var(--text-label)] flex items-center gap-2">
          <History className="w-4 h-4" />
          No searches yet — your history will appear here.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-default)]">
          {recent.map(item => {
            const fullAddress = [
              item.address_street,
              item.address_city,
              [item.address_state, item.address_zip].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(', ') || item.search_query

            return (
              <li key={item.id}>
                <button
                  onClick={() =>
                    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`)
                  }
                  className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--hover-overlay)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-heading)] truncate">
                      {fullAddress}
                    </p>
                    <p className="text-xs text-[var(--text-label)] mt-0.5">
                      {formatRelativeDate(item.searched_at)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent-sky)] whitespace-nowrap">
                    Re-analyze →
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
