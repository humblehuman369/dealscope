import { LayoutDashboard } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <LayoutDashboard size={16} className="text-teal-500 dark:text-teal-400" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
        </div>

        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="h-8 w-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <div className="h-10 w-10 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Portfolio Summary Skeleton */}
        <div className="mb-6">
          <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
                <div className="h-6 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-16 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-4">
                <div className="h-5 w-28 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  {[1, 2].map(j => (
                    <div key={j} className="h-10 bg-slate-100 dark:bg-navy-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
