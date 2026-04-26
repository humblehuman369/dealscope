/**
 * Dashboard once-per-day landing helper.
 *
 * Tracks the date of the user's most recent dashboard visit in localStorage
 * so we can route them to /dashboard the first time they sign in (or restore
 * a session) on a given day, then leave them alone for the rest of the day.
 *
 * Date comparison uses local-timezone YYYY-MM-DD strings — matches what
 * users expect ("first visit today"), not UTC midnight.
 */

const STORAGE_KEY = 'dgiq_last_dashboard_visit'

function todayLocalDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns true if the dashboard hasn't been visited yet today (or ever).
 * Always false during SSR so we don't redirect on server-rendered output.
 */
export function shouldLandOnDashboard(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return true
    return stored !== todayLocalDateString()
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — don't redirect.
    return false
  }
}

/** Mark today as visited so the redirect won't fire again until tomorrow. */
export function markDashboardVisited(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, todayLocalDateString())
  } catch {
    // Best-effort; silently ignore storage failures.
  }
}
