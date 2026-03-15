import { History } from 'lucide-react'

// ===========================================
// Search History Loading Skeleton — Semantic Theme
// ===========================================

export default function SearchHistoryLoading() {
  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-[var(--accent-sky)] opacity-40" />
              <div className="h-8 w-48 bg-[var(--surface-elevated)] rounded-lg animate-pulse" />
            </div>
            <div className="h-5 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            'bg-[var(--color-sky-dim)]',
            'bg-[rgba(52,211,153,0.10)]',
            'bg-[rgba(251,191,36,0.10)]',
            'bg-[var(--surface-elevated)]',
          ].map((tint, i) => (
            <div key={i} className="bg-[var(--surface-card)] rounded-xl p-4 border border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${tint} rounded-lg animate-pulse`} />
                <div>
                  <div className="h-7 w-10 bg-[var(--surface-elevated)] rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-[var(--surface-card-hover)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* History List Skeleton */}
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-default)]">
            <div className="h-6 w-40 bg-[var(--surface-elevated)] rounded-lg animate-pulse" />
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--surface-elevated)] rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-56 bg-[var(--surface-elevated)] rounded animate-pulse mb-2" />
                    <div className="h-3 w-36 bg-[var(--surface-card-hover)] rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-8 bg-[var(--surface-card-hover)] rounded-lg animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
