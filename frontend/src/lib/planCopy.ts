/**
 * Plan view copy. Numbers are passed in; this file only assembles strings.
 */

import { formatMoneyExact } from '@/lib/verdictCopy'
import type { PlanOptionKey } from '@/lib/dealStructures/planMetrics'

export const PLAN_WHY_TWO_GAPS =
  'Gap at asking compares the list price with Target Buy. Gap left compares your plan price with Target Buy. Seller terms let you pay more than Target Buy and still hit your targets, which is why a plan can clear all four while a gap remains.'

export const PLAN_GUIDE_WHY =
  'Each option is run through the worksheet with your standard terms and scored against your Investment Assumptions. The Guide only reads the worksheet. It never adds a number the worksheet did not compute.'

export const OPTION_SHORT_NAME: Record<PlanOptionKey, string> = {
  '1': 'rent increase',
  '2': 'price cut',
  '3': 'creative finance',
  '4': 'more equity',
  blend: 'blend',
  custom: 'your own numbers',
}

export const OPTION_TITLE: Record<PlanOptionKey, string> = {
  '1': 'Option 1: Rent increase',
  '2': 'Option 2: Price cut',
  '3': 'Option 3: Creative finance',
  '4': 'Option 4: More equity',
  blend: 'Blend',
  custom: 'Your own numbers',
}

function money(amount: number): string {
  return formatMoneyExact(amount)
}

function pct1(value: number): string {
  return `${value.toFixed(1)}%`
}

function ratePct(decimalRate: number): string {
  return (decimalRate * 100).toFixed(decimalRate === 0 ? 0 : 1)
}

export function formatPlanTitle(optionKey: PlanOptionKey): string {
  return `Your plan: ${OPTION_SHORT_NAME[optionKey]}`
}

export function formatStructureSentence(input: {
  optionKey: PlanOptionKey
  offerPrice: number
  monthlyRent: number
  sellerAmount: number
  sellerRate: number
  balloonYear: number
  downPaymentPercent: number
}): string {
  const price = money(input.offerPrice)
  const rent = money(input.monthlyRent)
  const seller = money(input.sellerAmount)
  const rate = ratePct(input.sellerRate)
  const down = Math.round(input.downPaymentPercent * 100)
  switch (input.optionKey) {
    case '1':
      return `You buy at ${price} and prove a rent of ${rent} a month.`
    case '2':
      return `You negotiate the price down to ${price}.`
    case '3':
      return `Option 3 keeps the price at ${price} and has the seller carry ${seller} at ${rate}%.`
    case '4':
      return `You buy at ${price} and put ${down}% down.`
    case 'blend':
      return `You buy at ${price} with the seller carrying ${seller} at ${rate}%, paid in full in year ${input.balloonYear}.`
    case 'custom':
      return input.sellerAmount > 0
        ? `Your own numbers: buy at ${price} with the seller carrying ${seller} at ${rate}%.`
        : `Your own numbers: buy at ${price}.`
    default: {
      const exhaustive: never = input.optionKey
      return exhaustive
    }
  }
}

export function formatPlanSentence(input: {
  optionKey: PlanOptionKey
  offerPrice: number
  monthlyRent: number
  sellerAmount: number
  sellerRate: number
  balloonYear: number
  downPaymentPercent: number
  cashNeeded: number
  monthlyCashFlow: number
  targetsMet: number
}): string {
  const structure = formatStructureSentence(input)
  const cash = `You bring ${money(input.cashNeeded)}.`
  const flow =
    input.monthlyCashFlow >= 0
      ? `It pays you ${money(input.monthlyCashFlow)} a month.`
      : `You would feed it ${money(-input.monthlyCashFlow)} a month.`
  const score =
    input.targetsMet === 4
      ? 'That meets all four of your targets.'
      : input.targetsMet === 0
        ? 'That misses all four of your targets.'
        : `That meets ${input.targetsMet} of your four targets.`
  return `${structure} ${cash} ${flow} ${score}`
}

export function formatGapLine(input: {
  askingGapDisplayPct: number
  gapLeftPct: number
}): string {
  const asking = `Gap at asking ${input.askingGapDisplayPct.toFixed(1)}%.`
  if (input.gapLeftPct <= 0) {
    return `${asking} Gap left: your plan price is at or below Target Buy.`
  }
  return `${asking} Gap left: your plan price is ${pct1(input.gapLeftPct)} above Target Buy`
}

export function formatGuideStrong(input: { targetsMet: number; monthlyCashFlow: number }): string {
  return `This is the strongest plan the levers make. It meets ${input.targetsMet} of 4 targets and pays ${money(input.monthlyCashFlow)} a month. Start working it.`
}

export function formatGuideBreakeven(input: {
  bestLever: string
  monthlyCashFlow: number
}): string {
  return `No lever gets this house to your targets. The best the levers do is ${input.bestLever}: ${money(input.monthlyCashFlow)} a month, 0 of 4 targets. That is what you offer, and where you walk away.`
}

export function formatGuideWhy(monthlyCashFlowTarget?: number | null): string {
  if (monthlyCashFlowTarget == null || !Number.isFinite(monthlyCashFlowTarget)) {
    return PLAN_GUIDE_WHY
  }
  return (
    `Options 1, 3, 4, and the blend show the smallest move on that lever ` +
    `that keeps the house from costing you money, with a ${money(monthlyCashFlowTarget)} a month cushion. ` +
    `Option 2 shows the price that gets you to Target Buy.`
  )
}

export function formatGuideCompare(input: {
  appliedTitle: string
  appliedMet: number
  bestTitle: string
  bestMet: number
  bestLever: string
  bestMonthlyCashFlow: number
  bestCashOnCash: number
}): string {
  return `${input.appliedTitle} meets ${input.appliedMet} of 4 targets. ${input.bestTitle} meets ${input.bestMet} of 4: ${input.bestLever}. That pays ${money(input.bestMonthlyCashFlow)} a month, a ${pct1(input.bestCashOnCash)} cash return.`
}

export function formatOptionsFooter(targets: {
  capRate: number
  cashOnCash: number
  monthlyCashFlow: number
  dscr: number
}): string {
  return `Scores use DealGapIQ's standard targets: ${targets.capRate.toFixed(1)}% cap rate, ${targets.cashOnCash.toFixed(1)}% cash-on-cash, ${money(targets.monthlyCashFlow)} a month, ${targets.dscr.toFixed(2)} DSCR.`
}

export function formatClosePurchaseCaption(vsList: number): string {
  if (vsList > 0) return `Purchase price, ${money(vsList)} under the list price.`
  if (vsList === 0) return 'Purchase price, at the list price.'
  return `Purchase price, ${money(-vsList)} over the list price.`
}

export function formatCloseEquityCaption(iqEstimate: number | null): string {
  if (iqEstimate == null) return 'Equity on day one, against the IQ Estimate.'
  return `Equity on day one, against the IQ Estimate of ${money(iqEstimate)}.`
}

export function formatCloseSellerCaption(sellerAmount: number, balloonYear: number): string {
  if (sellerAmount > 0) {
    return `Owed to the seller in year ${balloonYear}. Plan the refinance or the payoff now.`
  }
  return 'Owed to a seller. No second in this plan.'
}

export function formatNextMoves(input: {
  offerPrice: number
  monthlyRent: number
  sellerAmount: number
  sellerRate: number
  bankLoan: number
}): readonly [string, string, string] {
  const call =
    input.sellerAmount > 0
      ? `Call the listing agent. Confirm the seller's situation and float a seller-carried second of ${money(input.sellerAmount)} at ${ratePct(input.sellerRate)}%.`
      : `Call the listing agent. Confirm the seller's situation before you write the offer at ${money(input.offerPrice)}.`
  return [
    call,
    `Verify the rent. The plan needs ${money(input.monthlyRent)} a month. Two local property managers should agree.`,
    `Get pre-approval for a ${money(input.bankLoan)} loan.`,
  ]
}

export function formatSourceSpreadLine(input: {
  low: number | null
  high: number | null
  iqEstimate: number | null
}): string {
  if (input.low == null || input.high == null || input.iqEstimate == null) {
    return input.iqEstimate != null
      ? `The IQ Estimate is ${money(input.iqEstimate)}. Tap any number for its source.`
      : 'Tap any number for its source.'
  }
  return `Five sources value this house between ${money(input.low)} and ${money(input.high)}. The IQ Estimate is ${money(input.iqEstimate)}. Tap any number for its source.`
}

export function formatPlanBottomLine(targetsMet: number): string {
  if (targetsMet <= 0) return 'This plan misses your targets.'
  return `This plan meets ${targetsMet} of your four targets.`
}

export function formatResetToOption(optionKey: PlanOptionKey): string {
  return `Reset to ${OPTION_SHORT_NAME[optionKey]}`
}
