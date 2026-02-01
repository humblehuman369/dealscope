'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FinancialBreakdownProps {
  // Purchase Terms
  buyPrice: number
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
}

// Format currency
function formatCurrency(value: number, showCents = false): string {
  if (showCents) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(value).toLocaleString('en-US')
}

// Format percentage
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

// Section Header Component
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="bg-[#0A1628] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5">
      {title}
    </div>
  )
}

// Row Component
function Row({ 
  label, 
  value, 
  isSubtotal = false, 
  isNegative = false,
  indent = false,
  highlight = false,
}: { 
  label: string
  value: string
  isSubtotal?: boolean
  isNegative?: boolean
  indent?: boolean
  highlight?: boolean
}) {
  return (
    <div 
      className={`flex justify-between items-center px-3 py-1.5 ${
        isSubtotal ? 'bg-[#F8FAFC] font-semibold border-t border-[#E2E8F0]' : ''
      } ${highlight ? 'bg-[#F0FDFA]' : ''}`}
    >
      <span className={`text-[12px] ${indent ? 'pl-2' : ''} ${isSubtotal ? 'text-[#0A1628]' : 'text-[#64748B]'}`}>
        {label}
      </span>
      <span className={`text-[12px] font-medium ${
        isNegative ? 'text-red-600' : isSubtotal ? 'text-[#0A1628]' : 'text-[#0A1628]'
      }`}>
        {value}
      </span>
    </div>
  )
}

export function FinancialBreakdown({
  buyPrice,
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
}: FinancialBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate all financial metrics
  const calculations = useMemo(() => {
    // Purchase Terms
    const downPayment = buyPrice * (downPaymentPct / 100)
    const loanAmount = buyPrice - downPayment
    
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
    const monthlyCashFlow = annualCashFlow / 12
    
    return {
      // Purchase Terms
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
      monthlyCashFlow,
    }
  }, [
    buyPrice, downPaymentPct, interestRate, loanTermYears,
    monthlyRent, vacancyRate, otherIncome,
    propertyTaxes, insurance, hoaFees, managementRate, maintenanceRate,
    utilities, landscaping, pestControl, capexRate, otherExpenses
  ])

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-[#F8FAFC] transition-colors"
      >
        <span className="text-xs font-semibold text-[#0891B2] uppercase tracking-wide">
          Financial Breakdown
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#64748B]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
            
            {/* PURCHASE TERMS */}
            <SectionHeader title="Purchase Terms" />
            <Row label="Down Payment" value={`$  ${formatCurrency(calculations.downPayment)}`} />
            <Row label="Down Payment %" value={formatPercent(calculations.downPaymentPct)} />
            <Row label="Loan Amount" value={`$  ${formatCurrency(calculations.loanAmount)}`} />
            <Row label="Interest Rate" value={formatPercent(calculations.interestRate)} />
            <Row label="Loan Term (Years)" value={calculations.loanTermYears.toFixed(2)} />
            <Row label="Monthly Payment (P&I)" value={`$  ${formatCurrency(calculations.monthlyPI)}`} />
            
            {/* Spacer */}
            <div className="h-3 bg-white" />
            
            {/* INCOME */}
            <SectionHeader title="Income" />
            <Row label="Gross Scheduled Rent" value={`$  ${formatCurrency(calculations.annualGrossRent)}`} />
            <Row 
              label="Less: Vacancy Allowance" 
              value={`$  (${formatCurrency(calculations.vacancyAllowance)})`} 
              isNegative 
            />
            <Row label="Other Income" value={`$  ${formatCurrency(calculations.otherIncome)}`} />
            <Row 
              label="EFFECTIVE GROSS INCOME" 
              value={`$  ${formatCurrency(calculations.effectiveGrossIncome)}`} 
              isSubtotal 
            />
            
            {/* Spacer */}
            <div className="h-3 bg-white" />
            
            {/* OPERATING EXPENSES */}
            <SectionHeader title="Operating Expenses" />
            <Row label="Property Taxes" value={`$  ${formatCurrency(calculations.propertyTaxes)}`} />
            <Row label="Insurance" value={`$  ${formatCurrency(calculations.insurance)}`} />
            <Row label="HOA Fees" value={calculations.hoaFees > 0 ? `$  ${formatCurrency(calculations.hoaFees)}` : '$  -'} />
            <Row 
              label="Property Management" 
              value={calculations.annualManagement > 0 ? `$  ${formatCurrency(calculations.annualManagement)}` : '$  -'} 
            />
            <Row label="Maintenance & Repairs" value={`$  ${formatCurrency(calculations.annualMaintenance)}`} />
            <Row label="Utilities" value={calculations.annualUtilities > 0 ? `$  ${formatCurrency(calculations.annualUtilities)}` : '$  -'} />
            <Row label="Landscaping" value={calculations.annualLandscaping > 0 ? `$  ${formatCurrency(calculations.annualLandscaping)}` : '$  -'} />
            <Row label="Pest Control" value={calculations.annualPestControl > 0 ? `$  ${formatCurrency(calculations.annualPestControl)}` : '$  -'} />
            <Row label="CapEx Reserve" value={`$  ${formatCurrency(calculations.annualCapex)}`} />
            <Row label="Other Expenses" value={calculations.annualOther > 0 ? `$  ${formatCurrency(calculations.annualOther)}` : '$  -'} />
            <Row 
              label="TOTAL OPERATING EXPENSES" 
              value={`$  ${formatCurrency(calculations.totalOperatingExpenses)}`} 
              isSubtotal 
            />
            
            {/* Spacer */}
            <div className="h-3 bg-white" />
            
            {/* NET OPERATING INCOME */}
            <div className="bg-[#1E3A5F] text-white flex justify-between items-center px-3 py-2">
              <span className="text-[12px] font-bold uppercase">Net Operating Income (NOI)</span>
              <span className="text-[14px] font-bold">${formatCurrency(calculations.noi)}</span>
            </div>
            
            {/* Spacer */}
            <div className="h-3 bg-white" />
            
            {/* DEBT SERVICE */}
            <SectionHeader title="Debt Service" />
            <Row label="Annual Mortgage (P&I)" value={`$  ${formatCurrency(calculations.annualDebtService)}`} />
            
            {/* Spacer */}
            <div className="h-3 bg-white" />
            
            {/* PRE-TAX CASH FLOW */}
            <div className={`flex justify-between items-center px-3 py-2 ${
              calculations.annualCashFlow >= 0 ? 'bg-[#1E3A5F]' : 'bg-[#7F1D1D]'
            } text-white`}>
              <span className="text-[12px] font-bold uppercase">Pre-Tax Cash Flow</span>
              <span className={`text-[14px] font-bold ${calculations.annualCashFlow < 0 ? 'text-red-300' : ''}`}>
                ${calculations.annualCashFlow < 0 ? '(' : ''}{formatCurrency(Math.abs(calculations.annualCashFlow))}{calculations.annualCashFlow < 0 ? ')' : ''}
              </span>
            </div>
            <Row 
              label="Monthly Cash Flow" 
              value={`$  ${calculations.monthlyCashFlow < 0 ? '(' : ''}${formatCurrency(Math.abs(calculations.monthlyCashFlow))}${calculations.monthlyCashFlow < 0 ? ')' : ''}`}
              isNegative={calculations.monthlyCashFlow < 0}
            />
            
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialBreakdown
