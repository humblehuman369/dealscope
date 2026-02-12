/**
 * useStrategyWorksheet — Generic per-strategy backend worksheet hook
 *
 * Replaces local analyze* functions (analyzeSTR, analyzeBRRRR, etc.)
 * with debounced backend calls to /api/v1/worksheet/{strategy}/calculate.
 *
 * Architecture: All financial calculations run on the backend.
 */

import { useState, useEffect } from 'react';
import { post } from '../services/apiClient';

const DEBOUNCE_MS = 150;

type StrategyKey = 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

const ENDPOINT_MAP: Record<StrategyKey, string> = {
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

/**
 * Build a backend payload from local input objects.
 * Each strategy has its own input shape; this normalizes to the backend format.
 */
function buildPayload(
  strategy: StrategyKey,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  if (strategy === 'str') {
    const s = inputs as Record<string, number>;
    return {
      purchase_price: s.purchasePrice,
      average_daily_rate: s.averageDailyRate,
      occupancy_rate: s.occupancyRate,
      down_payment_pct: (s.downPaymentPercent || 0.2) * 100,
      interest_rate: (s.interestRate || 0.06) * 100,
      loan_term_years: s.loanTermYears || 30,
      closing_costs: s.purchasePrice * (s.closingCostsPercent || 0.03),
      furnishing_budget: s.furnitureSetupCost || s.furnishingBudget || 0,
      platform_fees_pct: s.platformFeesPct ?? s.platformFeeRate ?? 0.03,
      property_management_pct: s.strManagementRate ?? s.managementPct ?? s.managementRate ?? 0.2,
      cleaning_cost_per_turn: s.cleaningCostPerTurnover ?? s.cleaningCostPerTurn ?? 75,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
      maintenance_pct: s.maintenancePct ?? s.maintenanceRate ?? 0.05,
      utilities_monthly: s.utilities ?? 0,
    };
  }

  if (strategy === 'brrrr') {
    const s = inputs as Record<string, number>;
    return {
      purchase_price: s.purchasePrice,
      rehab_costs: s.rehabBudget || s.rehabCosts || 0,
      arv: s.arv || 0,
      monthly_rent: s.monthlyRent || 0,
      down_payment_pct: (s.downPaymentPercent || 0.2) * 100,
      interest_rate: (s.interestRate || 0.06) * 100,
      holding_months: s.holdingPeriodMonths || 6,
      refi_ltv: (s.refinanceLtv || 0.75) * 100,
      refi_interest_rate: (s.refinanceInterestRate || s.interestRate || 0.06) * 100,
      refi_loan_term: s.refinanceLoanTerm || 30,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
      vacancy_rate: s.vacancyRate || 0.05,
      property_management_pct: s.managementPct || 0.08,
      maintenance_pct: s.maintenancePct || 0.05,
    };
  }

  if (strategy === 'flip') {
    const s = inputs as Record<string, number>;
    const purchasePrice = s.purchasePrice || 0;
    const loanAmount = s.loanAmount ?? 0;
    const downPct =
      purchasePrice > 0 && loanAmount < purchasePrice
        ? 1 - loanAmount / purchasePrice
        : 0.1;
    return {
      purchase_price: purchasePrice,
      purchase_costs: purchasePrice * (s.closingCostsPercent ?? 0.02),
      rehab_costs: s.rehabBudget ?? s.rehabCosts ?? 0,
      arv: s.arv ?? 0,
      down_payment_pct: s.downPaymentPercent != null ? s.downPaymentPercent : downPct,
      interest_rate: s.interestRate ?? 0.1,
      points: s.points ?? 2,
      holding_months: s.rehabTimeMonths ?? s.holdingPeriodMonths ?? 6,
      selling_costs_pct: s.sellingCostsPercent ?? 0.08,
      capital_gains_rate: s.capitalGainsRate ?? 0.15,
      property_taxes_annual: s.annualPropertyTax ?? 3600,
      insurance_annual: s.annualInsurance ?? 1500,
    };
  }

  if (strategy === 'house_hack') {
    const s = inputs as Record<string, unknown>;
    const rentPerUnit = (s.rentPerUnit as number[]) || [1500];
    const purchasePrice = (s.purchasePrice as number) || 500000;
    const closingCosts = purchasePrice * ((s.closingCostsPercent as number) || 0.03);
    return {
      purchase_price: purchasePrice,
      unit_rents: rentPerUnit,
      owner_market_rent: (rentPerUnit[0] as number) || (s.currentHousingPayment as number) || 1500,
      down_payment_pct: ((s.downPaymentPercent as number) || 0.05) * 100,
      interest_rate: ((s.interestRate as number) || 0.06) * 100,
      loan_term_years: (s.loanTermYears as number) || 30,
      property_taxes_annual: (s.annualPropertyTax as number) || 6000,
      insurance_annual: (s.annualInsurance as number) || 2400,
      vacancy_rate: (s.vacancyRate as number) || 0.05,
      maintenance_pct: (s.maintenanceRate as number) ?? (s.maintenancePct as number) ?? 0.05,
      closing_costs: closingCosts,
      utilities_monthly: (s.sharedUtilities as number) || 0,
      maintenance_monthly: (s.additionalMaintenance as number) || 0,
    };
  }

  // wholesale
  const s = inputs as Record<string, number>;
  const contractPrice = s.contractPrice || 0;
  const assignmentFee = s.assignmentFee || 10000;
  const marketingCosts = s.marketingCosts || 500;
  return {
    arv: s.arv || 0,
    contract_price: contractPrice,
    investor_price: contractPrice + assignmentFee + marketingCosts,
    rehab_costs: s.estimatedRepairs || s.rehabCosts || 0,
    assignment_fee: assignmentFee,
    marketing_costs: marketingCosts,
    earnest_money: s.earnestMoney || 1000,
  };
}

/**
 * Map backend snake_case result to camelCase metrics expected by mobile screens.
 */
function mapResultToMetrics(
  strategy: StrategyKey,
  result: Record<string, unknown>,
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  if (strategy === 'house_hack') {
    const yourHousingCost = (result.your_housing_cost as number) ?? 0;
    const currentHousing = (inputs.currentHousingPayment as number) ?? 2000;
    const housingReduction =
      currentHousing > 0 ? ((currentHousing - yourHousingCost) / currentHousing) * 100 : 0;
    const rentedUnits = (inputs.rentedUnits as number) ?? ((inputs.rentPerUnit as number[]) || []).length || 1;
    const fullRentalCashFlow = (result.full_rental_cash_flow as number) ?? 0;
    return {
      ...result,
      effectiveHousingCost: yourHousingCost,
      mortgagePayment: result.monthly_payment,
      totalMonthlyExpenses: result.total_monthly_expenses,
      housingCostSavings: result.savings_vs_renting,
      housingCostReductionPercent: housingReduction,
      totalCashRequired: result.total_cash_needed,
      monthlyCashFlow: fullRentalCashFlow,
      cashOnCash: (result.coc_return as number) ?? 0,
      annualCashFlow: (result.full_rental_annual as number) ?? fullRentalCashFlow * 12,
      cashFlowPerRentedUnit: rentedUnits > 0 ? fullRentalCashFlow / rentedUnits : 0,
      yearOneEquityGrowth: ((result.loan_amount as number) ?? 0) * 0.02 / 12,
      rentVsBuyBenefit: result.savings_vs_renting,
    };
  }
  if (strategy === 'wholesale') {
    const investorPrice = (result.investor_price as number) ?? (inputs.contractPrice as number) + (inputs.assignmentFee as number);
    const mao = (result.mao as number) ?? 0;
    return {
      ...result,
      netProfit: result.net_profit,
      roi: result.roi,
      totalCashRequired: result.total_cash_at_risk,
      maxAllowableOffer: mao,
      meetsSeventyPercentRule: investorPrice <= mao,
      endBuyerAllInPrice: result.investor_all_in,
      endBuyerMaxProfit: result.investor_profit,
    };
  }
  return result;
}

function getGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function getColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e';
    case 'B':
      return '#3b82f6';
    case 'C':
      return '#f97316';
    default:
      return '#ef4444';
  }
}

export interface StrategyWorksheetResult {
  score: number;
  grade: string;
  color: string;
  isViable: boolean;
  metrics: Record<string, unknown>;
  insights: Array<{ type: string; text: string; icon?: string; highlight?: string }>;
}

export interface UseStrategyWorksheetReturn {
  analysis: StrategyWorksheetResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useStrategyWorksheet(
  strategy: StrategyKey,
  inputs: Record<string, unknown>,
): UseStrategyWorksheetReturn {
  const [analysis, setAnalysis] = useState<StrategyWorksheetResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = buildPayload(strategy, inputs);
        const result = await post<Record<string, unknown>>(
          ENDPOINT_MAP[strategy],
          payload,
        );

        const score = (result.deal_score as number) || 0;
        const grade = getGrade(score);

        // Map backend result to screen-expected camelCase metrics per strategy
        const metrics = mapResultToMetrics(strategy, result, inputs);

        // Generate simple insights from metrics
        const monthlyCashFlow = (result.monthly_cash_flow as number) ?? (metrics.monthlyCashFlow as number) ?? 0;
        const insights: StrategyWorksheetResult['insights'] = [];
        if (monthlyCashFlow > 0) {
          insights.push({
            type: 'strength',
            text: `Positive monthly cash flow of $${Math.round(monthlyCashFlow).toLocaleString()}`,
            icon: '✅',
          });
        } else if (monthlyCashFlow < 0) {
          insights.push({
            type: 'concern',
            text: `Negative monthly cash flow of $${Math.round(Math.abs(monthlyCashFlow)).toLocaleString()}`,
            icon: '⚠️',
          });
        }

        setAnalysis({
          score,
          grade,
          color: getColor(grade),
          isViable: monthlyCashFlow > 0 || score >= 40,
          metrics,
          insights,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to calculate strategy',
        );
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [strategy, inputs]);

  return { analysis, isLoading, error };
}
