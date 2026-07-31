/**
 * Shared constants, types, and pure helpers for the Strategy Workbench.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 */

import type {
  StrategyType,
  LTRDealMakerState,
  STRDealMakerState,
} from '@/features/deal-maker/components/types'

/** Strategies where deal-structure Options do not apply (non-rental economics). */
export const STRATEGIES_WITHOUT_OPTIONS = new Set(['fix-and-flip', 'wholesale'])

/** Per-strategy template IDs to hide from the Options row. */
export const STRATEGY_EXCLUDED_TEMPLATE_IDS: Record<string, ReadonlySet<string>> = {
  'short-term-rental': new Set(['rent-verification', 'fha-house-hack']),
  brrrr: new Set(['rent-verification', 'fha-house-hack']),
}

export const STRATEGY_LABEL: Record<string, string> = {
  'long-term-rental': 'Long-Term Rental',
  'short-term-rental': 'Short-Term Rental',
  brrrr: 'BRRRR',
  'house-hack': 'House Hack',
}

/** Cash to close from DealMaker sliders (must stay aligned with DealMakerWorksheet). */
export function cashNeededFromLtrState(s: LTRDealMakerState): number {
  const buy = s.buyPrice
  if (buy <= 0) return 0
  const cc = buy * s.closingCostsPercent
  const sc = Math.max(0, s.sellerFinancingAmount ?? 0)
  const loan = Math.max(0, buy - buy * s.downPaymentPercent - sc)
  // Sources & uses: (price + closing + rehab) − (bank loan + seller note). May be negative.
  return buy + cc + (s.rehabBudget ?? 0) - loan - sc
}

export function cashNeededFromStrState(s: STRDealMakerState): number {
  const buy = s.buyPrice
  if (buy <= 0) return 0
  const cc = buy * s.closingCostsPercent
  const sc = Math.max(0, s.sellerFinancingAmount ?? 0)
  const loan = Math.max(0, buy - buy * s.downPaymentPercent - sc)
  const extra = (s.rehabBudget ?? 0) + (s.furnitureSetupCost ?? 0)
  // Sources & uses: (price + closing + rehab + furniture) − (bank loan + seller note).
  return buy + cc + extra - loan - sc
}

// Types from existing verdict system
export interface BackendAnalysisResponse {
  deal_score: number
  deal_verdict: string
  verdict_description: string
  discount_percent: number
  strategies: Array<{
    id: string
    name: string
    metric: string
    metric_label: string
    metric_value: number
    score: number
    rank: number
    badge: string | null
    cap_rate?: number
    cash_on_cash?: number
    dscr?: number
    monthly_cash_flow?: number
    annual_cash_flow?: number
    breakdown?: Record<string, number>
  }>
  purchase_price: number
  income_value: number
  list_price: number
  valuation_snapshot?: {
    noi?: number
    income_value?: number | null
    incomeValue?: number | null
    purchase_price?: number
    purchasePrice?: number
    monthly_cash_flow?: number
    monthlyCashFlow?: number
    price_gap_to_income_pct?: number | null
    priceGapToIncomePct?: number | null
    formula_version?: number
    formulaVersion?: number
  }
  return_factors?: {
    capRate?: number
    cashOnCash?: number
    dscr?: number
    annualRoi?: number
  }
  opportunity_factors?: {
    dealGap?: number
    motivation?: number
    motivationLabel?: string
    buyerMarket?: string
  }
  opportunity?: { score?: number }
  [key: string]: any
}

export function formatCurrency(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

export const colors = {
  brand: {
    blue: 'var(--accent-sky)',
    teal: 'var(--accent-sky)',
    gold: 'var(--status-warning)',
  },
  text: {
    primary: 'var(--text-heading)',
    body: 'var(--text-body)',
  },
  background: {
    cardUp: 'var(--surface-card)',
    card: 'var(--surface-card)',
  },
  status: {
    positive: 'var(--status-positive)',
    negative: 'var(--status-negative)',
  },
  accentBg: {
    green: 'var(--color-green-dim)',
    red: 'var(--color-red-dim)',
    gold: 'var(--color-gold-dim)',
  },
  ui: {
    border: 'var(--border-subtle)',
  },
} as const

export function toStrategyType(backendId: string): StrategyType {
  const map: Record<string, StrategyType> = {
    'long-term-rental': 'ltr',
    'short-term-rental': 'str',
    brrrr: 'brrrr',
    'fix-and-flip': 'flip',
    'house-hack': 'house_hack',
    wholesale: 'wholesale',
  }
  return map[backendId] || 'ltr'
}

/** Admin-resolved operating defaults that drive live Deal Gap / worksheet math. */
export interface DealGapOperatingOverrides {
  capexPct?: number
  utilitiesMonthly?: number
  landscapingAnnual?: number
  pestControlAnnual?: number
}
