/**
 * Cash buyer directory API helpers (/api/buyers).
 */

export type BuyerSearchMode = 'city' | 'county' | 'zip'

export interface AppliedBuyerSearch {
  mode: BuyerSearchMode
  city: string
  stateCode: string
  county: string
  zip: string
}

export interface BuyerListResponse {
  buyers: unknown[]
  total: number
  page: number
  limit: number
  totalPages: number
  /** True on trial responses — contact fields are blanked; reveal via detail endpoint. */
  contactsRedacted?: boolean
}

export interface BuyerStatsResponse {
  total: number
  byState: Array<{ state: string; count: number }>
}

export function buildBuyersListPath(
  applied: AppliedBuyerSearch,
  strategy: string,
  page: number,
  limit: number,
): string {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (strategy !== 'all') {
    params.set('strategy', strategy)
  }
  if (applied.mode === 'city') {
    if (applied.city.trim()) params.set('city', applied.city.trim())
    if (applied.stateCode.trim()) params.set('state', applied.stateCode.trim())
  } else if (applied.mode === 'county') {
    if (applied.county.trim()) params.set('county', applied.county.trim())
  } else if (applied.mode === 'zip' && applied.zip.trim()) {
    params.set('zip', applied.zip.trim())
  }
  return `/api/buyers?${params.toString()}`
}

export function formatBuyerTotal(total: number): string {
  return total.toLocaleString('en-US')
}

/** Server-side export (paid only; 200 records/export, 1,000/billing cycle). */
export function buildBuyersExportPath(
  applied: AppliedBuyerSearch,
  strategy: string,
  fmt: 'csv' | 'print',
): string {
  const params = new URLSearchParams()
  params.set('fmt', fmt)
  if (strategy !== 'all') {
    params.set('strategy', strategy)
  }
  if (applied.mode === 'city') {
    if (applied.city.trim()) params.set('city', applied.city.trim())
    if (applied.stateCode.trim()) params.set('state', applied.stateCode.trim())
  } else if (applied.mode === 'county') {
    if (applied.county.trim()) params.set('county', applied.county.trim())
  } else if (applied.mode === 'zip' && applied.zip.trim()) {
    params.set('zip', applied.zip.trim())
  }
  return `/api/buyers/export?${params.toString()}`
}
