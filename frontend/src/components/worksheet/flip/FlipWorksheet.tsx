'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { FlipRoiGauge } from '../charts/FlipRoiGauge'
import { ProfitTimeline } from '../charts/ProfitTimeline'
import { useFlipWorksheetCalculator } from '@/hooks/useFlipWorksheetCalculator'
import { DollarSign, Home, Wrench, Percent, Calendar, TrendingUp, Target, AlertCircle } from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface FlipWorksheetProps {
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
  months: (val: number) => `${val.toFixed(1)} mo`,
}

// ============================================
// DEAL SCORE HELPERS
// ============================================
const getDealScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent Deal'
  if (score >= 75) return 'Great Deal'
  if (score >= 60) return 'Good Deal'
  if (score >= 40) return 'Fair Deal'
  return 'Poor Deal'
}

const getDealScoreColor = (score: number): string => {
  if (score >= 75) return 'text-teal-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

const getDealScoreBg = (score: number): string => {
  if (score >= 75) return 'bg-teal-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// ============================================
// IQ VERDICT CARD
// ============================================
interface IQVerdictCardProps {
  dealScore: number
  roi: number
  annualizedRoi: number
  profitMargin: number
  netProfit: number
  meets70Rule: boolean
  targetRoi?: number
  targetAnnualizedRoi?: number
  targetProfit?: number
}

function IQVerdictCard({
  dealScore,
  roi,
  annualizedRoi,
  profitMargin,
  netProfit,
  meets70Rule,
  targetRoi = 20,
  targetAnnualizedRoi = 50,
  targetProfit = 30000,
}: IQVerdictCardProps) {
  const roiMet = roi >= targetRoi
  const annualizedMet = annualizedRoi >= targetAnnualizedRoi
  const profitMet = netProfit >= targetProfit

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
            {meets70Rule ? '✓ Meets 70% Rule' : '✗ Below 70% Rule'}
          </div>
        </div>
      </div>

      {/* Returns vs Targets */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          RETURNS VS TARGETS
        </div>

        {/* ROI */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">ROI</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${roiMet ? 'text-teal-600' : 'text-slate-800'}`}>
              {fmt.percent(roi)}
            </span>
            <span className="text-xs text-slate-400">/ {targetRoi}%</span>
            {roiMet ? (
              <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* Annualized ROI */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Annualized</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${annualizedMet ? 'text-teal-600' : 'text-slate-800'}`}>
              {annualizedRoi > 999 ? `${(annualizedRoi / 1000).toFixed(1)}k%` : fmt.percent(annualizedRoi)}
            </span>
            <span className="text-xs text-slate-400">/ {targetAnnualizedRoi}%</span>
            {annualizedMet ? (
              <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Net Profit</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${profitMet ? 'text-teal-600' : 'text-slate-800'}`}>
              {fmt.currency(netProfit)}
            </span>
            <span className="text-xs text-slate-400">/ {fmt.currency(targetProfit)}</span>
            {profitMet ? (
              <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-600 text-xs">✓</span>
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
  arv: number
  breakevenPrice: number
  mao: number
  allInCost: number
}

function PricePositionCard({
  purchasePrice,
  arv,
  breakevenPrice,
  mao,
  allInCost,
}: PricePositionCardProps) {
  // Calculate position percentage (0-100) relative to ARV
  const positionPct = Math.min(100, Math.max(0, (allInCost / arv) * 100))
  const maoLine = Math.min(100, Math.max(0, (mao / arv) * 100))
  const breakevenLine = Math.min(100, Math.max(0, (breakevenPrice / arv) * 100))

  // Determine status
  const isGood = allInCost <= mao
  const isOkay = allInCost > mao && allInCost <= breakevenPrice
  const isBad = allInCost > breakevenPrice

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        PRICE POSITION
      </div>

      {/* Gauge */}
      <div className="relative h-8 bg-gradient-to-r from-teal-500 via-amber-400 to-red-500 rounded-full mb-6 overflow-hidden">
        {/* MAO marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${maoLine}%` }}
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
          <span className="text-slate-500">ARV</span>
          <span className="font-semibold text-slate-800">{fmt.currency(arv)}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">All-In Cost</span>
          <span className={`font-semibold ${isGood ? 'text-teal-600' : isOkay ? 'text-amber-600' : 'text-red-600'}`}>
            {fmt.currency(allInCost)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">MAO (70%)</span>
          <span className="font-semibold text-slate-800">{fmt.currency(mao)}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">Breakeven</span>
          <span className="font-semibold text-slate-800">{fmt.currency(breakevenPrice)}</span>
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
              metric.highlight ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50'
            }`}
          >
            <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
            <div
              className={`text-lg font-bold ${
                metric.positive
                  ? 'text-teal-600'
                  : metric.negative
                  ? 'text-red-600'
                  : metric.highlight
                  ? 'text-teal-700'
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
export function FlipWorksheet({ property, onExportPDF }: FlipWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useFlipWorksheetCalculator(property)

  // Use ORIGINAL values from property for stable slider ranges
  const originalPrice = property.property_data_snapshot?.listPrice || inputs.purchase_price || 500000
  const originalArv = property.property_data_snapshot?.arv || inputs.arv || originalPrice * 1.3

  // Computed values
  const monthlyHoldingCost =
    inputs.holding_months > 0 ? (result?.total_holding_costs ?? 0) / inputs.holding_months : 0

  const allInCost = result?.purchase_rehab_cost ?? (inputs.purchase_price + inputs.rehab_costs)

  return (
    <div className="w-full min-h-screen bg-slate-50 pt-12">
      {/* WorksheetTabNav - sticky below header */}
      <div className="w-full sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav
            propertyId={property.id}
            strategy="flip"
          />
        </div>
      </div>

      {/* Page Header */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {getDisplayAddress(property) || 'Fix & Flip Analysis'}
              </h1>
              <p className="text-sm text-slate-500">Fix & Flip Strategy Worksheet</p>
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
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
            <div className="text-xs font-medium text-teal-100 mb-1">Total Profit</div>
            <div className="text-xl font-bold">{fmt.currency(result?.net_profit_before_tax ?? 0)}</div>
            <div className="text-xs text-teal-200">After all costs</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Cash Needed</div>
            <div className="text-xl font-bold text-slate-800">{fmt.currency(result?.total_cash_required ?? 0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">ROI</div>
            <div className="text-xl font-bold text-teal-600">{fmt.percent(result?.roi ?? 0)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Annualized ROI</div>
            <div className="text-xl font-bold text-teal-600">
              {(result?.annualized_roi ?? 0) > 999
                ? `${((result?.annualized_roi ?? 0) / 1000).toFixed(1)}k%`
                : fmt.percent(result?.annualized_roi ?? 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Holding Period</div>
            <div className="text-xl font-bold text-slate-800">{fmt.months(inputs.holding_months ?? 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white">
            <div className="text-xs font-medium text-slate-300 mb-1">Deal Score</div>
            <div className="text-xl font-bold">{result?.deal_score ?? 0}</div>
            <div className="text-xs text-slate-400">{getDealScoreLabel(result?.deal_score ?? 0).replace(' Deal', '')}</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-[1.4fr,1fr] md:grid-cols-[1.5fr,320px] lg:grid-cols-[1fr,380px] gap-4 sm:gap-6 items-start">
          {/* Left Column - Worksheet Inputs */}
          <div className="space-y-4">
            {/* Purchase & Rehab */}
            <SectionCard title="Purchase & Rehab">
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
              <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.rehab_costs}
                  onChange={(val) => updateInput('rehab_costs', val)}
                  format="currency"
                  min={0}
                  max={Math.round(originalPrice * 0.5)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Amount Financed">
                <DisplayField value={result?.loan_amount ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Down Payment" hasSlider>
                <EditableField
                  value={inputs.down_payment_pct}
                  onChange={(val) => updateInput('down_payment_pct', val)}
                  format="percent"
                  min={0.10}
                  max={0.50}
                  step={0.01}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Purchase Costs" icon={<DollarSign className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.purchase_costs}
                  onChange={(val) => updateInput('purchase_costs', val)}
                  format="currency"
                  min={0}
                  max={Math.round(originalPrice * 0.1)}
                  step={500}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Cash Needed" isTotal>
                <DisplayField value={result?.total_cash_required ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Financing (Hard Money) */}
            <SectionCard title="Financing (Hard Money)">
              <DataRow label="Loan Amount">
                <DisplayField value={result?.loan_amount ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Loan to Cost">
                <DisplayField value={result?.loan_to_cost_pct ?? 0} format="number" suffix="%" />
              </DataRow>
              <DataRow label="Interest Rate" icon={<Percent className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.interest_rate}
                  onChange={(val) => updateInput('interest_rate', val)}
                  format="percent"
                  min={0.08}
                  max={0.18}
                  step={0.005}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Points" hasSlider>
                <EditableField
                  value={inputs.points}
                  onChange={(val) => updateInput('points', val)}
                  format="number"
                  suffix=" pts"
                  min={0}
                  max={5}
                  step={0.5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Monthly Payment" isTotal>
                <DisplayField value={result?.monthly_payment ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Holding Costs */}
            <SectionCard title="Holding Costs">
              <DataRow label="Holding Period" icon={<Calendar className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.holding_months}
                  onChange={(val) => updateInput('holding_months', val)}
                  format="number"
                  suffix=" mo"
                  min={1}
                  max={12}
                  step={0.5}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Property Taxes" hasSlider>
                <EditableField
                  value={inputs.property_taxes_annual}
                  onChange={(val) => updateInput('property_taxes_annual', val)}
                  format="currency"
                  min={1000}
                  max={30000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Insurance" hasSlider>
                <EditableField
                  value={inputs.insurance_annual}
                  onChange={(val) => updateInput('insurance_annual', val)}
                  format="currency"
                  min={500}
                  max={10000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Utilities" hasSlider>
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
              <DataRow label="Dumpster Rental" hasSlider>
                <EditableField
                  value={inputs.dumpster_monthly}
                  onChange={(val) => updateInput('dumpster_monthly', val)}
                  format="currency"
                  min={0}
                  max={500}
                  step={25}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Total Holding Costs" isTotal>
                <DisplayField value={result?.total_holding_costs ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Sale & Profit */}
            <SectionCard title="Sale & Profit">
              <DataRow label="After Repair Value" hasSlider>
                <EditableField
                  value={inputs.arv}
                  onChange={(val) => updateInput('arv', val)}
                  format="currency"
                  min={Math.round(originalArv * 0.7)}
                  max={Math.round(originalArv * 1.5)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Selling Costs" hasSlider>
                <EditableField
                  value={inputs.selling_costs_pct}
                  onChange={(val) => updateInput('selling_costs_pct', val)}
                  format="percent"
                  min={0.04}
                  max={0.10}
                  step={0.005}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Sale Proceeds">
                <DisplayField value={result?.net_sale_proceeds ?? 0} format="currency" isPositive />
              </DataRow>
              <DataRow label="Loan Repayment">
                <DisplayField value={-(result?.loan_repayment ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Holding Costs">
                <DisplayField value={-(result?.total_holding_costs ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Invested Cash">
                <DisplayField value={-(result?.total_cash_required ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Total Profit" isTotal>
                <DisplayField value={result?.net_profit_before_tax ?? 0} format="currency" isPositive />
              </DataRow>
              <DataRow label="Post-Tax Profit">
                <DisplayField value={result?.net_profit_after_tax ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Investment Returns */}
            <SectionCard title="Investment Returns">
              <DataRow label="Return on Investment">
                <DisplayField value={result?.roi ?? 0} format="number" suffix="%" />
              </DataRow>
              <DataRow label="Annualized ROI">
                <DisplayField value={result?.annualized_roi ?? 0} format="number" suffix="%" />
              </DataRow>
              <DataRow label="Profit Margin">
                <DisplayField value={result?.profit_margin ?? 0} format="number" suffix="%" />
              </DataRow>
              <DataRow label="Meets 70% Rule">
                <span className={`text-right min-w-[100px] flex-shrink-0 font-semibold ${result?.meets_70_rule ? 'text-teal-600' : 'text-red-500'}`}>
                  {result?.meets_70_rule ? '✓ Yes' : '✗ No'}
                </span>
              </DataRow>
              <DataRow label="MAO (70% Rule)">
                <DisplayField value={result?.mao ?? 0} format="currency" />
              </DataRow>
            </SectionCard>
          </div>

          {/* Right Column - Insights Panel */}
          <div className="sm:sticky sm:top-28 space-y-4 sm:max-h-[calc(100vh-8rem)] sm:overflow-y-auto">
            {/* IQ Verdict */}
            <IQVerdictCard
              dealScore={result?.deal_score ?? 0}
              roi={result?.roi ?? 0}
              annualizedRoi={result?.annualized_roi ?? 0}
              profitMargin={result?.profit_margin ?? 0}
              netProfit={result?.net_profit_before_tax ?? 0}
              meets70Rule={result?.meets_70_rule ?? false}
            />

            {/* Price Position */}
            <PricePositionCard
              purchasePrice={inputs.purchase_price}
              arv={inputs.arv}
              breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
              mao={result?.mao ?? 0}
              allInCost={allInCost}
            />

            {/* Key Metrics */}
            <KeyMetricsGrid
              metrics={[
                { label: 'ROI', value: fmt.percent(result?.roi ?? 0), highlight: true },
                { label: 'Annualized ROI', value: (result?.annualized_roi ?? 0) > 999 ? `${((result?.annualized_roi ?? 0) / 1000).toFixed(1)}k%` : fmt.percent(result?.annualized_roi ?? 0) },
                { label: 'Profit Margin', value: fmt.percent(result?.profit_margin ?? 0) },
                { label: 'Holding Period', value: fmt.months(inputs.holding_months) },
              ]}
            />

            {/* Profit Finder Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PROFIT FINDER
              </div>
              <ProfitFinder
                purchasePrice={inputs.purchase_price}
                listPrice={inputs.arv}
                breakevenPrice={result?.breakeven_price ?? inputs.purchase_price}
                monthlyCashFlow={result?.net_profit_before_tax ?? 0}
                buyLabel="Buy"
                listLabel="ARV"
                evenLabel="Break"
                cashFlowLabel="Net Profit:"
              />
            </div>

            {/* Pricing Ladder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PRICING LADDER
              </div>
              <PricingLadder
                items={[
                  { label: 'ARV', value: result?.arv ?? inputs.arv, type: 'arv' },
                  { label: 'All-In Cost', value: allInCost, type: 'current', highlight: true },
                  { label: 'Breakeven', value: result?.breakeven_price ?? 0, hint: '0% Profit', type: 'target' },
                  { label: '15% Target', value: result?.target_fifteen_all_in ?? 0, hint: 'Max All-In', type: 'profit-target' },
                  { label: 'MAO', value: result?.mao ?? 0, hint: '70% Rule', type: 'mao' },
                ]}
                recoveryPercent={result?.profit_margin ?? 0}
                indicatorLabel="profit margin"
                indicatorClass="flip"
              />
            </div>

            {/* ROI Gauge */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                RETURN ON INVESTMENT
              </div>
              <FlipRoiGauge
                totalRoi={result?.roi ?? 0}
                annualizedRoi={result?.annualized_roi ?? 0}
                holdingMonths={inputs.holding_months}
              />
            </div>

            {/* Profit Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PROFIT BY HOLDING PERIOD
              </div>
              <ProfitTimeline
                baseProfit={result?.net_profit_before_tax ?? 0}
                monthlyHoldingCost={monthlyHoldingCost}
              />
            </div>

            {/* CTA Button */}
            <button
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-teal-600 hover:bg-teal-700 rounded-full text-white font-bold text-sm transition-colors shadow-sm"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
