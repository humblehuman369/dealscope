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
  /** state_lender_count + nationwide_lender_count. */
  lender_count: number
  /** Active lenders licensed in this state that are not nationwide shops. */
  state_lender_count: number
  /** Active nationwide lenders; the same figure on every state. */
  nationwide_lender_count: number
  buyer_count: number
  has_state_specific_assumptions: boolean
  /**
   * Set by the backend: true only when the state has its own assumptions row
   * and at least one in-state directory section. Drives robots, the sitemap,
   * and whether the page emits a Dataset node.
   */
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

/**
 * The frontend and backend deploy independently, so a build can read a payload
 * that predates the in-state / nationwide lender split. Missing fields resolve
 * to "all nationwide": that understates in-state licensing for a day at most,
 * whereas the reverse would print the padded total as licensed in the state.
 */
function withLenderSplit<T extends StateMarketSummary>(summary: T): T {
  return {
    ...summary,
    state_lender_count: summary.state_lender_count ?? 0,
    nationwide_lender_count: summary.nationwide_lender_count ?? summary.lender_count ?? 0,
  }
}

export async function fetchStateMarkets(): Promise<StateMarketSummary[] | null> {
  const data = await fetchJson<StateMarketListResponse>('/api/v1/markets/states')
  return data?.states ? data.states.map(withLenderSplit) : null
}

export async function fetchStateMarket(slug: string): Promise<StateMarketDetail | null> {
  const data = await fetchJson<StateMarketDetail>(`/api/v1/markets/states/${encodeURIComponent(slug)}`)
  return data ? withLenderSplit(data) : null
}

const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 })
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function formatPercent(value: number): string {
  return percent.format(value)
}

export function formatDollars(value: number): string {
  return dollars.format(value)
}

/**
 * Heading and intro for the assumptions section. A state without its own
 * MARKET_ADJUSTMENTS row shows the national baseline, and the copy must say
 * so in the heading itself — not only in the fine print — so neither a reader
 * nor a crawler takes the table for state-scoped data.
 */
export function assumptionsSectionCopy(stateName: string, isStateSpecific: boolean) {
  if (isStateSpecific) {
    return {
      heading: `What DealGapIQ assumes for ${stateName} properties`,
      intro: `${stateName} has its own row in the DealGapIQ market table. Every input can be overridden per deal.`,
    }
  }
  return {
    heading: `National baseline assumptions (no ${stateName}-specific adjustments yet)`,
    intro: `DealGapIQ has not set ${stateName}-specific overrides. The table below is the national baseline applied to every state without its own row, and every input can be overridden per deal.`,
  }
}

/**
 * Plain-English directory counts that keep in-state and nationwide lenders
 * apart. Returns an empty list when the directories hold nothing for the
 * state, so callers can drop the sentence rather than print zeros.
 */
export function directoryCountPhrases(
  stateName: string,
  market: Pick<StateMarketSummary, 'state_lender_count' | 'nationwide_lender_count' | 'buyer_count'>,
): string[] {
  const phrases: string[] = []
  if (market.state_lender_count > 0) {
    const lenders = market.state_lender_count === 1 ? 'hard money lender' : 'hard money lenders'
    const nationwide =
      market.nationwide_lender_count > 0 ? ` (plus ${market.nationwide_lender_count} nationwide)` : ''
    phrases.push(`${market.state_lender_count} ${lenders} licensed in ${stateName}${nationwide}`)
  } else if (market.nationwide_lender_count > 0) {
    phrases.push(`${market.nationwide_lender_count} nationwide hard money lenders that lend in ${stateName}`)
  }
  if (market.buyer_count > 0) {
    const buyers = market.buyer_count === 1 ? 'verified cash buyer' : 'verified cash buyers'
    phrases.push(`${market.buyer_count} ${buyers} based in ${stateName}`)
  }
  return phrases
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
