import { CreditCard } from 'lucide-react'

export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-2 mb-6">
          <CreditCard size={16} className="text-teal-500 dark:text-teal-400" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="h-8 w-56 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
        </div>

        {/* Current Plan Card */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            <div className="h-8 w-20 bg-teal-100 dark:bg-teal-900/30 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                <div className="h-6 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Plan Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
              <div className="h-6 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-8 w-20 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
              <div className="space-y-3 mb-6">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-slate-200 dark:bg-navy-700 rounded animate-pulse flex-shrink-0" />
                    <div className="h-4 w-full bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-10 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
