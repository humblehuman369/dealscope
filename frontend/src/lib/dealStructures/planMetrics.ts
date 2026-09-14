/**
 * Worksheet-aligned cash / cash-flow from a deal-structure `pre_loaded_record`.
 * Modal, ranking, and Workbench handoff tests must use this — not a second formula.
 */

import type { LTRDealMakerState } from '@/features/deal-maker/components/types'
import { cashNeededFromLtrState } from '@/features/strategy-workbench/lib/shared'
import { computeLtrMetricsFromState } from '@/lib/ltrWorksheetMetrics'
import { preLoadedRecordToDealMakerPatch } from '@/lib/dealStructures/loadScenario'

export interface PlanBaseline {
  listPrice: number
  monthlyRent: number
  downPaymentPercent?: number
  closingCostsPercent?: number
  interestRate?: number
  loanTermYears?: number
  vacancyRate?: number
  maintenanceRate?: number
  managementRate?: number
  capexRate?: number
  annualPropertyTax?: number
  annualInsurance?: number
  monthlyHoa?: number
}

export interface PlanWorksheetMetrics {
  offerPrice: number
  sellerSecond: number
  sellerRate: number
  balloonYear: number
  monthlyRent: number
  downPaymentPercent: number
  sellerInterestOnly: boolean
  cashToClose: number
  monthlyCashFlow: number
  capRate: number
  cashOnCash: number
  dscr: number
  bankLoan: number
}

/** Same four bars the Workbench benchmark table uses. */
export const PLAN_TARGET_DEFAULTS = {
  capRate: 6.0,
  cashOnCash: 8.0,
  monthlyCashFlow: 300,
  dscr: 1.25,
} as const

export type PlanTargetDefaults = {
  capRate: number
  cashOnCash: number
  monthlyCashFlow: number
  dscr: number
}

export type PlanOptionKey = '1' | '2' | '3' | '4' | 'blend' | 'custom'

export const PLAN_SLOT_ORDER = ['income', 'price', 'financing', 'capital_stack', 'blended'] as const

export function optionKeyFromFamily(family: string): PlanOptionKey {
  switch (family) {
    case 'income':
      return '1'
    case 'price':
      return '2'
    case 'financing':
      return '3'
    case 'capital_stack':
      return '4'
    case 'blended':
      return 'blend'
    default:
      return 'custom'
  }
}

export type TuneWorksheetGroup = 'pay' | 'loan' | 'cost' | 'earn'

export function tuneGroupForOption(optionKey: PlanOptionKey): TuneWorksheetGroup {
  switch (optionKey) {
    case '1':
      return 'earn'
    case '2':
    case '3':
    case '4':
    case 'blend':
    case 'custom':
      return 'pay'
    default: {
      const exhaustive: never = optionKey
      return exhaustive
    }
  }
}

export function scoreAgainstTargets(
  input: {
    capRate: number
    cashOnCash: number
    monthlyCashFlow: number
    dscr: number
  },
  targets: PlanTargetDefaults = PLAN_TARGET_DEFAULTS,
): { targetsMet: number; capMet: boolean; cocMet: boolean; cfMet: boolean; dscrMet: boolean } {
  const capMet = input.capRate >= targets.capRate
  const cocMet = input.cashOnCash >= targets.cashOnCash
  const cfMet = input.monthlyCashFlow >= targets.monthlyCashFlow
  const dscrMet = input.dscr >= targets.dscr
  return {
    targetsMet: Number(capMet) + Number(cocMet) + Number(cfMet) + Number(dscrMet),
    capMet,
    cocMet,
    cfMet,
    dscrMet,
  }
}

/** Signed like Discovery: list above Target Buy is negative. */
export function askingGapDisplayPct(listPrice: number, targetBuy: number): number {
  if (!(listPrice > 0)) return 0
  return ((targetBuy - listPrice) / listPrice) * 100
}

/** Positive when the plan price is above Target Buy. */
export function gapLeftPct(offerPrice: number, targetBuy: number): number {
  if (!(offerPrice > 0)) return 0
  return ((offerPrice - targetBuy) / offerPrice) * 100
}

export function closeDeltas(
  offerPrice: number,
  listPrice: number,
  iqEstimate: number | null,
): { vsList: number; equity: number | null } {
  return {
    vsList: listPrice - offerPrice,
    equity: iqEstimate != null ? iqEstimate - offerPrice : null,
  }
}

const DEFAULT_DP = 0.2
const DEFAULT_CC = 0.03
const DEFAULT_RATE = 0.06
const DEFAULT_TERM = 30

function asFinite(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function ltrStateFromPreLoadedRecord(
  levers: Record<string, unknown>,
  baseline: PlanBaseline,
): LTRDealMakerState {
  const patch = preLoadedRecordToDealMakerPatch(levers)
  const offer =
    asFinite(patch.buyPrice) ?? asFinite(patch.purchasePrice) ?? baseline.listPrice
  const dpPct =
    asFinite(patch.downPayment) != null
      ? (patch.downPayment as number) / 100
      : (baseline.downPaymentPercent ?? DEFAULT_DP)
  const sellerSecond =
    asFinite(patch.sellerFinancingAmount) ?? asFinite(patch.seller_carry_amount) ?? 0
  const io =
    typeof patch.sellerInterestOnly === 'boolean'
      ? patch.sellerInterestOnly
      : typeof patch.seller_carry_interest_only === 'boolean'
        ? patch.seller_carry_interest_only
        : false

  return {
    buyPrice: offer,
    downPaymentPercent: dpPct,
    closingCostsPercent: baseline.closingCostsPercent ?? DEFAULT_CC,
    interestRate: baseline.interestRate ?? DEFAULT_RATE,
    loanTermYears: baseline.loanTermYears ?? DEFAULT_TERM,
    sellerFinancingAmount: sellerSecond,
    sellerInterestRate: asFinite(patch.sellerInterestRate) ?? 0,
    sellerTermYears: asFinite(patch.sellerTermYears) ?? 5,
    sellerBalloonYears: asFinite(patch.sellerBalloonYears) ?? asFinite(patch.seller_carry_balloon_years) ?? 5,
    sellerInterestOnly: io,
    rehabBudget: 0,
    arv: offer,
    monthlyRent: asFinite(patch.monthlyRent) ?? baseline.monthlyRent,
    otherIncome: 0,
    vacancyRate: baseline.vacancyRate ?? 0.05,
    maintenanceRate: baseline.maintenanceRate ?? 0.05,
    managementRate: baseline.managementRate ?? 0.08,
    annualPropertyTax: baseline.annualPropertyTax ?? 0,
    annualInsurance: baseline.annualInsurance ?? 0,
    monthlyHoa: baseline.monthlyHoa ?? 0,
    capexRate: baseline.capexRate ?? 0.05,
    utilitiesMonthly: 0,
    pestControlAnnual: 0,
  }
}

export function metricsFromPreLoadedRecord(
  levers: Record<string, unknown>,
  baseline: PlanBaseline,
): PlanWorksheetMetrics {
  const state = ltrStateFromPreLoadedRecord(levers, baseline)
  const metrics = computeLtrMetricsFromState(state)
  return {
    offerPrice: state.buyPrice,
    sellerSecond: state.sellerFinancingAmount,
    sellerRate: state.sellerInterestRate,
    balloonYear: state.sellerBalloonYears ?? 5,
    monthlyRent: state.monthlyRent,
    downPaymentPercent: state.downPaymentPercent,
    sellerInterestOnly: state.sellerInterestOnly ?? false,
    cashToClose: cashNeededFromLtrState(state),
    monthlyCashFlow: metrics.annualProfit / 12,
    capRate: metrics.capRate,
    cashOnCash: metrics.cocReturn,
    dscr: metrics.dscr,
    bankLoan: metrics.loanAmount,
  }
}

export interface ScoredPlanOption {
  family: (typeof PLAN_SLOT_ORDER)[number]
  key: PlanOptionKey
  structureId: string
  headline: string
  familyLabel: string
  metrics: PlanWorksheetMetrics
  targetsMet: number
  isBest: boolean
}

export function scorePlanOptions(
  paths: readonly { family: string; id: string; headline: string; familyLabel: string; preLoadedRecord?: Record<string, unknown> | null }[],
  baseline: PlanBaseline,
  targets: PlanTargetDefaults = PLAN_TARGET_DEFAULTS,
): ScoredPlanOption[] {
  const scored: ScoredPlanOption[] = []
  for (const family of PLAN_SLOT_ORDER) {
    const structure = paths.find((p) => p.family === family)
    if (!structure?.preLoadedRecord) continue
    const metrics = metricsFromPreLoadedRecord(structure.preLoadedRecord, baseline)
    const { targetsMet } = scoreAgainstTargets(
      {
        capRate: metrics.capRate,
        cashOnCash: metrics.cashOnCash,
        monthlyCashFlow: metrics.monthlyCashFlow,
        dscr: metrics.dscr,
      },
      targets,
    )
    scored.push({
      family,
      key: optionKeyFromFamily(family),
      structureId: structure.id,
      headline: structure.headline,
      familyLabel: structure.familyLabel,
      metrics,
      targetsMet,
      isBest: false,
    })
  }
  if (scored.length === 0) return scored
  let best = scored[0]
  for (const option of scored) {
    if (
      option.targetsMet > best.targetsMet ||
      (option.targetsMet === best.targetsMet &&
        option.metrics.monthlyCashFlow > best.metrics.monthlyCashFlow)
    ) {
      best = option
    }
  }
  return scored.map((option) => ({ ...option, isBest: option.structureId === best.structureId }))
}
