/**
 * Build Strategy URLs from Three Paths structures + persist last-applied payload.
 */

import { encodeScenario, type ScenarioPayloadV1 } from '@/lib/dealStructures/scenarioPayload'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'

const LAST_KEY = 'dealscope_last_scenario_v1'
const SAVED_LIST_KEY = 'dealscope_saved_three_path_scenarios_v1'

export interface SavedThreePathScenario {
  label: string
  structureId: string
  savedAt: number
  address: string
  payload: ScenarioPayloadV1
}

/**
 * Keys this mapper writes into `inlineOverrides`. Used by `clearAppliedPath`
 * to know which entries to strip when the user resets to baseline.
 */
export const PATH_PATCH_FIELD_KEYS = [
  // canonical inlineOverrides keys
  'buyPrice',
  'purchasePrice',
  'listPrice',
  'monthlyRent',
  'downPayment',
  'interestRate',
  'sellerFinancingAmount',
  'sellerInterestRate',
  'sellerTermYears',
  // pass-through extras (informational / non-slider)
  'isOwnerOccupied',
  'is_owner_occupied',
  'seller_carry_amount',
  'seller_carry_rate',
  'seller_carry_term_years',
  'seller_carry_balloon_years',
  'down_payment_pct_override',
  'sub2_heuristic_rate',
  'sub2_heuristic_balance',
  'sub2_from_records',
  'assumable_pv_estimate',
  'existing_loan_type',
  'rate_buydown_y1_pct_offset',
  'rate_buydown_y2_pct_offset',
  'fha_modeled_rent_share',
  'blended_closes_gap',
  'three_paths_structure_id',
  'threePathsLabel',
] as const

/**
 * Map backend `pre_loaded_record` keys into the canonical `inlineOverrides`
 * shape used by the Strategy / DealMaker worksheet.
 *
 * Unit notes:
 * - `inlineOverrides.downPayment` is stored as **integer percent** (e.g. 30 for 30%).
 *   The slider FIELD_MAP scales the slider's decimal value (0.30) by 100, so the
 *   mapper must do the same when surfacing `down_payment_pct_override` (decimal).
 * - `inlineOverrides.interestRate` is stored as a **decimal** (e.g. 0.07).
 *   `sub2_heuristic_rate` is already decimal; pass through as-is.
 * - Seller-carry amount is dollars; rate is decimal; term is years.
 */
export function preLoadedRecordToDealMakerPatch(
  levers: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  const cpp = levers.custom_purchase_price ?? levers.customPurchasePrice
  if (typeof cpp === 'number' && cpp > 0) {
    patch.buyPrice = cpp
    patch.purchasePrice = cpp
    patch.listPrice = cpp
  }
  const cre = levers.custom_rent_estimate ?? levers.customRentEstimate
  if (typeof cre === 'number' && cre >= 0) {
    patch.monthlyRent = cre
  }

  // Top-level seller-carry (e.g. Morby Method places these outside pending_extras).
  if (typeof levers.seller_carry_amount === 'number')
    patch.sellerFinancingAmount = levers.seller_carry_amount
  if (typeof levers.seller_carry_rate === 'number')
    patch.sellerInterestRate = levers.seller_carry_rate
  if (typeof levers.seller_carry_term_years === 'number')
    patch.sellerTermYears = levers.seller_carry_term_years

  // Top-level owner-occupied flag (FHA House Hack).
  if (typeof levers.is_owner_occupied === 'boolean') {
    patch.isOwnerOccupied = levers.is_owner_occupied
    patch.is_owner_occupied = levers.is_owner_occupied
  }

  const extras = levers.pending_extras ?? levers.pendingExtras
  if (extras && typeof extras === 'object') {
    const ex = extras as Record<string, unknown>
    // Pass-through everything (preserves informational keys that don't have a slider).
    Object.assign(patch, ex)

    if (typeof ex.seller_carry_amount === 'number')
      patch.sellerFinancingAmount = ex.seller_carry_amount
    if (typeof ex.seller_carry_rate === 'number') patch.sellerInterestRate = ex.seller_carry_rate
    if (typeof ex.seller_carry_term_years === 'number')
      patch.sellerTermYears = ex.seller_carry_term_years

    // Larger-down: backend emits a decimal (0.30); inlineOverrides.downPayment is integer percent.
    if (typeof ex.down_payment_pct_override === 'number') {
      patch.downPayment = ex.down_payment_pct_override * 100
    }

    // Sub2: assumed rate is decimal; inlineOverrides.interestRate is decimal too.
    if (typeof ex.sub2_heuristic_rate === 'number') {
      patch.interestRate = ex.sub2_heuristic_rate
    }

    // Owner-occupied may also live inside extras in some templates.
    if (typeof ex.is_owner_occupied === 'boolean') {
      patch.isOwnerOccupied = ex.is_owner_occupied
    }
  }

  return patch
}

export function buildScenarioPayload(
  structure: DealStructure,
  pathIndex: number,
): ScenarioPayloadV1 {
  const labelBase = structure.familyLabel || structure.headline || 'Path'
  const label = `Path ${pathIndex + 1} — ${labelBase}`
  const raw = structure.preLoadedRecord ?? {}
  return {
    v: 1,
    structureId: structure.id,
    family: structure.family,
    label,
    levers: { ...raw },
  }
}

export function writeLastAppliedScenario(payload: ScenarioPayloadV1): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function readLastAppliedScenario(): ScenarioPayloadV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ScenarioPayloadV1
    if (parsed?.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function appendSavedThreePathScenario(entry: SavedThreePathScenario): void {
  if (typeof window === 'undefined') return
  try {
    const prev = JSON.parse(
      localStorage.getItem(SAVED_LIST_KEY) || '[]',
    ) as SavedThreePathScenario[]
    const next = [
      entry,
      ...prev.filter((e) => e.structureId !== entry.structureId || e.savedAt !== entry.savedAt),
    ].slice(0, 12)
    localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function buildStrategyUrlWithScenario(opts: {
  address: string
  structure: DealStructure
  pathIndex: number
  condition?: string | null
  location?: string | null
}): string {
  const payload = buildScenarioPayload(opts.structure, opts.pathIndex)
  const encoded = encodeScenario(payload)
  writeLastAppliedScenario(payload)

  const params = new URLSearchParams({ address: opts.address, scenario: encoded })
  if (opts.condition) params.set('condition', opts.condition)
  if (opts.location) params.set('location', opts.location)

  return `/strategy?${params.toString()}`
}
