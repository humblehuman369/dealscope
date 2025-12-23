'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback, useEffect, Suspense, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  Building2, Home, Repeat, Hammer, Users, FileText, 
  TrendingUp, TrendingDown, DollarSign, Percent, Calendar, 
  AlertTriangle, CheckCircle, Zap, Target, PiggyBank, 
  RefreshCw, Award, Loader2, Bell, Settings, Menu,
  BarChart3, LineChart, GitCompare, Activity, Wrench, ChevronRight,
  ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown, ChevronUp,
  X, Layers, Calculator, Eye, EyeOff, SlidersHorizontal
} from 'lucide-react'
import { 
  ProjectionAssumptions,
  calculate10YearProjections
} from '@/lib/projections'

// Dynamic imports for drill-down components
const ProjectionsView = dynamic(() => import('@/components/ProjectionsView'), { loading: () => <LoadingCard /> })
const ScenarioComparison = dynamic(() => import('@/components/ScenarioComparison'), { loading: () => <LoadingCard /> })
const DealScoreCard = dynamic(() => import('@/components/DealScoreCard'), { loading: () => <LoadingCard /> })
const SensitivityAnalysisView = dynamic(() => import('@/components/SensitivityAnalysis'), { loading: () => <LoadingCard /> })
const ChartsView = dynamic(() => import('@/components/ChartsView'), { loading: () => <LoadingCard /> })
const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), { loading: () => <LoadingCard /> })

function LoadingCard() {
  return <div className="animate-pulse bg-gray-100 rounded-2xl h-64" />
}

// ============================================
// TYPES
// ============================================

interface PropertyData {
  property_id: string
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
}

type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'
type DrillDownView = 'details' | 'charts' | 'projections' | 'score' | 'sensitivity' | 'rehab' | 'compare'

// ============================================
// API FUNCTIONS
// ============================================

async function fetchProperty(address: string): Promise<PropertyData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
  const response = await fetch(`${apiUrl}/api/v1/properties/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  })
  if (!response.ok) throw new Error('Property not found')
  return response.json()
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
  const purchaseCosts = a.purchasePrice * a.closingCostsPct
  const holdingCosts = (a.purchasePrice * (a.interestRate / 12) * a.holdingPeriodMonths) + ((a.propertyTaxes / 12) * a.holdingPeriodMonths) + ((a.insurance / 12) * a.holdingPeriodMonths)
  const sellingCosts = a.arv * a.sellingCostsPct
  const totalInvestment = a.purchasePrice + purchaseCosts + a.rehabCost + holdingCosts
  const netProfit = a.arv - totalInvestment - sellingCosts
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0
  const annualizedROI = roi * (12 / a.holdingPeriodMonths)
  return { totalInvestment, netProfit, roi, annualizedROI, holdingCosts, sellingCosts }
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
  const assignmentFee = (a.arv - a.purchasePrice - a.rehabCost) * 0.30
  const earnestMoney = 1000
  const marketingCosts = 500
  const closingCosts = 500
  const totalInvestment = earnestMoney + marketingCosts + closingCosts
  const netProfit = assignmentFee - totalInvestment
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0
  const dealTimeline = 30
  return { assignmentFee, totalInvestment, netProfit, roi, dealTimeline, earnestMoney }
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
  { id: 'ltr', name: 'Long-Term Rental', shortName: 'LTR', description: 'Buy-and-hold with steady cash flow', icon: Building2, color: 'violet', gradient: 'from-violet-500 to-purple-600' },
  { id: 'str', name: 'Short-Term Rental', shortName: 'STR', description: 'Airbnb/VRBO for max revenue', icon: Home, color: 'cyan', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', description: 'Buy, Rehab, Rent, Refi, Repeat', icon: Repeat, color: 'emerald', gradient: 'from-emerald-500 to-green-600' },
  { id: 'flip', name: 'Fix & Flip', shortName: 'Flip', description: 'Renovate and sell for profit', icon: Hammer, color: 'orange', gradient: 'from-orange-500 to-red-500' },
  { id: 'house_hack', name: 'House Hacking', shortName: 'Hack', description: 'Live in one, rent the rest', icon: Users, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', description: 'Assign contracts for quick profit', icon: FileText, color: 'pink', gradient: 'from-pink-500 to-rose-600' },
]

// ============================================
// UI COMPONENTS
// ============================================

function TopNav({ property }: { property: PropertyData }) {
  // Get estimated market value (Zestimate or AVM)
  const estimatedValue = property.valuations.zestimate || property.valuations.current_value_avm || 0
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <a href="/" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors" aria-label="Back to home" title="Back to home">
          <Menu className="w-5 h-5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
        </a>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">{property.address.full_address}</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">
              {property.details.bedrooms || '—'} bed · {property.details.bathrooms || '—'} bath · {property.details.square_footage?.toLocaleString() || '—'} sqft
            </p>
            {estimatedValue > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <p className="text-sm font-semibold text-teal-600">
                  Est. {formatCurrency(estimatedValue)}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" title="View notifications" aria-label="View notifications" className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors">
          <span className="sr-only">View notifications</span>
          <Bell className="w-5 h-5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full" aria-hidden="true" />
        </button>
        <button type="button" title="Open settings" aria-label="Open settings" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/80 transition-colors">
          <span className="sr-only">Open settings</span>
          <Settings className="w-5 h-5 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
        </button>
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
          <span className={`text-[10px] font-medium ${adjustment === 0 ? 'text-gray-400' : adjustment > 0 ? 'text-teal-600' : 'text-rose-500'}`}>
            {adjSign}{adjPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="relative h-1">
        {/* Background gradient - subtle red to green */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-300 via-gray-200 to-teal-300" />
        {/* Center line indicator - thin */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-gray-400 -translate-x-1/2 z-10" />
        <div 
          ref={thumbRef}
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-sm cursor-grab transition-transform hover:scale-110 slider-thumb ${
            adjustment === 0 
              ? 'border-2 border-gray-400' 
              : adjustment > 0 
                ? 'border-2 border-teal-500'
                : 'border-2 border-rose-500'
          }`}
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

// Maintenance slider that shows both % and calculated $ value
function MaintenanceSlider({ value, onChange, annualRent, compact = false }: {
  value: number; onChange: (value: number) => void; annualRent: number; compact?: boolean
}) {
  const percentage = Math.round((value / 0.30) * 100) // maxPercent is 30%
  const displayPercent = (value * 100).toFixed(1)
  const dollarValue = Math.round(annualRent * value)
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-700">{displayPercent}%</span>
          <span className="text-[10px] text-gray-400">({formatCurrency(dollarValue)}/yr)</span>
        </div>
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
          title={`Adjust Maintenance - ${displayPercent}% = ${formatCurrency(dollarValue)}/year`}
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

function StrategyCard({ strategy, metrics, isSelected, onClick }: {
  strategy: typeof strategies[0]; metrics: { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; verdict: 'good' | 'ok' | 'poor'; primaryValue: number }
  isSelected: boolean; onClick: () => void
}) {
  // Use actual numeric value for profit/loss coloring
  const isProfit = metrics.primaryValue > 0
  const isLoss = metrics.primaryValue < 0
  
  // Refined color classes - subtle but clear
  const primaryColor = isLoss 
    ? 'text-rose-600' 
    : isProfit 
      ? 'text-teal-600' 
      : 'text-gray-400'
  
  // Thin top accent line based on profitability
  const accentColor = isLoss 
    ? 'bg-rose-500' 
    : isProfit 
      ? 'bg-teal-500' 
      : 'bg-gray-200'
  
  return (
    <button
      onClick={onClick}
      className={`relative bg-white rounded-md text-left transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'ring-1 ring-gray-300 shadow-sm' 
          : 'hover:shadow-sm'
      }`}
    >
      {/* Thin top accent bar */}
      <div className={`h-0.5 w-full ${accentColor}`} />
      
      <div className="px-2.5 py-2">
        {/* Strategy Name - Full name, refined size */}
        <h3 className="text-[11px] font-semibold text-gray-900 tracking-tight leading-tight mb-1.5">{strategy.name}</h3>
        
        {/* Primary Value - Clear with profit/loss color */}
        <div className={`text-xl font-semibold tracking-tight leading-none ${primaryColor}`}>
          {metrics.primary}
        </div>
        <div className="text-[8px] text-gray-400 tracking-wide mt-0.5 mb-1.5">{metrics.primaryLabel}</div>
        
        {/* Secondary Metric - Value on top, label below */}
        <div className="pt-1.5 border-t border-gray-100/80">
          <div className="text-sm font-semibold text-gray-700">{metrics.secondary}</div>
          <div className="text-[8px] text-gray-400 mt-px">{metrics.secondaryLabel}</div>
        </div>
      </div>
    </button>
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
            {/* ±50% Adjustment Sliders for Purchase Price and Monthly Rent */}
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
            
            {/* ARV: 0-100% above Purchase Price */}
            <ArvSlider
              purchasePrice={assumptions.purchasePrice}
              arvPct={assumptions.arvPct}
              onChange={(v) => update('arvPct', v)}
              compact
            />
            
            {/* Down Payment: 0-100% */}
            <PercentSlider 
              label="Down Payment" 
              value={assumptions.downPaymentPct} 
              onChange={(v) => update('downPaymentPct', v)} 
              compact 
            />
            
            {/* Interest Rate: 0-30% */}
            <PercentSlider 
              label="Interest Rate" 
              value={assumptions.interestRate} 
              onChange={(v) => update('interestRate', v)} 
              compact 
              maxPercent={30}
            />
            
            {/* Rehab Cost: 0-50% */}
            <PercentSlider 
              label="Rehab Cost" 
              value={assumptions.rehabCostPct} 
              onChange={(v) => update('rehabCostPct', v)} 
              compact 
              maxPercent={50}
            />
            
            {/* Vacancy Rate: 0-30% */}
            <PercentSlider 
              label="Vacancy Rate" 
              value={assumptions.vacancyRate} 
              onChange={(v) => update('vacancyRate', v)} 
              compact 
              maxPercent={30}
            />
            
            {/* Management %: 0-30% */}
            <PercentSlider 
              label="Management %" 
              value={assumptions.managementPct} 
              onChange={(v) => update('managementPct', v)} 
              compact 
              maxPercent={30}
            />
            
            {/* Maintenance: 0-30% */}
            <PercentSlider 
              label="Maintenance" 
              value={assumptions.maintenancePct} 
              onChange={(v) => update('maintenancePct', v)} 
              compact 
              maxPercent={30}
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
  
  return (
    <div className="grid grid-cols-2 gap-6">
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
        <div className="space-y-2">
          <RuleCheck label="1% Rule" value={formatPercent(calc.onePercentRule)} target="≥1%" passed={calc.onePercentRule >= 0.01} />
          <RuleCheck label="DSCR" value={calc.dscr.toFixed(2)} target="≥1.25" passed={calc.dscr >= 1.25} />
          <RuleCheck label="Cash Flow" value={formatCurrency(calc.monthlyCashFlow)} target="≥$200" passed={calc.monthlyCashFlow >= 200} />
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
          <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
          <PercentSlider label="Management %" value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} compact maxPercent={30} />
          <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
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
  // Calculate annual STR revenue for maintenance $ calculation
  const annualSTRRevenue = assumptions.averageDailyRate * 365 * assumptions.occupancyRate
  
  return (
    <div className="grid grid-cols-2 gap-6">
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
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <AdjustmentSlider label="Daily Rate" baseValue={assumptions.baseAverageDailyRate} adjustment={assumptions.averageDailyRateAdj} onChange={(v) => updateAdjustment('averageDailyRateAdj', v)} compact />
          <PercentSlider label="Occupancy Rate" value={assumptions.occupancyRate} onChange={(v) => update('occupancyRate', v)} compact maxPercent={95} />
          <PercentSlider label="Management %" value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} compact maxPercent={30} />
          <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualSTRRevenue} compact />
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
  // Calculate annual rent for maintenance $ calculation (post-rehab rent)
  const annualRent = assumptions.monthlyRent * 12
  
  return (
    <div className="grid grid-cols-2 gap-6">
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
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
          <PercentSlider label="Rehab Cost" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
          <AdjustmentSlider label="Monthly Rent" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
          <PercentSlider label="Management %" value={assumptions.managementPct} onChange={(v) => update('managementPct', v)} compact maxPercent={30} />
          <MaintenanceSlider value={assumptions.maintenancePct} onChange={(v) => update('maintenancePct', v)} annualRent={annualRent} compact />
        </div>
      </div>
    </div>
  )
}

function FlipDetails({ calc, assumptions, update }: { calc: ReturnType<typeof calculateFlip>; assumptions: Assumptions; update: (k: keyof Assumptions, v: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
          <StatRow label="Net Profit" value={formatCurrency(calc.netProfit)} highlight={calc.netProfit > 30000} />
          <StatRow label="ROI" value={formatPercent(calc.roi)} highlight={calc.roi > 0.20} />
          <StatRow label="Annualized ROI" value={formatPercent(calc.annualizedROI)} />
          <StatRow label="Total Investment" value={formatCurrency(calc.totalInvestment)} />
          <StatRow label="Holding Costs" value={formatCurrency(calc.holdingCosts)} />
          <StatRow label="Selling Costs" value={formatCurrency(calc.sellingCosts)} />
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
          <PercentSlider label="Rehab Cost" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
          <GradientSlider label="Holding Period" value={assumptions.holdingPeriodMonths} min={3} max={12} step={1} onChange={(v) => update('holdingPeriodMonths', v)} formatType="months" compact />
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
    <div className="grid grid-cols-2 gap-6">
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
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <RoomsRentedSlider roomsRented={assumptions.roomsRented} totalBedrooms={assumptions.totalBedrooms} onChange={(v) => update('roomsRented', v)} compact />
          <AdjustmentSlider label="Total Rent (all rooms)" baseValue={assumptions.baseMonthlyRent} adjustment={assumptions.monthlyRentAdj} onChange={(v) => updateAdjustment('monthlyRentAdj', v)} compact />
          <PercentSlider label="Vacancy Rate" value={assumptions.vacancyRate} onChange={(v) => update('vacancyRate', v)} compact maxPercent={30} />
        </div>
      </div>
    </div>
  )
}

function WholesaleDetails({ calc, assumptions, update }: { calc: ReturnType<typeof calculateWholesale>; assumptions: Assumptions; update: (k: keyof Assumptions, v: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Metrics</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 divide-y divide-gray-100">
          <StatRow label="Assignment Fee" value={formatCurrency(calc.assignmentFee)} highlight={calc.assignmentFee > 10000} />
          <StatRow label="Net Profit" value={formatCurrency(calc.netProfit)} highlight={calc.netProfit > 8000} />
          <StatRow label="ROI" value={formatPercent(calc.roi)} highlight />
          <StatRow label="Total Investment" value={formatCurrency(calc.totalInvestment)} />
          <StatRow label="Earnest Money" value={formatCurrency(calc.earnestMoney)} />
          <StatRow label="Timeline" value={`${calc.dealTimeline} days`} />
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Adjust Inputs</h4>
        <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
          <ArvSlider purchasePrice={assumptions.purchasePrice} arvPct={assumptions.arvPct} onChange={(v) => update('arvPct', v)} compact />
          <PercentSlider label="Rehab Estimate" value={assumptions.rehabCostPct} onChange={(v) => update('rehabCostPct', v)} compact maxPercent={50} />
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
  
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('ltr')
  const [drillDownView, setDrillDownView] = useState<DrillDownView>('details')
  const [assumptionsExpanded, setAssumptionsExpanded] = useState(true)
  
  const [assumptions, setAssumptions] = useState<Assumptions>({
    // Base values from API (for ±50% adjustment sliders)
    basePurchasePrice: 425000, baseMonthlyRent: 2100, baseAverageDailyRate: 250,
    // Adjustment percentages (0 = center, no adjustment)
    purchasePriceAdj: 0, monthlyRentAdj: 0, averageDailyRateAdj: 0,
    // Computed values (will be updated when adjustments change)
    purchasePrice: 425000, monthlyRent: 2100, averageDailyRate: 250,
    // ARV = Purchase Price × (1 + arvPct), starts at 0% (= Purchase Price)
    arvPct: 0.20, arv: 510000,
    // Standard values
    downPaymentPct: 0.20, interestRate: 0.056, loanTermYears: 30,
    rehabCostPct: 0.05, rehabCost: 21250, propertyTaxes: 4500, insurance: 1500,
    vacancyRate: 0.03, managementPct: 0.00, maintenancePct: 0.05, closingCostsPct: 0.03,
    occupancyRate: 0.82, holdingPeriodMonths: 6, sellingCostsPct: 0.08,
    // House Hack specific - defaults
    roomsRented: 3, totalBedrooms: 4
  })

  useEffect(() => {
    async function loadProperty() {
      setLoading(true)
      try {
        if (!addressParam) throw new Error('No address provided')
        const data = await fetchProperty(decodeURIComponent(addressParam))
        setProperty(data)
        
        // Calculate BASE values from API data
        // These are the center points for the ±50% adjustment sliders
        
        // Base Purchase Price = 90% of zestimate
        const zestimate = data.valuations.zestimate
        const fallbackValue = data.valuations.current_value_avm || data.valuations.arv || 425000
        const basePurchasePrice = zestimate ? zestimate * 0.90 : fallbackValue
        
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
          // Base values (center of sliders)
          basePurchasePrice: Math.round(basePurchasePrice),
          baseMonthlyRent: Math.round(baseMonthlyRent),
          baseAverageDailyRate: Math.round(baseAverageDailyRate),
          // Adjustments start at 0 (center)
          purchasePriceAdj: 0,
          monthlyRentAdj: 0,
          averageDailyRateAdj: 0,
          // Computed values (base × (1 + 0) = base)
          purchasePrice: Math.round(basePurchasePrice),
          monthlyRent: Math.round(baseMonthlyRent),
          averageDailyRate: Math.round(baseAverageDailyRate),
          // ARV: percentage above purchase price (0-100%)
          arvPct,
          arv: Math.round(basePurchasePrice * (1 + arvPct)),
          // Interest rate from API
          interestRate,
          // Rehab cost starts at 5% (default)
          rehabCostPct: 0.05,
          rehabCost: Math.round(basePurchasePrice * 0.05),
          propertyTaxes: data.market.property_taxes_annual || prev.propertyTaxes,
          occupancyRate: data.rentals.occupancy_rate || prev.occupancyRate,
          // Fixed rates per user spec
          downPaymentPct: 0.20,   // 20%
          vacancyRate: 0.03,      // 3%
          managementPct: 0.00,    // 0%
          maintenancePct: 0.05,   // 5%
          // House Hack: bedrooms from property, default to renting all but 1
          totalBedrooms: data.details.bedrooms || 4,
          roomsRented: Math.max(1, (data.details.bedrooms || 4) - 1),
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
        updated.rehabCost = Math.round(prev.purchasePrice * value)
      } else if (key === 'arvPct') {
        // ARV = Purchase Price × (1 + arvPct)
        updated.arv = Math.round(prev.purchasePrice * (1 + value))
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
        // Also update rehab cost and ARV since they're based on purchase price
        updated.rehabCost = Math.round(updated.purchasePrice * prev.rehabCostPct)
        updated.arv = Math.round(updated.purchasePrice * (1 + prev.arvPct))
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
  const strategyMetrics: Record<StrategyId, { primary: string; primaryLabel: string; secondary: string; secondaryLabel: string; verdict: 'good' | 'ok' | 'poor'; score: number; primaryValue: number }> = useMemo(() => ({
    ltr: {
      primary: formatCurrency(ltrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(ltrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      verdict: ltrCalc.monthlyCashFlow >= 200 ? 'good' : ltrCalc.monthlyCashFlow >= 0 ? 'ok' : 'poor',
      score: ltrCalc.cashOnCash * 100,
      primaryValue: ltrCalc.monthlyCashFlow
    },
    str: {
      primary: formatCurrency(strCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: formatPercent(strCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      verdict: strCalc.monthlyCashFlow >= 500 ? 'good' : strCalc.monthlyCashFlow >= 0 ? 'ok' : 'poor',
      score: strCalc.cashOnCash * 100,
      primaryValue: strCalc.monthlyCashFlow
    },
    brrrr: {
      primary: formatCurrency(brrrrCalc.monthlyCashFlow),
      primaryLabel: 'Monthly Cash Flow',
      secondary: brrrrCalc.cashOnCash === Infinity ? '∞' : formatPercent(brrrrCalc.cashOnCash),
      secondaryLabel: 'Cash-on-Cash',
      verdict: brrrrCalc.cashLeftInDeal < 10000 ? 'good' : brrrrCalc.cashLeftInDeal < 30000 ? 'ok' : 'poor',
      score: brrrrCalc.cashLeftInDeal < 5000 ? 100 : 50,
      primaryValue: brrrrCalc.monthlyCashFlow
    },
    flip: {
      primary: formatCurrency(flipCalc.netProfit),
      primaryLabel: 'Net Profit',
      secondary: formatPercent(flipCalc.roi),
      secondaryLabel: 'ROI',
      verdict: flipCalc.netProfit >= 30000 ? 'good' : flipCalc.netProfit >= 0 ? 'ok' : 'poor',
      score: flipCalc.roi * 100,
      primaryValue: flipCalc.netProfit
    },
    house_hack: {
      primary: formatCurrency(houseHackCalc.monthlySavings),
      primaryLabel: 'Monthly Savings',
      secondary: formatCurrency(houseHackCalc.effectiveHousingCost),
      secondaryLabel: 'Net Housing Cost',
      verdict: houseHackCalc.monthlySavings > 500 ? 'good' : houseHackCalc.monthlySavings > 0 ? 'ok' : 'poor',
      score: houseHackCalc.monthlySavings > 0 ? 80 : 40,
      primaryValue: houseHackCalc.monthlySavings
    },
    wholesale: {
      primary: formatCurrency(wholesaleCalc.netProfit),
      primaryLabel: 'Net Profit',
      secondary: formatPercent(wholesaleCalc.roi),
      secondaryLabel: 'ROI',
      verdict: wholesaleCalc.netProfit >= 8000 ? 'good' : wholesaleCalc.netProfit >= 0 ? 'ok' : 'poor',
      score: wholesaleCalc.roi * 10,
      primaryValue: wholesaleCalc.netProfit
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
      <div className="min-h-screen bg-[#e8eeef] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading property...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#e8eeef] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Unable to Load Property</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <a href="/" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-600 transition-colors">Back to Search</a>
          </div>
        </div>
      </div>
    )
  }

  const currentStrategy = strategies.find(s => s.id === selectedStrategy)!
  const CurrentIcon = currentStrategy.icon

  return (
    <div className="min-h-screen bg-[#e8eeef]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <TopNav property={property} />
        
        {/* Strategy Grid - Clean & Sophisticated */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 tracking-wide">Investment Strategies</h2>
            <span className="text-[10px] text-gray-400">Select to analyze</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {strategies.map(strategy => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                metrics={strategyMetrics[strategy.id]}
                isSelected={selectedStrategy === strategy.id}
                onClick={() => { setSelectedStrategy(strategy.id); setDrillDownView('details'); }}
              />
            ))}
          </div>
        </div>

        {/* Collapsible Assumptions Panel */}
        <div className="mb-6">
          <AssumptionsPanel 
            assumptions={assumptions} 
            update={update}
            updateAdjustment={updateAdjustment}
            isExpanded={assumptionsExpanded} 
            onToggle={() => setAssumptionsExpanded(!assumptionsExpanded)} 
          />
        </div>

        {/* Rehab Estimator Banner - Links to dedicated page */}
        <a
          href={`/rehab?address=${encodeURIComponent(property.address.full_address)}&budget=${assumptions.rehabCost}`}
          className="block bg-white rounded-lg border border-gray-100 overflow-hidden group mb-4"
        >
          {/* Top gradient line */}
          <div className="h-0.5 bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400" />
          
          <div className="px-4 py-3 flex items-center justify-between transition-all hover:bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-rose-50 group-hover:to-emerald-50">
                <Wrench className="w-4 h-4 transition-colors text-gray-500 group-hover:text-gray-600" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm transition-colors text-gray-700">Rehab Estimator</h3>
                <p className="text-gray-400 text-xs">Build your renovation budget item by item</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </div>
        </a>

        {/* Drill-Down Panel */}
        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          {/* Strategy Header - Synced with selected strategy */}
          <div className="px-5 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${currentStrategy.gradient}`}>
                  <CurrentIcon className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{currentStrategy.name}</h3>
                  <p className="text-[11px] text-gray-400">{currentStrategy.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  strategyMetrics[selectedStrategy].primaryValue > 0 ? 'text-teal-600' : 
                  strategyMetrics[selectedStrategy].primaryValue < 0 ? 'text-rose-600' : 'text-gray-500'
                }`}>{strategyMetrics[selectedStrategy].primary}</div>
                <div className="text-[10px] text-gray-400">{strategyMetrics[selectedStrategy].primaryLabel}</div>
              </div>
            </div>
          </div>

          {/* Drill-Down Tabs */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <DrillDownTabs activeView={drillDownView} onViewChange={setDrillDownView} />
          </div>

          {/* Drill-Down Content */}
          <div className="p-5">
            {drillDownView === 'details' && selectedStrategy === 'ltr' && <LTRDetails calc={ltrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'str' && <STRDetails calc={strCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'brrrr' && <BRRRRDetails calc={brrrrCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'flip' && <FlipDetails calc={flipCalc} assumptions={assumptions} update={update} />}
            {drillDownView === 'details' && selectedStrategy === 'house_hack' && <HouseHackDetails calc={houseHackCalc} assumptions={assumptions} update={update} updateAdjustment={updateAdjustment} />}
            {drillDownView === 'details' && selectedStrategy === 'wholesale' && <WholesaleDetails calc={wholesaleCalc} assumptions={assumptions} update={update} />}
            
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
    <Suspense fallback={<div className="min-h-screen bg-[#e8eeef] flex items-center justify-center"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div>}>
      <PropertyPageContent />
    </Suspense>
  )
}

