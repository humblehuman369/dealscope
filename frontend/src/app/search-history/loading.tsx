import { History } from 'lucide-react'

// ===========================================
// Search History Loading Skeleton — Dark Fintech Theme
// ===========================================

export default function SearchHistoryLoading() {
  return (
    <div
      className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-sky-400/30" />
              <div className="h-8 w-48 bg-white/[0.05] rounded-lg animate-pulse" />
            </div>
            <div className="h-5 w-64 bg-white/[0.03] rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-36 bg-[#0C1220] border border-white/[0.07] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            'bg-sky-400/5',
            'bg-emerald-400/5',
            'bg-amber-400/5',
            'bg-teal-400/5',
          ].map((tint, i) => (
            <div key={i} className="bg-[#0C1220] rounded-xl p-4 border border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${tint} rounded-lg animate-pulse`} />
                <div>
                  <div className="h-7 w-10 bg-white/[0.05] rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-white/[0.03] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* History List Skeleton */}
        <div className="bg-[#0C1220] rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.07]">
            <div className="h-6 w-40 bg-white/[0.05] rounded-lg animate-pulse" />
          </div>

          <div className="divide-y divide-white/[0.07]">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/[0.04] rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-56 bg-white/[0.05] rounded animate-pulse mb-2" />
                    <div className="h-3 w-36 bg-white/[0.03] rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-8 bg-white/[0.03] rounded-lg animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
