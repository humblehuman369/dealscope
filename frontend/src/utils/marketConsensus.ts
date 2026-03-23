import type { IQEstimateSources, DataSourceId } from '@/components/iq-verdict/IQEstimateSelector'
import type { AppraisalResult, RentAppraisalResult } from '@/utils/appraisalCalculations'
import { SOURCE_META } from '@/utils/propertySourceMapper'

// ============================================
// TYPES
// ============================================

export type DivergenceLevel = 'low' | 'medium' | 'high'
export type ConfidenceTier = 'strong' | 'moderate' | 'weak'
export type UnderwritingMode = 'conservative' | 'balanced' | 'upside'

export interface SourceMarker {
  id: DataSourceId | 'comps'
  label: string
  color: string
  value: number
}

export interface ConsensusResult {
  markers: SourceMarker[]
  median: number
  q1: number
  q3: number
  min: number
  max: number
  iqr: number
  spread: number
  divergence: DivergenceLevel
  divergencePct: number
  confidenceTier: ConfidenceTier
  sourceCount: number
  compValue: number | null
  modes: {
    conservative: number
    balanced: number
    upside: number
  }
}

// ============================================
// MATH HELPERS
// ============================================

function sortedValues(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b)
}

function median(sorted: number[]): number {
  const n = sorted.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function quartile(sorted: number[], q: 0.25 | 0.75): number {
  if (sorted.length < 2) return sorted[0] ?? 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  const frac = pos - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

// ============================================
// CONSENSUS BUILDER
// ============================================

/**
 * Builds a consensus result from source estimates and an optional comp-derived value.
 *
 * All available source values + the comp value are pooled together. The IQ Estimate
 * is excluded from the pool to avoid double-counting (it is itself an avg of sources).
 * However, it is kept as a marker for display.
 */
export function buildMarketConsensus(
  sourceGroup: IQEstimateSources['value'] | IQEstimateSources['rent'],
  compValue: number | null,
  mode: 'value' | 'rent',
): ConsensusResult {
  const markers: SourceMarker[] = []
  const poolValues: number[] = []

  const sourceIds: DataSourceId[] = ['zillow', 'rentcast', 'redfin', 'realtor']

  for (const id of sourceIds) {
    const v = sourceGroup[id]
    if (v != null && v > 0) {
      markers.push({ id, label: SOURCE_META[id].label, color: SOURCE_META[id].color, value: v })
      poolValues.push(v)
    }
  }

  const iqValue = sourceGroup.iq
  if (iqValue != null && iqValue > 0) {
    markers.push({ id: 'iq', label: 'IQ Estimate', color: SOURCE_META.iq.color, value: iqValue })
  }

  if (compValue != null && compValue > 0) {
    markers.push({ id: 'comps', label: mode === 'value' ? 'Comp Value' : 'Comp Rent', color: '#14B8A6', value: compValue })
    poolValues.push(compValue)
  }

  if (poolValues.length === 0) {
    return emptyConsensus(compValue)
  }

  const sorted = sortedValues(poolValues)
  const med = median(sorted)
  const q1 = quartile(sorted, 0.25)
  const q3 = quartile(sorted, 0.75)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const iqr = q3 - q1
  const spread = med > 0 ? ((max - min) / med) * 100 : 0

  const divergencePct = spread
  let divergence: DivergenceLevel = 'low'
  if (divergencePct > 30) divergence = 'high'
  else if (divergencePct > 15) divergence = 'medium'

  let confidenceTier: ConfidenceTier = 'strong'
  if (poolValues.length < 2 || divergencePct > 30) confidenceTier = 'weak'
  else if (poolValues.length < 3 || divergencePct > 15) confidenceTier = 'moderate'

  const conservative = Math.round(q1)
  const balanced = Math.round(med)
  const upside = Math.round(q3)

  return {
    markers,
    median: Math.round(med),
    q1: Math.round(q1),
    q3: Math.round(q3),
    min: Math.round(min),
    max: Math.round(max),
    iqr: Math.round(iqr),
    spread: Math.round(spread * 10) / 10,
    divergence,
    divergencePct: Math.round(divergencePct * 10) / 10,
    confidenceTier,
    sourceCount: poolValues.length,
    compValue,
    modes: { conservative, balanced, upside },
  }
}

function emptyConsensus(compValue: number | null): ConsensusResult {
  return {
    markers: [],
    median: 0,
    q1: 0,
    q3: 0,
    min: 0,
    max: 0,
    iqr: 0,
    spread: 0,
    divergence: 'low',
    divergencePct: 0,
    confidenceTier: 'weak',
    sourceCount: 0,
    compValue,
    modes: { conservative: 0, balanced: 0, upside: 0 },
  }
}

/**
 * Builds consensus from sales comps result + property data sources.
 */
export function buildSalesConsensus(
  sources: IQEstimateSources,
  appraisalResult: AppraisalResult,
): ConsensusResult {
  return buildMarketConsensus(
    sources.value,
    appraisalResult.marketValue > 0 ? appraisalResult.marketValue : null,
    'value',
  )
}

/**
 * Builds consensus from rental comps result + property data sources.
 */
export function buildRentalConsensus(
  sources: IQEstimateSources,
  rentResult: RentAppraisalResult,
): ConsensusResult {
  return buildMarketConsensus(
    sources.rent,
    rentResult.marketRent > 0 ? rentResult.marketRent : null,
    'rent',
  )
}
