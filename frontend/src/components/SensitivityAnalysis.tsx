'use client'

import { useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, Percent, DollarSign, Home, AlertTriangle,
  ArrowRight, Activity
} from 'lucide-react'
import {
  calculateSensitivityAnalysis,
  SensitivityAnalysis,
  SensitivityPoint,
  BaseAssumptions
} from '@/lib/analytics'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`

const formatCompact = (value: number): string => {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return formatCurrency(value)
}

// ============================================
// MINI LINE CHART
// ============================================

function MiniLineChart({
  data,
  valueKey,
  color = 'blue',
  currentIndex,
  height = 60
}: {
  data: SensitivityPoint[]
  valueKey: 'cashFlow' | 'cashOnCash' | 'capRate'
  color?: string
  currentIndex: number
  height?: number
}) {
  const values = data.map(d => d[valueKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  
  const width = 100
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d[valueKey] - min) / range) * (height - 10) - 5
    return `${x},${y}`
  }).join(' ')
  
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
  }
  
  const currentX = (currentIndex / (data.length - 1)) * width
  const currentY = height - ((values[currentIndex] - min) / range) * (height - 10) - 5
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Zero line if applicable */}
      {min < 0 && max > 0 && (
        <line
          x1="0"
          y1={height - ((0 - min) / range) * (height - 10) - 5}
          x2={width}
          y2={height - ((0 - min) / range) * (height - 10) - 5}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      )}
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={colors[color]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Current point */}
      <circle
        cx={currentX}
        cy={currentY}
        r="4"
        fill={colors[color]}
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  )
}

// ============================================
// SENSITIVITY CARD
// ============================================

function SensitivityCard({
  title,
  color,
  data,
  formatX,
  baseIndex,
  currentMetric,
  metricLabel
}: {
  title: string
  color: string
  data: SensitivityPoint[]
  formatX: (v: number) => string
  baseIndex: number
  currentMetric: 'cashFlow' | 'cashOnCash' | 'capRate'
  metricLabel: string
}) {
  const baseValue = data[baseIndex][currentMetric]
  const minValue = Math.min(...data.map(d => d[currentMetric]))
  const maxValue = Math.max(...data.map(d => d[currentMetric]))
  
  const formatMetric = (v: number) => {
    if (currentMetric === 'cashFlow') return formatCurrency(v)
    return formatPercent(v)
  }
  
  const deltaMin = minValue - baseValue
  const deltaMax = maxValue - baseValue
  
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow">
      <h4 className="text-xs font-medium text-gray-700 mb-2">{title}</h4>
      
      <MiniLineChart
        data={data}
        valueKey={currentMetric}
        color={color}
        currentIndex={baseIndex}
        height={40}
      />
      
      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
        <div className="text-left">
          <div className="text-gray-400">{formatX(data[0].value)}</div>
          <div className={deltaMin < 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
            {deltaMin >= 0 ? '+' : ''}{currentMetric === 'cashFlow' ? formatCompact(deltaMin) : formatPercent(deltaMin)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Current</div>
          <div className="font-semibold text-gray-900">{formatMetric(baseValue)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400">{formatX(data[data.length - 1].value)}</div>
          <div className={deltaMax >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
            {deltaMax >= 0 ? '+' : ''}{currentMetric === 'cashFlow' ? formatCompact(deltaMax) : formatPercent(deltaMax)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// WHAT-IF SLIDER
// ============================================

function WhatIfSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  impact,
  impactLabel
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  impact: number
  impactLabel: string
}) {
  const percentage = ((value - min) / (max - min)) * 100
  
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{format(value)}</span>
      </div>
      
      <div className="relative h-1.5 mb-2">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-200 via-teal-300 to-teal-500" />
        <div 
          className="absolute top-0 right-0 h-full bg-gray-100 rounded-r-full transition-all"
          style={{ width: `${100 - percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-400">{format(min)}</span>
        <div className={`font-medium ${impact >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {impactLabel}: {impact >= 0 ? '+' : ''}{formatCurrency(impact)}
        </div>
        <span className="text-gray-400">{format(max)}</span>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface SensitivityAnalysisViewProps {
  assumptions: BaseAssumptions
}

export default function SensitivityAnalysisView({ assumptions }: SensitivityAnalysisViewProps) {
  const [whatIfRate, setWhatIfRate] = useState(assumptions.interestRate)
  const [whatIfPrice, setWhatIfPrice] = useState(assumptions.purchasePrice)
  const [whatIfRent, setWhatIfRent] = useState(assumptions.monthlyRent)
  const [selectedMetric, setSelectedMetric] = useState<'cashFlow' | 'cashOnCash' | 'capRate'>('cashFlow')
  
  const analysis = useMemo(
    () => calculateSensitivityAnalysis(assumptions),
    [assumptions]
  )
  
  // Calculate what-if impacts
  const baseMetrics = useMemo(() => {
    const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
    const closingCosts = assumptions.purchasePrice * 0.03
    const loanAmount = assumptions.purchasePrice - downPayment
    const totalCash = downPayment + closingCosts
    
    const monthlyRate = assumptions.interestRate / 12
    const numPayments = assumptions.loanTermYears * 12
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    
    const annualRent = assumptions.monthlyRent * 12 * (1 - assumptions.vacancyRate)
    const opEx = assumptions.propertyTaxes + assumptions.insurance + 
      assumptions.monthlyRent * 12 * (assumptions.managementPct + assumptions.maintenancePct)
    const noi = annualRent - opEx
    const annualCF = noi - monthlyPI * 12
    
    return { cashFlow: annualCF / 12, totalCash }
  }, [assumptions])
  
  const whatIfCashFlow = useMemo(() => {
    const downPayment = whatIfPrice * assumptions.downPaymentPct
    const closingCosts = whatIfPrice * 0.03
    const loanAmount = whatIfPrice - downPayment
    
    const monthlyRate = whatIfRate / 12
    const numPayments = assumptions.loanTermYears * 12
    const monthlyPI = monthlyRate > 0 
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount / numPayments
    
    const annualRent = whatIfRent * 12 * (1 - assumptions.vacancyRate)
    const opEx = assumptions.propertyTaxes + assumptions.insurance + 
      whatIfRent * 12 * (assumptions.managementPct + assumptions.maintenancePct)
    const noi = annualRent - opEx
    const annualCF = noi - monthlyPI * 12
    
    return annualCF / 12
  }, [whatIfRate, whatIfPrice, whatIfRent, assumptions])
  
  const cashFlowImpact = whatIfCashFlow - baseMetrics.cashFlow
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Sensitivity Analysis</h2>
        <p className="text-sm text-gray-500">See how changes impact your returns</p>
      </div>

      {/* Metric Selector */}
      <div className="flex gap-1.5">
        {[
          { id: 'cashFlow', label: 'Cash Flow' },
          { id: 'cashOnCash', label: 'Cash-on-Cash' },
          { id: 'capRate', label: 'Cap Rate' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMetric(m.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedMetric === m.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Sensitivity Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SensitivityCard
          title="Interest Rate"
          color="purple"
          data={analysis.interestRate}
          formatX={(v) => `${(v * 100).toFixed(1)}%`}
          baseIndex={3}
          currentMetric={selectedMetric}
          metricLabel={selectedMetric === 'cashFlow' ? 'Cash Flow' : selectedMetric === 'cashOnCash' ? 'CoC' : 'Cap'}
        />
        <SensitivityCard
          title="Purchase Price"
          color="blue"
          data={analysis.purchasePrice}
          formatX={(v) => `$${(v / 1000).toFixed(0)}K`}
          baseIndex={3}
          currentMetric={selectedMetric}
          metricLabel={selectedMetric === 'cashFlow' ? 'Cash Flow' : selectedMetric === 'cashOnCash' ? 'CoC' : 'Cap'}
        />
        <SensitivityCard
          title="Monthly Rent"
          color="green"
          data={analysis.rent}
          formatX={(v) => `$${v.toLocaleString()}`}
          baseIndex={3}
          currentMetric={selectedMetric}
          metricLabel={selectedMetric === 'cashFlow' ? 'Cash Flow' : selectedMetric === 'cashOnCash' ? 'CoC' : 'Cap'}
        />
        <SensitivityCard
          title="Vacancy Rate"
          color="orange"
          data={analysis.vacancy}
          formatX={(v) => `${(v * 100).toFixed(0)}%`}
          baseIndex={2}
          currentMetric={selectedMetric}
          metricLabel={selectedMetric === 'cashFlow' ? 'Cash Flow' : selectedMetric === 'cashOnCash' ? 'CoC' : 'Cap'}
        />
      </div>

      {/* What-If Scenario Builder */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">What-If Scenario Builder</h3>
        
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <WhatIfSlider
            label="Interest Rate"
            value={whatIfRate}
            min={0.04}
            max={0.12}
            step={0.0025}
            format={(v) => `${(v * 100).toFixed(2)}%`}
            onChange={setWhatIfRate}
            impact={whatIfCashFlow - baseMetrics.cashFlow}
            impactLabel="Impact"
          />
          <WhatIfSlider
            label="Purchase Price"
            value={whatIfPrice}
            min={assumptions.purchasePrice * 0.8}
            max={assumptions.purchasePrice * 1.2}
            step={5000}
            format={(v) => `$${(v / 1000).toFixed(0)}K`}
            onChange={setWhatIfPrice}
            impact={whatIfCashFlow - baseMetrics.cashFlow}
            impactLabel="Impact"
          />
          <WhatIfSlider
            label="Monthly Rent"
            value={whatIfRent}
            min={assumptions.monthlyRent * 0.8}
            max={assumptions.monthlyRent * 1.2}
            step={50}
            format={(v) => formatCurrency(v)}
            onChange={setWhatIfRent}
            impact={whatIfCashFlow - baseMetrics.cashFlow}
            impactLabel="Impact"
          />
        </div>
        
        {/* Result */}
        <div className={`p-3 rounded-lg flex items-center justify-between ${
          cashFlowImpact >= 0 
            ? 'bg-emerald-100 border border-emerald-200' 
            : 'bg-red-100 border border-red-200'
        }`}>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Scenario Monthly Cash Flow</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(whatIfCashFlow)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">vs. Base Scenario</div>
            <div className={`text-base font-semibold ${cashFlowImpact >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {cashFlowImpact >= 0 ? '+' : ''}{formatCurrency(cashFlowImpact)}/mo
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setWhatIfRate(assumptions.interestRate)
            setWhatIfPrice(assumptions.purchasePrice)
            setWhatIfRent(assumptions.monthlyRent)
          }}
          className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Reset to base scenario
        </button>
      </div>

      {/* Key Insights */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
        <h4 className="text-xs font-medium text-amber-800 mb-1.5">Key Insights</h4>
        <ul className="text-[11px] text-amber-700 space-y-0.5">
          <li>• A 1% rate increase reduces cash flow by ~${Math.abs(analysis.interestRate[4].cashFlow - analysis.interestRate[3].cashFlow).toFixed(0)}/mo</li>
          <li>• A 10% rent increase adds ~${Math.abs(analysis.rent[5].cashFlow - analysis.rent[3].cashFlow).toFixed(0)}/mo to cash flow</li>
          <li>• Break-even vacancy: ~{(analysis.vacancy.find(v => v.cashFlow <= 0)?.value ?? 0.15 * 100).toFixed(0)}%</li>
        </ul>
      </div>
    </div>
  )
}
