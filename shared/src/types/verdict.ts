/**
 * IQ Verdict API Response — Single Source of Truth
 *
 * These types define the shape of POST /api/v1/analysis/verdict responses.
 * Both web (frontend/) and mobile (mobile/) MUST import from here.
 *
 * Field names use snake_case matching the backend Pydantic models.
 * The backend also serializes camelCase aliases via alias_generator,
 * so clients may receive either casing — use nullish coalescing when parsing.
 *
 * See: backend/app/schemas/analytics.py :: IQVerdictResponse
 */

export interface IQVerdictStrategy {
  id: string;
  name: string;
  metric: string;
  metric_label: string;
  metric_value: number;
  score: number;
  rank: number;
  badge: string | null;
  cap_rate?: number | null;
  cash_on_cash?: number | null;
  dscr?: number | null;
  annual_cash_flow?: number | null;
  monthly_cash_flow?: number | null;
  breakdown?: Record<string, number | null> | null;
}

export interface IQVerdictDealFactor {
  type: 'positive' | 'warning' | 'info';
  text: string;
}

export interface IQVerdictScoreDisplay {
  score: number;
  grade: string;
  label: string;
  color: string;
}

export interface IQVerdictOpportunityFactors {
  deal_gap: number;
  motivation: number;
  motivation_label: string;
  days_on_market: number | null;
  buyer_market: string | null;
  distressed_sale: boolean;
}

export interface IQVerdictReturnFactors {
  cap_rate: number | null;
  cash_on_cash: number | null;
  dscr: number | null;
  annual_roi: number | null;
  annual_profit: number | null;
  strategy_name: string;
}

export interface IQVerdictResponse {
  deal_score: number;
  deal_verdict: string;
  verdict_description: string;
  discount_percent: number;
  purchase_price: number;
  income_value: number;
  list_price: number;
  inputs_used: Record<string, unknown>;
  defaults_used: Record<string, Record<string, number>>;

  opportunity: IQVerdictScoreDisplay;
  opportunity_factors: IQVerdictOpportunityFactors;
  return_rating: IQVerdictScoreDisplay;
  return_factors: IQVerdictReturnFactors;

  income_gap_amount: number;
  income_gap_percent: number;
  pricing_quality_tier: string;

  deal_gap_amount: number;
  deal_gap_percent: number;

  wholesale_mao: number | null;

  strategies: IQVerdictStrategy[];
  deal_factors: IQVerdictDealFactor[];
  discount_bracket_label: string;
  deal_narrative: string | null;
}

/**
 * Canonical section order for the Verdict page.
 *
 * Both web and mobile Verdict pages MUST render these sections in this order.
 * When adding/removing/reordering sections on web, update this list and
 * apply the same change to mobile.
 */
export const VERDICT_SECTIONS = [
  'photo',
  'investmentOverview',
  'priceScaleBar',
  'marketAnchorNote',
  'dataSources',
  'dealGapExplanation',
  'keyInsights',
  'actionButtons',
  'cta',
  'trustStrip',
] as const;

export type VerdictSection = (typeof VERDICT_SECTIONS)[number];
