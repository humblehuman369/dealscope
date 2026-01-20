'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { WorksheetTabNav } from '../WorksheetTabNav'
import { SectionCard, DataRow } from '../SectionCard'
import { EditableField, DisplayField } from '../EditableField'
import { ProfitFinder } from '../charts/ProfitFinder'
import { PricingLadder } from '../charts/PricingLadder'
import { DealFlow } from '../charts/DealFlow'
import { ProfitComparison } from '../charts/ProfitComparison'
import { ClosingCostsBreakdown } from '../charts/ClosingCostsBreakdown'
import { DealCriteriaList } from '../charts/DealCriteriaList'
import { useWholesaleWorksheetCalculator } from '@/hooks/useWholesaleWorksheetCalculator'
import { DollarSign, Home, Wrench, FileSignature, Users, ArrowRightLeft } from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface WholesaleWorksheetProps {
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
  if (score >= 90) return 'Excellent Deal'
  if (score >= 75) return 'Great Deal'
  if (score >= 60) return 'Good Deal'
  if (score >= 40) return 'Fair Deal'
  return 'Poor Deal'
}

const getDealScoreColor = (score: number): string => {
  if (score >= 75) return 'text-amber-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

const getDealScoreBg = (score: number): string => {
  if (score >= 75) return 'bg-amber-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ============================================
// IQ VERDICT CARD
// ============================================
interface IQVerdictCardProps {
  dealScore: number
  assignmentFee: number
  investorRoi: number
  meetsSeventyRule: boolean
  targetAssignmentFee?: number
  targetInvestorRoi?: number
}

function IQVerdictCard({
  dealScore,
  assignmentFee,
  investorRoi,
  meetsSeventyRule,
  targetAssignmentFee = 5000,
  targetInvestorRoi = 25,
}: IQVerdictCardProps) {
  const feeMet = assignmentFee >= targetAssignmentFee
  const roiMet = investorRoi >= targetInvestorRoi

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
            {meetsSeventyRule ? '✓ Meets 70% Rule' : '✗ Above 70% ARV'}
          </div>
        </div>
      </div>

      {/* Returns vs Targets */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          DEAL CRITERIA
        </div>

        {/* Assignment Fee */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Assignment Fee</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${feeMet ? 'text-amber-600' : 'text-slate-800'}`}>
              {fmt.currency(assignmentFee)}
            </span>
            <span className="text-xs text-slate-400">/ {fmt.currency(targetAssignmentFee)}</span>
            {feeMet ? (
              <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* Investor ROI */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Investor ROI</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${roiMet ? 'text-amber-600' : 'text-slate-800'}`}>
              {fmt.percent(investorRoi)}
            </span>
            <span className="text-xs text-slate-400">/ {targetInvestorRoi}%</span>
            {roiMet ? (
              <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs">✓</span>
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 text-xs">–</span>
              </span>
            )}
          </div>
        </div>

        {/* 70% Rule */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">70% Rule</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${meetsSeventyRule ? 'text-amber-600' : 'text-slate-800'}`}>
              {meetsSeventyRule ? 'Passes' : 'Fails'}
            </span>
            <span className="text-xs text-slate-400">≤ 70% ARV</span>
            {meetsSeventyRule ? (
              <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xs">✓</span>
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
  contractPrice: number
  investorPrice: number
  arv: number
  mao: number
  investorAllIn: number
}

function PricePositionCard({
  contractPrice,
  investorPrice,
  arv,
  mao,
  investorAllIn,
}: PricePositionCardProps) {
  // Calculate position percentage (0-100) relative to ARV
  const positionPct = Math.min(100, Math.max(0, (investorPrice / arv) * 100))
  const maoLine = Math.min(100, Math.max(0, (mao / arv) * 100))
  const contractLine = Math.min(100, Math.max(0, (contractPrice / arv) * 100))

  // Determine status
  const isExcellent = investorPrice <= mao
  const isGood = investorPrice > mao && investorPrice <= arv * 0.75
  const isBad = investorPrice > arv * 0.75

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        PRICE POSITION
      </div>

      {/* Gauge */}
      <div className="relative h-8 bg-gradient-to-r from-amber-500 via-yellow-400 to-red-500 rounded-full mb-6 overflow-hidden">
        {/* MAO marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${maoLine}%` }}
        />
        {/* Contract price marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${contractLine}%` }}
        />
        {/* Current position indicator (investor price) */}
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
          <span className="text-slate-500">Investor Pays</span>
          <span className={`font-semibold ${isExcellent ? 'text-amber-600' : isGood ? 'text-yellow-600' : 'text-red-600'}`}>
            {fmt.currency(investorPrice)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">Your Contract</span>
          <span className="font-semibold text-slate-800">{fmt.currency(contractPrice)}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
          <span className="text-slate-500">MAO (70%)</span>
          <span className="font-semibold text-slate-800">{fmt.currency(mao)}</span>
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
              metric.highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
            }`}
          >
            <div className="text-xs text-slate-500 mb-1">{metric.label}</div>
            <div
              className={`text-lg font-bold ${
                metric.positive
                  ? 'text-amber-600'
                  : metric.negative
                  ? 'text-red-600'
                  : metric.highlight
                  ? 'text-amber-700'
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
export function WholesaleWorksheet({ property, onExportPDF }: WholesaleWorksheetProps) {
  const { inputs, updateInput, result, isCalculating, error } = useWholesaleWorksheetCalculator(property)

  // Use ORIGINAL values from property for stable slider ranges
  const originalPrice = property.property_data_snapshot?.listPrice || inputs.investor_price || 500000
  const originalArv = property.property_data_snapshot?.arv || inputs.arv || originalPrice * 1.3

  // Computed values
  const assignmentFee = result?.assignment_fee ?? 0
  const assignmentFeePct = inputs.investor_price > 0 ? (assignmentFee / inputs.investor_price) * 100 : 0
  const closingCosts = result?.closing_costs ?? 0
  const titleEscrow = Math.max(0, inputs.marketing_costs)
  const transferTax = Math.max(0, inputs.earnest_money)
  const otherClosing = Math.max(0, closingCosts - titleEscrow - transferTax)
  const meetsSeventyRule = inputs.investor_price <= inputs.arv * 0.7

  return (
    <div className="min-h-screen bg-slate-50 pt-12">
      {/* WorksheetTabNav - sticky below header */}
      <div className="sticky top-12 z-40 bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <WorksheetTabNav
            propertyId={property.id}
            strategy="wholesale"
          />
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {getDisplayAddress(property) || 'Wholesale Analysis'}
              </h1>
              <p className="text-sm text-slate-500">Wholesale Strategy Worksheet</p>
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
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <div className="text-xs font-medium text-amber-100 mb-1">Assignment Fee</div>
            <div className="text-xl font-bold">{fmt.currency(assignmentFee)}</div>
            <div className="text-xs text-amber-200">Your profit</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Your Contract</div>
            <div className="text-xl font-bold text-slate-800">{fmt.currency(inputs.contract_price)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Investor Pays</div>
            <div className="text-xl font-bold text-slate-800">{fmt.currency(inputs.investor_price)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Cash Needed</div>
            <div className="text-xl font-bold text-slate-800">{fmt.currency(inputs.earnest_money)}</div>
            <div className="text-xs text-slate-400">Earnest money</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/60">
            <div className="text-xs font-medium text-slate-500 mb-1">Investor ROI</div>
            <div className="text-xl font-bold text-amber-600">{fmt.percent(result?.investor_roi ?? 0)}</div>
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
            {/* Wholesale Analysis */}
            <SectionCard title="Wholesale Analysis">
              <DataRow label="Investor Purchase Price" icon={<Home className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.investor_price}
                  onChange={(val) => updateInput('investor_price', val)}
                  format="currency"
                  min={Math.round(originalPrice * 0.5)}
                  max={Math.round(originalPrice * 1.5)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Your Contract Price" hasSlider>
                <EditableField
                  value={inputs.contract_price}
                  onChange={(val) => updateInput('contract_price', val)}
                  format="currency"
                  min={Math.round(originalPrice * 0.3)}
                  max={Math.round(originalPrice * 1.2)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Earnest Money" icon={<DollarSign className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.earnest_money}
                  onChange={(val) => updateInput('earnest_money', val)}
                  format="currency"
                  min={0}
                  max={10000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Closing Costs" hasSlider>
                <EditableField
                  value={inputs.marketing_costs}
                  onChange={(val) => updateInput('marketing_costs', val)}
                  format="currency"
                  min={0}
                  max={5000}
                  step={100}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Your Assignment Fee" isHighlight>
                <DisplayField value={assignmentFee} format="currency" isPositive />
              </DataRow>
              <DataRow label="Post-Tax Profit">
                <DisplayField value={result?.post_tax_profit ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Purchase & Rehab (Investor) */}
            <SectionCard title="Purchase & Rehab (Investor)">
              <DataRow label="Purchase Price">
                <DisplayField value={inputs.investor_price} format="currency" />
              </DataRow>
              <DataRow label="Rehab Costs" icon={<Wrench className="w-4 h-4" />} hasSlider>
                <EditableField
                  value={inputs.rehab_costs}
                  onChange={(val) => updateInput('rehab_costs', val)}
                  format="currency"
                  min={0}
                  max={Math.round(originalPrice * 0.4)}
                  step={1000}
                  showSlider={true}
                />
              </DataRow>
              <DataRow label="Amount Financed">
                <DisplayField value={result?.amount_financed ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Down Payment">
                <DisplayField value={result?.down_payment ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Purchase Costs">
                <DisplayField value={result?.investor_purchase_costs ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Total Cash Needed" isTotal>
                <DisplayField value={result?.total_cash_needed ?? 0} format="currency" />
              </DataRow>
            </SectionCard>

            {/* Sale & Profit (Investor) */}
            <SectionCard title="Sale & Profit (Investor)">
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
              <DataRow label="Selling Costs">
                <DisplayField value={result?.selling_costs ?? 0} format="currency" />
              </DataRow>
              <DataRow label="Sale Proceeds">
                <DisplayField value={result?.sale_proceeds ?? 0} format="currency" isPositive />
              </DataRow>
              <DataRow label="Total Investment">
                <DisplayField value={-(result?.investor_all_in ?? 0)} format="currency" isNegative />
              </DataRow>
              <DataRow label="Investor Profit" isTotal>
                <DisplayField value={result?.investor_profit ?? 0} format="currency" isPositive />
              </DataRow>
              <DataRow label="Investor ROI">
                <DisplayField value={result?.investor_roi ?? 0} format="number" suffix="%" />
              </DataRow>
            </SectionCard>
          </div>

          {/* Right Column - Insights Panel */}
          <div className="space-y-4">
            {/* IQ Verdict */}
            <IQVerdictCard
              dealScore={result?.deal_score ?? 0}
              assignmentFee={assignmentFee}
              investorRoi={result?.investor_roi ?? 0}
              meetsSeventyRule={meetsSeventyRule}
            />

            {/* Price Position */}
            <PricePositionCard
              contractPrice={inputs.contract_price}
              investorPrice={inputs.investor_price}
              arv={inputs.arv}
              mao={result?.mao ?? inputs.arv * 0.7}
              investorAllIn={result?.investor_all_in ?? 0}
            />

            {/* Key Metrics */}
            <KeyMetricsGrid
              metrics={[
                { label: 'Assignment Fee', value: fmt.currency(assignmentFee), highlight: true },
                { label: 'Investor ROI', value: fmt.percent(result?.investor_roi ?? 0) },
                { label: 'Investor Profit', value: fmt.currency(result?.investor_profit ?? 0) },
                { label: 'Your Cash at Risk', value: fmt.currency(inputs.earnest_money) },
              ]}
            />

            {/* Profit Finder Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PROFIT FINDER
              </div>
              <ProfitFinder
                purchasePrice={inputs.contract_price}
                listPrice={inputs.arv}
                breakevenPrice={result?.mao ?? inputs.arv * 0.7}
                monthlyCashFlow={assignmentFee}
                buyLabel="Contract"
                listLabel="ARV"
                evenLabel="MAO"
                cashFlowLabel="Assignment Fee:"
              />
            </div>

            {/* Pricing Ladder */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PRICING LADDER
              </div>
              <PricingLadder
                items={[
                  { label: 'ARV', value: inputs.arv, type: 'arv' },
                  { label: 'Investor All-In', value: result?.investor_all_in ?? 0, type: 'current', highlight: true },
                  { label: 'Investor Pays', value: inputs.investor_price, type: 'target' },
                  { label: 'Your Contract', value: inputs.contract_price, type: 'coc' },
                  { label: 'MAO', value: result?.mao ?? 0, hint: '70% Rule', type: 'mao' },
                ]}
                recoveryPercent={assignmentFeePct}
                indicatorLabel="assignment fee"
                indicatorClass="assignment"
                indicatorValue={fmt.currency(assignmentFee)}
              />
            </div>

            {/* Deal Flow */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                DEAL FLOW
              </div>
              <DealFlow
                contractPrice={inputs.contract_price}
                investorPrice={inputs.investor_price}
                assignmentFee={assignmentFee}
              />
            </div>

            {/* Profit Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                PROFIT COMPARISON
              </div>
              <ProfitComparison
                yourProfit={assignmentFee}
                investorProfit={result?.investor_profit ?? 0}
              />
            </div>

            {/* Closing Costs Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                CLOSING COSTS
              </div>
              <ClosingCostsBreakdown
                titleEscrow={titleEscrow}
                transferTax={transferTax}
                other={otherClosing}
              />
            </div>

            {/* Deal Criteria */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
                DEAL CRITERIA
              </div>
              <DealCriteriaList
                items={[
                  { label: 'Assignment Fee > $5,000', passed: assignmentFee > 5000 },
                  { label: 'Investor ROI > 25%', passed: (result?.investor_roi ?? 0) > 25 },
                  { label: 'Investor at ≤ 70% ARV', passed: meetsSeventyRule },
                ]}
              />
            </div>

            {/* CTA Button */}
            <button
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-700 rounded-full text-white font-bold text-sm transition-colors shadow-sm"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
