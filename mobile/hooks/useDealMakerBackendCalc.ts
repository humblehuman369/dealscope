/**
 * useDealMakerBackendCalc — Debounced backend calculation for Deal Maker
 *
 * Replaces local calculateDealMakerMetrics() with a backend call to
 * POST /api/v1/worksheet/ltr/calculate.
 *
 * Architecture: All financial calculations run on the backend.
 * The client only provides inputs and displays results.
 */

import { useState, useEffect, useRef } from 'react';
import { post } from '../services/apiClient';
import { DealMakerState, DealMakerMetrics } from '../components/deal-maker/types';

const DEBOUNCE_MS = 150;

interface BackendLTRResult {
  // Fields returned by POST /api/v1/worksheet/ltr/calculate
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

/**
 * Map DealMaker UI state to the backend LTR worksheet payload.
 * The backend expects snake_case fields with specific semantics.
 */
function buildPayload(state: DealMakerState): Record<string, unknown> {
  return {
    purchase_price: state.buyPrice,
    monthly_rent: state.monthlyRent + state.otherIncome,
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

/**
 * Map backend LTR result to the DealMakerMetrics shape the UI expects.
 */
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
    capRate: result.cap_rate * 100, // UI shows percentage
    cocReturn: result.cash_on_cash_return * 100, // UI shows percentage
    dealScore: score,
    dealGrade: getDealGrade(score),
    profitQuality: getProfitQualityGrade(result.cash_on_cash_return),
  };
}

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

  // Simple mortgage payment for initial render only
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

export interface UseDealMakerBackendCalcReturn {
  metrics: DealMakerMetrics;
  isCalculating: boolean;
  error: string | null;
}

export function useDealMakerBackendCalc(
  state: DealMakerState,
  listPrice?: number,
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

    const timer = setTimeout(async () => {
      setIsCalculating(true);
      setError(null);

      try {
        const payload = buildPayload(state);
        const result = await post<BackendLTRResult>(
          '/api/v1/worksheet/ltr/calculate',
          payload,
        );
        hasReceivedBackend.current = true;
        setMetrics(mapResultToMetrics(result, state, listPrice));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to calculate worksheet metrics';
        setError(message);
        // Keep showing fallback metrics on error
      } finally {
        setIsCalculating(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state, listPrice]);

  return { metrics, isCalculating, error };
}
