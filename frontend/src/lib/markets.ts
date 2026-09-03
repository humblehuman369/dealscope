/**
 * Server-side data access for the programmatic /markets pages.
 *
 * Reads the public /api/v1/markets endpoints straight from the backend (this
 * module must only be imported from server components, route handlers or
 * sitemap.ts). Responses are cached by Next's data cache for a day, matching
 * the backend's 24h Redis TTL and the pages' `revalidate = 86400`.
 *
 * A failed or malformed response resolves to `null` rather than throwing, so a
 * backend blip during a build or a revalidation degrades a state page to its
 * noindex fallback instead of failing the deploy.
 */

import { BACKEND_URL } from '@/lib/server-env'

export const MARKETS_REVALIDATE_SECONDS = 86400

export interface StateAssumptions {
  property_tax_rate: number
  rent_to_price_ratio: number
  appreciation_rate: number
  vacancy_rate: number
  is_state_specific: boolean
}

export interface CityCount {
  city: string
  count: number
}

export interface StateMarketSummary {
  code: string
  name: string
  slug: string
  lender_count: number
  buyer_count: number
  has_state_specific_assumptions: boolean
  indexable: boolean
}

export type MarketDataSection = 'assumptions' | 'lenders' | 'buyers'

export interface StateMarketDetail extends StateMarketSummary {
  assumptions: StateAssumptions
  buyer_cities: CityCount[]
  data_sections: MarketDataSection[]
  generated_at: string
}

interface StateMarketListResponse {
  states: StateMarketSummary[]
  generated_at: string
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!BACKEND_URL) return null
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: MARKETS_REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`[markets] fetch failed for ${path}: ${reason}`)
    return null
  }
}

export async function fetchStateMarkets(): Promise<StateMarketSummary[] | null> {
  const data = await fetchJson<StateMarketListResponse>('/api/v1/markets/states')
  return data?.states ?? null
}

export async function fetchStateMarket(slug: string): Promise<StateMarketDetail | null> {
  return fetchJson<StateMarketDetail>(`/api/v1/markets/states/${encodeURIComponent(slug)}`)
}

const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 })
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function formatPercent(value: number): string {
  return percent.format(value)
}

export function formatDollars(value: number): string {
  return dollars.format(value)
}

/** Reference price used to translate rates into dollars on the state pages. */
export const EXAMPLE_PRICE = 300_000

/**
 * The assumption table restated in dollars for one reference property. These
 * are the same figures DealGapIQ applies when a user analyzes a property in
 * the state, not market observations.
 */
export function assumptionsInDollars(a: StateAssumptions, price = EXAMPLE_PRICE) {
  const grossMonthlyRent = price * a.rent_to_price_ratio
  return {
    price,
    grossMonthlyRent,
    annualPropertyTax: price * a.property_tax_rate,
    annualVacancyLoss: grossMonthlyRent * 12 * a.vacancy_rate,
    vacancyWeeksPerYear: a.vacancy_rate * 52,
    firstYearAppreciation: price * a.appreciation_rate,
  }
}
