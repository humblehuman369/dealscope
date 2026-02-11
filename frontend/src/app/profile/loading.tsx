import { User } from 'lucide-react'

// ===========================================
// Profile Loading Skeleton — Dark Fintech Theme
// ===========================================

export default function ProfileLoading() {
  return (
    <div
      className="min-h-screen bg-black py-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-40 bg-white/[0.05] rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-white/[0.03] rounded-lg animate-pulse mt-2" />
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] overflow-hidden mb-6">
          <div className="h-24 bg-white/[0.02]" />
          <div className="relative px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12">
              <div className="w-24 h-24 rounded-2xl bg-white/[0.06] animate-pulse border-4 border-[#0C1220]" />
              <div className="flex-1 pb-1">
                <div className="h-7 w-48 bg-white/[0.05] rounded-lg animate-pulse mb-2" />
                <div className="h-5 w-56 bg-white/[0.03] rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Skeleton */}
        <div className="flex gap-2 mb-6">
          {[120, 140, 140, 110].map((width, i) => (
            <div
              key={i}
              className={`h-10 rounded-lg animate-pulse ${i === 0 ? 'bg-sky-500/20' : 'bg-white/[0.04] border border-white/[0.07]'}`}
              style={{ width }}
            />
          ))}
        </div>

        {/* Content Card Skeleton */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 bg-sky-400/20 rounded animate-pulse" />
            <div className="h-6 w-48 bg-white/[0.05] rounded-lg animate-pulse" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-11 w-full bg-white/[0.03] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-5 w-28 bg-white/[0.05] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
