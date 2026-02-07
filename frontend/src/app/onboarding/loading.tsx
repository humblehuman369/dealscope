export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-24 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-navy-700 rounded-full animate-pulse" />
        </div>

        {/* Card Skeleton */}
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg border border-slate-200 dark:border-navy-700 p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="h-7 w-64 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mx-auto mb-3" />
            <div className="h-4 w-80 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mx-auto" />
          </div>

          {/* Options Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-navy-700 rounded-xl border border-slate-200 dark:border-navy-600 animate-pulse" />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-navy-700">
            <div className="h-10 w-24 bg-slate-200 dark:bg-navy-700 rounded-lg animate-pulse" />
            <div className="h-10 w-28 bg-teal-100 dark:bg-teal-900/30 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Skip Link */}
        <div className="text-center mt-4">
          <div className="h-4 w-32 bg-slate-200 dark:bg-navy-700 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  )
}
