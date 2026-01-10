'use client'

import React from 'react'
import { LoanStat, PieSlice, AmortizationRow } from './types'

/**
 * LoanSummary Component
 * 
 * Displays key loan statistics in a 4-cell grid.
 * Shows loan amount, monthly payment, total interest, and total payments.
 */

interface LoanSummaryProps {
  stats: LoanStat[]
  title?: string
}

export function LoanSummary({ stats, title }: LoanSummaryProps) {
  return (
    <div className="mb-4">
      {title && (
        <h4 className="text-[1.1rem] font-bold text-gray-700 dark:text-white/70 uppercase tracking-wide mb-3">
          {title}
        </h4>
      )}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center"
          >
            <div className="text-[1rem] font-bold text-teal">{stat.value}</div>
            <div className="text-[0.6rem] text-white/50 uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Helper function to create loan stats
 */
export function createLoanStats(
  loanAmount: number,
  monthlyPayment: number,
  totalInterest: number,
  totalPayments: number
): LoanStat[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return [
    { value: formatCurrency(loanAmount), label: 'Loan Amount' },
    { value: formatCurrency(monthlyPayment), label: 'Monthly P&I' },
    { value: formatCurrency(totalInterest), label: 'Total Interest' },
    { value: formatCurrency(totalPayments), label: 'Total Payments' }
  ]
}

/**
 * PieChartBreakdown Component
 * 
 * Visual pie chart showing principal vs interest breakdown.
 */

interface PieChartBreakdownProps {
  slices: PieSlice[]
  title?: string
  centerLabel?: string
  centerValue?: string
}

export function PieChartBreakdown({ 
  slices, 
  title,
  centerLabel,
  centerValue 
}: PieChartBreakdownProps) {
  const principalSlice = slices.find(s => s.color === 'principal')
  const interestSlice = slices.find(s => s.color === 'interest')

  // Calculate SVG arc paths
  const principalPercent = principalSlice?.percent || 50
  const interestPercent = interestSlice?.percent || 50
  
  // Convert percentage to degrees for the conic gradient
  const principalDegrees = (principalPercent / 100) * 360

  return (
    <div className="mb-4">
      {title && (
        <h4 className="text-[0.72rem] font-bold text-white/60 uppercase tracking-wide mb-3 text-center">
          {title}
        </h4>
      )}
      
      <div className="flex items-center justify-center gap-4">
        {/* Pie Chart */}
        <div className="relative w-28 h-28">
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(
                var(--color-teal) 0deg ${principalDegrees}deg,
                rgba(239,68,68,0.7) ${principalDegrees}deg 360deg
              )`
            }}
          />
          {/* Center hole */}
          <div className="absolute inset-3 bg-navy-800 rounded-full flex flex-col items-center justify-center">
            {centerLabel && (
              <span className="text-[0.5rem] text-white/50 uppercase">{centerLabel}</span>
            )}
            {centerValue && (
              <span className="text-[0.75rem] font-bold text-white">{centerValue}</span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-sm ${
                  slice.color === 'principal' ? 'bg-teal' : 'bg-red-500/70'
                }`}
              />
              <div>
                <div className="text-[0.7rem] font-semibold text-white">{slice.formattedAmount}</div>
                <div className="text-[0.55rem] text-white/50">{slice.label} ({slice.percent}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Helper function to create pie slices
 */
export function createPieSlices(
  principalAmount: number,
  interestAmount: number
): PieSlice[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const total = principalAmount + interestAmount
  const principalPercent = Math.round((principalAmount / total) * 100)
  const interestPercent = 100 - principalPercent

  return [
    {
      label: 'Principal',
      amount: principalAmount,
      formattedAmount: formatCurrency(principalAmount),
      percent: principalPercent,
      color: 'principal'
    },
    {
      label: 'Interest',
      amount: interestAmount,
      formattedAmount: formatCurrency(interestAmount),
      percent: interestPercent,
      color: 'interest'
    }
  ]
}

/**
 * AmortizationTable Component
 * 
 * Displays a yearly amortization schedule.
 */

interface AmortizationTableProps {
  rows: AmortizationRow[]
  title?: string
  maxRows?: number
}

export function AmortizationTable({ 
  rows, 
  title = '10-Year Amortization',
  maxRows = 10 
}: AmortizationTableProps) {
  const displayRows = rows.slice(0, maxRows)

  return (
    <div className="mb-4">
      <h4 className="text-[0.72rem] font-bold text-white/60 uppercase tracking-wide mb-2.5">
        {title}
      </h4>
      
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 text-[0.6rem] font-bold text-white/50 uppercase tracking-wide px-3 py-2 bg-white/[0.03]">
          <span>Year</span>
          <span className="text-right">Principal</span>
          <span className="text-right">Interest</span>
          <span className="text-right">Balance</span>
        </div>
        
        {/* Rows */}
        {displayRows.map((row, index) => (
          <div 
            key={row.year}
            className={`grid grid-cols-4 text-[0.72rem] px-3 py-2 ${
              index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
            }`}
          >
            <span className="text-white/70">{row.year}</span>
            <span className="text-right text-teal font-medium">{row.principal}</span>
            <span className="text-right text-red-400/80">{row.interest}</span>
            <span className="text-right text-white/60">{row.balance}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Helper function to generate amortization schedule
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  interestRate: number,
  loanTermYears: number = 30
): AmortizationRow[] {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const monthlyRate = interestRate / 12
  const totalPayments = loanTermYears * 12
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
    (Math.pow(1 + monthlyRate, totalPayments) - 1)

  const rows: AmortizationRow[] = []
  let balance = loanAmount

  for (let year = 1; year <= loanTermYears; year++) {
    let yearlyPrincipal = 0
    let yearlyInterest = 0

    for (let month = 1; month <= 12; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      
      yearlyPrincipal += principalPayment
      yearlyInterest += interestPayment
      balance -= principalPayment
    }

    rows.push({
      year,
      principal: formatCurrency(yearlyPrincipal),
      interest: formatCurrency(yearlyInterest),
      balance: formatCurrency(Math.max(0, balance))
    })
  }

  return rows
}

/**
 * FundingOverview Component
 * 
 * Combines loan summary, pie chart, and amortization in one view.
 */

interface FundingOverviewProps {
  loanAmount: number
  interestRate: number
  loanTermYears?: number
  downPayment: number
  closingCosts: number
  purchasePrice: number
}

export function FundingOverview({
  loanAmount,
  interestRate,
  loanTermYears = 30,
  downPayment,
  closingCosts,
  purchasePrice
}: FundingOverviewProps) {
  const monthlyRate = interestRate / 12
  const totalPayments = loanTermYears * 12
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  const totalInterest = (monthlyPayment * totalPayments) - loanAmount
  const totalPaid = monthlyPayment * totalPayments

  const stats = createLoanStats(loanAmount, monthlyPayment, totalInterest, totalPaid)
  const pieSlices = createPieSlices(loanAmount, totalInterest)
  const amortRows = generateAmortizationSchedule(loanAmount, interestRate, loanTermYears)

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="space-y-4">
      <LoanSummary stats={stats} title="Loan Overview" />
      
      <PieChartBreakdown 
        slices={pieSlices} 
        title="Principal vs Interest"
        centerLabel="Total"
        centerValue={formatCurrency(totalPaid)}
      />
      
      <AmortizationTable rows={amortRows} maxRows={10} />

      {/* Cash to Close */}
      <div className="bg-teal/[0.08] border border-teal/20 rounded-xl p-3.5">
        <h4 className="text-[0.65rem] font-bold text-teal uppercase tracking-wide mb-2">
          Cash to Close
        </h4>
        <div className="flex justify-between text-[0.75rem] text-white/70 mb-1">
          <span>Down Payment ({((downPayment / purchasePrice) * 100).toFixed(0)}%)</span>
          <span className="text-white font-semibold">{formatCurrency(downPayment)}</span>
        </div>
        <div className="flex justify-between text-[0.75rem] text-white/70 mb-1">
          <span>Closing Costs</span>
          <span className="text-white font-semibold">{formatCurrency(closingCosts)}</span>
        </div>
        <div className="flex justify-between text-[0.78rem] font-bold border-t border-white/10 pt-1.5 mt-1.5">
          <span className="text-white">Total Cash Needed</span>
          <span className="text-teal">{formatCurrency(downPayment + closingCosts)}</span>
        </div>
      </div>
    </div>
  )
}

export default LoanSummary
