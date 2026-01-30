import { User } from 'lucide-react'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="h-6 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-1" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-navy-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-40 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-56 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Investment Preferences Skeleton */}
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-slate-200 dark:border-navy-700 p-6">
          <div className="h-6 w-48 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-navy-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
