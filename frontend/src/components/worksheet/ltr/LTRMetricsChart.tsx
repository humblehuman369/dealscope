'use client'

import React, { useMemo } from 'react'

// ============================================
// TYPES
// ============================================
export interface LTRMetricsData {
  // Return Metrics
  capRate: number
  cashOnCash: number
  irr?: number
  equityCapture?: number
  
  // Risk Metrics
  cashFlowYield: number
  dscr: number
  expenseRatio: number
  breakevenOccupancy: number
  
  // Summary values
  profitQualityScore: number
  strategyFit: string
  riskLevel: string
  returnProfile: string
  downsideProtection: string
  bottomLine: string
  
  // Verdict
  verdict: {
    label: string
    detail: string
    status: 'good' | 'warn' | 'bad'
  }
}

interface LTRMetricsChartProps {
  data: LTRMetricsData
  theme?: 'light' | 'dark'
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const getStatusColor = (status: 'good' | 'warn' | 'bad') => {
  switch (status) {
    case 'good': return 'text-emerald-500'
    case 'warn': return 'text-amber-500'
    case 'bad': return 'text-red-500'
    default: return 'text-slate-500'
  }
}

const getStatusBgColor = (status: 'good' | 'warn' | 'bad') => {
  switch (status) {
    case 'good': return 'bg-emerald-500/10'
    case 'warn': return 'bg-amber-500/10'
    case 'bad': return 'bg-red-500/10'
    default: return 'bg-slate-500/10'
  }
}

const getStatusDotColor = (status: 'good' | 'warn' | 'bad') => {
  switch (status) {
    case 'good': return 'bg-emerald-500'
    case 'warn': return 'bg-amber-500'
    case 'bad': return 'bg-red-500'
    default: return 'bg-slate-500'
  }
}

const getBarColor = (value: number) => {
  if (value >= 75) return 'bg-emerald-500'
  if (value >= 50) return 'bg-teal'
  if (value >= 25) return 'bg-amber-500'
  return 'bg-red-500'
}

// ============================================
// METRIC TABLE COMPONENT
// ============================================
interface MetricRow {
  metric: string
  result: string
  status: 'good' | 'warn' | 'bad'
  label: string
}

function MetricTable({ rows }: { rows: MetricRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-slate-500 text-xs uppercase tracking-wider">
          <th className="text-left py-2 font-medium w-[40%]">Metric</th>
          <th className="text-left py-2 font-medium w-[30%]">Result</th>
          <th className="text-left py-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.metric} className="border-t border-slate-200 dark:border-slate-700">
            <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{row.metric}</td>
            <td className="py-3 tabular-nums text-slate-800 dark:text-white font-semibold">{row.result}</td>
            <td className="py-3">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBgColor(row.status)} ${getStatusColor(row.status)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(row.status)}`} />
                {row.label}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LTRMetricsChart({ data, theme = 'light' }: LTRMetricsChartProps) {
  const isDark = theme === 'dark'
  
  // Calculate performance bars from the metrics
  const bars = useMemo(() => {
    // Returns score: Cap Rate target 8%, CoC target 10%
    const returnsScore = Math.min(100, ((data.capRate / 8) * 50) + ((data.cashOnCash / 10) * 50))
    
    // Cash Flow score: Based on cash flow yield
    const cashFlowScore = Math.min(100, (data.cashFlowYield / 10) * 100)
    
    // Equity Gain: Based on equity capture if available
    const equityScore = data.equityCapture ? Math.min(100, (data.equityCapture / 20) * 100) : 50
    
    // Debt Safety: DSCR target 1.25
    const debtScore = Math.min(100, (data.dscr / 1.5) * 100)
    
    // Cost Control: Expense ratio (lower is better, target < 50%)
    const costScore = Math.max(0, 100 - data.expenseRatio)
    
    // Downside Risk: Breakeven occupancy (lower is better)
    const downsideScore = Math.max(0, 100 - data.breakevenOccupancy)
    
    return [
      { label: 'Returns', value: Math.round(returnsScore) },
      { label: 'Cash Flow', value: Math.round(cashFlowScore) },
      { label: 'Equity Gain', value: Math.round(equityScore) },
      { label: 'Debt Safety', value: Math.round(debtScore) },
      { label: 'Cost Control', value: Math.round(costScore) },
      { label: 'Downside Risk', value: Math.round(downsideScore) },
    ]
  }, [data])

  // Build return metrics table rows
  const returnMetrics: MetricRow[] = useMemo(() => [
    { 
      metric: 'Cap Rate', 
      result: `${data.capRate.toFixed(1)}%`, 
      status: data.capRate >= 8 ? 'good' : data.capRate >= 5 ? 'warn' : 'bad',
      label: data.capRate >= 8 ? 'Above Target' : data.capRate >= 5 ? 'Acceptable' : 'Below Target'
    },
    { 
      metric: 'Cash-on-Cash', 
      result: `${data.cashOnCash.toFixed(1)}%`, 
      status: data.cashOnCash >= 10 ? 'good' : data.cashOnCash >= 5 ? 'warn' : 'bad',
      label: data.cashOnCash >= 10 ? 'Strong' : data.cashOnCash >= 5 ? 'Moderate' : 'Weak'
    },
    ...(data.irr !== undefined ? [{
      metric: 'IRR (10-yr)',
      result: `${data.irr.toFixed(1)}%`,
      status: (data.irr >= 15 ? 'good' : data.irr >= 10 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
      label: data.irr >= 15 ? 'Value-Add Tier' : data.irr >= 10 ? 'Stabilized' : 'Below Target'
    }] : []),
    ...(data.equityCapture !== undefined ? [{
      metric: 'Equity Capture',
      result: `${data.equityCapture.toFixed(0)}%`,
      status: (data.equityCapture >= 10 ? 'good' : data.equityCapture >= 5 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
      label: data.equityCapture >= 10 ? 'Discounted Entry' : data.equityCapture >= 5 ? 'Fair Value' : 'Premium'
    }] : []),
  ], [data])

  // Build risk metrics table rows
  const riskMetrics: MetricRow[] = useMemo(() => [
    { 
      metric: 'Cash Flow Yield', 
      result: `${data.cashFlowYield.toFixed(1)}%`, 
      status: data.cashFlowYield >= 8 ? 'good' : data.cashFlowYield >= 5 ? 'warn' : 'bad',
      label: data.cashFlowYield >= 8 ? 'Healthy' : data.cashFlowYield >= 5 ? 'Moderate' : 'Thin'
    },
    { 
      metric: 'DSCR', 
      result: data.dscr.toFixed(2), 
      status: data.dscr >= 1.25 ? 'good' : data.dscr >= 1.0 ? 'warn' : 'bad',
      label: data.dscr >= 1.25 ? 'Strong' : data.dscr >= 1.0 ? 'Acceptable' : 'Risk'
    },
    { 
      metric: 'Expense Ratio', 
      result: `${data.expenseRatio.toFixed(0)}%`, 
      status: data.expenseRatio <= 40 ? 'good' : data.expenseRatio <= 50 ? 'warn' : 'bad',
      label: data.expenseRatio <= 40 ? 'Efficient' : data.expenseRatio <= 50 ? 'Monitor' : 'High'
    },
    { 
      metric: 'Breakeven Occ.', 
      result: `${data.breakevenOccupancy.toFixed(0)}%`, 
      status: data.breakevenOccupancy <= 75 ? 'good' : data.breakevenOccupancy <= 85 ? 'warn' : 'bad',
      label: data.breakevenOccupancy <= 75 ? 'Defensive' : data.breakevenOccupancy <= 85 ? 'Standard' : 'Tight'
    },
  ], [data])

  // Build signals for at-a-glance view
  const signals = useMemo(() => {
    const avg = (a: number, b: number) => (a + b) / 2
    
    const returnsAvg = avg(
      data.capRate >= 8 ? 100 : data.capRate >= 5 ? 50 : 0,
      data.cashOnCash >= 10 ? 100 : data.cashOnCash >= 5 ? 50 : 0
    )
    
    return [
      { 
        icon: returnsAvg >= 75 ? '🟢' : returnsAvg >= 50 ? '🟡' : '🔴', 
        name: 'Returns', 
        tag: returnsAvg >= 75 ? 'Strong' : returnsAvg >= 50 ? 'Moderate' : 'Weak'
      },
      { 
        icon: data.cashFlowYield >= 8 ? '🟢' : data.cashFlowYield >= 5 ? '🟡' : '🔴', 
        name: 'Cash Flow', 
        tag: data.cashFlowYield >= 8 ? 'Healthy' : data.cashFlowYield >= 5 ? 'Moderate' : 'Thin'
      },
      { 
        icon: data.expenseRatio <= 40 ? '🟢' : data.expenseRatio <= 50 ? '🟡' : '🔴', 
        name: 'Operating Efficiency', 
        tag: data.expenseRatio <= 40 ? 'Efficient' : data.expenseRatio <= 50 ? 'Watch' : 'High Cost'
      },
      { 
        icon: data.breakevenOccupancy <= 75 ? '🟢' : data.breakevenOccupancy <= 85 ? '🟡' : '🔴', 
        name: 'Downside Protection', 
        tag: data.breakevenOccupancy <= 75 ? 'Solid' : data.breakevenOccupancy <= 85 ? 'Adequate' : 'Vulnerable'
      },
    ]
  }, [data])

  const score = Math.max(0, Math.min(100, data.profitQualityScore))

  return (
    <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Investment Performance Summary
              </h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Price-agnostic ROI-based decision view
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* LEFT: Decision Panel */}
        <div className={`rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Decision</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Verdict + key why's (investor scan view)
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                Goal: "Does the price work?"
              </span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Verdict Badge */}
            <div className="flex justify-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusBgColor(data.verdict.status)} animate-pulse`}>
                <span className={`w-2 h-2 rounded-full ${getStatusDotColor(data.verdict.status)}`} />
                <span className={`font-bold ${getStatusColor(data.verdict.status)}`}>{data.verdict.label}</span>
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{data.verdict.detail}</span>
              </div>
            </div>

            {/* Profit Quality Score Ring */}
            <div className="flex items-center gap-6 justify-center">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={isDark ? '#1e293b' : '#e2e8f0'}
                    strokeWidth="12"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke={score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${score * 2.64} 264`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{score}</span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/ 100</span>
                </div>
              </div>
              <div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Profit Quality Score</div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-[180px]`}>
                  Built from ROI + risk protection metrics (price-agnostic).
                </p>
              </div>
            </div>

            {/* Strategy Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Strategy Fit</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.strategyFit}</div>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risk Level</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.riskLevel}</div>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Return Profile</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.returnProfile}</div>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Downside Protection</div>
                <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.downsideProtection}</div>
              </div>
            </div>

            {/* Bottom Line */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>Bottom Line:</strong> {data.bottomLine}
              </p>
            </div>

            {/* Metric Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Return Metrics</h4>
                <MetricTable rows={returnMetrics} />
              </div>
              <div>
                <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cash Flow & Risk</h4>
                <MetricTable rows={riskMetrics} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: At-a-glance Panel */}
        <div className={`rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>At-a-glance</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fast scan + performance bars
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                Simple investor language
              </span>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Signal Rows */}
            <div className="space-y-2">
              {signals.map((signal) => (
                <div 
                  key={signal.name}
                  className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">{signal.icon}</span>
                    <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{signal.name}</span>
                  </div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                    {signal.tag}
                  </span>
                </div>
              ))}
            </div>

            {/* Performance Bars */}
            <div>
              <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Performance Bars</h4>
              <div className="space-y-3">
                {bars.map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{bar.label}</span>
                      <span className={`font-medium tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>{bar.value}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getBarColor(bar.value)}`}
                        style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profit Quality Note */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>Profit Quality:</strong> {score}% composite score across returns and risk protection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPER: Build metrics data from LTRWorksheet calculations
// ============================================
export function buildLTRMetricsData(calc: {
  capRatePurchase: number
  cashOnCash: number
  dscr: number
  noi: number
  grossExpenses: number
  grossIncome: number
  breakEvenRatio: number
  equityAtPurchase?: number
  totalCashNeeded?: number
}): LTRMetricsData {
  // Calculate derived metrics
  const expenseRatio = calc.grossIncome > 0 
    ? (calc.grossExpenses / calc.grossIncome) * 100 
    : 0
  
  const cashFlowYield = calc.totalCashNeeded && calc.totalCashNeeded > 0 
    ? ((calc.noi - (calc.grossIncome * 0.12)) / calc.totalCashNeeded) * 100 // Simplified cash flow yield
    : calc.cashOnCash
  
  // Calculate profit quality score (0-100)
  let profitScore = 0
  profitScore += calc.capRatePurchase >= 8 ? 20 : calc.capRatePurchase >= 5 ? 10 : 0
  profitScore += calc.cashOnCash >= 10 ? 20 : calc.cashOnCash >= 5 ? 10 : 0
  profitScore += calc.dscr >= 1.25 ? 20 : calc.dscr >= 1.0 ? 10 : 0
  profitScore += expenseRatio <= 40 ? 20 : expenseRatio <= 50 ? 10 : 0
  profitScore += calc.breakEvenRatio <= 75 ? 20 : calc.breakEvenRatio <= 85 ? 10 : 0
  
  // Determine verdict
  let verdictLabel: string
  let verdictStatus: 'good' | 'warn' | 'bad'
  let targetsHit = 0
  if (calc.capRatePurchase >= 8) targetsHit++
  if (calc.cashOnCash >= 10) targetsHit++
  if (calc.dscr >= 1.25) targetsHit++
  if (expenseRatio <= 40) targetsHit++
  if (calc.breakEvenRatio <= 75) targetsHit++
  
  if (targetsHit >= 4) {
    verdictLabel = 'STRONG DEAL'
    verdictStatus = 'good'
  } else if (targetsHit >= 2) {
    verdictLabel = 'MODERATE DEAL'
    verdictStatus = 'warn'
  } else {
    verdictLabel = 'WEAK DEAL'
    verdictStatus = 'bad'
  }
  
  // Determine strategy descriptors
  const strategyFit = calc.cashOnCash >= 8 ? 'Value-Add' : calc.cashOnCash >= 5 ? 'Stabilized' : 'Development'
  const riskLevel = calc.dscr >= 1.5 ? 'Low' : calc.dscr >= 1.25 ? 'Moderate' : 'High'
  const returnProfile = calc.capRatePurchase >= 8 ? 'Yield + Growth' : calc.capRatePurchase >= 5 ? 'Yield Focused' : 'Growth Focused'
  const downsideProtection = calc.breakEvenRatio <= 70 ? 'Strong' : calc.breakEvenRatio <= 80 ? 'Moderate' : 'Weak'
  
  // Build bottom line narrative
  const bottomLine = profitScore >= 70
    ? 'This deal shows strong cash yield, meaningful equity capture, and maintains defensive coverage under stress. Best suited for investors seeking yield + forced appreciation.'
    : profitScore >= 40
    ? 'This deal has potential but requires careful consideration of operating costs and debt coverage. May benefit from value-add improvements.'
    : 'This deal presents elevated risk with thin margins. Consider renegotiating price or improving operational efficiency before proceeding.'
  
  return {
    capRate: calc.capRatePurchase,
    cashOnCash: calc.cashOnCash,
    cashFlowYield: cashFlowYield > 0 ? cashFlowYield : calc.cashOnCash,
    dscr: calc.dscr,
    expenseRatio,
    breakevenOccupancy: calc.breakEvenRatio,
    equityCapture: calc.equityAtPurchase && calc.totalCashNeeded 
      ? (calc.equityAtPurchase / calc.totalCashNeeded) * 100 
      : undefined,
    profitQualityScore: profitScore,
    strategyFit,
    riskLevel,
    returnProfile,
    downsideProtection,
    bottomLine,
    verdict: {
      label: verdictLabel,
      detail: `(Exceeds ${targetsHit} of 5 targets)`,
      status: verdictStatus,
    },
  }
}
