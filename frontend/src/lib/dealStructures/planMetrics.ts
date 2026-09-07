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
}

export interface PlanWorksheetMetrics {
  offerPrice: number
  sellerSecond: number
  monthlyRent: number
  downPaymentPercent: number
  sellerInterestOnly: boolean
  cashToClose: number
  monthlyCashFlow: number
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
    monthlyHoa: 0,
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
    monthlyRent: state.monthlyRent,
    downPaymentPercent: state.downPaymentPercent,
    sellerInterestOnly: state.sellerInterestOnly ?? false,
    cashToClose: cashNeededFromLtrState(state),
    monthlyCashFlow: metrics.annualProfit / 12,
  }
}
