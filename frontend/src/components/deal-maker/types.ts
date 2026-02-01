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
export function getDefaultStateForStrategy(strategy: StrategyType): DealMakerState | STRDealMakerState | BRRRRDealMakerState | FlipDealMakerState | HouseHackDealMakerState | WholesaleDealMakerState {
  switch (strategy) {
    case 'str':
      return { ...DEFAULT_STR_DEAL_MAKER_STATE }
    case 'brrrr':
      return { ...DEFAULT_BRRRR_DEAL_MAKER_STATE }
    case 'flip':
      return { ...DEFAULT_FLIP_DEAL_MAKER_STATE }
    case 'house_hack':
      return { ...DEFAULT_HOUSEHACK_DEAL_MAKER_STATE }
    case 'wholesale':
      return { ...DEFAULT_WHOLESALE_DEAL_MAKER_STATE }
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

// =============================================================================
// FIX & FLIP STATE
// =============================================================================

export type FlipFinancingType = 'cash' | 'hardMoney' | 'conventional'

export interface FlipDealMakerState {
  // Phase 1: Buy
  purchasePrice: number
  purchaseDiscountPct: number    // Target discount from ARV (20%)
  closingCostsPercent: number
  
  // Phase 2: Financing
  financingType: FlipFinancingType
  hardMoneyLtv: number           // 90% typical
  hardMoneyRate: number          // 12% typical
  loanPoints: number             // 1-3 points
  
  // Phase 3: Rehab
  rehabBudget: number
  contingencyPct: number
  rehabTimeMonths: number
  arv: number
  
  // Phase 4: Hold
  holdingCostsMonthly: number    // Taxes, insurance, utilities
  daysOnMarket: number           // Expected DOM (30-60)
  
  // Phase 5: Sell
  sellingCostsPct: number        // Agent + closing (6-8%)
  capitalGainsRate: number       // Tax rate (15-25%)
}

// =============================================================================
// FIX & FLIP CALCULATED METRICS
// =============================================================================

export interface FlipMetrics {
  // Acquisition
  loanAmount: number
  downPayment: number
  closingCosts: number
  loanPointsCost: number
  cashAtPurchase: number
  
  // Rehab
  totalRehabCost: number         // Budget + contingency
  
  // Holding
  holdingPeriodMonths: number    // Rehab + DOM
  totalHoldingCosts: number
  interestCosts: number
  
  // Sale
  grossSaleProceeds: number
  sellingCosts: number
  netSaleProceeds: number
  
  // Profit Analysis
  totalProjectCost: number
  grossProfit: number
  capitalGainsTax: number
  netProfit: number
  
  // Return Metrics
  cashRequired: number
  roi: number
  annualizedRoi: number
  profitMargin: number
  
  // 70% Rule
  maxAllowableOffer: number
  meets70PercentRule: boolean
  
  // Scores
  dealScore: number
  dealGrade: DealGrade
}

// =============================================================================
// FIX & FLIP SLIDER CONFIGURATION
// =============================================================================

export interface FlipSliderConfig {
  id: keyof FlipDealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat | 'months' | 'days' | 'points'
  defaultValue?: number
  sourceLabel?: string
  isEstimate?: boolean
}

// Phase 1: Buy sliders
export const FLIP_BUY_SLIDERS: FlipSliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'Discounted from ARV' },
  { id: 'purchaseDiscountPct', label: 'Discount from ARV', min: 0, max: 0.40, step: 0.01, format: 'percentage', sourceLabel: 'Target: 20-30%' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Buyer closing' },
]

// Phase 2: Financing sliders
export const FLIP_FINANCING_SLIDERS: FlipSliderConfig[] = [
  { id: 'hardMoneyLtv', label: 'Loan-to-Value', min: 0.70, max: 1.0, step: 0.05, format: 'percentage', sourceLabel: 'Hard money LTV' },
  { id: 'hardMoneyRate', label: 'Interest Rate', min: 0.08, max: 0.18, step: 0.005, format: 'percentage', sourceLabel: 'Hard money rate' },
  { id: 'loanPoints', label: 'Points', min: 0, max: 5, step: 0.5, format: 'points', sourceLabel: 'Origination fee' },
]

// Phase 3: Rehab sliders
export const FLIP_REHAB_SLIDERS: FlipSliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'contingencyPct', label: 'Contingency', min: 0, max: 0.25, step: 0.05, format: 'percentage', sourceLabel: 'Recommended: 10-15%' },
  { id: 'rehabTimeMonths', label: 'Rehab Time', min: 1, max: 12, step: 1, format: 'months', sourceLabel: 'Expected duration' },
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
]

// Phase 4: Hold sliders
export const FLIP_HOLD_SLIDERS: FlipSliderConfig[] = [
  { id: 'holdingCostsMonthly', label: 'Monthly Holding Costs', min: 0, max: 5000, step: 100, format: 'currencyPerMonth', sourceLabel: 'Taxes, ins, utilities' },
  { id: 'daysOnMarket', label: 'Days on Market', min: 15, max: 180, step: 15, format: 'days', sourceLabel: 'Market average' },
]

// Phase 5: Sell sliders
export const FLIP_SELL_SLIDERS: FlipSliderConfig[] = [
  { id: 'sellingCostsPct', label: 'Selling Costs', min: 0.04, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Agent + closing' },
  { id: 'capitalGainsRate', label: 'Capital Gains Tax Rate', min: 0, max: 0.40, step: 0.01, format: 'percentage', sourceLabel: 'Short-term rate' },
]

// =============================================================================
// FIX & FLIP DEFAULT STATE
// =============================================================================

/**
 * FIX & FLIP FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_FLIP_DEAL_MAKER_STATE: FlipDealMakerState = {
  // Phase 1: Buy
  purchasePrice: 200000,
  purchaseDiscountPct: 0.20,     // Matches FLIP.purchase_discount_pct
  closingCostsPercent: 0.03,
  
  // Phase 2: Financing
  financingType: 'hardMoney',
  hardMoneyLtv: 0.90,            // Matches FLIP.hard_money_ltv
  hardMoneyRate: 0.12,           // Matches FLIP.hard_money_rate
  loanPoints: 2,                 // 2 points typical
  
  // Phase 3: Rehab
  rehabBudget: 50000,
  contingencyPct: 0.10,          // 10% contingency
  rehabTimeMonths: 4,            // 4 months rehab
  arv: 325000,
  
  // Phase 4: Hold
  holdingCostsMonthly: 1500,     // Monthly carrying costs
  daysOnMarket: 45,              // 45 days DOM
  
  // Phase 5: Sell
  sellingCostsPct: 0.06,         // Matches FLIP.selling_costs_pct
  capitalGainsRate: 0.22,        // 22% short-term cap gains (ordinary income)
}

// =============================================================================
// FIX & FLIP HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a state is a Flip state
 */
export function isFlipState(state: AnyDealMakerState | BRRRRDealMakerState | FlipDealMakerState): state is FlipDealMakerState {
  return 'financingType' in state && 'sellingCostsPct' in state && 'daysOnMarket' in state
}

/**
 * Check if metrics are Flip metrics
 */
export function isFlipMetrics(metrics: AnyDealMakerMetrics | BRRRRMetrics | FlipMetrics): metrics is FlipMetrics {
  return 'maxAllowableOffer' in metrics && 'meets70PercentRule' in metrics
}

// =============================================================================
// HOUSE HACK STATE
// =============================================================================

export type HouseHackLoanType = 'fha' | 'conventional' | 'va'

export interface HouseHackDealMakerState {
  // Phase 1: Buy
  purchasePrice: number
  totalUnits: number              // Total units (2-8)
  ownerOccupiedUnits: number      // Units owner lives in (1-2)
  ownerUnitMarketRent: number     // Market rent for owner's unit (for comparison)
  
  // Phase 2: Finance (FHA/Low Down Payment)
  loanType: HouseHackLoanType
  downPaymentPercent: number      // 3.5% FHA min, 0% VA
  interestRate: number
  loanTermYears: number
  pmiRate: number                 // PMI/MIP annual rate (0.85% FHA)
  closingCostsPercent: number
  
  // Phase 3: Rent (Unit Income)
  avgRentPerUnit: number          // Average rent per rented unit
  vacancyRate: number
  currentHousingPayment: number   // Owner's current rent (for comparison)
  
  // Phase 4: Expenses
  annualPropertyTax: number
  annualInsurance: number
  monthlyHoa: number
  utilitiesMonthly: number        // Shared utilities owner pays
  maintenanceRate: number         // % of rent
  capexRate: number               // % of rent for reserves
}

// =============================================================================
// HOUSE HACK CALCULATED METRICS
// =============================================================================

export interface HouseHackMetrics {
  // Financing
  loanAmount: number
  monthlyPrincipalInterest: number
  monthlyPmi: number
  monthlyTaxes: number
  monthlyInsurance: number
  monthlyPITI: number             // P&I + Taxes + Insurance + PMI + HOA
  downPayment: number
  closingCosts: number
  cashToClose: number
  
  // Rental Income
  rentedUnits: number
  grossRentalIncome: number       // Total from rented units
  effectiveRentalIncome: number   // After vacancy
  
  // Operating Expenses
  monthlyMaintenance: number
  monthlyCapex: number
  monthlyOperatingExpenses: number  // Utilities + maintenance + capex
  
  // Net Income
  netRentalIncome: number         // After all expenses
  
  // Core House Hack Metrics
  effectiveHousingCost: number    // PITI - Net Rental Income (KEY METRIC)
  housingCostSavings: number      // Current rent - effective cost
  housingOffsetPercent: number    // Net income / PITI × 100
  livesForFree: boolean           // effectiveHousingCost <= 0
  
  // Investment Returns (if treating as investment)
  annualCashFlow: number
  cashOnCashReturn: number
  
  // Move-Out Scenario (full rental)
  fullRentalIncome: number        // If owner unit also rented
  fullRentalCashFlow: number
  fullRentalCoCReturn: number
  
  // Scores
  dealScore: number
  dealGrade: DealGrade
}

// =============================================================================
// HOUSE HACK SLIDER CONFIGURATION
// =============================================================================

export interface HouseHackSliderConfig {
  id: keyof HouseHackDealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat | 'units'
  defaultValue?: number
  sourceLabel?: string
  isEstimate?: boolean
}

// Phase 1: Buy sliders
export const HOUSEHACK_BUY_SLIDERS: HouseHackSliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 100000, max: 2000000, step: 10000, format: 'currency', sourceLabel: 'Multi-unit property' },
  { id: 'totalUnits', label: 'Total Units', min: 2, max: 8, step: 1, format: 'units', sourceLabel: 'Duplex to 8-plex' },
  { id: 'ownerOccupiedUnits', label: 'Owner Units', min: 1, max: 2, step: 1, format: 'units', sourceLabel: 'Units you live in' },
  { id: 'ownerUnitMarketRent', label: 'Owner Unit Market Rent', min: 500, max: 5000, step: 50, format: 'currencyPerMonth', sourceLabel: 'For comparison' },
]

// Phase 2: Finance sliders
export const HOUSEHACK_FINANCE_SLIDERS: HouseHackSliderConfig[] = [
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0, max: 0.25, step: 0.005, format: 'percentage', sourceLabel: 'FHA: 3.5% min' },
  { id: 'interestRate', label: 'Interest Rate', min: 0.04, max: 0.10, step: 0.00125, format: 'percentage', sourceLabel: 'Current rates' },
  { id: 'pmiRate', label: 'PMI/MIP Rate', min: 0, max: 0.015, step: 0.0005, format: 'percentage', sourceLabel: 'FHA: 0.85%' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Buyer closing' },
]

// Phase 3: Rent sliders
export const HOUSEHACK_RENT_SLIDERS: HouseHackSliderConfig[] = [
  { id: 'avgRentPerUnit', label: 'Avg Rent Per Unit', min: 500, max: 5000, step: 50, format: 'currencyPerMonth', sourceLabel: 'Market rent' },
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Area average' },
  { id: 'currentHousingPayment', label: 'Current Housing Cost', min: 0, max: 5000, step: 100, format: 'currencyPerMonth', sourceLabel: 'What you pay now' },
]

// Phase 4: Expenses sliders
export const HOUSEHACK_EXPENSES_SLIDERS: HouseHackSliderConfig[] = [
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 30000, step: 500, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 10000, step: 100, format: 'currencyPerYear', sourceLabel: 'Multi-unit rate' },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 1000, step: 25, format: 'currencyPerMonth' },
  { id: 'utilitiesMonthly', label: 'Shared Utilities', min: 0, max: 1000, step: 25, format: 'currencyPerMonth', sourceLabel: 'Owner paid' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: '% of rent' },
  { id: 'capexRate', label: 'CapEx Reserve', min: 0, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: '% of rent' },
]

// =============================================================================
// HOUSE HACK DEFAULT STATE
// =============================================================================

/**
 * HOUSE HACK FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_HOUSEHACK_DEAL_MAKER_STATE: HouseHackDealMakerState = {
  // Phase 1: Buy
  purchasePrice: 400000,
  totalUnits: 4,
  ownerOccupiedUnits: 1,
  ownerUnitMarketRent: 1500,
  
  // Phase 2: Finance (FHA defaults)
  loanType: 'fha',
  downPaymentPercent: 0.035,      // FHA minimum
  interestRate: 0.065,
  loanTermYears: 30,
  pmiRate: 0.0085,                // FHA MIP rate
  closingCostsPercent: 0.03,
  
  // Phase 3: Rent
  avgRentPerUnit: 1500,
  vacancyRate: 0.05,
  currentHousingPayment: 2000,    // What owner currently pays
  
  // Phase 4: Expenses
  annualPropertyTax: 6000,
  annualInsurance: 2400,
  monthlyHoa: 0,
  utilitiesMonthly: 200,
  maintenanceRate: 0.05,
  capexRate: 0.05,
}

// =============================================================================
// HOUSE HACK HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a state is a HouseHack state
 */
export function isHouseHackState(state: AnyDealMakerState | BRRRRDealMakerState | FlipDealMakerState | HouseHackDealMakerState): state is HouseHackDealMakerState {
  return 'totalUnits' in state && 'ownerOccupiedUnits' in state && 'pmiRate' in state
}

/**
 * Check if metrics are HouseHack metrics
 */
export function isHouseHackMetrics(metrics: AnyDealMakerMetrics | BRRRRMetrics | FlipMetrics | HouseHackMetrics): metrics is HouseHackMetrics {
  return 'effectiveHousingCost' in metrics && 'housingOffsetPercent' in metrics && 'livesForFree' in metrics
}

// =============================================================================
// WHOLESALE STATE
// =============================================================================

export type WholesaleDealViability = 'strong' | 'moderate' | 'tight' | 'notViable'

export interface WholesaleDealMakerState {
  // Phase 1: Property Analysis
  arv: number                       // After Repair Value
  estimatedRepairs: number          // Rehab cost estimate
  squareFootage: number             // For $/sqft calculations
  
  // Phase 2: Contract Terms
  contractPrice: number             // Your contract price with seller
  earnestMoney: number              // Earnest money deposit (at risk)
  inspectionPeriodDays: number      // Days for due diligence
  daysToClose: number               // Total timeline to close
  
  // Phase 3: Assignment
  assignmentFee: number             // Your wholesale fee
  marketingCosts: number            // Marketing/acquisition costs
  closingCosts: number              // Your closing costs (minimal)
}

// =============================================================================
// WHOLESALE CALCULATED METRICS
// =============================================================================

export interface WholesaleMetrics {
  // 70% Rule Analysis
  maxAllowableOffer: number         // MAO = ARV × 70% - Repairs
  contractVsMAO: number             // Contract price - MAO (negative = under)
  meets70PercentRule: boolean       // contractPrice <= MAO
  
  // End Buyer Analysis
  endBuyerPrice: number             // Contract + Assignment Fee
  endBuyerAllIn: number             // End buyer's total investment
  endBuyerProfit: number            // Buyer's potential profit
  endBuyerROI: number               // Buyer's ROI
  
  // Your Profit
  totalCashAtRisk: number           // Earnest Money + Marketing + Closing
  grossProfit: number               // Assignment Fee
  netProfit: number                 // Assignment Fee - Marketing - Closing
  roi: number                       // (Net Profit / Cash At Risk) × 100
  annualizedROI: number             // ROI × (365 / Days to Close)
  
  // Deal Quality
  dealViability: WholesaleDealViability
  dealScore: number
  dealGrade: DealGrade
}

// =============================================================================
// WHOLESALE SLIDER CONFIGURATION
// =============================================================================

export interface WholesaleSliderConfig {
  id: keyof WholesaleDealMakerState
  label: string
  min: number
  max: number
  step: number
  format: SliderFormat | 'days' | 'sqft'
  defaultValue?: number
  sourceLabel?: string
  isEstimate?: boolean
}

// Phase 1: Property sliders
export const WHOLESALE_PROPERTY_SLIDERS: WholesaleSliderConfig[] = [
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 2000000, step: 10000, format: 'currency', sourceLabel: 'Comps analysis' },
  { id: 'estimatedRepairs', label: 'Estimated Repairs', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'squareFootage', label: 'Square Footage', min: 500, max: 5000, step: 100, format: 'sqft', sourceLabel: 'Property details' },
]

// Phase 2: Contract sliders
export const WHOLESALE_CONTRACT_SLIDERS: WholesaleSliderConfig[] = [
  { id: 'contractPrice', label: 'Contract Price', min: 25000, max: 1500000, step: 5000, format: 'currency', sourceLabel: 'Negotiated with seller' },
  { id: 'earnestMoney', label: 'Earnest Money', min: 100, max: 10000, step: 100, format: 'currency', sourceLabel: 'At risk if deal fails' },
  { id: 'inspectionPeriodDays', label: 'Inspection Period', min: 7, max: 30, step: 1, format: 'days', sourceLabel: 'Due diligence window' },
  { id: 'daysToClose', label: 'Days to Close', min: 21, max: 90, step: 7, format: 'days', sourceLabel: 'Total timeline' },
]

// Phase 3: Assignment sliders
export const WHOLESALE_ASSIGNMENT_SLIDERS: WholesaleSliderConfig[] = [
  { id: 'assignmentFee', label: 'Assignment Fee', min: 5000, max: 50000, step: 1000, format: 'currency', sourceLabel: 'Your wholesale fee' },
  { id: 'marketingCosts', label: 'Marketing Costs', min: 0, max: 5000, step: 100, format: 'currency', sourceLabel: 'Finding the deal' },
  { id: 'closingCosts', label: 'Closing Costs', min: 0, max: 2000, step: 100, format: 'currency', sourceLabel: 'Minimal for assignment' },
]

// =============================================================================
// WHOLESALE DEFAULT STATE
// =============================================================================

/**
 * WHOLESALE FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_WHOLESALE_DEAL_MAKER_STATE: WholesaleDealMakerState = {
  // Phase 1: Property Analysis
  arv: 300000,
  estimatedRepairs: 40000,
  squareFootage: 1500,
  
  // Phase 2: Contract Terms
  contractPrice: 170000,            // Under 70% rule MAO
  earnestMoney: 1000,
  inspectionPeriodDays: 14,
  daysToClose: 45,
  
  // Phase 3: Assignment
  assignmentFee: 15000,
  marketingCosts: 500,
  closingCosts: 500,
}

// =============================================================================
// WHOLESALE HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a state is a Wholesale state
 */
export function isWholesaleState(state: AnyDealMakerState | BRRRRDealMakerState | FlipDealMakerState | HouseHackDealMakerState | WholesaleDealMakerState): state is WholesaleDealMakerState {
  return 'assignmentFee' in state && 'earnestMoney' in state && 'contractPrice' in state && !('sellingCostsPct' in state)
}

/**
 * Check if metrics are Wholesale metrics
 */
export function isWholesaleMetrics(metrics: AnyDealMakerMetrics | BRRRRMetrics | FlipMetrics | HouseHackMetrics | WholesaleMetrics): metrics is WholesaleMetrics {
  return 'endBuyerPrice' in metrics && 'meets70PercentRule' in metrics && 'dealViability' in metrics
}
