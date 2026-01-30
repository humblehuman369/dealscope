import { Loader2 } from 'lucide-react'

export default function DealMakerLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-navy-800 border-b border-slate-200 dark:border-navy-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="h-8 w-8 bg-slate-200 dark:bg-navy-700 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-1" />
            <div className="h-4 w-40 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Deal Maker...</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Preparing property analysis tools</p>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          {/* Property Info Card */}
          <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
            <div className="h-6 w-40 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
            <div className="h-6 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-24 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
