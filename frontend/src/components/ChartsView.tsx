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
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-emerald-200 text-[10px] uppercase tracking-wide">Annual Cash Flow</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(yearData.cashFlow)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-emerald-200 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Cumulative</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(currentCumulative)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-emerald-200 text-[10px] uppercase tracking-wide">10-Year Total</div>
            <div className="text-lg sm:text-xl font-bold text-cyan-300">{formatCompactCurrency(totalCF)}</div>
          </div>
        </div>
      </div>
      
      {/* Radial Progress + Bar Chart - Stack on mobile */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Radial Chart - Centered on mobile */}
          <div className="relative flex-shrink-0">
            <svg width={(radius + strokeWidth) * 2 + 16} height={(radius + strokeWidth) * 2 + 16}>
              <defs>
                <linearGradient id="cashFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>
                <filter id="cashGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
              </defs>
              
              {/* Background track */}
              <circle
                cx={radius + strokeWidth + 8}
                cy={radius + strokeWidth + 8}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
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
                className="text-xl font-bold fill-gray-900"
                fontSize="16"
              >
                {formatCompactCurrency(currentCumulative)}
              </text>
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 18}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="9"
              >
                Cumulative
              </text>
            </svg>
          </div>
          
          {/* Bar Chart - Full width on mobile */}
          <div className="w-full sm:flex-1">
            <div className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Annual Cash Flow by Year</div>
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
                        ? isPositive ? 'bg-gradient-to-t from-emerald-600 to-teal-500' : 'bg-gradient-to-t from-red-600 to-red-400'
                        : isPositive ? 'bg-gradient-to-t from-emerald-200 to-emerald-100' : 'bg-gradient-to-t from-red-200 to-red-100'
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
                    i === selectedYear ? 'text-emerald-600 font-bold' : 'text-gray-400'
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
              className="p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
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
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
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
          <span className="text-emerald-400 font-bold">Year {selectedYear + 1}</span>
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
    { label: 'Down Payment', value: totalCashInvested, color: '#6366f1', icon: DollarSign },
    { label: 'Loan Paydown', value: yearData.equityFromPaydown, color: '#3b82f6', icon: Building2 },
    { label: 'Appreciation', value: yearData.equityFromAppreciation, color: '#10b981', icon: TrendingUp },
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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-blue-200 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Equity</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(totalEquity)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-blue-200 text-[10px] uppercase tracking-wide">Year 10 Equity</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(maxEquity)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-blue-200 text-[10px] uppercase tracking-wide">Equity Gain</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-300">
              +{formatCompactCurrency(totalEquity - totalCashInvested)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut + Breakdown - Stack on mobile */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5">
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
                stroke="#e5e7eb"
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
                className="text-lg font-bold fill-gray-900"
                fontSize="16"
              >
                {formatCompactCurrency(totalEquity)}
              </text>
              <text
                x={radius + strokeWidth + 8}
                y={radius + strokeWidth + 16}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="8"
              >
                Total Equity
              </text>
            </svg>
          </div>
          
          {/* Breakdown - Full width on mobile */}
          <div className="w-full sm:flex-1 space-y-2.5">
            <div className="text-sm font-medium text-gray-700 mb-3">Equity Breakdown</div>
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
                      <span className="text-sm text-gray-700 truncate">{seg.label}</span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: seg.color }}>
                        {formatCompactCurrency(seg.value)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percent}%`,
                          backgroundColor: seg.color
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{percent.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Equity vs Loan Comparison */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-gray-700">Equity vs Loan Balance</div>
          {crossoverYear > 0 && selectedYear >= crossoverYear && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Equity exceeds loan!</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {/* Equity Bar */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-500">Equity</div>
            <div className="flex-1 h-8 bg-white rounded-lg overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                style={{ width: `${(totalEquity / Math.max(totalEquity, yearData.loanBalance)) * 100}%` }}
              >
                <span className="text-xs font-bold text-white">{formatCompactCurrency(totalEquity)}</span>
              </div>
            </div>
          </div>
          
          {/* Loan Bar */}
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-500">Loan</div>
            <div className="flex-1 h-8 bg-white rounded-lg overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                style={{ width: `${(yearData.loanBalance / Math.max(totalEquity, yearData.loanBalance)) * 100}%` }}
              >
                <span className="text-xs font-bold text-white">{formatCompactCurrency(yearData.loanBalance)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {crossoverYear > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 text-center">
            <span className="text-xs text-gray-500">Crossover Point: </span>
            <span className="text-xs font-bold text-emerald-600">Year {crossoverYear + 1}</span>
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
              className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors"
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
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-400' 
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
          <span className="text-blue-400 font-bold">Year {selectedYear + 1}</span>
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
    { label: 'Cash Flow', value: Math.max(0, yearData.cumulativeCashFlow), color: '#8b5cf6', icon: Wallet },
    { label: 'Paydown', value: yearData.equityFromPaydown, color: '#3b82f6', icon: Building2 },
    { label: 'Appreciation', value: yearData.equityFromAppreciation, color: '#10b981', icon: TrendingUp },
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
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-xl p-3 sm:p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-purple-200 text-[10px] uppercase tracking-wide">Initial Investment</div>
            <div className="text-lg sm:text-xl font-bold">{formatCompactCurrency(totalCashInvested)}</div>
          </div>
          <div className="hidden sm:block text-2xl font-thin text-white/30">→</div>
          <div className="text-right min-w-0">
            <div className="text-purple-200 text-[10px] uppercase tracking-wide">Year {selectedYear + 1} Wealth</div>
            <div className="text-xl sm:text-2xl font-bold">{formatCompactCurrency(yearData.totalWealth)}</div>
          </div>
          <div className="text-right pl-3 border-l border-white/20 min-w-0">
            <div className="text-purple-200 text-[10px] uppercase tracking-wide">Return</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-300">
              {(yearData.totalWealth / totalCashInvested).toFixed(1)}x
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut Chart - Stack vertically on mobile */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-5">
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
                stroke="#f3f4f6"
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
                fill="white"
                filter="url(#donutShadow)"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[9px] text-gray-400 uppercase tracking-wide">Total Wealth</div>
              <div className="text-xl font-bold text-gray-900">{formatCompactCurrency(yearData.totalWealth)}</div>
              <div className="mt-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">
                +{formatCompactCurrency(yearData.totalWealth - totalCashInvested)}
              </div>
            </div>
          </div>
          
          {/* Legend & Breakdown - Full width on mobile */}
          <div className="w-full sm:flex-1 space-y-2">
            {segments.map((seg, i) => {
              const percent = total > 0 ? (seg.value / total) * 100 : 0
              
              return (
                <div key={i} className="bg-gray-50 dark:bg-navy-700/50 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-[13px] font-medium text-gray-800 dark:text-white truncate">{seg.label}</span>
                      <span className="text-[13px] text-gray-600 dark:text-white">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="text-[13px] font-semibold flex-shrink-0" style={{ color: seg.color }}>
                      {formatCompactCurrency(seg.value)}
                    </div>
                  </div>
                  <div className="h-1 bg-gray-200 dark:bg-navy-600 rounded-full overflow-hidden">
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
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
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
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">Wealth Visualizer</h2>
        <p className="text-[13px] sm:text-[14px] text-gray-600 dark:text-white">Interactive 10-year investment analysis</p>
      </div>

      {/* Tab Selector - Mobile optimized */}
      <div className="flex gap-1 sm:gap-2 p-1 bg-gray-100 dark:bg-navy-700 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const isActive = activeChart === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-[13px] sm:text-[14px] font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-white dark:bg-navy-600 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-white hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className={`text-[11px] sm:text-[13px] px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap ${
                isActive ? 'bg-gray-100 dark:bg-navy-500 text-gray-700 dark:text-white' : 'text-gray-600 dark:text-white'
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
