import { User } from 'lucide-react'

// ===========================================
// Profile Loading Skeleton — Dark Fintech Theme
// ===========================================

export default function ProfileLoading() {
  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] py-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-40 bg-[var(--surface-elevated)] rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-[var(--surface-card-hover)] rounded-lg animate-pulse mt-2" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden mb-6">
          <div className="h-24 bg-[var(--surface-elevated)]" />
          <div className="relative px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12">
              <div className="w-24 h-24 rounded-2xl bg-[var(--surface-card-hover)] animate-pulse border-4 border-[var(--surface-card)]" />
              <div className="flex-1 pb-1">
                <div className="h-7 w-48 bg-[var(--surface-elevated)] rounded-lg animate-pulse mb-2" />
                <div className="h-5 w-56 bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Skeleton */}
        <div className="flex gap-2 mb-6">
          {[120, 140, 140, 110].map((width, i) => (
            <div
              key={i}
              className={`h-10 rounded-lg animate-pulse ${i === 0 ? 'bg-[var(--color-sky-dim)]' : 'bg-[var(--surface-elevated)] border border-[var(--border-default)]'}`}
              style={{ width }}
            />
          ))}
        </div>

        {/* Content Card Skeleton */}
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-[var(--color-sky-dim)] rounded animate-pulse" />
            <div className="h-6 w-48 bg-[var(--surface-elevated)] rounded-lg animate-pulse" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-[var(--surface-elevated)] rounded animate-pulse" />
                  <div className="h-11 w-full bg-[var(--surface-card-hover)] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-subtle)]">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-[var(--surface-card-hover)] rounded animate-pulse" />
                  <div className="h-5 w-28 bg-[var(--surface-elevated)] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
