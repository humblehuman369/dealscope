/**
 * How this closes tags. Maps engine fields only — no arithmetic in the card.
 *
 * Closes the gap ← `breakeven.closesGapAlone` (blend: `pending_extras.blended_closes_gap`)
 * Sellers / Market / You decide ← `negotiability.rating`
 */

import type {
  DealStructure,
  DealStructuresPayload,
  NegotiabilityRating,
  WayUnavailable,
} from '@/components/iq-verdict/PathOptionCard'
import {
  WAY_NAMES,
  defaultAdvice,
  describePlay,
  findPathForFamily,
  isBreakevenFamily,
  needsBlend,
  pickBackupPath,
  pickLeadPath,
  unavailableLine,
  type BreakevenFamily,
  type FourWayFamily,
} from '@/components/iq-verdict/make-it-work/fourWays'

/** Spec order for How this closes: Price, Terms, Income, Equity. */
const CLOSES_ROW_ORDER: readonly BreakevenFamily[] = [
  'price',
  'financing',
  'income',
  'capital_stack',
]

export type ClosesTone = 'yes' | 'partly'
export type ConfidenceTone = 'often' | 'sometimes' | 'rarely' | 'decide'

export interface LeverTag {
  text: string
  tone: ClosesTone | ConfidenceTone
}

export interface HowThisClosesRow {
  id: FourWayFamily
  name: string
  startHere: boolean
  closesTag: LeverTag | null
  confidenceTag: LeverTag | null
  detail: string
}

const RATING_TO_ADVERB: Record<Exclude<NegotiabilityRating, 'your_call'>, ConfidenceTone> = {
  high: 'often',
  medium: 'sometimes',
  low: 'rarely',
}

export function closesGapFromAlone(closesGapAlone: boolean): LeverTag {
  return closesGapAlone
    ? { text: 'Closes the gap: yes', tone: 'yes' }
    : { text: 'Closes the gap: partly', tone: 'partly' }
}

export function confidenceTagFromRating(
  family: FourWayFamily,
  rating: NegotiabilityRating,
): LeverTag {
  if (family === 'capital_stack' || rating === 'your_call') {
    return { text: 'You decide', tone: 'decide' }
  }
  const adverb = RATING_TO_ADVERB[rating]
  const prefix = family === 'income' ? 'Market says yes' : 'Sellers say yes'
  return { text: `${prefix}: ${adverb}`, tone: adverb }
}

function readBlendedClosesGap(structure: DealStructure): boolean | null {
  const extras = structure.preLoadedRecord?.pending_extras
  if (!extras || typeof extras !== 'object') return null
  const flag = (extras as Record<string, unknown>).blended_closes_gap
  return typeof flag === 'boolean' ? flag : null
}

function closesTagForRow(
  family: FourWayFamily,
  structure: DealStructure | null,
  unavailable: WayUnavailable | null,
): LeverTag | null {
  if (family === 'blended') {
    if (!structure) return null
    const flag = readBlendedClosesGap(structure)
    if (flag == null) return null
    return closesGapFromAlone(flag)
  }
  if (structure?.breakeven) return closesGapFromAlone(structure.breakeven.closesGapAlone)
  if (unavailable?.reason === 'insufficient') return closesGapFromAlone(false)
  if (unavailable?.reason === 'not_needed') return closesGapFromAlone(true)
  return null
}

function confidenceTagForRow(
  family: FourWayFamily,
  structure: DealStructure | null,
  termsRating: NegotiabilityRating | null,
): LeverTag | null {
  if (family === 'blended') {
    return termsRating ? confidenceTagFromRating('financing', termsRating) : null
  }
  const rating = structure?.negotiability?.rating
  return rating ? confidenceTagFromRating(family, rating) : null
}

function rowDetail(
  family: FourWayFamily,
  structure: DealStructure | null,
  unavailable: WayUnavailable | null,
): string {
  if (family === 'blended') {
    return structure?.headline || structure?.summary || ''
  }
  if (structure?.breakeven && isBreakevenFamily(family)) {
    return describePlay(family, structure.breakeven)
  }
  if (unavailable && isBreakevenFamily(family)) {
    return unavailableLine(family, unavailable.reason, unavailable.message)
  }
  return structure?.headline || ''
}

export function howThisClosesParagraph(payload: DealStructuresPayload): string {
  const summary = payload.breakevenSummary
  const lead = pickLeadPath(payload.paths)
  const backup = pickBackupPath(payload.paths, lead)
  if (payload.blendRecommendation && needsBlend(summary, payload.paths)) {
    return `Most likely close: a blend. ${payload.blendRecommendation}`
  }
  return defaultAdvice(summary, lead, backup)
}

export function buildHowThisClosesRows(payload: DealStructuresPayload): HowThisClosesRow[] {
  const lead = pickLeadPath(payload.paths)
  const unavailableByFamily = new Map(
    (payload.unavailableWays ?? []).map((w) => [w.family, w] as const),
  )
  const termsRating = findPathForFamily(payload.paths, 'financing')?.negotiability?.rating ?? null
  const rows: HowThisClosesRow[] = []

  const blended = findPathForFamily(payload.paths, 'blended')
  if (blended) {
    rows.push({
      id: 'blended',
      name: 'Blend',
      startHere: lead?.family === 'blended',
      closesTag: closesTagForRow('blended', blended, null),
      confidenceTag: confidenceTagForRow('blended', blended, termsRating),
      detail: rowDetail('blended', blended, null),
    })
  }

  for (const family of CLOSES_ROW_ORDER) {
    const structure = findPathForFamily(payload.paths, family)
    const unavailable = unavailableByFamily.get(family) ?? null
    rows.push({
      id: family,
      name: WAY_NAMES[family],
      startHere: lead?.family === family,
      closesTag: closesTagForRow(family, structure, unavailable),
      confidenceTag: confidenceTagForRow(family, structure, termsRating),
      detail: rowDetail(family, structure, unavailable),
    })
  }

  return rows
}

export function startHereRowId(rows: readonly HowThisClosesRow[]): FourWayFamily | null {
  return rows.find((row) => row.startHere)?.id ?? rows[0]?.id ?? null
}
