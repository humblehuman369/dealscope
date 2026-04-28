/**
 * Build Strategy URLs from Three Paths structures + persist last-applied payload.
 */

import { encodeScenario, type ScenarioPayloadV1 } from '@/lib/dealStructures/scenarioPayload'
import type { DealStructure } from '@/components/iq-verdict/ThreePathsPanel'

const LAST_KEY = 'dealscope_last_scenario_v1'
const SAVED_LIST_KEY = 'dealscope_saved_three_path_scenarios_v1'

export interface SavedThreePathScenario {
  label: string
  structureId: string
  savedAt: number
  address: string
  payload: ScenarioPayloadV1
}

/** Map backend pre_loaded_record keys into DealMaker session patch keys. */
export function preLoadedRecordToDealMakerPatch(levers: Record<string, unknown>): Record<string, unknown> {
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
  const extras = levers.pending_extras ?? levers.pendingExtras
  if (extras && typeof extras === 'object') {
    const ex = extras as Record<string, unknown>
    Object.assign(patch, ex)
    if (typeof ex.seller_carry_amount === 'number') patch.sellerFinancingAmount = ex.seller_carry_amount
    if (typeof ex.seller_carry_rate === 'number') patch.sellerInterestRate = ex.seller_carry_rate
    if (typeof ex.seller_carry_term_years === 'number') patch.sellerTermYears = ex.seller_carry_term_years
  }
  return patch
}

export function buildScenarioPayload(structure: DealStructure, pathIndex: number): ScenarioPayloadV1 {
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
    const prev = JSON.parse(localStorage.getItem(SAVED_LIST_KEY) || '[]') as SavedThreePathScenario[]
    const next = [entry, ...prev.filter((e) => e.structureId !== entry.structureId || e.savedAt !== entry.savedAt)].slice(
      0,
      12,
    )
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
