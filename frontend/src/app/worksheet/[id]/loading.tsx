import { Loader2 } from 'lucide-react'

export default function WorksheetLoading() {
  return (
    <div className="min-h-screen bg-[var(--ws-bg,#f8fafc)]">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-navy-800 border-b border-slate-200 dark:border-navy-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-6 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            <div className="h-5 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-9 w-20 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading worksheet...</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Preparing your investment analysis</p>
        </div>
      </div>
    </div>
  )
}
