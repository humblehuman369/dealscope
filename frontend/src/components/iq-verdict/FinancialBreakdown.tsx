'use client'

/**
 * FinancialBreakdown Component
 * 
 * Accordion-style financial breakdown with section links to Deal Maker.
 * Redesigned with dark teal headers and adjust links.
 * 
 * STRATEGY-AWARE:
 * - LTR/STR: Current structure (Purchase Terms, Income, Expenses, NOI, Debt Service)
 * - BRRRR: Phases (Buy, Rehab, Rent, Refinance)
 * - Flip: Phases (Acquisition, Rehab, Holding, Sale)
 * - House Hack: Sections (Property, Financing, Rental Income, Net Housing Cost)
 * - Wholesale: Sections (Property Analysis, Contract Terms, Assignment Analysis)
 */

import React, { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { StrategyType } from '@/config/strategyMetrics'
import { PriceTarget } from '@/lib/priceUtils'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { AuthGate } from '@/components/auth/AuthGate'

interface FinancialBreakdownProps {
  // Purchase Terms
  buyPrice: number
  targetBuyPrice?: number
  downPaymentPct: number
  interestRate: number
  loanTermYears: number
  
  // Income
  monthlyRent: number
  vacancyRate: number
  otherIncome?: number
  
  // Operating Expenses
  propertyTaxes: number
  insurance: number
  hoaFees?: number
  managementRate: number
  maintenanceRate: number
  utilities?: number
  landscaping?: number
  pestControl?: number
  capexRate: number
  otherExpenses?: number

  // Adjust callbacks
  onAdjustTerms?: () => void
  onAdjustIncome?: () => void
  onAdjustExpenses?: () => void
  onAdjustDebt?: () => void
  
  // Strategy-aware props
  strategy?: StrategyType
  priceTarget?: PriceTarget
  
  // BRRRR-specific props
  rehabBudget?: number
  contingencyPct?: number
  holdingPeriodMonths?: number
  holdingCostsMonthly?: number
  arv?: number
  refinanceLtv?: number
  refinanceInterestRate?: number
  refinanceTermYears?: number
  postRehabMonthlyRent?: number
  
  // Flip-specific props
  rehabTimeMonths?: number
  daysOnMarket?: number
  sellingCostsPct?: number
  capitalGainsRate?: number
  hardMoneyRate?: number
  hardMoneyLtv?: number
  loanPoints?: number
  
  // House Hack-specific props
  totalUnits?: number
  ownerOccupiedUnits?: number
  avgRentPerUnit?: number
  currentHousingPayment?: number
  pmiRate?: number
  
  // Wholesale-specific props
  contractPrice?: number
  assignmentFee?: number
  earnestMoney?: number
  marketingCosts?: number
  wholesaleClosingCosts?: number
  estimatedRepairs?: number
}

// Section Header with Link
function SectionHeader({ 
  title, 
  linkText, 
  onLinkClick 
}: { 
  title: string
  linkText?: string
  onLinkClick?: () => void 
}) {
  return (
    <div className="mx-4 my-2 bg-[#0E7490] text-white flex justify-between items-center px-4 py-2.5 rounded">
      <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      {linkText && (
        <button 
          className="text-[#00D4FF] text-xs font-medium cursor-pointer hover:underline bg-transparent border-none"
          onClick={onLinkClick}
        >
          {linkText}
        </button>
      )}
    </div>
  )
}

// Standard Row Component
function Row({ 
  label, 
  value, 
  isNegative = false,
}: { 
  label: string
  value: string
  isNegative?: boolean
}) {
  return (
    <div className="flex justify-between items-center px-8 py-2 border-b border-[#F1F5F9]">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className={`text-sm font-semibold ${isNegative ? 'text-[#EF4444]' : 'text-[#0A1628]'}`}>
        {value}
      </span>
    </div>
  )
}

// Highlight Row (Target Buy Price)
function HighlightRow({ 
  label, 
  value 
}: { 
  label: string
  value: string 
}) {
  return (
    <div className="flex justify-between items-center px-8 py-2.5 bg-[rgba(8,145,178,0.1)] border-b border-[rgba(8,145,178,0.2)]">
      <span className="text-sm font-semibold text-[#0A1628]">{label}</span>
      <span className="text-base font-bold text-[#0891B2]">{value}</span>
    </div>
  )
}

// Summary Row (Effective Gross Income, Total Operating Expenses)
function SummaryRow({ 
  label, 
  value 
}: { 
  label: string
  value: string 
}) {
  return (
    <div className="flex justify-between items-center px-8 py-2.5 bg-[#F1F5F9] border-t border-[#E2E8F0]">
      <span className="text-xs font-semibold text-[#0A1628] uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold text-[#0A1628]">{value}</span>
    </div>
  )
}

// Teal Highlight Row (NOI, Pre-Tax Cash Flow)
function TealHighlightRow({ 
  label, 
  value, 
  isNegative = false 
}: { 
  label: string
  value: string
  isNegative?: boolean 
}) {
  return (
    <div className="flex justify-between items-center px-8 py-2.5 bg-[rgba(8,145,178,0.15)]">
      <span className="text-xs font-semibold text-[#0A1628] uppercase tracking-wide">{label}</span>
      <span className={`text-base font-bold ${isNegative ? 'text-[#EF4444]' : 'text-[#0891B2]'}`}>
        {value}
      </span>
    </div>
  )
}

export function FinancialBreakdown({
  buyPrice,
  targetBuyPrice,
  downPaymentPct,
  interestRate,
  loanTermYears,
  monthlyRent,
  vacancyRate,
  otherIncome = 0,
  propertyTaxes,
  insurance,
  hoaFees = 0,
  managementRate,
  maintenanceRate,
  utilities = 0,
  landscaping = 0,
  pestControl = 0,
  capexRate,
  otherExpenses = 0,
  onAdjustTerms,
  onAdjustIncome,
  onAdjustExpenses,
  onAdjustDebt,
  strategy = 'ltr',
  priceTarget = 'targetBuy',
  // BRRRR props
  rehabBudget = 0,
  contingencyPct = 10,
  holdingPeriodMonths = 6,
  holdingCostsMonthly = 1500,
  arv,
  refinanceLtv = 75,
  refinanceInterestRate,
  refinanceTermYears = 30,
  postRehabMonthlyRent,
  // Flip props
  rehabTimeMonths = 4,
  daysOnMarket = 45,
  sellingCostsPct = 8,
  capitalGainsRate = 25,
  hardMoneyRate = 12,
  hardMoneyLtv = 90,
  loanPoints = 2,
  // House Hack props
  totalUnits = 4,
  ownerOccupiedUnits = 1,
  avgRentPerUnit,
  currentHousingPayment = 2000,
  pmiRate = 0.85,
  // Wholesale props
  contractPrice,
  assignmentFee = 15000,
  earnestMoney = 1000,
  marketingCosts = 500,
  wholesaleClosingCosts = 500,
  estimatedRepairs = 40000,
}: FinancialBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use targetBuyPrice if provided, otherwise use buyPrice
  const effectiveBuyPrice = targetBuyPrice ?? buyPrice

  // Calculate all financial metrics
  const calculations = useMemo(() => {
    // Purchase Terms
    const downPayment = effectiveBuyPrice * (downPaymentPct / 100)
    const loanAmount = effectiveBuyPrice - downPayment
    
    // Monthly mortgage payment (P&I)
    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTermYears * 12
    const monthlyPI = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    
    // Income
    const annualGrossRent = monthlyRent * 12
    const vacancyAllowance = annualGrossRent * (vacancyRate / 100)
    const effectiveGrossIncome = annualGrossRent - vacancyAllowance + otherIncome
    
    // Operating Expenses
    const annualManagement = annualGrossRent * (managementRate / 100)
    const annualMaintenance = annualGrossRent * (maintenanceRate / 100)
    const annualCapex = annualGrossRent * (capexRate / 100)
    const annualUtilities = utilities * 12
    const annualLandscaping = landscaping * 12
    const annualPestControl = pestControl * 12
    const annualOther = otherExpenses * 12
    
    const totalOperatingExpenses = 
      propertyTaxes + 
      insurance + 
      hoaFees + 
      annualManagement + 
      annualMaintenance + 
      annualUtilities + 
      annualLandscaping + 
      annualPestControl + 
      annualCapex + 
      annualOther
    
    // NOI & Cash Flow
    const noi = effectiveGrossIncome - totalOperatingExpenses
    const annualDebtService = monthlyPI * 12
    const annualCashFlow = noi - annualDebtService
    
    return {
      // Purchase Terms
      targetBuyPrice: effectiveBuyPrice,
      downPayment,
      downPaymentPct,
      loanAmount,
      interestRate,
      loanTermYears,
      monthlyPI,
      
      // Income
      annualGrossRent,
      vacancyAllowance,
      otherIncome,
      effectiveGrossIncome,
      
      // Operating Expenses
      propertyTaxes,
      insurance,
      hoaFees,
      annualManagement,
      annualMaintenance,
      annualUtilities,
      annualLandscaping,
      annualPestControl,
      annualCapex,
      annualOther,
      totalOperatingExpenses,
      
      // Bottom Line
      noi,
      annualDebtService,
      annualCashFlow,
    }
  }, [
    effectiveBuyPrice, downPaymentPct, interestRate, loanTermYears,
    monthlyRent, vacancyRate, otherIncome,
    propertyTaxes, insurance, hoaFees, managementRate, maintenanceRate,
    utilities, landscaping, pestControl, capexRate, otherExpenses
  ])

  return (
    <AuthGate feature="view full calculation breakdown" mode="section">
    <div className="bg-white border-b border-[#E2E8F0] overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors bg-white border-none cursor-pointer"
      >
        <span className="text-sm font-bold text-[#0A1628] uppercase tracking-wide">
          Financial Breakdown
        </span>
        <ChevronDown 
          className={`w-5 h-5 text-[#64748B] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Expandable Content - Strategy-Aware */}
      {isExpanded && (
        <div className="border-t border-[#E2E8F0]">
          {/* RENTAL STRATEGIES (LTR/STR) */}
          {(strategy === 'ltr' || strategy === 'str') && (
            <>
              {/* PURCHASE TERMS */}
              <SectionHeader title="Purchase Terms" linkText="Adjust Terms" onLinkClick={onAdjustTerms} />
              <HighlightRow label="Target Buy Price" value={`${formatCurrency(calculations.targetBuyPrice)}`} />
              <Row label="Down Payment" value={`${formatCurrency(calculations.downPayment)}`} />
              <Row label="Down Payment %" value={formatPercent(calculations.downPaymentPct, { decimals: 2 })} />
              <Row label="Loan Amount" value={`${formatCurrency(calculations.loanAmount)}`} />
              <Row label="Interest Rate" value={formatPercent(calculations.interestRate, { decimals: 2 })} />
              <Row label="Loan Term (Years)" value={calculations.loanTermYears.toString()} />
              <Row label="Monthly Payment (P&I)" value={`${formatCurrency(calculations.monthlyPI)}`} />
              
              {/* INCOME */}
              <SectionHeader title="Income" linkText="Adjust Income" onLinkClick={onAdjustIncome} />
              <Row label="Gross Scheduled Rent" value={`${formatCurrency(calculations.annualGrossRent)}`} />
              <Row 
                label="Less: Vacancy Allowance" 
                value={`(${formatCurrency(calculations.vacancyAllowance)})`} 
                isNegative 
              />
              <Row label="Other Income" value={`${formatCurrency(calculations.otherIncome)}`} />
              <SummaryRow label="Effective Gross Income" value={`${formatCurrency(calculations.effectiveGrossIncome)}`} />
              
              {/* OPERATING EXPENSES */}
              <SectionHeader title="Operating Expenses" linkText="Adjust Expenses" onLinkClick={onAdjustExpenses} />
              <Row label="Property Taxes" value={`${formatCurrency(calculations.propertyTaxes)}`} />
              <Row label="Insurance" value={`${formatCurrency(calculations.insurance)}`} />
              <Row label="HOA Fees" value={calculations.hoaFees > 0 ? `${formatCurrency(calculations.hoaFees)}` : '$-'} />
              <Row 
                label="Property Management" 
                value={calculations.annualManagement > 0 ? `${formatCurrency(calculations.annualManagement)}` : '$-'} 
              />
              <Row label="Maintenance & Repairs" value={`${formatCurrency(calculations.annualMaintenance)}`} />
              <Row label="Utilities" value={calculations.annualUtilities > 0 ? `${formatCurrency(calculations.annualUtilities)}` : '$-'} />
              <Row label="Landscaping" value={calculations.annualLandscaping > 0 ? `${formatCurrency(calculations.annualLandscaping)}` : '$-'} />
              <Row label="Pest Control" value={calculations.annualPestControl > 0 ? `${formatCurrency(calculations.annualPestControl)}` : '$-'} />
              <Row label="CapEx Reserve" value={`${formatCurrency(calculations.annualCapex)}`} />
              <Row label="Other Expenses" value={calculations.annualOther > 0 ? `${formatCurrency(calculations.annualOther)}` : '$-'} />
              <SummaryRow label="Total Operating Expenses" value={`${formatCurrency(calculations.totalOperatingExpenses)}`} />
              
              {/* NET OPERATING INCOME */}
              <TealHighlightRow label="Net Operating Income (NOI)" value={`${formatCurrency(calculations.noi)}`} />
              
              {/* DEBT SERVICE */}
              <SectionHeader title="Debt Service" linkText="Adjust Debt" onLinkClick={onAdjustDebt} />
              <Row label="Annual Mortgage (P&I)" value={`${formatCurrency(calculations.annualDebtService)}`} />
              
              {/* PRE-TAX CASH FLOW */}
              <TealHighlightRow 
                label="Pre-Tax Cash Flow" 
                value={calculations.annualCashFlow < 0 
                  ? `(${formatCurrency(Math.abs(calculations.annualCashFlow))})` 
                  : `${formatCurrency(calculations.annualCashFlow)}`
                }
                isNegative={calculations.annualCashFlow < 0}
              />
            </>
          )}

          {/* BRRRR STRATEGY */}
          {strategy === 'brrrr' && (
            <>
              {/* PHASE 1: BUY */}
              <SectionHeader title="Phase 1: Buy" linkText="Adjust Terms" onLinkClick={onAdjustTerms} />
              <HighlightRow label="Purchase Price" value={`${formatCurrency(calculations.targetBuyPrice)}`} />
              <Row label="Hard Money Down (10%)" value={`${formatCurrency(calculations.targetBuyPrice * 0.10)}`} />
              <Row label="Closing Costs" value={`${formatCurrency(calculations.targetBuyPrice * 0.03)}`} />
              
              {/* PHASE 2: REHAB */}
              <SectionHeader title="Phase 2: Rehab" linkText="Adjust Rehab" onLinkClick={onAdjustExpenses} />
              <Row label="Rehab Budget" value={`${formatCurrency(rehabBudget)}`} />
              <Row label="Contingency" value={`${formatCurrency(rehabBudget * (contingencyPct / 100))}`} />
              <Row label="Holding Period" value={`${holdingPeriodMonths} months`} />
              <Row label="Monthly Holding Costs" value={`${formatCurrency(holdingCostsMonthly)}`} />
              <SummaryRow label="Total Rehab Cost" value={`${formatCurrency(rehabBudget * (1 + contingencyPct / 100) + holdingCostsMonthly * holdingPeriodMonths)}`} />
              
              {/* PHASE 3: RENT */}
              <SectionHeader title="Phase 3: Rent" linkText="Adjust Income" onLinkClick={onAdjustIncome} />
              <Row label="ARV" value={`${formatCurrency(arv || calculations.targetBuyPrice * 1.2)}`} />
              <Row label="Post-Rehab Rent" value={`${formatCurrency((postRehabMonthlyRent || monthlyRent) * 12)}/yr`} />
              
              {/* PHASE 4: REFINANCE */}
              <SectionHeader title="Phase 4: Refinance" linkText="Adjust Debt" onLinkClick={onAdjustDebt} />
              <Row label="Refinance LTV" value={`${refinanceLtv}%`} />
              <Row label="New Loan Amount" value={`${formatCurrency((arv || calculations.targetBuyPrice * 1.2) * (refinanceLtv / 100))}`} />
              <Row label="Refinance Rate" value={formatPercent(refinanceInterestRate || interestRate, { decimals: 2 })} />
              
              <TealHighlightRow 
                label="Cash Left in Deal" 
                value={`${formatCurrency(Math.max(0, 
                  (calculations.targetBuyPrice * 0.10) + 
                  (rehabBudget * (1 + contingencyPct / 100)) + 
                  (holdingCostsMonthly * holdingPeriodMonths) - 
                  ((arv || calculations.targetBuyPrice * 1.2) * (refinanceLtv / 100) * 0.95)
                ))}`}
              />
            </>
          )}

          {/* FLIP STRATEGY */}
          {strategy === 'flip' && (
            <>
              {/* PHASE 1: ACQUISITION */}
              <SectionHeader title="Phase 1: Acquisition" linkText="Adjust Terms" onLinkClick={onAdjustTerms} />
              <HighlightRow label="Purchase Price" value={`${formatCurrency(calculations.targetBuyPrice)}`} />
              <Row label="Closing Costs" value={`${formatCurrency(calculations.targetBuyPrice * 0.03)}`} />
              <Row label="Hard Money LTV" value={`${hardMoneyLtv}%`} />
              <Row label="Loan Points" value={`${formatCurrency(calculations.targetBuyPrice * (hardMoneyLtv / 100) * (loanPoints / 100))}`} />
              
              {/* PHASE 2: REHAB */}
              <SectionHeader title="Phase 2: Rehab" linkText="Adjust Rehab" onLinkClick={onAdjustExpenses} />
              <Row label="Rehab Budget" value={`${formatCurrency(rehabBudget)}`} />
              <Row label="Contingency" value={`${formatCurrency(rehabBudget * (contingencyPct / 100))}`} />
              <Row label="Rehab Timeline" value={`${rehabTimeMonths} months`} />
              <SummaryRow label="Total Rehab Cost" value={`${formatCurrency(rehabBudget * (1 + contingencyPct / 100))}`} />
              
              {/* PHASE 3: HOLDING */}
              <SectionHeader title="Phase 3: Holding Costs" />
              <Row label="Hard Money Interest" value={`${formatCurrency(calculations.targetBuyPrice * (hardMoneyLtv / 100) * (hardMoneyRate / 100) / 12 * (rehabTimeMonths + daysOnMarket / 30))}`} />
              <Row label="Taxes & Insurance" value={`${formatCurrency((calculations.propertyTaxes + calculations.insurance) / 12 * (rehabTimeMonths + daysOnMarket / 30))}`} />
              <Row label="Days on Market" value={`${daysOnMarket} days`} />
              
              {/* PHASE 4: SALE */}
              <SectionHeader title="Phase 4: Sale" />
              <Row label="ARV" value={`${formatCurrency(arv || calculations.targetBuyPrice * 1.35)}`} />
              <Row label="Selling Costs" value={`${formatCurrency((arv || calculations.targetBuyPrice * 1.35) * (sellingCostsPct / 100))}`} />
              <Row label="Capital Gains Tax" value={`${capitalGainsRate}%`} />
              
              <TealHighlightRow 
                label="Estimated Net Profit" 
                value={`${formatCurrency(
                  (arv || calculations.targetBuyPrice * 1.35) * (1 - sellingCostsPct / 100) -
                  calculations.targetBuyPrice * 1.03 -
                  rehabBudget * (1 + contingencyPct / 100) -
                  calculations.targetBuyPrice * (hardMoneyLtv / 100) * (hardMoneyRate / 100) / 12 * (rehabTimeMonths + daysOnMarket / 30) -
                  (calculations.propertyTaxes + calculations.insurance) / 12 * (rehabTimeMonths + daysOnMarket / 30)
                )}`}
              />
            </>
          )}

          {/* HOUSE HACK STRATEGY */}
          {strategy === 'house_hack' && (
            <>
              {/* PROPERTY */}
              <SectionHeader title="Property" linkText="Adjust Terms" onLinkClick={onAdjustTerms} />
              <HighlightRow label="Purchase Price" value={`${formatCurrency(calculations.targetBuyPrice)}`} />
              <Row label="Total Units" value={totalUnits.toString()} />
              <Row label="Owner Occupied" value={ownerOccupiedUnits.toString()} />
              <Row label="Rental Units" value={(totalUnits - ownerOccupiedUnits).toString()} />
              
              {/* FINANCING */}
              <SectionHeader title="Financing (FHA)" linkText="Adjust Debt" onLinkClick={onAdjustDebt} />
              <Row label="Down Payment (3.5%)" value={`${formatCurrency(calculations.targetBuyPrice * 0.035)}`} />
              <Row label="Loan Amount" value={`${formatCurrency(calculations.targetBuyPrice * 0.965)}`} />
              <Row label="Interest Rate" value={formatPercent(calculations.interestRate, { decimals: 2 })} />
              <Row label="PMI Rate" value={`${pmiRate}%`} />
              <Row label="Monthly PITI + PMI" value={`${formatCurrency(calculations.monthlyPI + calculations.propertyTaxes / 12 + calculations.insurance / 12 + calculations.targetBuyPrice * 0.965 * (pmiRate / 100) / 12)}`} />
              
              {/* RENTAL INCOME */}
              <SectionHeader title="Rental Income" linkText="Adjust Income" onLinkClick={onAdjustIncome} />
              <Row label="Avg Rent Per Unit" value={`${formatCurrency(avgRentPerUnit || monthlyRent / totalUnits)}`} />
              <Row label="Gross Rental Income" value={`${formatCurrency((avgRentPerUnit || monthlyRent / totalUnits) * (totalUnits - ownerOccupiedUnits))}/mo`} />
              <Row label="Less: Vacancy" value={`(${formatCurrency((avgRentPerUnit || monthlyRent / totalUnits) * (totalUnits - ownerOccupiedUnits) * (vacancyRate / 100))})`} isNegative />
              <SummaryRow label="Net Rental Income" value={`${formatCurrency((avgRentPerUnit || monthlyRent / totalUnits) * (totalUnits - ownerOccupiedUnits) * (1 - vacancyRate / 100))}/mo`} />
              
              {/* HOUSING COST */}
              <TealHighlightRow 
                label="Your Net Housing Cost" 
                value={`${formatCurrency(
                  calculations.monthlyPI + 
                  calculations.propertyTaxes / 12 + 
                  calculations.insurance / 12 + 
                  calculations.targetBuyPrice * 0.965 * (pmiRate / 100) / 12 -
                  (avgRentPerUnit || monthlyRent / totalUnits) * (totalUnits - ownerOccupiedUnits) * (1 - vacancyRate / 100)
                )}/mo`}
              />
            </>
          )}

          {/* WHOLESALE STRATEGY */}
          {strategy === 'wholesale' && (
            <>
              {/* PROPERTY ANALYSIS */}
              <SectionHeader title="Property Analysis" linkText="Adjust Terms" onLinkClick={onAdjustTerms} />
              <Row label="ARV" value={`${formatCurrency(arv || calculations.targetBuyPrice * 1.4)}`} />
              <Row label="Estimated Repairs" value={`${formatCurrency(estimatedRepairs)}`} />
              <HighlightRow label="70% Rule MAO" value={`${formatCurrency((arv || calculations.targetBuyPrice * 1.4) * 0.70 - estimatedRepairs)}`} />
              
              {/* CONTRACT TERMS */}
              <SectionHeader title="Contract Terms" />
              <Row label="Contract Price" value={`${formatCurrency(contractPrice || calculations.targetBuyPrice * 0.85)}`} />
              <Row label="Earnest Money" value={`${formatCurrency(earnestMoney)}`} />
              
              {/* ASSIGNMENT ANALYSIS */}
              <SectionHeader title="Assignment Analysis" />
              <Row label="Assignment Fee" value={`${formatCurrency(assignmentFee)}`} />
              <Row label="Marketing Costs" value={`${formatCurrency(marketingCosts)}`} />
              <Row label="Closing Costs" value={`${formatCurrency(wholesaleClosingCosts)}`} />
              <SummaryRow label="Total Cash at Risk" value={`${formatCurrency(earnestMoney + marketingCosts + wholesaleClosingCosts)}`} />
              
              <TealHighlightRow 
                label="Net Profit" 
                value={`${formatCurrency(assignmentFee - marketingCosts - wholesaleClosingCosts)}`}
              />
            </>
          )}
        </div>
      )}
    </div>
  </AuthGate>
  )
}

export default FinancialBreakdown
