/**
 * Financial Proforma Calculations
 * Matches frontend/src/utils/proforma-calculations.ts
 *
 * Provides: Depreciation, tax projections, exit analysis, IRR/MIRR,
 * investment returns, sensitivity analysis.
 *
 * Uses types from types/proforma.ts which match the backend schema.
 */

import type {
  DepreciationConfig,
  AnnualTaxProjection,
  AmortizationRow,
  AmortizationSummary,
  ExitAnalysis,
  InvestmentReturns,
  SensitivityScenario,
} from '../types/proforma';
import { PROFORMA_DEFAULTS } from '../types/proforma';
import {
  calculateMortgagePayment,
} from '../components/analytics/calculations';

// ============================================
// DEPRECIATION CALCULATIONS
// ============================================

/**
 * Calculate depreciation configuration for tax purposes.
 *
 * @param purchasePrice   Total purchase price
 * @param landValuePercent Fraction allocated to land (non-depreciable)
 * @param closingCosts    Capitalized closing costs (added to basis)
 * @param rehabCosts      Capitalized rehabilitation costs
 * @param isResidential   true → 27.5 yrs, false → 39 yrs (commercial)
 */
export function calculateDepreciation(
  purchasePrice: number,
  landValuePercent: number = PROFORMA_DEFAULTS.land_value_percent,
  closingCosts: number = 0,
  rehabCosts: number = 0,
  isResidential: boolean = true,
): DepreciationConfig {
  const landValue = purchasePrice * landValuePercent;
  const improvementValue = purchasePrice - landValue;
  const depreciationYears = isResidential
    ? PROFORMA_DEFAULTS.depreciation_years_residential
    : PROFORMA_DEFAULTS.depreciation_years_commercial;

  // ~60% of closing costs are typically capitalizable
  const capitalizedClosingCosts = closingCosts * 0.6;

  const totalDepreciableBasis =
    improvementValue + capitalizedClosingCosts + rehabCosts;
  const annualDepreciation = totalDepreciableBasis / depreciationYears;

  return {
    purchase_price: purchasePrice,
    land_value_percent: landValuePercent,
    land_value: landValue,
    improvement_value: improvementValue,
    capitalized_closing_costs: capitalizedClosingCosts,
    rehab_costs: rehabCosts,
    total_depreciable_basis: totalDepreciableBasis,
    depreciation_method: 'straight-line',
    depreciation_years: depreciationYears,
    annual_depreciation: annualDepreciation,
    monthly_depreciation: annualDepreciation / 12,
  };
}

/** Accumulated depreciation at a given year (cannot exceed basis). */
export function calculateAccumulatedDepreciation(
  annualDepreciation: number,
  yearsHeld: number,
  totalDepreciableBasis: number,
): number {
  return Math.min(annualDepreciation * yearsHeld, totalDepreciableBasis);
}

// ============================================
// AMORTIZATION (proforma-level)
// ============================================

/**
 * Generate full proforma amortization schedule with beginning/ending balances.
 */
export function calculateProformaAmortization(
  principal: number,
  annualRate: number, // percentage, e.g. 6.0
  termYears: number,
): { schedule: AmortizationRow[]; summary: AmortizationSummary } {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let month = 1; month <= totalMonths; month++) {
    const beginningBalance = balance;
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      payment_number: month,
      beginning_balance: beginningBalance,
      scheduled_payment: monthlyPayment,
      principal_payment: principalPayment,
      interest_payment: interestPayment,
      ending_balance: balance,
      cumulative_principal: cumulativePrincipal,
      cumulative_interest: cumulativeInterest,
    });
  }

  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + termYears);

  const summary: AmortizationSummary = {
    monthly_payment: monthlyPayment,
    total_payments: monthlyPayment * totalMonths,
    total_principal: principal,
    total_interest: cumulativeInterest,
    principal_percent: (principal / (monthlyPayment * totalMonths)) * 100,
    interest_percent: (cumulativeInterest / (monthlyPayment * totalMonths)) * 100,
    payoff_date: payoffDate.toISOString().split('T')[0],
  };

  return { schedule, summary };
}

/** Get interest and principal paid for a specific year. */
export function getYearlyAmortizationBreakdown(
  schedule: AmortizationRow[],
  year: number,
): { interest: number; principal: number; endingBalance: number } {
  const yearPayments = schedule.filter((row) => row.year === year);
  if (yearPayments.length === 0) {
    return { interest: 0, principal: 0, endingBalance: 0 };
  }
  return {
    interest: yearPayments.reduce((s, r) => s + r.interest_payment, 0),
    principal: yearPayments.reduce((s, r) => s + r.principal_payment, 0),
    endingBalance: yearPayments[yearPayments.length - 1].ending_balance,
  };
}

// ============================================
// TAX PROJECTIONS
// ============================================

/** Calculate after-tax cash flow for a single year. */
export function calculateAnnualTaxProjection(
  year: number,
  grossRentalIncome: number,
  vacancyRate: number,
  operatingExpenses: {
    propertyTaxes: number;
    insurance: number;
    management: number;
    maintenance: number;
    utilities: number;
    hoaFees: number;
    other: number;
  },
  mortgageInterest: number,
  mortgagePrincipal: number,
  depreciation: number,
  marginalTaxRate: number = PROFORMA_DEFAULTS.marginal_tax_rate,
): AnnualTaxProjection {
  const vacancyLoss = grossRentalIncome * vacancyRate;
  const effectiveGrossIncome = grossRentalIncome - vacancyLoss;
  const otherIncome = 0;
  const totalIncome = effectiveGrossIncome + otherIncome;

  const totalOperatingExpenses =
    operatingExpenses.propertyTaxes +
    operatingExpenses.insurance +
    operatingExpenses.management +
    operatingExpenses.maintenance +
    operatingExpenses.utilities +
    operatingExpenses.hoaFees +
    operatingExpenses.other;

  const netOperatingIncome = totalIncome - totalOperatingExpenses;
  const totalDebtService = mortgageInterest + mortgagePrincipal;
  const preTaxCashFlow = netOperatingIncome - totalDebtService;

  // Taxable income = NOI - Interest - Depreciation (principal is NOT deductible)
  const taxableIncome = netOperatingIncome - mortgageInterest - depreciation;
  const estimatedTaxLiability = taxableIncome * marginalTaxRate;
  const taxBenefit = taxableIncome < 0 ? Math.abs(estimatedTaxLiability) : 0;
  const afterTaxCashFlow = preTaxCashFlow - estimatedTaxLiability;

  return {
    year,
    gross_rental_income: grossRentalIncome,
    effective_gross_income: effectiveGrossIncome,
    other_income: otherIncome,
    total_income: totalIncome,
    operating_expenses: totalOperatingExpenses,
    property_taxes: operatingExpenses.propertyTaxes,
    insurance: operatingExpenses.insurance,
    management: operatingExpenses.management,
    maintenance: operatingExpenses.maintenance,
    utilities: operatingExpenses.utilities,
    hoa_fees: operatingExpenses.hoaFees,
    other_expenses: operatingExpenses.other,
    mortgage_interest: mortgageInterest,
    mortgage_principal: mortgagePrincipal,
    total_debt_service: totalDebtService,
    depreciation,
    net_operating_income: netOperatingIncome,
    taxable_income: taxableIncome,
    marginal_tax_rate: marginalTaxRate,
    estimated_tax_liability: estimatedTaxLiability,
    tax_benefit: taxBenefit,
    pre_tax_cash_flow: preTaxCashFlow,
    after_tax_cash_flow: afterTaxCashFlow,
  };
}

/** Generate multi-year tax projections with growth rates. */
export function generateMultiYearProjections(
  baseYear: {
    grossRent: number;
    propertyTaxes: number;
    insurance: number;
    management: number;
    maintenance: number;
    utilities: number;
    hoaFees: number;
    otherExpenses: number;
  },
  vacancyRate: number,
  amortizationSchedule: AmortizationRow[],
  annualDepreciation: number,
  holdPeriodYears: number,
  rentGrowthRate: number,
  expenseGrowthRate: number,
  appreciationRate: number,
  purchasePrice: number,
  marginalTaxRate: number = PROFORMA_DEFAULTS.marginal_tax_rate,
): {
  projections: AnnualTaxProjection[];
  cumulativeCashFlow: number[];
  propertyValues: number[];
  equityPositions: number[];
  loanBalances: number[];
} {
  const projections: AnnualTaxProjection[] = [];
  const cumulativeCashFlow: number[] = [];
  const propertyValues: number[] = [];
  const equityPositions: number[] = [];
  const loanBalances: number[] = [];
  let cumulativeCF = 0;

  for (let year = 1; year <= holdPeriodYears; year++) {
    const growthFactor = Math.pow(1 + rentGrowthRate / 100, year - 1);
    const expGrowthFactor = Math.pow(1 + expenseGrowthRate / 100, year - 1);

    const grossRent = baseYear.grossRent * growthFactor;
    const opex = {
      propertyTaxes: baseYear.propertyTaxes * expGrowthFactor,
      insurance: baseYear.insurance * expGrowthFactor,
      management: baseYear.management * growthFactor, // tied to rent
      maintenance: baseYear.maintenance * growthFactor,
      utilities: baseYear.utilities * expGrowthFactor,
      hoaFees: baseYear.hoaFees * expGrowthFactor,
      other: baseYear.otherExpenses * expGrowthFactor,
    };

    const amortBreak = getYearlyAmortizationBreakdown(amortizationSchedule, year);

    const projection = calculateAnnualTaxProjection(
      year,
      grossRent,
      vacancyRate / 100,
      opex,
      amortBreak.interest,
      amortBreak.principal,
      annualDepreciation,
      marginalTaxRate,
    );

    projections.push(projection);

    cumulativeCF += projection.after_tax_cash_flow;
    cumulativeCashFlow.push(cumulativeCF);

    const propertyValue =
      purchasePrice * Math.pow(1 + appreciationRate / 100, year);
    propertyValues.push(propertyValue);

    const loanBalance = amortBreak.endingBalance;
    loanBalances.push(loanBalance);

    equityPositions.push(propertyValue - loanBalance);
  }

  return {
    projections,
    cumulativeCashFlow,
    propertyValues,
    equityPositions,
    loanBalances,
  };
}

// ============================================
// EXIT ANALYSIS
// ============================================

/** Calculate exit analysis with capital gains tax. */
export function calculateExitAnalysis(
  purchasePrice: number,
  holdPeriodYears: number,
  appreciationRate: number,
  accumulatedDepreciation: number,
  remainingLoanBalance: number,
  rehabCosts: number = 0,
  brokerCommissionPercent: number = PROFORMA_DEFAULTS.broker_commission_percent,
  closingCostsPercent: number = PROFORMA_DEFAULTS.seller_closing_costs_percent,
  capitalGainsTaxRate: number = PROFORMA_DEFAULTS.capital_gains_tax_rate,
): ExitAnalysis {
  const projectedSalePrice =
    purchasePrice * Math.pow(1 + appreciationRate / 100, holdPeriodYears);

  const brokerCommission = projectedSalePrice * brokerCommissionPercent;
  const closingCosts = projectedSalePrice * closingCostsPercent;
  const totalSaleCosts = brokerCommission + closingCosts;

  const netSaleProceeds =
    projectedSalePrice - totalSaleCosts - remainingLoanBalance;

  const originalCostBasis = purchasePrice + rehabCosts;
  const adjustedCostBasis = originalCostBasis - accumulatedDepreciation;
  const totalGain = projectedSalePrice - totalSaleCosts - adjustedCostBasis;

  // Depreciation recapture (Section 1250, taxed at 25%)
  const depreciationRecapture = Math.min(
    accumulatedDepreciation,
    Math.max(0, totalGain),
  );
  const depreciationRecaptureTax =
    depreciationRecapture * PROFORMA_DEFAULTS.depreciation_recapture_rate;

  // Capital gain (remaining, taxed at LTCG rate)
  const capitalGain = Math.max(0, totalGain - depreciationRecapture);
  const capitalGainsTax = capitalGain * capitalGainsTaxRate;

  const totalTaxOnSale = depreciationRecaptureTax + capitalGainsTax;
  const afterTaxProceeds = netSaleProceeds - totalTaxOnSale;

  return {
    hold_period_years: holdPeriodYears,
    initial_value: purchasePrice,
    appreciation_rate: appreciationRate,
    projected_sale_price: projectedSalePrice,
    broker_commission_percent: brokerCommissionPercent,
    broker_commission: brokerCommission,
    closing_costs_percent: closingCostsPercent,
    closing_costs: closingCosts,
    total_sale_costs: totalSaleCosts,
    remaining_loan_balance: remainingLoanBalance,
    prepayment_penalty: 0,
    gross_sale_proceeds: projectedSalePrice,
    net_sale_proceeds: netSaleProceeds,
    adjusted_cost_basis: adjustedCostBasis,
    accumulated_depreciation: accumulatedDepreciation,
    total_gain: totalGain,
    depreciation_recapture: depreciationRecapture,
    depreciation_recapture_tax: depreciationRecaptureTax,
    capital_gain: capitalGain,
    capital_gains_tax_rate: capitalGainsTaxRate,
    capital_gains_tax: capitalGainsTax,
    total_tax_on_sale: totalTaxOnSale,
    after_tax_proceeds: afterTaxProceeds,
  };
}

// ============================================
// INVESTMENT RETURNS — IRR / MIRR
// ============================================

/** Calculate IRR using Newton-Raphson method. Returns percentage. */
export function calculateIRR(
  cashFlows: number[],
  guess: number = 0.1,
): number {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const discountFactor = Math.pow(1 + rate, j);
      npv += cashFlows[j] / discountFactor;
      if (j > 0) {
        derivativeNpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
      }
    }

    if (Math.abs(derivativeNpv) < 0.0001) break;

    const newRate = rate - npv / derivativeNpv;
    if (Math.abs(newRate - rate) < tolerance) return newRate * 100;

    // Prevent divergence
    rate = newRate < -0.99 ? -0.99 : newRate > 10 ? 10 : newRate;
  }

  return rate * 100;
}

/**
 * Calculate Modified IRR.
 * Uses separate finance rate (negative flows) and reinvestment rate (positive flows).
 */
export function calculateMIRR(
  cashFlows: number[],
  financeRate: number = 0.06,
  reinvestmentRate: number = 0.08,
): number {
  const n = cashFlows.length - 1;

  let fvPositive = 0;
  let pvNegative = 0;

  for (let i = 0; i < cashFlows.length; i++) {
    if (cashFlows[i] > 0) {
      fvPositive += cashFlows[i] * Math.pow(1 + reinvestmentRate, n - i);
    } else {
      pvNegative += cashFlows[i] / Math.pow(1 + financeRate, i);
    }
  }

  if (pvNegative === 0 || fvPositive === 0) return 0;

  return (Math.pow(fvPositive / Math.abs(pvNegative), 1 / n) - 1) * 100;
}

/** Calculate complete investment returns. */
export function calculateInvestmentReturns(
  initialInvestment: number,
  annualCashFlows: number[],
  exitProceeds: number,
  financeRate: number = 0.06,
  reinvestmentRate: number = 0.08,
): InvestmentReturns {
  const allCashFlows = [-initialInvestment, ...annualCashFlows];
  allCashFlows[allCashFlows.length - 1] += exitProceeds;

  const irr = calculateIRR(allCashFlows);
  const mirr = calculateMIRR(allCashFlows, financeRate, reinvestmentRate);

  const totalCashFlows = annualCashFlows.reduce((a, b) => a + b, 0);
  const totalDistributions = totalCashFlows + exitProceeds;
  const equityMultiple = totalDistributions / initialInvestment;

  // Payback period
  let cumulative = 0;
  let paybackPeriodMonths: number | null = null;
  for (let i = 0; i < annualCashFlows.length; i++) {
    cumulative += annualCashFlows[i];
    if (cumulative >= initialInvestment && paybackPeriodMonths === null) {
      const priorCum = cumulative - annualCashFlows[i];
      const remainingNeeded = initialInvestment - priorCum;
      const monthsInYear = (remainingNeeded / annualCashFlows[i]) * 12;
      paybackPeriodMonths = i * 12 + Math.ceil(monthsInYear);
    }
  }
  if (
    paybackPeriodMonths === null &&
    cumulative + exitProceeds >= initialInvestment
  ) {
    paybackPeriodMonths = annualCashFlows.length * 12;
  }

  const averageAnnualReturn =
    annualCashFlows.length > 0
      ? (totalCashFlows / annualCashFlows.length) / initialInvestment
      : 0;

  const cagr =
    annualCashFlows.length > 0
      ? Math.pow(equityMultiple, 1 / annualCashFlows.length) - 1
      : 0;

  return {
    irr,
    mirr,
    total_cash_flows: totalCashFlows,
    total_distributions: totalDistributions,
    equity_multiple: equityMultiple,
    payback_period_months: paybackPeriodMonths,
    average_annual_return: averageAnnualReturn * 100,
    cagr: cagr * 100,
  };
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

/** Generate sensitivity scenarios for a variable. */
export function generateSensitivityScenarios(
  baseValue: number,
  variableName: string,
  percentChanges: number[],
  calculateReturns: (
    value: number,
  ) => { irr: number; cashOnCash: number; netProfit: number },
): SensitivityScenario[] {
  return percentChanges.map((changePercent) => {
    const absoluteValue = baseValue * (1 + changePercent / 100);
    const returns = calculateReturns(absoluteValue);

    return {
      variable: variableName,
      change_percent: changePercent,
      absolute_value: absoluteValue,
      irr: returns.irr,
      cash_on_cash: returns.cashOnCash,
      net_profit: returns.netProfit,
    };
  });
}

// ============================================
// UTILITIES
// ============================================

/** Round to nearest dollar. */
export function roundToDollar(value: number): number {
  return Math.round(value);
}

/** Calculate expense ratio (OpEx / EGI). */
export function calculateExpenseRatio(
  operatingExpenses: number,
  effectiveGrossIncome: number,
): number {
  if (effectiveGrossIncome === 0) return 0;
  return (operatingExpenses / effectiveGrossIncome) * 100;
}
