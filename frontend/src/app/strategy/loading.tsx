import { Loader2 } from 'lucide-react'

export default function StrategyLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-navy-800 border-b border-slate-200 dark:border-navy-700 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-slate-200 dark:bg-navy-700 rounded-full animate-pulse" />
            <div>
              <div className="h-5 w-56 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-1" />
              <div className="h-3 w-36 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-24 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Loading Spinner */}
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Strategy Analysis...</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Running financial deep-dive</p>
        </div>
      </div>

      {/* Financial Breakdown Skeleton */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Price Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5">
              <div className="h-3 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-3" />
              <div className="h-7 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
              <div className="h-3 w-16 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-6 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Breakdown Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
              <div className="h-5 w-40 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
