/**
 * Single mapper for API `deal_structures` → UI `DealStructure[]`.
 * Used by Discovery and Strategy so Options 1–4 stay identical.
 */

import type {
  BreakevenFact,
  BreakevenSummary,
  DealStructure,
  DealStructuresPayload,
  Negotiability,
  NegotiabilityRating,
  WayUnavailable,
  WayUnavailableReason,
} from '@/components/iq-verdict/FourPathsPanel'

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

const RATINGS: readonly NegotiabilityRating[] = ['high', 'medium', 'low', 'your_call']

function mapBreakeven(raw: unknown): BreakevenFact | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const resultAmount = finiteOrNull(r.result_amount ?? r.resultAmount)
  if (resultAmount == null) return null
  return {
    changePct: finiteOrNull(r.change_pct ?? r.changePct),
    changeAmount: finiteOrNull(r.change_amount ?? r.changeAmount),
    resultAmount,
    resultLabel: String(r.result_label ?? r.resultLabel ?? ''),
    closesGapAlone: (r.closes_gap_alone ?? r.closesGapAlone) !== false,
    termsNote: (r.terms_note ?? r.termsNote ?? null) as string | null,
  }
}

function mapNegotiability(raw: unknown): Negotiability | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rating = r.rating
  if (typeof rating !== 'string' || !RATINGS.includes(rating as NegotiabilityRating)) return null
  return {
    rating: rating as NegotiabilityRating,
    score: finiteOrNull(r.score) ?? 0,
    reasons: Array.isArray(r.reasons) ? r.reasons.map(String) : [],
  }
}

function mapSummary(raw: unknown): BreakevenSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const listPrice = finiteOrNull(r.list_price ?? r.listPrice)
  const gapAmount = finiteOrNull(r.gap_amount ?? r.gapAmount)
  const gapPct = finiteOrNull(r.gap_pct ?? r.gapPct)
  const monthlyShortfall = finiteOrNull(r.monthly_shortfall ?? r.monthlyShortfall)
  const incomeValue = finiteOrNull(r.income_value ?? r.incomeValue)
  const targetBuyPrice = finiteOrNull(r.target_buy_price ?? r.targetBuyPrice)
  if (
    listPrice == null ||
    gapAmount == null ||
    gapPct == null ||
    monthlyShortfall == null ||
    incomeValue == null ||
    targetBuyPrice == null
  ) {
    return null
  }
  return {
    listPrice,
    // Older payloads predate this field; 0 reads as "no anchor" downstream, so
    // the cash-to-close comparison is simply omitted rather than wrong.
    baselineCashRequired: finiteOrNull(r.baseline_cash_required ?? r.baselineCashRequired) ?? 0,
    gapAmount,
    gapPct,
    monthlyShortfall,
    incomeValue,
    targetBuyPrice,
  }
}

const UNAVAILABLE_REASONS: readonly WayUnavailableReason[] = ['not_needed', 'insufficient', 'no_data']

function mapUnavailableWays(raw: unknown): WayUnavailable[] {
  if (!Array.isArray(raw)) return []
  const out: WayUnavailable[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const r = entry as Record<string, unknown>
    const reason = r.reason
    const family = r.family
    const message = r.message
    if (typeof family !== 'string' || typeof message !== 'string' || !message) continue
    if (typeof reason !== 'string' || !UNAVAILABLE_REASONS.includes(reason as WayUnavailableReason)) continue
    out.push({ family, reason: reason as WayUnavailableReason, message })
  }
  return out
}

export function mapDealStructurePath(p: Record<string, unknown>): DealStructure {
  const raw = p as Record<string, any>
  return {
    id: String(raw.id ?? ''),
    family: raw.family,
    familyLabel: (raw.family_label ?? raw.familyLabel ?? '') as string,
    realismLabel: (raw.realism_label ?? raw.realismLabel ?? '') as string,
    headline: (raw.headline ?? '') as string,
    bullets: Array.isArray(raw.bullets) ? (raw.bullets as string[]) : [],
    summary: (raw.summary ?? '') as string,
    levers: (raw.levers ?? []).map((lv: Record<string, unknown>) => ({
      label: String(lv.label ?? ''),
      beforeLabel: String(lv.before_label ?? lv.beforeLabel ?? ''),
      afterLabel: String(lv.after_label ?? lv.afterLabel ?? ''),
      deltaLabel: (lv.delta_label ?? lv.deltaLabel ?? null) as string | null,
    })),
    monthlySavings: (raw.monthly_savings ?? raw.monthlySavings ?? 0) as number,
    cashRequired: (raw.cash_required ?? raw.cashRequired ?? 0) as number,
    rankingScore: (raw.ranking_score ?? raw.rankingScore ?? 0) as number,
    pitchScript: (raw.pitch_script ?? raw.pitchScript ?? null) as string | null,
    caveat: (raw.caveat ?? null) as string | null,
    selectionReason: (raw.selection_reason ?? raw.selectionReason ?? null) as string | null,
    preLoadedRecord: (raw.pre_loaded_record ?? raw.preLoadedRecord ?? null) as Record<
      string,
      unknown
    > | null,
    breakeven: mapBreakeven(raw.breakeven),
    negotiability: mapNegotiability(raw.negotiability),
  }
}

export function mapDealStructuresFromApi(
  raw: Record<string, unknown> | null | undefined,
): DealStructuresPayload | null {
  if (!raw) return null
  const paths = (Array.isArray(raw.paths) ? raw.paths : []).map((p) =>
    mapDealStructurePath(p as Record<string, unknown>),
  )
  const hasPathsFlag = raw.has_paths ?? raw.hasPaths
  const hasPaths =
    typeof hasPathsFlag === 'boolean' ? hasPathsFlag : paths.length > 0
  const blend = raw.blend_recommendation ?? raw.blendRecommendation
  return {
    paths,
    narrativeParagraphs: (raw.narrative_paragraphs ?? raw.narrativeParagraphs ?? []) as string[],
    hasPaths,
    breakevenSummary: mapSummary(raw.breakeven_summary ?? raw.breakevenSummary),
    blendRecommendation: typeof blend === 'string' && blend ? blend : null,
    unavailableWays: mapUnavailableWays(raw.unavailable_ways ?? raw.unavailableWays),
  }
}
