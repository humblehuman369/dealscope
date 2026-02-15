// ============================================
// DealGapIQ Financial Proforma Types
// Accounting-Standard Export Data Structures
// ============================================

/**
 * Tax & Depreciation Configuration
 * Required for GAAP/tax-compliant proformas
 */
export interface DepreciationConfig {
  // Basis allocation
  purchasePrice: number;
  landValuePercent: number;           // Typically 15-25% (non-depreciable)
  landValue: number;                  // Calculated: purchasePrice × landValuePercent
  improvementValue: number;           // Depreciable basis: purchasePrice - landValue
  
  // Capitalized costs (added to basis)
  capitalizedClosingCosts: number;    // Loan fees, title, legal, etc.
  rehabCosts: number;                 // Capitalized improvements
  totalDepreciableBasis: number;      // improvementValue + capitalizedClosingCosts + rehabCosts
  
  // Depreciation schedule
  depreciationMethod: 'straight-line' | 'macrs';
  depreciationYears: number;          // 27.5 residential, 39 commercial
  annualDepreciation: number;         // totalDepreciableBasis / depreciationYears
  monthlyDepreciation: number;        // annualDepreciation / 12
}

/**
 * Tax Projection for Each Year
 */
export interface AnnualTaxProjection {
  year: number;
  
  // Income
  grossRentalIncome: number;
  effectiveGrossIncome: number;       // After vacancy
  otherIncome: number;
  totalIncome: number;
  
  // Operating expenses (deductible)
  operatingExpenses: number;
  propertyTaxes: number;
  insurance: number;
  management: number;
  maintenance: number;
  utilities: number;
  hoaFees: number;
  otherExpenses: number;
  
  // Financing (interest is deductible)
  mortgageInterest: number;           // Interest portion only
  mortgagePrincipal: number;          // Not deductible (equity building)
  totalDebtService: number;
  
  // Depreciation
  depreciation: number;               // Non-cash deduction
  
  // Taxable income
  netOperatingIncome: number;         // Before interest/depreciation
  taxableIncome: number;              // NOI - interest - depreciation
  
  // Tax calculation
  marginalTaxRate: number;            // User's tax bracket
  estimatedTaxLiability: number;      // taxableIncome × marginalTaxRate (can be negative = benefit)
  taxBenefit: number;                 // If taxableIncome < 0 (passive loss)
  
  // After-tax cash flow
  preTaxCashFlow: number;             // NOI - debt service
  afterTaxCashFlow: number;           // preTaxCashFlow - tax (or + benefit)
}

/**
 * Extended Amortization Row with beginning balance
 */
export interface ProformaAmortizationRow {
  month: number;
  year: number;
  paymentNumber: number;
  beginningBalance: number;
  scheduledPayment: number;
  principalPayment: number;
  interestPayment: number;
  endingBalance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

/**
 * Amortization Summary
 */
export interface ProformaAmortizationSummary {
  monthlyPayment: number;
  totalPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  principalPercent: number;
  interestPercent: number;
  payoffDate: string;
}

/**
 * Exit/Disposition Analysis
 */
export interface ExitAnalysis {
  // Hold period
  holdPeriodYears: number;
  
  // Property value at sale
  initialValue: number;
  appreciationRate: number;
  projectedSalePrice: number;         // initialValue × (1 + rate)^years
  
  // Sale costs
  brokerCommissionPercent: number;    // Default 5-6%
  brokerCommission: number;
  closingCostsPercent: number;        // Default 1-2%
  closingCosts: number;
  totalSaleCosts: number;
  
  // Loan payoff
  remainingLoanBalance: number;       // From amortization schedule
  prepaymentPenalty: number;          // If applicable
  
  // Net proceeds
  grossSaleProceeds: number;          // projectedSalePrice
  netSaleProceeds: number;            // gross - costs - loan payoff
  
  // Capital gains
  adjustedCostBasis: number;          // purchase + capex - accumulated depreciation
  accumulatedDepreciation: number;
  totalGain: number;                  // netProceeds - adjustedBasis
  
  // Depreciation recapture (taxed at 25%)
  depreciationRecapture: number;      // Min(accumulatedDepreciation, gain)
  depreciationRecaptureTax: number;   // recapture × 0.25
  
  // Capital gain (remaining, taxed at 15-20%)
  capitalGain: number;                // totalGain - depreciationRecapture
  capitalGainsTaxRate: number;        // 15% or 20%
  capitalGainsTax: number;
  
  // Total tax on sale
  totalTaxOnSale: number;
  afterTaxProceeds: number;
}

/**
 * Investment Return Metrics
 */
export interface InvestmentReturns {
  // Time-weighted returns
  irr: number;                        // Internal Rate of Return
  mirr: number | null;                // Modified IRR (reinvestment rate)
  
  // Cash returns
  totalCashFlows: number;             // Sum of all annual cash flows
  totalDistributions: number;         // Cash flows + sale proceeds
  
  // Multiple
  equityMultiple: number;             // Total distributions / initial investment
  
  // Payback
  paybackPeriodMonths: number | null; // Time to recoup investment
  
  // Annualized
  averageAnnualReturn: number;        // Average CoC over hold period
  cagr: number;                       // Compound annual growth rate
}

/**
 * Sensitivity Analysis Scenario
 */
export interface SensitivityScenario {
  variable: string;                   // e.g., "purchasePrice", "rentGrowth"
  changePercent: number;              // e.g., -10, -5, 0, +5, +10
  absoluteValue: number;
  irr: number;
  cashOnCash: number;
  netProfit: number;
}

/**
 * Property Summary for Proforma
 */
export interface ProformaPropertySummary {
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  lotSize: number;
}

/**
 * Acquisition Details
 */
export interface ProformaAcquisition {
  purchasePrice: number;
  listPrice: number;
  discountFromList: number;
  closingCosts: number;
  closingCostsPercent: number;
  inspectionCosts: number;
  rehabCosts: number;
  totalAcquisitionCost: number;
}

/**
 * Financing Details
 */
export interface ProformaFinancing {
  downPayment: number;
  downPaymentPercent: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanType: string;
  monthlyPayment: number;             // P&I
  monthlyPaymentWithEscrow: number;   // PITI
  totalInterestOverLife: number;
  apr: number;                        // If points/fees included
}

/**
 * Income Details (Year 1)
 */
export interface ProformaIncome {
  monthlyRent: number;
  annualGrossRent: number;
  otherIncome: number;
  vacancyAllowance: number;
  vacancyPercent: number;
  effectiveGrossIncome: number;
}

/**
 * Operating Expenses (Year 1)
 */
export interface ProformaExpenses {
  propertyTaxes: number;
  insurance: number;
  hoaFees: number;
  management: number;
  managementPercent: number;
  maintenance: number;
  maintenancePercent: number;
  utilities: number;
  landscaping: number;
  pestControl: number;
  capExReserve: number;               // Capital expenditure reserve
  capExReservePercent: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  expenseRatio: number;               // OpEx / EGI
}

/**
 * Key Performance Metrics
 */
export interface ProformaMetrics {
  netOperatingIncome: number;
  annualDebtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  dscr: number;
  grossRentMultiplier: number;
  onePercentRule: number;
  breakEvenOccupancy: number;
  pricePerUnit: number;
  pricePerSqFt: number;
  rentPerSqFt: number;
}

/**
 * Multi-Year Projections
 */
export interface ProformaProjections {
  holdPeriodYears: number;
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  annualProjections: AnnualTaxProjection[];
  cumulativeCashFlow: number[];
  propertyValues: number[];
  equityPositions: number[];
  loanBalances: number[];
}

/**
 * Deal Score Summary
 */
export interface ProformaDealScore {
  score: number;
  grade: string;
  verdict: string;
  breakevenPrice: number;
  discountRequired: number;
}

/**
 * Data Source Provenance
 */
export interface ProformaSources {
  rentEstimateSource: string;
  propertyValueSource: string;
  taxDataSource: string;
  marketDataSource: string;
  dataFreshness: string;
}

/**
 * Complete Financial Proforma Data Structure
 */
export interface FinancialProforma {
  // Metadata
  generatedAt: string;
  propertyId: string;
  propertyAddress: string;
  strategyType: 'ltr' | 'str' | 'brrrr' | 'flip' | 'house-hack' | 'wholesale';
  
  // Property Summary
  property: ProformaPropertySummary;
  
  // Acquisition
  acquisition: ProformaAcquisition;
  
  // Financing
  financing: ProformaFinancing;
  
  // Income (Year 1)
  income: ProformaIncome;
  
  // Operating Expenses (Year 1)
  expenses: ProformaExpenses;
  
  // Key Metrics
  metrics: ProformaMetrics;
  
  // Depreciation & Tax
  depreciation: DepreciationConfig;
  
  // Multi-Year Projections
  projections: ProformaProjections;
  
  // Amortization
  amortization: {
    schedule: ProformaAmortizationRow[];
    summary: ProformaAmortizationSummary;
  };
  
  // Exit Analysis
  exit: ExitAnalysis;
  
  // Investment Returns
  returns: InvestmentReturns;
  
  // Sensitivity Analysis
  sensitivity: {
    purchasePrice: SensitivityScenario[];
    interestRate: SensitivityScenario[];
    rent: SensitivityScenario[];
    vacancy: SensitivityScenario[];
    appreciation: SensitivityScenario[];
  };
  
  // Deal Score (from existing system)
  dealScore: ProformaDealScore;
  
  // Data Sources (Provenance)
  sources: ProformaSources;
}

/**
 * Proforma Generation Request
 */
export interface ProformaRequest {
  propertyId: string;
  strategy: 'ltr' | 'str' | 'brrrr' | 'flip' | 'house-hack' | 'wholesale';
  
  // Optional overrides
  purchasePrice?: number;
  monthlyRent?: number;
  
  // Tax configuration
  landValuePercent?: number;          // Default 0.20
  marginalTaxRate?: number;           // Default 0.24
  capitalGainsTaxRate?: number;       // Default 0.15
  
  // Projection settings
  holdPeriodYears?: number;           // Default 10
  
  // Export format
  format: 'json' | 'xlsx' | 'pdf';
}

/**
 * Proforma Export Response
 */
export interface ProformaExportResponse {
  proformaId: string;
  propertyId: string;
  strategy: string;
  generatedAt: string;
  downloadUrl: string;
  expiresAt: string;
  format: string;
  fileSizeBytes: number;
}

/**
 * Default values for proforma generation
 */
export const PROFORMA_DEFAULTS = {
  landValuePercent: 0.20,
  marginalTaxRate: 0.24,
  capitalGainsTaxRate: 0.15,
  holdPeriodYears: 10,
  depreciationYearsResidential: 27.5,
  depreciationYearsCommercial: 39,
  brokerCommissionPercent: 0.06,
  sellerClosingCostsPercent: 0.015,
  capExReservePercent: 0.05,
  depreciationRecaptureRate: 0.25,
} as const;
