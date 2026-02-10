export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-navy-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-navy-700 rounded-lg animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-navy-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-gray-200 dark:bg-navy-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-gray-200 dark:bg-navy-700 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Content skeleton — stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-navy-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 dark:bg-navy-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-navy-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
