'use client'

import { useMemo } from 'react'
import {
  TrendingUp, DollarSign, PiggyBank, Home, Calendar,
  ArrowUpRight, Wallet, Building2, Target, Award
} from 'lucide-react'
import {
  YearlyProjection,
  ProjectionAssumptions,
  ProjectionSummary,
  calculate10YearProjections,
  calculateProjectionSummary
} from '@/lib/projections'
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/utils/formatters'

// ============================================
// MINI BAR CHART
// ============================================

function MiniBarChart({ 
  data, 
  color = 'blue',
  height = 120 
}: { 
  data: number[]
  color?: string
  height?: number
}) {
  const max = Math.max(...data.map(Math.abs))
  const hasNegative = data.some(d => d < 0)
  
  const colors: Record<string, { positive: string; negative: string }> = {
    blue: { positive: 'bg-blue-500', negative: 'bg-blue-300' },
    green: { positive: 'bg-emerald-500', negative: 'bg-red-400' },
    purple: { positive: 'bg-purple-500', negative: 'bg-purple-300' },
    orange: { positive: 'bg-orange-500', negative: 'bg-orange-300' },
  }
  
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((value, i) => {
        const barHeight = max > 0 ? (Math.abs(value) / max) * 100 : 0
        const isNegative = value < 0
        
        return (
          <div key={i} className="flex-1 flex flex-col justify-end items-center">
            <div 
              className={`w-full rounded-t-sm transition-all duration-300 ${
                isNegative ? colors[color].negative : colors[color].positive
              }`}
              style={{ height: `${barHeight}%`, minHeight: value !== 0 ? 4 : 0 }}
            />
            <span className="text-[10px] text-gray-400 mt-1">Y{i + 1}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// AREA CHART (Stacked)
// ============================================

function StackedAreaChart({
  data,
  height = 200
}: {
  data: YearlyProjection[]
  height?: number
}) {
  const maxWealth = Math.max(...data.map(d => d.totalWealth))
  
  // Calculate points for SVG paths
  const width = 100
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    cashFlow: (d.cumulativeCashFlow / maxWealth) * 100,
    paydown: ((d.cumulativeCashFlow + d.equityFromPaydown) / maxWealth) * 100,
    appreciation: ((d.cumulativeCashFlow + d.equityFromPaydown + d.equityFromAppreciation) / maxWealth) * 100,
  }))
  
  const createPath = (getY: (p: typeof points[0]) => number) => {
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${100 - getY(p)}`).join(' ')
    return path + ` L ${width} 100 L 0 100 Z`
  }
  
  return (
    <div style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        {/* Appreciation layer (top) */}
        <path
          d={createPath(p => p.appreciation)}
          fill="url(#gradient-appreciation)"
          opacity="0.8"
        />
        {/* Paydown layer (middle) */}
        <path
          d={createPath(p => p.paydown)}
          fill="url(#gradient-paydown)"
          opacity="0.8"
        />
        {/* Cash flow layer (bottom) */}
        <path
          d={createPath(p => p.cashFlow)}
          fill="url(#gradient-cashflow)"
          opacity="0.9"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gradient-appreciation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradient-paydown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="gradient-cashflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Legend - Wrap on mobile */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500 flex-shrink-0" />
          <span className="text-[13px] font-bold text-gray-700 dark:text-white whitespace-nowrap">Cash Flow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-[13px] font-bold text-gray-700 dark:text-white whitespace-nowrap">Loan Paydown</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-[13px] font-bold text-gray-700 dark:text-white whitespace-nowrap">Appreciation</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUMMARY CARD
// ============================================

function SummaryCard({
  label,
  value,
  subValue,
  icon: Icon,
  highlight,
  trend
}: {
  label: string
  value: string
  subValue?: string
  icon: any
  highlight?: boolean
  trend?: 'up' | 'down'
}) {
  return (
    <div className={`p-2.5 sm:p-3 rounded-xl ${
      highlight 
        ? 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-700' 
        : 'bg-white dark:bg-navy-800 border border-gray-100 dark:border-navy-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5 truncate">{label}</div>
          <div className={`text-base sm:text-lg font-bold ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </div>
          {subValue && (
            <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subValue}</div>
          )}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-[10px] sm:text-xs ${
          trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
        }`}>
          <ArrowUpRight className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
          <span>{trend === 'up' ? 'Positive' : 'Declining'}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// YEAR-BY-YEAR TABLE
// ============================================

function ProjectionTable({ data }: { data: YearlyProjection[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-1.5 font-medium text-gray-500">Year</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Property Value</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Loan Balance</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Total Equity</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Cash Flow</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Cumulative CF</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">Total Wealth</th>
            <th className="text-right py-2 px-1.5 font-medium text-gray-500">CoC Return</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.year} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-1.5 font-medium">Y{row.year}</td>
              <td className="py-2 px-1.5 text-right">{formatCompactCurrency(row.propertyValue)}</td>
              <td className="py-2 px-1.5 text-right text-gray-500">{formatCompactCurrency(row.loanBalance)}</td>
              <td className="py-2 px-1.5 text-right text-blue-600 font-medium">{formatCompactCurrency(row.totalEquity)}</td>
              <td className={`py-2 px-1.5 text-right font-medium ${row.cashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCompactCurrency(row.cashFlow)}
              </td>
              <td className={`py-2 px-1.5 text-right ${row.cumulativeCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCompactCurrency(row.cumulativeCashFlow)}
              </td>
              <td className="py-2 px-1.5 text-right font-semibold text-purple-600">{formatCompactCurrency(row.totalWealth)}</td>
              <td className="py-2 px-1.5 text-right">{formatPercent(row.cashOnCash)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// MAIN PROJECTIONS COMPONENT
// ============================================

interface ProjectionsViewProps {
  assumptions: ProjectionAssumptions
  onAssumptionChange?: (key: keyof ProjectionAssumptions, value: number) => void
}

export default function ProjectionsView({ assumptions, onAssumptionChange }: ProjectionsViewProps) {
  const projections = useMemo(() => calculate10YearProjections(assumptions), [assumptions])
  
  const totalCashInvested = assumptions.purchasePrice * assumptions.downPaymentPct + 
                            assumptions.purchasePrice * assumptions.closingCostsPct
  
  const summary = useMemo(
    () => calculateProjectionSummary(projections, totalCashInvested),
    [projections, totalCashInvested]
  )
  
  const year10 = projections[9]
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 10-Year Result Summary - Mobile optimized */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-3 sm:p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-emerald-100 text-[10px] sm:text-xs uppercase tracking-wide">10-Year Net Gain</div>
            <div className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">+{formatCompactCurrency(year10.totalWealth - totalCashInvested)}</div>
            <div className="text-emerald-200 text-xs sm:text-sm mt-0.5 sm:mt-1">
              {formatCompactCurrency(totalCashInvested)} → {formatCompactCurrency(year10.totalWealth)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl sm:text-4xl font-bold">{summary.equityMultiple.toFixed(1)}x</div>
            <div className="text-emerald-200 text-xs sm:text-sm">Return Multiple</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Wealth (Year 10)"
          value={formatCompactCurrency(year10.totalWealth)}
          subValue={`${formatPercent(summary.equityMultiple - 1)} growth`}
          icon={Award}
          highlight
          trend="up"
        />
        <SummaryCard
          label="Total Cash Flow"
          value={formatCompactCurrency(summary.totalCashFlow)}
          subValue="10-year cumulative"
          icon={Wallet}
          trend={summary.totalCashFlow > 0 ? 'up' : 'down'}
        />
        <SummaryCard
          label="Total Equity"
          value={formatCompactCurrency(year10.totalEquity)}
          subValue={`From ${formatCompactCurrency(totalCashInvested)} invested`}
          icon={Building2}
        />
        <SummaryCard
          label="Est. IRR"
          value={formatPercent(summary.irr)}
          subValue="Internal Rate of Return"
          icon={Target}
          highlight={summary.irr > 0.15}
        />
      </div>

      {/* Wealth Growth Chart */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-100 dark:border-navy-700 p-3 sm:p-4">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white mb-2 sm:mb-3">Wealth Accumulation</h3>
        <StackedAreaChart data={projections} height={140} />
        
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-navy-700">
          <div className="text-center min-w-0">
            <div className="text-[14px] sm:text-lg font-bold text-purple-600">{formatCompactCurrency(year10.cumulativeCashFlow)}</div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white truncate">Cash Flow</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-[14px] sm:text-lg font-bold text-blue-600">{formatCompactCurrency(year10.equityFromPaydown)}</div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white truncate">Principal Paydown</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-[14px] sm:text-lg font-bold text-emerald-600">{formatCompactCurrency(year10.equityFromAppreciation)}</div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white truncate">Appreciation</div>
          </div>
        </div>
      </div>

      {/* Annual Cash Flow Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-100 dark:border-navy-700 p-3 sm:p-4">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white mb-2 sm:mb-3">Annual Cash Flow</h3>
          <MiniBarChart 
            data={projections.map(p => p.cashFlow)} 
            color="green"
            height={80}
          />
          <div className="mt-2 sm:mt-3 text-center">
            <span className="text-[13px] font-bold text-gray-600 dark:text-white">Avg: </span>
            <span className="text-[13px] sm:text-[14px] font-bold text-emerald-600">
              {formatCurrency(summary.totalCashFlow / 10)}/year
            </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-100 dark:border-navy-700 p-3 sm:p-4">
          <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white mb-2 sm:mb-3">Equity Growth</h3>
          <MiniBarChart 
            data={projections.map(p => p.totalEquity)} 
            color="blue"
            height={80}
          />
          <div className="mt-2 sm:mt-3 text-center">
            <span className="text-[13px] font-bold text-gray-600 dark:text-white">Year 10: </span>
            <span className="text-[13px] sm:text-[14px] font-bold text-blue-600">
              {formatCompactCurrency(year10.totalEquity)}
            </span>
          </div>
        </div>
      </div>

      {/* Growth Assumptions */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-3 sm:p-4 border border-indigo-100 dark:border-indigo-800">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white mb-2 sm:mb-3">Growth Assumptions</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white">Annual Appreciation</div>
            <div className="text-[13px] sm:text-[14px] font-bold text-indigo-600 dark:text-indigo-400">{formatPercent(assumptions.annualAppreciation)}</div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white">Rent Growth</div>
            <div className="text-[13px] sm:text-[14px] font-bold text-indigo-600 dark:text-indigo-400">{formatPercent(assumptions.annualRentGrowth)}</div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white">Property Tax Growth</div>
            <div className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white">{formatPercent(assumptions.propertyTaxGrowth)}</div>
          </div>
          <div>
            <div className="text-[13px] font-bold text-gray-600 dark:text-white">Insurance Growth</div>
            <div className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white">{formatPercent(assumptions.insuranceGrowth)}</div>
          </div>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-gray-100 dark:border-navy-700 p-3 sm:p-4">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-700 dark:text-white mb-2 sm:mb-3">Year-by-Year Breakdown</h3>
        <ProjectionTable data={projections} />
      </div>
    </div>
  )
}
