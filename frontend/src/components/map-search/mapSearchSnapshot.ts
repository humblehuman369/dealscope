/**
 * Map-search session snapshot persisted to `sessionStorage`.
 *
 * Tab-scoped on purpose: a fresh tab/window starts with a clean map. The
 * snapshot survives soft navigations (Map -> Verdict -> back) and hard
 * reloads within the same tab.
 *
 * Storage keys are namespaced under `dealscope:` to match the rest of the
 * app's localStorage/sessionStorage usage. Schema is versioned so future
 * shape changes can invalidate stale entries instead of crashing on parse.
 */

import type { MapSearchFilters } from '@/hooks/useMapSearch'

export const MAP_SNAPSHOT_KEY = 'dealscope:map-search-snapshot'
const SNAPSHOT_VERSION = 1

export type MapViewport = {
  lat: number
  lng: number
  zoom: number
}

export type MapSnapshotV1 = {
  v: typeof SNAPSHOT_VERSION
  ts: number
  viewport: MapViewport | null
  filters: Partial<MapSearchFilters> | null
  // Stored as `[lat, lng]` pairs to match `polygon` shape used inside
  // `useMapSearch` and the map's drawing-manager output.
  polygon: number[][] | null
  viewMode: 'map' | 'list' | null
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function sanitizeViewport(input: unknown): MapViewport | null {
  if (!input || typeof input !== 'object') return null
  const v = input as Partial<MapViewport>
  if (!isFiniteNumber(v.lat) || !isFiniteNumber(v.lng) || !isFiniteNumber(v.zoom)) return null
  return { lat: v.lat, lng: v.lng, zoom: v.zoom }
}

function sanitizePolygon(input: unknown): number[][] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const out: number[][] = []
  for (const pt of input) {
    if (!Array.isArray(pt) || pt.length < 2) return null
    const lat = pt[0]
    const lng = pt[1]
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null
    out.push([lat, lng])
  }
  // A polygon needs at least 3 vertices to be meaningful.
  return out.length >= 3 ? out : null
}

function sanitizeFilters(input: unknown): Partial<MapSearchFilters> | null {
  if (!input || typeof input !== 'object') return null
  // Trust the shape loosely — `useMapSearch` will merge with DEFAULT_FILTERS
  // on hydrate, so any unknown keys are harmless.
  return input as Partial<MapSearchFilters>
}

function sanitizeViewMode(input: unknown): 'map' | 'list' | null {
  return input === 'map' || input === 'list' ? input : null
}

export function readMapSnapshot(): MapSnapshotV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(MAP_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MapSnapshotV1 & { mobileView?: unknown }> | null
    if (!parsed || parsed.v !== SNAPSHOT_VERSION) return null
    return {
      v: SNAPSHOT_VERSION,
      ts: typeof parsed.ts === 'number' ? parsed.ts : Date.now(),
      viewport: sanitizeViewport(parsed.viewport),
      filters: sanitizeFilters(parsed.filters),
      polygon: sanitizePolygon(parsed.polygon),
      viewMode: sanitizeViewMode(parsed.viewMode ?? parsed.mobileView),
    }
  } catch {
    return null
  }
}

/**
 * Read existing snapshot, merge in `partial`, persist.
 *
 * Each owner (MapSearchView writes viewport / viewMode, useMapSearch
 * writes filters / polygon) calls this with only its slice — the merge
 * preserves slices owned by the other writers.
 */
export function writeMapSnapshot(partial: Partial<Omit<MapSnapshotV1, 'v' | 'ts'>>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = readMapSnapshot()
    const next: MapSnapshotV1 = {
      v: SNAPSHOT_VERSION,
      ts: Date.now(),
      viewport: 'viewport' in partial ? (partial.viewport ?? null) : (existing?.viewport ?? null),
      filters: 'filters' in partial ? (partial.filters ?? null) : (existing?.filters ?? null),
      polygon: 'polygon' in partial ? (partial.polygon ?? null) : (existing?.polygon ?? null),
      viewMode: 'viewMode' in partial ? (partial.viewMode ?? null) : (existing?.viewMode ?? null),
    }
    sessionStorage.setItem(MAP_SNAPSHOT_KEY, JSON.stringify(next))
  } catch {
    /* private browsing / quota — silently drop */
  }
}

export function clearMapSnapshot(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(MAP_SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * True when the snapshot has any meaningful state worth restoring. Used by
 * the Verdict page to decide whether to render the contextual "Back to map"
 * breadcrumb.
 */
export function hasRestorableMapSnapshot(): boolean {
  const snap = readMapSnapshot()
  if (!snap) return false
  if (snap.viewport) return true
  if (snap.polygon) return true
  if (snap.filters && Object.keys(snap.filters).length > 0) return true
  return false
}
