/**
 * Verdict sentence and seller-read copy. Values come from the worksheet / engine.
 * Do not invent numbers here.
 */

export type SellerPath = 'price' | 'terms' | 'blend'

export const VERDICT_WHY =
  'Target Buy is the price where this house pays you at the standard terms: 20% down, 6.0%, 30 years, 4% vacancy. The seller read comes from the signals below. Every number here is the worksheet\'s number.'

export const SOURCE_STATUS_WHY =
  'These are the same sources the Math tab lists. A source counts when it returned a value for this house. Unavailable means that source had no data — nothing is guessed.'

export const VERDICT_TIPS = [
  "First time here? The red number is the seller's price.",
  'The yellow number is where rent just covers the costs.',
  'The green number is the price that pays you. A bigger gap means more room to make a deal.',
] as const

export const VERDICT_TIPS_FOOTER = 'These three tips show once.'

export const NUMBER_LABELS = {
  market: 'Market price. What it is listed for.',
  income: 'Income value. The most you can pay and still break even.',
  target: 'Target buy. The price that pays you. Aim here.',
} as const

const PATH_CLAUSE: Record<SellerPath, string> = {
  price: 'this seller will most likely take a real price cut.',
  terms: 'this seller will most likely carry part of the price.',
  blend: 'this seller will most likely take a smaller price cut plus a small seller-carried second.',
}

const NO_SIGNALS = 'This seller has shown no sign of moving yet.'

/** $625,999 → $626K. Worksheet dollars, rounded to the nearest thousand. */
export function formatPriceShort(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000
    const rounded = Math.round(millions * 10) / 10
    return `$${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`
  }
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

export function formatMoneyExact(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

/** Absolute gap for the sentence: "That is a 27.5% gap." */
export function formatGapPct(gap: number): string {
  if (!Number.isFinite(gap)) return '0.0'
  return Math.abs(gap).toFixed(1)
}

export function sellerPathFromDealStructures(input: {
  blendRecommendation: string | null | undefined
  families: readonly string[]
}): SellerPath | null {
  if (input.blendRecommendation) return 'blend'
  if (input.families.includes('blended')) return 'blend'
  if (input.families.includes('price')) return 'price'
  if (input.families.includes('financing')) return 'terms'
  return null
}

export function formatSellerRead(
  input: {
    priceCuts: number
    daysOnMarket: number | null
  },
  path: SellerPath | null,
): string {
  const parts: string[] = []
  if (input.priceCuts > 0) parts.push(`${input.priceCuts} price cuts`)
  if (input.daysOnMarket != null && input.daysOnMarket > 0) {
    parts.push(`${input.daysOnMarket} days`)
  }
  if (parts.length === 0) return NO_SIGNALS
  const clause = path ? PATH_CLAUSE[path] : PATH_CLAUSE.price
  return `After ${parts.slice(0, 2).join(' and ')}, ${clause}`
}

export function formatVerdictSentence(input: {
  listPrice: number
  targetBuy: number
  gapPct: number
  sellerRead: string
}): string {
  return `Listed at ${formatPriceShort(input.listPrice)}. Worth about ${formatPriceShort(input.targetBuy)} to you as a rental. That is a ${formatGapPct(input.gapPct)}% gap. ${input.sellerRead}`
}

export function formatCallWhy(input: {
  gapPct: number
  fired: readonly string[]
}): string {
  const gap = formatGapPct(input.gapPct)
  if (input.fired.length === 0) {
    return `The gap is ${gap}% and no seller signals fired.`
  }
  return `The gap is ${gap}% and the seller signals are ${input.fired.join(', ')}.`
}
