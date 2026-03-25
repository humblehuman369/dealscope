'use client'

import React from 'react'

function formatCurrency(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

const colors = {
  brand: { blue: 'var(--accent-sky)' },
  text: { primary: 'var(--text-heading)', body: 'var(--text-body)' },
  ui: { border: 'var(--border-subtle)' },
} as const

export interface StrategyBreakdownProps {
  listPrice: number
  targetPrice: number
  loanAmount: number
  downPayment: number
  downPaymentPct: number
  closingCosts: number
  closingCostsPct: number
  rehabCost: number
  rate: number
  loanTermYears: number
  monthlyPI: number
  annualDebt: number
  propertyTaxes: number
  insurance: number
  mgmt: number
  mgmtPct: number
  maint: number
  maintPct: number
  reserves: number
  reservesPct: number
  totalExpenses: number
  monthlyRent: number
  annualRent: number
  vacancyLoss: number
  vacancyPct: number
  effectiveIncome: number
  isCompact?: boolean
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: color }}>
        <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color }}>{title}</span>
      </div>
    </div>
  )
}

function Row({ label, value, strike, color }: { label: string; value: string; strike?: boolean; color?: string }) {
  return (
    <div className="flex justify-between py-1.5 pl-6">
      <span className="text-base" style={{ color: colors.text.body }}>{label}</span>
      <span
        className="text-base font-semibold tabular-nums"
        style={{
          color: strike ? 'var(--text-body)' : (color || colors.text.primary),
          textDecoration: strike ? 'line-through' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function TotalRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex justify-between pt-2.5 pb-2.5 mt-1.5 pl-6"
      style={{ borderTop: `2px solid ${color}`, borderBottom: `2px solid ${color}` }}
    >
      <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{label}</span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{value}</span>
    </div>
  )
}

function WhatYoudPay(props: StrategyBreakdownProps) {
  return (
    <div>
      <SectionHeader title="What You'd Pay" color={colors.brand.blue} />
      <Row label="Market Price" value={formatCurrency(props.listPrice)} />
      <Row label="Target Buy" value={formatCurrency(props.targetPrice)} color={colors.brand.blue} />
      <Row label="Loan Amount" value={formatCurrency(props.loanAmount)} />
      <Row label={`Down Payment (${Math.round(props.downPaymentPct * 100)}%)`} value={formatCurrency(props.downPayment)} />
      <Row label={`Closing Costs (${Math.round(props.closingCostsPct * 100)}%)`} value={formatCurrency(props.closingCosts)} />
      {props.rehabCost > 0 && (
        <Row label="Rehab Budget" value={formatCurrency(props.rehabCost)} color={colors.brand.blue} />
      )}
      <TotalRow label="Cash Needed" value={formatCurrency(props.downPayment + props.closingCosts + props.rehabCost)} color={colors.brand.blue} />
    </div>
  )
}

function YourLoanPayment(props: StrategyBreakdownProps) {
  return (
    <div>
      <SectionHeader title="Your Loan Payment" color={colors.brand.blue} />
      <Row label="Interest Rate" value={`${(props.rate * 100).toFixed(1)}%`} />
      <Row label="Loan Term" value={`${props.loanTermYears} years`} />
      <Row label="Monthly Payment" value={formatCurrency(props.monthlyPI)} />
      <TotalRow label="Annual Payment" value={formatCurrency(props.annualDebt)} color={colors.brand.blue} />
    </div>
  )
}

function WhatItCosts(props: StrategyBreakdownProps) {
  return (
    <div>
      <SectionHeader title="What It Costs" color={colors.brand.blue} />
      <Row label="Property Tax" value={`${formatCurrency(props.propertyTaxes)}/yr`} />
      <Row label="Insurance" value={`${formatCurrency(props.insurance)}/yr`} />
      <Row label={`Management (${Math.round(props.mgmtPct * 100)}%)`} value={`${formatCurrency(props.mgmt)}/yr`} />
      <Row label={`Maintenance (${Math.round(props.maintPct * 100)}%)`} value={`${formatCurrency(props.maint)}/yr`} />
      <Row label={`Reserves (${Math.round(props.reservesPct * 100)}%)`} value={`${formatCurrency(props.reserves)}/yr`} />
      <TotalRow label="Total Costs" value={`${formatCurrency(props.totalExpenses)}/yr`} color={colors.brand.blue} />
    </div>
  )
}

function WhatYoudEarn(props: StrategyBreakdownProps) {
  return (
    <div>
      <SectionHeader title="What You'd Earn" color={colors.brand.blue} />
      <Row label="Monthly Rent" value={formatCurrency(props.monthlyRent)} />
      <Row label="Annual Gross" value={formatCurrency(props.annualRent)} />
      <div className="flex justify-between py-1.5 pl-6">
        <span className="text-base" style={{ color: colors.text.body }}>Vacancy Loss ({Math.round(props.vacancyPct * 100)}%)</span>
        <span className="text-base font-semibold tabular-nums" style={{ color: colors.brand.blue }}>({formatCurrency(props.vacancyLoss)})</span>
      </div>
      <TotalRow label="Effective Income" value={formatCurrency(props.effectiveIncome)} color={colors.brand.blue} />
    </div>
  )
}

export function StrategyBreakdown(props: StrategyBreakdownProps) {
  const { isCompact } = props

  if (isCompact) {
    return (
      <div className="flex flex-col gap-6">
        <WhatYoudPay {...props} />
        <hr style={{ borderColor: colors.ui.border }} />
        <YourLoanPayment {...props} />
        <hr style={{ borderColor: colors.ui.border }} />
        <WhatItCosts {...props} />
        <hr style={{ borderColor: colors.ui.border }} />
        <WhatYoudEarn {...props} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
      <div>
        <WhatYoudPay {...props} />
        <hr className="my-5" style={{ borderColor: colors.ui.border }} />
        <YourLoanPayment {...props} />
      </div>
      <div>
        <WhatItCosts {...props} />
        <hr className="my-5" style={{ borderColor: colors.ui.border }} />
        <WhatYoudEarn {...props} />
      </div>
    </div>
  )
}
