/**
 * useDealMakerBackendCalc — Debounced backend calculation for Deal Maker
 *
 * Multi-strategy hook that routes to the correct worksheet endpoint
 * based on the active strategy type. Matches the frontend's
 * useDealMakerBackendCalc architecture.
 *
 * Architecture: All financial calculations run on the backend.
 * The client only provides inputs and displays results.
 */

import { useState, useEffect, useRef } from 'react';
import { post } from '../services/apiClient';
import { DealMakerState, DealMakerMetrics } from '../components/deal-maker/types';
import { StrategyType } from '../types/api';

const DEBOUNCE_MS = 150;

// ─── Endpoint mapping (matches frontend) ────────────────────────────────────

const WORKSHEET_ENDPOINTS: Record<StrategyType, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

// ─── Backend result types ───────────────────────────────────────────────────

interface BackendLTRResult {
  gross_income: number;
  annual_gross_rent: number;
  vacancy_loss: number;
  gross_expenses: number;
  property_taxes: number;
  insurance: number;
  property_management: number;
  maintenance: number;
  maintenance_only: number;
  capex: number;
  hoa_fees: number;
  loan_amount: number;
  down_payment: number;
  closing_costs: number;
  monthly_payment: number;
  annual_debt_service: number;
  noi: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cap_rate: number;
  cash_on_cash_return: number;
  dscr: number;
  grm: number;
  one_percent_rule: number;
  arv: number;
  arv_psf: number;
  price_psf: number;
  rehab_psf: number;
  equity: number;
  equity_after_rehab: number;
  mao: number;
  total_cash_needed: number;
  ltv: number;
  deal_score: number;
}

// ─── Payload builders (per-strategy, matches frontend) ──────────────────────

function buildPayload(
  strategyType: StrategyType,
  state: DealMakerState & Record<string, unknown>,
): Record<string, unknown> {
  // LTR — default / most common
  if (strategyType === 'ltr') {
    return {
      purchase_price: state.buyPrice,
      monthly_rent: state.monthlyRent + (state.otherIncome || 0),
      down_payment_pct: state.downPaymentPercent,
      interest_rate: state.interestRate * 100, // Backend expects percentage (6.0 not 0.06)
      loan_term_years: state.loanTermYears,
      closing_costs: state.buyPrice * state.closingCostsPercent,
      rehab_costs: state.rehabBudget,
      arv: state.arv,
      vacancy_rate: state.vacancyRate,
      property_management_pct: state.managementRate,
      maintenance_pct: state.maintenanceRate,
      property_taxes_annual: state.annualPropertyTax,
      insurance_annual: state.annualInsurance,
      hoa_monthly: state.monthlyHoa,
    };
  }

  // STR
  if (strategyType === 'str') {
    return {
      purchase_price: state.buyPrice,
      average_daily_rate: state['averageDailyRate'] || 200,
      occupancy_rate: state['occupancyRate'] || 0.70,
      down_payment_pct: state.downPaymentPercent * 100,
      interest_rate: state.interestRate * 100,
      loan_term_years: state.loanTermYears,
      closing_costs: state.buyPrice * state.closingCostsPercent,
      furnishing_budget: state['furnitureSetupCost'] || state['furnishingBudget'] || 0,
      platform_fees_pct: state['platformFeesPct'] || 0.03,
      property_management_pct: state['strManagementRate'] || state.managementRate || 0.20,
      cleaning_cost_per_turn: state['cleaningCostPerTurnover'] || 75,
      property_taxes_annual: state.annualPropertyTax,
      insurance_annual: state.annualInsurance,
      maintenance_pct: state.maintenanceRate || 0.05,
    };
  }

  // BRRRR
  if (strategyType === 'brrrr') {
    return {
      purchase_price: state.buyPrice,
      rehab_costs: state.rehabBudget || 0,
      arv: state.arv || 0,
      monthly_rent: state.monthlyRent || 0,
      down_payment_pct: state.downPaymentPercent * 100,
      interest_rate: state.interestRate * 100,
      holding_months: state['holdingPeriodMonths'] || 6,
      refi_ltv: (state['refinanceLtv'] || 0.75) * 100,
      refi_interest_rate: (state['refinanceInterestRate'] || state.interestRate || 0.06) * 100,
      refi_loan_term: state['refinanceLoanTerm'] || 30,
      property_taxes_annual: state.annualPropertyTax,
      insurance_annual: state.annualInsurance,
      vacancy_rate: state.vacancyRate || 0.05,
      property_management_pct: state.managementRate || 0.08,
      maintenance_pct: state.maintenanceRate || 0.05,
    };
  }

  // Flip
  if (strategyType === 'flip') {
    return {
      purchase_price: state.buyPrice,
      rehab_costs: state.rehabBudget || 0,
      arv: state.arv || 0,
      down_payment_pct: state.downPaymentPercent * 100,
      interest_rate: state.interestRate * 100,
      holding_months: state['holdingPeriodMonths'] || 6,
      selling_costs_pct: (state['sellingCostsPct'] || 0.08) * 100,
      capital_gains_rate: (state['capitalGainsRate'] || 0.15) * 100,
      property_taxes_annual: state.annualPropertyTax,
      insurance_annual: state.annualInsurance,
    };
  }

  // House Hack
  if (strategyType === 'house_hack') {
    return {
      purchase_price: state.buyPrice,
      unit_rents: state['unitRents'] || [state['avgRentPerUnit'] || 1500],
      down_payment_pct: state.downPaymentPercent * 100,
      interest_rate: state.interestRate * 100,
      loan_term_years: state.loanTermYears,
      property_taxes_annual: state.annualPropertyTax,
      insurance_annual: state.annualInsurance,
      vacancy_rate: state.vacancyRate || 0.05,
      maintenance_pct: state.maintenanceRate || 0.05,
    };
  }

  // Wholesale
  return {
    arv: state.arv || 0,
    contract_price: state['contractPrice'] || 0,
    investor_price:
      state['investorPrice'] ||
      (state['contractPrice'] || 0) + (state['assignmentFee'] || 10000),
    rehab_costs: state['estimatedRepairs'] || state.rehabBudget || 0,
    assignment_fee: state['assignmentFee'] || 10000,
    earnest_money: state['earnestMoney'] || 1000,
  };
}

// ─── Result mapper (LTR) ───────────────────────────────────────────────────

function mapResultToMetrics(
  result: BackendLTRResult,
  state: DealMakerState,
  listPrice?: number,
): DealMakerMetrics {
  const effectiveListPrice = listPrice ?? state.buyPrice;
  const dealGap =
    effectiveListPrice > 0
      ? (effectiveListPrice - state.buyPrice) / effectiveListPrice
      : 0;

  const score = result.deal_score ?? 0;

  return {
    cashNeeded: result.total_cash_needed,
    downPaymentAmount: result.down_payment,
    closingCostsAmount: result.closing_costs,
    loanAmount: result.loan_amount,
    monthlyPayment: result.monthly_payment,
    equityCreated: result.equity_after_rehab ?? result.equity ?? 0,
    totalInvestment: state.buyPrice + state.rehabBudget,
    grossMonthlyIncome: result.gross_income / 12,
    totalMonthlyExpenses:
      (result.gross_expenses + result.annual_debt_service) / 12,
    monthlyOperatingExpenses: result.gross_expenses / 12,
    dealGap,
    annualProfit: result.annual_cash_flow,
    capRate: result.cap_rate * 100,
    cocReturn: result.cash_on_cash_return * 100,
    dealScore: score,
    dealGrade: getDealGrade(score),
    profitQuality: getProfitQualityGrade(result.cash_on_cash_return),
  };
}

// ─── Grade helpers ──────────────────────────────────────────────────────────

function getDealGrade(
  score: number,
): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function getProfitQualityGrade(
  cocReturn: number,
): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const cocPercent = cocReturn * 100;
  if (cocPercent >= 12) return 'A+';
  if (cocPercent >= 10) return 'A';
  if (cocPercent >= 8) return 'B';
  if (cocPercent >= 5) return 'C';
  if (cocPercent >= 2) return 'D';
  return 'F';
}

// ─── Local fallback ─────────────────────────────────────────────────────────

/**
 * Local fallback calculation used only while the first backend call is in
 * flight (to avoid a blank screen on mount). Once the backend responds,
 * its result takes over permanently.
 */
function calculateLocalFallback(
  state: DealMakerState,
  listPrice?: number,
): DealMakerMetrics {
  const downPaymentAmount = state.buyPrice * state.downPaymentPercent;
  const closingCostsAmount = state.buyPrice * state.closingCostsPercent;
  const cashNeeded = downPaymentAmount + closingCostsAmount;
  const loanAmount = state.buyPrice - downPaymentAmount;

  const monthlyRate = state.interestRate / 12;
  const numPayments = state.loanTermYears * 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount / numPayments;

  const grossMonthlyIncome = state.monthlyRent + state.otherIncome;
  const monthlyOpex =
    grossMonthlyIncome * state.vacancyRate +
    grossMonthlyIncome * state.maintenanceRate +
    grossMonthlyIncome * state.managementRate +
    state.annualPropertyTax / 12 +
    state.annualInsurance / 12 +
    state.monthlyHoa;
  const totalMonthlyExpenses = monthlyOpex + monthlyPayment;
  const annualCashFlow = (grossMonthlyIncome - totalMonthlyExpenses) * 12;
  const annualNOI = (grossMonthlyIncome - monthlyOpex) * 12;

  const effectiveListPrice = listPrice ?? state.buyPrice;
  const dealGap =
    effectiveListPrice > 0
      ? (effectiveListPrice - state.buyPrice) / effectiveListPrice
      : 0;

  return {
    cashNeeded,
    downPaymentAmount,
    closingCostsAmount,
    loanAmount,
    monthlyPayment,
    equityCreated: state.arv - state.buyPrice - state.rehabBudget,
    totalInvestment: state.buyPrice + state.rehabBudget,
    grossMonthlyIncome,
    totalMonthlyExpenses,
    monthlyOperatingExpenses: monthlyOpex,
    dealGap,
    annualProfit: annualCashFlow,
    capRate: state.buyPrice > 0 ? (annualNOI / state.buyPrice) * 100 : 0,
    cocReturn: cashNeeded > 0 ? (annualCashFlow / cashNeeded) * 100 : 0,
    dealScore: 0,
    dealGrade: 'F',
    profitQuality: 'F',
  };
}

// ─── Hook exports ───────────────────────────────────────────────────────────

export interface UseDealMakerBackendCalcReturn {
  metrics: DealMakerMetrics;
  isCalculating: boolean;
  error: string | null;
}

/**
 * Multi-strategy debounced backend calculation hook.
 *
 * @param state      Current DealMaker form state
 * @param listPrice  Original list price (for deal-gap calculation)
 * @param strategy   Active strategy type (defaults to 'ltr' for backward compatibility)
 */
export function useDealMakerBackendCalc(
  state: DealMakerState,
  listPrice?: number,
  strategy: StrategyType = 'ltr',
): UseDealMakerBackendCalcReturn {
  const [metrics, setMetrics] = useState<DealMakerMetrics>(() =>
    calculateLocalFallback(state, listPrice),
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasReceivedBackend = useRef(false);

  useEffect(() => {
    // Immediately update the local fallback so the UI stays responsive
    if (!hasReceivedBackend.current) {
      setMetrics(calculateLocalFallback(state, listPrice));
    }

    const endpoint = WORKSHEET_ENDPOINTS[strategy];

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const payload = buildPayload(strategy, state as DealMakerState & Record<string, unknown>);
        const result = await post<BackendLTRResult>(endpoint, payload);
        hasReceivedBackend.current = true;
        setMetrics(mapResultToMetrics(result, state, listPrice));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to calculate ${strategy} worksheet metrics`;
        setError(message);
        // Keep showing fallback metrics on error
      } finally {
        setIsCalculating(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state, listPrice, strategy]);

  return { metrics, isCalculating, error };
}

// ─── Generic multi-strategy hook ────────────────────────────────────────────

/**
 * Generic version that returns the raw backend response for any strategy.
 * Use this when consuming strategy-specific result shapes directly.
 */
export interface UseStrategyCalcReturn<T> {
  result: T | null;
  isCalculating: boolean;
  error: string | null;
}

export function useStrategyCalc<T>(
  strategyType: StrategyType,
  state: Record<string, unknown>,
): UseStrategyCalcReturn<T> {
  const [result, setResult] = useState<T | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = WORKSHEET_ENDPOINTS[strategyType];

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const payload = buildPayload(strategyType, state as DealMakerState & Record<string, unknown>);
        const data = await post<T>(endpoint, payload);
        setResult(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to calculate ${strategyType} worksheet metrics`;
        setError(message);
      } finally {
        setIsCalculating(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [strategyType, state, endpoint]);

  return { result, isCalculating, error };
}
