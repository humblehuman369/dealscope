'use client'

import React, { useMemo } from 'react'

// ============================================
// SHARED TYPES
// ============================================
export type StatusType = 'good' | 'warn' | 'bad'

export interface Factor {
  name: string
  desc: string
  status: StatusType
  tag: string
}

export interface KPI {
  label: string
  value: string
  hint: string
}

export interface BarItem {
  label: string
  value: string
  meter: number // 0-100
}

export interface MetaItem {
  label: string
  value: string
}

export interface VerdictData {
  label: string
  detail: string
  status: StatusType
}

// ============================================
// HELPER FUNCTIONS
// ============================================
export const getStatusColor = (status: StatusType) => {
  switch (status) {
    case 'good': return 'text-emerald-500'
    case 'warn': return 'text-amber-500'
    case 'bad': return 'text-red-500'
    default: return 'text-slate-500'
  }
}

export const getStatusBgColor = (status: StatusType) => {
  switch (status) {
    case 'good': return 'bg-emerald-500/10'
    case 'warn': return 'bg-amber-500/10'
    case 'bad': return 'bg-red-500/10'
    default: return 'bg-slate-500/10'
  }
}

export const getStatusDotColor = (status: StatusType) => {
  switch (status) {
    case 'good': return 'bg-emerald-500'
    case 'warn': return 'bg-amber-500'
    case 'bad': return 'bg-red-500'
    default: return 'bg-slate-500'
  }
}

// ============================================
// SHARED COMPONENTS
// ============================================

export function ProfitQualityRing({ score, subline }: { score: number; subline: string }) {
  const clampedScore = Math.max(0, Math.min(100, score))
  const ringColor = clampedScore >= 70 ? '#22c55e' : clampedScore >= 40 ? '#f59e0b' : '#ef4444'
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${clampedScore * 2.64} 264`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{clampedScore}</span>
          <span className="text-[10px] text-slate-500">/ 100</span>
        </div>
      </div>
      <div>
        <div className="font-semibold text-slate-900">Profit Quality Score</div>
        <p className="text-xs text-slate-500 max-w-[200px]">{subline}</p>
      </div>
    </div>
  )
}

export function VerdictBadge({ verdict }: { verdict: VerdictData }) {
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusBgColor(verdict.status)}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor(verdict.status)} animate-pulse`} />
      <span className={`font-bold ${getStatusColor(verdict.status)}`}>{verdict.label}</span>
      <span className="text-sm text-slate-500">{verdict.detail}</span>
    </div>
  )
}

export function KPIGrid({ kpis, columns = 4 }: { kpis: KPI[]; columns?: 2 | 3 | 4 }) {
  const gridCols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
  
  return (
    <div className={`grid ${gridCols} gap-3 mt-4`}>
      {kpis.map((kpi) => (
        <div key={kpi.label} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">{kpi.value}</div>
          <div className="text-xs text-slate-500 mt-0.5">{kpi.hint}</div>
        </div>
      ))}
    </div>
  )
}

export function FactorList({ factors }: { factors: Factor[] }) {
  return (
    <div className="space-y-2 mt-3">
      {factors.map((f) => (
        <div key={f.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <div className="font-semibold text-slate-900">{f.name}</div>
            <div className="text-xs text-slate-500">{f.desc}</div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBgColor(f.status)} ${getStatusColor(f.status)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(f.status)}`} />
            {f.tag}
          </span>
        </div>
      ))}
    </div>
  )
}

export function BarRow({ label, value, meter }: BarItem) {
  const clampedMeter = Math.max(0, Math.min(100, meter))
  const barColor = clampedMeter >= 70 ? 'bg-teal' : clampedMeter >= 40 ? 'bg-amber-500' : 'bg-red-500'
  
  return (
    <div className="grid grid-cols-[1fr_2fr_auto] gap-3 items-center py-2">
      <span className="text-sm font-medium text-slate-700 truncate">{label}</span>
      <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clampedMeter}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-900 tabular-nums w-20 text-right">{value}</span>
    </div>
  )
}

export function BarPanel({ title, bars }: { title: string; bars: BarItem[] }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{title}</div>
      <div className="space-y-1">
        {bars.map((bar) => (
          <BarRow key={bar.label} {...bar} />
        ))}
      </div>
    </div>
  )
}

export function MetaGrid({ items }: { items: MetaItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {items.map((item) => (
        <div key={item.label} className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
          <div className="text-sm font-bold text-slate-900 mt-1 tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// MAIN LAYOUT COMPONENT
// ============================================
interface StrategyMetricsLayoutProps {
  strategyName: string
  subtitle: string
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
}

export function StrategyMetricsLayout({ 
  strategyName, 
  subtitle, 
  leftPanel, 
  rightPanel 
}: StrategyMetricsLayoutProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{strategyName}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* LEFT: Profit Quality Panel */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Profit Quality</h3>
            <p className="text-xs text-slate-500">Decision-first view of fundamentals</p>
          </div>
          <div className="p-5">
            {leftPanel}
          </div>
        </div>

        {/* RIGHT: Financial Snapshot Panel */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900">Financial Snapshot</h3>
            <p className="text-xs text-slate-500">One-screen understanding</p>
          </div>
          <div className="p-5">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SEASONALITY CHART (for STR)
// ============================================
export function SeasonalityChart({ 
  months, 
  heights, 
  label 
}: { 
  months: string[]
  heights: number[]
  label: string 
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{label}</div>
      <div className="grid grid-cols-12 gap-1 h-20 items-end">
        {heights.map((h, idx) => (
          <div 
            key={idx} 
            className="bg-gradient-to-t from-teal to-cyan-400 rounded-t-sm transition-all duration-300"
            style={{ height: `${Math.max(10, Math.min(100, h))}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1 mt-1">
        {months.map((m, idx) => (
          <span key={idx} className="text-[9px] text-center text-slate-500 font-medium">{m}</span>
        ))}
      </div>
    </div>
  )
}
