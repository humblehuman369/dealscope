/**
 * User preferences for the Four Paths panel — per-family dismissals (T17).
 *
 * v1 is localStorage-backed: it survives reloads on the same device but does not
 * sync across devices. v2 (deferred) moves this to the User model server-side.
 *
 * Storage shape:
 *   { [family: string]: epochMillisExpires }
 *
 * Expired entries are filtered lazily on read. We do NOT gate writes on
 * `hasAnalyticsConsent()` — dismissals are functional product state, not
 * analytics. Cookie consent governs telemetry only.
 */

const STORAGE_KEY = 'fourPathsDismissedFamilies'
const DEFAULT_DURATION_DAYS = 30

type DismissalMap = Record<string, number>

function readMap(): DismissalMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: DismissalMap = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeMap(map: DismissalMap): void {
  if (typeof window === 'undefined') return
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    }
  } catch {
    // Storage unavailable (private mode, quota, disabled) — silently no-op.
  }
}

/** Drop expired entries and return the cleaned map. */
function pruneExpired(map: DismissalMap, now: number = Date.now()): DismissalMap {
  const out: DismissalMap = {}
  for (const [family, expires] of Object.entries(map)) {
    if (expires > now) out[family] = expires
  }
  return out
}

/** Mark a family as dismissed for ``durationDays`` (default 30). */
export function dismissFamily(family: string, durationDays: number = DEFAULT_DURATION_DAYS): void {
  if (!family) return
  const days = Math.max(1, durationDays)
  const map = pruneExpired(readMap())
  map[family] = Date.now() + days * 24 * 60 * 60 * 1000
  writeMap(map)
}

/** Currently-dismissed family IDs (expired entries excluded). */
export function getDismissedFamilies(): string[] {
  const pruned = pruneExpired(readMap())
  return Object.keys(pruned).sort()
}

/** Returns the number of times this family has been dismissed in the last 30 days.
 *
 * v1 only tracks the current dismissal state, not a history of dismissals — so this
 * returns 1 if the family is currently dismissed, 0 otherwise. v2 will track a real
 * count when we move to server-side persistence.
 */
export function dismissedCount(family: string): number {
  return getDismissedFamilies().includes(family) ? 1 : 0
}

/** Clear all dismissed families. */
export function resetDismissedFamilies(): void {
  writeMap({})
}

/** Test seam: undo internal storage without exporting writeMap directly. */
export const __TEST_ONLY__ = {
  STORAGE_KEY,
  DEFAULT_DURATION_DAYS,
}
