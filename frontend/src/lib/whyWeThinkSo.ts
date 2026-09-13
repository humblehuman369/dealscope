/**
 * Why we think so — existing Key Insights, ordered. Text is not rewritten here.
 */

export const WHY_SIGNAL_KINDS = ['dom', 'price_cuts', 'occupancy', 'distress', 'rest'] as const
export type WhySignalKind = (typeof WHY_SIGNAL_KINDS)[number]

export interface WhySignal {
  id: string
  kind: WhySignalKind
  title: string
  detail: string
}

const KIND_ORDER: Record<WhySignalKind, number> = {
  dom: 0,
  price_cuts: 1,
  occupancy: 2,
  distress: 3,
  rest: 4,
}

export function classifySignalKind(title: string): WhySignalKind {
  const t = title.toLowerCase()
  if (/days on market|listed over a year/.test(t)) return 'dom'
  if (/price (cut|reduction)/.test(t)) return 'price_cuts'
  if (/str occup/.test(t)) return 'rest'
  if (/owner-occup|non-owner|absentee owner|not owner-occupied/.test(t)) return 'occupancy'
  if (/foreclos|auction|bank-owned|reo|distress|expired|withdrawn|pre-foreclosure/.test(t)) {
    return 'distress'
  }
  return 'rest'
}

export function orderWhySignals(signals: readonly WhySignal[]): WhySignal[] {
  return signals
    .map((signal, index) => ({ signal, index }))
    .sort((a, b) => KIND_ORDER[a.signal.kind] - KIND_ORDER[b.signal.kind] || a.index - b.index)
    .map(({ signal }) => signal)
}

export function splitWhySignals(
  signals: readonly WhySignal[],
  visibleCount = 3,
): { visible: WhySignal[]; rest: WhySignal[] } {
  const ordered = orderWhySignals(signals)
  return {
    visible: ordered.slice(0, visibleCount),
    rest: ordered.slice(visibleCount),
  }
}

export function seeMoreSignalsLabel(count: number): string {
  return `See ${count} more signals`
}
