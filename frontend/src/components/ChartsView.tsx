'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  TrendingUp, DollarSign, PiggyBank, BarChart3,
  ArrowUpRight, ArrowDownRight, Wallet, Building2, Sparkles,
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw
} from 'lucide-react'
import { YearlyProjection } from '@/lib/projections'

// ============================================
// FORMATTING
// ============================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

const formatCompact = (value: number): string => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return formatCurrency(value)
}

// ============================================
// 1. CASH FLOW - LOLLIPOP CHART WITH GLOW
// ============================================

function CashFlowLollipopChart({ data }: { data: YearlyProjection[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [animationComplete, setAnimationComplete] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 500)
    return () => clearTimeout(timer)
  }, [])
  
  const maxCF = Math.max(...data.map(d => d.cashFlow))
  const minCF = Math.min(...data.map(d => d.cashFlow))
  const range = maxCF - minCF
  
  const totalCF = data.reduce((sum, d) => sum + d.cashFlow, 0)
  const avgCF = totalCF / data.length
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
          <div className="text-emerald-100 text-xs mb-1">Total 10-Year</div>
          <div className="text-2xl font-black">{formatCompact(totalCF)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-gray-400 text-xs mb-1">Average/Year</div>
          <div className="text-xl font-bold text-gray-900">{formatCompact(avgCF)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-gray-400 text-xs mb-1">Year 1</div>
          <div className="text-xl font-bold text-emerald-600">{formatCompact(data[0].cashFlow)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="text-gray-400 text-xs mb-1">Year 10</div>
          <div className="text-xl font-bold text-emerald-600">{formatCompact(data[9].cashFlow)}</div>
        </div>
      </div>
      
      {/* Lollipop Chart */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-[100px]" />
        </div>
        
        {/* Grid lines */}
        <div className="absolute inset-6 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="border-b border-white/5 w-full" />
          ))}
        </div>
        
        {/* Chart */}
        <div className="relative h-72 flex items-end justify-around px-4">
          {data.map((d, i) => {
            const height = range > 0 ? ((d.cashFlow - minCF) / range) * 200 + 40 : 120
            const isHovered = hoveredIndex === i
            const isPositive = d.cashFlow >= 0
            
            return (
              <div
                key={i}
                className="flex flex-col items-center cursor-pointer group"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-4 bg-white rounded-xl px-4 py-3 shadow-2xl z-20 min-w-[160px]">
                    <div className="text-xs text-gray-400 mb-1">Year {d.year} Cash Flow</div>
                    <div className={`text-2xl font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(d.cashFlow)}
                    </div>
                    <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      {d.cashFlow > data[0].cashFlow ? (
                        <><ArrowUpRight className="w-3 h-3 text-emerald-500" /> +{((d.cashFlow / data[0].cashFlow - 1) * 100).toFixed(0)}% from Y1</>
                      ) : (
                        <><ArrowDownRight className="w-3 h-3 text-red-500" /> {((d.cashFlow / data[0].cashFlow - 1) * 100).toFixed(0)}% from Y1</>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                      <div className="border-8 border-transparent border-t-white" />
                    </div>
                  </div>
                )}
                
                {/* Stem */}
                <div 
                  className="w-1 bg-gradient-to-t from-emerald-500/20 to-emerald-400/60 rounded-full transition-all duration-500"
                  style={{ 
                    height: animationComplete ? height : 0,
                    transitionDelay: `${i * 50}ms`
                  }}
                />
                
                {/* Dot with glow */}
                <div 
                  className={`relative -mt-3 transition-all duration-300 ${isHovered ? 'scale-150' : 'scale-100'}`}
                  style={{ 
                    opacity: animationComplete ? 1 : 0,
                    transitionDelay: `${i * 50 + 200}ms`
                  }}
                >
                  {/* Glow ring */}
                  <div className={`absolute inset-0 rounded-full bg-emerald-400 blur-md transition-opacity ${isHovered ? 'opacity-80' : 'opacity-40'}`} 
                    style={{ transform: 'scale(2)' }}
                  />
                  {/* Dot */}
                  <div className={`relative w-4 h-4 rounded-full ${
                    isPositive 
                      ? 'bg-gradient-to-br from-emerald-300 to-emerald-500' 
                      : 'bg-gradient-to-br from-red-300 to-red-500'
                  } border-2 border-white shadow-lg`} />
                </div>
                
                {/* Value label */}
                <div className={`mt-4 text-xs font-bold transition-colors ${isHovered ? 'text-white' : 'text-white/50'}`}>
                  {formatCompact(d.cashFlow)}
                </div>
                
                {/* Year label */}
                <div className={`mt-1 text-xs transition-colors ${isHovered ? 'text-emerald-400' : 'text-white/30'}`}>
                  Y{d.year}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Connecting line */}
        <svg className="absolute inset-6 pointer-events-none" style={{ top: 24, height: 'calc(100% - 96px)' }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = 100 - (range > 0 ? ((d.cashFlow - minCF) / range) * 70 + 15 : 50)
              return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`
            }).join(' ')}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            className={`transition-all duration-1000 ${animationComplete ? 'opacity-100' : 'opacity-0'}`}
          />
        </svg>
      </div>
      
      {/* Cumulative Growth Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Cumulative Cash Flow Growth</span>
          <span className="text-lg font-black text-emerald-600">{formatCompact(data[9].cumulativeCashFlow)}</span>
        </div>
        <div className="flex gap-1">
          {data.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div 
                className="h-10 rounded-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500"
                style={{ 
                  opacity: 0.3 + (i / data.length) * 0.7,
                }}
              />
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
                Y{d.year}: {formatCompact(d.cumulativeCashFlow)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// 2. EQUITY - MIRROR AREA CHART
// ============================================

function EquityMirrorChart({ data, totalCashInvested }: { data: YearlyProjection[]; totalCashInvested: number }) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)
  
  const maxValue = Math.max(
    ...data.map(d => d.totalEquity),
    ...data.map(d => d.loanBalance)
  )
  
  // Find crossover point
  const crossoverYear = data.findIndex(d => d.totalEquity > d.loanBalance)
  
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-200" />
            <span className="text-blue-100 text-sm">Year 10 Equity</span>
          </div>
          <div className="text-3xl font-black">{formatCompact(data[9].totalEquity)}</div>
          <div className="text-blue-200 text-sm mt-1">
            +{formatCompact(data[9].totalEquity - totalCashInvested)} gain
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            <span className="text-gray-500 text-sm">Loan Remaining</span>
          </div>
          <div className="text-3xl font-black text-gray-900">{formatCompact(data[9].loanBalance)}</div>
          <div className="text-orange-500 text-sm mt-1">
            {((1 - data[9].loanBalance / data[0].loanBalance) * 100).toFixed(0)}% paid off
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <span className="text-emerald-700 text-sm">Crossover Point</span>
          </div>
          <div className="text-3xl font-black text-emerald-700">Year {crossoverYear > 0 ? crossoverYear + 1 : '—'}</div>
          <div className="text-emerald-600 text-sm mt-1">
            Equity exceeds loan
          </div>
        </div>
      </div>
      
      {/* Mirror Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 relative overflow-hidden">
        {/* Center line label */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold">
            $0
          </div>
        </div>
        
        <div className="relative h-80">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              {/* Equity gradient (top) */}
              <linearGradient id="equityGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
              </linearGradient>
              
              {/* Loan gradient (bottom) */}
              <linearGradient id="loanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            
            {/* Center line */}
            <line x1="8" y1="50" x2="98" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
            
            {/* Equity area (above center) */}
            <path
              d={`M 10 50 ${data.map((d, i) => {
                const x = 10 + (i / (data.length - 1)) * 85
                const y = 50 - (d.totalEquity / maxValue) * 45
                return `L ${x} ${y}`
              }).join(' ')} L 95 50 Z`}
              fill="url(#equityGrad)"
            />
            
            {/* Loan area (below center) */}
            <path
              d={`M 10 50 ${data.map((d, i) => {
                const x = 10 + (i / (data.length - 1)) * 85
                const y = 50 + (d.loanBalance / maxValue) * 45
                return `L ${x} ${y}`
              }).join(' ')} L 95 50 Z`}
              fill="url(#loanGrad)"
            />
            
            {/* Equity line */}
            <path
              d={`M ${data.map((d, i) => {
                const x = 10 + (i / (data.length - 1)) * 85
                const y = 50 - (d.totalEquity / maxValue) * 45
                return `${i === 0 ? '' : 'L'} ${x} ${y}`
              }).join(' ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Loan line */}
            <path
              d={`M ${data.map((d, i) => {
                const x = 10 + (i / (data.length - 1)) * 85
                const y = 50 + (d.loanBalance / maxValue) * 45
                return `${i === 0 ? '' : 'L'} ${x} ${y}`
              }).join(' ')}`}
              fill="none"
              stroke="#f97316"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4,2"
            />
            
            {/* Interactive points */}
            {data.map((d, i) => {
              const x = 10 + (i / (data.length - 1)) * 85
              const equityY = 50 - (d.totalEquity / maxValue) * 45
              const loanY = 50 + (d.loanBalance / maxValue) * 45
              const isHovered = hoveredYear === i
              
              return (
                <g key={i}>
                  {/* Hover column */}
                  <rect
                    x={x - 4}
                    y={5}
                    width={8}
                    height={90}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredYear(i)}
                    onMouseLeave={() => setHoveredYear(null)}
                  />
                  
                  {/* Vertical line on hover */}
                  {isHovered && (
                    <line x1={x} y1={equityY} x2={x} y2={loanY} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                  )}
                  
                  {/* Equity dot */}
                  <circle
                    cx={x}
                    cy={equityY}
                    r={isHovered ? 4 : 2.5}
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />
                  
                  {/* Loan dot */}
                  <circle
                    cx={x}
                    cy={loanY}
                    r={isHovered ? 4 : 2.5}
                    fill="#f97316"
                    stroke="white"
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />
                  
                  {/* Year label */}
                  <text x={x} y={98} fontSize="3.5" fill={isHovered ? '#1f2937' : '#9ca3af'} textAnchor="middle" fontWeight={isHovered ? 'bold' : 'normal'}>
                    Y{d.year}
                  </text>
                </g>
              )
            })}
            
            {/* Crossover marker */}
            {crossoverYear > 0 && (
              <g>
                <circle
                  cx={10 + (crossoverYear / (data.length - 1)) * 85}
                  cy={50}
                  r="5"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={10 + (crossoverYear / (data.length - 1)) * 85}
                  y={44}
                  fontSize="3"
                  fill="#10b981"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  ★ CROSSOVER
                </text>
              </g>
            )}
          </svg>
          
          {/* Hover Info Card */}
          {hoveredYear !== null && (
            <div 
              className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-20 min-w-[180px]"
              style={{
                left: `${10 + (hoveredYear / (data.length - 1)) * 75}%`,
                top: '10%',
                transform: 'translateX(-50%)'
              }}
            >
              <div className="text-sm font-bold text-gray-900 mb-3">Year {data[hoveredYear].year}</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">Equity</span>
                  </div>
                  <span className="font-bold text-blue-600">{formatCompact(data[hoveredYear].totalEquity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm text-gray-600">Loan</span>
                  </div>
                  <span className="font-bold text-orange-600">{formatCompact(data[hoveredYear].loanBalance)}</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Net Position</span>
                    <span className={`font-bold ${data[hoveredYear].totalEquity > data[hoveredYear].loanBalance ? 'text-emerald-600' : 'text-gray-600'}`}>
                      {formatCompact(data[hoveredYear].totalEquity - data[hoveredYear].loanBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
            <span className="text-sm text-gray-600">Total Equity (↑ Growing)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-dashed border-orange-500" />
            <span className="text-sm text-gray-600">Loan Balance (↓ Shrinking)</span>
          </div>
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
  const radius = 100
  const strokeWidth = 32
  const circumference = 2 * Math.PI * radius
  
  let cumulativePercent = 0
  
  return (
    <div className="space-y-6">
      {/* Top Summary */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-purple-200 text-sm mb-1">Initial Investment</div>
            <div className="text-3xl font-black">{formatCompact(totalCashInvested)}</div>
          </div>
          <div className="text-6xl font-thin text-white/30">→</div>
          <div className="text-right">
            <div className="text-purple-200 text-sm mb-1">Year {selectedYear + 1} Wealth</div>
            <div className="text-4xl font-black">{formatCompact(yearData.totalWealth)}</div>
          </div>
          <div className="text-right pl-6 border-l border-white/20">
            <div className="text-purple-200 text-sm mb-1">Return</div>
            <div className="text-3xl font-black text-emerald-300">
              {(yearData.totalWealth / totalCashInvested).toFixed(1)}x
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8">
        <div className="flex items-center gap-12">
          {/* Donut */}
          <div className="relative flex-shrink-0">
            <svg width={radius * 2 + strokeWidth * 2 + 20} height={radius * 2 + strokeWidth * 2 + 20}>
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
                cx={radius + strokeWidth + 10}
                cy={radius + strokeWidth + 10}
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
                    cx={radius + strokeWidth + 10}
                    cy={radius + strokeWidth + 10}
                    r={radius}
                    fill="none"
                    stroke={`url(#grad-${i})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(${rotation} ${radius + strokeWidth + 10} ${radius + strokeWidth + 10})`}
                    filter="url(#donutShadow)"
                    className="transition-all duration-700 ease-out"
                  />
                )
              })}
              
              {/* Center decoration */}
              <circle
                cx={radius + strokeWidth + 10}
                cy={radius + strokeWidth + 10}
                r={radius - strokeWidth - 8}
                fill="white"
                filter="url(#donutShadow)"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-400 mb-2" />
              <div className="text-sm text-gray-500">Total Wealth</div>
              <div className="text-4xl font-black text-gray-900">{formatCompact(yearData.totalWealth)}</div>
              <div className="mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                +{formatCompact(yearData.totalWealth - totalCashInvested)}
              </div>
            </div>
          </div>
          
          {/* Legend & Breakdown */}
          <div className="flex-1 space-y-4">
            {segments.map((seg, i) => {
              const Icon = seg.icon
              const percent = total > 0 ? (seg.value / total) * 100 : 0
              
              return (
                <div key={i} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${seg.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: seg.color }} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{seg.label}</div>
                        <div className="text-xs text-gray-500">{percent.toFixed(1)}% of wealth</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black" style={{ color: seg.color }}>
                      {formatCompact(seg.value)}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
      
      {/* Timeline Controller */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => {
              if (selectedYear === 9) setSelectedYear(0)
              setIsPlaying(!isPlaying)
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => {
              setSelectedYear(0)
              setIsPlaying(false)
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Timeline</span>
              <span className="text-white font-bold">Year {selectedYear + 1}</span>
            </div>
            
            {/* Timeline dots */}
            <div className="flex items-center gap-1">
              {data.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedYear(i)
                    setIsPlaying(false)
                  }}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    i <= selectedYear 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
                      : 'bg-white/20'
                  } ${i === selectedYear ? 'scale-y-150' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Year values preview */}
        <div className="flex justify-between text-xs text-white/40">
          {data.filter((_, i) => i % 2 === 0 || i === 9).map(d => (
            <span key={d.year}>{formatCompact(d.totalWealth)}</span>
          ))}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/25">
          <BarChart3 className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">Wealth Visualizer</h2>
          <p className="text-gray-500">Interactive 10-year investment analysis</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-3 p-1.5 bg-gray-100 rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeChart === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                isActive 
                  ? 'bg-white shadow-lg text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? `text-${tab.color}-500` : ''}`} 
                style={{ color: isActive ? (tab.color === 'emerald' ? '#10b981' : tab.color === 'blue' ? '#3b82f6' : '#8b5cf6') : undefined }}
              />
              <span>{tab.label}</span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                isActive ? 'bg-gray-100' : 'bg-transparent'
              }`}>
                {formatCompact(tab.value)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Chart Content */}
      <div className="min-h-[600px]">
        {activeChart === 'cashflow' && <CashFlowLollipopChart data={projections} />}
        {activeChart === 'equity' && <EquityMirrorChart data={projections} totalCashInvested={totalCashInvested} />}
        {activeChart === 'wealth' && <TotalWealthDonutChart data={projections} totalCashInvested={totalCashInvested} />}
      </div>
    </div>
  )
}
