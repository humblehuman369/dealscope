/**
 * usePropertyAnalysis - Hook for fetching property analysis from backend
 *
 * Calls the IQ Verdict endpoint to get:
 * - Strategy grades and scores
 * - Deal score / opportunity rating
 * - Target price (breakeven × 0.95)
 * - Return factors for each strategy
 *
 * This replaces the frontend mock calculations with real backend data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/apiClient';
import { StrategyId, TargetAssumptions, PropertyData } from '../types/analytics';

const DEBOUNCE_MS = 200;

// Worksheet endpoint mapping — matches frontend WORKSHEET_ENDPOINTS
const WORKSHEET_ENDPOINTS: Record<string, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

// ============================================
// API RESPONSE TYPES (matches backend IQVerdictResponse)
// ============================================

export interface ScoreDisplayResponse {
  score: number;
  grade: string;
  label: string;
  color: string;
}

export interface OpportunityFactorsResponse {
  dealGap: number;
  motivation: number;
  motivationLabel: string;
  daysOnMarket: number | null;
  buyerMarket: string | null;
  distressedSale: boolean;
}

export interface ReturnFactorsResponse {
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  annualRoi: number | null;
  annualProfit: number | null;
  strategyName: string;
}

export interface StrategyResultResponse {
  id: string;
  name: string;
  metric: string;
  metricLabel: string;
  metricValue: number;
  score: number;
  rank: number;
  badge: string | null;
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  annualCashFlow: number | null;
  monthlyCashFlow: number | null;
}

export interface IQVerdictResponse {
  // Legacy fields
  dealScore: number;
  dealVerdict: string;
  verdictDescription: string;
  discountPercent: number;
  strategies: StrategyResultResponse[];
  purchasePrice: number;
  breakevenPrice: number;
  listPrice: number;
  inputsUsed: Record<string, unknown>;
  defaultsUsed: Record<string, unknown>;
  // New grade-based display
  opportunity: ScoreDisplayResponse;
  opportunityFactors: OpportunityFactorsResponse;
  returnRating: ScoreDisplayResponse;
  returnFactors: ReturnFactorsResponse;
  // Component scores — flat top-level fields from backend
  dealGapScore?: number;
  returnQualityScore?: number;
  marketAlignmentScore?: number;
  dealProbabilityScore?: number;
  // Legacy nested format (kept for backward compat)
  componentScores?: {
    dealGapScore: number;
    returnQualityScore: number;
    marketAlignmentScore: number;
    dealProbabilityScore: number;
  };
}

export interface VerdictInput {
  listPrice: number;
  monthlyRent?: number;
  propertyTaxes?: number;
  insurance?: number;
  arv?: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  bedrooms?: number;
  listingStatus?: string;
  sellerType?: string;
  isForeclosure?: boolean;
  isBankOwned?: boolean;
  isFsbo?: boolean;
  daysOnMarket?: number;
  marketTemperature?: string;
}

// ============================================
// PROJECTIONS API TYPES
// ============================================

export interface YearlyProjection {
  year: number;
  cashFlow: number;
  propertyValue: number;
  equity: number;
  cumulativeCashFlow: number;
  grossIncome?: number;
  expenses?: number;
  noi?: number;
  debtService?: number;
}

export interface AmortizationRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface ProjectionsData {
  yearlyData: YearlyProjection[];
  amortization: AmortizationRow[];
  totalCashFlow: number;
  totalReturn: number;
  totalROI: number;
  equityBuilt: number;
  portfolioValue: number;
  initialInvestment: number;
  // Growth rates used
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
}

// ============================================
// DERIVED TYPES FOR COMPONENTS
// ============================================

export interface StrategyGrades {
  ltr: { grade: string; score: number };
  str: { grade: string; score: number };
  brrrr: { grade: string; score: number };
  flip: { grade: string; score: number };
  house_hack: { grade: string; score: number };
  wholesale: { grade: string; score: number };
}

export interface PropertyAnalysisResult {
  // The full API response
  raw: IQVerdictResponse | null;
  // Derived data for components
  strategyGrades: StrategyGrades;
  targetPrice: number;
  breakevenPrice: number;
  discountPercent: number;
  dealScore: {
    score: number;
    grade: string;
    label: string;
    color: string;
  };
  opportunityFactors: OpportunityFactorsResponse | null;
  returnFactors: ReturnFactorsResponse | null;
  // Strategy-specific metrics
  strategies: StrategyResultResponse[];
  // Worksheet metrics at target price AND list price (matches frontend)
  metricsAtTarget: Record<string, unknown> | null;
  metricsAtList: Record<string, unknown> | null;
  // Projections data (from analytics/proforma endpoints)
  projections: ProjectionsData | null;
  // Loading state
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

// Growth assumptions interface for the hook
export interface GrowthAssumptions {
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
}

/**
 * Build a worksheet payload for a specific strategy at a given price.
 * Matches frontend buildWorksheetPayload().
 */
function buildWorksheetPayload(
  strategyId: StrategyId,
  purchasePrice: number,
  assumptions: Partial<TargetAssumptions>,
  property: PropertyData,
): Record<string, unknown> {
  const base = {
    purchase_price: purchasePrice,
    down_payment_pct: (assumptions.downPaymentPct ?? 0.20) * 100,
    interest_rate: (assumptions.interestRate ?? 0.073) * 100,
    loan_term_years: assumptions.loanTermYears ?? 30,
    closing_costs: purchasePrice * (assumptions.closingCostsPct ?? 0.03),
    property_taxes_annual: assumptions.propertyTaxes ?? property.propertyTaxes ?? 3600,
    insurance_annual: assumptions.insurance ?? property.insurance ?? 1500,
    vacancy_rate: assumptions.vacancyRate ?? 0.05,
    property_management_pct: assumptions.managementPct ?? 0.08,
    maintenance_pct: assumptions.maintenancePct ?? 0.05,
  };

  switch (strategyId) {
    case 'ltr':
      return {
        ...base,
        monthly_rent: assumptions.monthlyRent ?? property.monthlyRent,
        rehab_costs: assumptions.rehabCost ?? 0,
        arv: assumptions.arv ?? property.arv ?? 0,
      };
    case 'str':
      return {
        ...base,
        average_daily_rate: assumptions.averageDailyRate ?? property.averageDailyRate ?? 200,
        occupancy_rate: assumptions.occupancyRate ?? property.occupancyRate ?? 0.65,
        platform_fees_pct: 0.03,
        cleaning_cost_per_turn: 75,
      };
    case 'brrrr':
      return {
        ...base,
        rehab_costs: assumptions.rehabCost ?? 0,
        arv: assumptions.arv ?? property.arv ?? 0,
        monthly_rent: assumptions.monthlyRent ?? property.monthlyRent,
        holding_months: assumptions.holdingPeriodMonths ?? 6,
        refi_ltv: 75,
        refi_interest_rate: (assumptions.interestRate ?? 0.073) * 100,
        refi_loan_term: 30,
      };
    case 'flip':
      return {
        ...base,
        rehab_costs: assumptions.rehabCost ?? 0,
        arv: assumptions.arv ?? property.arv ?? 0,
        holding_months: assumptions.holdingPeriodMonths ?? 6,
        selling_costs_pct: (assumptions.sellingCostsPct ?? 0.08) * 100,
        capital_gains_rate: 15,
      };
    case 'house_hack':
      return {
        ...base,
        monthly_rent: assumptions.monthlyRent ?? property.monthlyRent,
        unit_rents: [assumptions.monthlyRent ?? property.monthlyRent],
      };
    case 'wholesale':
      return {
        arv: assumptions.arv ?? property.arv ?? 0,
        contract_price: purchasePrice,
        investor_price: purchasePrice * 1.03,
        rehab_costs: assumptions.rehabCost ?? 0,
        assignment_fee: purchasePrice * (assumptions.wholesaleFeePct ?? 0.05),
        earnest_money: 1000,
      };
    default:
      return base;
  }
}

export function usePropertyAnalysis(
  property: PropertyData | null,
  assumptions?: Partial<TargetAssumptions>,
  growthAssumptions?: GrowthAssumptions,
  strategyId?: StrategyId,
): PropertyAnalysisResult & { refetch: () => Promise<void> } {
  const [data, setData] = useState<IQVerdictResponse | null>(null);
  const [metricsAtTarget, setMetricsAtTarget] = useState<Record<string, unknown> | null>(null);
  const [metricsAtList, setMetricsAtList] = useState<Record<string, unknown> | null>(null);
  const [projections, setProjections] = useState<ProjectionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!property) {
      setData(null);
      setMetricsAtTarget(null);
      setMetricsAtList(null);
      setProjections(null);
      return;
    }

    // Cancel any in-flight request from the previous render
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // Build the verdict input in snake_case to match backend schema
      const input = {
        list_price: property.listPrice,
        monthly_rent: assumptions?.monthlyRent ?? property.monthlyRent ?? undefined,
        property_taxes: property.propertyTaxes ?? undefined,
        insurance: property.insurance ?? undefined,
        arv: property.arv ?? undefined,
        average_daily_rate: assumptions?.averageDailyRate ?? property.averageDailyRate ?? undefined,
        occupancy_rate: assumptions?.occupancyRate ?? property.occupancyRate ?? undefined,
        bedrooms: property.bedrooms ?? 3,
      };

      // Fetch verdict and analytics in parallel
      const [verdictResponse, analyticsResponse] = await Promise.all([
        api.post<IQVerdictResponse>('/api/v1/analysis/verdict', input, {
          signal: controller.signal,
        }),
        fetchAnalyticsData(property, assumptions, growthAssumptions),
      ]);

      // Bail out if aborted between calls
      if (controller.signal.aborted) return;

      // Build componentScores from flat top-level fields returned by backend
      if (!verdictResponse.componentScores) {
        const v = verdictResponse as Record<string, unknown>;
        verdictResponse.componentScores = {
          dealGapScore: Number(v.dealGapScore ?? v.deal_gap_score ?? 0),
          returnQualityScore: Number(v.returnQualityScore ?? v.return_quality_score ?? 0),
          marketAlignmentScore: Number(v.marketAlignmentScore ?? v.market_alignment_score ?? 0),
          dealProbabilityScore: Number(v.dealProbabilityScore ?? v.deal_probability_score ?? 0),
        };
      }

      setData(verdictResponse);
      setProjections(analyticsResponse);

      // Parallel worksheet fetches at target price AND list price (matches frontend)
      const activeStrategy = strategyId || 'ltr';
      const endpoint = WORKSHEET_ENDPOINTS[activeStrategy];
      if (endpoint && verdictResponse.purchasePrice > 0) {
        try {
          const mergedAssumptions: Partial<TargetAssumptions> = {
            monthlyRent: property.monthlyRent,
            propertyTaxes: property.propertyTaxes,
            insurance: property.insurance,
            arv: property.arv,
            averageDailyRate: property.averageDailyRate ?? 200,
            occupancyRate: property.occupancyRate ?? 0.65,
            ...assumptions,
          };

          const [targetResult, listResult] = await Promise.all([
            api.post<Record<string, unknown>>(
              endpoint,
              buildWorksheetPayload(activeStrategy, verdictResponse.purchasePrice, mergedAssumptions, property),
              { signal: controller.signal },
            ),
            api.post<Record<string, unknown>>(
              endpoint,
              buildWorksheetPayload(activeStrategy, property.listPrice, mergedAssumptions, property),
              { signal: controller.signal },
            ),
          ]);

          if (!controller.signal.aborted) {
            setMetricsAtTarget(targetResult);
            setMetricsAtList(listResult);
          }
        } catch (worksheetErr) {
          // Ignore aborted requests; log others as warnings
          if (worksheetErr instanceof Error && worksheetErr.name === 'AbortError') return;
          console.warn('[usePropertyAnalysis] Worksheet fetch failed (non-blocking):', worksheetErr);
        }
      }
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis';
      setError(errorMessage);
      console.error('[usePropertyAnalysis] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [property, assumptions, growthAssumptions, strategyId]);

  // Debounced fetch on mount and when dependencies change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalysis();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalysis]);

  // Convert API response to component-friendly format
  const result = convertToComponentData(data, metricsAtTarget, metricsAtList, projections, property, isLoading, error);

  return {
    ...result,
    refetch: fetchAnalysis,
  };
}

// ============================================
// HELPER: Fetch analytics/projections data
// ============================================

async function fetchAnalyticsData(
  property: PropertyData,
  assumptions?: Partial<TargetAssumptions>,
  growthAssumptions?: GrowthAssumptions
): Promise<ProjectionsData | null> {
  try {
    // Build analytics request
    const analyticsInput = {
      property_id: `prop_${property.address?.replace(/\s+/g, '_') || 'unknown'}`,
      assumptions: {
        financing: {
          purchase_price: property.listPrice * 0.80, // IQ Target
          down_payment_pct: assumptions?.downPaymentPct ?? 0.20,
          interest_rate: assumptions?.interestRate ?? 0.073,
          loan_term_years: assumptions?.loanTermYears ?? 30,
          closing_costs_pct: assumptions?.closingCostsPct ?? 0.03,
        },
        operating: {
          vacancy_rate: assumptions?.vacancyRate ?? 0.05,
          property_management_pct: assumptions?.managementPct ?? 0.08,
          maintenance_pct: assumptions?.maintenancePct ?? 0.05,
        },
        // Growth rates
        appreciation_rate: growthAssumptions?.appreciationRate ?? 0.035,
        rent_growth_rate: growthAssumptions?.rentGrowthRate ?? 0.03,
        expense_growth_rate: growthAssumptions?.expenseGrowthRate ?? 0.025,
      },
    };

    const response = await api.post<AnalyticsApiResponse>(
      '/api/v1/analytics/calculate',
      analyticsInput
    );

    // Convert API response to ProjectionsData
    return convertAnalyticsToProjections(response, property, assumptions, growthAssumptions);
  } catch (err) {
    console.warn('[fetchAnalyticsData] Failed to fetch projections, using local calculation:', err);
    // Return null - the component will fall back to local calculation
    return null;
  }
}

// ============================================
// ANALYTICS API RESPONSE TYPES
// ============================================

interface AnalyticsApiResponse {
  property_id: string;
  calculated_at: string;
  ltr?: {
    monthly_rent: number;
    annual_gross_rent: number;
    annual_cash_flow: number;
    monthly_cash_flow: number;
    cap_rate: number;
    cash_on_cash_return: number;
    noi: number;
    loan_amount: number;
    monthly_pi: number;
    annual_debt_service: number;
    ten_year_projection?: Array<{
      year: number;
      gross_income?: number;
      expenses?: number;
      noi?: number;
      cash_flow: number;
      property_value: number;
      equity?: number;
      cumulative_cash_flow?: number;
    }>;
  };
}

function convertAnalyticsToProjections(
  response: AnalyticsApiResponse,
  property: PropertyData,
  assumptions?: Partial<TargetAssumptions>,
  growthAssumptions?: GrowthAssumptions
): ProjectionsData | null {
  const ltr = response.ltr;
  if (!ltr) return null;

  const purchasePrice = property.listPrice * 0.80;
  const downPaymentPct = assumptions?.downPaymentPct ?? 0.20;
  const closingCostsPct = assumptions?.closingCostsPct ?? 0.03;
  const initialInvestment = purchasePrice * (downPaymentPct + closingCostsPct);
  const loanAmount = purchasePrice * (1 - downPaymentPct);

  // Convert ten_year_projection if available
  let yearlyData: YearlyProjection[] = [];
  let totalCashFlow = 0;

  if (ltr.ten_year_projection && ltr.ten_year_projection.length > 0) {
    yearlyData = ltr.ten_year_projection.map((proj, idx) => {
      totalCashFlow += proj.cash_flow;
      return {
        year: proj.year,
        cashFlow: proj.cash_flow,
        propertyValue: proj.property_value,
        equity: proj.equity ?? (proj.property_value - loanAmount * Math.pow(0.97, idx + 1)),
        cumulativeCashFlow: totalCashFlow,
        grossIncome: proj.gross_income,
        expenses: proj.expenses,
        noi: proj.noi,
      };
    });
  }

  // Generate amortization schedule from loan details
  const amortization = generateAmortizationFromApi(
    loanAmount,
    assumptions?.interestRate ?? 0.073,
    assumptions?.loanTermYears ?? 30
  );

  const finalYear = yearlyData[yearlyData.length - 1];
  const equityBuilt = finalYear ? finalYear.equity - (purchasePrice - loanAmount) : 0;
  const portfolioValue = finalYear?.propertyValue ?? purchasePrice;
  const totalReturn = totalCashFlow + equityBuilt;
  const totalROI = initialInvestment > 0 ? (totalReturn / initialInvestment) * 100 : 0;

  return {
    yearlyData,
    amortization,
    totalCashFlow,
    totalReturn,
    totalROI,
    equityBuilt,
    portfolioValue,
    initialInvestment,
    appreciationRate: growthAssumptions?.appreciationRate ?? 0.035,
    rentGrowthRate: growthAssumptions?.rentGrowthRate ?? 0.03,
    expenseGrowthRate: growthAssumptions?.expenseGrowthRate ?? 0.025,
  };
}

function generateAmortizationFromApi(
  loanAmount: number,
  annualRate: number,
  years: number
): AmortizationRow[] {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  let balance = loanAmount;
  const schedule: AmortizationRow[] = [];
  
  for (let year = 1; year <= years; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    
    for (let month = 1; month <= 12; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      
      yearPrincipal += principalPayment;
      yearInterest += interestPayment;
      balance -= principalPayment;
    }
    
    schedule.push({
      year,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance),
    });
  }
  
  return schedule;
}

// ============================================
// HELPER: Convert API response to component data
// ============================================

function convertToComponentData(
  data: IQVerdictResponse | null,
  metricsAtTarget: Record<string, unknown> | null,
  metricsAtList: Record<string, unknown> | null,
  projections: ProjectionsData | null,
  property: PropertyData | null,
  isLoading: boolean,
  error: string | null,
): PropertyAnalysisResult {
  // Default/fallback values when no data
  const defaultGrades: StrategyGrades = {
    ltr: { grade: '-', score: 0 },
    str: { grade: '-', score: 0 },
    brrrr: { grade: '-', score: 0 },
    flip: { grade: '-', score: 0 },
    house_hack: { grade: '-', score: 0 },
    wholesale: { grade: '-', score: 0 },
  };

  if (!data) {
    return {
      raw: null,
      strategyGrades: defaultGrades,
      targetPrice: property?.listPrice ? Math.round(property.listPrice * 0.80) : 0,
      breakevenPrice: property?.listPrice ? Math.round(property.listPrice * 0.88) : 0,
      discountPercent: 20,
      dealScore: {
        score: 0,
        grade: '-',
        label: 'Loading...',
        color: '#9ca3af',
      },
      opportunityFactors: null,
      returnFactors: null,
      strategies: [],
      metricsAtTarget: null,
      metricsAtList: null,
      projections: null,
      isLoading,
      error,
    };
  }

  // Convert strategies array to grade map
  const strategyGrades: StrategyGrades = { ...defaultGrades };
  
  for (const strategy of data.strategies) {
    const id = strategy.id as StrategyId;
    const grade = scoreToGrade(strategy.score);
    
    if (id in strategyGrades) {
      strategyGrades[id] = { grade, score: strategy.score };
    }
  }

  return {
    raw: data,
    strategyGrades,
    targetPrice: data.purchasePrice,
    breakevenPrice: data.breakevenPrice,
    discountPercent: data.discountPercent,
    dealScore: {
      score: data.opportunity.score,
      grade: data.opportunity.grade,
      label: data.opportunity.label,
      color: data.opportunity.color,
    },
    opportunityFactors: data.opportunityFactors,
    returnFactors: data.returnFactors,
    strategies: data.strategies,
    metricsAtTarget,
    metricsAtList,
    projections,
    isLoading,
    error,
  };
}

// ============================================
// HELPER: Convert score to letter grade
// ============================================

/**
 * Convert numeric score to letter grade — 6-grade system.
 * Matches frontend and useStrategyWorksheet grading.
 */
function scoreToGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

export default usePropertyAnalysis;
