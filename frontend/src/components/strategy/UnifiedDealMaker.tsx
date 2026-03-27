'use client'

import React from 'react'
import { DealMakerSlider } from '@/components/deal-maker/DealMakerSlider'
import type { SliderConfig } from '@/components/deal-maker/types'
import type { InlineDealMakerValues } from './InlineDealMakerPanel'

function formatCurrency(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

const C = {
  blue: 'var(--accent-sky)',
  heading: 'var(--text-heading)',
  body: 'var(--text-body)',
  border: 'var(--border-subtle)',
  positive: 'var(--status-positive)',
  negative: 'var(--status-negative)',
} as const

export interface UnifiedDealMakerProps {
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
  vacancyLoss: number
  vacancyPct: number
  totalExpenses: number
  monthlyRent: number
  annualRent: number
  effectiveIncome: number
  sliderValues: InlineDealMakerValues
  onSliderChange: (field: keyof InlineDealMakerValues, value: number) => void
  capRate: number | null
  cashOnCash: number | null
  annualCashFlow: number
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center mb-3 mt-1">
      <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: C.blue }}>
        <span className="text-[1rem] font-bold uppercase tracking-wide" style={{ color: C.blue }}>{title}</span>
      </div>
    </div>
  )
}

function DisplayRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 pl-4 pr-1" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.body }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right min-w-[100px]" style={{ color: color ?? C.heading }}>{value}</span>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between items-center py-2.5 pl-4 pr-1 mt-1"
      style={{ borderTop: `2px solid ${C.blue}`, borderBottom: `2px solid ${C.blue}` }}
    >
      <span className="font-semibold tabular-nums text-[0.95rem]" style={{ color: C.heading }}>{label}</span>
      <span className="font-bold tabular-nums text-[0.95rem] text-right min-w-[100px]" style={{ color: C.heading }}>{value}</span>
    </div>
  )
}

interface SliderRowProps {
  config: SliderConfig
  value: number
  onChange: (value: number) => void
  suffix?: string
  listPrice: number
}

function dynamicMax(sliderId: string, listPrice: number): Partial<SliderConfig> {
  if (sliderId === 'buyPrice' || sliderId === 'marketValue' || sliderId === 'arv') {
    return { max: Math.max(2000000, listPrice * 2) }
  }
  return {}
}

function SliderRow({ config, value, onChange, suffix, listPrice }: SliderRowProps) {
  const overrides = dynamicMax(config.id as string, listPrice)
  const mergedConfig = { ...config, ...overrides }
  return (
    <div className="py-1 pl-4 pr-1" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{ ['--dealmaker-accent' as string]: C.blue }}>
        <DealMakerSlider
          config={mergedConfig}
          value={value}
          onChange={onChange}
        />
      </div>
      {suffix && (
        <div className="flex justify-end -mt-1 mb-1">
          <span className="text-xs tabular-nums" style={{ color: C.body }}>{suffix}</span>
        </div>
      )}
    </div>
  )
}

function SectionDivider() {
  return <div className="my-4" style={{ borderBottom: `1px solid ${C.border}` }} />
}

export function UnifiedDealMaker(props: UnifiedDealMakerProps) {
  const {
    listPrice,
    targetPrice,
    loanAmount,
    downPayment,
    downPaymentPct,
    closingCosts,
    closingCostsPct,
    rehabCost,
    rate,
    loanTermYears,
    monthlyPI,
    annualDebt,
    propertyTaxes,
    insurance,
    mgmt,
    mgmtPct,
    maint,
    maintPct,
    vacancyLoss,
    vacancyPct,
    totalExpenses,
    monthlyRent,
    annualRent,
    sliderValues,
    onSliderChange,
    capRate,
    cashOnCash,
    annualCashFlow,
  } = props

  const totalExpensesWithMortgage = totalExpenses + annualDebt

  return (
    <div className="flex flex-col gap-5">
      {/* WHAT YOU'D PAY */}
      <div>
        <SectionHeader title="What You'd Pay" />
        <DisplayRow label="Market Price" value={formatCurrency(listPrice)} />
        <SliderRow
          config={{ id: 'buyPrice' as any, label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency',
            helpText: 'The price you offer the seller. Lower buy prices improve your cash flow and return metrics.' }}
          value={sliderValues.buyPrice}
          onChange={(v) => onSliderChange('buyPrice', v)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'downPaymentPercent' as any, label: 'Down Payment', min: 0, max: 0.50, step: 0.005, format: 'percentage',
            helpText: 'Percentage of buy price paid upfront in cash. Higher down payments reduce your mortgage but require more cash at closing.' }}
          value={sliderValues.downPayment}
          onChange={(v) => onSliderChange('downPayment', v)}
          suffix={formatCurrency(downPayment)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'closingCostsPercent' as any, label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage',
            helpText: 'Fees paid at closing — title insurance, appraisal, attorney, etc. Typically 2–5% of the purchase price.' }}
          value={sliderValues.closingCosts}
          onChange={(v) => onSliderChange('closingCosts', v)}
          suffix={formatCurrency(closingCosts)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'rehabBudget' as any, label: 'Rehab Budget', min: 0, max: 100000, step: 1000, format: 'currency',
            helpText: 'Estimated cost of repairs and improvements needed. Get contractor bids for accuracy.' }}
          value={sliderValues.rehabBudget}
          onChange={(v) => onSliderChange('rehabBudget', v)}
          listPrice={listPrice}
        />
        <TotalRow label="Cash Needed" value={formatCurrency(downPayment + closingCosts + rehabCost)} />
      </div>

      <SectionDivider />

      {/* YOUR LOAN PAYMENT */}
      <div>
        <SectionHeader title="Your Loan Payment" />
        <DisplayRow label="Loan Amount" value={formatCurrency(loanAmount)} />
        <SliderRow
          config={{ id: 'interestRate' as any, label: 'Interest Rate', min: 0.04, max: 0.12, step: 0.00125, format: 'percentage',
            helpText: 'Annual rate on your mortgage loan. Even small changes significantly impact your monthly payment and long-term cost.' }}
          value={sliderValues.interestRate}
          onChange={(v) => onSliderChange('interestRate', v)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'loanTermYears' as any, label: 'Loan Term', min: 10, max: 30, step: 5, format: 'years',
            helpText: '30-year terms have lower monthly payments but pay more total interest. 15-year terms build equity faster.' }}
          value={sliderValues.loanTerm}
          onChange={(v) => onSliderChange('loanTerm', v)}
          listPrice={listPrice}
        />
        <DisplayRow label="Monthly Payment" value={formatCurrency(monthlyPI)} />
        <TotalRow label="Annual Payment" value={formatCurrency(annualDebt)} />
      </div>

      <SectionDivider />

      {/* WHAT IT COSTS */}
      <div>
        <SectionHeader title="What It Costs" />
        <SliderRow
          config={{ id: 'annualPropertyTax' as any, label: 'Property Tax', min: 0, max: 20000, step: 100, format: 'currencyPerYear',
            helpText: 'Annual property tax bill from the county. Verify with the county assessor for accuracy.' }}
          value={sliderValues.propertyTaxes}
          onChange={(v) => onSliderChange('propertyTaxes', v)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'annualInsurance' as any, label: 'Insurance', min: 0, max: 10000, step: 100, format: 'currencyPerYear',
            helpText: 'Annual homeowner\u2019s insurance premium. Get quotes from your insurer for the most accurate number.' }}
          value={sliderValues.insurance}
          onChange={(v) => onSliderChange('insurance', v)}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'managementRate' as any, label: 'Management', min: 0, max: 0.15, step: 0.01, format: 'percentage',
            helpText: 'Percentage of rent paid to a property manager. 0% if self-managing; 6–10% is typical for professional management.' }}
          value={sliderValues.managementRate}
          onChange={(v) => onSliderChange('managementRate', v)}
          suffix={`${formatCurrency(mgmt)}/yr`}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'maintenanceRate' as any, label: 'Maintenance', min: 0, max: 0.15, step: 0.01, format: 'percentage',
            helpText: 'Percentage of rent set aside for ongoing maintenance and repairs. 5% is a common estimate.' }}
          value={maintPct}
          onChange={() => {}}
          suffix={`${formatCurrency(maint)}/yr`}
          listPrice={listPrice}
        />
        <SliderRow
          config={{ id: 'vacancyRate' as any, label: 'Vacancy', min: 0, max: 0.20, step: 0.01, format: 'percentage',
            helpText: 'Percentage of time the property sits empty between tenants. 5% is roughly 18 days per year vacant.' }}
          value={sliderValues.vacancyRate}
          onChange={(v) => onSliderChange('vacancyRate', v)}
          suffix={`${formatCurrency(vacancyLoss)}/yr`}
          listPrice={listPrice}
        />
        <TotalRow label="Total Expenses" value={`${formatCurrency(totalExpensesWithMortgage)}/yr`} />
      </div>

      <SectionDivider />

      {/* WHAT YOU'D EARN */}
      <div>
        <SectionHeader title="What You'd Earn" />
        <SliderRow
          config={{ id: 'monthlyRent' as any, label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth',
            helpText: 'Expected monthly rental income based on comparable rentals in the area. Adjust if you have better local data.' }}
          value={sliderValues.monthlyRent}
          onChange={(v) => onSliderChange('monthlyRent', v)}
          listPrice={listPrice}
        />
        <DisplayRow label="Gross Monthly" value={formatCurrency(monthlyRent)} />
        <DisplayRow
          label="Annual Cash Flow"
          value={annualCashFlow >= 0 ? formatCurrency(annualCashFlow) : `(${formatCurrency(Math.abs(annualCashFlow))})`}
          color={annualCashFlow >= 0 ? C.positive : C.negative}
        />
        <DisplayRow
          label="Cap Rate"
          value={capRate !== null ? `${capRate.toFixed(2)}%` : '—'}
        />
        <DisplayRow
          label="Cash-on-Cash"
          value={cashOnCash !== null ? `${cashOnCash.toFixed(2)}%` : '—'}
        />
      </div>
    </div>
  )
}
