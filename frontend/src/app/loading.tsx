/**
 * Global Loading State
 * 
 * Shown during route transitions at the root level.
 */
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        {/* DealGapIQ Logo/Spinner */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-navy-700" />
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-500 animate-spin" />
        </div>
        
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Loading DealGapIQ
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Preparing your investment tools...
        </p>
      </div>
    </div>
  )
}
