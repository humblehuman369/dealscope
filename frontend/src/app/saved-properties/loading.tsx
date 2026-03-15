/**
 * Saved Properties — Route-level loading state.
 *
 * Shown by Next.js during the initial route transition before the
 * page component mounts. Uses semantic theme tokens.
 */
export default function SavedPropertiesLoading() {
  return (
    <div
      className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--border-default)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent-sky)] animate-spin" />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Loading saved properties…</p>
      </div>
    </div>
  )
}
