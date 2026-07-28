/**
 * Location lookup helpers (/api/geo).
 *
 * Directory coverage data is state-level, so a ZIP is only ever used to work
 * out which state to filter by — never to imply ZIP-level precision.
 */

export interface ZipLocation {
  zip: string
  state: string
  /** Null for PO-box-only and single-point ZIPs, which have no Census ZCTA. */
  county: string | null
  /** Every county the ZIP touches, largest by land area first. */
  counties: string[]
}

/** Return a 5-digit ZIP, or null when the input isn't one yet. Accepts ZIP+4. */
export function normalizeZip(raw: string): string | null {
  const candidate = raw.trim().split('-')[0]
  return /^\d{5}$/.test(candidate) ? candidate : null
}

export function buildZipLookupPath(zip: string): string {
  return `/api/geo/zip/${encodeURIComponent(zip)}`
}

/** "Palm Beach County, FL", falling back to the state when no county is known. */
export function formatZipLocation(location: ZipLocation): string {
  return location.county ? `${location.county}, ${location.state}` : location.state
}
