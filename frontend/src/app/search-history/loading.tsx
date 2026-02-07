import { History } from 'lucide-react'

export default function SearchHistoryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <History size={16} className="text-teal-500 dark:text-teal-400" />
          <div className="h-4 w-28 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
        </div>

        {/* Stats Bar */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="h-6 w-12 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mx-auto mb-1" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Search History List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-56 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
                  <div className="h-3 w-36 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-slate-200 dark:bg-navy-700 rounded animate-pulse flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
