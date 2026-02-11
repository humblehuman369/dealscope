// ===========================================
// Admin Loading Skeleton — Dark Fintech Theme
// ===========================================

export default function AdminLoading() {
  return (
    <div
      className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400/10 rounded-lg animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-white/[0.05] rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-72 bg-white/[0.03] rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-6">
          {[100, 120, 140, 90].map((width, i) => (
            <div
              key={i}
              className={`h-10 rounded-lg animate-pulse ${i === 0 ? 'bg-sky-500/20' : 'bg-[#0C1220] border border-white/[0.07]'}`}
              style={{ width }}
            />
          ))}
        </div>

        {/* Content skeleton — stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            'bg-sky-400/5',
            'bg-emerald-400/5',
            'bg-teal-400/5',
            'bg-amber-400/5',
          ].map((tint, i) => (
            <div
              key={i}
              className="bg-[#0C1220] rounded-xl border border-white/[0.07] p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${tint} rounded-lg animate-pulse`} />
                <div>
                  <div className="h-7 w-12 bg-white/[0.05] rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-white/[0.03] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
