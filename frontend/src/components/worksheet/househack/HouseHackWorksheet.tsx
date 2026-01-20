'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { HousingCostGauge } from '../charts/HousingCostGauge'
import { UnitBreakdown } from '../charts/UnitBreakdown'
import { MoveOutSummary } from '../charts/MoveOutSummary'
import { useHouseHackWorksheetCalculator } from '@/hooks/useHouseHackWorksheetCalculator'
import { Home, Percent, DollarSign, Users, Building2, ArrowRightLeft } from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface HouseHackWorksheetProps {
  property: SavedProperty
  onExportPDF?: () => void
}

// ============================================
// FORMATTERS
// ============================================
const fmt = {
  currency: (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val),
  percent: (val: number) => `${val.toFixed(1)}%`,
  ratio: (val: number) => val.toFixed(2),
}

// ============================================
// DEAL SCORE HELPERS
// ============================================
const getDealScoreLabel = (score: number): string => {
  if (score >= 85) return 'Excellent Deal'
  if (score >= 70) return 'Great Deal'
  if (score >= 55) return 'Good Deal'
  return 'Fair Deal'
}

const getDealScoreColor = (score: number): string => {
  if (score >= 70) return 'text-violet-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

const getDealScoreBg = (score: number): string => {
  if (score >= 70) return 'bg-violet-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// ============================================
// IQ VERDICT CARD
// ============================================
interface IQVerdictCardProps {
  dealScore: number
  housingCost: number
  marketRent: number
  savingsVsRenting: number
  cocReturn: number
  fullRentalCashFlow: number
  targetSavings?: number
  targetCoC?: number
}

function IQVerdictCard({
  dealScore,
  housingCost,
  marketRent,
  savingsVsRenting,
  cocReturn,
  fullRentalCashFlow,
  targetSavings = 500,
  targetCoC = 8,
}: IQVerdictCardProps) {
  const savingsMet = savingsVsRenting >= targetSavings
  const cocMet = cocReturn >= targetCoC
  const liveFree = housingCost <= 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      {/* Header */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        IQ VERDICT
      </div>

      {/* Deal Score Circle */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(dealScore / 100) * 213.6} 213.6`}
              className={getDealScoreColor(dealScore)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${getDealScoreColor(dealScore)}`}>
              {dealScore}
            </span>
          </div>
        </div>
        <div>
          <div className={`text-lg font-bold ${getDealScoreColor(dealScore)}`}>
            {getDealScoreLabel(dealScore)}
          </div>
          <div className="text-sm text-slate-500">
            {liveFree ? '🎉 Live FREE!' : housingCost < marketRent ? 'Below market rent' : 'Above market rent'}
          </div>
        </div>
      </div>

      {/* Returns vs Targets */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          RETURNS VS TARGETS
        </div>

        {/* Monthly Savings */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Monthly Savings</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${savingsMet ? 'text-violet-600' : 'text-slate-800'}`}>
              {fmt.currency(savingsVsRenting)}
            </span>
            <span className="text-xs text-slate-400">/ {fmt.currency(targetSavings)}</span>
            {savingsMet ? (
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-violet-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* CoC Return (Move Out) */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">CoC (Move Out)</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${cocMet ? 'text-violet-600' : 'text-slate-800'}`}>
              {fmt.percent(cocReturn)}
            </span>
            <span className="text-xs text-slate-400">/ {targetCoC}%</span>
            {cocMet ? (
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-violet-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Free Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Live Free?</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${liveFree ? 'text-violet-600' : 'text-slate-800'}`}>
              {liveFree ? 'Yes!' : fmt.currency(housingCost)}
            </span>
            <span className="text-xs text-slate-400">/ $0</span>
            {liveFree ? (
              <span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-violet-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PRICE POSITION CARD
// ============================================
interface PricePositionCardProps {
  purchasePrice: number
  listPrice: number
  breakevenPrice: number
  targetCoCPrice: number
  fhaMaxPrice: number
}

function PricePositionCard({
  purchasePrice,
  listPrice,
  breakevenPrice,
  targetCoCPrice,
  fhaMaxPrice,
}: PricePositionCardProps) {
  // Calculate position percentage (0-100) relative to list price
  const maxPrice = Math.max(listPrice, fhaMaxPrice) * 1.1
  const positionPct = Math.min(100, Math.max(0, (purchasePrice / maxPrice) * 100))
  const breakevenLine = Math.min(100, Math.max(0, (breakevenPrice / maxPrice) * 100))
  const targetLine = Math.min(100, Math.max(0, (targetCoCPrice / maxPrice) * 100))

  // Determine status
  const isExcellent = purchasePrice <= targetCoCPrice
  const isGood = purchasePrice > targetCoCPrice && purchasePrice <= breakevenPrice
  const isOkay = purchasePrice > breakevenPrice && purchasePrice <= listPrice

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        PRICE POSITION
      </div>

      {/* Gauge */}
      <div className="relative h-8 bg-gradient-to-r from-violet-500 via-amber-400 to-red-500 rounded-full mb-6 overflow-hidden">
        {/* Target CoC marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${targetLine}%` }}
        />
        {/* Breakeven marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${breakevenLine}%` }}
        />
        {/* Current position indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-slate-800"
          style={{ left: `calc(${positionPct}% - 8px)` }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">List Price</span>
          <span className="font-semibold text-slate-800">{fmt.currency(listPrice)}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">Your Offer</span>
          <span className={`font-semibold ${isExcellent ? 'text-violet-600' : isGood ? 'text-amber-600' : 'text-red-600'}`}>
            {fmt.currency(purchasePrice)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">Breakeven</span>
          <span className="font-semibold text-slate-800">{fmt.currency(breakevenPrice)}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">10% CoC Target</span>
          <span className="font-semibold text-slate-800">{fmt.currency(targetCoCPrice)}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// KEY METRICS GRID
// ============================================
interface KeyMetric {
  label: string
  value: string
  highlight?: boolean
  positive?: boolean
  negative?: boolean
}

function KeyMetricsGrid({ metrics }: { metrics: KeyMetric[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        KEY METRICS
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`py-3 px-4 rounded-lg ${
              metric.highlight ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50'
            }`}
          >
            <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
            <div
              className={`text-lg font-bold ${
                metric.positive
                  ? 'text-violet-600'
                  : metric.negative
                  ? 'text-red-600'
                  : metric.highlight
                  ? 'text-violet-700'
                  : 'text-slate-800'
              }`}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function HouseHackWorksheet({ property, onExportPDF }: HouseHackWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useHouseHackWorksheetCalculator(property)
  const unitsCount = inputs.property_type === 'rooms' ? 2 : Number.parseInt(inputs.property_type, 10)

  // Use ORIGINAL values from property for stable slider ranges
  const originalPrice = property.property_data_snapshot?.listPrice || inputs.purchase_price || 500000
  const originalRent = property.property_data_snapshot?.monthlyRent || inputs.unit2_rent || 1500

  // Housing cost color
  const housingCostColor =
    (result?.your_housing_cost ?? 0) <= 0
      ? 'text-violet-600'
      : (result?.your_housing_cost ?? 0) <= inputs.owner_market_rent
      ? 'text-teal-600'
      : 'text-red-500'

  return (
    <div className="min-h-screen bg-slate-50 pt-12">
      {/* WorksheetTabNav - sticky below header */}
      <div className="sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav
            propertyId={property.id}
            strategy="househack"
          />
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {getDisplayAddress(property) || 'House Hack Analysis'}
              </h1>
              <p className="text-sm text-slate-500">House Hack Strategy Worksheet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error/Loading State */}
        {(isCalculating || error) && (
          <div className={`mb-4 p-3 rounded-lg ${error ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'} text-sm`}>
            {error ? `Calculation error: ${error}` : 'Recalculating worksheet metrics...'}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white">
            <div className="text-xs font-medium text-violet-100 mb-1">Your Housing Cost</div>
            <div className="text-xl font-bold">{fmt.currency(result?.your_housing_cost ?? 0)}</div>
            <div className="text-xs text-violet-200">Per month</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Rental Income</div>
            <div className="text-xl font-bold text-teal-600">{fmt.currency(result?.rental_income ?? 0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Cash Needed</div>
            <div className="text-xl font-bold text-slate-800">{fmt.currency(result?.total_cash_needed ?? 0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">If You Move Out</div>
            <div className="text-xl font-bold text-teal-600">{fmt.currency(result?.full_rental_cash_flow ?? 0)}/mo</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">CoC Return</div>
            <div className="text-xl font-bold text-violet-600">{fmt.percent(result?.coc_return ?? 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white">
            <div className="text-xs font-medium text-slate-300 mb-1">Deal Score</div>
            <div className="text-xl font-bold">{result?.deal_score ?? 0}</div>
            <div className="text-xs text-slate-400">{getDealScoreLabel(result?.deal_score ?? 0).replace(' Deal', '')}</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6">
          {/* Left Column - Worksheet Inputs */}
          <div className="space-y-4">
            {/* Property & Purchase */}
            <SectionCard title="Property & Purchase">
              <DataRow label="Property Type">
                <select
                  className="w-full max-w-[180px] px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  value={inputs.property_type}
                  aria-label="Property type"
                  onChange={(event) => updateInput('property_type', event.target.value as typeof inputs.property_type)}
                >
                  <option value="2">Duplex (2 Units)</option>
                  <option value="3">Triplex (3 Units)</option>
                  <option value="4">Fourplex (4 Units)</option>
                  <option value="1">SFH with ADU</option>
                  <option value="rooms">Room Rental</option>
                </select>
              </DataRow>
              <DataRow label="Purchase Price" icon={<Home className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.purchase_price}
                  onChange={(val) => updateInput('purchase_price', val)}
                  format="currency"
                  min={Math.round(originalPrice * 0.5)}
                  max={Math.round(originalPrice * 1.5)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Down Payment" hasSlider>
                <EditableField
                  value={inputs.down_payment_pct}
                  onChange={(val) => updateInput('down_payment_pct', val)}
                  format="percent"
                  min={0.035}
                  max={0.25}
                  step={0.005}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Closing Costs" hasSlider>
                <EditableField
                  value={inputs.closing_costs}
                  onChange={(val) => updateInput('closing_costs', val)}
                  format="currency"
                  min={0}
                  max={Math.round(originalPrice * 0.05)}
                  step={500}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Cash Needed" isTotal>
                <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Financing */}
            <SectionCard title="Financing">
              <DataRow label="Loan Amount">
                <DisplayField value={result?.loan_amount ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Loan Type">
                <select
                  className="w-full max-w-[180px] px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  value={inputs.loan_type}
                  aria-label="Loan type"
                  onChange={(event) => updateInput('loan_type', event.target.value as typeof inputs.loan_type)}
                >
                  <option value="fha">FHA (3.5% min)</option>
                  <option value="conventional">Conventional (5% min)</option>
                  <option value="va">VA (0% down)</option>
                </select>
              </DataRow>
              <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.interest_rate}
                  onChange={(val) => updateInput('interest_rate', val)}
                  format="percent"
                  min={0.04}
                  max={0.10}
                  step={0.00125}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Loan Term" hasSlider>
                <EditableField
                  value={inputs.loan_term_years}
                  onChange={(val) => updateInput('loan_term_years', Math.round(val))}
                  format="years"
                  min={15}
                  max={30}
                  step={5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="PMI Rate" hasSlider>
                <EditableField
                  value={inputs.pmi_rate}
                  onChange={(val) => updateInput('pmi_rate', val)}
                  format="percent"
                  min={0}
                  max={0.02}
                  step={0.001}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Monthly Payment" isTotal>
                <DisplayField value={result?.monthly_piti ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Rental Income */}
            <SectionCard title="Rental Income">
              <DataRow label="Unit 2 Rent" hasSlider>
                <EditableField
                  value={inputs.unit2_rent}
                  onChange={(val) => updateInput('unit2_rent', val)}
                  format="currency"
                  min={Math.round(originalRent * 0.5)}
                  max={Math.round(originalRent * 2)}
                  step={50}
                  showSlider={true}
                />
              </DataRow>
              {unitsCount >= 3 && (
                <DataRow label="Unit 3 Rent" hasSlider>
                  <EditableField
                    value={inputs.unit3_rent}
                    onChange={(val) => updateInput('unit3_rent', val)}
                    format="currency"
                    min={Math.round(originalRent * 0.5)}
                    max={Math.round(originalRent * 2)}
                    step={50}
                    showSlider={true}
                  />
                </DataRow>
              )}
              {unitsCount >= 4 && (
                <DataRow label="Unit 4 Rent" hasSlider>
                  <EditableField
                    value={inputs.unit4_rent}
                    onChange={(val) => updateInput('unit4_rent', val)}
                    format="currency"
                    min={Math.round(originalRent * 0.5)}
                    max={Math.round(originalRent * 2)}
                    step={50}
                    showSlider={true}
                  />
                </DataRow>
              )}
              <DataRow label="Vacancy Rate" hasSlider>
                <EditableField
                  value={inputs.vacancy_rate}
                  onChange={(val) => updateInput('vacancy_rate', val)}
                  format="percent"
                  min={0}
                  max={0.15}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Effective Rental Income" isTotal>
                <DisplayField value={result?.rental_income ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Operating Expenses */}
            <SectionCard title="Operating Expenses">
              <DataRow label="Property Taxes" hasSlider>
                <EditableField
                  value={inputs.property_taxes_monthly}
                  onChange={(val) => updateInput('property_taxes_monthly', val)}
                  format="currency"
                  min={100}
                  max={1500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Insurance" hasSlider>
                <EditableField
                  value={inputs.insurance_monthly}
                  onChange={(val) => updateInput('insurance_monthly', val)}
                  format="currency"
                  min={50}
                  max={500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Maintenance" hasSlider>
                <EditableField
                  value={inputs.maintenance_pct}
                  onChange={(val) => updateInput('maintenance_pct', val)}
                  format="percent"
                  min={0}
                  max={0.10}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="CapEx Reserve" hasSlider>
                <EditableField
                  value={inputs.capex_pct}
                  onChange={(val) => updateInput('capex_pct', val)}
                  format="percent"
                  min={0}
                  max={0.10}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Utilities (Your Share)" hasSlider>
                <EditableField
                  value={inputs.utilities_monthly}
                  onChange={(val) => updateInput('utilities_monthly', val)}
                  format="currency"
                  min={0}
                  max={500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Monthly Expenses" isTotal>
                <DisplayField value={result?.total_monthly_expenses ?? 0} format="currency" isNegative />
              </DataRow>
            </SectionCard>

            {/* Your Housing Cost */}
            <SectionCard title="Your Housing Cost">
              <DataRow label="Mortgage + PMI">
                <DisplayField value={result?.monthly_piti ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Operating Expenses">
                <DisplayField value={result?.total_monthly_expenses ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Rental Income Offset">
                <DisplayField value={-(result?.rental_income ?? 0)} format="currency" isPositive />
              </DataRow>
              <DataRow label="Your Net Housing Cost" isTotal>
                <span className={`text-right min-w-[100px] flex-shrink-0 font-semibold ${housingCostColor}`}>
                  {fmt.currency(result?.your_housing_cost ?? 0)}
                </span>
              </DataRow>
              <DataRow label="Market Rent Equivalent" hasSlider>
                <EditableField
                  value={inputs.owner_market_rent}
                  onChange={(val) => updateInput('owner_market_rent', val)}
                  format="currency"
                  min={500}
                  max={5000}
                  step={50}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Monthly Savings vs Renting" isHighlight>
                <DisplayField
                  value={result?.savings_vs_renting ?? 0}
                  format="currency"
                  isPositive={(result?.savings_vs_renting ?? 0) >= 0}
                  isNegative={(result?.savings_vs_renting ?? 0) < 0}
                />
              </DataRow>
            </SectionCard>
          </div>

          {/* Right Column - Insights Panel */}
          <div className="space-y-4">
            {/* IQ Verdict */}
            <IQVerdictCard
              dealScore={result?.deal_score ?? 0}
              housingCost={result?.your_housing_cost ?? 0}
              marketRent={inputs.owner_market_rent}
              savingsVsRenting={result?.savings_vs_renting ?? 0}
              cocReturn={result?.coc_return ?? 0}
              fullRentalCashFlow={result?.full_rental_cash_flow ?? 0}
            />

            {/* Price Position */}
            <PricePositionCard
              purchasePrice={inputs.purchase_price}
              listPrice={inputs.list_price}
              breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
              targetCoCPrice={result?.target_coc_price ?? 0}
              fhaMaxPrice={inputs.fha_max_price}
            />

            {/* Key Metrics */}
            <KeyMetricsGrid
              metrics={[
                { label: 'Housing Cost', value: fmt.currency(result?.your_housing_cost ?? 0), highlight: true },
                { label: 'Monthly Savings', value: fmt.currency(result?.savings_vs_renting ?? 0), positive: (result?.savings_vs_renting ?? 0) > 0 },
                { label: 'CoC Return', value: fmt.percent(result?.coc_return ?? 0) },
                { label: 'Move-Out Cash Flow', value: `${fmt.currency(result?.full_rental_cash_flow ?? 0)}/mo` },
              ]}
            />

            {/* Profit Finder Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PROFIT FINDER
              </div>
              <ProfitFinder
                purchasePrice={inputs.purchase_price}
                listPrice={inputs.list_price}
                breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
                monthlyCashFlow={result?.your_housing_cost ?? 0}
                buyLabel="Buy"
                listLabel="List"
                evenLabel="Even"
                cashFlowLabel="Net Housing Cost:"
              />
            </div>

            {/* Pricing Ladder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PRICING LADDER
              </div>
              <PricingLadder
                items={[
                  { label: 'List Price', value: inputs.list_price, type: 'list' },
                  { label: 'Your Offer', value: inputs.purchase_price, type: 'current', highlight: true },
                  { label: 'Breakeven', value: result?.breakeven_price ?? 0, hint: '$0 housing cost', type: 'target' },
                  { label: '10% CoC', value: result?.target_coc_price ?? 0, hint: 'After move-out', type: 'coc' },
                  { label: 'FHA Max', value: inputs.fha_max_price, hint: 'Your area', type: 'mao' },
                ]}
              />
            </div>

            {/* Housing Cost Gauge */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                YOUR HOUSING COST
              </div>
              <HousingCostGauge
                housingCost={result?.your_housing_cost ?? 0}
                rentingEquivalent={inputs.owner_market_rent}
                savings={result?.savings_vs_renting ?? 0}
              />
            </div>

            {/* Unit Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                UNIT BREAKDOWN
              </div>
              <UnitBreakdown
                unit2Rent={inputs.unit2_rent}
                unit3Rent={inputs.unit3_rent}
                unit4Rent={inputs.unit4_rent}
                unitCount={unitsCount}
              />
            </div>

            {/* Move Out Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                IF YOU MOVE OUT
              </div>
              <MoveOutSummary
                monthlyCashFlow={result?.full_rental_cash_flow ?? 0}
                capRate={result?.moveout_cap_rate ?? 0}
                cocReturn={result?.coc_return ?? 0}
              />
            </div>

            {/* CTA Button */}
            <button
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 rounded-full text-white font-bold text-sm transition-colors shadow-sm"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
