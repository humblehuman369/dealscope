/**
 * PR C (fix/map-card-see-the-verdict) — NEW COPY for Brad to approve before merge.
 * Do not scatter these strings.
 */
export const MAP_CARD_COPY = {
  seeTheVerdict: 'See the verdict',
  findingMotivatedSellersIn: (city: string) => `Finding motivated sellers in ${city}...`,
} as const

/** First comma-separated segment of the map `q` / label, used only for loading copy. */
export function cityLabelFromQuery(q: string | null | undefined): string {
  if (!q) return ''
  return q.split(',')[0]?.trim() ?? ''
}

/** Console-only first-pin timing. `search_started` fires on the homepage before pins exist. */
export function logMapFirstPinMs(ms: number): void {
  // eslint-disable-next-line no-console -- PR C: no tracking property fits; console-only fallback
  console.info('map_first_pin_ms', ms)
}
