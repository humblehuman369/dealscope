/**
 * Plan view model. Maps already-computed worksheet numbers onto display strings.
 * Do not add arithmetic here.
 */

import { formatMoneyExact } from '@/lib/verdictCopy'
import { formatPlanSourceCountLine } from '@/lib/phase15Copy'
import type { PlanOptionKey, PlanTargetDefaults, ScoredPlanOption } from '@/lib/dealStructures/planMetrics'
import { PLAN_TARGET_DEFAULTS } from '@/lib/dealStructures/planMetrics'
import {
  OPTION_TITLE,
  formatCloseEquityCaption,
  formatClosePurchaseCaption,
  formatCloseSellerCaption,
  formatGapLine,
  formatGuideBreakeven,
  formatGuideCompare,
  formatGuideStrong,
  formatGuideWhy,
  formatNextMoves,
  formatOptionsFooter,
  formatPlanSentence,
  formatPlanTitle,
  formatSourceSpreadLine,
} from '@/lib/planCopy'

export interface PlanSnapshotNumbers {
  optionKey: PlanOptionKey
  offerPrice: number
  cashNeeded: number
  monthlyCashFlow: number
  cashOnCash: number
  capRate: number
  dscr: number
  bankLoan: number
  sellerAmount: number
  sellerRate: number
  balloonYear: number
  downPaymentPercent: number
  monthlyRent: number
  listPrice: number
  iqEstimate: number | null
  targetBuy: number
  askingGapDisplayPct: number
  gapLeftPct: number
  targetsMet: number
  capMet: boolean
  cocMet: boolean
  cfMet: boolean
  dscrMet: boolean
  vsList: number
  equity: number | null
  sourceLow: number | null
  sourceHigh: number | null
  sourceAnswered?: number | null
  sourceTotal?: number | null
  sourceMissingLabels?: readonly string[]
  options: readonly ScoredPlanOption[]
  appliedStructureId: string | null
  targets?: PlanTargetDefaults
  monthlyCashFlowTarget?: number | null
}

export interface PlanOptionCardModel {
  key: PlanOptionKey
  structureId: string
  title: string
  lever: string
  meetsLabel: string
  cashFlowLabel: string
  isBest: boolean
  isApplied: boolean
}

export interface PlanTargetRowModel {
  measure: string
  plan: string
  target: string
  meets: boolean
  result: string
}

export interface PlanCloseCellModel {
  value: string
  caption: string
}

export interface PlanViewModel {
  title: string
  sentence: string
  offerPrice: string
  cashNeeded: string
  monthlyCashFlow: string
  cashOnCash: string
  cashFlowNegative: boolean
  gapLine: string
  guideText: string
  guideWhy: string
  guideIsStrong: boolean
  guideApplyLabel: string
  guideApplyKind: 'start' | 'apply'
  guideApplyStructureId: string | null
  options: PlanOptionCardModel[]
  optionsFooter: string
  targetRows: PlanTargetRowModel[]
  closeCells: PlanCloseCellModel[]
  sourceLine: string
  nextMoves: readonly [string, string, string]
}

function money(amount: number): string {
  return formatMoneyExact(amount)
}

function pct1(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatPlanSnapshot(input: PlanSnapshotNumbers): PlanViewModel {
  const targets = input.targets ?? PLAN_TARGET_DEFAULTS
  const best = input.options.find((option) => option.isBest) ?? null
  const bestMet = best?.targetsMet ?? input.targetsMet
  const guideIsStrong = best == null || best.key === input.optionKey
  const targetRows: PlanTargetRowModel[] = [
    {
      measure: 'Cap rate',
      plan: pct1(input.capRate),
      target: pct1(targets.capRate),
      meets: input.capMet,
      result: input.capMet ? '✓ Meets' : '✕ Below',
    },
    {
      measure: 'Cash-on-cash',
      plan: pct1(input.cashOnCash),
      target: pct1(targets.cashOnCash),
      meets: input.cocMet,
      result: input.cocMet ? '✓ Meets' : '✕ Below',
    },
    {
      measure: 'Cash flow a month',
      plan: money(input.monthlyCashFlow),
      target: money(targets.monthlyCashFlow),
      meets: input.cfMet,
      result: input.cfMet ? '✓ Meets' : '✕ Below',
    },
    {
      measure: 'DSCR',
      plan: input.dscr.toFixed(2),
      target: targets.dscr.toFixed(2),
      meets: input.dscrMet,
      result: input.dscrMet ? '✓ Meets' : '✕ Below',
    },
  ]

  return {
    title: formatPlanTitle(input.optionKey),
    sentence: formatPlanSentence({
      optionKey: input.optionKey,
      offerPrice: input.offerPrice,
      monthlyRent: input.monthlyRent,
      sellerAmount: input.sellerAmount,
      sellerRate: input.sellerRate,
      balloonYear: input.balloonYear,
      downPaymentPercent: input.downPaymentPercent,
      cashNeeded: input.cashNeeded,
      monthlyCashFlow: input.monthlyCashFlow,
      targetsMet: input.targetsMet,
    }),
    offerPrice: money(input.offerPrice),
    cashNeeded: money(input.cashNeeded),
    monthlyCashFlow: money(input.monthlyCashFlow),
    cashOnCash: pct1(input.cashOnCash),
    cashFlowNegative: input.monthlyCashFlow < 0,
    gapLine: formatGapLine({
      askingGapDisplayPct: input.askingGapDisplayPct,
      gapLeftPct: input.gapLeftPct,
    }),
    guideText: bestMet < 1
      ? formatGuideBreakeven({
          bestLever: best?.headline ?? '',
          monthlyCashFlow: best?.metrics.monthlyCashFlow ?? input.monthlyCashFlow,
        })
      : !guideIsStrong
        ? formatGuideCompare({
            appliedTitle: OPTION_TITLE[input.optionKey],
            appliedMet: input.targetsMet,
            bestTitle: best ? OPTION_TITLE[best.key] : OPTION_TITLE.blend,
            bestMet: best?.targetsMet ?? 0,
            bestLever: best?.headline ?? '',
            bestMonthlyCashFlow: best?.metrics.monthlyCashFlow ?? 0,
            bestCashOnCash: best?.metrics.cashOnCash ?? 0,
          })
        : formatGuideStrong({
            targetsMet: input.targetsMet,
            monthlyCashFlow: input.monthlyCashFlow,
          }),
    guideWhy: formatGuideWhy(input.monthlyCashFlowTarget),
    guideIsStrong,
    guideApplyLabel: guideIsStrong
      ? 'Start working this deal'
      : best?.key === 'blend'
        ? 'Apply the blend'
        : `Apply option ${best?.key ?? ''}`,
    guideApplyKind: guideIsStrong ? 'start' : 'apply',
    guideApplyStructureId: guideIsStrong ? null : (best?.structureId ?? null),
    options: input.options.map((option) => ({
      key: option.key,
      structureId: option.structureId,
      title: OPTION_TITLE[option.key],
      lever: option.headline,
      meetsLabel: `Meets ${option.targetsMet} of 4`,
      cashFlowLabel: `${money(option.metrics.monthlyCashFlow)} a month`,
      isBest: option.isBest,
      isApplied: option.structureId === input.appliedStructureId,
    })),
    optionsFooter: formatOptionsFooter(targets),
    targetRows,
    closeCells: [
      { value: money(input.offerPrice), caption: formatClosePurchaseCaption(input.vsList) },
      {
        value: input.equity != null ? money(input.equity) : '—',
        caption: formatCloseEquityCaption(input.iqEstimate),
      },
      { value: money(input.cashNeeded), caption: 'Cash in: down payment and closing costs.' },
      { value: money(input.monthlyCashFlow), caption: 'A month, after every cost and the loan.' },
      { value: pct1(input.cashOnCash), caption: 'Cash-on-cash return in year one.' },
      ...(input.sellerAmount > 0
        ? [
            {
              value: money(input.sellerAmount),
              caption: formatCloseSellerCaption(input.sellerAmount, input.balloonYear),
            },
          ]
        : []),
    ],
    sourceLine:
      input.sourceAnswered != null &&
      input.sourceTotal != null &&
      input.sourceLow != null &&
      input.sourceHigh != null
        ? formatPlanSourceCountLine({
            answered: input.sourceAnswered,
            total: input.sourceTotal,
            missingLabels: input.sourceMissingLabels ?? [],
            low: money(input.sourceLow),
            high: money(input.sourceHigh),
          })
        : formatSourceSpreadLine({
            low: input.sourceLow,
            high: input.sourceHigh,
            iqEstimate: input.iqEstimate,
          }),
    nextMoves: formatNextMoves({
      offerPrice: input.offerPrice,
      monthlyRent: input.monthlyRent,
      sellerAmount: input.sellerAmount,
      sellerRate: input.sellerRate,
      bankLoan: input.bankLoan,
    }),
  }
}
