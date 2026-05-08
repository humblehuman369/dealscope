/**
 * Activation Arc Phase 0 (B4) — sandbox session persistence.
 *
 * Stores the user's Build Your Deal slider adjustments per-property in
 * localStorage. Restored on next verdict view so users return to where they
 * left off. 30-day TTL matches the existing dismissal-state pattern in
 * userPreferences.ts.
 */

import type {
  SandboxAdjustments,
} from '@/components/iq-verdict/BuildYourDealSandbox'

const KEY_PREFIX = 'dealscope_sandbox_v1::'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface PersistedEntry {
  v: 1
  savedAt: number
  adjustments: SandboxAdjustments
}

function keyFor(address: string): string {
  // Address is the natural identity for a property's sandbox session.
  // Normalize lightly — same canonicalization the Deal Maker store uses.
  return KEY_PREFIX + address.trim().toLowerCase()
}

/**
 * Read the persisted sandbox adjustments for this property, if fresh.
 * Returns null when no entry exists or the entry has expired (TTL).
 */
export function readSandbox(address: string): SandboxAdjustments | null {
  if (typeof window === 'undefined' || !address) return null
  try {
    const raw = localStorage.getItem(keyFor(address))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEntry
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > TTL_MS) {
      // Stale — clean up and pretend it didn't exist.
      localStorage.removeItem(keyFor(address))
      return null
    }
    return parsed.adjustments
  } catch {
    return null
  }
}

/**
 * Persist the user's current sandbox adjustments for this property.
 * Empty/all-undefined adjustments are stored as a no-op deletion so the
 * next visit starts fresh from the headline.
 */
export function writeSandbox(address: string, adjustments: SandboxAdjustments): void {
  if (typeof window === 'undefined' || !address) return
  const isEmpty = Object.values(adjustments).every((v) => v == null)
  try {
    if (isEmpty) {
      localStorage.removeItem(keyFor(address))
      return
    }
    const entry: PersistedEntry = {
      v: 1,
      savedAt: Date.now(),
      adjustments,
    }
    localStorage.setItem(keyFor(address), JSON.stringify(entry))
  } catch {
    /* ignore quota errors */
  }
}

/** Discard the persisted sandbox state (e.g. on explicit "reset to headline"). */
export function clearSandbox(address: string): void {
  if (typeof window === 'undefined' || !address) return
  try {
    localStorage.removeItem(keyFor(address))
  } catch {
    /* ignore */
  }
}

/**
 * Friendly timestamp for the "Resumed your scenario from {date}" chip.
 * Returns null when no fresh entry exists.
 */
export function readSandboxSavedAt(address: string): Date | null {
  if (typeof window === 'undefined' || !address) return null
  try {
    const raw = localStorage.getItem(keyFor(address))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEntry
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > TTL_MS) return null
    return new Date(parsed.savedAt)
  } catch {
    return null
  }
}
