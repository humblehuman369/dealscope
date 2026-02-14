/**
 * Saved Properties — Route-level loading state.
 *
 * Shown by Next.js during the initial route transition before the
 * page component mounts.  Matches the dark-fintech theme.
 */
export default function SavedPropertiesLoading() {
  return (
    <div
      className="min-h-screen bg-black flex items-center justify-center"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-white/[0.07]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-sky-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-400">Loading saved properties…</p>
      </div>
    </div>
  )
}
