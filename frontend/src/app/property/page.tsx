'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, Suspense, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Building2, Home, Repeat, Hammer, Users, FileText, 
  TrendingUp, TrendingDown, DollarSign, Percent, Calendar, 
  AlertTriangle, AlertCircle, CheckCircle, Zap, Target, PiggyBank, 
  RefreshCw, Award, Loader2, Menu,
  BarChart3, LineChart, GitCompare, Activity, Wrench, ChevronRight, ChevronLeft,
  ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown, ChevronUp,
  X, Layers, Calculator, Eye, EyeOff, SlidersHorizontal,
  ArrowDown, Info, Minus, Plus, HelpCircle, ImageIcon, Bookmark, BookmarkCheck
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { 
  ProjectionAssumptions,
  calculate10YearProjections
} from '@/lib/projections'
import { usePropertyStore } from '@/stores'

// Dynamic imports for drill-down components
const ProjectionsView = dynamic(() => import('@/components/ProjectionsView'), { loading: () => <LoadingCard /> })
const ScenarioComparison = dynamic(() => import('@/components/ScenarioComparison'), { loading: () => <LoadingCard /> })
const DealScoreCard = dynamic(() => import('@/components/DealScoreCard'), { loading: () => <LoadingCard /> })
const SensitivityAnalysisView = dynamic(() => import('@/components/SensitivityAnalysis'), { loading: () => <LoadingCard /> })
const ChartsView = dynamic(() => import('@/components/ChartsView'), { loading: () => <LoadingCard /> })
const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), { loading: () => <LoadingCard /> })
const GenerateLOIModal = dynamic(() => import('@/components/GenerateLOIModal'), { ssr: false })

function LoadingCard() {
  return <div className="animate-pulse bg-gray-100 dark:bg-navy-800 rounded-2xl h-64" />
}

// ============================================
// TYPES
// ============================================

interface PropertyData {
  property_id: string
  zpid?: string | null  // Zillow Property ID for photos API
  address: { street: string; city: string; state: string; zip_code: string; full_address: string }
  details: { 
    property_type: string | null
    bedrooms: number | null
    bathrooms: number | null
    square_footage: number | null
    // Additional fields for RehabIntelligence
    year_built?: number | null
    lot_size?: number | null
    stories?: number | null
    features?: string[] | null
  }
  valuations: { 
    current_value_avm: number | null; arv: number | null
    // Raw Zestimate data for default calculations
    zestimate: number | null
    zestimate_high_pct: number | null
    zestimate_low_pct: number | null
  }
  rentals: { 
    monthly_rent_ltr: number | null; average_daily_rate: number | null; occupancy_rate: number | null
    // Raw Zillow averageRent
    average_rent: number | null
  }
  market: { 
    property_taxes_annual: number | null
    // Mortgage rates from Zillow
    mortgage_rate_arm5: number | null
    mortgage_rate_30yr: number | null
  }
  // HOA data for RehabIntelligence
  financial?: {
    hoa_monthly?: number | null
  }
}

interface Assumptions {
  // Base values from API (for ±50% adjustment sliders)
  basePurchasePrice: number; baseMonthlyRent: number; baseAverageDailyRate: number
  // Adjustment percentages (-0.5 to +0.5 for ±50%)
  purchasePriceAdj: number; monthlyRentAdj: number; averageDailyRateAdj: number
  // Computed values (base × (1 + adj))
  purchasePrice: number; monthlyRent: number; averageDailyRate: number
  // ARV = Purchase Price × (1 + arvPct), where arvPct is 0 to 1 (0% to 100%)
  arvPct: number; arv: number
  // Standard percentage sliders with specific ranges
  downPaymentPct: number; interestRate: number; loanTermYears: number
  rehabCostPct: number; rehabCost: number; propertyTaxes: number; insurance: number
  vacancyRate: number; managementPct: number; maintenancePct: number; closingCostsPct: number
  occupancyRate: number; holdingPeriodMonths: number; sellingCostsPct: number
  // House Hack specific
  roomsRented: number; totalBedrooms: number
  // Wholesale specific - fee as % of Est. Market Value (default 0.7%)
  wholesaleFeePct: number
}

type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'
type DrillDownView = 'details' | 'breakdown' | 'charts' | 'projections' | 'score' | 'sensitivity' | 'rehab' | 'compare'

// ============================================
// METRIC TOOLTIPS
// ============================================

const METRIC_TOOLTIPS: Record<string, { short: string; expanded: string }> = {
  // LTR / STR Metrics
  'Monthly Cash Flow': { short: 'Money left each month after all costs and the mortgage.', expanded: 'Monthly income minus expenses like mortgage, taxes, insurance, utilities, and maintenance. Positive means profit.' },
  'Annual Cash Flow': { short: 'Yearly profit from the property (monthly cash flow × 12).', expanded: 'Your total cash flow over one year after all operating costs and debt payments.' },
  'Cash-on-Cash Return': { short: 'Annual return on the cash you invested.', expanded: 'Annual cash flow divided by your cash invested. Helps compare deals based on your real out-of-pocket money.' },
  'Cap Rate': { short: 'Property return based on income, ignoring financing.', expanded: 'NOI divided by purchase price. Useful for comparing properties without the impact of different loan terms.' },
  'Debt Service Coverage Ratio': { short: 'How many times income covers the debt payment.', expanded: 'NOI divided by annual debt service. Lenders typically want 1.25+ for investment properties.' },
  'Net Operating Income': { short: 'Income after operating expenses, before the mortgage.', expanded: 'Rental income minus operating costs like taxes, insurance, repairs, management, and utilities (if paid by owner).' },
  'Cash Required': { short: 'Upfront cash needed to buy the property.', expanded: 'Typically includes down payment, closing costs, and any immediate repairs or reserves required at purchase.' },
  'Annual Gross Revenue': { short: 'Total yearly rental income before expenses.', expanded: 'The property\'s total income collected in a year (rent + other rental revenue) before any costs are subtracted.' },
  // BRRRR Metrics
  'Initial Cash Needed': { short: 'Total cash needed to buy, renovate, and close.', expanded: 'Your full upfront investment before refinancing—purchase costs, rehab budget, and closing costs combined.' },
  'Cash Back at Refi': { short: 'Cash returned to you when you refinance.', expanded: 'The portion of your original cash you recover from the new loan after the rehab and refinance.' },
  'Cash Left in Deal': { short: 'Your money still tied up after refinancing.', expanded: 'Initial cash needed minus cash back at refi. Lower is better if your goal is to recycle capital.' },
  'Cash-on-Cash': { short: 'Annual return based on the cash left in the deal.', expanded: 'Annual cash flow divided by cash left in deal. Shows performance after you\'ve pulled money back out.' },
  'Equity Created': { short: 'Value gained from renovations, not the market.', expanded: 'The difference between post-rehab value and total cost basis. Often the main "win" in BRRRR.' },
  // Fix & Flip Metrics
  'Purchase Price': { short: 'What you pay to buy the property.', expanded: 'The negotiated price (plus any direct acquisition costs if you choose to include them).' },
  'Rehab Budget': { short: 'Estimated cost to renovate and repair the property.', expanded: 'Labor + materials + permits + contingency. Underestimating this is one of the biggest flip risks.' },
  'After Repair Value': { short: 'Estimated market value after renovations.', expanded: 'The expected resale value once repairs are completed—usually based on comparable sales (comps).' },
  // House Hack Metrics
  'Effective Housing Cost': { short: 'Your monthly cost after rental income offsets it.', expanded: 'Mortgage + expenses minus roommate/tenant rent. This is what it really costs you to live there.' },
  'Monthly Savings': { short: 'What you save vs. paying rent somewhere else.', expanded: 'Your market rent alternative minus your effective housing cost.' },
  'Rental Income': { short: 'Total rent collected from rooms/units you rent out.', expanded: 'The combined monthly rent from roommates or tenants that helps cover your housing payment.' },
  'Rent per Room': { short: 'Average rent charged per room.', expanded: 'Total rental income divided by the number of rented rooms—useful for pricing and scenario testing.' },
  'Mortgage Payment': { short: 'The loan payment for principal and interest each month.', expanded: 'Does not include taxes/insurance unless showing PITI—make sure labels are clear.' },
  // Wholesale Metrics
  'Maximum Allowable Offer': { short: 'Highest price you can offer and still profit.', expanded: 'A ceiling price that leaves room for repairs, investor profit, and your wholesale fee.' },
  'Purchase as % of ARV': { short: 'Purchase price compared to ARV.', expanded: 'Lower percentages generally mean more margin for repairs, profit, and resale risk.' },
  'Wholesale Fee': { short: 'Your profit from assigning the deal.', expanded: 'The amount the end buyer pays you (assignment or spread) for placing them into the contract.' },
  '70% of ARV': { short: 'Rule of thumb: 70% of ARV minus repairs.', expanded: 'A common quick filter investors use to leave enough margin for rehab risk and resale costs.' },
  'Estimated Repairs': { short: 'Expected cost to fix and renovate the property.', expanded: 'A rough estimate used to size rehab scope and determine whether the deal meets investor margins.' },
}

// Tooltip component with hover
function MetricTooltip({ label }: { label: string }) {
  const tooltip = METRIC_TOOLTIPS[label]
  if (!tooltip) return null
  
  return (
    <span className="relative group inline-flex ml-1">
      <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-navy-900 text-white text-[11px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-56 z-50 shadow-lg pointer-events-none">
        <span className="font-medium block mb-1">{tooltip.short}</span>
        <span className="text-gray-300 block leading-relaxed">{tooltip.expanded}</span>
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-navy-900" />
      </span>
    </span>
  )
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchProperty(address: string): Promise<PropertyData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'
  // #region agent log
  console.log('[DEBUG-A,C] fetchProperty entry:', { address, apiUrl, fullUrl: `${apiUrl}/api/v1/properties/search` })
  // #endregion
  try {
    const response = await fetch(`${apiUrl}/api/v1/properties/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    })
    // #region agent log
    console.log('[DEBUG-B,D] fetchProperty response:', { status: response.status, ok: response.ok, statusText: response.statusText })
    // #endregion
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read response');
      // #region agent log
      console.log('[DEBUG-B] fetchProperty not ok:', { status: response.status, errorText })
      // #endregion
      throw new Error('Property not found')
    }
    const data = await response.json()
    // #region agent log
    console.log('[DEBUG-E] fetchProperty success:', { propertyId: data?.property_id, hasAddress: !!data?.address })
    // #endregion
    return data
  } catch (err) {
    // #region agent log
    console.log('[DEBUG-D] fetchProperty catch:', { errorMessage: err instanceof Error ? err.message : String(err), errorName: err instanceof Error ? err.name : 'Unknown' })
    // #endregion
    throw err
  }
}

// ============================================
// CALCULATIONS
// ============================================

function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12)
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
}

function calculateLTR(a: Assumptions) {
  const downPayment = a.purchasePrice * a.downPaymentPct
  const closingCosts = a.purchasePrice * a.closingCostsPct
  const loanAmount = a.purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.monthlyRent * 12
  const vacancyLoss = annualGrossRent * a.vacancyRate
  const effectiveGrossIncome = annualGrossRent - vacancyLoss
  const propertyManagement = annualGrossRent * a.managementPct
  const maintenance = annualGrossRent * a.maintenancePct
  const totalOperatingExpenses = a.propertyTaxes + a.insurance + propertyManagement + maintenance
  const noi = effectiveGrossIncome - totalOperatingExpenses
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = a.purchasePrice > 0 ? noi / a.purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  const onePercentRule = a.purchasePrice > 0 ? a.monthlyRent / a.purchasePrice : 0
  return { totalCashRequired, monthlyCashFlow, annualCashFlow, capRate, cashOnCash, dscr, onePercentRule, noi, loanAmount }
}

function calculateSTR(a: Assumptions) {
  const downPayment = a.purchasePrice * a.downPaymentPct
  const closingCosts = a.purchasePrice * a.closingCostsPct
  const loanAmount = a.purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.averageDailyRate * 365 * a.occupancyRate
  const managementFee = annualGrossRent * 0.20
  const platformFees = annualGrossRent * 0.03
  const utilities = 3600
  const supplies = 2400
  const totalOperatingExpenses = a.propertyTaxes + a.insurance + managementFee + platformFees + utilities + supplies + (annualGrossRent * a.maintenancePct)
  const noi = annualGrossRent - totalOperatingExpenses
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = a.purchasePrice > 0 ? noi / a.purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0
  return { totalCashRequired, monthlyCashFlow, annualCashFlow, capRate, cashOnCash, noi, annualGrossRent }
}

function calculateBRRRR(a: Assumptions) {
  const initialCash = (a.purchasePrice * 0.30) + a.rehabCost + (a.purchasePrice * a.closingCostsPct)
  const refinanceLoanAmount = a.arv * 0.75
  const cashBack = refinanceLoanAmount - (a.purchasePrice * 0.70)
  const cashLeftInDeal = Math.max(0, initialCash - cashBack)
  const monthlyPI = calculateMonthlyMortgage(refinanceLoanAmount, a.interestRate, a.loanTermYears)
  const annualDebtService = monthlyPI * 12
  const annualGrossRent = a.monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - a.vacancyRate)
  const totalOperatingExpenses = a.propertyTaxes + a.insurance + (annualGrossRent * a.managementPct) + (annualGrossRent * a.maintenancePct)
  const noi = effectiveGrossIncome - totalOperatingExpenses
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal : Infinity
  const equityCreated = a.arv - refinanceLoanAmount
  return { initialCash, cashBack, cashLeftInDeal, monthlyCashFlow, annualCashFlow, cashOnCash, equityCreated, refinanceLoanAmount }
}

function calculateFlip(a: Assumptions) {
  // PRIMARY METRICS: Flip Margin (the opportunity/spread)
  const flipMargin = a.arv - a.purchasePrice - a.rehabCost
  const flipMarginPct = a.purchasePrice > 0 ? flipMargin / a.purchasePrice : 0
  
  // 70% Rule Check: Purchase should be ≤ (ARV × 0.70) - Rehab
  const maxPurchase70Rule = (a.arv * 0.70) - a.rehabCost
  const passes70Rule = a.purchasePrice <= maxPurchase70Rule
  
  // DETAILED P&L (for Full Breakdown)
  const purchaseCosts = a.purchasePrice * a.closingCostsPct
  const holdingCosts = (a.purchasePrice * (a.interestRate / 12) * a.holdingPeriodMonths) + ((a.propertyTaxes / 12) * a.holdingPeriodMonths) + ((a.insurance / 12) * a.holdingPeriodMonths)
  const sellingCosts = a.arv * a.sellingCostsPct
  const totalInvestment = a.purchasePrice + purchaseCosts + a.rehabCost + holdingCosts
  const netProfit = a.arv - totalInvestment - sellingCosts
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0
  const annualizedROI = roi * (12 / a.holdingPeriodMonths)
  
  return { 
    // Primary metrics (headline)
    flipMargin, flipMarginPct, passes70Rule, maxPurchase70Rule,
    // Detailed P&L (breakdown)
    totalInvestment, netProfit, roi, annualizedROI, holdingCosts, sellingCosts, purchaseCosts
  }
}

function calculateHouseHack(a: Assumptions) {
  // Use actual bedrooms from property, rooms rented is user-adjustable
  const totalBedrooms = a.totalBedrooms || 4
  const roomsRented = a.roomsRented || Math.max(1, totalBedrooms - 1)
  // Pro-rata rent per room based on total monthly rent
  const rentPerRoom = a.monthlyRent / totalBedrooms
  const monthlyRentalIncome = rentPerRoom * roomsRented
  const downPayment = a.purchasePrice * 0.035
  const closingCosts = a.purchasePrice * a.closingCostsPct
  const totalCashRequired = downPayment + closingCosts
  const loanAmount = a.purchasePrice - downPayment
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears)
  const monthlyTaxes = a.propertyTaxes / 12
  const monthlyInsurance = a.insurance / 12
  const monthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + (monthlyRentalIncome * a.vacancyRate) + (monthlyRentalIncome * a.maintenancePct)
  const effectiveHousingCost = monthlyExpenses - monthlyRentalIncome
  const marketRent = rentPerRoom * 1.2
  const monthlySavings = marketRent - effectiveHousingCost
  return { totalCashRequired, monthlyRentalIncome, effectiveHousingCost, monthlySavings, monthlyPI, roomsRented, totalBedrooms, rentPerRoom }
}

function calculateWholesale(a: Assumptions) {
  // 70% Rule: MAO = (ARV × 0.70) - Repair Costs - Wholesale Fee
  // Wholesale Fee defaults to 0.7% of Est. Market Value (basePurchasePrice)
  const wholesaleFee = a.basePurchasePrice * a.wholesaleFeePct
  const mao = (a.arv * 0.70) - a.rehabCost - wholesaleFee
  
  // Purchase Price as % of ARV (key metric for 70% rule rating)
  const purchasePctOfArv = a.arv > 0 ? a.purchasePrice / a.arv : 1
  
  // Additional reference calculations
  const arvMultiple = a.arv * 0.70 // What 70% of ARV gives you
  const spreadFromPurchase = mao - a.purchasePrice // Difference from purchase price
  const isPurchaseBelowMAO = a.purchasePrice <= mao
  
  return { 
    mao, 
    wholesaleFee, 
    arvMultiple,
    spreadFromPurchase,
    isPurchaseBelowMAO,
    purchasePctOfArv,
    arv: a.arv,
    rehabCost: a.rehabCost
  }
}

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
const formatCompact = (value: number): string => Math.abs(value) >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(0)}K` : formatCurrency(value)
const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

// ============================================
// STRATEGY DEFINITIONS
// ============================================

const strategies: { id: StrategyId; name: string; shortName: string; description: string; icon: any; color: string; gradient: string }[] = [
  { id: 'ltr', name: 'Long-Term Rental', shortName: 'LTR', description: 'Buy-and-hold with steady cash flow', icon: Building2, color: 'teal', gradient: 'from-teal-500 to-emerald-600' },
  { id: 'str', name: 'Short-Term Rental', shortName: 'STR', description: 'Airbnb/VRBO for max revenue', icon: Home, color: 'cyan', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', description: 'Buy, Rehab, Rent, Refi, Repeat', icon: Repeat, color: 'emerald', gradient: 'from-emerald-500 to-green-600' },
  { id: 'flip', name: 'Fix & Flip', shortName: 'Flip', description: 'Renovate and sell for profit', icon: Hammer, color: 'orange', gradient: 'from-orange-500 to-red-500' },
  { id: 'house_hack', name: 'House Hack', shortName: 'Hack', description: 'Live in one, rent the rest', icon: Users, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', description: 'Assign contracts for quick profit', icon: FileText, color: 'pink', gradient: 'from-pink-500 to-rose-600' },
]

// Strategy explanations for the info modal - using JSX for rich formatting
const strategyExplanations: Record<StrategyId, { title: string; content: React.ReactNode }> = {
  ltr: {
    title: 'Long-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Long-term rental</strong> is the classic buy-and-hold strategy that&apos;s made countless millionaires! You purchase a property, rent it out to reliable tenants on an annual lease, and watch your wealth grow on autopilot. Every month, rent checks come in while your tenants pay down your mortgage for you.</p>
        <p className="mb-2">The magic happens in three ways:</p>
        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
          <li>Monthly cash flow puts money in your pocket. NOW!</li>
          <li>Your tenants build equity for you by paying down the loan</li>
          <li>Appreciation grows your property value over time.</li>
        </ol>
        <p>It&apos;s the perfect <strong>&quot;set it and forget it&quot;</strong> strategy—ideal for investor who want to build lasting wealth without the stress of constant management. Think of it as planting a money tree that grows stronger every year!</p>
      </>
    )
  },
  str: {
    title: 'Short-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Short-term rental</strong> is where you turn your property into a high-revenue hospitality business using platforms like Airbnb or VRBO! Instead of one tenant paying $2,000/month, imagine multiple guests paying $150-$300 PER NIGHT! Properties in hot tourist areas or business districts can generate <strong>2-3X more revenue</strong> than traditional rentals.</p>
        <p className="mb-3">Yes, it requires more hands-on management (or a property manager), but the numbers speak for themselves. You&apos;re not just a landlord—you&apos;re running a hospitality business that can generate serious cash flow. Perfect for properties <strong>near beaches, mountains, major cities</strong>, or business hubs.</p>
        <p><strong>The best part?</strong> You can block off dates to use the property yourself for vacations!</p>
      </>
    )
  },
  brrrr: {
    title: 'BRRRR',
    content: (
      <>
        <p className="mb-3"><strong>BRRRR</strong> stands for <strong>Buy, Rehab, Rent, Refinance, Repeat</strong>—and it&apos;s the holy grail for serious investors who want to scale FAST!</p>
        <p className="mb-2">Here&apos;s how it works:</p>
        <ul className="list-disc list-inside mb-3 space-y-1 ml-2">
          <li>Buy a distressed property below market value,</li>
          <li>Rehab it to increase its worth,</li>
          <li>Rent it out to generate cash flow,</li>
          <li>Refinance based on the NEW higher value to pull out most (or ALL) of your initial investment.</li>
          <li>Repeat the process!</li>
        </ul>
        <p className="mb-3">Now you have a cash-flowing property AND you got your money back to Repeat the process! It&apos;s like having your cake and eating it too. Investors use BRRRR to build massive portfolios quickly because each deal funds the next one. The goal is &quot;infinite return&quot;—when you&apos;ve pulled out 100% of your investment but still own a property that pays you every month. Mind-blowing, right?</p>
      </>
    )
  },
  flip: {
    title: 'Fix & Flip',
    content: (
      <>
        <p className="mb-3"><strong>Fix & Flip</strong> is the <strong>fast-cash strategy</strong> where you buy a distressed property at a discount, transform it into something beautiful, and sell it for profit—sometimes in just 3-6 months!</p>
        <p className="mb-3">While other strategies build wealth slowly over time, flipping puts tens of thousands of dollars in your pocket, NOW!</p>
        <p className="mb-3">It requires more work and carries more risk, but the rewards can be exceptional. A successful flip can net you <strong>$30,000-$100,000+ in profit</strong> that you can use to fund your next deal or invest in rental properties.</p>
        <p>It&apos;s <strong>thrilling</strong>, it&apos;s <strong>fast-paced</strong>, and every successful flip proves you can spot value where others see problems! If you love HGTV and want to see big checks FAST, flipping is your game!</p>
      </>
    )
  },
  house_hack: {
    title: 'House Hack',
    content: (
      <>
        <p className="mb-3"><strong>House hacking</strong> is the <strong>ultimate beginner</strong> strategy where your biggest expense—housing—becomes your biggest asset instead!</p>
        <p className="mb-3">You buy a duplex, triplex, or single-family home with extra bedrooms, live in one unit/room, and rent out the others. The rent from your tenants covers most or ALL of your mortgage, property taxes, and insurance.</p>
        <p className="mb-3">You&apos;re essentially <strong>living for FREE</strong> while building equity and learning the landlord game with training wheels on. Plus, you can qualify for low down payment loans (as low as 3.5% FHA or 0% VA) because it&apos;s your primary residence! It&apos;s the fastest path from &quot;paying rent&quot; to &quot;collecting rent&quot; and building wealth. This strategy has created more first-time millionaire investors than any other!</p>
      </>
    )
  },
  wholesale: {
    title: 'Wholesale',
    content: (
      <>
        <p className="mb-3"><strong>Wholesaling</strong> is how you make money in real estate with <strong>little to no money</strong> of your own!</p>
        <p className="mb-2">Here&apos;s the genius:</p>
        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
          <li>You find deeply discounted properties (usually distressed), get them under contract,</li>
          <li>Immediately assign that contract to another investor for a fee—typically $5,000-$15,000 or more.</li>
        </ol>
        <p className="mb-3">You never actually buy the property, never deal with banks, and never risk your own capital.</p>
        <p><strong>It&apos;s pure deal-finding hustle!</strong> Your job is to be the matchmaker—connecting motivated sellers with cash buyers. While it won&apos;t build long-term wealth like rentals, it generates quick cash that you can use to fund your first rental property down payment. Many successful investors started with wholesaling to build their war chest before transitioning to buy-and-hold strategies. It&apos;s all about hustle, marketing, and building your buyer network!</p>
      </>
    )
  }
}

// ============================================
// UI COMPONENTS
// ============================================

interface Photo {
  url: string
  caption?: string
  width?: number
  height?: number
}

function PhotoCarousel({ zpid, fillHeight = false }: { zpid: string | null | undefined; fillHeight?: boolean }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!zpid) return
    
    const fetchPhotos = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/v1/photos?zpid=${zpid}`)
        const data = await response.json()
        if (data.success && data.photos?.length > 0) {
          setPhotos(data.photos)
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPhotos()
  }, [zpid])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }

  // Container classes based on fillHeight prop
  const containerClass = fillHeight 
    ? "w-full h-full min-h-[120px] bg-gray-200 flex items-center justify-center"
    : "w-[280px] h-[100px] bg-gray-100 rounded-xl flex items-center justify-center"

  // Hide carousel if no zpid or no photos available
  if (!zpid) {
    return null
  }

  // Show loading spinner while fetching
  if (isLoading) {
    return (
      <div className={containerClass}>
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    )
  }

  // Hide if no photos available
  if (photos.length === 0) {
    return null
  }

  const carouselClass = fillHeight
    ? "relative w-full h-full min-h-[120px] overflow-hidden group"
    : "relative w-[280px] h-[100px] rounded-xl overflow-hidden group"

  return (
    <div className={carouselClass}>
      {/* Main Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[currentIndex]?.url}
        alt={photos[currentIndex]?.caption || `Property photo ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>'
        }}
      />
      
      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); goToPrevious() }}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); goToNext() }}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next photo"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </>
      )}
      
      {/* Photo Counter */}
      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
        {currentIndex + 1}/{photos.length}
      </div>
    </div>
  )
}

// Photo Grid - 4 photos in a row matching HTML design
function PhotoGrid({ zpid }: { zpid: string | null | undefined }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (!zpid) return
    
    const fetchPhotos = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/v1/photos?zpid=${zpid}`)
        const data = await response.json()
        if (data.success && Array.isArray(data.photos) && data.photos.length > 0) {
          setPhotos(data.photos)
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPhotos()
  }, [zpid])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  // Hide photo grid if no zpid
  if (!zpid) {
    return null
  }

  // Show loading placeholders while fetching
  if (isLoading) {
    return (
      <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-[220px] aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
            {i === 0 ? (
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-300" />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Hide if no photos available
  if (photos.length === 0) {
    return null
  }

  // Show first 4 photos in a horizontal scrolling carousel
  const displayPhotos = photos.slice(0, 4)
  const remainingCount = photos.length - 4

  return (
    <>
      <div className="flex gap-2.5 mt-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {displayPhotos.map((photo, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="relative flex-shrink-0 w-[220px] aspect-video rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Property photo ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/></svg>'
              }}
            />
            {/* Show remaining count on last photo */}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">+{remainingCount}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* Photo counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium">
            {lightboxIndex + 1} of {photos.length}
          </div>
          
          {/* Main image */}
          <div className="relative max-w-[90vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex]?.url}
              alt={`Property photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
          
          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1)) }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1)) }}
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          
          {/* Thumbnail strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-2">
            {photos.slice(0, 12).map((photo, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(index) }}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all ${
                  index === lightboxIndex 
                    ? 'ring-2 ring-white opacity-100 scale-105' 
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {photos.length > 12 && (
              <div className="flex-shrink-0 w-16 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-medium">
                +{photos.length - 12}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function PropertyHeader({ property }: { property: PropertyData }) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // Get estimated market value (Zestimate or AVM)
  const estimatedValue = property.valuations.zestimate || property.valuations.current_value_avm || 0
  
  const handleSaveProperty = async () => {
    if (!isAuthenticated) {
      setShowAuthModal('login')
      return
    }
    
    setSaveStatus('saving')
    
    try {
      const token = localStorage.getItem('access_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'
      
      const response = await fetch(`${apiUrl}/api/v1/properties/saved`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_property_id: property.property_id,
          zpid: property.zpid || null,
          address_street: property.address.street,
          address_city: property.address.city,
          address_state: property.address.state,
          address_zip: property.address.zip_code,
          full_address: property.address.full_address,
          property_data_snapshot: property,
          status: 'watching'
        }),
      })
      
      if (response.ok) {
        setSaveStatus('saved')
      } else {
        const error = await response.json()
        console.error('Failed to save property:', error)
        setSaveStatus('error')
        // Reset after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (err) {
      console.error('Failed to save property:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }
  
  return (
    <div className="mb-4 bg-white dark:bg-navy-800 rounded-[0.875rem] shadow-sm dark:shadow-lg p-4 transition-colors duration-300 border border-[#0465f2]">
      {/* Top row: Property Info + Save Button */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          {/* Full Address */}
          <h1 className="text-lg font-bold text-navy-900 dark:text-white leading-tight">
            {property.address.street}, {property.address.city}, {property.address.state} {property.address.zip_code}
          </h1>
          {/* Estimated Value + Property Details */}
          <div className="flex items-center gap-2.5 text-xs mt-1">
            {estimatedValue > 0 && (
              <span className="text-base font-bold text-brand-500 dark:text-brand-400">
                Est. {formatCurrency(estimatedValue)}
              </span>
            )}
            <span className="text-gray-500 dark:text-gray-400">{property.details.bedrooms || '—'} bd</span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-500 dark:text-gray-400">{property.details.bathrooms || '—'} ba</span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-500 dark:text-gray-400">{property.details.square_footage?.toLocaleString() || '—'} sqft</span>
          </div>
        </div>
        
        {/* Save Property Button */}
        <button
          onClick={handleSaveProperty}
          disabled={saveStatus === 'saving' || saveStatus === 'saved'}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[0.8125rem] font-medium border transition-all ${
            saveStatus === 'saved'
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 cursor-default'
              : saveStatus === 'saving'
              ? 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-navy-700 dark:border-navy-600 dark:text-gray-500 cursor-wait'
              : saveStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 hover:bg-red-100'
              : 'bg-transparent border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-brand-500 hover:text-brand-500 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-400 dark:hover:text-brand-400'
          }`}
          title={saveStatus === 'saved' ? 'Property saved to dashboard' : 'Save property to your dashboard'}
        >
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Saved</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Retry</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save</span>
            </>
          )}
        </button>
      </div>
      
      {/* Photo Grid */}
      <PhotoGrid zpid={property.zpid} />
    </div>
  )
}

function GradientSlider({ label, value, min, max, step, onChange, formatType = 'currency', compact = false }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void
  formatType?: 'currency' | 'percent' | 'years' | 'months'; compact?: boolean
}) {
  const percentage = Math.round(((value - min) / (max - min)) * 100)
  const displayValue = formatType === 'currency' ? formatCurrency(value) : formatType === 'percent' ? `${(value * 100).toFixed(1)}%` : formatType === 'years' ? `${value} yrs` : `${value} mo`

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        <span className="text-xs font-bold text-navy-900 font-mono">{displayValue}</span>
      </div>
      <div className="relative h-[3px]">
        <div className="absolute inset-0 rounded-sm bg-gray-200" />
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill-tailwind bg-gradient-to-r from-accent-500 to-brand-500" 
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} title={label} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  )
}

// Adjustment slider for ±50% range with center at 0% - matches HTML design
function AdjustmentSlider({ label, baseValue, adjustment, onChange, compact = false }: {
  label: string; baseValue: number; adjustment: number; onChange: (adj: number) => void; compact?: boolean
}) {
  // adjustment is -0.5 to +0.5, convert to 0-100 slider position (50 = center)
  const sliderPosition = Math.round((adjustment + 0.5) * 100)
  const computedValue = Math.round(baseValue * (1 + adjustment))
  const adjPercent = adjustment * 100
  const adjSign = adjustment >= 0 ? '+' : ''

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-navy-900 dark:text-white font-mono">{formatCurrency(computedValue)}</span>
          <span className="text-[0.6875rem] font-semibold text-brand-500 dark:text-brand-400">
            {adjSign}{adjPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-[3px] mt-1.5">
        {/* Gray background track */}
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed] dark:bg-navy-600" />
        {/* Gradient fill from left to thumb position */}
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${sliderPosition}%` } as React.CSSProperties}
        />
        {/* Thumb */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${sliderPosition}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={100} 
          step={1} 
          value={sliderPosition} 
          onChange={(e) => onChange((parseFloat(e.target.value) - 50) / 100)} 
          aria-label={label}
          title={`Adjust ${label}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  )
}

// Percentage slider for 0-100% range - matches HTML design
function PercentSlider({ label, value, onChange, compact = false, maxPercent = 100 }: {
  label: string; value: number; onChange: (value: number) => void; compact?: boolean; maxPercent?: number
}) {
  const percentage = Math.round((value / (maxPercent / 100)) * 100)
  const displayPercent = (value * 100).toFixed(1)

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{label}</span>
        <span className="text-xs font-bold text-navy-900 dark:text-white font-mono">{displayPercent}%</span>
      </div>
      <div className="relative h-[3px] mt-1.5">
        {/* Gray background track */}
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed] dark:bg-navy-600" />
        {/* Gradient fill from left to thumb position */}
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        {/* Thumb */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={maxPercent / 100} 
          step={0.001} 
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))} 
          aria-label={label}
          title={`Adjust ${label}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  )
}

// Percentage slider that shows both $ amount and % (for Down Payment, Rehab Cost) - matches HTML design
function PercentDollarSlider({ label, value, baseAmount, onChange, compact = false, maxPercent = 100 }: {
  label: string; value: number; baseAmount: number; onChange: (value: number) => void; compact?: boolean; maxPercent?: number
}) {
  const percentage = Math.round((value / (maxPercent / 100)) * 100)
  const displayPercent = (value * 100).toFixed(1)
  const dollarValue = Math.round(baseAmount * value)

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-navy-900 font-mono">{formatCurrency(dollarValue)}</span>
          <span className="text-[0.6875rem] font-semibold text-brand-500">({displayPercent}%)</span>
        </div>
      </div>
      <div className="relative h-[3px] mt-1.5">
        {/* Gray background track */}
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed]" />
        {/* Gradient fill from left to thumb position */}
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill-tailwind bg-gradient-to-r from-accent-500 to-brand-500"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        {/* Thumb */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={maxPercent / 100} 
          step={0.001} 
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))} 
          aria-label={label}
          title={`Adjust ${label}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  )
}

// Maintenance slider that shows both % and calculated $ value
// Maintenance slider - matches HTML design
function MaintenanceSlider({ value, onChange, annualRent, compact = false }: {
  value: number; onChange: (value: number) => void; annualRent: number; compact?: boolean
}) {
  const percentage = Math.round((value / 0.30) * 100) // maxPercent is 30%
  const displayPercent = (value * 100).toFixed(1)
  const monthlyValue = Math.round((annualRent * value) / 12) // Monthly calculation

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">Maintenance</span>
        <span className="text-xs font-bold text-navy-900 font-mono">{formatCurrency(monthlyValue)} ({displayPercent}%)</span>
      </div>
      <div className="relative h-[3px] mt-1.5">
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed]" />
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={0.30} 
          step={0.005} 
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))} 
          aria-label="Maintenance percentage"
          title={`Adjust Maintenance - ${displayPercent}% = ${formatCurrency(monthlyValue)}/mo`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  )
}

// Management slider - matches HTML design
function ManagementSlider({ value, onChange, annualRent, compact = false }: {
  value: number; onChange: (value: number) => void; annualRent: number; compact?: boolean
}) {
  const percentage = Math.round((value / 0.30) * 100) // maxPercent is 30%
  const displayPercent = (value * 100).toFixed(1)
  const monthlyValue = Math.round((annualRent * value) / 12) // Monthly calculation

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">Management</span>
        <span className="text-xs font-bold text-navy-900 font-mono">{formatCurrency(monthlyValue)} ({displayPercent}%)</span>
      </div>
      <div className="relative h-[3px] mt-1.5">
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed]" />
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={0.30}
          step={0.001}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label="Management percentage"
          title="Adjust Management percentage"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

// Discrete slider for rooms rented - matches HTML design
function RoomsRentedSlider({ roomsRented, totalBedrooms, onChange, compact = false }: {
  roomsRented: number; totalBedrooms: number; onChange: (rooms: number) => void; compact?: boolean
}) {
  const maxRooms = Math.max(1, totalBedrooms - 1) // Can't rent all rooms - owner needs 1
  const percentage = totalBedrooms > 1 ? ((roomsRented - 1) / (maxRooms - 1)) * 100 : 50

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">Rooms Rented</span>
        <span className="text-xs font-bold text-navy-900 font-mono">{roomsRented} of {totalBedrooms} rooms</span>
      </div>
      <div className="relative h-[3px] mt-1.5">
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed]" />
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={1} 
          max={maxRooms} 
          step={1} 
          value={roomsRented} 
          onChange={(e) => onChange(parseInt(e.target.value))} 
          aria-label="Rooms Rented"
          title="Adjust number of rooms rented"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
      {/* Room indicators */}
      <div className="flex justify-between mt-1">
        {Array.from({ length: maxRooms }, (_, i) => i + 1).map(room => (
          <div 
            key={room} 
            className={`w-1.5 h-1.5 rounded-full ${room <= roomsRented ? 'bg-brand-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  )
}

// Rating configuration
type Rating = 'poor' | 'fair' | 'good' | 'great' | 'excellent'

const ratingConfig: Record<Rating, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  poor: { label: 'Poor', bgColor: 'bg-rose-50', textColor: 'text-rose-600', borderColor: 'border-rose-200' },
  fair: { label: 'Fair', bgColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
  good: { label: 'Good', bgColor: 'bg-teal-50', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
  great: { label: 'Great', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  excellent: { label: 'Excellent', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-300' },
}

// Strategy Info Modal Component
function StrategyInfoModal({ 
  strategyId, 
  isOpen, 
  onClose 
}: { 
  strategyId: StrategyId
  isOpen: boolean
  onClose: () => void 
}) {
  const explanation = strategyExplanations[strategyId]
  const strategy = strategies.find(s => s.id === strategyId)
  
  if (!isOpen || !explanation || !strategy) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - top right */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        
        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto max-h-[70vh]">
          <div className="text-sm text-gray-700 leading-relaxed pr-6">
            {explanation.content}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className={`w-full py-2.5 bg-gradient-to-r ${strategy.gradient} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

function StrategyCard({ strategy, metrics, isSelected, onClick }: {
  strategy: typeof strategies[0]; metrics: { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; primaryValue: number; secondaryValue: number }
  isSelected: boolean; onClick: () => void
}) {
  const [showInfoModal, setShowInfoModal] = useState(false)
  
  // Use actual numeric value for profit/loss coloring - blue for positive, gray for breakeven, red for negative
  const isLoss = metrics.primaryValue < 0
  const isBreakeven = metrics.primaryValue === 0
  const primaryColor = isLoss ? 'text-crimson-500' : isBreakeven ? 'text-gray-400' : 'text-brand-500'
  
  // Secondary value coloring - blue for positive, gray for zero, red for negative
  const isSecondaryLoss = metrics.secondaryValue < 0
  const isSecondaryBreakeven = metrics.secondaryValue === 0
  const secondaryColor = isSecondaryLoss ? 'text-crimson-500' : isSecondaryBreakeven ? 'text-gray-400' : 'text-brand-500'
  
  // Accent bar color - blue for all
  const accentColor = 'bg-brand-500'
  
  // Shortened names for strategy boxes
  const displayName = strategy.id === 'ltr' ? 'Long Rental' 
    : strategy.id === 'str' ? 'Short Rental' 
    : strategy.name
  
  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card selection when clicking info
    setShowInfoModal(true)
  }
  
  return (
    <>
      <button
        onClick={onClick}
        className={`relative rounded-md text-left transition-all duration-200 overflow-hidden w-full h-full ${
          isSelected 
            ? 'bg-white dark:bg-navy-700 ring-1 ring-gray-200 dark:ring-navy-600' 
            : 'bg-gray-500/15 dark:bg-navy-800/50 hover:bg-gray-500/10 dark:hover:bg-navy-700/50'
        }`}
      >
        {/* Thin top accent bar */}
        <div className={`h-0.5 w-full ${accentColor}`} />
        
        {/* Info Button - Top Right */}
        <button 
          type="button"
          onClick={handleInfoClick}
          className="absolute top-2 right-1.5 w-5 h-5 bg-gray-100 dark:bg-navy-600 hover:bg-gray-200 dark:hover:bg-navy-500 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10 group"
          title={`What is ${strategy.name}?`}
          aria-label={`Learn about ${strategy.name}`}
        >
          <Info className="w-3 h-3 text-gray-400 dark:text-gray-300 group-hover:text-gray-600 dark:group-hover:text-white" />
        </button>
        
        <div className="px-2.5 py-2 h-full flex flex-col">
          {/* Strategy Name - shortened for boxes */}
          <h3 className="text-[11px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight mb-1.5 pr-5">{displayName}</h3>
          
          {/* Primary Value - Blue for positive, red for negative */}
          <div className={`text-xl font-semibold tracking-tight leading-none ${primaryColor}`}>
            {metrics.primary}
          </div>
          <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 tracking-wide mt-0.5 mb-1.5">{metrics.primaryLabel}</div>
          
          {/* Secondary Metric - Value on top, label below - Blue for positive, red for negative */}
          <div className="pt-1.5 border-t border-gray-100/80 dark:border-navy-600">
            <div className={`text-sm font-semibold ${secondaryColor}`}>{metrics.secondary}</div>
            <div className="text-[9px] font-medium mt-px text-gray-500 dark:text-gray-400">{metrics.secondaryLabel}</div>
          </div>
        </div>
      </button>
      
      {/* Info Modal */}
      <StrategyInfoModal 
        strategyId={strategy.id} 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />
    </>
  )
}

// Strategy type for the carousel
type Strategy = { id: StrategyId; name: string; shortName: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string; gradient: string }

// Strategy Grid - 6 columns matching HTML design
function StrategyGrid({ 
  strategies: strategyList, 
  strategyMetrics, 
  selectedStrategy, 
  onSelectStrategy 
}: {
  strategies: Strategy[]
  strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; primaryValue: number; secondaryValue: number }>
  selectedStrategy: StrategyId
  onSelectStrategy: (id: StrategyId) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-5 pb-4">
      {strategyList.map((strategy) => {
        const isSelected = selectedStrategy === strategy.id
        const metrics = strategyMetrics[strategy.id]
        const isLoss = metrics.primaryValue < 0
        const isBreakeven = metrics.primaryValue === 0
        
        // Secondary value coloring
        const isSecondaryLoss = metrics.secondaryValue < 0
        const isSecondaryBreakeven = metrics.secondaryValue === 0
        
        // Shortened names for strategy boxes only
        const displayName = strategy.id === 'ltr' ? 'Long Rental' 
          : strategy.id === 'str' ? 'Short Rental' 
          : strategy.name
        
        // Color: red for loss, gray for breakeven, blue for profit
        const primaryColor = isLoss ? 'text-crimson-500' : isBreakeven ? 'text-gray-400' : 'text-brand-500'
        const secondaryColor = isSecondaryLoss ? 'text-crimson-500' : isSecondaryBreakeven ? 'text-gray-400' : 'text-brand-500'
        
        return (
          <button
            key={strategy.id}
            onClick={() => onSelectStrategy(strategy.id)}
            className={`relative bg-white dark:bg-navy-700 border-2 rounded-[0.625rem] p-3 text-center transition-all cursor-pointer ${
              isSelected 
                ? 'border-brand-500 shadow-[0_6px_20px_rgba(4,101,242,0.3)] scale-[1.03] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-600 dark:to-navy-500' 
                : 'border-gray-200 dark:border-navy-600 hover:border-brand-500 hover:shadow-lg'
            }`}
          >
            {/* Selected Checkmark */}
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                ✓
              </div>
            )}
            
            {/* Strategy Name - shortened for boxes */}
            <div className="text-base font-semibold text-navy-900 dark:text-white mb-1.5">{displayName}</div>
            
            {/* Primary Value - Blue for positive, gray for breakeven, red for negative */}
            <div className={`text-lg font-bold font-mono mb-0.5 ${primaryColor}`}>
              {metrics.primary}
            </div>
            <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 mb-1.5">{metrics.primaryLabel}</div>
            
            {/* Secondary Value - Blue for positive, gray for breakeven, red for negative */}
            <div className={`text-[0.9375rem] font-bold mb-0.5 ${secondaryColor}`}>{metrics.secondary}</div>
            <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400">{metrics.secondaryLabel}</div>
          </button>
        )
      })}
    </div>
  )
}

// Mobile Strategy Preview - Compact 2x3 grid for real-time feedback on mobile
// Shows strategy results inline with Section 1 sliders so users see changes immediately
function MobileStrategyPreview({ 
  strategies: strategyList, 
  strategyMetrics, 
  selectedStrategy, 
  onSelectStrategy 
}: {
  strategies: Strategy[]
  strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; primaryValue: number; secondaryValue: number }>
  selectedStrategy: StrategyId
  onSelectStrategy: (id: StrategyId) => void
}) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-navy-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-bold">
            2
          </div>
          <span className="text-base font-bold text-navy-900 dark:text-white">Live Results</span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">Tap to select strategy</span>
      </div>
      
      {/* Compact 2x3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {strategyList.map((strategy) => {
          const isSelected = selectedStrategy === strategy.id
          const metrics = strategyMetrics[strategy.id]
          const isLoss = metrics.primaryValue < 0
          const isBreakeven = metrics.primaryValue === 0
          
          // Shortened names for compact view
          const displayName = strategy.id === 'ltr' ? 'Long' 
            : strategy.id === 'str' ? 'Short' 
            : strategy.id === 'brrrr' ? 'BRRRR'
            : strategy.id === 'flip' ? 'Flip'
            : strategy.id === 'house_hack' ? 'Hack'
            : strategy.id === 'wholesale' ? 'Whole'
            : strategy.name // Fallback to full name for any unknown strategy
          
          // Color based on profit/loss
          const valueColor = isLoss ? 'text-crimson-500' : isBreakeven ? 'text-gray-400' : 'text-brand-500'
          
          return (
            <button
              key={strategy.id}
              onClick={() => onSelectStrategy(strategy.id)}
              className={`relative rounded-lg p-2 text-center transition-all ${
                isSelected 
                  ? 'bg-brand-500 text-white shadow-md scale-[1.02]' 
                  : 'bg-gray-50 dark:bg-navy-700 hover:bg-gray-100 dark:hover:bg-navy-600'
              }`}
            >
              {/* Strategy Name */}
              <div className={`text-[10px] font-semibold mb-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {displayName}
              </div>
              
              {/* Primary Value (Cash Flow / Profit) */}
              <div className={`text-sm font-bold font-mono leading-tight ${isSelected ? 'text-white' : valueColor}`}>
                {metrics.primary}
              </div>
              
              {/* Secondary Value (CoC / Margin) */}
              <div className={`text-[10px] font-semibold ${isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                {metrics.secondary}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ARV Slider - matches HTML design
function ArvSlider({ purchasePrice, arvPct, onChange, compact = false }: {
  purchasePrice: number; arvPct: number; onChange: (value: number) => void; compact?: boolean
}) {
  const computedArv = Math.round(purchasePrice * (1 + arvPct))
  const percentage = Math.round(arvPct * 100)
  const displayPercent = (arvPct * 100).toFixed(0)

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-700 font-medium">After Repair Value</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-navy-900 font-mono">{formatCurrency(computedArv)}</span>
          <span className="text-[0.6875rem] font-semibold text-brand-500">+{displayPercent}%</span>
        </div>
      </div>
      <div className="relative h-[3px] mt-1.5">
        <div className="absolute inset-0 rounded-sm bg-[#e1e8ed]" />
        <div 
          className="absolute top-0 left-0 h-full rounded-sm slider-fill"
          style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-brand-500 cursor-grab slider-thumb"
          style={{ '--slider-position': `${percentage}%` } as React.CSSProperties}
        />
        <input 
          type="range" 
          min={0} 
          max={1} 
          step={0.01} 
          value={arvPct} 
          onChange={(e) => onChange(parseFloat(e.target.value))} 
          aria-label="After Repair Value percentage"
          title="Adjust After Repair Value percentage"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  )
}

// Step indicator component - matches HTML design
function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 text-white text-sm font-bold flex-shrink-0">
          {step}
        </div>
        <h2 className="text-base font-bold text-navy-900 dark:text-white">{title}</h2>
      </div>
    </div>
  )
}

// Action prompt component for guiding users
function ActionPrompt({ icon, text, variant = 'default' }: { 
  icon?: string
  text: string
  variant?: 'default' | 'accent' | 'subtle'
}) {
  const variantClasses = {
    default: 'text-gray-500',
    accent: 'text-brand-500',
    subtle: 'text-gray-400 italic'
  }
  
  return (
    <p className={`text-[0.6875rem] ${variantClasses[variant]} mb-2 flex items-center gap-1`}>
      {icon && <span>{icon}</span>}
      {text}
    </p>
  )
}

// Section header with action prompt for Fine Tune sections
function FineTuneHeader({ title, prompt }: { 
  title: string
  prompt: string
}) {
  return (
    <div className="mb-3">
      <h4 className="text-[0.9375rem] font-bold text-navy-900 dark:text-white">
        {title}
      </h4>
      <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 mt-0.5">{prompt}</p>
    </div>
  )
}

// New "Set Your Terms" panel - always visible, organized in 3 groups
// On mobile, includes MobileStrategyPreview for real-time feedback
function SetYourTermsPanel({ 
  assumptions, 
  update, 
  updateAdjustment, 
  propertyAddress, 
  rehabBudget, 
  propertyDetails,
  // Mobile strategy preview props
  strategies,
  strategyMetrics,
  selectedStrategy,
  onSelectStrategy
}: {
  assumptions: Assumptions
  update: (key: keyof Assumptions, value: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
  propertyAddress: string
  rehabBudget: number
  propertyDetails?: {
    sqft?: number
    yearBuilt?: number
    arv?: number
    zipCode?: string
    bedrooms?: number
    bathrooms?: number
    hasPool?: boolean
    stories?: number
  }
  // Mobile strategy preview props
  strategies: Strategy[]
  strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; primaryValue: number; secondaryValue: number }>
  selectedStrategy: StrategyId
  onSelectStrategy: (id: StrategyId) => void
}) {
  // Build rehab estimator URL with property data for Quick Estimate mode
  const buildRehabUrl = () => {
    const params = new URLSearchParams()
    params.set('address', propertyAddress)
    params.set('budget', rehabBudget.toString())
    
    if (propertyDetails) {
      if (propertyDetails.sqft) params.set('sqft', propertyDetails.sqft.toString())
      if (propertyDetails.yearBuilt) params.set('year_built', propertyDetails.yearBuilt.toString())
      if (propertyDetails.arv) params.set('arv', propertyDetails.arv.toString())
      if (propertyDetails.zipCode) params.set('zip_code', propertyDetails.zipCode)
      if (propertyDetails.bedrooms) params.set('bedrooms', propertyDetails.bedrooms.toString())
      if (propertyDetails.bathrooms) params.set('bathrooms', propertyDetails.bathrooms.toString())
      if (propertyDetails.hasPool) params.set('has_pool', 'true')
      if (propertyDetails.stories) params.set('stories', propertyDetails.stories.toString())
    }
    
    return `/rehab?${params.toString()}`
  }
  return (
    <div className="bg-white dark:bg-navy-800 rounded-[0.875rem] shadow-sm dark:shadow-lg border border-[#0465f2] p-4 transition-colors duration-300">
      <div>
        <StepHeader step={1} title="Define Terms" />

        {/* Responsive grid: 1 col on small, 2 cols on medium, 3 cols on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {/* 1. Purchase Price */}
          <AdjustmentSlider 
            label="Purchase Price" 
            baseValue={assumptions.basePurchasePrice} 
            adjustment={assumptions.purchasePriceAdj} 
            onChange={(v) => updateAdjustment('purchasePriceAdj', v)} 
            compact 
          />
          
          {/* 2. Monthly Rent */}
          <AdjustmentSlider 
            label="Monthly Rent" 
            baseValue={assumptions.baseMonthlyRent} 
            adjustment={assumptions.monthlyRentAdj} 
            onChange={(v) => updateAdjustment('monthlyRentAdj', v)} 
            compact 
          />
          
          {/* 3. Down Payment */}
          <PercentDollarSlider 
            label="Down Payment" 
            value={assumptions.downPaymentPct} 
            baseAmount={assumptions.purchasePrice}
            onChange={(v) => update('downPaymentPct', v)} 
            compact 
          />
          
          {/* 4. Rehab Cost */}
          <PercentDollarSlider 
            label="Rehab Cost" 
            value={assumptions.rehabCostPct} 
            baseAmount={assumptions.basePurchasePrice}
            onChange={(v) => update('rehabCostPct', v)} 
            compact 
            maxPercent={50}
          />
          
          {/* 5. Interest Rate */}
          <PercentSlider 
            label="Interest Rate" 
            value={assumptions.interestRate} 
            onChange={(v) => update('interestRate', v)} 
            compact 
            maxPercent={30}
          />
          
          {/* 6. After Repair Value */}
          <ArvSlider
            purchasePrice={assumptions.purchasePrice}
            arvPct={assumptions.arvPct}
            onChange={(v) => update('arvPct', v)}
            compact
          />
        </div>
        
        {/* Mobile Strategy Preview - Only visible on mobile for real-time feedback */}
        <div className="md:hidden">
          <MobileStrategyPreview
            strategies={strategies}
            strategyMetrics={strategyMetrics}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={onSelectStrategy}
          />
        </div>
        
        {/* Rehab Estimator Link */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-navy-600">
          <a
            href={buildRehabUrl()}
            className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 text-xs font-medium underline underline-offset-2 transition-colors group"
          >
            <Wrench className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Rehab Estimator</span>
            <span className="text-gray-400">—</span>
            <span className="text-gray-500 no-underline">AI-powered renovation budget analysis</span>
            <span className="font-semibold">{formatCurrency(rehabBudget)}</span>
            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
          </a>
        </div>
      </div>
    </div>
  )
}

// Legacy AssumptionsPanel - kept for backwards compatibility but not used
function AssumptionsPanel({ assumptions, update, updateAdjustment, isExpanded, onToggle }: {
  assumptions: Assumptions
  update: (key: keyof Assumptions, value: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
  isExpanded: boolean; onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:bg-navy-700/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
          <div className="text-left">
            <span className="text-sm font-medium text-gray-700">Variables</span>
            <span className="text-xs text-gray-400 ml-3">
              {formatCompact(assumptions.purchasePrice)} · {formatPercent(assumptions.downPaymentPct)} down · {formatPercent(assumptions.interestRate)} rate
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-0">
            <AdjustmentSlider 
              label="Purchase Price" 
              baseValue={assumptions.basePurchasePrice} 
              adjustment={assumptions.purchasePriceAdj} 
              onChange={(v) => updateAdjustment('purchasePriceAdj', v)} 
              compact 
            />
            <AdjustmentSlider 
              label="Monthly Rent" 
              baseValue={assumptions.baseMonthlyRent} 
              adjustment={assumptions.monthlyRentAdj} 
              onChange={(v) => updateAdjustment('monthlyRentAdj', v)} 
              compact 
            />
            <ArvSlider
              purchasePrice={assumptions.purchasePrice}
              arvPct={assumptions.arvPct}
              onChange={(v) => update('arvPct', v)}
              compact
            />
            <PercentDollarSlider 
              label="Down Payment" 
              value={assumptions.downPaymentPct} 
              baseAmount={assumptions.purchasePrice}
              onChange={(v) => update('downPaymentPct', v)} 
              compact 
            />
            <PercentSlider 
              label="Interest Rate" 
              value={assumptions.interestRate} 
              onChange={(v) => update('interestRate', v)} 
              compact 
              maxPercent={30}
            />
            <PercentDollarSlider 
              label="Rehab Cost" 
              value={assumptions.rehabCostPct} 
              baseAmount={assumptions.basePurchasePrice}
              onChange={(v) => update('rehabCostPct', v)} 
              compact 
              maxPercent={50}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function DrillDownTabs({ activeView, onViewChange }: { activeView: DrillDownView; onViewChange: (view: DrillDownView) => void }) {
  const tabs: { id: DrillDownView; label: string; icon: any }[] = [
    { id: 'details', label: 'Metrics', icon: Calculator },
    { id: 'breakdown', label: 'Breakdown', icon: Layers },
    { id: 'charts', label: '10-Year', icon: LineChart },
    { id: 'projections', label: 'Growth', icon: TrendingUp },
    { id: 'score', label: 'Score', icon: Award },
    { id: 'sensitivity', label: 'What-If', icon: Activity },
    { id: 'compare', label: 'Compare', icon: GitCompare },
  ]
  
  return (
    <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-1 border-b-2 border-gray-200 dark:border-navy-600 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 sm:px-5 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap transition-all ${
                isActive 
                  ? 'text-brand-500 dark:text-brand-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400'
              }`}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-brand-500 dark:bg-brand-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Metric row matching HTML design - with tooltip
function MetricRow({ label, value }: { label: string; value: string }) {
  // Check if value is negative (starts with - or contains negative currency like -$)
  const isNegative = value.startsWith('-') || value.startsWith('−') || value.includes('-$') || value.includes('−$')
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-navy-600 last:border-b-0">
      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex items-center">
        {label}
        <MetricTooltip label={label} />
      </span>
      <span className={`text-[0.9375rem] font-bold font-mono ${isNegative ? 'text-crimson-600 dark:text-crimson-400' : 'text-navy-900 dark:text-white'}`}>{value}</span>
    </div>
  )
}

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  // Check if value is negative
  const isNegative = value.startsWith('-') || value.startsWith('−') || value.includes('-$') || value.includes('−$')
  return (
    <div className={`flex items-center justify-between py-1.5 ${highlight ? 'bg-teal-50/50 dark:bg-teal-900/20 -mx-3 px-3 rounded' : ''}`}>
      <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium flex items-center">
        {label}
        <MetricTooltip label={label} />
      </span>
      <span className={`text-xs font-medium ${isNegative ? 'text-crimson-600 dark:text-crimson-400' : highlight ? 'text-brand-500 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>
    </div>
  )
}

function RuleCheck({ label, value, target, passed }: { label: string; value: string; target: string; passed: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md ${passed ? 'bg-teal-50/50' : 'bg-amber-50/50'}`}>
      <div className="flex items-center gap-1.5">
        {passed ? <CheckCircle className="w-3 h-3 text-teal-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
        <span className="text-[11px] font-medium text-gray-600">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-xs font-medium ${passed ? 'text-teal-600' : 'text-amber-600'}`}>{value}</span>
        <span className="text-[10px] text-gray-400">({target})</span>
      </div>
    </div>
  )
}

// ============================================
// STRATEGY DETAIL VIEWS
// ============================================

function LTRDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateLTR>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  // Calculate annual rent for maintenance $ calculation
  const annualRent = assumptions.monthlyRent * 12
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div>
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="What if vacancy hits 10%? Test your cushion." 
          />
          <div className="space-y-3.5">
            <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualRent} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics (results) */}
        <div>
          <h4 className="text-[0.9375rem] font-bold text-navy-900 dark:text-white mb-3.5">Key Metrics</h4>
          <div className="space-y-1.5">
            <MetricRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} />
            <MetricRow label="Annual Cash Flow" value={formatCurrency(calc.annualCashFlow)} />
            <MetricRow label="Cash-on-Cash Return" value={formatPercent(calc.cashOnCash)} />
            <MetricRow label="Cap Rate" value={formatPercent(calc.capRate)} />
            <MetricRow label="Debt Service Coverage Ratio" value={calc.dscr.toFixed(2)} />
            <MetricRow label="Net Operating Income" value={formatCurrency(calc.noi)} />
            <MetricRow label="Cash Required" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function STRDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateSTR>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj' | 'averageDailyRateAdj', value: number) => void
}) {
  const annualSTRRevenue = assumptions.averageDailyRate * 365 * assumptions.occupancyRate
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div className="space-y-3">
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="Adjust occupancy to see seasonal impacts" 
          />
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-3 space-y-0">
            <AdjustmentSlider label="Daily Rate" baseValue={assumptions.baseAverageDailyRate} adjustment={assumptions.averageDailyRateAdj} onChange={(v) => updateAdjustment('averageDailyRateAdj', v)} compact />
            <PercentSlider label="Occupancy Rate" value={assumptions.occupancyRate} onChange={(v) => update('occupancyRate', v)} compact maxPercent={95} />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualSTRRevenue} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualSTRRevenue} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 divide-y divide-gray-100 dark:divide-navy-600">
            <StatRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} highlight={calc.monthlyCashFlow > 500} />
            <StatRow label="Annual Gross Revenue" value={formatCurrency(calc.annualGrossRent)} />
            <StatRow label="Cash-on-Cash Return" value={formatPercent(calc.cashOnCash)} highlight={calc.cashOnCash > 0.12} />
            <StatRow label="Cap Rate" value={formatPercent(calc.capRate)} />
            <StatRow label="Net Operating Income" value={formatCurrency(calc.noi)} />
            <StatRow label="Cash Required" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function BRRRRDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateBRRRR>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  const annualRent = assumptions.monthlyRent * 12
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div className="space-y-3">
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="Dial in rehab costs — where's your profit sweet spot?" 
          />
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 space-y-0">
            <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
            <PercentSlider label="Rehab Cost" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
            <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualRent} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 divide-y divide-gray-100 dark:divide-navy-600">
            <StatRow label="Initial Cash Needed" value={formatCurrency(calc.initialCash)} />
            <StatRow label="Cash Back at Refi" value={formatCurrency(calc.cashBack)} highlight={calc.cashBack > 0} />
            <StatRow label="Cash Left in Deal" value={formatCurrency(calc.cashLeftInDeal)} highlight={calc.cashLeftInDeal < 10000} />
            <StatRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} />
            <StatRow label="Cash-on-Cash" value={calc.cashOnCash === Infinity ? '∞' : formatPercent(calc.cashOnCash)} highlight />
            <StatRow label="Equity Created" value={formatCurrency(calc.equityCreated)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FlipDetails({ calc, assumptions, update }: { calc: ReturnType<typeof calculateFlip>; assumptions: Assumptions; update: (k: keyof Assumptions, v: number) => void }) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div className="space-y-3">
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="What's your true flip margin after costs?" 
          />
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 space-y-0">
            <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
            <PercentSlider label="Rehab Cost" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
            <GradientSlider label="Holding Period" value={assumptions.holdingPeriodMonths} min={3} max={12} step={1} onChange={(v) => update('holdingPeriodMonths', v)} formatType="months" compact />
          </div>
          
          {/* Margin Guidance */}
          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
            <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-2">Flip Margin Guide</div>
            <div className="space-y-1 text-[10px] text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span><strong>$50K+</strong> — Strong deal with buffer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span><strong>$20-50K</strong> — Workable, watch costs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <span><strong>&lt;$20K</strong> — Thin margin, risky</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* RIGHT: Deal Opportunity (Key Metrics) */}
        <div className="space-y-4 pr-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><span>💰</span>Deal Opportunity</h4>
          {/* Flip Margin Hero */}
          <div className={`rounded-lg p-4 ${calc.flipMargin >= 50000 ? 'bg-emerald-50 border border-emerald-200' : calc.flipMargin >= 20000 ? 'bg-amber-50 border border-amber-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Flip Margin</div>
              <div className={`text-2xl font-bold ${calc.flipMargin >= 50000 ? 'text-emerald-600' : calc.flipMargin >= 20000 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatCurrency(calc.flipMargin)}
              </div>
              <div className={`text-sm font-medium mt-1 ${calc.flipMarginPct >= 0.20 ? 'text-emerald-500' : calc.flipMarginPct >= 0.10 ? 'text-amber-500' : 'text-rose-500'}`}>
                {formatPercent(calc.flipMarginPct)} of Purchase
              </div>
            </div>
          </div>
          
          {/* 70% Rule Check */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${calc.passes70Rule ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-2">
              {calc.passes70Rule ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              <span className="text-xs font-medium text-gray-700">70% Rule</span>
            </div>
            <div className="text-right">
              <div className={`text-xs font-medium ${calc.passes70Rule ? 'text-emerald-600' : 'text-amber-600'}`}>
                {calc.passes70Rule ? 'PASS' : 'OVER'}
              </div>
              <div className="text-[10px] text-gray-400">Max: {formatCurrency(calc.maxPurchase70Rule)}</div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-3 divide-y divide-gray-100 dark:divide-navy-600">
            <StatRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
            <StatRow label="Rehab Budget" value={formatCurrency(assumptions.rehabCost)} />
            <StatRow label="After Repair Value" value={formatCurrency(assumptions.arv)} highlight />
          </div>
        </div>
      </div>
    </div>
  )
}

function HouseHackDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateHouseHack>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div className="space-y-3">
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="How many rooms to break even? Find out." 
          />
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 space-y-0">
            <RoomsRentedSlider roomsRented={assumptions.roomsRented} totalBedrooms={assumptions.totalBedrooms} onChange={(v) => update('roomsRented', v)} compact />
            <AdjustmentSlider label="Total Rent (all rooms)" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 divide-y divide-gray-100 dark:divide-navy-600">
            <StatRow label="Effective Housing Cost" value={formatCurrency(calc.effectiveHousingCost)} highlight={calc.effectiveHousingCost < 500} />
            <StatRow label="Monthly Savings" value={formatCurrency(calc.monthlySavings)} highlight={calc.monthlySavings > 500} />
            <StatRow label="Rental Income" value={formatCurrency(calc.monthlyRentalIncome)} />
            <StatRow label="Rent per Room" value={formatCurrency(calc.rentPerRoom)} />
            <StatRow label="Mortgage Payment" value={formatCurrency(calc.monthlyPI)} />
            <StatRow label="Cash Required" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function WholesaleDetails({ calc, assumptions, update, updateAdjustment, propertyData }: { 
  calc: ReturnType<typeof calculateWholesale>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
  propertyData?: PropertyData | null
}) {
  const [showLOIModal, setShowLOIModal] = useState(false)
  
  return (
    <div>
      {/* 70% Rule Hero Section */}
      <div className={`rounded-xl p-4 mb-4 ${calc.isPurchaseBelowMAO ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200' : 'bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">70% Rule Analysis</div>
            <div className={`text-2xl font-bold ${calc.isPurchaseBelowMAO ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(calc.mao)}
            </div>
            <div className="text-xs text-gray-600">Maximum Allowable Offer</div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${calc.isPurchaseBelowMAO ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {calc.isPurchaseBelowMAO ? '✓ DEAL WORKS' : '✗ OVER MAO'}
          </div>
        </div>
        {calc.spreadFromPurchase !== 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <span className="text-xs text-gray-500">Purchase price is </span>
            <span className={`text-xs font-semibold ${calc.spreadFromPurchase > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(Math.abs(calc.spreadFromPurchase))} {calc.spreadFromPurchase > 0 ? 'below' : 'above'} MAO
            </span>
            <span className="text-xs text-gray-400 ml-2">
              ({(calc.purchasePctOfArv * 100).toFixed(0)}% of ARV)
            </span>
          </div>
        )}
        
        {/* Generate LOI Button - Always visible in Wholesale view */}
        {propertyData && (
          <div className={`mt-4 pt-4 border-t ${calc.isPurchaseBelowMAO ? 'border-emerald-200/50' : 'border-rose-200/50'}`}>
            <button
              onClick={() => setShowLOIModal(true)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all group ${
                calc.isPurchaseBelowMAO 
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-cyan-500/25' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-amber-500/25'
              }`}
            >
              <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Generate Letter of Intent</span>
              <Sparkles className="w-3.5 h-3.5 opacity-75" />
            </button>
            <p className={`text-[10px] text-center mt-2 ${calc.isPurchaseBelowMAO ? 'text-emerald-600' : 'text-amber-600'}`}>
              {calc.isPurchaseBelowMAO 
                ? 'Create a professional LOI in seconds — Analysis to Action' 
                : `Make an offer at MAO ($${calc.mao.toLocaleString()}) to make this deal work`
              }
            </p>
          </div>
        )}
      </div>
      
      {/* LOI Modal */}
      {propertyData && (
        <GenerateLOIModal
          isOpen={showLOIModal}
          onClose={() => setShowLOIModal(false)}
          propertyData={{
            address: propertyData.address.street,
            city: propertyData.address.city,
            state: propertyData.address.state,
            zip_code: propertyData.address.zip_code,
            property_type: propertyData.details.property_type || undefined,
            bedrooms: propertyData.details.bedrooms || undefined,
            bathrooms: propertyData.details.bathrooms || undefined,
            square_footage: propertyData.details.square_footage || undefined,
            year_built: propertyData.details.year_built || undefined,
          }}
          wholesaleCalc={{
            mao: calc.mao,
            arv: calc.arv,
            rehabCost: calc.rehabCost,
            spreadFromPurchase: calc.spreadFromPurchase,
            isPurchaseBelowMAO: calc.isPurchaseBelowMAO,
          }}
          purchasePrice={assumptions.purchasePrice}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 px-1 sm:px-2">
        {/* LEFT: Tune The Deal */}
        <div className="space-y-3">
          <FineTuneHeader 
            title="Tune The Deal" 
            prompt="Is this deal below MAO? Adjust to find out." 
          />
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 space-y-0">
            <AdjustmentSlider label="Purchase Price" baseValue={assumptions.basePurchasePrice} adjustment={assumptions.purchasePriceAdj} onChange={(v) => updateAdjustment('purchasePriceAdj', v)} compact />
            <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
            <PercentSlider label="Rehab Estimate" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
            <PercentSlider label="Wholesale Fee %" value={assumptions.wholesaleFeePct} onChange={(v) => update('wholesaleFeePct', v)} compact maxPercent={5} />
          </div>
          
          {/* 70% Rule Formula */}
          <div className="bg-pink-50/50 rounded-lg p-2 sm:p-3 mt-2">
            <div className="text-[10px] uppercase tracking-wider text-pink-600 font-medium mb-2">70% Rule Formula</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>ARV × 70%</span><span className="font-medium">{formatCurrency(calc.arvMultiple)}</span></div>
              <div className="flex justify-between"><span>− Repair Costs</span><span className="font-medium text-crimson-600">−{formatCurrency(calc.rehabCost)}</span></div>
              <div className="flex justify-between"><span>− Wholesale Fee</span><span className="font-medium text-crimson-600">−{formatCurrency(calc.wholesaleFee)}</span></div>
              <div className="flex justify-between pt-1 border-t border-pink-200"><span className="font-semibold">= MAO</span><span className="font-bold text-pink-700">{formatCurrency(calc.mao)}</span></div>
            </div>
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 dark:bg-navy-700/50 rounded-lg p-2 sm:p-3 divide-y divide-gray-100 dark:divide-navy-600">
            <StatRow label="Maximum Allowable Offer" value={formatCurrency(calc.mao)} highlight={calc.isPurchaseBelowMAO} />
            <StatRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
            <StatRow label="Purchase as % of ARV" value={`${(calc.purchasePctOfArv * 100).toFixed(1)}%`} highlight={calc.purchasePctOfArv <= 0.70} />
            <StatRow label="Wholesale Fee" value={formatCurrency(calc.wholesaleFee)} highlight />
            <StatRow label="After Repair Value" value={formatCurrency(calc.arv)} />
            <StatRow label="70% of ARV" value={formatCurrency(calc.arvMultiple)} />
            <StatRow label="Estimated Repairs" value={formatCurrency(calc.rehabCost)} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - LTR (Compact)
// ============================================

function CompactCalcRow({ 
  label, 
  formula, 
  result, 
  type = 'neutral'
}: { 
  label: string
  formula?: string
  result: string
  type?: 'add' | 'subtract' | 'neutral' | 'total'
}) {
  const colors = {
    add: 'text-emerald-600',
    subtract: 'text-rose-500',
    neutral: 'text-gray-600',
    total: 'text-gray-800 font-semibold'
  }
  
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5 min-w-0">
        {type === 'subtract' && <Minus className="w-2.5 h-2.5 text-rose-400 flex-shrink-0" />}
        {type === 'add' && <Plus className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />}
        <span className={`text-[11px] ${colors[type]}`}>{label}</span>
        {formula && <span className="text-[9px] text-gray-400 font-mono truncate">({formula})</span>}
      </div>
      <span className={`text-xs ${colors[type]} whitespace-nowrap ml-2`}>{result}</span>
    </div>
  )
}

function CompactMetric({ 
  name, value, formula, benchmark, passed, explanation 
}: { 
  name: string; value: string; formula: string; benchmark: string; passed: boolean; explanation: string
}) {
  const [showInfo, setShowInfo] = useState(false)
  
  return (
    <div className={`px-2.5 py-2 rounded-md ${passed ? 'bg-emerald-50/70' : 'bg-amber-50/70'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {passed ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
          <span className="text-[11px] font-medium text-gray-700">{name}</span>
          <button onClick={() => setShowInfo(!showInfo)} className="p-0.5 hover:bg-white/50 rounded" title="Learn more">
            <HelpCircle className="w-2.5 h-2.5 text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>{value}</span>
          <span className="text-[9px] text-gray-400">({benchmark})</span>
        </div>
      </div>
      {formula && <div className="text-[9px] text-gray-400 font-mono mt-0.5 ml-4">{formula}</div>}
      {showInfo && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/50 ml-4">
          <p className="text-[10px] text-gray-500 leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  )
}

// New styled helper components for HTML-matching breakdown
function BreakdownRow({
  label,
  value,
  formula,
  isTotal = false,
  isNegative = false,
  indent = false,
  valueColor
}: {
  label: string
  value: string
  formula?: string
  isTotal?: boolean
  isNegative?: boolean
  indent?: boolean
  valueColor?: string
}) {
  const baseClasses = `flex flex-wrap sm:flex-nowrap justify-between items-center gap-1 py-1.5 px-2 ${indent ? 'pl-4 sm:pl-6' : ''} ${!isTotal ? 'border-b border-slate-100' : ''}`
  const totalClasses = isTotal ? 'bg-sky-50 rounded-lg mt-1 font-bold' : ''
  
  // Auto-detect negative values from the string if not explicitly specified
  const detectNegative = isNegative || value.startsWith('-') || value.startsWith('−') || value.includes('-$') || value.includes('−$')
  
  // Determine value color
  const getValueColor = () => {
    if (valueColor) return valueColor
    if (detectNegative) return 'text-crimson-600'
    if (isTotal) return 'text-navy-900'
    return 'text-navy-900'
  }
  
  return (
    <div className={`${baseClasses} ${totalClasses}`}>
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
        <span className={`text-[0.75rem] sm:text-[0.8125rem] ${isTotal ? 'font-semibold text-navy-900' : 'text-gray-600'} truncate`}>{label}</span>
        {formula && <span className="text-[0.625rem] sm:text-[0.6875rem] text-gray-400 whitespace-nowrap">({formula})</span>}
      </div>
      <span className={`text-[0.8125rem] sm:text-[0.875rem] font-semibold font-mono whitespace-nowrap ${getValueColor()}`}>{value}</span>
    </div>
  )
}

function MetricExplanation({
  name,
  formula,
  value,
  status,
  statusText
}: {
  name: string
  formula: string
  value: string
  status: 'success' | 'warning' | 'danger'
  statusText: string
}) {
  const bgColors = {
    success: 'bg-emerald-50 border-l-forest-700',
    warning: 'bg-amber-50 border-l-amber-500',
    danger: 'bg-rose-50 border-l-crimson-600'
  }
  const iconColors = {
    success: 'text-forest-700',
    warning: 'text-amber-500',
    danger: 'text-crimson-600'
  }
  const textColors = {
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    danger: 'text-rose-900'
  }
  const valueColors = {
    success: 'text-forest-700',
    warning: 'text-amber-600',
    danger: 'text-crimson-600'
  }
  
  return (
    <div className={`${bgColors[status]} border-l-4 rounded-lg p-2`}>
      <div className="flex items-center gap-2 mb-1">
        {status === 'success' ? (
          <CheckCircle className={`w-4 h-4 ${iconColors[status]}`} />
        ) : status === 'danger' ? (
          <AlertCircle className={`w-4 h-4 ${iconColors[status]}`} />
        ) : (
          <AlertTriangle className={`w-4 h-4 ${iconColors[status]}`} />
        )}
        <span className={`text-[0.875rem] font-bold ${textColors[status]}`}>{name}</span>
      </div>
      <div className={`text-[0.75rem] font-mono ${textColors[status]} opacity-80 mb-1`}>{formula}</div>
      <div className="flex justify-between items-center">
        <span className={`text-[0.875rem] font-bold font-mono ${valueColors[status]}`}>
          {value} <span className="text-[0.6875rem] font-normal">{statusText}</span>
        </span>
      </div>
    </div>
  )
}

function LTRAnalyticBreakdown({ calc, assumptions, strategyName = 'Long-Term Rental' }: { 
  calc: ReturnType<typeof calculateLTR>
  assumptions: Assumptions
  strategyName?: string 
}) {
  const annualGrossRent = assumptions.monthlyRent * 12
  const vacancyLoss = annualGrossRent * assumptions.vacancyRate
  const effectiveGrossIncome = annualGrossRent - vacancyLoss
  const propertyManagement = annualGrossRent * assumptions.managementPct
  const maintenance = annualGrossRent * assumptions.maintenancePct
  const totalOperatingExpenses = assumptions.propertyTaxes + assumptions.insurance + propertyManagement + maintenance
  const noi = effectiveGrossIncome - totalOperatingExpenses
  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
  const closingCosts = assumptions.purchasePrice * assumptions.closingCostsPct
  const totalCashRequired = downPayment + closingCosts
  const loanAmount = assumptions.purchasePrice - downPayment
  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, assumptions.interestRate, assumptions.loanTermYears)
  const annualDebtService = monthlyMortgage * 12
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = assumptions.purchasePrice > 0 ? noi / assumptions.purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0
  const onePercentRule = assumptions.purchasePrice > 0 ? assumptions.monthlyRent / assumptions.purchasePrice : 0

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* Two Column Layout - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* LEFT: Gross Income Section */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <DollarSign className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Gross Income</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Monthly Rent" value={formatCurrency(assumptions.monthlyRent)} />
              <BreakdownRow label="Annual Gross" value={formatCurrency(annualGrossRent)} formula="× 12" isTotal />
            </div>
          </div>

          {/* RIGHT: Vacancy Section */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Minus className="w-4 h-4 text-crimson-600 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-crimson-600 uppercase tracking-wide">Vacancy</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Vacancy Loss" value={`-${formatCurrency(vacancyLoss)}`} formula={formatPercent(assumptions.vacancyRate)} isNegative />
              <BreakdownRow label="Effective Gross" value={formatCurrency(effectiveGrossIncome)} isTotal valueColor="text-forest-700" />
            </div>
          </div>
        </div>

        {/* Operating Expenses Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <DollarSign className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Operating Expenses</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Property Taxes" value={`-${formatCurrency(assumptions.propertyTaxes)}`} isNegative indent />
            <BreakdownRow label="Insurance" value={`-${formatCurrency(assumptions.insurance)}`} isNegative indent />
            <BreakdownRow label="Management" value={`-${formatCurrency(propertyManagement)}`} formula={formatPercent(assumptions.managementPct)} isNegative indent />
            <BreakdownRow label="Maintenance" value={`-${formatCurrency(maintenance)}`} formula={formatPercent(assumptions.maintenancePct)} isNegative indent />
            <BreakdownRow label="Total OpEx" value={`-${formatCurrency(totalOperatingExpenses)}`} isTotal isNegative />
          </div>
        </div>

        {/* NOI Highlight Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${noi >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Net Operating Income</span>
            <span className={`text-[0.875rem] sm:text-[0.9375rem] font-bold font-mono ${noi >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(noi)}</span>
          </div>
          <p className="text-[0.625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-0.5">Income before mortgage payments</p>
        </div>

        {/* Two Column: Financing & Debt Service - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Financing */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Financing</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
              <BreakdownRow label="Down Payment" value={formatCurrency(downPayment)} formula={formatPercent(assumptions.downPaymentPct)} />
              <BreakdownRow label="Closing Costs" value={formatCurrency(closingCosts)} formula={formatPercent(assumptions.closingCostsPct)} />
              <BreakdownRow label="Cash Required" value={formatCurrency(totalCashRequired)} isTotal valueColor="text-brand-500" />
            </div>
          </div>

          {/* Debt Service */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Calendar className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Debt Service</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Loan Amount" value={formatCurrency(loanAmount)} />
              <BreakdownRow label="Monthly P&I" value={formatCurrency(monthlyMortgage)} formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} />
              <BreakdownRow label="Annual Debt" value={formatCurrency(annualDebtService)} formula="× 12" isTotal />
            </div>
          </div>
        </div>

        {/* Cash Flow Summary */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${annualCashFlow >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center text-[0.75rem] sm:text-[0.8125rem] text-gray-600 dark:text-gray-400 mb-1 gap-1">
            <span>NOI − Debt Service</span>
            <span className="font-mono text-gray-500 dark:text-gray-400 text-[0.6875rem] sm:text-[0.75rem]">{formatCurrency(noi)} − {formatCurrency(annualDebtService)}</span>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-1 gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Annual Cash Flow</span>
            <span className={`text-[0.875rem] sm:text-[0.9375rem] font-bold font-mono ${annualCashFlow >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(annualCashFlow)}</span>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center pt-1 border-t border-gray-200/50 dark:border-navy-600/50 gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Monthly Cash Flow</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${monthlyCashFlow >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(monthlyCashFlow)}</span>
          </div>
        </div>

        {/* Quick Metrics Grid - 2 cols on tiny mobile, 3 cols on larger */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">CoC Return</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${cashOnCash < 0 ? 'text-crimson-600 dark:text-rose-400' : cashOnCash >= 0.08 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>{formatPercent(cashOnCash)}</div>
          </div>
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">Cap Rate</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${capRate < 0 ? 'text-crimson-600 dark:text-rose-400' : capRate >= 0.05 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>{formatPercent(capRate)}</div>
          </div>
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center col-span-2 sm:col-span-1">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">DSCR</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${dscr < 0 ? 'text-crimson-600 dark:text-rose-400' : dscr >= 1.25 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>{dscr.toFixed(2)}</div>
          </div>
        </div>

        {/* Key Metrics Explained */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">Key Metrics Explained</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Cap Rate"
              formula={`${formatCurrency(noi)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
              value={formatPercent(capRate)}
              status={capRate >= 0.05 ? 'success' : 'warning'}
              statusText={capRate >= 0.05 ? '(Good)' : '(Low)'}
            />
            <MetricExplanation
              name="Cash-on-Cash"
              formula={`${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(totalCashRequired)}`}
              value={formatPercent(cashOnCash)}
              status={cashOnCash >= 0.08 ? 'success' : 'warning'}
              statusText={cashOnCash >= 0.08 ? '(Good)' : '(Low)'}
            />
            <MetricExplanation
              name="Debt Service Coverage Ratio"
              formula={`${formatCurrency(noi)} ÷ ${formatCurrency(annualDebtService)}`}
              value={dscr.toFixed(2)}
              status={dscr >= 1.25 ? 'success' : 'warning'}
              statusText={dscr >= 1.25 ? '(≥1.25)' : '(Low)'}
            />
            <MetricExplanation
              name="1% Rule"
              formula={`${formatCurrency(assumptions.monthlyRent)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
              value={formatPercent(onePercentRule)}
              status={onePercentRule >= 0.01 ? 'success' : 'warning'}
              statusText={onePercentRule >= 0.01 ? '(Pass)' : '(Fail)'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - STR (Compact)
// ============================================

function STRAnalyticBreakdown({ calc, assumptions, strategyName = 'Short-Term Rental' }: { 
  calc: ReturnType<typeof calculateSTR>
  assumptions: Assumptions
  strategyName?: string 
}) {
  const annualGrossRevenue = assumptions.averageDailyRate * 365 * assumptions.occupancyRate
  const managementFee = annualGrossRevenue * 0.20
  const platformFees = annualGrossRevenue * 0.03
  const utilities = 3600
  const supplies = 2400
  const maintenance = annualGrossRevenue * assumptions.maintenancePct
  const totalOperatingExpenses = assumptions.propertyTaxes + assumptions.insurance + managementFee + platformFees + utilities + supplies + maintenance
  const noi = annualGrossRevenue - totalOperatingExpenses
  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
  const closingCosts = assumptions.purchasePrice * assumptions.closingCostsPct
  const totalCashRequired = downPayment + closingCosts
  const loanAmount = assumptions.purchasePrice - downPayment
  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, assumptions.interestRate, assumptions.loanTermYears)
  const annualDebtService = monthlyMortgage * 12
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const capRate = assumptions.purchasePrice > 0 ? noi / assumptions.purchasePrice : 0
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* STR Revenue Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <DollarSign className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">STR Revenue</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Daily Rate" value={formatCurrency(assumptions.averageDailyRate)} />
            <BreakdownRow label="Occupancy" value={formatPercent(assumptions.occupancyRate)} />
            <BreakdownRow label="Annual Revenue" value={formatCurrency(annualGrossRevenue)} formula={`$${assumptions.averageDailyRate} × 365 × ${formatPercent(assumptions.occupancyRate)}`} isTotal valueColor="text-forest-700" />
          </div>
        </div>

        {/* Operating Expenses Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <DollarSign className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Operating Expenses</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Property Taxes" value={`-${formatCurrency(assumptions.propertyTaxes)}`} isNegative indent />
            <BreakdownRow label="Insurance" value={`-${formatCurrency(assumptions.insurance)}`} isNegative indent />
            <BreakdownRow label="STR Mgmt" value={`-${formatCurrency(managementFee)}`} formula="20%" isNegative indent />
            <BreakdownRow label="Platform Fees" value={`-${formatCurrency(platformFees)}`} formula="3%" isNegative indent />
            <BreakdownRow label="Utilities" value={`-${formatCurrency(utilities)}`} isNegative indent />
            <BreakdownRow label="Supplies" value={`-${formatCurrency(supplies)}`} isNegative indent />
            <BreakdownRow label="Maintenance" value={`-${formatCurrency(maintenance)}`} formula={formatPercent(assumptions.maintenancePct)} isNegative indent />
            <BreakdownRow label="Total OpEx" value={`-${formatCurrency(totalOperatingExpenses)}`} isTotal isNegative />
          </div>
        </div>

        {/* NOI Highlight Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${noi >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Net Operating Income</span>
            <span className={`text-[0.875rem] sm:text-[0.9375rem] font-bold font-mono ${noi >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(noi)}</span>
          </div>
          <p className="text-[0.625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-0.5">Income before mortgage payments</p>
        </div>

        {/* Two Column: Financing & Debt Service - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Financing */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Financing</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
              <BreakdownRow label="Down Payment" value={formatCurrency(downPayment)} formula={formatPercent(assumptions.downPaymentPct)} />
              <BreakdownRow label="Closing Costs" value={formatCurrency(closingCosts)} formula={formatPercent(assumptions.closingCostsPct)} />
              <BreakdownRow label="Cash Required" value={formatCurrency(totalCashRequired)} isTotal valueColor="text-brand-500" />
            </div>
          </div>

          {/* Debt Service */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Calendar className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Debt Service</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Loan Amount" value={formatCurrency(loanAmount)} />
              <BreakdownRow label="Monthly P&I" value={formatCurrency(monthlyMortgage)} formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} />
              <BreakdownRow label="Annual Debt" value={formatCurrency(annualDebtService)} formula="× 12" isTotal />
            </div>
          </div>
        </div>

        {/* Cash Flow Summary */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${annualCashFlow >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center text-[0.75rem] sm:text-[0.8125rem] text-gray-600 dark:text-gray-400 mb-1 gap-1">
            <span>NOI − Debt Service</span>
            <span className="font-mono text-gray-500 dark:text-gray-400 text-[0.6875rem] sm:text-[0.75rem]">{formatCurrency(noi)} − {formatCurrency(annualDebtService)}</span>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mb-1 gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Annual Cash Flow</span>
            <span className={`text-[0.875rem] sm:text-[0.9375rem] font-bold font-mono ${annualCashFlow >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(annualCashFlow)}</span>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center pt-1 border-t border-gray-200/50 dark:border-navy-600/50 gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Monthly Cash Flow</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${monthlyCashFlow >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(monthlyCashFlow)}</span>
          </div>
        </div>

        {/* Quick Metrics Grid - 2 cols on tiny mobile, 3 cols on larger */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">CoC Return</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${cashOnCash < 0 ? 'text-crimson-600 dark:text-rose-400' : cashOnCash >= 0.12 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>{formatPercent(cashOnCash)}</div>
          </div>
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">Cap Rate</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${capRate < 0 ? 'text-crimson-600 dark:text-rose-400' : capRate >= 0.06 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>{formatPercent(capRate)}</div>
          </div>
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center col-span-2 sm:col-span-1">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">Rev/Night</div>
            <div className="text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono text-brand-500">{formatCurrency(assumptions.averageDailyRate)}</div>
          </div>
        </div>

        {/* STR Key Metrics */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">STR Key Metrics</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Cash-on-Cash"
              formula={`${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(totalCashRequired)}`}
              value={formatPercent(cashOnCash)}
              status={cashOnCash >= 0.12 ? 'success' : 'warning'}
              statusText={cashOnCash >= 0.12 ? '(≥12%)' : '(Low)'}
            />
            <MetricExplanation
              name="Cap Rate"
              formula={`${formatCurrency(noi)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
              value={formatPercent(capRate)}
              status={capRate >= 0.06 ? 'success' : 'warning'}
              statusText={capRate >= 0.06 ? '(Good)' : '(Low)'}
            />
            <MetricExplanation
              name="Revenue per Night"
              formula="Market comparable rates"
              value={formatCurrency(assumptions.averageDailyRate)}
              status={assumptions.averageDailyRate > 100 ? 'success' : 'warning'}
              statusText="(Market rate)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - BRRRR (Compact)
// ============================================

function BRRRRAnalyticBreakdown({ calc, assumptions, strategyName = 'BRRRR' }: { 
  calc: ReturnType<typeof calculateBRRRR>
  assumptions: Assumptions
  strategyName?: string 
}) {
  // BRRRR specific calculations
  const initialPurchaseDown = assumptions.purchasePrice * 0.30
  const purchaseClosingCosts = assumptions.purchasePrice * assumptions.closingCostsPct
  const initialCash = initialPurchaseDown + assumptions.rehabCost + purchaseClosingCosts
  const refinanceLoanAmount = assumptions.arv * 0.75
  const cashBack = refinanceLoanAmount - (assumptions.purchasePrice * 0.70)
  const cashLeftInDeal = Math.max(0, initialCash - cashBack)
  const monthlyMortgage = calculateMonthlyMortgage(refinanceLoanAmount, assumptions.interestRate, assumptions.loanTermYears)
  const annualDebtService = monthlyMortgage * 12
  const annualGrossRent = assumptions.monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - assumptions.vacancyRate)
  const totalOperatingExpenses = assumptions.propertyTaxes + assumptions.insurance + (annualGrossRent * assumptions.managementPct) + (annualGrossRent * assumptions.maintenancePct)
  const noi = effectiveGrossIncome - totalOperatingExpenses
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12
  const cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal : Infinity
  const equityCreated = assumptions.arv - refinanceLoanAmount

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* Two Column Layout for Phases - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Phase 1: Buy & Rehab */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Home className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Buy & Rehab</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
              <BreakdownRow label="Initial Down" value={formatCurrency(initialPurchaseDown)} formula="30%" />
              <BreakdownRow label="Rehab Budget" value={formatCurrency(assumptions.rehabCost)} formula={formatPercent(assumptions.rehabCostPct)} />
              <BreakdownRow label="Closing Costs" value={formatCurrency(purchaseClosingCosts)} formula={formatPercent(assumptions.closingCostsPct)} />
              <BreakdownRow label="Cash Needed" value={formatCurrency(initialCash)} isTotal valueColor="text-brand-500" />
            </div>
          </div>

          {/* Phase 2: Rent */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Rent</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Monthly Rent" value={formatCurrency(assumptions.monthlyRent)} />
              <BreakdownRow label="Annual Gross" value={formatCurrency(annualGrossRent)} formula="× 12" valueColor="text-forest-700" />
              <BreakdownRow label="Vacancy" value={`-${formatCurrency(annualGrossRent * assumptions.vacancyRate)}`} formula={formatPercent(assumptions.vacancyRate)} isNegative />
              <BreakdownRow label="OpEx" value={`-${formatCurrency(totalOperatingExpenses)}`} isNegative />
              <BreakdownRow label="NOI" value={formatCurrency(noi)} isTotal valueColor="text-forest-700" />
            </div>
          </div>
        </div>

        {/* Refinance Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <TrendingUp className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Refinance</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="ARV" value={formatCurrency(assumptions.arv)} />
            <BreakdownRow label="New Loan" value={formatCurrency(refinanceLoanAmount)} formula="75% LTV" />
            <BreakdownRow label="Pay Off Old" value={`-${formatCurrency(assumptions.purchasePrice * 0.70)}`} formula="70%" isNegative />
            <BreakdownRow label="Cash Back" value={formatCurrency(cashBack)} isTotal valueColor={cashBack > 0 ? 'text-forest-700' : 'text-crimson-600'} />
          </div>
        </div>

        {/* Cash Left in Deal - Warning Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${cashLeftInDeal < 10000 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Cash Left in Deal</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${cashLeftInDeal < 10000 ? 'text-forest-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatCurrency(cashLeftInDeal)}</span>
          </div>
          <p className="text-[0.625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-0.5">{cashLeftInDeal < 5000 ? 'Near infinite returns!' : cashLeftInDeal < 20000 ? 'Good - recycled most capital' : 'Capital still tied up'}</p>
        </div>

        {/* Post-Refi Debt Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <Calendar className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Post-Refi Debt</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Refi Loan" value={formatCurrency(refinanceLoanAmount)} />
            <BreakdownRow label="Monthly P&I" value={formatCurrency(monthlyMortgage)} formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} />
            <BreakdownRow label="Annual Debt" value={formatCurrency(annualDebtService)} formula="× 12" isTotal />
          </div>
        </div>

        {/* Cash Flow - Danger/Success Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${monthlyCashFlow >= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-1">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Monthly Cash Flow</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${monthlyCashFlow >= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>{formatCurrency(monthlyCashFlow)}</span>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">CoC Return</div>
            <div className={`text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono ${cashOnCash === Infinity || cashOnCash >= 0.15 ? 'text-brand-500' : 'text-amber-600 dark:text-amber-400'}`}>
              {cashOnCash === Infinity ? '∞' : formatPercent(cashOnCash)}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-navy-700/50 rounded-xl p-2 text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400 mb-1">Equity Created</div>
            <div className="text-[0.8125rem] sm:text-[0.875rem] font-bold font-mono text-brand-500">{formatCurrency(equityCreated)}</div>
          </div>
        </div>

        {/* BRRRR Success Metrics */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">BRRRR Success Metrics</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Cash Left in Deal"
              formula={`${formatCurrency(initialCash)} − ${formatCurrency(cashBack)}`}
              value={formatCurrency(cashLeftInDeal)}
              status={cashLeftInDeal < 10000 ? 'success' : 'warning'}
              statusText={cashLeftInDeal < 10000 ? '(<$10K ideal)' : '(High)'}
            />
            <MetricExplanation
              name="Cash-on-Cash"
              formula={cashLeftInDeal > 0 ? `${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(cashLeftInDeal)}` : 'No cash left = infinite'}
              value={cashOnCash === Infinity ? '∞' : formatPercent(cashOnCash)}
              status={cashOnCash === Infinity || cashOnCash >= 0.20 ? 'success' : 'warning'}
              statusText={cashOnCash === Infinity ? '(Infinite!)' : cashOnCash >= 0.20 ? '(≥20%)' : '(Low)'}
            />
            <MetricExplanation
              name="Equity Created"
              formula={`${formatCurrency(assumptions.arv)} − ${formatCurrency(refinanceLoanAmount)}`}
              value={formatCurrency(equityCreated)}
              status={equityCreated > 50000 ? 'success' : 'warning'}
              statusText={equityCreated > 50000 ? '(>$50K)' : '(Low)'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - FLIP (Compact)
// ============================================

function FlipAnalyticBreakdown({ calc, assumptions, strategyName = 'Fix & Flip' }: { 
  calc: ReturnType<typeof calculateFlip>
  assumptions: Assumptions
  strategyName?: string 
}) {
  // Detailed cost breakdowns
  const purchaseCosts = assumptions.purchasePrice * assumptions.closingCostsPct
  const monthlyInterest = assumptions.purchasePrice * (assumptions.interestRate / 12)
  const monthlyTaxes = assumptions.propertyTaxes / 12
  const monthlyInsurance = assumptions.insurance / 12
  const holdingCosts = (monthlyInterest + monthlyTaxes + monthlyInsurance) * assumptions.holdingPeriodMonths
  const sellingCosts = assumptions.arv * assumptions.sellingCostsPct
  
  // What eats into your margin
  const totalCosts = purchaseCosts + holdingCosts + sellingCosts
  const estimatedNetProfit = calc.flipMargin - totalCosts
  const profitMarginPct = assumptions.arv > 0 ? estimatedNetProfit / assumptions.arv : 0

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* Step 1: The Opportunity - Flip Margin Box */}
        <div className="mb-3">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl p-2.5 sm:p-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Step 1: Flip Margin</span>
            </div>
          </div>
          <div className={`rounded-xl p-2.5 sm:p-3 ${calc.flipMargin >= 50000 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : calc.flipMargin >= 20000 ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
            <div className="grid grid-cols-3 gap-1 sm:gap-3 mb-3">
              <div className="text-center">
                <div className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 uppercase tracking-wide">ARV</div>
                <div className="text-sm sm:text-lg font-bold font-mono text-navy-900 dark:text-white">{formatCurrency(assumptions.arv)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Purchase</div>
                <div className="text-sm sm:text-lg font-bold font-mono text-crimson-600 dark:text-rose-400">-{formatCurrency(assumptions.purchasePrice)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rehab</div>
                <div className="text-sm sm:text-lg font-bold font-mono text-crimson-600 dark:text-rose-400">-{formatCurrency(assumptions.rehabCost)}</div>
              </div>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center p-2 bg-white/50 dark:bg-navy-700/50 rounded-lg gap-1">
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">= Flip Margin</span>
              <span className={`text-base sm:text-xl font-bold font-mono ${calc.flipMargin >= 50000 ? 'text-forest-700 dark:text-emerald-400' : calc.flipMargin >= 20000 ? 'text-amber-600 dark:text-amber-400' : 'text-crimson-600 dark:text-rose-400'}`}>
                {formatCurrency(calc.flipMargin)} <span className="text-[0.625rem] sm:text-sm text-gray-500 dark:text-gray-400">({formatPercent(calc.flipMarginPct)})</span>
              </span>
            </div>
            <p className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-2">Raw profit potential before transaction and holding costs.</p>
          </div>
        </div>

        {/* Step 2: What Eats Into Your Margin - Stack on mobile */}
        <div className="mb-3">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl p-2.5 sm:p-3 mb-2">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Step 2: Costs</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {/* Left: Closing & Holding Costs */}
            <div className="space-y-2">
              <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Closing Costs</span>
                </div>
                <BreakdownRow label="Purchase" value={formatCurrency(purchaseCosts)} formula={formatPercent(assumptions.closingCostsPct)} />
                <BreakdownRow label="Selling" value={formatCurrency(sellingCosts)} formula={formatPercent(assumptions.sellingCostsPct)} />
              </div>
              <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-navy-900 dark:text-white">Holding ({assumptions.holdingPeriodMonths} mo)</span>
                </div>
                <BreakdownRow label="Interest" value={formatCurrency(monthlyInterest * assumptions.holdingPeriodMonths)} formula={formatPercent(assumptions.interestRate)} />
                <BreakdownRow label="Taxes+Ins" value={formatCurrency((monthlyTaxes + monthlyInsurance) * assumptions.holdingPeriodMonths)} />
              </div>
            </div>

            {/* Right: Total Costs Summary */}
            <div className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30 rounded-xl p-2.5 sm:p-3">
              <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-600 dark:text-gray-400 mb-2">Total Costs</div>
              <div className="space-y-1">
                <BreakdownRow label="Closing" value={`-${formatCurrency(purchaseCosts + sellingCosts)}`} isNegative />
                <BreakdownRow label="Holding" value={`-${formatCurrency(holdingCosts)}`} isNegative />
                <BreakdownRow label="Total" value={`-${formatCurrency(totalCosts)}`} isTotal isNegative />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Estimated Net Profit */}
        <div className="mb-3">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl p-2.5 sm:p-3 mb-2">
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Step 3: Net Profit</span>
          </div>
          <div className={`rounded-xl p-2.5 sm:p-3 ${estimatedNetProfit >= 30000 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : estimatedNetProfit >= 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
            <div className="grid grid-cols-3 gap-1 sm:gap-3">
              <div className="text-center">
                <div className="text-[0.625rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400">Margin</div>
                <div className="text-sm sm:text-base font-bold font-mono text-forest-700 dark:text-emerald-400">{formatCurrency(calc.flipMargin)}</div>
              </div>
              <div className="text-center">
                <div className="text-[0.625rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400">Costs</div>
                <div className="text-sm sm:text-base font-bold font-mono text-crimson-600 dark:text-rose-400">-{formatCurrency(totalCosts)}</div>
              </div>
              <div className="text-center border-l border-gray-200 dark:border-navy-600 pl-1 sm:pl-2">
                <div className="text-[0.625rem] sm:text-[0.75rem] text-gray-500 dark:text-gray-400">Net</div>
                <div className={`text-base sm:text-lg font-bold font-mono ${estimatedNetProfit >= 30000 ? 'text-forest-700 dark:text-emerald-400' : estimatedNetProfit >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-crimson-600 dark:text-rose-400'}`}>
                  {formatCurrency(estimatedNetProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference Metrics */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">Reference Metrics</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Flip Margin"
              formula={`${formatCurrency(assumptions.arv)} − ${formatCurrency(assumptions.purchasePrice)} − ${formatCurrency(assumptions.rehabCost)}`}
              value={formatCurrency(calc.flipMargin)}
              status={calc.flipMargin >= 50000 ? 'success' : 'warning'}
              statusText={calc.flipMargin >= 50000 ? '(≥$50K)' : '(Low)'}
            />
            <MetricExplanation
              name="Flip Margin %"
              formula={`${formatCurrency(calc.flipMargin)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
              value={formatPercent(calc.flipMarginPct)}
              status={calc.flipMarginPct >= 0.20 ? 'success' : 'warning'}
              statusText={calc.flipMarginPct >= 0.20 ? '(≥20%)' : '(Low)'}
            />
            <MetricExplanation
              name="70% Rule"
              formula={`Buy ${formatCurrency(assumptions.purchasePrice)} | ${formatCurrency(assumptions.arv)} × 70% = ${formatCurrency(assumptions.arv * 0.70)}`}
              value={calc.passes70Rule ? 'PASS' : 'OVER'}
              status={calc.passes70Rule ? 'success' : 'danger'}
              statusText={calc.passes70Rule ? '(Purchase ≤ 70% ARV - Rehab)' : '(Purchase > 70% ARV - Rehab)'}
            />
            <MetricExplanation
              name="Est. Net Profit"
              formula={`${formatCurrency(calc.flipMargin)} − ${formatCurrency(totalCosts)}`}
              value={formatCurrency(estimatedNetProfit)}
              status={estimatedNetProfit >= 30000 ? 'success' : 'warning'}
              statusText={estimatedNetProfit >= 30000 ? '(≥$30K)' : '(Low)'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - HOUSE HACK (Compact)
// ============================================

function HouseHackAnalyticBreakdown({ calc, assumptions, strategyName = 'House Hack' }: { 
  calc: ReturnType<typeof calculateHouseHack>
  assumptions: Assumptions
  strategyName?: string 
}) {
  const totalBedrooms = assumptions.totalBedrooms || 4
  const roomsRented = assumptions.roomsRented || Math.max(1, totalBedrooms - 1)
  const rentPerRoom = assumptions.monthlyRent / totalBedrooms
  const monthlyRentalIncome = rentPerRoom * roomsRented
  const downPayment = assumptions.purchasePrice * 0.035
  const closingCosts = assumptions.purchasePrice * assumptions.closingCostsPct
  const totalCashRequired = downPayment + closingCosts
  const loanAmount = assumptions.purchasePrice - downPayment
  const monthlyPI = calculateMonthlyMortgage(loanAmount, assumptions.interestRate, assumptions.loanTermYears)
  const monthlyTaxes = assumptions.propertyTaxes / 12
  const monthlyInsurance = assumptions.insurance / 12
  const monthlyVacancy = monthlyRentalIncome * assumptions.vacancyRate
  const monthlyMaintenance = monthlyRentalIncome * assumptions.maintenancePct
  const totalMonthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyVacancy + monthlyMaintenance
  const effectiveHousingCost = totalMonthlyExpenses - monthlyRentalIncome
  const marketRent = rentPerRoom * 1.2
  const monthlySavings = marketRent - effectiveHousingCost

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* Two Column Layout - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Rental Income */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <Home className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide">Rental Income</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Monthly Rent" value={formatCurrency(assumptions.monthlyRent)} />
              <BreakdownRow label="Bedrooms" value={`${totalBedrooms}`} />
              <BreakdownRow label="Per Room" value={formatCurrency(rentPerRoom)} formula={`÷ ${totalBedrooms}`} />
              <BreakdownRow label="Rooms Rented" value={`${roomsRented}/${totalBedrooms}`} />
              <BreakdownRow label="Income" value={formatCurrency(monthlyRentalIncome)} isTotal valueColor="text-brand-500" />
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <DollarSign className="w-4 h-4 text-crimson-600 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-crimson-600 uppercase tracking-wide">Expenses</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Mortgage" value={formatCurrency(monthlyPI)} />
              <BreakdownRow label="Taxes" value={formatCurrency(monthlyTaxes)} />
              <BreakdownRow label="Insurance" value={formatCurrency(monthlyInsurance)} />
              <BreakdownRow label="Vacancy" value={formatCurrency(monthlyVacancy)} formula={formatPercent(assumptions.vacancyRate)} />
              <BreakdownRow label="Maint." value={formatCurrency(monthlyMaintenance)} formula={formatPercent(assumptions.maintenancePct)} />
              <BreakdownRow label="Total" value={formatCurrency(totalMonthlyExpenses)} isTotal isNegative />
            </div>
          </div>
        </div>

        {/* FHA Financing Section */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <Building2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-violet-600 uppercase tracking-wide">FHA (3.5% Down)</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
            <BreakdownRow label="Down Payment" value={formatCurrency(downPayment)} formula="3.5%" />
            <BreakdownRow label="Closing Costs" value={formatCurrency(closingCosts)} formula={formatPercent(assumptions.closingCostsPct)} />
            <BreakdownRow label="Cash to Close" value={formatCurrency(totalCashRequired)} isTotal valueColor="text-brand-500" />
          </div>
        </div>

        {/* Your Housing Cost Calculation */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <Calculator className="w-4 h-4 text-forest-700 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-forest-700 dark:text-emerald-400 uppercase tracking-wide">Your Cost</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="Total Expenses" value={formatCurrency(totalMonthlyExpenses)} />
            <BreakdownRow label="− Rental Income" value={`-${formatCurrency(monthlyRentalIncome)}`} isNegative />
          </div>
        </div>

        {/* Housing Cost Result Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${effectiveHousingCost <= 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'}`}>
          <div className="text-center">
            <div className={`text-base sm:text-xl font-bold font-mono mb-1 ${effectiveHousingCost <= 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {effectiveHousingCost <= 0 ? `FREE + ${formatCurrency(Math.abs(effectiveHousingCost))}` : formatCurrency(effectiveHousingCost)}
            </div>
            <div className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic">
              {effectiveHousingCost <= 0 ? 'You live for free and make money!' : `vs. ${formatCurrency(marketRent)} market rent`}
            </div>
          </div>
        </div>

        {/* Monthly Savings Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${monthlySavings > 0 ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="text-center">
            <div className={`text-base sm:text-xl font-bold font-mono mb-1 ${monthlySavings > 0 ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>
              {formatCurrency(monthlySavings)}
            </div>
            <div className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic">
              vs. renting ({formatCurrency(marketRent)}/mo)
            </div>
          </div>
        </div>

        {/* House Hack Success Metrics */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">Success Metrics</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Effective Housing Cost"
              formula={`${formatCurrency(totalMonthlyExpenses)} − ${formatCurrency(monthlyRentalIncome)}`}
              value={effectiveHousingCost <= 0 ? 'FREE!' : formatCurrency(effectiveHousingCost)}
              status={effectiveHousingCost < 500 ? 'success' : 'warning'}
              statusText={effectiveHousingCost < 500 ? '(<$500/mo ideal)' : '(High)'}
            />
            <MetricExplanation
              name="Monthly Savings"
              formula={`${formatCurrency(marketRent)} − ${formatCurrency(effectiveHousingCost)}`}
              value={formatCurrency(monthlySavings)}
              status={monthlySavings > 500 ? 'success' : 'warning'}
              statusText={monthlySavings > 500 ? '(>$500/mo)' : '(Low)'}
            />
            <MetricExplanation
              name="Cash Required"
              formula="3.5% FHA down + 3.0% closing"
              value={formatCurrency(totalCashRequired)}
              status={totalCashRequired < 30000 ? 'success' : 'warning'}
              statusText="(Low barrier)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - WHOLESALE (Compact)
// ============================================

function WholesaleAnalyticBreakdown({ calc, assumptions, strategyName = 'Wholesale' }: { 
  calc: ReturnType<typeof calculateWholesale>
  assumptions: Assumptions
  strategyName?: string 
}) {
  const wholesaleFee = assumptions.basePurchasePrice * assumptions.wholesaleFeePct
  const arvAt70 = calc.arv * 0.70

  return (
    <div className="mt-4">
      {/* Main Card - matches HTML design */}
      <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
          <Layers className="w-5 h-5 text-[#0465f2]" />
          <h4 className="text-base font-semibold text-navy-900">{strategyName} - Breakdown</h4>
        </div>

        {/* Title Section */}
        <div className="bg-gradient-to-br from-pink-100 to-rose-100 dark:from-rose-900/30 dark:to-pink-900/30 rounded-xl p-2 mb-3 text-center">
          <h3 className="text-[0.8125rem] sm:text-[0.9375rem] font-bold text-rose-600 dark:text-rose-400">📋 70% Rule Breakdown</h3>
        </div>

        {/* Two Column Layout - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Step 1: After Repair Value */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <TrendingUp className="w-4 h-4 text-crimson-600 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-crimson-600 uppercase tracking-wide">ARV</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="After Repair Value" value={formatCurrency(calc.arv)} />
            </div>
            <p className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-2">Value after repairs</p>
          </div>

          {/* Price Comparison */}
          <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
              <DollarSign className="w-4 h-4 text-pink-600 flex-shrink-0" />
              <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-pink-600 uppercase tracking-wide">Compare</span>
            </div>
            <div className="space-y-1">
              <BreakdownRow label="Purchase" value={formatCurrency(assumptions.purchasePrice)} />
              <BreakdownRow label="MAO" value={formatCurrency(calc.mao)} valueColor="text-brand-500" />
              <BreakdownRow 
                label="% of ARV" 
                value={`${(calc.purchasePctOfArv * 100).toFixed(1)}%`} 
                valueColor={calc.purchasePctOfArv <= 0.70 ? 'text-forest-700' : calc.purchasePctOfArv <= 0.80 ? 'text-amber-600' : 'text-crimson-600'}
              />
              <BreakdownRow 
                label="Spread" 
                value={`${calc.spreadFromPurchase > 0 ? '+' : ''}${formatCurrency(calc.spreadFromPurchase)}`} 
                isTotal 
                isNegative={calc.spreadFromPurchase < 0}
                valueColor={calc.spreadFromPurchase > 0 ? 'text-forest-700' : 'text-crimson-600'}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Apply 70% Rule */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <Percent className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-amber-600 uppercase tracking-wide">70% Rule</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="ARV × 70%" value={formatCurrency(arvAt70)} />
          </div>
          <p className="text-[0.5625rem] sm:text-[0.6875rem] text-gray-500 dark:text-gray-400 italic mt-2">30% margin for profit + costs</p>
        </div>

        {/* Step 3: Subtract Costs */}
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b-2 border-gray-200 dark:border-navy-600">
            <Minus className="w-4 h-4 text-crimson-600 flex-shrink-0" />
            <span className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-crimson-600 uppercase tracking-wide">Subtract Costs</span>
          </div>
          <div className="space-y-1">
            <BreakdownRow label="70% of ARV" value={formatCurrency(arvAt70)} />
            <BreakdownRow label="Repairs" value={`-${formatCurrency(calc.rehabCost)}`} isNegative />
            <BreakdownRow label="Fee" value={`-${formatCurrency(wholesaleFee)}`} isNegative />
            <BreakdownRow label="MAO" value={formatCurrency(calc.mao)} isTotal isNegative />
          </div>
        </div>

        {/* MAO Box */}
        <div className={`rounded-xl p-2.5 sm:p-3 mb-3 ${calc.isPurchaseBelowMAO ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30' : 'bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/30'}`}>
          <div className="text-center">
            <div className="text-[0.6875rem] sm:text-[0.75rem] text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wide mb-1">Max Allowable Offer</div>
            <div className={`text-xl sm:text-2xl font-bold font-mono mb-1 ${calc.isPurchaseBelowMAO ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>
              {formatCurrency(calc.mao)}
            </div>
            <div className={`text-[0.5625rem] sm:text-[0.6875rem] font-medium ${calc.isPurchaseBelowMAO ? 'text-forest-700 dark:text-emerald-400' : 'text-crimson-600 dark:text-rose-400'}`}>
              {calc.isPurchaseBelowMAO ? 'Below MAO ✓' : 'Exceeds MAO ✗'}
            </div>
          </div>
        </div>

        {/* Why the 70% Rule? */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-2.5 sm:p-3 mb-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-blue-800 dark:text-blue-300 mb-2">Why 70%?</div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-[0.6875rem] sm:text-[0.75rem] text-blue-900 dark:text-blue-200">30% margin for buyer profit</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-[0.6875rem] sm:text-[0.75rem] text-blue-900 dark:text-blue-200">Holding & closing costs</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-[0.6875rem] sm:text-[0.75rem] text-blue-900 dark:text-blue-200">Safety margin</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-[0.6875rem] sm:text-[0.75rem] text-blue-900 dark:text-blue-200">65-75% varies by market</span>
            </div>
          </div>
        </div>

        {/* 70% Rule Metrics */}
        <div className="border-t-2 border-gray-200 dark:border-navy-600 pt-3">
          <div className="text-[0.75rem] sm:text-[0.8125rem] font-bold text-brand-500 uppercase tracking-wide mb-2">Rule Metrics</div>
          <div className="space-y-2">
            <MetricExplanation
              name="Maximum Allowable Offer"
              formula={`(${formatCurrency(calc.arv)} × 70%) − ${formatCurrency(calc.rehabCost)} − ${formatCurrency(wholesaleFee)}`}
              value={formatCurrency(calc.mao)}
              status={calc.isPurchaseBelowMAO ? 'success' : 'warning'}
              statusText={calc.isPurchaseBelowMAO ? '(✓ Asking Price)' : '(✗ Asking Price)'}
            />
            <MetricExplanation
              name="Wholesale Fee"
              formula={`${formatCurrency(calc.mao)} × ${(assumptions.wholesaleFeePct * 100).toFixed(1)}%`}
              value={formatCurrency(wholesaleFee)}
              status={wholesaleFee >= 5000 && wholesaleFee <= 50000 ? 'success' : 'warning'}
              statusText="($3k-$10k typical)"
            />
            <MetricExplanation
              name="Spread from Purchase"
              formula="MAO − Purchase Price"
              value={formatCurrency(calc.spreadFromPurchase)}
              status={calc.spreadFromPurchase > 0 ? 'success' : 'danger'}
              statusText={calc.spreadFromPurchase > 0 ? '(Positive = Good)' : '(Positive = Good)'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

function PropertyPageContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')
  const { setCurrentPropertyInfo } = usePropertyStore()
  
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('ltr')
  const [drillDownView, setDrillDownView] = useState<DrillDownView>('details')
  
  // Ref for Section 3 to enable auto-scroll when strategy is selected on mobile
  const section3Ref = useRef<HTMLDivElement>(null)
  
  // Handler for selecting strategy - scrolls to Section 3 on mobile for better UX
  const handleSelectStrategy = (id: StrategyId) => {
    setSelectedStrategy(id)
    setDrillDownView('details')
    // Scroll to Section 3 with smooth animation
    // Small delay to allow state update before scroll
    setTimeout(() => {
      section3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }
  
  // Track whether ARV is linked to Rehab (ARV = 2x Rehab by default)
  // Once user manually adjusts ARV, this link is broken
  const isArvLinkedToRehabRef = useRef(true)
  
  const [assumptions, setAssumptions] = useState<Assumptions>({
    // Base values from API (for ±50% adjustment sliders) - Est. Value is center
    basePurchasePrice: 425000, baseMonthlyRent: 2100, baseAverageDailyRate: 250,
    // Adjustment percentages: Purchase Price defaults to -10%, others at 0 (center)
    purchasePriceAdj: -0.10, monthlyRentAdj: 0, averageDailyRateAdj: 0,
    // Computed values: Purchase Price = 90% of base (Est. Value)
    purchasePrice: 382500, monthlyRent: 2100, averageDailyRate: 250,
    // ARV = Purchase Price × (1 + arvPct) - initially 2x Rehab for linked behavior
    arvPct: 0.10, arv: 467500, // 10% = 2x of 5% rehabCostPct
    // Standard values
    downPaymentPct: 0.30, interestRate: 0.056, loanTermYears: 30,
    rehabCostPct: 0.05, rehabCost: 21250, propertyTaxes: 4500, insurance: 1500,
    vacancyRate: 0.03, managementPct: 0.00, maintenancePct: 0.05, closingCostsPct: 0.03,
    occupancyRate: 0.82, holdingPeriodMonths: 6, sellingCostsPct: 0.08,
    // House Hack specific - defaults
    roomsRented: 3, totalBedrooms: 4,
    // Wholesale specific - 0.7% of Est. Market Value
    wholesaleFeePct: 0.007
  })

  useEffect(() => {
    async function loadProperty() {
      // #region agent log
      console.log('[DEBUG-A] loadProperty start:', { addressParam, decodedAddress: addressParam ? decodeURIComponent(addressParam) : null })
      // #endregion
      setLoading(true)
      try {
        if (!addressParam) throw new Error('No address provided')
        const data = await fetchProperty(decodeURIComponent(addressParam))
        setProperty(data)
        
        // Update the header store with current property info
        // Use full_address for URL navigation, street for display
        setCurrentPropertyInfo({
          propertyId: data.property_id,
          zpid: data.zpid || null,  // Zillow Property ID for photos
          address: data.address.full_address || `${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip_code}`,
          city: data.address.city,
          state: data.address.state,
          zipCode: data.address.zip_code,
          bedrooms: data.details.bedrooms,
          bathrooms: data.details.bathrooms,
          squareFootage: data.details.square_footage,
          estimatedValue: data.valuations.zestimate || data.valuations.current_value_avm
        })
        
        // Calculate BASE values from API data
        // These are the center points for the ±50% adjustment sliders
        
        // Base Purchase Price = Est. Value (zestimate or list price)
        // The slider CENTER is Est. Value, and we default to -10% of that
        const zestimate = data.valuations.zestimate
        const fallbackValue = data.valuations.current_value_avm || data.valuations.arv || 425000
        const basePurchasePrice = zestimate || fallbackValue
        
        // ARV percentage = how much above purchase price the ARV should be
        // Default to zestimate_high_pct from Zillow, or 20% if not available
        const zestimateHighPct = data.valuations.zestimate_high_pct
        const arvPct = zestimateHighPct 
          ? zestimateHighPct / 100  // Convert 8 to 0.08
          : 0.20  // Default 20% above purchase price
        
        // Base Monthly Rent = rentZestimate from API
        const baseMonthlyRent = data.rentals.average_rent || data.rentals.monthly_rent_ltr || 2100
        
        // Interest Rate = mortgage_rate_arm5 (from API, as decimal)
        const mortgageRateRaw = data.market.mortgage_rate_arm5 || data.market.mortgage_rate_30yr
        const interestRate = mortgageRateRaw 
          ? (mortgageRateRaw > 1 ? mortgageRateRaw / 100 : mortgageRateRaw) 
          : 0.056
        
        // Base daily rate from API
        const baseAverageDailyRate = data.rentals.average_daily_rate || 250
        
        setAssumptions(prev => ({
          ...prev,
          // Base values (center of sliders) - Est. Value is the center
          basePurchasePrice: Math.round(basePurchasePrice),
          baseMonthlyRent: Math.round(baseMonthlyRent),
          baseAverageDailyRate: Math.round(baseAverageDailyRate),
          // Purchase Price defaults to -10% of Est. Value, others at center
          purchasePriceAdj: -0.10,
          monthlyRentAdj: 0,
          averageDailyRateAdj: 0,
          // Computed values: Purchase Price = base × (1 - 0.10) = 90% of Est. Value
          purchasePrice: Math.round(basePurchasePrice * 0.90),
          monthlyRent: Math.round(baseMonthlyRent),
          averageDailyRate: Math.round(baseAverageDailyRate),
          // ARV: percentage above Est. Market Value (not offer price)
          arvPct,
          arv: Math.round(basePurchasePrice * (1 + arvPct)),
          // Interest rate from API
          interestRate,
          // Rehab cost starts at 5% (default) - based on market value (basePurchasePrice)
          rehabCostPct: 0.05,
          rehabCost: Math.round(basePurchasePrice * 0.05),
          propertyTaxes: data.market.property_taxes_annual || prev.propertyTaxes,
          occupancyRate: data.rentals.occupancy_rate || prev.occupancyRate,
          // Fixed rates per user spec
          downPaymentPct: 0.30,   // 30%
          vacancyRate: 0.03,      // 3%
          managementPct: 0.00,    // 0%
          maintenancePct: 0.05,   // 5%
          // House Hack: bedrooms from property, default to renting all but 1
          totalBedrooms: data.details.bedrooms || 4,
          roomsRented: Math.max(1, (data.details.bedrooms || 4) - 1),
          // Wholesale: 0.7% of Est. Market Value
          wholesaleFeePct: 0.007,
        }))
        
        // Reset the ARV-Rehab link when loading a new property
        isArvLinkedToRehabRef.current = true
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load property'
        // #region agent log
        console.log('[DEBUG-ALL] loadProperty catch:', { errorMsg, errorName: err instanceof Error ? err.name : 'Unknown', addressParam })
        // #endregion
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }
    loadProperty()
  }, [addressParam])

  // Update handler for standard fields
  const update = useCallback((key: keyof Assumptions, value: number) => {
    // If user manually adjusts ARV, break the link to Rehab
    if (key === 'arvPct') {
      isArvLinkedToRehabRef.current = false
    }
    
    setAssumptions(prev => {
      const updated = { ...prev, [key]: value }
      
      // Handle derived calculations
      if (key === 'rehabCostPct') {
        // Rehab cost based on market value (basePurchasePrice), not negotiated purchase price
        // This ensures MAO calculation is independent of purchase price adjustments
        updated.rehabCost = Math.round(prev.basePurchasePrice * value)
        
        // If ARV is still linked to Rehab, update ARV to 2x the rehab percentage
        if (isArvLinkedToRehabRef.current) {
          const linkedArvPct = value * 2
          updated.arvPct = linkedArvPct
          updated.arv = Math.round(prev.basePurchasePrice * (1 + linkedArvPct))
        }
      } else if (key === 'arvPct') {
        // ARV = Est. Market Value × (1 + arvPct) - based on market value, not offer price
        updated.arv = Math.round(prev.basePurchasePrice * (1 + value))
      }
      return updated
    })
  }, [])

  // Update handler for adjustment sliders (±50% for Purchase Price and Monthly Rent)
  const updateAdjustment = useCallback((key: 'purchasePriceAdj' | 'monthlyRentAdj' | 'averageDailyRateAdj', value: number) => {
    setAssumptions(prev => {
      const updated = { ...prev, [key]: value }
      // Recalculate computed values based on base × (1 + adjustment)
      if (key === 'purchasePriceAdj') {
        updated.purchasePrice = Math.round(prev.basePurchasePrice * (1 + value))
        // NOTE: rehabCost is NOT recalculated here - it stays based on basePurchasePrice
        // This ensures MAO (for wholesale) is independent of purchase price adjustments
      } else if (key === 'monthlyRentAdj') {
        updated.monthlyRent = Math.round(prev.baseMonthlyRent * (1 + value))
      } else if (key === 'averageDailyRateAdj') {
        updated.averageDailyRate = Math.round(prev.baseAverageDailyRate * (1 + value))
      }
      return updated
    })
  }, [])

  // Calculate all strategies
  const ltrCalc = useMemo(() => calculateLTR(assumptions), [assumptions])
  const strCalc = useMemo(() => calculateSTR(assumptions), [assumptions])
  const brrrrCalc = useMemo(() => calculateBRRRR(assumptions), [assumptions])
  const flipCalc = useMemo(() => calculateFlip(assumptions), [assumptions])
  const houseHackCalc = useMemo(() => calculateHouseHack(assumptions), [assumptions])
  const wholesaleCalc = useMemo(() => calculateWholesale(assumptions), [assumptions])

  // Strategy metrics for cards - includes primaryValue and secondaryValue for profit/loss color coding
  const strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; score: number; primaryValue: number; secondaryValue: number }> = useMemo(() => ({
    ltr: {
      primary: formatCurrency(ltrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(ltrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash %: >15% Excellent, >12% Great, >8% Good, >5% Fair, <5% Poor
      rating: (ltrCalc.cashOnCash >= 0.15 ? 'excellent' : ltrCalc.cashOnCash >= 0.12 ? 'great' : ltrCalc.cashOnCash >= 0.08 ? 'good' : ltrCalc.cashOnCash >= 0.05 ? 'fair' : 'poor') as Rating,
      score: ltrCalc.cashOnCash * 100,
      primaryValue: ltrCalc.monthlyCashFlow,
      secondaryValue: ltrCalc.cashOnCash
    },
    str: {
      primary: formatCurrency(strCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(strCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash %: >25% Excellent, >20% Great, >15% Good, >10% Fair, <10% Poor (higher for STR)
      rating: (strCalc.cashOnCash >= 0.25 ? 'excellent' : strCalc.cashOnCash >= 0.20 ? 'great' : strCalc.cashOnCash >= 0.15 ? 'good' : strCalc.cashOnCash >= 0.10 ? 'fair' : 'poor') as Rating,
      score: strCalc.cashOnCash * 100,
      primaryValue: strCalc.monthlyCashFlow,
      secondaryValue: strCalc.cashOnCash
    },
    brrrr: {
      primary: formatCurrency(brrrrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: brrrrCalc.cashOnCash === Infinity ? '∞' : formatPercent(brrrrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash % (Infinity = all money back): ∞ Excellent, >50% Great, >25% Good, >10% Fair, <10% Poor
      rating: (brrrrCalc.cashOnCash === Infinity ? 'excellent' : brrrrCalc.cashOnCash >= 0.50 ? 'great' : brrrrCalc.cashOnCash >= 0.25 ? 'good' : brrrrCalc.cashOnCash >= 0.10 ? 'fair' : 'poor') as Rating,
      score: brrrrCalc.cashOnCash === Infinity ? 100 : brrrrCalc.cashOnCash * 100,
      primaryValue: brrrrCalc.monthlyCashFlow,
      secondaryValue: brrrrCalc.cashOnCash === Infinity ? 1 : brrrrCalc.cashOnCash
    },
    flip: {
      primary: formatCurrency(flipCalc.flipMargin),
      primaryLabel: 'Flip Margin',
      secondary: formatPercent(flipCalc.flipMarginPct),
      secondaryLabel: 'Margin %',
      // Rating based on Flip Margin %: >30% Excellent, >20% Great, >15% Good, >10% Fair, <10% Poor
      rating: (flipCalc.flipMarginPct >= 0.30 ? 'excellent' : flipCalc.flipMarginPct >= 0.20 ? 'great' : flipCalc.flipMarginPct >= 0.15 ? 'good' : flipCalc.flipMarginPct >= 0.10 ? 'fair' : 'poor') as Rating,
      score: flipCalc.flipMarginPct * 100,
      primaryValue: flipCalc.flipMargin,
      secondaryValue: flipCalc.flipMarginPct
    },
    house_hack: {
      primary: formatCurrency(houseHackCalc.monthlySavings),
      primaryLabel: 'Monthly Savings',
      secondary: houseHackCalc.effectiveHousingCost <= 0 
        ? formatCurrency(Math.abs(houseHackCalc.effectiveHousingCost))
        : formatCurrency(houseHackCalc.effectiveHousingCost),
      secondaryLabel: houseHackCalc.effectiveHousingCost <= 0 
        ? 'Monthly Profit'
        : 'Net Housing Cost',
      // Rating: Live free = Excellent, otherwise based on savings vs typical market rent ratio
      rating: (houseHackCalc.effectiveHousingCost <= 0 ? 'excellent' : houseHackCalc.effectiveHousingCost <= houseHackCalc.rentPerRoom * 0.25 ? 'great' : houseHackCalc.effectiveHousingCost <= houseHackCalc.rentPerRoom * 0.50 ? 'good' : houseHackCalc.monthlySavings >= 0 ? 'fair' : 'poor') as Rating,
      score: houseHackCalc.monthlySavings > 0 ? 80 : 40,
      primaryValue: houseHackCalc.monthlySavings,
      // For house hack: always show secondary metric in blue - it's informational (cost or profit)
      secondaryValue: houseHackCalc.effectiveHousingCost <= 0 ? Math.abs(houseHackCalc.effectiveHousingCost) : houseHackCalc.effectiveHousingCost
    },
    wholesale: {
      primary: formatCurrency(wholesaleCalc.mao),
      primaryLabel: 'Max Allowable Offer',
      secondary: `${(wholesaleCalc.purchasePctOfArv * 100).toFixed(0)}% of ARV`,
      secondaryLabel: 'Purchase Price',
      // Rating based on Purchase Price as % of ARV (70% Rule): <70% Excellent, 70-75% Great, 75-80% Good, 80-85% Fair, >85% Poor
      rating: (wholesaleCalc.purchasePctOfArv < 0.70 ? 'excellent' : wholesaleCalc.purchasePctOfArv <= 0.75 ? 'great' : wholesaleCalc.purchasePctOfArv <= 0.80 ? 'good' : wholesaleCalc.purchasePctOfArv <= 0.85 ? 'fair' : 'poor') as Rating,
      score: (1 - wholesaleCalc.purchasePctOfArv) * 100,
      primaryValue: wholesaleCalc.mao,
      // For wholesale: always show secondary metric in blue - it's informational (% of ARV)
      secondaryValue: wholesaleCalc.purchasePctOfArv * 100
    },
  }), [ltrCalc, strCalc, brrrrCalc, flipCalc, houseHackCalc, wholesaleCalc])

  // Find best strategy
  const bestStrategy = useMemo(() => {
    const scores = Object.entries(strategyMetrics).map(([id, m]) => ({ id, score: m.score }))
    scores.sort((a, b) => b.score - a.score)
    return scores[0]?.id as StrategyId
  }, [strategyMetrics])

  // Projection assumptions for charts
  const projectionAssumptions: ProjectionAssumptions = useMemo(() => ({
    purchasePrice: assumptions.purchasePrice, downPaymentPct: assumptions.downPaymentPct,
    closingCostsPct: assumptions.closingCostsPct, interestRate: assumptions.interestRate,
    loanTermYears: assumptions.loanTermYears, monthlyRent: assumptions.monthlyRent,
    annualRentGrowth: 0.03, vacancyRate: assumptions.vacancyRate, propertyTaxes: assumptions.propertyTaxes,
    insurance: assumptions.insurance, propertyTaxGrowth: 0.02, insuranceGrowth: 0.03,
    managementPct: assumptions.managementPct, maintenancePct: assumptions.maintenancePct,
    capexReservePct: 0.05, annualAppreciation: 0.03
  }), [assumptions])

  const projections = useMemo(() => calculate10YearProjections(projectionAssumptions), [projectionAssumptions])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Loading property...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300">
        <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Unable to Load Property</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error || 'Property data is null'}</p>
          <div className="flex gap-3 justify-center">
            <a href="/" className="px-4 py-2 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">Back to Search</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <PropertyHeader property={property} />
        
        {/* STEP 1: Set Your Terms - Always at Top */}
        {/* On mobile, includes inline MobileStrategyPreview for real-time feedback */}
        <div className="mb-6">
          <SetYourTermsPanel
            assumptions={assumptions}
            update={update}
            updateAdjustment={updateAdjustment}
            propertyAddress={property.address.full_address}
            rehabBudget={assumptions.rehabCost}
            propertyDetails={{
              sqft: property.details?.square_footage ?? undefined,
              yearBuilt: property.details?.year_built ?? undefined,
              arv: assumptions.arv,
              zipCode: property.address?.zip_code,
              bedrooms: property.details?.bedrooms ?? undefined,
              bathrooms: property.details?.bathrooms ?? undefined,
              hasPool: property.details?.features?.some(f => f.toLowerCase().includes('pool')) ?? false,
              stories: property.details?.stories ?? undefined,
            }}
            // Mobile strategy preview props
            strategies={strategies}
            strategyMetrics={strategyMetrics}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={handleSelectStrategy}
          />
        </div>

        {/* STEP 2: Select Investment Strategy - Hidden on mobile (shown inline in Section 1) */}
        <div className="hidden md:block bg-white dark:bg-navy-800 rounded-[0.875rem] shadow-sm dark:shadow-lg border border-[#0465f2] mb-3.5 transition-colors duration-300">
          <div className="px-4 pt-3 pb-0">
            <StepHeader step={2} title="Compare Strategies" />
          </div>
          
          {/* Strategy Cards Grid - 6 columns matching HTML design */}
          <StrategyGrid
            strategies={strategies}
            strategyMetrics={strategyMetrics}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={handleSelectStrategy}
          />
        </div>

        {/* STEP 3: Strategy Overview - ref for auto-scroll when strategy selected */}
        <div 
          ref={section3Ref}
          className="bg-white dark:bg-navy-800 rounded-[0.875rem] shadow-sm dark:shadow-lg border border-[#0465f2] transition-colors duration-300 scroll-mt-4"
        >
          <div className="p-4 pb-0">
            <StepHeader step={3} title="Strategy Overview" />
          </div>

          {/* Tabs */}
          <div className="px-4">
            <DrillDownTabs activeView={drillDownView} onViewChange={setDrillDownView} />
          </div>

          {/* Content Area - Key Metrics and Adjust Inputs */}
          <div className="p-4">
            {(() => {
              const strategyName = strategies.find(s => s.id === selectedStrategy)?.name || ''
              const tabLabels: Record<DrillDownView, string> = {
                details: 'Metrics',
                breakdown: 'Breakdown',
                charts: '10-Year',
                projections: 'Growth',
                score: 'Score',
                sensitivity: 'What-If',
                compare: 'Compare',
                rehab: 'Rehab'
              }
              const currentTabLabel = tabLabels[drillDownView] || ''
              const bannerTitle = `${strategyName} - ${currentTabLabel}`
              
              return (
                <>
                  {drillDownView === 'details' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <Calculator className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      {selectedStrategy === 'ltr' && <LTRDetails calc={ltrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
                      {selectedStrategy === 'str' && <STRDetails calc={strCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
                      {selectedStrategy === 'brrrr' && <BRRRRDetails calc={brrrrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
                      {selectedStrategy === 'flip' && <FlipDetails calc={flipCalc} assumptions={assumptions} update={update} />}
                      {selectedStrategy === 'house_hack' && <HouseHackDetails calc={houseHackCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
                      {selectedStrategy === 'wholesale' && <WholesaleDetails calc={wholesaleCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} propertyData={property} />}
                    </div>
                  )}
                  
                  {drillDownView === 'breakdown' && selectedStrategy === 'ltr' && <LTRAnalyticBreakdown calc={ltrCalc} assumptions={assumptions} strategyName={strategyName} />}
                  {drillDownView === 'breakdown' && selectedStrategy === 'str' && <STRAnalyticBreakdown calc={strCalc} assumptions={assumptions} strategyName={strategyName} />}
                  {drillDownView === 'breakdown' && selectedStrategy === 'brrrr' && <BRRRRAnalyticBreakdown calc={brrrrCalc} assumptions={assumptions} strategyName={strategyName} />}
                  {drillDownView === 'breakdown' && selectedStrategy === 'flip' && <FlipAnalyticBreakdown calc={flipCalc} assumptions={assumptions} strategyName={strategyName} />}
                  {drillDownView === 'breakdown' && selectedStrategy === 'house_hack' && <HouseHackAnalyticBreakdown calc={houseHackCalc} assumptions={assumptions} strategyName={strategyName} />}
                  {drillDownView === 'breakdown' && selectedStrategy === 'wholesale' && <WholesaleAnalyticBreakdown calc={wholesaleCalc} assumptions={assumptions} strategyName={strategyName} />}
                  
                  {drillDownView === 'charts' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <LineChart className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      <ChartsView projections={projections} totalCashInvested={ltrCalc.totalCashRequired} />
                    </div>
                  )}
                  {drillDownView === 'projections' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <TrendingUp className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      <ProjectionsView assumptions={projectionAssumptions} />
                    </div>
                  )}
                  {drillDownView === 'score' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <Award className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      <DealScoreCard metrics={{ monthlyCashFlow: ltrCalc.monthlyCashFlow, cashOnCash: ltrCalc.cashOnCash, capRate: ltrCalc.capRate, onePercentRule: ltrCalc.onePercentRule, dscr: ltrCalc.dscr, purchasePrice: assumptions.purchasePrice, arv: assumptions.arv, totalCashRequired: ltrCalc.totalCashRequired, monthlyRent: assumptions.monthlyRent }} />
                    </div>
                  )}
                  {drillDownView === 'sensitivity' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <Activity className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      <SensitivityAnalysisView assumptions={{ purchasePrice: assumptions.purchasePrice, downPaymentPct: assumptions.downPaymentPct, interestRate: assumptions.interestRate, loanTermYears: assumptions.loanTermYears, monthlyRent: assumptions.monthlyRent, propertyTaxes: assumptions.propertyTaxes, insurance: assumptions.insurance, vacancyRate: assumptions.vacancyRate, managementPct: assumptions.managementPct, maintenancePct: assumptions.maintenancePct }} />
                    </div>
                  )}
                  {drillDownView === 'compare' && (
                    <div className="bg-white dark:bg-navy-800 border border-[#0465f2] rounded-xl p-3 shadow-[0_4px_12px_rgba(4,101,242,0.1)] transition-colors duration-300">
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-navy-700 dark:to-navy-600 border border-[#0465f2] rounded-xl mb-3 shadow-[0_6px_20px_rgba(4,101,242,0.3)] transition-colors duration-300">
                        <GitCompare className="w-5 h-5 text-[#0465f2]" />
                        <h4 className="text-base font-semibold text-navy-900 dark:text-white">{bannerTitle}</h4>
                      </div>
                      <ScenarioComparison currentAssumptions={projectionAssumptions} propertyAddress={property.address.full_address} />
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Compare Multiple Properties Button - navigates to /compare page */}
        <a 
          href={`/compare?address=${encodeURIComponent(property.address.full_address)}`}
          className="w-full mt-5 py-3.5 px-6 bg-white dark:bg-navy-800 border-2 border-brand-500 rounded-lg text-brand-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-500 hover:text-white transition-all"
        >
          <TrendingUp className="w-4.5 h-4.5" />
          Compare Multiple Properties
        </a>
      </div>
    </div>
  )
}

export default function PropertyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 flex items-center justify-center transition-colors duration-300"><Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" /></div>}>
      <PropertyPageContent />
    </Suspense>
  )
}


