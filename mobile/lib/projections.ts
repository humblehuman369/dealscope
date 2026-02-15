/**
 * InvestIQ — Projections & Comparison Engine
 * Matches frontend/src/lib/projections.ts
 *
 * 10-year projections, scenario comparison, and multi-property analysis.
 * Provides client-side fallback when backend projections are unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export interface YearlyProjection {
  year: number;
  // Cash Flow
  grossRent: number;
  effectiveRent: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  // Loan
  loanBalance: number;
  principalPaid: number;
  interestPaid: number;
  cumulativePrincipal: number;
  // Equity
  propertyValue: number;
  totalEquity: number;
  equityFromAppreciation: number;
  equityFromPaydown: number;
  // Returns
  cashOnCash: number;
  totalReturn: number;
  // Wealth
  totalWealth: number;
}

export interface ProjectionAssumptions {
  // Property
  purchasePrice: number;
  downPaymentPct: number;
  closingCostsPct: number;
  // Financing
  interestRate: number;
  loanTermYears: number;
  // Income
  monthlyRent: number;
  annualRentGrowth: number;
  vacancyRate: number;
  // Expenses
  propertyTaxes: number;
  insurance: number;
  propertyTaxGrowth: number;
  insuranceGrowth: number;
  managementPct: number;
  maintenancePct: number;
  capexReservePct: number;
  // Appreciation
  annualAppreciation: number;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  assumptions: ProjectionAssumptions;
  projections: YearlyProjection[];
  summary: ProjectionSummary;
}

export interface ProjectionSummary {
  totalCashInvested: number;
  totalCashFlow: number;
  totalEquityGain: number;
  totalWealth: number;
  avgCashOnCash: number;
  avgAnnualReturn: number;
  equityMultiple: number;
  irr: number;
}

export interface PropertyComparison {
  id: string;
  address: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  purchasePrice: number;
  monthlyRent: number;
  // Key Metrics
  monthlyCashFlow: number;
  cashOnCash: number;
  capRate: number;
  onePercentRule: number;
  dscr: number;
  totalCashRequired: number;
  // 10-Year Summary
  year10Equity: number;
  year10CashFlow: number;
  year10TotalWealth: number;
  avgAnnualReturn: number;
}

// ============================================
// PROJECTION CALCULATOR
// ============================================

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (annualRate === 0) return principal / (years * 12);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

export function calculateLoanBalance(
  principal: number,
  annualRate: number,
  totalYears: number,
  yearsElapsed: number,
): number {
  if (yearsElapsed >= totalYears) return 0;
  if (annualRate === 0) return principal * (1 - yearsElapsed / totalYears);

  const monthlyRate = annualRate / 12;
  const paymentsMade = yearsElapsed * 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, totalYears);

  const balance =
    principal * Math.pow(1 + monthlyRate, paymentsMade) -
    (monthlyPayment * (Math.pow(1 + monthlyRate, paymentsMade) - 1)) / monthlyRate;

  return Math.max(0, balance);
}

export function calculate10YearProjections(
  assumptions: ProjectionAssumptions,
): YearlyProjection[] {
  const projections: YearlyProjection[] = [];

  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct;
  const closingCosts = assumptions.purchasePrice * assumptions.closingCostsPct;
  const loanAmount = assumptions.purchasePrice - downPayment;
  const totalCashInvested = downPayment + closingCosts;

  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    assumptions.interestRate,
    assumptions.loanTermYears,
  );
  const annualDebtService = monthlyPayment * 12;

  let cumulativeCashFlow = 0;
  let cumulativePrincipal = 0;
  let previousLoanBalance = loanAmount;

  for (let year = 1; year <= 10; year++) {
    // Property value with appreciation
    const propertyValue =
      assumptions.purchasePrice * Math.pow(1 + assumptions.annualAppreciation, year);

    // Rent growth
    const grossRent =
      assumptions.monthlyRent * 12 * Math.pow(1 + assumptions.annualRentGrowth, year - 1);
    const effectiveRent = grossRent * (1 - assumptions.vacancyRate);

    // Operating expenses with growth
    const propertyTaxes =
      assumptions.propertyTaxes * Math.pow(1 + assumptions.propertyTaxGrowth, year - 1);
    const insurance =
      assumptions.insurance * Math.pow(1 + assumptions.insuranceGrowth, year - 1);
    const management = grossRent * assumptions.managementPct;
    const maintenance = grossRent * assumptions.maintenancePct;
    const capex = grossRent * assumptions.capexReservePct;

    const operatingExpenses = propertyTaxes + insurance + management + maintenance + capex;
    const noi = effectiveRent - operatingExpenses;
    const cashFlow = noi - annualDebtService;
    cumulativeCashFlow += cashFlow;

    // Loan amortization
    const loanBalance = calculateLoanBalance(
      loanAmount,
      assumptions.interestRate,
      assumptions.loanTermYears,
      year,
    );
    const principalPaid = previousLoanBalance - loanBalance;
    const interestPaid = annualDebtService - principalPaid;
    cumulativePrincipal += principalPaid;
    previousLoanBalance = loanBalance;

    // Equity calculation
    const totalEquity = propertyValue - loanBalance;
    const equityFromAppreciation = propertyValue - assumptions.purchasePrice;
    const equityFromPaydown = cumulativePrincipal;

    // Returns
    const cashOnCash = totalCashInvested > 0 ? cashFlow / totalCashInvested : 0;
    const totalEquityGain = totalEquity - downPayment;
    const totalReturn =
      totalCashInvested > 0 ? (cumulativeCashFlow + totalEquityGain) / totalCashInvested : 0;

    // Total wealth = cash received + equity built
    const totalWealth = cumulativeCashFlow + totalEquity;

    projections.push({
      year,
      grossRent,
      effectiveRent,
      operatingExpenses,
      noi,
      debtService: annualDebtService,
      cashFlow,
      cumulativeCashFlow,
      loanBalance,
      principalPaid,
      interestPaid,
      cumulativePrincipal,
      propertyValue,
      totalEquity,
      equityFromAppreciation,
      equityFromPaydown,
      cashOnCash,
      totalReturn,
      totalWealth,
    });
  }

  return projections;
}

export function calculateProjectionSummary(
  projections: YearlyProjection[],
  totalCashInvested: number,
): ProjectionSummary {
  const year10 = projections[9];
  const totalCashFlow = year10.cumulativeCashFlow;
  const totalEquityGain = year10.totalEquity - totalCashInvested * 0.97;

  const avgCashOnCash = projections.reduce((sum, p) => sum + p.cashOnCash, 0) / 10;
  const avgAnnualReturn = projections.reduce((sum, p) => sum + p.totalReturn, 0) / 10;

  // Simple IRR approximation
  const cashFlows = [-totalCashInvested, ...projections.map((p) => p.cashFlow)];
  cashFlows[10] += year10.totalEquity; // Add equity at sale in year 10
  const irr = approximateIRR(cashFlows);

  return {
    totalCashInvested,
    totalCashFlow,
    totalEquityGain,
    totalWealth: year10.totalWealth,
    avgCashOnCash,
    avgAnnualReturn,
    equityMultiple: totalCashInvested > 0 ? year10.totalWealth / totalCashInvested : 0,
    irr,
  };
}

function approximateIRR(cashFlows: number[]): number {
  // Newton-Raphson method for IRR
  let rate = 0.1;
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      derivativeNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(npv) < tolerance) break;
    if (derivativeNpv === 0) break;

    rate = rate - npv / derivativeNpv;

    // Clamp rate to reasonable bounds
    rate = Math.max(-0.99, Math.min(rate, 2));
  }

  return rate;
}

// ============================================
// DEFAULT PROJECTION ASSUMPTIONS
// ============================================

export function getDefaultProjectionAssumptions(
  purchasePrice: number,
  monthlyRent: number,
  propertyTaxes: number,
): ProjectionAssumptions {
  return {
    purchasePrice,
    downPaymentPct: 0.2,
    closingCostsPct: 0.03,
    interestRate: 0.075,
    loanTermYears: 30,
    monthlyRent,
    annualRentGrowth: 0.03,
    vacancyRate: 0.05,
    propertyTaxes,
    insurance: 1500,
    propertyTaxGrowth: 0.02,
    insuranceGrowth: 0.03,
    managementPct: 0.08,
    maintenancePct: 0.05,
    capexReservePct: 0.05,
    annualAppreciation: 0.03,
  };
}

// ============================================
// SCENARIO MANAGEMENT
// ============================================

const SCENARIOS_STORAGE_KEY = 'investiq-scenarios';
const COMPARISONS_STORAGE_KEY = 'investiq-comparisons';

export function createScenario(name: string, assumptions: ProjectionAssumptions): Scenario {
  const projections = calculate10YearProjections(assumptions);
  const totalCashInvested =
    assumptions.purchasePrice * assumptions.downPaymentPct +
    assumptions.purchasePrice * assumptions.closingCostsPct;
  const summary = calculateProjectionSummary(projections, totalCashInvested);

  return {
    id: `scenario-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    assumptions,
    projections,
    summary,
  };
}

export async function saveScenarios(scenarios: Scenario[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  } catch (err) {
    console.warn('[projections] Failed to save scenarios:', err);
  }
}

export async function loadScenarios(): Promise<Scenario[]> {
  try {
    const saved = await AsyncStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn('[projections] Failed to load scenarios:', err);
  }
  return [];
}

// ============================================
// MULTI-PROPERTY COMPARISON
// ============================================

export function createPropertyComparison(
  property: {
    address: string;
    propertyType: string;
    beds: number;
    baths: number;
    sqft: number;
    purchasePrice: number;
    monthlyRent: number;
    propertyTaxes: number;
  },
  assumptions: Partial<ProjectionAssumptions> = {},
): PropertyComparison {
  const fullAssumptions = {
    ...getDefaultProjectionAssumptions(
      property.purchasePrice,
      property.monthlyRent,
      property.propertyTaxes,
    ),
    ...assumptions,
  };

  const projections = calculate10YearProjections(fullAssumptions);
  const year10 = projections[9];

  // Calculate immediate metrics
  const downPayment = property.purchasePrice * fullAssumptions.downPaymentPct;
  const closingCosts = property.purchasePrice * fullAssumptions.closingCostsPct;
  const totalCashRequired = downPayment + closingCosts;
  const loanAmount = property.purchasePrice - downPayment;

  const monthlyPI = calculateMonthlyPayment(loanAmount, fullAssumptions.interestRate, 30);
  const annualDebtService = monthlyPI * 12;

  const annualRent = property.monthlyRent * 12;
  const effectiveRent = annualRent * (1 - fullAssumptions.vacancyRate);
  const opEx =
    fullAssumptions.propertyTaxes +
    fullAssumptions.insurance +
    annualRent * (fullAssumptions.managementPct + fullAssumptions.maintenancePct);
  const noi = effectiveRent - opEx;
  const annualCashFlow = noi - annualDebtService;

  return {
    id: `property-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    address: property.address,
    propertyType: property.propertyType,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    purchasePrice: property.purchasePrice,
    monthlyRent: property.monthlyRent,
    monthlyCashFlow: annualCashFlow / 12,
    cashOnCash: totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0,
    capRate: property.purchasePrice > 0 ? noi / property.purchasePrice : 0,
    onePercentRule: property.purchasePrice > 0 ? property.monthlyRent / property.purchasePrice : 0,
    dscr: annualDebtService > 0 ? noi / annualDebtService : 0,
    totalCashRequired,
    year10Equity: year10.totalEquity,
    year10CashFlow: year10.cumulativeCashFlow,
    year10TotalWealth: year10.totalWealth,
    avgAnnualReturn: projections.reduce((sum, p) => sum + p.totalReturn, 0) / 10,
  };
}

export async function savePropertyComparisons(properties: PropertyComparison[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(properties));
  } catch (err) {
    console.warn('[projections] Failed to save comparisons:', err);
  }
}

export async function loadPropertyComparisons(): Promise<PropertyComparison[]> {
  try {
    const saved = await AsyncStorage.getItem(COMPARISONS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn('[projections] Failed to load comparisons:', err);
  }
  return [];
}
