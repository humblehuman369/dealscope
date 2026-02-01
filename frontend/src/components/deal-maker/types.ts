/**
 * DEAL MAKER Worksheet Types
 * TypeScript interfaces for the Deal Maker worksheet system (Web Frontend)
 */

// =============================================================================
// DEAL MAKER STATE
// =============================================================================

export interface DealMakerState {
  // Tab 1: Buy Price
  buyPrice: number
  downPaymentPercent: number
  closingCostsPercent: number
  
  // Tab 2: Financing
  loanType: LoanType
  interestRate: number
  loanTermYears: number
  
  // Tab 3: Rehab & Valuation
  rehabBudget: number
  arv: number
  
  // Tab 4: Income
  monthlyRent: number
  otherIncome: number
  
  // Tab 5: Expenses
  vacancyRate: number
  maintenanceRate: number
  managementRate: number
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
}

export type LoanType = '15-year' | '30-year' | 'arm'

// =============================================================================
// CALCULATED METRICS
// =============================================================================

export interface DealMakerMetrics {
  // From Buy Price tab
  cashNeeded: number
  downPaymentAmount: number
  closingCostsAmount: number
  
  // From Financing tab
  loanAmount: number
  monthlyPayment: number
  
  // From Rehab & Valuation tab
  equityCreated: number
  totalInvestment: number
  
  // From Income tab
  grossMonthlyIncome: number
  
  // From Expenses tab
  totalMonthlyExpenses: number
  monthlyOperatingExpenses: number
  
  // Key metrics (header)
  dealGap: number
  annualProfit: number
  capRate: number
  cocReturn: number
  
  // Scores
  dealScore: number
  dealGrade: DealGrade
  profitQuality: ProfitGrade
}

export type DealGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
export type ProfitGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

export type TabId = 'buyPrice' | 'financing' | 'rehabValuation' | 'income' | 'expenses'

export type TabStatus = 'active' | 'completed' | 'pending'

export interface TabConfig {
  id: TabId
  title: string
  icon: string
  status: TabStatus
  order: number
}

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'buyPrice', title: 'Buy Price', icon: '🏠', status: 'active', order: 1 },
  { id: 'financing', title: 'Financing', icon: '🏛', status: 'pending', order: 2 },
  { id: 'rehabValuation', title: 'Rehab & Valuation', icon: '🔧', status: 'pending', order: 3 },
  { id: 'income', title: 'Income', icon: '💰', status: 'pending', order: 4 },
  { id: 'expenses', title: 'Expenses', icon: '📊', status: 'pending', order: 5 },
]

// =============================================================================
// SLIDER CONFIGURATION
// =============================================================================

export type SliderFormat = 'currency' | 'percentage' | 'years' | 'currencyPerMonth' | 'currencyPerYear'

export interface SliderConfig {
  id: keyof DealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat
  defaultValue?: number
  sourceLabel?: string // Data source attribution (e.g., "Freddie Mac weekly average")
  isEstimate?: boolean // If true, shows as estimated vs. actual data
  lastUpdated?: Date // When the source data was last updated
  staleThresholdDays?: number // Days after which data is considered stale (default: 7)
}

// Tab 1: Buy Price sliders
export const BUY_PRICE_SLIDERS: SliderConfig[] = [
  { id: 'buyPrice', label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'IQ Breakeven Analysis' },
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0.05, max: 0.50, step: 0.05, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Industry standard' },
]

// Tab 2: Financing sliders
// Note: lastUpdated for interestRate should be set dynamically from API response
// When rate data is fetched, update this timestamp. Shows stale warning if >7 days old.
export const FINANCING_SLIDERS: SliderConfig[] = [
  { 
    id: 'interestRate', 
    label: 'Interest Rate', 
    min: 0.04, 
    max: 0.12, 
    step: 0.00125, 
    format: 'percentage', 
    sourceLabel: 'Freddie Mac weekly average',
    staleThresholdDays: 7,
    // lastUpdated will be populated when rates are fetched from API
  },
  { id: 'loanTermYears', label: 'Loan Term', min: 15, max: 30, step: 5, format: 'years', sourceLabel: 'Industry standard' },
]

// Tab 3: Rehab & Valuation sliders
export const REHAB_VALUATION_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 150000, step: 5000, format: 'currency', sourceLabel: '5% of ARV estimate', isEstimate: true },
  { id: 'arv', label: 'After Repair Value (ARV)', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
]

// Tab 4: Income sliders
export const INCOME_SLIDERS: SliderConfig[] = [
  { id: 'monthlyRent', label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth', sourceLabel: 'Rental comps analysis' },
  { id: 'otherIncome', label: 'Other Income', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
]

// Tab 5: Expenses sliders
export const EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Market-specific historical' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'managementRate', label: 'Property Management', min: 0, max: 0.12, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 5000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
]

// =============================================================================
// DEFAULT STATE
// =============================================================================

/**
 * FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * The DealMakerScreen should initialize from the centralized defaults API
 * using the useDefaults() hook or defaultsService.getResolvedDefaults().
 * 
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 * DO NOT change these values here - update backend/app/core/defaults.py instead.
 * 
 * See docs/DEFAULTS_ARCHITECTURE.md for full details.
 */
export const DEFAULT_DEAL_MAKER_STATE: DealMakerState = {
  // Tab 1: Buy Price
  buyPrice: 300000,
  downPaymentPercent: 0.20,      // Matches FINANCING.down_payment_pct
  closingCostsPercent: 0.03,     // Matches FINANCING.closing_costs_pct
  
  // Tab 2: Financing
  loanType: '30-year',
  interestRate: 0.06,            // Matches FINANCING.interest_rate
  loanTermYears: 30,             // Matches FINANCING.loan_term_years
  
  // Tab 3: Rehab & Valuation
  rehabBudget: 25000,            // Calculated from REHAB.renovation_budget_pct * ARV
  arv: 350000,
  
  // Tab 4: Income
  monthlyRent: 2500,
  otherIncome: 0,
  
  // Tab 5: Expenses
  vacancyRate: 0.01,             // Matches OPERATING.vacancy_rate (was 0.05)
  maintenanceRate: 0.05,         // Matches OPERATING.maintenance_pct
  managementRate: 0.00,          // Matches OPERATING.property_management_pct
  annualPropertyTax: 3600,
  annualInsurance: 1500,
  monthlyHoa: 0,
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface DealMakerSliderProps {
  config: SliderConfig
  value: number
  onChange: (value: number) => void
  onChangeComplete?: (value: number) => void
  isDark?: boolean
}

export interface ScoreBadgeProps {
  type: 'dealScore' | 'profitQuality'
  score?: number
  grade?: DealGrade | ProfitGrade
  size?: 'small' | 'medium' | 'large'
}

export interface MetricsHeaderProps {
  state: DealMakerState
  metrics: DealMakerMetrics
  listPrice?: number
  propertyAddress?: string
  onBackPress?: () => void
}

export interface WorksheetTabProps {
  config: TabConfig
  isExpanded: boolean
  onToggle: () => void
  onContinue: () => void
  children: React.ReactNode
  derivedOutput?: {
    label: string
    value: string
  }
  isLastTab?: boolean
}

export interface DealMakerPageProps {
  propertyAddress: string
  listPrice?: number
  initialState?: Partial<DealMakerState>
  propertyTax?: number
  insurance?: number
  rentEstimate?: number
}

// =============================================================================
// CTA BUTTON CONFIG
// =============================================================================

export const CTA_BUTTON_TEXT: Record<TabId, string> = {
  buyPrice: 'Continue to Financing →',
  financing: 'Continue to Rehab & Valuation →',
  rehabValuation: 'Continue to Income →',
  income: 'Continue to Expenses →',
  expenses: 'Finish & Save Deal ✓',
}

// =============================================================================
// STRATEGY TYPES
// =============================================================================

export type StrategyType = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'

// =============================================================================
// SHORT-TERM RENTAL (STR) STATE
// =============================================================================

export interface STRDealMakerState {
  // Tab 1: Buy Price (same as LTR)
  buyPrice: number
  downPaymentPercent: number
  closingCostsPercent: number
  
  // Tab 2: Financing (same as LTR)
  loanType: LoanType
  interestRate: number
  loanTermYears: number
  
  // Tab 3: Rehab & Valuation (add furniture)
  rehabBudget: number
  arv: number
  furnitureSetupCost: number  // STR-specific
  
  // Tab 4: Income (STR-specific)
  averageDailyRate: number
  occupancyRate: number
  cleaningFeeRevenue: number
  avgLengthOfStayDays: number
  
  // Tab 5: Expenses (STR-specific)
  platformFeeRate: number
  strManagementRate: number
  cleaningCostPerTurnover: number
  suppliesMonthly: number
  additionalUtilitiesMonthly: number
  maintenanceRate: number
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
}

// Union type for any strategy state
export type AnyDealMakerState = DealMakerState | STRDealMakerState

// =============================================================================
// STR CALCULATED METRICS
// =============================================================================

export interface STRMonthlyExpenses {
  mortgage: number
  taxes: number
  insurance: number
  hoa: number
  utilities: number
  maintenance: number
  management: number
  platformFees: number
  cleaning: number
  supplies: number
}

export interface STRMetrics {
  // Investment
  cashNeeded: number
  totalInvestmentWithFurniture: number
  downPaymentAmount: number
  closingCostsAmount: number
  loanAmount: number
  monthlyPayment: number
  
  // Revenue
  grossNightlyRevenue: number
  monthlyGrossRevenue: number
  annualGrossRevenue: number
  revPAR: number
  numberOfTurnovers: number
  nightsOccupied: number
  
  // Expenses breakdown
  monthlyExpenses: STRMonthlyExpenses
  totalMonthlyExpenses: number
  totalAnnualExpenses: number
  
  // Performance
  monthlyCashFlow: number
  annualCashFlow: number
  noi: number
  capRate: number
  cocReturn: number
  breakEvenOccupancy: number
  
  // From Rehab & Valuation tab
  equityCreated: number
  
  // Scores
  dealScore: number
  dealGrade: DealGrade
  profitQuality: ProfitGrade
}

// Union type for any strategy metrics
export type AnyDealMakerMetrics = DealMakerMetrics | STRMetrics

// =============================================================================
// STR SLIDER CONFIGURATION
// =============================================================================

// Extended slider config to support STR-specific field IDs
export interface STRSliderConfig {
  id: keyof STRDealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat | 'days'
  defaultValue?: number
  sourceLabel?: string
  isEstimate?: boolean
  lastUpdated?: Date
  staleThresholdDays?: number
}

// Tab 3: STR Rehab & Valuation sliders (includes furniture)
export const STR_REHAB_VALUATION_SLIDERS: STRSliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 150000, step: 5000, format: 'currency', sourceLabel: '5% of ARV estimate', isEstimate: true },
  { id: 'arv', label: 'After Repair Value (ARV)', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
  { id: 'furnitureSetupCost', label: 'Furniture & Setup', min: 0, max: 30000, step: 1000, format: 'currency', sourceLabel: 'STR furnishing estimate' },
]

// Tab 4: STR Income sliders
export const STR_INCOME_SLIDERS: STRSliderConfig[] = [
  { id: 'averageDailyRate', label: 'Average Daily Rate (ADR)', min: 50, max: 1000, step: 10, format: 'currency', sourceLabel: 'Market ADR analysis' },
  { id: 'occupancyRate', label: 'Occupancy Rate', min: 0.30, max: 0.95, step: 0.01, format: 'percentage', sourceLabel: 'Market average' },
  { id: 'cleaningFeeRevenue', label: 'Cleaning Fee (Revenue)', min: 0, max: 300, step: 25, format: 'currency', sourceLabel: 'Per booking' },
  { id: 'avgLengthOfStayDays', label: 'Avg Length of Stay', min: 1, max: 30, step: 1, format: 'days', sourceLabel: 'Market data' },
]

// Tab 5: STR Expenses sliders
export const STR_EXPENSES_SLIDERS: STRSliderConfig[] = [
  { id: 'platformFeeRate', label: 'Platform Fees (Airbnb/VRBO)', min: 0.10, max: 0.20, step: 0.01, format: 'percentage', sourceLabel: 'Airbnb host fee' },
  { id: 'strManagementRate', label: 'STR Management', min: 0, max: 0.25, step: 0.01, format: 'percentage', sourceLabel: 'STR manager rate' },
  { id: 'cleaningCostPerTurnover', label: 'Cleaning Cost', min: 50, max: 400, step: 25, format: 'currency', sourceLabel: 'Per turnover' },
  { id: 'suppliesMonthly', label: 'Supplies & Consumables', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
  { id: 'additionalUtilitiesMonthly', label: 'Additional Utilities', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 8000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
]

// =============================================================================
// STR DEFAULT STATE
// =============================================================================

/**
 * STR FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 * DO NOT change these values here - update backend/app/core/defaults.py instead.
 */
export const DEFAULT_STR_DEAL_MAKER_STATE: STRDealMakerState = {
  // Tab 1: Buy Price (same as LTR)
  buyPrice: 300000,
  downPaymentPercent: 0.20,
  closingCostsPercent: 0.03,
  
  // Tab 2: Financing (same as LTR)
  loanType: '30-year',
  interestRate: 0.06,
  loanTermYears: 30,
  
  // Tab 3: Rehab & Valuation (with furniture)
  rehabBudget: 25000,
  arv: 350000,
  furnitureSetupCost: 6000,      // Matches STR.furniture_setup_cost
  
  // Tab 4: Income (STR-specific)
  averageDailyRate: 200,         // Typical STR nightly rate
  occupancyRate: 0.70,           // 70% occupancy
  cleaningFeeRevenue: 75,        // Matches STR.cleaning_fee_revenue
  avgLengthOfStayDays: 6,        // Matches STR.avg_length_of_stay_days
  
  // Tab 5: Expenses (STR-specific)
  platformFeeRate: 0.15,         // Matches STR.platform_fees_pct
  strManagementRate: 0.10,       // Matches STR.str_management_pct
  cleaningCostPerTurnover: 150,  // Matches STR.cleaning_cost_per_turnover
  suppliesMonthly: 100,          // Matches STR.supplies_monthly
  additionalUtilitiesMonthly: 0, // Matches STR.additional_utilities_monthly
  maintenanceRate: 0.05,
  annualPropertyTax: 3600,
  annualInsurance: 3000,         // Higher for STR (1% of price)
  monthlyHoa: 0,
}

// =============================================================================
// STRATEGY HELPER FUNCTIONS
// =============================================================================

/**
 * Get the default state for a given strategy type
 */
export function getDefaultStateForStrategy(strategy: StrategyType): DealMakerState | STRDealMakerState | BRRRRDealMakerState {
  switch (strategy) {
    case 'str':
      return { ...DEFAULT_STR_DEAL_MAKER_STATE }
    case 'brrrr':
      return { ...DEFAULT_BRRRR_DEAL_MAKER_STATE }
    case 'ltr':
    default:
      return { ...DEFAULT_DEAL_MAKER_STATE }
  }
}

/**
 * Check if a state is an STR state
 */
export function isSTRState(state: AnyDealMakerState): state is STRDealMakerState {
  return 'averageDailyRate' in state && 'occupancyRate' in state
}

/**
 * Check if metrics are STR metrics
 */
export function isSTRMetrics(metrics: AnyDealMakerMetrics): metrics is STRMetrics {
  return 'revPAR' in metrics && 'breakEvenOccupancy' in metrics
}

// =============================================================================
// BRRRR (BUY, REHAB, RENT, REFINANCE, REPEAT) STATE
// =============================================================================

export interface BRRRRDealMakerState {
  // Phase 1: Buy
  purchasePrice: number
  buyDiscountPct: number         // Discount below market (5% default)
  downPaymentPercent: number     // Hard money down (10-20%)
  closingCostsPercent: number
  hardMoneyRate: number          // Short-term financing rate (10-12%)
  
  // Phase 2: Rehab
  rehabBudget: number
  contingencyPct: number         // Contingency (10% default)
  holdingPeriodMonths: number    // Rehab + stabilization period (4-6 months)
  holdingCostsMonthly: number    // Monthly carrying costs during rehab
  arv: number
  
  // Phase 3: Rent
  postRehabMonthlyRent: number
  postRehabRentIncreasePct: number  // Rent bump from rehab (10% default)
  
  // Phase 4: Refinance
  refinanceLtv: number           // Loan-to-value for refinance (75% default)
  refinanceInterestRate: number  // Conventional rate (6% default)
  refinanceTermYears: number     // New loan term (30 years)
  refinanceClosingCostsPct: number  // Closing costs (3% default)
  
  // Phase 5: Rent expenses (post-refinance)
  vacancyRate: number
  maintenanceRate: number
  managementRate: number
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
}

// =============================================================================
// BRRRR CALCULATED METRICS
// =============================================================================

export interface BRRRRMetrics {
  // Phase 1: Buy
  initialLoanAmount: number
  initialDownPayment: number
  initialClosingCosts: number
  cashRequiredPhase1: number
  
  // Phase 2: Rehab
  totalRehabCost: number        // Rehab + contingency
  holdingCosts: number          // Monthly costs * holding period
  cashRequiredPhase2: number
  allInCost: number             // Purchase + rehab + holding
  
  // Phase 3: Rent
  estimatedNoi: number
  estimatedCapRate: number
  
  // Phase 4: Refinance
  refinanceLoanAmount: number
  refinanceClosingCosts: number
  cashOutAtRefinance: number
  newMonthlyPayment: number
  
  // Phase 5: Repeat (Capital Recycling)
  totalCashInvested: number
  cashLeftInDeal: number
  capitalRecycledPct: number
  infiniteRoiAchieved: boolean
  equityPosition: number
  equityPct: number
  
  // Post-Refinance Performance
  postRefiMonthlyCashFlow: number
  postRefiAnnualCashFlow: number
  postRefiCashOnCash: number    // Uses cash_left_in_deal as denominator
  
  // Scores
  dealScore: number
  dealGrade: DealGrade
}

// =============================================================================
// BRRRR SLIDER CONFIGURATION
// =============================================================================

export interface BRRRRSliderConfig {
  id: keyof BRRRRDealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat | 'months'
  defaultValue?: number
  sourceLabel?: string
  isEstimate?: boolean
}

// Phase 1: Buy sliders
export const BRRRR_BUY_SLIDERS: BRRRRSliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'Discounted from ARV' },
  { id: 'buyDiscountPct', label: 'Discount from Market', min: 0, max: 0.30, step: 0.01, format: 'percentage', sourceLabel: 'Target: 5-15%' },
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0.10, max: 0.30, step: 0.05, format: 'percentage', sourceLabel: 'Hard money typical' },
  { id: 'hardMoneyRate', label: 'Hard Money Rate', min: 0.08, max: 0.15, step: 0.005, format: 'percentage', sourceLabel: 'Short-term rate' },
]

// Phase 2: Rehab sliders
export const BRRRR_REHAB_SLIDERS: BRRRRSliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'contingencyPct', label: 'Contingency', min: 0, max: 0.25, step: 0.05, format: 'percentage', sourceLabel: 'Recommended: 10%' },
  { id: 'holdingPeriodMonths', label: 'Holding Period', min: 2, max: 12, step: 1, format: 'months', sourceLabel: 'Rehab + stabilize' },
  { id: 'holdingCostsMonthly', label: 'Monthly Holding Costs', min: 0, max: 3000, step: 100, format: 'currencyPerMonth', sourceLabel: 'Taxes, ins, utilities' },
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
]

// Phase 3: Rent sliders
export const BRRRR_RENT_SLIDERS: BRRRRSliderConfig[] = [
  { id: 'postRehabMonthlyRent', label: 'Post-Rehab Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth', sourceLabel: 'After improvements' },
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Market average' },
  { id: 'managementRate', label: 'Property Management', min: 0, max: 0.12, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
]

// Phase 4: Refinance sliders
export const BRRRR_REFINANCE_SLIDERS: BRRRRSliderConfig[] = [
  { id: 'refinanceLtv', label: 'Refinance LTV', min: 0.65, max: 0.80, step: 0.05, format: 'percentage', sourceLabel: 'Conventional limit' },
  { id: 'refinanceInterestRate', label: 'Refinance Rate', min: 0.04, max: 0.10, step: 0.00125, format: 'percentage', sourceLabel: 'Conventional 30-yr' },
  { id: 'refinanceTermYears', label: 'Loan Term', min: 15, max: 30, step: 5, format: 'years', sourceLabel: 'Standard terms' },
  { id: 'refinanceClosingCostsPct', label: 'Closing Costs', min: 0.01, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Refi costs' },
]

// Phase 5: Expenses sliders (shared with rent phase for post-refi analysis)
export const BRRRR_EXPENSES_SLIDERS: BRRRRSliderConfig[] = [
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 5000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
]

// =============================================================================
// BRRRR DEFAULT STATE
// =============================================================================

/**
 * BRRRR FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_BRRRR_DEAL_MAKER_STATE: BRRRRDealMakerState = {
  // Phase 1: Buy
  purchasePrice: 250000,         // Typically bought at discount
  buyDiscountPct: 0.05,          // Matches BRRRR.buy_discount_pct
  downPaymentPercent: 0.20,      // Hard money typical
  closingCostsPercent: 0.02,     // Lower for investment
  hardMoneyRate: 0.12,           // 12% hard money rate
  
  // Phase 2: Rehab
  rehabBudget: 40000,
  contingencyPct: 0.10,          // 10% contingency
  holdingPeriodMonths: 4,        // 4 months rehab + stabilize
  holdingCostsMonthly: 1500,     // Monthly carrying costs
  arv: 350000,
  
  // Phase 3: Rent
  postRehabMonthlyRent: 2800,    // 10% higher than before rehab
  postRehabRentIncreasePct: 0.10, // Matches BRRRR.post_rehab_rent_increase_pct
  
  // Phase 4: Refinance
  refinanceLtv: 0.75,            // Matches BRRRR.refinance_ltv
  refinanceInterestRate: 0.06,   // Matches BRRRR.refinance_interest_rate
  refinanceTermYears: 30,        // Matches BRRRR.refinance_term_years
  refinanceClosingCostsPct: 0.03, // Matches BRRRR.refinance_closing_costs_pct
  
  // Phase 5: Rent expenses (post-refinance)
  vacancyRate: 0.05,
  maintenanceRate: 0.05,
  managementRate: 0.08,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyHoa: 0,
}

// =============================================================================
// EXTENDED STRATEGY HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a state is a BRRRR state
 */
export function isBRRRRState(state: AnyDealMakerState | BRRRRDealMakerState): state is BRRRRDealMakerState {
  return 'refinanceLtv' in state && 'holdingPeriodMonths' in state && 'cashLeftInDeal' in state === false
}

/**
 * Check if metrics are BRRRR metrics
 */
export function isBRRRRMetrics(metrics: AnyDealMakerMetrics | BRRRRMetrics): metrics is BRRRRMetrics {
  return 'capitalRecycledPct' in metrics && 'infiniteRoiAchieved' in metrics
}
