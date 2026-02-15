'use client'

/**
 * National Averages Reference Page
 * 
 * Educational page explaining the 8 key investment metrics DealGapIQ uses:
 * - Cap Rate, Cash-on-Cash, DSCR, Expense Ratio, GRM, 
 * - Breakeven Occupancy, Equity Capture, Cash Flow Yield
 * 
 * Includes national benchmarks, formulas, and interpretation guidance.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  DollarSign, 
  Shield, 
  PieChart, 
  Calculator, 
  Target, 
  Home,
  BarChart3,
  ChevronDown,
  ArrowLeft,
  Info
} from 'lucide-react'

// DealGapIQ Design System Colors
const COLORS = {
  navy: '#0A1628',
  teal: '#0891B2',
  tealLight: '#06B6D4',
  electricCyan: '#00D4FF',
  danger: '#EF4444',
  warning: '#F59E0B',
  surface50: '#F8FAFC',
  surface100: '#F1F5F9',
  surface200: '#E2E8F0',
  surface400: '#94A3B8',
  surface500: '#64748B',
  surface600: '#475569',
}

// Metric data with all content
const METRICS = [
  {
    id: 'cap-rate',
    name: 'Capitalization Rate (Cap Rate)',
    icon: TrendingUp,
    shortDescription: 'Measures property yield independent of financing.',
    formula: 'Cap Rate = Net Operating Income (NOI) / Property Value × 100',
    low: '4.0%',
    avg: '5.5%',
    high: '7.0%',
    lowValue: 4.0,
    avgValue: 5.5,
    highValue: 7.0,
    unit: '%',
    higherIsBetter: true,
    whatItMeasures: 'The capitalization rate measures the ratio of net operating income to property value. It serves as the foundational metric for comparing investment returns across properties independent of financing structure.',
    interpretation: [
      { range: '4.0-5.0%', meaning: 'Gateway/primary markets with institutional demand and perceived stability' },
      { range: '5.0-5.5%', meaning: 'Secondary markets balancing growth potential with moderate risk' },
      { range: '5.5-7.0%+', meaning: 'Tertiary markets, value-add opportunities, or older Class C assets' },
    ],
    insight: 'A "good" cap rate cannot be evaluated in isolation. A 6% cap rate in a high-growth Sun Belt market differs fundamentally from a 6% cap rate in a declining market. Evaluate cap rates against local vacancy trends, rent growth trajectories, and economic fundamentals.',
  },
  {
    id: 'cash-on-cash',
    name: 'Cash-on-Cash Return (CoC)',
    icon: DollarSign,
    shortDescription: 'Annual cash flow relative to cash invested.',
    formula: 'CoC Return = Annual Pre-Tax Cash Flow / Total Cash Invested × 100',
    low: '5.0%',
    avg: '8.5%',
    high: '12.0%',
    lowValue: 5.0,
    avgValue: 8.5,
    highValue: 12.0,
    unit: '%',
    higherIsBetter: true,
    whatItMeasures: 'Cash-on-cash return measures the annual pre-tax cash flow generated relative to the total cash invested. It provides practical insight into levered returns and the impact of financing decisions.',
    interpretation: [
      { range: '5-7%', meaning: 'Core stabilized assets in primary markets with lower volatility' },
      { range: '8-10%', meaning: 'Balanced risk-return profiles satisfying most investor requirements' },
      { range: '10-15%+', meaning: 'Value-add or opportunistic strategies with higher execution risk' },
    ],
    insight: 'An 8% CoC return means you recover approximately 8% of your initial equity investment annually through cash flow, reaching full capital recovery in roughly 12.5 years before considering appreciation or principal paydown.',
  },
  {
    id: 'dscr',
    name: 'Debt Service Coverage Ratio (DSCR)',
    icon: Shield,
    shortDescription: 'Property income relative to debt obligations.',
    formula: 'DSCR = Net Operating Income (NOI) / Total Debt Service',
    low: '1.00',
    avg: '1.25',
    high: '1.50',
    lowValue: 1.00,
    avgValue: 1.25,
    highValue: 1.50,
    unit: 'x',
    higherIsBetter: true,
    whatItMeasures: 'DSCR measures a property\'s ability to generate sufficient net operating income to cover debt service obligations. It functions as the primary credit metric for lenders evaluating cash flow sustainability.',
    interpretation: [
      { range: '1.00x', meaning: 'Breakeven - income exactly covers debt with zero margin for error' },
      { range: '1.20-1.25x', meaning: 'Minimum acceptable for most lenders, providing 20-25% cushion' },
      { range: '1.40-1.50x+', meaning: 'Strong cash flow with favorable loan terms and lower rates' },
    ],
    insight: 'Target minimum 1.25x DSCR at acquisition, providing adequate cushion for typical 3-5% vacancy and unexpected maintenance. A 1.33x ratio means the property generates $1.33 of income for every $1.00 of debt obligation.',
  },
  {
    id: 'expense-ratio',
    name: 'Operating Expense Ratio',
    icon: PieChart,
    shortDescription: 'Operating costs as percentage of income.',
    formula: 'Expense Ratio = Total Operating Expenses / Gross Operating Income × 100',
    low: '20%',
    avg: '35%',
    high: '50%',
    lowValue: 20,
    avgValue: 35,
    highValue: 50,
    unit: '%',
    higherIsBetter: false,
    whatItMeasures: 'The operating expense ratio expresses total property operating expenses as a percentage of gross operating income. It serves as a critical efficiency metric and underwriting benchmark.',
    interpretation: [
      { range: '20-30%', meaning: 'Exceptionally efficient, newer properties with minimal repairs' },
      { range: '35-45%', meaning: 'Target range for stabilized multifamily assets' },
      { range: '50%+', meaning: 'Operational inefficiency, deferred maintenance, or below-market rents' },
    ],
    insight: 'The 50% Rule assumes operating expenses equal 50% of gross rental income for typical residential properties. Ratios below 30% may indicate under-maintained properties; ratios exceeding 50% signal inefficiency.',
  },
  {
    id: 'grm',
    name: 'Gross Rent Multiplier (GRM)',
    icon: Calculator,
    shortDescription: 'Property price relative to annual rent.',
    formula: 'GRM = Property Price / Gross Annual Rental Income',
    low: '10:1',
    avg: '7:1',
    high: '4:1',
    lowValue: 10,
    avgValue: 7,
    highValue: 4,
    unit: ':1',
    higherIsBetter: false,
    whatItMeasures: 'The gross rent multiplier provides a simplified valuation metric dividing property price by gross annual rental income, enabling rapid comparison across similar properties within a market.',
    interpretation: [
      { range: '4-8', meaning: 'Strong income generation, typically cash flow positive' },
      { range: '8-12', meaning: 'Balanced markets with reasonable investment potential' },
      { range: '15-20+', meaning: 'High-appreciation coastal markets prioritizing growth over cash flow' },
    ],
    insight: 'A GRM of 8.33 suggests the property would require approximately 8.3 years of gross rental income to recover the purchase price, before considering operating expenses or financing costs.',
  },
  {
    id: 'breakeven-occ',
    name: 'Breakeven Occupancy',
    icon: Target,
    shortDescription: 'Minimum occupancy to cover all costs.',
    formula: 'Breakeven Occ. = (Operating Expenses + Debt Service) / Potential Gross Income × 100',
    low: '60%',
    avg: '80%',
    high: '100%',
    lowValue: 60,
    avgValue: 80,
    highValue: 100,
    unit: '%',
    higherIsBetter: false,
    whatItMeasures: 'Breakeven occupancy measures the minimum occupancy rate required for a property to generate sufficient income to cover operating expenses and debt service. It functions as a critical risk assessment metric.',
    interpretation: [
      { range: '60-70%', meaning: 'Strong debt service cushion, favorable financing terms' },
      { range: '70-80%', meaning: 'Acceptable for most conventional financing' },
      { range: '80%+', meaning: 'High-risk profile requiring reserves or lower LTV' },
    ],
    insight: 'A 79% breakeven occupancy allows for 21% vacancy before the property operates at a loss. Target breakeven occupancy rates at least 10-15 percentage points below market occupancy for operational flexibility.',
  },
  {
    id: 'equity-capture',
    name: 'Equity Capture (Appreciation)',
    icon: Home,
    shortDescription: 'Annual property value increase.',
    formula: 'Equity Capture = (Current Value - Purchase Price) / Purchase Price × 100',
    low: '2.0%',
    avg: '5.0%',
    high: '8.0%',
    lowValue: 2.0,
    avgValue: 5.0,
    highValue: 8.0,
    unit: '%',
    higherIsBetter: true,
    whatItMeasures: 'Equity capture through natural appreciation measures the annual rate of property value increase attributable to market forces, inflation, and demand/supply dynamics independent of owner-initiated improvements.',
    interpretation: [
      { range: '2-4%', meaning: 'Conservative baseline tracking inflation plus modest growth' },
      { range: '4-6%', meaning: 'Historical long-term average (4.27% since 1967)' },
      { range: '6-10%+', meaning: 'High-growth markets with strong job creation' },
    ],
    insight: 'Sophisticated investors exclude or heavily discount natural appreciation in initial underwriting, treating it as potential upside rather than base case. Prioritizing cash flow over appreciation leads to more resilient portfolios.',
  },
  {
    id: 'cash-flow-yield',
    name: 'Cash Flow Yield',
    icon: BarChart3,
    shortDescription: 'Annual cash flow as percentage of total investment.',
    formula: 'Cash Flow Yield = Annual Net Cash Flow / Total Investment × 100',
    low: '2.0%',
    avg: '5.0%',
    high: '8.0%',
    lowValue: 2.0,
    avgValue: 5.0,
    highValue: 8.0,
    unit: '%',
    higherIsBetter: true,
    whatItMeasures: 'Cash flow yield measures annual pre-tax cash flow as a percentage of total investment, providing insight into the efficiency of capital deployment and return on equity invested.',
    interpretation: [
      { range: '4-6%', meaning: 'Common in high-appreciation markets or low-leverage structures' },
      { range: '7-9%', meaning: 'Balanced risk-return profiles in stable markets' },
      { range: '10-12%+', meaning: 'Value-add properties or favorable financing structures' },
    ],
    insight: 'A 6% cash flow yield indicates you receive $6 in annual pre-tax cash flow for every $100 invested, representing a 16.7-year payback period before considering appreciation or principal reduction.',
  },
]

// Benchmark bar component (simplified version)
function BenchmarkBar({ low, avg, high, unit, higherIsBetter }: { 
  low: string; avg: string; high: string; unit: string; higherIsBetter: boolean 
}) {
  const segmentColors = higherIsBetter
    ? {
        low: 'rgba(239, 68, 68, 0.25)',
        avg: 'rgba(245, 158, 11, 0.30)',
        high: 'rgba(8, 145, 178, 0.25)',
      }
    : {
        low: 'rgba(8, 145, 178, 0.25)',
        avg: 'rgba(245, 158, 11, 0.30)',
        high: 'rgba(239, 68, 68, 0.25)',
      }

  return (
    <div 
      className="relative h-[28px] rounded-full flex overflow-hidden"
      style={{ outline: '1px solid rgba(15,23,42,.08)' }}
    >
      <div 
        className="h-full flex items-center justify-center px-2"
        style={{ width: '30%', background: segmentColors.low }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[10px] font-black uppercase tracking-wide leading-none" style={{ color: 'rgba(15,23,42,.72)' }}>Low</span>
          <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: 'rgba(15,23,42,.55)' }}>
            {low}
          </span>
        </div>
      </div>
      
      <div 
        className="h-full flex items-center justify-center px-2"
        style={{ width: '40%', background: segmentColors.avg }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[10px] font-black uppercase tracking-wide leading-none" style={{ color: 'rgba(15,23,42,.72)' }}>Avg</span>
          <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: 'rgba(15,23,42,.55)' }}>
            {avg}
          </span>
        </div>
      </div>
      
      <div 
        className="h-full flex items-center justify-center px-2"
        style={{ width: '30%', background: segmentColors.high }}
      >
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[10px] font-black uppercase tracking-wide leading-none" style={{ color: 'rgba(15,23,42,.72)' }}>High</span>
          <span className="text-[9px] font-bold leading-none whitespace-nowrap" style={{ color: 'rgba(15,23,42,.55)' }}>
            {high}
          </span>
        </div>
      </div>
      
      {/* Dividers */}
      <span 
        className="absolute rounded-sm"
        style={{ left: '30%', top: '4px', bottom: '4px', width: '2px', background: 'rgba(15,23,42,.14)', opacity: 0.85 }}
      />
      <span 
        className="absolute rounded-sm"
        style={{ left: '70%', top: '4px', bottom: '4px', width: '2px', background: 'rgba(15,23,42,.14)', opacity: 0.85 }}
      />
    </div>
  )
}

// Metric accordion component
function MetricCard({ metric, isOpen, onToggle }: { 
  metric: typeof METRICS[0]; 
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = metric.icon
  
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <button 
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#F8FAFC] transition-colors"
        onClick={onToggle}
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${COLORS.teal}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: COLORS.teal }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#0A1628] truncate">{metric.name}</h3>
          <p className="text-xs text-[#64748B] truncate">{metric.shortDescription}</p>
        </div>
        <ChevronDown 
          className="w-5 h-5 text-[#94A3B8] flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#F1F5F9]">
          {/* What it measures */}
          <div className="mt-4 mb-4">
            <p className="text-sm text-[#475569] leading-relaxed">
              {metric.whatItMeasures}
            </p>
          </div>
          
          {/* Formula */}
          <div 
            className="p-3 rounded-lg mb-4"
            style={{ backgroundColor: COLORS.surface100 }}
          >
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Formula</p>
            <p className="text-sm font-mono font-medium text-[#0A1628]">
              {metric.formula}
            </p>
          </div>
          
          {/* Benchmark bar */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">National Benchmarks</p>
            <BenchmarkBar 
              low={metric.low}
              avg={metric.avg}
              high={metric.high}
              unit={metric.unit}
              higherIsBetter={metric.higherIsBetter}
            />
          </div>
          
          {/* Interpretation */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">What the Numbers Mean</p>
            <div className="space-y-2">
              {metric.interpretation.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-[#0A1628] min-w-[70px]">{item.range}</span>
                  <span className="text-[#64748B]">{item.meaning}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Key insight */}
          <div 
            className="p-3 rounded-lg flex items-start gap-2"
            style={{ backgroundColor: `${COLORS.teal}10`, border: `1px solid ${COLORS.teal}20` }}
          >
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.teal }} />
            <p className="text-xs text-[#475569] leading-relaxed">
              {metric.insight}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NationalAveragesPage() {
  const [openMetric, setOpenMetric] = useState<string | null>('cap-rate')

  const handleToggle = (id: string) => {
    setOpenMetric(openMetric === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link 
            href="/"
            className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center hover:bg-[#E2E8F0] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#0A1628]">National Benchmarks</h1>
            <p className="text-xs text-[#64748B]">Investment metric reference guide</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Intro section */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 mb-6">
          <h2 className="text-base font-bold text-[#0A1628] mb-2">Understanding the Numbers</h2>
          <p className="text-sm text-[#475569] leading-relaxed mb-3">
            DealGapIQ evaluates every property against 8 key investment metrics. These national benchmarks 
            help you understand how a deal compares to market standards and what ranges indicate strong, 
            average, or weak performance.
          </p>
          <p className="text-xs text-[#94A3B8] italic">
            Data reflects Q4 2025 - Q1 2026 from institutional research (CBRE, Freddie Mac) across 50+ metropolitan markets.
          </p>
        </div>

        {/* Metrics list */}
        <div className="space-y-3 mb-6">
          {METRICS.map((metric) => (
            <MetricCard 
              key={metric.id}
              metric={metric}
              isOpen={openMetric === metric.id}
              onToggle={() => handleToggle(metric.id)}
            />
          ))}
        </div>

        {/* Key insights section */}
        <div className="bg-gradient-to-br from-[#0A1628] to-[#1E293B] rounded-xl p-5 text-white mb-6">
          <h2 className="text-base font-bold mb-3">Key Takeaways</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] mt-1.5 flex-shrink-0" />
              <p className="text-white/90">
                <span className="font-semibold text-white">No single metric tells the complete story.</span>{' '}
                Sophisticated investors triangulate across multiple dimensions to assess risk-adjusted return potential.
              </p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] mt-1.5 flex-shrink-0" />
              <p className="text-white/90">
                <span className="font-semibold text-white">Properties must perform across multiple metrics.</span>{' '}
                A property with an attractive 7% cap rate but 0.95x DSCR is unfinanceable.
              </p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] mt-1.5 flex-shrink-0" />
              <p className="text-white/90">
                <span className="font-semibold text-white">Context matters.</span>{' '}
                A 6% cap rate in a high-growth Sun Belt market differs fundamentally from a 6% cap rate in a declining market.
              </p>
            </div>
          </div>
        </div>

        {/* Investor profiles */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 mb-6">
          <h2 className="text-base font-bold text-[#0A1628] mb-4">Target Ranges by Investor Profile</h2>
          
          <div className="space-y-4">
            {/* Conservative */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#0891B2]" />
                <span className="text-sm font-semibold text-[#0A1628]">Conservative Investors</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                <span>Cap Rate: 5.5-6.5%+</span>
                <span>CoC: 8-10%+</span>
                <span>DSCR: 1.30x+</span>
                <span>Breakeven: &lt;75%</span>
              </div>
            </div>
            
            {/* Moderate */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="text-sm font-semibold text-[#0A1628]">Moderate Investors</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                <span>Cap Rate: 5.0-6.0%</span>
                <span>CoC: 7-9%</span>
                <span>DSCR: 1.20-1.30x</span>
                <span>Breakeven: 70-80%</span>
              </div>
            </div>
            
            {/* Aggressive */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="text-sm font-semibold text-[#0A1628]">Growth/Aggressive Investors</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                <span>Cap Rate: 4.5-5.5%</span>
                <span>CoC: 5-8%</span>
                <span>DSCR: 1.10-1.25x</span>
                <span>Breakeven: 75-85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#94A3B8] pb-6">
          <p className="mb-1">Data sources: CBRE, Freddie Mac, Fannie Mae, industry research</p>
          <p>Updated Q1 2026 • DealGapIQ</p>
        </div>
      </main>
    </div>
  )
}
