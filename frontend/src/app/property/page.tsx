'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, Suspense, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Building2, Home, Repeat, Hammer, Users, FileText, 
  TrendingUp, TrendingDown, DollarSign, Percent, Calendar, 
  AlertTriangle, CheckCircle, Zap, Target, PiggyBank, 
  RefreshCw, Award, Loader2, Menu,
  BarChart3, LineChart, GitCompare, Activity, Wrench, ChevronRight, ChevronLeft,
  ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown, ChevronUp,
  X, Layers, Calculator, Eye, EyeOff, SlidersHorizontal,
  ArrowDown, Info, Minus, Plus, HelpCircle, ImageIcon
} from 'lucide-react'
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

function LoadingCard() {
  return <div className="animate-pulse bg-gray-100 dark:bg-slate-800 rounded-2xl h-64" />
}

// ============================================
// TYPES
// ============================================

interface PropertyData {
  property_id: string
  zpid?: string | null  // Zillow Property ID for photos API
  address: { street: string; city: string; state: string; zip_code: string; full_address: string }
  details: { property_type: string | null; bedrooms: number | null; bathrooms: number | null; square_footage: number | null }
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
type DrillDownView = 'details' | 'charts' | 'projections' | 'score' | 'sensitivity' | 'rehab' | 'compare'

// ============================================
// API FUNCTIONS
// ============================================

async function fetchProperty(address: string): Promise<PropertyData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  const fetchUrl = `${apiUrl}/api/v1/properties/search`
  // #region agent log
  console.log('[DEBUG fetchProperty]', { address, apiUrl, fetchUrl, timestamp: new Date().toISOString() })
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fetchProperty:ENTRY',message:'fetchProperty called',data:{address,apiUrl,fetchUrl},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  try {
    const response = await fetch(fetchUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    })
    // #region agent log
    console.log('[DEBUG fetchProperty response]', { status: response.status, ok: response.ok })
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fetchProperty:RESPONSE',message:'Response received',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    if (!response.ok) throw new Error('Property not found')
    return response.json()
  } catch (err) {
    // #region agent log
    console.error('[DEBUG fetchProperty ERROR]', err)
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fetchProperty:ERROR',message:'Exception caught',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
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
  { id: 'house_hack', name: 'House Hacking', shortName: 'Hack', description: 'Live in one, rent the rest', icon: Users, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
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
    title: 'House Hacking',
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

// Compact photo strip showing 3 photos side by side
function PhotoStrip({ zpid }: { zpid: string | null | undefined }) {
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

  // Hide photo strip if no zpid
  if (!zpid) {
    return null
  }

  // Show loading placeholders while fetching
  if (isLoading) {
    return (
      <div className="flex gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-[140px] h-[100px] bg-gray-100 rounded-xl flex items-center justify-center">
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

  // Show first 4 photos
  const displayPhotos = photos.slice(0, 4)
  const remainingCount = photos.length - 4

  return (
    <>
      <div className="flex gap-2.5 flex-shrink-0">
        {displayPhotos.map((photo, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="relative w-[140px] h-[100px] rounded-xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all"
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
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                <span className="text-white text-xl font-bold">+{remainingCount}</span>
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

function TopNav({ property }: { property: PropertyData }) {
  // Get estimated market value (Zestimate or AVM)
  const estimatedValue = property.valuations.zestimate || property.valuations.current_value_avm || 0
  
  return (
    <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-lg overflow-hidden transition-colors duration-300">
      {/* Main row - always horizontal on md+, stacked on mobile */}
      <div className="flex flex-col md:flex-row md:items-start">
        {/* Left: Property Info */}
        <div className="flex items-start gap-3 p-3 md:p-4 flex-1 min-w-0">
          <a href="/" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 mt-0.5" aria-label="Back to home" title="Back to home">
            <Menu className="w-5 h-5 text-gray-400 dark:text-gray-500" strokeWidth={1.5} aria-hidden="true" />
          </a>
          <div className="flex-1 min-w-0">
            {/* Full Address - Single Line */}
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {property.address.street}, {property.address.city}, {property.address.state} {property.address.zip_code}
            </h1>
            {/* Stats - Line 2 */}
            <div className="mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {property.details.bedrooms || '—'} bd · {property.details.bathrooms || '—'} ba · {property.details.square_footage?.toLocaleString() || '—'} sqft
              </span>
            </div>
            {/* Estimated Value - Line 3 */}
            {estimatedValue > 0 && (
              <div className="mt-1">
                <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                  Est. {formatCurrency(estimatedValue)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Photo Strip - visible on md+ */}
        <div className="hidden md:flex flex-shrink-0 pr-4 py-3 items-center">
          <PhotoStrip zpid={property.zpid} />
        </div>
      </div>
      
      {/* Mobile only: Photo Strip row */}
      <div className="flex md:hidden justify-center px-3 pb-3 -mt-1">
        <PhotoStrip zpid={property.zpid} />
      </div>
    </div>
  )
}

function GradientSlider({ label, value, min, max, step, onChange, formatType = 'currency', compact = false }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void
  formatType?: 'currency' | 'percent' | 'years' | 'months'; compact?: boolean
}) {
  const percentage = Math.round(((value - min) / (max - min)) * 100)
  const displayValue = formatType === 'currency' ? formatCurrency(value) : formatType === 'percent' ? `${(value * 100).toFixed(1)}%` : formatType === 'years' ? `${value} yrs` : `${value} mo`
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700">{displayValue}</span>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} title={label} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  )
}

// Adjustment slider for ±50% range with center at 0%
function AdjustmentSlider({ label, baseValue, adjustment, onChange, compact = false }: {
  label: string; baseValue: number; adjustment: number; onChange: (adj: number) => void; compact?: boolean
}) {
  // adjustment is -0.5 to +0.5, convert to 0-100 slider position (50 = center)
  const sliderPosition = Math.round((adjustment + 0.5) * 100)
  const computedValue = Math.round(baseValue * (1 + adjustment))
  const adjPercent = adjustment * 100
  const adjSign = adjustment >= 0 ? '+' : ''
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${sliderPosition}%`)
  }, [sliderPosition])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-700">{formatCurrency(computedValue)}</span>
          <span className={`text-[10px] font-medium ${adjustment === 0 ? 'text-gray-400' : 'text-teal-600'}`}>
            {adjSign}{adjPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-1">
        {/* Background gradient - green as value increases */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        {/* Center line indicator - thin */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400 -translate-x-1/2 z-10" />
        <div 
          ref={thumbRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb"
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

// Percentage slider for 0-100% range
function PercentSlider({ label, value, onChange, compact = false, maxPercent = 100 }: {
  label: string; value: number; onChange: (value: number) => void; compact?: boolean; maxPercent?: number
}) {
  const percentage = Math.round((value / (maxPercent / 100)) * 100)
  const displayPercent = (value * 100).toFixed(1)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700">{displayPercent}%</span>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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

// Percentage slider that shows both $ amount and % (for Down Payment, Rehab Cost)
function PercentDollarSlider({ label, value, baseAmount, onChange, compact = false, maxPercent = 100 }: {
  label: string; value: number; baseAmount: number; onChange: (value: number) => void; compact?: boolean; maxPercent?: number
}) {
  const percentage = Math.round((value / (maxPercent / 100)) * 100)
  const displayPercent = (value * 100).toFixed(1)
  const dollarValue = Math.round(baseAmount * value)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-700">{formatCurrency(dollarValue)}</span>
          <span className="text-[10px] text-gray-400">({displayPercent}%)</span>
        </div>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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
function MaintenanceSlider({ value, onChange, annualRent, compact = false }: {
  value: number; onChange: (value: number) => void; annualRent: number; compact?: boolean
}) {
  const percentage = Math.round((value / 0.30) * 100) // maxPercent is 30%
  const displayPercent = (value * 100).toFixed(1)
  const monthlyValue = Math.round((annualRent * value) / 12) // Monthly calculation
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">Maintenance</span>
        <span className="text-xs font-medium text-gray-700">{formatCurrency(monthlyValue)} ({displayPercent}%)</span>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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

// Management slider with dollar value display (like Maintenance)
function ManagementSlider({ value, onChange, annualRent, compact = false }: {
  value: number; onChange: (value: number) => void; annualRent: number; compact?: boolean
}) {
  const percentage = Math.round((value / 0.30) * 100) // maxPercent is 30%
  const displayPercent = (value * 100).toFixed(1)
  const monthlyValue = Math.round((annualRent * value) / 12) // Monthly calculation
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">Management</span>
        <span className="text-xs font-medium text-gray-700">{formatCurrency(monthlyValue)} ({displayPercent}%)</span>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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

// Discrete slider for rooms rented (1 to totalBedrooms)
function RoomsRentedSlider({ roomsRented, totalBedrooms, onChange, compact = false }: {
  roomsRented: number; totalBedrooms: number; onChange: (rooms: number) => void; compact?: boolean
}) {
  const maxRooms = Math.max(1, totalBedrooms - 1) // Can't rent all rooms - owner needs 1
  const percentage = totalBedrooms > 1 ? ((roomsRented - 1) / (maxRooms - 1)) * 100 : 50
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">Rooms Rented</span>
        <span className="text-xs font-medium text-gray-700">{roomsRented} of {totalBedrooms} rooms</span>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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
            className={`w-1.5 h-1.5 rounded-full ${room <= roomsRented ? 'bg-teal-500' : 'bg-gray-200'}`}
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
  strategy: typeof strategies[0]; metrics: { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; primaryValue: number }
  isSelected: boolean; onClick: () => void
}) {
  const [showInfoModal, setShowInfoModal] = useState(false)
  
  // Use actual numeric value for profit/loss coloring
  const isProfit = metrics.primaryValue > 0
  const isLoss = metrics.primaryValue < 0
  
  // Refined color classes - subtle but clear
  const primaryColor = isLoss 
    ? 'text-rose-600' 
    : isProfit 
      ? 'text-teal-600' 
      : 'text-gray-400'
  
  // Get rating display config
  const ratingDisplay = ratingConfig[metrics.rating]
  
  // Accent bar color based on rating
  const accentColor = metrics.rating === 'poor' ? 'bg-rose-500' 
    : metrics.rating === 'fair' ? 'bg-amber-500'
    : metrics.rating === 'good' ? 'bg-teal-500'
    : 'bg-emerald-500'
  
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
            ? 'bg-white ring-1 ring-gray-200' 
            : 'bg-gray-500/15 hover:bg-gray-500/10'
        }`}
      >
        {/* Thin top accent bar */}
        <div className={`h-0.5 w-full ${accentColor}`} />
        
        {/* Info Button - Top Right */}
        <button 
          type="button"
          onClick={handleInfoClick}
          className="absolute top-2 right-1.5 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center cursor-pointer transition-colors z-10 group"
          title={`What is ${strategy.name}?`}
          aria-label={`Learn about ${strategy.name}`}
        >
          <Info className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
        </button>
        
        <div className="px-2.5 py-2 h-full flex flex-col">
          {/* Strategy Name */}
          <h3 className="text-[11px] font-semibold text-gray-900 tracking-tight leading-tight mb-1.5 pr-5">{strategy.name}</h3>
          
          {/* Primary Value - Clear with profit/loss color */}
          <div className={`text-xl font-semibold tracking-tight leading-none ${primaryColor}`}>
            {metrics.primary}
          </div>
          <div className="text-[9px] font-medium text-gray-500 tracking-wide mt-0.5 mb-1.5">{metrics.primaryLabel}</div>
          
          {/* Secondary Metric - Value on top, label below */}
          <div className="pt-1.5 border-t border-gray-100/80">
            <div className={`text-sm font-semibold ${metrics.secondaryLabel.includes('Profit') ? 'text-emerald-600' : 'text-gray-700'}`}>{metrics.secondary}</div>
            <div className={`text-[9px] font-medium mt-px ${metrics.secondaryLabel.includes('Profit') ? 'text-emerald-500' : 'text-gray-500'}`}>{metrics.secondaryLabel}</div>
          </div>
          
          {/* Rating Badge - Bottom right */}
          <div className="mt-auto pt-2 flex justify-end">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ratingDisplay.bgColor} ${ratingDisplay.textColor} ${ratingDisplay.borderColor} border`}>
              {ratingDisplay.label}
            </span>
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

// Strategy Carousel - Responsive horizontal scroll with navigation
function StrategyCarousel({ 
  strategies: strategyList, 
  strategyMetrics, 
  selectedStrategy, 
  onSelectStrategy 
}: {
  strategies: Strategy[]
  strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; primaryValue: number }>
  selectedStrategy: StrategyId
  onSelectStrategy: (id: StrategyId) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 5)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
    }
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      return () => {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [checkScroll])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = 160 // approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Determine if we're at first or last strategy
  const isFirstStrategy = selectedStrategy === 'ltr'
  const isLastStrategy = selectedStrategy === 'wholesale'

  return (
    <div className="relative">
      {/* Left scroll button - hide when first strategy is selected */}
      {canScrollLeft && !isFirstStrategy && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Right scroll button - hide when last strategy is selected */}
      {canScrollRight && !isLastStrategy && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-5 pb-4 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {strategyList.map((strategy) => {
          const isSelected = selectedStrategy === strategy.id
          return (
            <div 
              key={strategy.id} 
              className="relative flex-shrink-0 snap-start w-[156px] h-[140px]"
            >
              <StrategyCard
                strategy={strategy}
                metrics={strategyMetrics[strategy.id]}
                isSelected={isSelected}
                onClick={() => onSelectStrategy(strategy.id)}
              />
              {/* Visual connection bridge - extends from selected card to tabs */}
              {isSelected && (
                <div className="absolute -bottom-4 left-0 right-0 h-4 bg-white" />
              )}
            </div>
          )
        })}
      </div>

      {/* Gradient fade hints for more content */}
      {canScrollLeft && !isFirstStrategy && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
      )}
      {canScrollRight && !isLastStrategy && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      )}
    </div>
  )
}

// ARV Slider - shows computed value based on Purchase Price + percentage
function ArvSlider({ purchasePrice, arvPct, onChange, compact = false }: {
  purchasePrice: number; arvPct: number; onChange: (value: number) => void; compact?: boolean
}) {
  const computedArv = Math.round(purchasePrice * (1 + arvPct))
  const percentage = Math.round(arvPct * 100)
  const displayPercent = (arvPct * 100).toFixed(0)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (fillRef.current) fillRef.current.style.setProperty('--slider-fill', `${100 - percentage}%`)
    if (thumbRef.current) thumbRef.current.style.setProperty('--slider-position', `${percentage}%`)
  }, [percentage])

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">After Repair Value</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-700">{formatCurrency(computedArv)}</span>
          <span className="text-[10px] font-medium text-teal-600">+{displayPercent}%</span>
        </div>
      </div>
      <div className="relative h-1">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div ref={fillRef} className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all duration-150 slider-fill" />
        <div ref={thumbRef} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-500 shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb" />
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

// Step indicator component
function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 text-white text-base font-bold shadow-sm">
        {step}
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

// New "Set Your Terms" panel - always visible, organized in 3 groups
function SetYourTermsPanel({ assumptions, update, updateAdjustment, propertyAddress, rehabBudget }: {
  assumptions: Assumptions
  update: (key: keyof Assumptions, value: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
  propertyAddress: string
  rehabBudget: number
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4">
        <StepHeader step={1} title="Terms" subtitle="Adjust the values to evaluate profitability." />
        
        <div className="grid grid-cols-3 gap-6">
          {/* Group 1: Property Values */}
          <div className="space-y-1">
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
          </div>
          
          {/* Group 2: Financing Terms */}
          <div className="space-y-1">
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
          </div>
          
          {/* Group 3: Value-Add Potential */}
          <div className="space-y-1">
            <div className="relative">
              <PercentDollarSlider 
                label="Rehab Cost" 
                value={assumptions.rehabCostPct} 
                baseAmount={assumptions.basePurchasePrice}
                onChange={(v) => update('rehabCostPct', v)} 
                compact 
                maxPercent={50}
              />
            </div>
            <ArvSlider
              purchasePrice={assumptions.purchasePrice}
              arvPct={assumptions.arvPct}
              onChange={(v) => update('arvPct', v)}
              compact
            />
          </div>
        </div>
        
        {/* Rehab Estimator Link - Compact inline style */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a
            href={`/rehab?address=${encodeURIComponent(propertyAddress)}&budget=${rehabBudget}`}
            className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-teal-600 transition-colors group"
          >
            <Wrench className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="font-medium">Rehab Estimator</span>
            <span className="text-gray-400">—</span>
            <span>Build your renovation budget item by item</span>
            <span className="text-teal-600 font-semibold">{formatCurrency(rehabBudget)}</span>
            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
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
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
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
  const tabs: { id: DrillDownView; label: string; icon: any; highlight?: boolean }[] = [
    { id: 'details', label: 'Details', icon: Calculator },
    { id: 'charts', label: 'Charts', icon: LineChart },
    { id: 'projections', label: '10-Year', icon: TrendingUp },
    { id: 'score', label: 'Score', icon: Award },
    { id: 'sensitivity', label: 'What-If', icon: Activity },
    { id: 'compare', label: 'Compare', icon: GitCompare },
  ]
  
  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeView === tab.id
        const isHighlight = tab.highlight
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
              isActive 
                ? isHighlight 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white text-gray-800 shadow-sm'
                : isHighlight
                  ? 'text-orange-500 hover:bg-orange-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${highlight ? 'bg-teal-50/50 -mx-3 px-3 rounded' : ''}`}>
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-teal-600' : 'text-gray-700'}`}>{value}</span>
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
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="Long-Term Rental Strategy" />
      
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy (Step 3 content) */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualRent} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics (results) */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
            <StatRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} highlight={calc.monthlyCashFlow > 200} />
            <StatRow label="Annual Cash Flow" value={formatCurrency(calc.annualCashFlow)} />
            <StatRow label="Cash-on-Cash Return" value={formatPercent(calc.cashOnCash)} highlight={calc.cashOnCash > 0.08} />
            <StatRow label="Cap Rate" value={formatPercent(calc.capRate)} />
            <StatRow label="DSCR" value={calc.dscr.toFixed(2)} />
            <StatRow label="NOI" value={formatCurrency(calc.noi)} />
            <StatRow label="Cash Required" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
      
      {/* Full Analytic Breakdown Button */}
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown 
              ? 'border-teal-300 bg-teal-50 text-teal-700' 
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-200 hover:bg-teal-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </button>
      </div>
      
      {/* Expandable Breakdown Section */}
      {showBreakdown && (
        <LTRAnalyticBreakdown calc={calc} assumptions={assumptions} />
      )}
    </div>
  )
}

function STRDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateSTR>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj' | 'averageDailyRateAdj', value: number) => void
}) {
  const annualSTRRevenue = assumptions.averageDailyRate * 365 * assumptions.occupancyRate
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="Short-Term Rental Strategy" />
      
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <AdjustmentSlider label="Daily Rate" baseValue={assumptions.baseAverageDailyRate} adjustment={assumptions.averageDailyRateAdj} onChange={(v) => updateAdjustment('averageDailyRateAdj', v)} compact />
            <PercentSlider label="Occupancy Rate" value={assumptions.occupancyRate} onChange={(v) => update('occupancyRate', v)} compact maxPercent={95} />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualSTRRevenue} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualSTRRevenue} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
            <StatRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} highlight={calc.monthlyCashFlow > 500} />
            <StatRow label="Annual Gross Revenue" value={formatCurrency(calc.annualGrossRent)} />
            <StatRow label="Cash-on-Cash Return" value={formatPercent(calc.cashOnCash)} highlight={calc.cashOnCash > 0.12} />
            <StatRow label="Cap Rate" value={formatPercent(calc.capRate)} />
            <StatRow label="NOI" value={formatCurrency(calc.noi)} />
            <StatRow label="Cash Required" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-cyan-200 hover:bg-cyan-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>
      
      {showBreakdown && <STRAnalyticBreakdown calc={calc} assumptions={assumptions} />}
    </div>
  )
}

function BRRRRDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateBRRRR>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  const annualRent = assumptions.monthlyRent * 12
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="BRRRR Strategy" />
      
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
            <PercentSlider label="Rehab Cost" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
            <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
            <ManagementSlider value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} annualRent={annualRent} compact />
            <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
            <StatRow label="Initial Cash Needed" value={formatCurrency(calc.initialCash)} />
            <StatRow label="Cash Back at Refi" value={formatCurrency(calc.cashBack)} highlight={calc.cashBack > 0} />
            <StatRow label="Cash Left in Deal" value={formatCurrency(calc.cashLeftInDeal)} highlight={calc.cashLeftInDeal < 10000} />
            <StatRow label="Monthly Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} />
            <StatRow label="Cash-on-Cash" value={calc.cashOnCash === Infinity ? '∞' : formatPercent(calc.cashOnCash)} highlight />
            <StatRow label="Equity Created" value={formatCurrency(calc.equityCreated)} />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>
      
      {showBreakdown && <BRRRRAnalyticBreakdown calc={calc} assumptions={assumptions} />}
    </div>
  )
}

function FlipDetails({ calc, assumptions, update }: { calc: ReturnType<typeof calculateFlip>; assumptions: Assumptions; update: (k: keyof Assumptions, v: number) => void }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="Fix & Flip Strategy" />
      
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
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
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Deal Opportunity</h4>
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
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
            <StatRow label="Purchase Price" value={formatCurrency(assumptions.purchasePrice)} />
            <StatRow label="Rehab Budget" value={formatCurrency(assumptions.rehabCost)} />
            <StatRow label="After Repair Value" value={formatCurrency(assumptions.arv)} highlight />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-200 hover:bg-orange-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>
      
      {showBreakdown && <FlipAnalyticBreakdown calc={calc} assumptions={assumptions} />}
    </div>
  )
}

function HouseHackDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateHouseHack>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="House Hack Strategy" />
      
      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <RoomsRentedSlider roomsRented={assumptions.roomsRented} totalBedrooms={assumptions.totalBedrooms} onChange={(v) => update('roomsRented', v)} compact />
            <AdjustmentSlider label="Total Rent (all rooms)" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
            <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
            <StatRow label="Effective Housing Cost" value={formatCurrency(calc.effectiveHousingCost)} highlight={calc.effectiveHousingCost < 500} />
            <StatRow label="Monthly Savings" value={formatCurrency(calc.monthlySavings)} highlight={calc.monthlySavings > 500} />
            <StatRow label="Rental Income" value={formatCurrency(calc.monthlyRentalIncome)} />
            <StatRow label="Rent per Room" value={formatCurrency(calc.rentPerRoom)} />
            <StatRow label="Mortgage Payment" value={formatCurrency(calc.monthlyPI)} />
            <StatRow label="Cash Required (3.5%)" value={formatCurrency(calc.totalCashRequired)} />
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-blue-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>
      
      {showBreakdown && <HouseHackAnalyticBreakdown calc={calc} assumptions={assumptions} />}
    </div>
  )
}

function WholesaleDetails({ calc, assumptions, update, updateAdjustment }: { 
  calc: ReturnType<typeof calculateWholesale>; assumptions: Assumptions; 
  update: (k: keyof Assumptions, v: number) => void
  updateAdjustment: (key: 'purchasePriceAdj' | 'monthlyRentAdj', value: number) => void
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  
  return (
    <div>
      {/* Step 3 Header */}
      <StepHeader step={3} title="Wholesale Strategy" />
      
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
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT: Fine Tune Strategy */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Fine Tune Strategy</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <AdjustmentSlider label="Purchase Price" baseValue={assumptions.basePurchasePrice} adjustment={assumptions.purchasePriceAdj} onChange={(v) => updateAdjustment('purchasePriceAdj', v)} compact />
            <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
            <PercentSlider label="Rehab Estimate" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
            <PercentSlider label="Wholesale Fee %" value={assumptions.wholesaleFeePct} onChange={(v) => update('wholesaleFeePct', v)} compact maxPercent={5} />
          </div>
          
          {/* 70% Rule Formula */}
          <div className="bg-pink-50/50 rounded-lg p-3 mt-2">
            <div className="text-[10px] uppercase tracking-wider text-pink-600 font-medium mb-2">70% Rule Formula</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>ARV × 70%</span><span className="font-medium">{formatCurrency(calc.arvMultiple)}</span></div>
              <div className="flex justify-between"><span>− Repair Costs</span><span className="font-medium text-rose-600">−{formatCurrency(calc.rehabCost)}</span></div>
              <div className="flex justify-between"><span>− Wholesale Fee</span><span className="font-medium text-rose-600">−{formatCurrency(calc.wholesaleFee)}</span></div>
              <div className="flex justify-between pt-1 border-t border-pink-200"><span className="font-semibold">= MAO</span><span className="font-bold text-pink-700">{formatCurrency(calc.mao)}</span></div>
            </div>
          </div>
        </div>
        
        {/* RIGHT: Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
          <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
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
      
      <div className="mt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            showBreakdown ? 'border-pink-300 bg-pink-50 text-pink-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-pink-200 hover:bg-pink-50/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span className="font-medium">Full Analytic Breakdown</span>
          {showBreakdown ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>
      
      {showBreakdown && <WholesaleAnalyticBreakdown calc={calc} assumptions={assumptions} />}
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

function LTRAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateLTR>
  assumptions: Assumptions 
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
    <div className="mt-4 pt-4 border-t border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-teal-500" />
        <h4 className="text-sm font-semibold text-gray-700">Full Analytic Breakdown</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: Revenue & Expenses */}
        <div className="space-y-2">
          {/* Gross Income */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Gross Income
            </div>
            <CompactCalcRow label="Monthly Rent" result={formatCurrency(assumptions.monthlyRent)} />
            <CompactCalcRow label="Annual Gross" formula="× 12" result={formatCurrency(annualGrossRent)} type="total" />
          </div>

          {/* Vacancy */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-rose-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Vacancy
            </div>
            <CompactCalcRow label="Vacancy Loss" formula={`${formatPercent(assumptions.vacancyRate)}`} result={`-${formatCurrency(vacancyLoss)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-gray-600">Effective Gross</span>
              <span className="text-xs font-semibold text-emerald-600">{formatCurrency(effectiveGrossIncome)}</span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Operating Expenses
            </div>
            <CompactCalcRow label="Property Taxes" result={`-${formatCurrency(assumptions.propertyTaxes)}`} type="subtract" />
            <CompactCalcRow label="Insurance" result={`-${formatCurrency(assumptions.insurance)}`} type="subtract" />
            <CompactCalcRow label="Management" formula={`${formatPercent(assumptions.managementPct)}`} result={`-${formatCurrency(propertyManagement)}`} type="subtract" />
            <CompactCalcRow label="Maintenance" formula={`${formatPercent(assumptions.maintenancePct)}`} result={`-${formatCurrency(maintenance)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-gray-600">Total OpEx</span>
              <span className="text-xs font-semibold text-rose-500">-{formatCurrency(totalOperatingExpenses)}</span>
            </div>
          </div>

          {/* NOI Result */}
          <div className={`rounded-lg p-2 ${noi >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Net Operating Income</span>
              <span className={`text-sm font-bold ${noi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(noi)}</span>
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5">Income before mortgage payments</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Financing & Cash Flow */}
        <div className="space-y-2">
          {/* Financing */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Financing
            </div>
            <CompactCalcRow label="Purchase Price" result={formatCurrency(assumptions.purchasePrice)} />
            <CompactCalcRow label="Down Payment" formula={formatPercent(assumptions.downPaymentPct)} result={formatCurrency(downPayment)} />
            <CompactCalcRow label="Closing Costs" formula={formatPercent(assumptions.closingCostsPct)} result={formatCurrency(closingCosts)} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-blue-700">Cash Required</span>
              <span className="text-xs font-bold text-blue-600">{formatCurrency(totalCashRequired)}</span>
            </div>
          </div>

          {/* Debt Service */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Debt Service
            </div>
            <CompactCalcRow label="Loan Amount" result={formatCurrency(loanAmount)} />
            <CompactCalcRow label="Monthly P&I" formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} result={formatCurrency(monthlyMortgage)} />
            <CompactCalcRow label="Annual Debt" formula="× 12" result={formatCurrency(annualDebtService)} type="total" />
          </div>

          {/* Cash Flow Result */}
          <div className={`rounded-lg p-2 ${annualCashFlow >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-500">NOI − Debt Service</span>
              <span className="text-[10px] text-gray-400">{formatCurrency(noi)} − {formatCurrency(annualDebtService)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Annual Cash Flow</span>
              <span className={`text-sm font-bold ${annualCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(annualCashFlow)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-200/50">
              <span className="text-[11px] font-semibold text-gray-700">Monthly Cash Flow</span>
              <span className={`text-base font-bold ${monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthlyCashFlow)}</span>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="bg-gray-100/50 rounded-lg p-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] text-gray-500">CoC Return</div>
                <div className={`text-xs font-bold ${cashOnCash >= 0.08 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatPercent(cashOnCash)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Cap Rate</div>
                <div className={`text-xs font-bold ${capRate >= 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatPercent(capRate)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">DSCR</div>
                <div className={`text-xs font-bold ${dscr >= 1.25 ? 'text-emerald-600' : 'text-amber-600'}`}>{dscr.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Key Metrics Explained</div>
        <CompactMetric
          name="Cap Rate"
          value={formatPercent(capRate)}
          formula={`${formatCurrency(noi)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
          benchmark="≥5%"
          passed={capRate >= 0.05}
          explanation="Measures property return without financing. Higher = better returns but often higher risk areas."
        />
        <CompactMetric
          name="Cash-on-Cash"
          value={formatPercent(cashOnCash)}
          formula={`${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(totalCashRequired)}`}
          benchmark="≥8%"
          passed={cashOnCash >= 0.08}
          explanation="Your actual return on cash invested. This is what you earn after using leverage (mortgage)."
        />
        <CompactMetric
          name="DSCR"
          value={dscr.toFixed(2)}
          formula={`${formatCurrency(noi)} ÷ ${formatCurrency(annualDebtService)}`}
          benchmark="≥1.25"
          passed={dscr >= 1.25}
          explanation="How easily income covers mortgage. 1.25 means 25% more income than debt payments. Banks require 1.20-1.25 minimum."
        />
        <CompactMetric
          name="1% Rule"
          value={formatPercent(onePercentRule)}
          formula={`${formatCurrency(assumptions.monthlyRent)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
          benchmark="≥1%"
          passed={onePercentRule >= 0.01}
          explanation="Quick screening: monthly rent ≥ 1% of price usually means positive cash flow. 0.8% may work in expensive markets."
        />
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - STR (Compact)
// ============================================

function STRAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateSTR>
  assumptions: Assumptions 
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
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-cyan-500" />
        <h4 className="text-sm font-semibold text-gray-700">Full Analytic Breakdown</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: Revenue & Expenses */}
        <div className="space-y-2">
          {/* Gross Revenue */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> STR Revenue
            </div>
            <CompactCalcRow label="Daily Rate" result={formatCurrency(assumptions.averageDailyRate)} />
            <CompactCalcRow label="Occupancy" result={formatPercent(assumptions.occupancyRate)} />
            <CompactCalcRow label="Annual Revenue" formula={`$${assumptions.averageDailyRate} × 365 × ${formatPercent(assumptions.occupancyRate)}`} result={formatCurrency(annualGrossRevenue)} type="total" />
          </div>

          {/* Operating Expenses */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Operating Expenses
            </div>
            <CompactCalcRow label="Property Taxes" result={`-${formatCurrency(assumptions.propertyTaxes)}`} type="subtract" />
            <CompactCalcRow label="Insurance" result={`-${formatCurrency(assumptions.insurance)}`} type="subtract" />
            <CompactCalcRow label="STR Management" formula="20%" result={`-${formatCurrency(managementFee)}`} type="subtract" />
            <CompactCalcRow label="Platform Fees" formula="3%" result={`-${formatCurrency(platformFees)}`} type="subtract" />
            <CompactCalcRow label="Utilities" result={`-${formatCurrency(utilities)}`} type="subtract" />
            <CompactCalcRow label="Supplies/Turnover" result={`-${formatCurrency(supplies)}`} type="subtract" />
            <CompactCalcRow label="Maintenance" formula={formatPercent(assumptions.maintenancePct)} result={`-${formatCurrency(maintenance)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-gray-600">Total OpEx</span>
              <span className="text-xs font-semibold text-rose-500">-{formatCurrency(totalOperatingExpenses)}</span>
            </div>
          </div>

          {/* NOI Result */}
          <div className={`rounded-lg p-2 ${noi >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Net Operating Income</span>
              <span className={`text-sm font-bold ${noi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(noi)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Financing & Cash Flow */}
        <div className="space-y-2">
          {/* Financing */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Financing
            </div>
            <CompactCalcRow label="Purchase Price" result={formatCurrency(assumptions.purchasePrice)} />
            <CompactCalcRow label="Down Payment" formula={formatPercent(assumptions.downPaymentPct)} result={formatCurrency(downPayment)} />
            <CompactCalcRow label="Closing Costs" formula={formatPercent(assumptions.closingCostsPct)} result={formatCurrency(closingCosts)} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-blue-700">Cash Required</span>
              <span className="text-xs font-bold text-blue-600">{formatCurrency(totalCashRequired)}</span>
            </div>
          </div>

          {/* Debt Service */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Debt Service
            </div>
            <CompactCalcRow label="Loan Amount" result={formatCurrency(loanAmount)} />
            <CompactCalcRow label="Monthly P&I" formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} result={formatCurrency(monthlyMortgage)} />
            <CompactCalcRow label="Annual Debt" formula="× 12" result={formatCurrency(annualDebtService)} type="total" />
          </div>

          {/* Cash Flow Result */}
          <div className={`rounded-lg p-2 ${annualCashFlow >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-500">NOI − Debt Service</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Annual Cash Flow</span>
              <span className={`text-sm font-bold ${annualCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(annualCashFlow)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-200/50">
              <span className="text-[11px] font-semibold text-gray-700">Monthly Cash Flow</span>
              <span className={`text-base font-bold ${monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthlyCashFlow)}</span>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="bg-gray-100/50 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-[9px] text-gray-500">CoC Return</div>
                <div className={`text-xs font-bold ${cashOnCash >= 0.12 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatPercent(cashOnCash)}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Cap Rate</div>
                <div className={`text-xs font-bold ${capRate >= 0.06 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatPercent(capRate)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">STR Key Metrics</div>
        <CompactMetric
          name="Cash-on-Cash"
          value={formatPercent(cashOnCash)}
          formula={`${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(totalCashRequired)}`}
          benchmark="≥12%"
          passed={cashOnCash >= 0.12}
          explanation="STR should target higher returns (12%+) due to increased management complexity and market volatility."
        />
        <CompactMetric
          name="Cap Rate"
          value={formatPercent(capRate)}
          formula={`${formatCurrency(noi)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
          benchmark="≥6%"
          passed={capRate >= 0.06}
          explanation="STR cap rates should exceed LTR rates to compensate for higher operational demands."
        />
        <CompactMetric
          name="Revenue per Night"
          value={formatCurrency(assumptions.averageDailyRate)}
          formula={`Market comparable rates`}
          benchmark="Market rate"
          passed={assumptions.averageDailyRate > 100}
          explanation="Compare to similar listings on Airbnb/VRBO. Factor in seasonality and local events."
        />
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - BRRRR (Compact)
// ============================================

function BRRRRAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateBRRRR>
  assumptions: Assumptions 
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
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-emerald-500" />
        <h4 className="text-sm font-semibold text-gray-700">Full Analytic Breakdown</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: Acquisition & Rehab */}
        <div className="space-y-2">
          {/* Initial Acquisition */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Phase 1: Buy & Rehab
            </div>
            <CompactCalcRow label="Purchase Price" result={formatCurrency(assumptions.purchasePrice)} />
            <CompactCalcRow label="Initial Down" formula="30%" result={formatCurrency(initialPurchaseDown)} />
            <CompactCalcRow label="Rehab Budget" formula={formatPercent(assumptions.rehabCostPct)} result={formatCurrency(assumptions.rehabCost)} />
            <CompactCalcRow label="Closing Costs" formula={formatPercent(assumptions.closingCostsPct)} result={formatCurrency(purchaseClosingCosts)} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-emerald-700">Initial Cash Needed</span>
              <span className="text-xs font-bold text-emerald-600">{formatCurrency(initialCash)}</span>
            </div>
          </div>

          {/* After Repair Value */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Phase 2: Refinance
            </div>
            <CompactCalcRow label="After Repair Value" result={formatCurrency(assumptions.arv)} />
            <CompactCalcRow label="New Loan" formula="75% LTV" result={formatCurrency(refinanceLoanAmount)} />
            <CompactCalcRow label="Pay Off Old Loan" formula="70% of purchase" result={`-${formatCurrency(assumptions.purchasePrice * 0.70)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-teal-700">Cash Back at Refi</span>
              <span className={`text-xs font-bold ${cashBack > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(cashBack)}</span>
            </div>
          </div>

          {/* Cash Left in Deal */}
          <div className={`rounded-lg p-2 ${cashLeftInDeal < 10000 ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Cash Left in Deal</span>
              <span className={`text-sm font-bold ${cashLeftInDeal < 10000 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatCurrency(cashLeftInDeal)}</span>
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5">{cashLeftInDeal < 5000 ? '🎯 Near infinite returns!' : cashLeftInDeal < 20000 ? 'Good - recycled most capital' : 'Capital still tied up'}</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Rental & Returns */}
        <div className="space-y-2">
          {/* Rental Income */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Home className="w-3 h-3" /> Phase 3: Rent
            </div>
            <CompactCalcRow label="Monthly Rent" result={formatCurrency(assumptions.monthlyRent)} />
            <CompactCalcRow label="Annual Gross" formula="× 12" result={formatCurrency(annualGrossRent)} />
            <CompactCalcRow label="Vacancy" formula={formatPercent(assumptions.vacancyRate)} result={`-${formatCurrency(annualGrossRent * assumptions.vacancyRate)}`} type="subtract" />
            <CompactCalcRow label="OpEx" result={`-${formatCurrency(totalOperatingExpenses)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-blue-700">NOI</span>
              <span className="text-xs font-bold text-blue-600">{formatCurrency(noi)}</span>
            </div>
          </div>

          {/* Debt Service */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Post-Refi Debt
            </div>
            <CompactCalcRow label="Refinance Loan" result={formatCurrency(refinanceLoanAmount)} />
            <CompactCalcRow label="Monthly P&I" formula={`${formatPercent(assumptions.interestRate)}, ${assumptions.loanTermYears}yr`} result={formatCurrency(monthlyMortgage)} />
            <CompactCalcRow label="Annual Debt" formula="× 12" result={formatCurrency(annualDebtService)} type="total" />
          </div>

          {/* Cash Flow Result */}
          <div className={`rounded-lg p-2 ${annualCashFlow >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Monthly Cash Flow</span>
              <span className={`text-base font-bold ${monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthlyCashFlow)}</span>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="bg-gray-100/50 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-[9px] text-gray-500">CoC Return</div>
                <div className={`text-xs font-bold ${cashOnCash === Infinity ? 'text-emerald-600' : cashOnCash >= 0.15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {cashOnCash === Infinity ? '∞' : formatPercent(cashOnCash)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Equity Created</div>
                <div className="text-xs font-bold text-emerald-600">{formatCurrency(equityCreated)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">BRRRR Success Metrics</div>
        <CompactMetric
          name="Cash Left in Deal"
          value={formatCurrency(cashLeftInDeal)}
          formula={`${formatCurrency(initialCash)} − ${formatCurrency(cashBack)}`}
          benchmark="<$10K ideal"
          passed={cashLeftInDeal < 10000}
          explanation="The BRRRR goal is to pull out all (or most) of your initial capital. Less cash left = more capital to repeat."
        />
        <CompactMetric
          name="Cash-on-Cash"
          value={cashOnCash === Infinity ? '∞' : formatPercent(cashOnCash)}
          formula={cashLeftInDeal > 0 ? `${formatCurrency(annualCashFlow)} ÷ ${formatCurrency(cashLeftInDeal)}` : 'No cash left = infinite'}
          benchmark="≥20% or ∞"
          passed={cashOnCash === Infinity || cashOnCash >= 0.20}
          explanation="BRRRR should produce exceptional returns since you've recycled most capital. Infinite CoC means you've pulled out 100%+."
        />
        <CompactMetric
          name="Equity Created"
          value={formatCurrency(equityCreated)}
          formula={`${formatCurrency(assumptions.arv)} − ${formatCurrency(refinanceLoanAmount)}`}
          benchmark=">$50K"
          passed={equityCreated > 50000}
          explanation="Forced appreciation through rehab creates instant equity. This is your safety margin and wealth builder."
        />
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - FLIP (Compact)
// ============================================

function FlipAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateFlip>
  assumptions: Assumptions 
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
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-orange-500" />
        <h4 className="text-sm font-semibold text-gray-700">Full Analytic Breakdown</h4>
      </div>

      {/* STEP 1: Flip Margin (The Opportunity) */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-2">Step 1: The Opportunity (Flip Margin)</div>
        <div className={`rounded-lg p-3 ${calc.flipMargin >= 50000 ? 'bg-emerald-50 border border-emerald-200' : calc.flipMargin >= 20000 ? 'bg-amber-50 border border-amber-200' : 'bg-rose-50 border border-rose-200'}`}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <div className="text-[9px] text-gray-500">ARV</div>
              <div className="text-sm font-bold text-gray-700">{formatCurrency(assumptions.arv)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Purchase</div>
              <div className="text-sm font-bold text-gray-700">−{formatCurrency(assumptions.purchasePrice)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Rehab</div>
              <div className="text-sm font-bold text-gray-700">−{formatCurrency(assumptions.rehabCost)}</div>
            </div>
          </div>
          <div className="border-t border-gray-200/50 pt-2 flex justify-between items-center">
            <span className="text-[11px] font-semibold text-gray-600">= Flip Margin</span>
            <div className="text-right">
              <span className={`text-xl font-bold ${calc.flipMargin >= 50000 ? 'text-emerald-600' : calc.flipMargin >= 20000 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatCurrency(calc.flipMargin)}
              </span>
              <span className="text-xs text-gray-500 ml-2">({formatPercent(calc.flipMarginPct)})</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-1 italic">
          This is your "spread" — the raw profit potential before accounting for transaction and holding costs.
        </div>
      </div>

      {/* STEP 2: What Eats Into Your Margin */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-2">Step 2: What Eats Into Your Margin</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Left: Cost Breakdown */}
          <div className="space-y-2">
            {/* Closing Costs */}
            <div className="bg-gray-50/50 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-medium text-gray-600">Closing Costs</span>
              </div>
              <CompactCalcRow label="Purchase Closing" formula={formatPercent(assumptions.closingCostsPct)} result={formatCurrency(purchaseCosts)} />
              <CompactCalcRow label="Selling Costs" formula={formatPercent(assumptions.sellingCostsPct)} result={formatCurrency(sellingCosts)} />
            </div>

            {/* Holding Costs */}
            <div className="bg-gray-50/50 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-gray-500" />
                <span className="text-[10px] font-medium text-gray-600">Holding ({assumptions.holdingPeriodMonths} mo)</span>
              </div>
              <CompactCalcRow label="Interest" formula={formatPercent(assumptions.interestRate)} result={formatCurrency(monthlyInterest * assumptions.holdingPeriodMonths)} />
              <CompactCalcRow label="Taxes + Ins" result={formatCurrency((monthlyTaxes + monthlyInsurance) * assumptions.holdingPeriodMonths)} />
            </div>
          </div>

          {/* Right: Cost Summary */}
          <div className="space-y-2">
            <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
              <div className="text-[10px] text-gray-500 mb-2">Total Costs Eating Margin</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Closing (buy+sell)</span>
                  <span className="font-medium text-rose-600">−{formatCurrency(purchaseCosts + sellingCosts)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Holding Costs</span>
                  <span className="font-medium text-rose-600">−{formatCurrency(holdingCosts)}</span>
                </div>
                <div className="border-t border-rose-200 pt-1 mt-1 flex justify-between">
                  <span className="text-[10px] font-medium text-gray-700">Total Costs</span>
                  <span className="text-sm font-bold text-rose-600">−{formatCurrency(totalCosts)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3: Estimated Net Profit */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Step 3: Estimated Net Profit</div>
        <div className={`rounded-lg p-3 ${estimatedNetProfit >= 30000 ? 'bg-emerald-50 border border-emerald-200' : estimatedNetProfit >= 0 ? 'bg-amber-50 border border-amber-200' : 'bg-rose-50 border border-rose-200'}`}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Flip Margin</div>
              <div className="text-sm font-bold text-gray-700">{formatCurrency(calc.flipMargin)}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-gray-500">Total Costs</div>
              <div className="text-sm font-bold text-rose-600">−{formatCurrency(totalCosts)}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-[9px] text-gray-500">Net Profit</div>
              <div className={`text-lg font-bold ${estimatedNetProfit >= 30000 ? 'text-emerald-600' : estimatedNetProfit >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatCurrency(estimatedNetProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Quick Reference Metrics</div>
        <CompactMetric
          name="Flip Margin"
          value={formatCurrency(calc.flipMargin)}
          formula={`${formatCurrency(assumptions.arv)} − ${formatCurrency(assumptions.purchasePrice)} − ${formatCurrency(assumptions.rehabCost)}`}
          benchmark="≥$50K"
          passed={calc.flipMargin >= 50000}
          explanation="The raw spread between ARV and your acquisition costs. This is your starting profit potential before expenses."
        />
        <CompactMetric
          name="Flip Margin %"
          value={formatPercent(calc.flipMarginPct)}
          formula={`${formatCurrency(calc.flipMargin)} ÷ ${formatCurrency(assumptions.purchasePrice)}`}
          benchmark="≥20%"
          passed={calc.flipMarginPct >= 0.20}
          explanation="Margin as a percentage of purchase price. Higher percentage = more buffer for unexpected costs."
        />
        <CompactMetric
          name="70% Rule"
          value={calc.passes70Rule ? 'PASS' : 'OVER'}
          formula={`Max Purchase: ${formatCurrency(calc.maxPurchase70Rule)}`}
          benchmark="Purchase ≤ 70% ARV − Rehab"
          passed={calc.passes70Rule}
          explanation="Industry standard: Purchase should be ≤ 70% of ARV minus rehab. This ensures room for costs and profit."
        />
        <CompactMetric
          name="Est. Net Profit"
          value={formatCurrency(estimatedNetProfit)}
          formula={`${formatCurrency(calc.flipMargin)} − ${formatCurrency(totalCosts)}`}
          benchmark="≥$30K"
          passed={estimatedNetProfit >= 30000}
          explanation="Your estimated take-home after all costs. Aim for $30K+ per flip to justify the time and risk."
        />
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - HOUSE HACK (Compact)
// ============================================

function HouseHackAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateHouseHack>
  assumptions: Assumptions 
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
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-blue-500" />
        <h4 className="text-sm font-semibold text-gray-700">Full Analytic Breakdown</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: Income */}
        <div className="space-y-2">
          {/* Rental Income */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Rental Income
            </div>
            <CompactCalcRow label="Total Monthly Rent" result={formatCurrency(assumptions.monthlyRent)} />
            <CompactCalcRow label="Bedrooms" result={`${totalBedrooms} total`} />
            <CompactCalcRow label="Rent per Room" formula={`÷ ${totalBedrooms}`} result={formatCurrency(rentPerRoom)} />
            <CompactCalcRow label="Rooms Rented" result={`${roomsRented} of ${totalBedrooms}`} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-blue-700">Monthly Income</span>
              <span className="text-xs font-bold text-emerald-600">{formatCurrency(monthlyRentalIncome)}</span>
            </div>
          </div>

          {/* FHA Financing */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> FHA Financing (3.5% Down)
            </div>
            <CompactCalcRow label="Purchase Price" result={formatCurrency(assumptions.purchasePrice)} />
            <CompactCalcRow label="Down Payment" formula="3.5%" result={formatCurrency(downPayment)} />
            <CompactCalcRow label="Closing Costs" formula={formatPercent(assumptions.closingCostsPct)} result={formatCurrency(closingCosts)} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-indigo-700">Cash to Close</span>
              <span className="text-xs font-bold text-indigo-600">{formatCurrency(totalCashRequired)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Expenses & Result */}
        <div className="space-y-2">
          {/* Monthly Expenses */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Monthly Expenses
            </div>
            <CompactCalcRow label="Mortgage (P&I)" result={formatCurrency(monthlyPI)} />
            <CompactCalcRow label="Property Taxes" result={formatCurrency(monthlyTaxes)} />
            <CompactCalcRow label="Insurance" result={formatCurrency(monthlyInsurance)} />
            <CompactCalcRow label="Vacancy Reserve" formula={formatPercent(assumptions.vacancyRate)} result={formatCurrency(monthlyVacancy)} />
            <CompactCalcRow label="Maintenance" formula={formatPercent(assumptions.maintenancePct)} result={formatCurrency(monthlyMaintenance)} />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-rose-700">Total Expenses</span>
              <span className="text-xs font-bold text-rose-600">{formatCurrency(totalMonthlyExpenses)}</span>
            </div>
          </div>

          {/* Housing Cost Calculation */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Calculator className="w-3 h-3" /> Your Housing Cost
            </div>
            <CompactCalcRow label="Total Expenses" result={formatCurrency(totalMonthlyExpenses)} />
            <CompactCalcRow label="Rental Income" result={`-${formatCurrency(monthlyRentalIncome)}`} type="subtract" />
          </div>

          {/* Result */}
          <div className={`rounded-lg p-2 ${effectiveHousingCost < marketRent ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-700">Your Housing Cost</span>
              <span className={`text-lg font-bold ${effectiveHousingCost <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {effectiveHousingCost <= 0 ? 'FREE + ' + formatCurrency(Math.abs(effectiveHousingCost)) : formatCurrency(effectiveHousingCost)}
              </span>
            </div>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {effectiveHousingCost <= 0 ? '🎉 You live for free and make money!' : `vs. ${formatCurrency(marketRent)} market rent`}
            </p>
          </div>

          {/* Savings */}
          <div className="bg-gray-100/50 rounded-lg p-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-600">Monthly Savings</span>
              <span className={`text-sm font-bold ${monthlySavings > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(monthlySavings)}</span>
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">vs. renting at market rate ({formatCurrency(marketRent)}/mo)</div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">House Hack Success Metrics</div>
        <CompactMetric
          name="Effective Housing Cost"
          value={effectiveHousingCost <= 0 ? 'FREE!' : formatCurrency(effectiveHousingCost)}
          formula={`${formatCurrency(totalMonthlyExpenses)} − ${formatCurrency(monthlyRentalIncome)}`}
          benchmark="<$500/mo ideal"
          passed={effectiveHousingCost < 500}
          explanation="Your net cost to live after roommates pay rent. Goal is to live cheap or free while building equity."
        />
        <CompactMetric
          name="Monthly Savings"
          value={formatCurrency(monthlySavings)}
          formula={`${formatCurrency(marketRent)} − ${formatCurrency(effectiveHousingCost)}`}
          benchmark=">$500/mo"
          passed={monthlySavings > 500}
          explanation="Money saved vs. renting. This is extra cash you can invest, pay down debt, or save for your next property."
        />
        <CompactMetric
          name="Cash Required"
          value={formatCurrency(totalCashRequired)}
          formula="3.5% FHA down + closing"
          benchmark="Low barrier"
          passed={totalCashRequired < 30000}
          explanation="FHA loans require only 3.5% down for owner-occupied properties. This is how you get started with minimal cash."
        />
      </div>
    </div>
  )
}

// ============================================
// FULL ANALYTIC BREAKDOWN - WHOLESALE (Compact)
// ============================================

function WholesaleAnalyticBreakdown({ calc, assumptions }: { 
  calc: ReturnType<typeof calculateWholesale>
  assumptions: Assumptions 
}) {
  const wholesaleFee = assumptions.basePurchasePrice * assumptions.wholesaleFeePct
  const arvAt70 = calc.arv * 0.70

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-pink-500" />
        <h4 className="text-sm font-semibold text-gray-700">70% Rule - Full Breakdown</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* LEFT COLUMN: The 70% Rule Formula */}
        <div className="space-y-2">
          {/* Step 1: Start with ARV */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Step 1: After Repair Value
            </div>
            <CompactCalcRow label="After Repair Value (ARV)" result={formatCurrency(calc.arv)} />
            <p className="text-[9px] text-gray-500 mt-1">What the property will be worth after repairs</p>
          </div>

          {/* Step 2: Apply 70% Rule */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-teal-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Step 2: Apply 70% Rule
            </div>
            <CompactCalcRow label="ARV × 70%" formula={`${formatCurrency(calc.arv)} × 0.70`} result={formatCurrency(arvAt70)} type="total" />
            <p className="text-[9px] text-gray-500 mt-1">Industry standard leaves 30% margin for profit + closing costs</p>
          </div>

          {/* Step 3: Subtract Costs */}
          <div className="bg-gray-50/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Minus className="w-3 h-3" /> Step 3: Subtract Costs
            </div>
            <CompactCalcRow label="70% of ARV" result={formatCurrency(arvAt70)} />
            <CompactCalcRow label="Repair Costs" result={`−${formatCurrency(calc.rehabCost)}`} type="subtract" />
            <CompactCalcRow label="Your Wholesale Fee" result={`−${formatCurrency(wholesaleFee)}`} type="subtract" />
            <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1">
              <span className="text-[10px] font-medium text-pink-700">= Maximum Allowable Offer</span>
              <span className="text-xs font-bold text-pink-600">{formatCurrency(calc.mao)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAO Result & Comparison */}
        <div className="space-y-2">
          {/* MAO Result */}
          <div className={`rounded-lg p-3 ${calc.isPurchaseBelowMAO ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <div className="text-center">
              <div className="text-[10px] text-gray-500 mb-1">Maximum Allowable Offer</div>
              <div className={`text-2xl font-bold ${calc.isPurchaseBelowMAO ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(calc.mao)}</div>
              <div className={`text-[10px] mt-1 font-medium ${calc.isPurchaseBelowMAO ? 'text-emerald-600' : 'text-rose-600'}`}>
                {calc.isPurchaseBelowMAO ? 'Purchase price is below MAO ✓' : 'Purchase price exceeds MAO ✗'}
              </div>
            </div>
          </div>

          {/* Price Comparison */}
          <div className="bg-gray-100/50 rounded-lg p-2">
            <div className="text-[10px] font-semibold text-gray-600 mb-2">Price Comparison</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">Purchase Price</span>
                <span className="text-xs font-medium text-gray-700">{formatCurrency(assumptions.purchasePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">Your MAO</span>
                <span className="text-xs font-medium text-pink-600">{formatCurrency(calc.mao)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500">Purchase as % of ARV</span>
                <span className={`text-xs font-medium ${calc.purchasePctOfArv <= 0.70 ? 'text-emerald-600' : calc.purchasePctOfArv <= 0.80 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {(calc.purchasePctOfArv * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                <span className="text-[10px] font-medium text-gray-600">Spread (MAO − Purchase)</span>
                <span className={`text-xs font-bold ${calc.spreadFromPurchase > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {calc.spreadFromPurchase > 0 ? '+' : ''}{formatCurrency(calc.spreadFromPurchase)}
                </span>
              </div>
            </div>
          </div>

          {/* Why 70%? */}
          <div className="bg-blue-50/50 rounded-lg p-2 border border-blue-200">
            <div className="text-[10px] font-semibold text-blue-700 mb-1">Why the 70% Rule?</div>
            <div className="space-y-1">
              <div className="flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5" />
                <span className="text-[10px] text-gray-600">Leaves 30% margin for end buyer profit</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5" />
                <span className="text-[10px] text-gray-600">Accounts for holding & closing costs</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5" />
                <span className="text-[10px] text-gray-600">Built-in safety margin for surprises</span>
              </div>
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />
                <span className="text-[10px] text-gray-600">Some flippers use 65-75% depending on market</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with Explanations */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">70% Rule Metrics</div>
        <CompactMetric
          name="Maximum Allowable Offer"
          value={formatCurrency(calc.mao)}
          formula={`(${formatCurrency(calc.arv)} × 70%) − ${formatCurrency(calc.rehabCost)} − ${formatCurrency(wholesaleFee)}`}
          benchmark="< Asking Price"
          passed={calc.isPurchaseBelowMAO}
          explanation="The highest price you can offer while leaving enough profit for your end buyer and your fee."
        />
        <CompactMetric
          name="Wholesale Fee"
          value={formatCurrency(wholesaleFee)}
          formula={`${formatCurrency(assumptions.basePurchasePrice)} × ${(assumptions.wholesaleFeePct * 100).toFixed(1)}%`}
          benchmark="$5K-$30K typical"
          passed={wholesaleFee >= 5000 && wholesaleFee <= 50000}
          explanation="Your assignment fee for finding and assigning the deal. Adjust based on your market."
        />
        <CompactMetric
          name="Spread from Purchase"
          value={formatCurrency(Math.abs(calc.spreadFromPurchase))}
          formula="MAO − Purchase Price"
          benchmark="Positive = Good"
          passed={calc.spreadFromPurchase > 0}
          explanation={calc.spreadFromPurchase > 0 ? "Purchase price is below your MAO - deal works!" : "Purchase price is above your MAO - negotiate lower."}
        />
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
  
  const [assumptions, setAssumptions] = useState<Assumptions>({
    // Base values from API (for ±50% adjustment sliders) - Est. Value is center
    basePurchasePrice: 425000, baseMonthlyRent: 2100, baseAverageDailyRate: 250,
    // Adjustment percentages: Purchase Price defaults to -10%, others at 0 (center)
    purchasePriceAdj: -0.10, monthlyRentAdj: 0, averageDailyRateAdj: 0,
    // Computed values: Purchase Price = 90% of base (Est. Value)
    purchasePrice: 382500, monthlyRent: 2100, averageDailyRate: 250,
    // ARV = Purchase Price × (1 + arvPct), starts at 0% (= Purchase Price)
    arvPct: 0.20, arv: 510000,
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
      setLoading(true)
      try {
        if (!addressParam) throw new Error('No address provided')
        const data = await fetchProperty(decodeURIComponent(addressParam))
        setProperty(data)
        
        // Update the header store with current property info
        setCurrentPropertyInfo({
          propertyId: data.property_id,
          zpid: data.zpid || null,  // Zillow Property ID for photos
          address: data.address.street,
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property')
      } finally {
        setLoading(false)
      }
    }
    loadProperty()
  }, [addressParam])

  // Update handler for standard fields
  const update = useCallback((key: keyof Assumptions, value: number) => {
    setAssumptions(prev => {
      const updated = { ...prev, [key]: value }
      // Handle derived calculations
      if (key === 'rehabCostPct') {
        // Rehab cost based on market value (basePurchasePrice), not negotiated purchase price
        // This ensures MAO calculation is independent of purchase price adjustments
        updated.rehabCost = Math.round(prev.basePurchasePrice * value)
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

  // Strategy metrics for cards - includes primaryValue for profit/loss color coding
  const strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; rating: Rating; score: number; primaryValue: number }> = useMemo(() => ({
    ltr: {
      primary: formatCurrency(ltrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(ltrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash %: >15% Excellent, >12% Great, >8% Good, >5% Fair, <5% Poor
      rating: (ltrCalc.cashOnCash >= 0.15 ? 'excellent' : ltrCalc.cashOnCash >= 0.12 ? 'great' : ltrCalc.cashOnCash >= 0.08 ? 'good' : ltrCalc.cashOnCash >= 0.05 ? 'fair' : 'poor') as Rating,
      score: ltrCalc.cashOnCash * 100,
      primaryValue: ltrCalc.monthlyCashFlow
    },
    str: {
      primary: formatCurrency(strCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(strCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash %: >25% Excellent, >20% Great, >15% Good, >10% Fair, <10% Poor (higher for STR)
      rating: (strCalc.cashOnCash >= 0.25 ? 'excellent' : strCalc.cashOnCash >= 0.20 ? 'great' : strCalc.cashOnCash >= 0.15 ? 'good' : strCalc.cashOnCash >= 0.10 ? 'fair' : 'poor') as Rating,
      score: strCalc.cashOnCash * 100,
      primaryValue: strCalc.monthlyCashFlow
    },
    brrrr: {
      primary: formatCurrency(brrrrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: brrrrCalc.cashOnCash === Infinity ? '∞' : formatPercent(brrrrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      // Rating based on Cash-on-Cash % (Infinity = all money back): ∞ Excellent, >50% Great, >25% Good, >10% Fair, <10% Poor
      rating: (brrrrCalc.cashOnCash === Infinity ? 'excellent' : brrrrCalc.cashOnCash >= 0.50 ? 'great' : brrrrCalc.cashOnCash >= 0.25 ? 'good' : brrrrCalc.cashOnCash >= 0.10 ? 'fair' : 'poor') as Rating,
      score: brrrrCalc.cashOnCash === Infinity ? 100 : brrrrCalc.cashOnCash * 100,
      primaryValue: brrrrCalc.monthlyCashFlow
    },
    flip: {
      primary: formatCurrency(flipCalc.flipMargin),
      primaryLabel: 'Flip Margin',
      secondary: formatPercent(flipCalc.flipMarginPct),
      secondaryLabel: 'Margin %',
      // Rating based on Flip Margin %: >30% Excellent, >20% Great, >15% Good, >10% Fair, <10% Poor
      rating: (flipCalc.flipMarginPct >= 0.30 ? 'excellent' : flipCalc.flipMarginPct >= 0.20 ? 'great' : flipCalc.flipMarginPct >= 0.15 ? 'good' : flipCalc.flipMarginPct >= 0.10 ? 'fair' : 'poor') as Rating,
      score: flipCalc.flipMarginPct * 100,
      primaryValue: flipCalc.flipMargin
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
      primaryValue: houseHackCalc.monthlySavings
    },
    wholesale: {
      primary: formatCurrency(wholesaleCalc.mao),
      primaryLabel: 'Max Allowable Offer',
      secondary: `${(wholesaleCalc.purchasePctOfArv * 100).toFixed(0)}% of ARV`,
      secondaryLabel: 'Purchase Price',
      // Rating based on Purchase Price as % of ARV (70% Rule): <70% Excellent, 70-75% Great, 75-80% Good, 80-85% Fair, >85% Poor
      rating: (wholesaleCalc.purchasePctOfArv < 0.70 ? 'excellent' : wholesaleCalc.purchasePctOfArv <= 0.75 ? 'great' : wholesaleCalc.purchasePctOfArv <= 0.80 ? 'good' : wholesaleCalc.purchasePctOfArv <= 0.85 ? 'fair' : 'poor') as Rating,
      score: (1 - wholesaleCalc.purchasePctOfArv) * 100,
      primaryValue: wholesaleCalc.mao
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Unable to Load Property</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error || 'Property data is null'}</p>
          <div className="flex gap-3 justify-center">
            <a href="/" className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">Back to Search</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#e8eeef] dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <TopNav property={property} />
        
        {/* STEP 1: Set Your Terms - Always at Top */}
        <div className="mb-6">
          <SetYourTermsPanel
            assumptions={assumptions}
            update={update}
            updateAdjustment={updateAdjustment}
            propertyAddress={property.address.full_address}
            rehabBudget={assumptions.rehabCost}
          />
        </div>

        {/* STEP 2: Select Investment Strategy + Connected Content Panel */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Step 2 Header + Strategy Cards Carousel */}
          <div className="pt-4 pb-0 relative">
            <div className="px-5">
              <StepHeader step={2} title="Investment Strategies" subtitle="Select a strategy to evaluate the details below." />
            </div>
            
            {/* Strategy Cards Carousel - Responsive with horizontal scroll */}
            <StrategyCarousel
              strategies={strategies}
              strategyMetrics={strategyMetrics}
              selectedStrategy={selectedStrategy}
              onSelectStrategy={(id) => { setSelectedStrategy(id); setDrillDownView('details'); }}
            />
          </div>

          {/* Tabs - Connected to selected strategy with matching gray background */}
          <div className="px-5 py-3 bg-gray-50">
            <DrillDownTabs activeView={drillDownView} onViewChange={setDrillDownView} />
          </div>

          {/* Content Area - Key Metrics and Adjust Inputs */}
          <div className="p-5">
            {drillDownView === 'details' && selectedStrategy === 'ltr' && <LTRDetails calc={ltrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'str' && <STRDetails calc={strCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'brrrr' && <BRRRRDetails calc={brrrrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'flip' && <FlipDetails calc={flipCalc} assumptions={assumptions} update={update} />}
            {drillDownView === 'details' && selectedStrategy === 'house_hack' && <HouseHackDetails calc={houseHackCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'wholesale' && <WholesaleDetails calc={wholesaleCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            
            {drillDownView === 'charts' && <ChartsView projections={projections} totalCashInvested={ltrCalc.totalCashRequired} />}
            {drillDownView === 'projections' && <ProjectionsView assumptions={projectionAssumptions} />}
            {drillDownView === 'score' && <DealScoreCard metrics={{ monthlyCashFlow: ltrCalc.monthlyCashFlow, cashOnCash: ltrCalc.cashOnCash, capRate: ltrCalc.capRate, onePercentRule: ltrCalc.onePercentRule, dscr: ltrCalc.dscr, purchasePrice: assumptions.purchasePrice, arv: assumptions.arv, totalCashRequired: ltrCalc.totalCashRequired, monthlyRent: assumptions.monthlyRent }} />}
            {drillDownView === 'sensitivity' && <SensitivityAnalysisView assumptions={{ purchasePrice: assumptions.purchasePrice, downPaymentPct: assumptions.downPaymentPct, interestRate: assumptions.interestRate, loanTermYears: assumptions.loanTermYears, monthlyRent: assumptions.monthlyRent, propertyTaxes: assumptions.propertyTaxes, insurance: assumptions.insurance, vacancyRate: assumptions.vacancyRate, managementPct: assumptions.managementPct, maintenancePct: assumptions.maintenancePct }} />}
            {drillDownView === 'compare' && <ScenarioComparison currentAssumptions={projectionAssumptions} propertyAddress={property.address.full_address} />}
          </div>
        </div>

        {/* Compare Link */}
        <div className="mt-6 text-center">
          <a href="/compare" className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] text-gray-600 font-medium transition-all">
            <GitCompare className="w-4 h-4" />
            Compare Multiple Properties
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
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


