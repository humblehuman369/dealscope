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

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import { StrategyId, TargetAssumptions, PropertyData } from '../components/analytics/redesign/types';

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

export function usePropertyAnalysis(
  property: PropertyData | null,
  assumptions?: Partial<TargetAssumptions>,
  growthAssumptions?: GrowthAssumptions
): PropertyAnalysisResult & { refetch: () => Promise<void> } {
  const [data, setData] = useState<IQVerdictResponse | null>(null);
  const [projections, setProjections] = useState<ProjectionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!property) {
      setData(null);
      setProjections(null);
      return;
    }

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
        api.post<IQVerdictResponse>('/api/v1/analysis/verdict', input),
        fetchAnalyticsData(property, assumptions, growthAssumptions),
      ]);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis';
      setError(errorMessage);
      console.error('[usePropertyAnalysis] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [property, assumptions, growthAssumptions]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Convert API response to component-friendly format
  const result = convertToComponentData(data, projections, property, isLoading, error);

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
  projections: ProjectionsData | null,
  property: PropertyData | null,
  isLoading: boolean,
  error: string | null
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
    projections,
    isLoading,
    error,
  };
}

// ============================================
// HELPER: Convert score to letter grade
// ============================================

function scoreToGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 60) return 'A-';
  if (score >= 55) return 'B+';
  if (score >= 50) return 'B';
  if (score >= 45) return 'B-';
  if (score >= 40) return 'C+';
  if (score >= 35) return 'C';
  if (score >= 30) return 'C-';
  if (score >= 25) return 'D';
  return 'F';
}

export default usePropertyAnalysis;
