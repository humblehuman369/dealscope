import { Loader2 } from 'lucide-react'

export default function VerdictLoading() {
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Generating IQ Verdict...</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Analyzing strategies and market data</p>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* Property Summary Card */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-40 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-3" />
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 w-16 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-28 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                <div className="h-8 w-8 bg-slate-200 dark:bg-navy-700 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-10 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
                <div className="h-4 w-full bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
