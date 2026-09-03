'use client'

/**
 * Per-pin worked state for grinding down a farm area.
 *
 * Working a market is repetitive: open a pin, judge it, move on. Without a
 * record of what you already judged, every pan re-presents the same rejects
 * and the loop never converges. These marks are that record.
 *
 * Two marks, because they are the two decisions that actually retire a pin:
 *
 *   reviewed — looked at it, not ruling it out yet
 *   passed   — ruled it out; the pin dims so it stops competing for attention
 *
 * Deliberately *not* a third "saved" mark: saving a property is a real
 * server-side concept (the DealGapIQ pipeline, surfaced on the map by
 * `MyDealMapLayer`). A local copy of that word would be a second source of
 * truth for the same state and would drift.
 *
 * Storage is `localStorage`, not the backend: these are private working notes
 * with no cross-device requirement, and putting them on the server would mean
 * a write per pin click.
 */

import { useCallback, useEffect, useState } from 'react'

export type PinMark = 'reviewed' | 'passed'

const STORAGE_KEY = 'dealscope:map-pin-marks'
const STORAGE_VERSION = 1
/** Oldest marks are dropped past this; a farm area is a few hundred pins. */
const MAX_ENTRIES = 2000

type StoredEntry = { m: PinMark; ts: number }
type StoredMarks = Record<string, StoredEntry>
type Stored = { v: typeof STORAGE_VERSION; marks: StoredMarks }

/** Fired after any write so every mounted consumer re-reads. */
const CHANGE_EVENT = 'dealscope:map-pin-marks-changed'

/**
 * Identity for a pin.
 *
 * Keyed by address rather than `listing.id` because the id is provider-scoped
 * (a Zillow zpid one search, a RentCast id the next) while the backend's own
 * cross-source dedup is address-keyed. Marking a pin from a RentCast row must
 * still dim it when Zillow returns the same house.
 */
export function pinKey(listing: { address: string; zip_code?: string | null }): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const addr = normalize(listing.address ?? '')
  const zip = (listing.zip_code ?? '').trim()
  return zip ? `${addr}|${zip}` : addr
}

function read(): StoredMarks {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Stored> | null
    if (!parsed || parsed.v !== STORAGE_VERSION || !parsed.marks) return {}
    return parsed.marks
  } catch {
    return {}
  }
}

function write(marks: StoredMarks): void {
  if (typeof window === 'undefined') return
  let next = marks
  const keys = Object.keys(next)
  if (keys.length > MAX_ENTRIES) {
    const newest = keys
      .sort((a, b) => (next[b]?.ts ?? 0) - (next[a]?.ts ?? 0))
      .slice(0, MAX_ENTRIES)
    next = Object.fromEntries(newest.map((k) => [k, marks[k]]))
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: STORAGE_VERSION, marks: next }))
  } catch {
    /* private browsing / quota — marks are a convenience, not data */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function toMarkMap(stored: StoredMarks): Record<string, PinMark> {
  return Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, v.m]))
}

/**
 * Subscribe to the pin marks.
 *
 * `marks` maps {@link pinKey} to its mark. `setMark` with `null` clears.
 * Reads start empty and hydrate in an effect so SSR and the first client
 * paint agree.
 */
export function useMapPinMarks() {
  const [marks, setMarks] = useState<Record<string, PinMark>>({})

  useEffect(() => {
    const sync = () => setMarks(toMarkMap(read()))
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    // Another tab working the same market should agree.
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setMark = useCallback((key: string, mark: PinMark | null) => {
    if (!key) return
    const current = read()
    if (mark === null) {
      delete current[key]
    } else {
      current[key] = { m: mark, ts: Date.now() }
    }
    write(current)
  }, [])

  const clearAll = useCallback(() => write({}), [])

  return { marks, setMark, clearAll }
}

/** Mark a pin outside of React (used when navigating away to analyze it). */
export function markPinReviewed(listing: {
  address: string
  zip_code?: string | null
}): void {
  const key = pinKey(listing)
  if (!key) return
  const current = read()
  // Never downgrade an explicit "passed" into "reviewed".
  if (current[key]?.m === 'passed') return
  current[key] = { m: 'reviewed', ts: Date.now() }
  write(current)
}
