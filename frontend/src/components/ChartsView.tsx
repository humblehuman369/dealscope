'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  TrendingUp, DollarSign, PiggyBank, BarChart3,
  ArrowUpRight, ArrowDownRight, Wallet, Building2, Sparkles,
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw
} from 'lucide-react'
import { YearlyProjection } from '@/lib/projections'
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters'

// ============================================
// 1. CASH FLOW - INTERACTIVE RADIAL + BAR CHART
// ============================================

function CashFlowLollipopChart({ data }: { data: YearlyProjection[] }) {
  const [selectedYear, setSelectedYear] = useState(9)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        if (prev >= 9) {
          setIsPlaying(false)
          return 9
        }
        return prev + 1
      })
    }, 800)
    return () => clearInterval(interval)
  }, [isPlaying])
  
  const yearData = data[selectedYear]
  const totalCF = data.reduce((sum, d) => sum + d.cashFlow, 0)
  const maxCumulative = data[9].cumulativeCashFlow
  const currentCumulative = yearData.cumulativeCashFlow
  const cumulativePercent = maxCumulative > 0 ? (currentCumulative / maxCumulative) * 100 : 0
  
  // Smaller radial chart settings for mobile
  const radius = 50
  const strokeWidth = 12
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (cumulativePercent / 100) * circumference
  
  return (
    <div className="space-y-4">
      {/* Top Summary - Mobile optimized */}
      <div className="bg-gradient-to-r from-[#1f8a70] via-[#146c59] to-[#0465f2] rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Annual Cash Flow</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(yearData.cashFlow)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Cumulative</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(currentCumulative)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">10-Year Total</div>
            <div className="text-lg sm:text-xl font-bold text-[#00e5ff]">{formatCompactCurrency(totalCF)}</div>
          </div>
        </div>
      </div>
      
      {/* Radial Progress + Bar Chart - Stack on mobile */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Radial Chart - Centered on mobile */}
          <div className="relative flex-shrink-0">
            <svg width={(radius + strokeWidth) * 2 + 16} height={(radius + strokeWidth) * 2 + 16}>
              <defs>
                <linearGradient id="cashFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1f8a70" />
                  <stop offset="100%" stopColor="#146c59" />
                </linearGradient>
                <filter id="cashGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#1f8a70" floodOpacity="0.5" />
                </filter>
              </defs>
              
              {/* Background track */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius}
                fill="none"
                stroke="var(--chart-grid)"
                strokeWidth={strokeWidth}
              />
              
              {/* Progress arc */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius}
                fill="none"
                stroke="url(#cashFlowGrad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${radius + strokeWidth + 8} ${radius + strokeWidth + 8})`}
                filter="url(#cashGlow)"
                className="transition-all duration-500"
              />
              
              {/* Center text */}
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 3}
                textAnchor="middle"
                className="text-xl font-bold fill-[var(--text-heading)]"
                fontSize="16"
              >
                {formatCompactCurrency(currentCumulative)}
              </text>
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 18}
                textAnchor="middle"
                className="fill-[var(--text-muted)]"
                fontSize="9"
              >
                Cumulative
              </text>
            </svg>
          </div>
          
          {/* Bar Chart - Full width on mobile */}
          <div className="w-full sm:flex-1">
            <div className="text-sm font-medium text-[var(--text-heading)] mb-2 sm:mb-3">Annual Cash Flow by Year</div>
            <div className="flex items-end gap-1 h-24 sm:h-32">
              {data.map((d, i) => {
                const maxCF = Math.max(...data.map(x => x.cashFlow))
                const height = maxCF > 0 ? (d.cashFlow / maxCF) * 100 : 0
                const isSelected = i === selectedYear
                const isPositive = d.cashFlow >= 0
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedYear(i)}
                    className={`flex-1 rounded-t-lg transition-all duration-300 cursor-pointer hover:opacity-80 ${
                      isSelected 
                        ? isPositive ? 'bg-gradient-to-t from-[#146c59] to-[#1f8a70]' : 'bg-gradient-to-t from-[#b42318] to-[#dc2626]'
                        : isPositive ? 'bg-gradient-to-t from-[rgba(31,138,112,0.35)] to-[rgba(31,138,112,0.15)]' : 'bg-gradient-to-t from-[rgba(180,35,24,0.35)] to-[rgba(180,35,24,0.12)]'
                    }`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                    title={`Year ${d.year}: ${formatCurrency(d.cashFlow)}`}
                  />
                )
              })}
            </div>
            <div className="flex gap-1 mt-1.5">
              {data.map((d, i) => (
                <div 
                  key={i} 
                  className={`flex-1 text-center text-[9px] sm:text-[10px] transition-colors ${
                    i === selectedYear ? 'text-[var(--status-positive)] font-bold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  Y{d.year}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Year Selector with Playback */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/70 text-sm">Year Timeline</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(0)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Reset to Year 1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={() => {
                if (selectedYear >= 9) setSelectedYear(0)
                setIsPlaying(!isPlaying)
              }}
              className="p-1.5 rounded-full bg-[#1f8a70] hover:bg-[#146c59] transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedYear(Math.max(0, selectedYear - 1))}
            disabled={selectedYear === 0}
            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex-1 flex items-center gap-1">
            {data.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedYear(i)}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  i <= selectedYear 
                    ? 'bg-gradient-to-r from-[#1f8a70] to-[#0465f2]' 
                    : 'bg-white/20'
                } ${i === selectedYear ? 'scale-y-150' : ''}`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setSelectedYear(Math.min(9, selectedYear + 1))}
            disabled={selectedYear === 9}
            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="text-center mt-2">
          <span className="text-[#00e5ff] font-bold">Year {selectedYear + 1}</span>
          <span className="text-white/50 text-sm ml-2">of 10</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 2. EQUITY - INTERACTIVE STACKED BAR + DONUT
// ============================================

function EquityMirrorChart({ data, totalCashInvested }: { data: YearlyProjection[]; totalCashInvested: number }) {
  const [selectedYear, setSelectedYear] = useState(9)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        if (prev >= 9) {
          setIsPlaying(false)
          return 9
        }
        return prev + 1
      })
    }, 800)
    return () => clearInterval(interval)
  }, [isPlaying])
  
  const yearData = data[selectedYear]
  const crossoverYear = data.findIndex(d => d.totalEquity > d.loanBalance)
  
  // Equity components
  const equityComponents = [
    { label: 'Down Payment', value: totalCashInvested, color: '#1f8a70', icon: DollarSign },
    { label: 'Loan Paydown', value: yearData.equityFromPaydown, color: '#07172e', icon: Building2 },
    { label: 'Appreciation', value: yearData.equityFromAppreciation, color: '#0465f2', icon: TrendingUp },
  ]
  
  const totalEquity = yearData.totalEquity
  const maxEquity = data[9].totalEquity
  
  // Smaller donut chart settings for mobile
  const radius = 50
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercent = 0
  
  return (
    <div className="space-y-4">
      {/* Top Summary - Mobile optimized */}
      <div className="bg-gradient-to-r from-[#0465f2] via-[#07172e] to-[#1f8a70] rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Equity</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(totalEquity)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Year 10 Equity</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(maxEquity)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Equity Gain</div>
            <div className="text-lg sm:text-xl font-bold text-[#00e5ff]">
              +{formatCompactCurrency(totalEquity - totalCashInvested)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut + Breakdown - Stack on mobile */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Donut Chart - Centered on mobile */}
          <div className="relative flex-shrink-0">
            <svg width={(radius + strokeWidth) * 2 + 16} height={(radius + strokeWidth) * 2 + 16}>
              <defs>
                {equityComponents.map((seg, i) => (
                  <linearGradient key={i} id={`eqGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
                  </linearGradient>
                ))}
                <filter id="eqShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
                </filter>
              </defs>
              
              {/* Background track */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius}
                fill="none"
                stroke="var(--chart-grid)"
                strokeWidth={strokeWidth}
              />
              
              {/* Segments */}
              {equityComponents.map((seg, i) => {
                const percent = totalEquity > 0 ? (seg.value / totalEquity) * 100 : 0
                const offset = circumference - (percent / 100) * circumference
                const rotation = (cumulativePercent / 100) * 360 - 90
                cumulativePercent += percent
                
                return (
                  <circle
                    key={i}
                    cx={radius + strokeWidth + 8}
                    cy={radius + strokeWidth + 8}
                    r={radius}
                    fill="none"
                    stroke={`url(#eqGrad-${i})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${radius + strokeWidth + 8} ${radius + strokeWidth + 8})`}
                    filter="url(#eqShadow)"
                    className="transition-all duration-500"
                  />
                )
              })}
              
              {/* Center text */}
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 3}
                textAnchor="middle"
                className="text-lg font-bold fill-[var(--text-heading)]"
                fontSize="16"
              >
                {formatCompactCurrency(totalEquity)}
              </text>
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 16}
                textAnchor="middle"
                className="fill-[var(--text-muted)]"
                fontSize="8"
              >
                Total Equity
              </text>
            </svg>
          </div>
          
          {/* Breakdown - Full width on mobile */}
          <div className="w-full sm:flex-1 space-y-2.5">
            <div className="text-sm font-medium text-[var(--text-heading)] mb-3">Equity Breakdown</div>
            {(() => { cumulativePercent = 0; return null; })()}
            {equityComponents.map((seg, i) => {
              const percent = totalEquity > 0 ? (seg.value / totalEquity) * 100 : 0
              const Icon = seg.icon
              
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: seg.color + '20' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: seg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-[var(--text-heading)] truncate">{seg.label}</span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: seg.color }}>
                        {formatCompactCurrency(seg.value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--chart-grid)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percent}%`,
                          backgroundColor: seg.color
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] w-8 text-right flex-shrink-0">{percent.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Equity vs Loan Comparison */}
      <div className="bg-[var(--surface-elevated)] rounded-xl p-5 border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-[var(--text-heading)]">Equity vs Loan Balance</div>
          {crossoverYear > 0 && selectedYear >= crossoverYear && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(31,138,112,0.12)] rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-[var(--status-positive)]" />
              <span className="text-xs font-medium text-[var(--status-positive)]">Equity exceeds loan!</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Equity Bar */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-[var(--text-secondary)]">Equity</div>
            <div className="flex-1 h-8 bg-[var(--surface-card)] rounded-lg overflow-hidden border border-[var(--border-default)]">
              <div 
                className="h-full bg-gradient-to-r from-[#1f8a70] to-[#146c59] rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                style={{ width: `${(totalEquity / Math.max(totalEquity, yearData.loanBalance)) * 100}%` }}
              >
                <span className="text-xs font-bold text-white">{formatCompactCurrency(totalEquity)}</span>
              </div>
            </div>
          </div>
          
          {/* Loan Bar */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-[var(--text-secondary)]">Loan</div>
            <div className="flex-1 h-8 bg-[var(--surface-card)] rounded-lg overflow-hidden border border-[var(--border-default)]">
              <div 
                className="h-full bg-gradient-to-r from-[#07172e] to-[#10223d] rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                style={{ width: `${(yearData.loanBalance / Math.max(totalEquity, yearData.loanBalance)) * 100}%` }}
              >
                <span className="text-xs font-bold text-white">{formatCompactCurrency(yearData.loanBalance)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {crossoverYear > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-center">
            <span className="text-xs text-[var(--text-secondary)]">Crossover Point: </span>
            <span className="text-xs font-bold text-[var(--status-positive)]">Year {crossoverYear + 1}</span>
          </div>
        )}
      </div>
      
      {/* Year Selector with Playback */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/70 text-sm">Year Timeline</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(0)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Reset to Year 1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={() => {
                if (selectedYear >= 9) setSelectedYear(0)
                setIsPlaying(!isPlaying)
              }}
              className="p-1.5 rounded-full bg-[#1f8a70] hover:bg-[#146c59] transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedYear(Math.max(0, selectedYear - 1))}
            disabled={selectedYear === 0}
            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex-1 flex items-center gap-1">
            {data.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedYear(i)}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  i <= selectedYear 
                    ? 'bg-gradient-to-r from-[#1f8a70] to-[#0465f2]' 
                    : 'bg-white/20'
                } ${i === selectedYear ? 'scale-y-150' : ''}`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setSelectedYear(Math.min(9, selectedYear + 1))}
            disabled={selectedYear === 9}
            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="text-center mt-2">
          <span className="text-[#00e5ff] font-bold">Year {selectedYear + 1}</span>
          <span className="text-white/50 text-sm ml-2">of 10</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 3. TOTAL WEALTH - ANIMATED DONUT + TIMELINE
// ============================================

function TotalWealthDonutChart({ data, totalCashInvested }: { data: YearlyProjection[]; totalCashInvested: number }) {
  const [selectedYear, setSelectedYear] = useState(9)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Auto-play animation
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setSelectedYear(prev => {
        if (prev >= 9) {
          setIsPlaying(false)
          return 9
        }
        return prev + 1
      })
    }, 800)
    return () => clearInterval(interval)
  }, [isPlaying])
  
  const yearData = data[selectedYear]
  
  const segments = [
    { label: 'Cash Flow', value: Math.max(0, yearData.cumulativeCashFlow), color: '#1f8a70', icon: Wallet },
    { label: 'Paydown', value: yearData.equityFromPaydown, color: '#07172e', icon: Building2 },
    { label: 'Appreciation', value: yearData.equityFromAppreciation, color: '#0465f2', icon: TrendingUp },
  ]
  
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  // Smaller radius for mobile
  const radius = 55
  const strokeWidth = 18
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercent = 0
  
  return (
    <div className="space-y-4">
      {/* Top Summary - Mobile optimized with wrap */}
      <div className="bg-gradient-to-r from-[#1f8a70] via-[#07172e] to-[#0465f2] rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Initial Investment</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(totalCashInvested)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Wealth</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(yearData.totalWealth)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-white/80 text-[10px] uppercase tracking-wide">Return</div>
            <div className="text-lg sm:text-xl font-bold text-[#00e5ff]">
              {(yearData.totalWealth / totalCashInvested).toFixed(1)}x
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut Chart - Stack vertically on mobile */}
      <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Donut - Centered on mobile */}
          <div className="relative flex-shrink-0">
            <svg width={radius * 2 + strokeWidth * 2 + 16} height={radius * 2 + strokeWidth * 2 + 16}>
              <defs>
                {segments.map((seg, i) => (
                  <linearGradient key={i} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
                  </linearGradient>
                ))}
                <filter id="donutShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
                </filter>
              </defs>
              
              {/* Background track */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius}
                fill="none"
                stroke="var(--chart-grid)"
                strokeWidth={strokeWidth}
              />
              
              {/* Segments */}
              {segments.map((seg, i) => {
                const percent = total > 0 ? seg.value / total : 0
                const dashLength = percent * circumference
                const rotation = cumulativePercent * 360 - 90
                cumulativePercent += percent
                
                return (
                  <circle
                    key={i}
                    cx={radius + strokeWidth + 8}
                    cy={radius + strokeWidth + 8}
                    r={radius}
                    fill="none"
                    stroke={`url(#grad-${i})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${radius + strokeWidth + 8} ${radius + strokeWidth + 8})`}
                    filter="url(#donutShadow)"
                    className="transition-all duration-700 ease-out"
                  />
                )
              })}
              
              {/* Center decoration */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius - strokeWidth - 6}
                fill="var(--surface-card)"
                filter="url(#donutShadow)"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">Total Wealth</div>
              <div className="text-xl font-bold text-[var(--text-heading)]">{formatCompactCurrency(yearData.totalWealth)}</div>
              <div className="mt-0.5 px-1.5 py-0.5 bg-[rgba(31,138,112,0.14)] text-[var(--status-positive)] rounded text-[10px] font-medium">
                +{formatCompactCurrency(yearData.totalWealth - totalCashInvested)}
              </div>
            </div>
          </div>
          
          {/* Legend & Breakdown - Full width on mobile */}
          <div className="w-full sm:flex-1 space-y-2">
            {segments.map((seg, i) => {
              const percent = total > 0 ? (seg.value / total) * 100 : 0
              
              return (
                <div key={i} className="bg-[var(--surface-elevated)] dark:bg-navy-700/50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-[13px] font-medium text-[var(--text-heading)] dark:text-white truncate">{seg.label}</span>
                      <span className="text-[13px] text-[var(--text-secondary)] dark:text-white">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="text-[13px] font-semibold flex-shrink-0" style={{ color: seg.color }}>
                      {formatCompactCurrency(seg.value)}
                    </div>
                  </div>
                  <div className="h-1 bg-[var(--chart-grid)] dark:bg-navy-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${percent}%`, backgroundColor: seg.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Timeline Controller - Compact */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedYear === 9) setSelectedYear(0)
              setIsPlaying(!isPlaying)
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => {
              setSelectedYear(0)
              setIsPlaying(false)
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-white" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/60 text-xs">Timeline</span>
              <span className="text-white text-xs font-medium">Year {selectedYear + 1}</span>
            </div>
            
            {/* Timeline dots */}
            <div className="flex items-center gap-0.5">
              {data.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedYear(i)
                    setIsPlaying(false)
                  }}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    i <= selectedYear 
                      ? 'bg-gradient-to-r from-[#1f8a70] to-[#0465f2]' 
                      : 'bg-white/20'
                  } ${i === selectedYear ? 'scale-y-150' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN CHARTS COMPONENT
// ============================================

interface ChartsViewProps {
  projections: YearlyProjection[]
  totalCashInvested: number
}

export default function ChartsView({ projections, totalCashInvested }: ChartsViewProps) {
  const [activeChart, setActiveChart] = useState<'cashflow' | 'equity' | 'wealth'>('wealth')
  
  const year10 = projections[9]
  
  const tabs = [
    { id: 'cashflow', label: 'Cash Flow', icon: DollarSign, value: year10.cumulativeCashFlow, color: 'emerald' },
    { id: 'equity', label: 'Equity', icon: TrendingUp, value: year10.totalEquity, color: 'blue' },
    { id: 'wealth', label: 'Total Wealth', icon: PiggyBank, value: year10.totalWealth, color: 'purple' },
  ]
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-heading)] dark:text-white">Wealth Visualizer</h2>
        <p className="text-[13px] sm:text-[14px] text-[var(--text-secondary)] dark:text-white">Interactive 10-year investment analysis</p>
      </div>

      {/* Tab Selector - Mobile optimized */}
      <div className="flex gap-1 sm:gap-2 p-1 bg-[var(--surface-elevated)] dark:bg-navy-700 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const isActive = activeChart === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-[13px] sm:text-[14px] font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--surface-card)] dark:bg-navy-600 shadow-sm text-[var(--text-heading)] dark:text-white' 
                  : 'text-[var(--text-secondary)] dark:text-white hover:text-[var(--text-heading)] dark:hover:text-gray-200'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className={`text-[11px] sm:text-[13px] px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap ${
                isActive ? 'bg-[var(--surface-elevated)] dark:bg-navy-500 text-[var(--text-heading)] dark:text-white' : 'text-[var(--text-secondary)] dark:text-white'
              }`}>
                {formatCompactCurrency(tab.value)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Chart Content */}
      <div className="min-h-[350px] sm:min-h-[400px]">
        {activeChart === 'cashflow' && <CashFlowLollipopChart data={projections} />}
        {activeChart === 'equity' && <EquityMirrorChart data={projections} totalCashInvested={totalCashInvested} />}
        {activeChart === 'wealth' && <TotalWealthDonutChart data={projections} totalCashInvested={totalCashInvested} />}
      </div>
    </div>
  )
}
