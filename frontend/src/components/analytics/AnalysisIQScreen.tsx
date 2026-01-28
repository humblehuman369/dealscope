'use client'

/**
 * AnalysisIQScreen Component
 * 
 * Analysis page for investment strategies featuring:
 * - CompactHeader with strategy selector
 * - Profit Quality card with circular gauge
 * - Return Metrics accordion
 * - Cash Flow & Risk accordion
 * - At-a-Glance performance bars
 * - CTA button + Export link
 * 
 * Uses InvestIQ Universal Style Guide colors
 */

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CompactHeader, type PropertyData as HeaderPropertyData } from '@/components/layout/CompactHeader'

// Property data interface for this component
export interface AnalysisPropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  listPrice: number
  monthlyRent: number
  averageDailyRate?: number
  occupancyRate?: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv?: number
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
  zpid?: string
}

interface AnalysisIQScreenProps {
  property: AnalysisPropertyData
  initialStrategy?: string
}

// Helper functions
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Grade styling helper
function getGradeStyles(grade: string): { bg: string; text: string } {
  switch (grade) {
    case 'A': return { bg: '#E0F7FA', text: '#0891B2' }
    case 'B': return { bg: '#F1F5F9', text: '#64748B' }
    case 'C': return { bg: '#FEF3C7', text: '#D97706' }
    case 'D': return { bg: '#FEE2E2', text: '#E11D48' }
    case 'F': return { bg: '#FEE2E2', text: '#E11D48' }
    default: return { bg: '#F1F5F9', text: '#64748B' }
  }
}

// Bar color helper
function getBarColor(value: number): string {
  if (value >= 70) return '#0891B2'
  if (value >= 40) return '#F59E0B'
  return '#E11D48'
}

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 70) return '#0891B2'
  if (score >= 40) return '#F59E0B'
  return '#E11D48'
}

export function AnalysisIQScreen({ property, initialStrategy }: AnalysisIQScreenProps) {
  const router = useRouter()
  
  // State
  const [expandedSections, setExpandedSections] = useState({
    returns: true,
    cashFlow: true,
    atGlance: false
  })
  const [showFactors, setShowFactors] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

  // Convert to CompactHeader format
  const headerPropertyData: HeaderPropertyData = {
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zipCode,
    beds: property.bedrooms,
    baths: property.bathrooms,
    sqft: property.sqft,
    price: property.listPrice,
    rent: property.monthlyRent,
    status: 'OFF-MARKET',
    image: property.thumbnailUrl,
    zpid: property.zpid,
  }

  // Calculate metrics based on property data
  const metrics = useMemo(() => {
    const annualRent = property.monthlyRent * 12
    const noi = annualRent - property.propertyTaxes - property.insurance - (annualRent * 0.05) // 5% vacancy
    const downPayment = property.listPrice * 0.25 // 25% down
    const loanAmount = property.listPrice * 0.75
    const annualDebtService = (loanAmount * 0.07) / 12 * 12 // ~7% interest approximation
    const cashFlow = noi - annualDebtService
    
    // Cap Rate
    const capRate = (noi / property.listPrice) * 100
    
    // Cash on Cash
    const cashOnCash = (cashFlow / downPayment) * 100
    
    // Equity Capture (assuming ARV is 15% higher)
    const arv = property.arv || property.listPrice * 1.15
    const equityCapture = ((arv - property.listPrice) / property.listPrice) * 100
    
    // DSCR
    const dscr = noi / annualDebtService
    
    // Expense Ratio
    const totalExpenses = property.propertyTaxes + property.insurance + (annualRent * 0.05)
    const expenseRatio = (totalExpenses / annualRent) * 100
    
    // Cash Flow Yield
    const cashFlowYield = (cashFlow / downPayment) * 100
    
    // Breakeven Occupancy
    const fixedCosts = property.propertyTaxes + property.insurance + annualDebtService
    const breakevenOcc = (fixedCosts / annualRent) * 100

    // Calculate composite score
    let score = 50 // Base score
    if (capRate >= 6) score += 15
    else if (capRate >= 4) score += 5
    if (cashOnCash >= 8) score += 15
    else if (cashOnCash >= 4) score += 5
    if (dscr >= 1.25) score += 10
    else if (dscr >= 1.0) score += 5
    if (equityCapture >= 15) score += 10
    
    score = Math.min(100, Math.max(0, score))

    return {
      capRate,
      cashOnCash,
      equityCapture,
      dscr,
      expenseRatio,
      cashFlowYield,
      breakevenOcc,
      score,
      noi,
      cashFlow,
      downPayment,
    }
  }, [property])

  // Grade metrics
  const getGrade = (metric: string, value: number): { grade: string; label: string; status: string } => {
    switch (metric) {
      case 'capRate':
        if (value >= 8) return { grade: 'A', label: 'STRONG', status: 'Excellent' }
        if (value >= 6) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        if (value >= 4) return { grade: 'C', label: 'POTENTIAL', status: 'Below Average' }
        return { grade: 'D', label: 'WEAK', status: 'Weak' }
      case 'cashOnCash':
        if (value >= 10) return { grade: 'A', label: 'STRONG', status: 'Excellent' }
        if (value >= 6) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        if (value >= 2) return { grade: 'C', label: 'POTENTIAL', status: 'Below Average' }
        return { grade: 'D', label: 'WEAK', status: 'Weak' }
      case 'equityCapture':
        if (value >= 20) return { grade: 'A', label: 'STRONG', status: 'Discounted Entry' }
        if (value >= 10) return { grade: 'B', label: 'MODERATE', status: 'Some Discount' }
        return { grade: 'C', label: 'POTENTIAL', status: 'Market Price' }
      case 'dscr':
        if (value >= 1.5) return { grade: 'A', label: 'STRONG', status: 'Safe' }
        if (value >= 1.25) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        if (value >= 1.0) return { grade: 'C', label: 'POTENTIAL', status: 'Tight' }
        return { grade: 'D', label: 'WEAK', status: 'Risky' }
      case 'expenseRatio':
        if (value <= 30) return { grade: 'A', label: 'STRONG', status: 'Efficient' }
        if (value <= 40) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        return { grade: 'C', label: 'POTENTIAL', status: 'High' }
      case 'cashFlowYield':
        if (value >= 15) return { grade: 'A', label: 'STRONG', status: 'Healthy' }
        if (value >= 8) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        return { grade: 'C', label: 'POTENTIAL', status: 'Low' }
      case 'breakevenOcc':
        if (value <= 70) return { grade: 'A', label: 'STRONG', status: 'Safe Buffer' }
        if (value <= 85) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
        if (value <= 95) return { grade: 'C', label: 'POTENTIAL', status: 'Tight' }
        return { grade: 'D', label: 'WEAK', status: 'Risky' }
      default:
        return { grade: 'B', label: 'MODERATE', status: 'Average' }
    }
  }

  // Build metric rows
  const returnMetrics = [
    { 
      metric: 'Cap Rate', 
      result: `${metrics.capRate.toFixed(1)}%`, 
      ...getGrade('capRate', metrics.capRate)
    },
    { 
      metric: 'Cash-on-Cash', 
      result: `${metrics.cashOnCash.toFixed(1)}%`, 
      ...getGrade('cashOnCash', metrics.cashOnCash)
    },
    { 
      metric: 'Equity Capture', 
      result: `${metrics.equityCapture.toFixed(0)}%`, 
      ...getGrade('equityCapture', metrics.equityCapture)
    }
  ]

  const cashFlowMetrics = [
    { 
      metric: 'Cash Flow Yield', 
      result: `${metrics.cashFlowYield.toFixed(1)}%`, 
      ...getGrade('cashFlowYield', metrics.cashFlowYield)
    },
    { 
      metric: 'DSCR', 
      result: metrics.dscr.toFixed(2), 
      ...getGrade('dscr', metrics.dscr)
    },
    { 
      metric: 'Expense Ratio', 
      result: `${metrics.expenseRatio.toFixed(0)}%`, 
      ...getGrade('expenseRatio', metrics.expenseRatio)
    },
    { 
      metric: 'Breakeven Occ.', 
      result: `${metrics.breakevenOcc.toFixed(0)}%`, 
      ...getGrade('breakevenOcc', metrics.breakevenOcc)
    }
  ]

  // Performance bars
  const performanceBars = [
    { label: 'Returns', value: Math.min(100, Math.max(0, metrics.capRate * 12)) },
    { label: 'Cash Flow', value: Math.min(100, Math.max(0, metrics.cashFlowYield * 5)) },
    { label: 'Equity Gain', value: Math.min(100, Math.max(0, metrics.equityCapture * 5)) },
    { label: 'Debt Safety', value: Math.min(100, Math.max(0, metrics.dscr * 70)) },
    { label: 'Cost Control', value: Math.min(100, Math.max(0, 100 - metrics.expenseRatio * 2)) },
    { label: 'Downside Risk', value: Math.min(100, Math.max(0, 100 - metrics.breakevenOcc)) }
  ]

  const toggleSection = (section: 'returns' | 'cashFlow' | 'atGlance') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleStrategyChange = (strategy: string) => {
    setCurrentStrategy(strategy)
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    // Navigate to worksheet or deal maker
    router.push(`/deal-maker/${encodeURIComponent(fullAddress)}`)
  }

  // Score gauge
  const score = Math.round(metrics.score)
  const circumference = 2 * Math.PI * 42
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`
  const scoreColor = getScoreColor(score)

  // Determine risk level and strategy fit
  const riskLevel = score >= 70 ? 'Low' : score >= 50 ? 'Medium' : 'High'
  const strategyFit = score >= 70 ? 'Strong Fit' : score >= 50 ? 'Moderate Fit' : 'Development'
  const protection = score >= 60 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak'

  return (
    <div className="min-h-screen bg-[#F8FAFC] max-w-[480px] mx-auto font-['Inter',sans-serif]">
      {/* Compact Header */}
      <CompactHeader
        property={headerPropertyData}
        pageTitle="ANALYSIS"
        pageTitleAccent="IQ"
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onBack={handleBack}
        activeNav="analysis"
        defaultPropertyOpen={false}
      />

      {/* Main Content */}
      <main className="p-4">
        {/* Profit Quality Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 mb-3 shadow-sm">
          <p className="text-[11px] font-bold text-[#E11D48] tracking-widest mb-4">PROFIT QUALITY</p>
          
          <div className="flex gap-6 items-start">
            {/* Circular Score Gauge */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="48" cy="48" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                <circle 
                  cx="48" cy="48" r="42" 
                  fill="none" 
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-bold text-[#0A1628] leading-none">{score}</span>
                <span className="text-[11px] text-[#94A3B8]">/100</span>
              </div>
            </div>

            {/* Score Details */}
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#64748B]">Strategy Fit</span>
                <span className="text-sm font-semibold text-[#0A1628]">{strategyFit}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#64748B]">Risk Level</span>
                <span className="text-sm font-semibold text-[#0A1628]">{riskLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#64748B]">Protection</span>
                <span className={`text-sm font-semibold ${protection === 'Weak' ? 'text-[#E11D48]' : 'text-[#0A1628]'}`}>
                  {protection}
                </span>
              </div>
            </div>
          </div>

          {/* View Factors Toggle */}
          <button 
            className="flex items-center gap-1 mt-4 bg-transparent border-none text-[#94A3B8] text-sm cursor-pointer p-0"
            onClick={() => setShowFactors(!showFactors)}
          >
            <span>View Factors</span>
            <svg 
              width="16" height="16" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
              style={{ transform: showFactors ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showFactors && (
            <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">Return Profile</p>
                <p className="text-sm font-semibold text-[#0A1628]">Yield Focused</p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">Deal Rating</p>
                <p className={`text-sm font-semibold ${score < 50 ? 'text-[#E11D48]' : 'text-[#0A1628]'}`}>
                  {score >= 70 ? 'STRONG DEAL' : score >= 50 ? 'FAIR DEAL' : 'WEAK DEAL'}
                </p>
              </div>
            </div>
          )}

          {/* Summary Text */}
          <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex gap-2">
            <div className="w-[3px] bg-[#0891B2] rounded flex-shrink-0" />
            <p className="text-sm text-[#475569] leading-relaxed">
              {score >= 70 
                ? <>This deal shows <span className="text-[#0891B2] font-medium">strong fundamentals</span> with good return potential.</>
                : score >= 50 
                ? <>This deal has potential but requires careful consideration. <span className="text-[#0891B2] font-medium">Value-add improvements</span> may improve returns.</>
                : <>This deal shows <span className="text-[#E11D48] font-medium">weak metrics</span>. Consider negotiating a lower price.</>
              }
            </p>
          </div>
        </div>

        {/* Return Metrics Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-3 shadow-sm overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left"
            onClick={() => toggleSection('returns')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(8,145,178,0.1)] flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0891B2" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold text-[#0A1628]">Return Metrics</span>
            </div>
            <svg 
              width="20" height="20" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#94A3B8" 
              strokeWidth={1.5}
              style={{ transform: expandedSections.returns ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.returns && (
            <div className="px-4 pb-4">
              {returnMetrics.map((row, idx) => {
                const gradeStyle = getGradeStyles(row.grade)
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between py-3.5 ${idx < returnMetrics.length - 1 ? 'border-b border-[#F8FAFC]' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0A1628] mb-0.5">{row.metric}</p>
                      <p className="text-xs text-[#94A3B8]">{row.status}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold tabular-nums" style={{ color: gradeStyle.text }}>
                        {row.result}
                      </span>
                      <span 
                        className="text-[10px] font-bold px-2 py-1 rounded"
                        style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.text }}
                      >
                        {row.label} {row.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cash Flow & Risk Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-3 shadow-sm overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left"
            onClick={() => toggleSection('cashFlow')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(8,145,178,0.1)] flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0891B2" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold text-[#0A1628]">Cash Flow & Risk</span>
            </div>
            <svg 
              width="20" height="20" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#94A3B8" 
              strokeWidth={1.5}
              style={{ transform: expandedSections.cashFlow ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.cashFlow && (
            <div className="px-4 pb-4">
              {cashFlowMetrics.map((row, idx) => {
                const gradeStyle = getGradeStyles(row.grade)
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between py-3.5 ${idx < cashFlowMetrics.length - 1 ? 'border-b border-[#F8FAFC]' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0A1628] mb-0.5">{row.metric}</p>
                      <p className="text-xs text-[#94A3B8]">{row.status}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold tabular-nums" style={{ color: gradeStyle.text }}>
                        {row.result}
                      </span>
                      <span 
                        className="text-[10px] font-bold px-2 py-1 rounded"
                        style={{ backgroundColor: gradeStyle.bg, color: gradeStyle.text }}
                      >
                        {row.label} {row.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* At-a-Glance Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-3 shadow-sm overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left"
            onClick={() => toggleSection('atGlance')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(8,145,178,0.1)] flex items-center justify-center">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0891B2" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold text-[#0A1628]">At-a-Glance</span>
                <span className="text-xs text-[#94A3B8]">Performance breakdown</span>
              </div>
            </div>
            <svg 
              width="20" height="20" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#94A3B8" 
              strokeWidth={1.5}
              style={{ transform: expandedSections.atGlance ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.atGlance && (
            <div className="px-4 pb-4">
              {performanceBars.map((bar, idx) => (
                <div key={idx} className={idx < performanceBars.length - 1 ? 'mb-4' : ''}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-[#475569]">{bar.label}</span>
                    <span className="text-sm font-bold text-[#0A1628] tabular-nums">{Math.round(bar.value)}%</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded overflow-hidden">
                    <div 
                      className="h-full rounded transition-all duration-300"
                      style={{ 
                        width: `${bar.value}%`, 
                        backgroundColor: getBarColor(bar.value)
                      }} 
                    />
                  </div>
                </div>
              ))}
              
              <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
                <p className="text-sm text-[#475569]">
                  <span className="font-semibold text-[#0A1628]">Composite: </span>
                  {score}% score across returns and risk protection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button 
          className="w-full bg-[#0891B2] text-white text-base font-semibold py-4 px-6 rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 mb-3 shadow-sm hover:bg-[#0E7490] transition-colors"
          onClick={handleContinue}
        >
          <span>Continue to Deal Maker</span>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>

        {/* Export Link */}
        <button className="w-full bg-transparent border-none flex items-center justify-center gap-2 text-[#64748B] text-sm py-3 cursor-pointer hover:text-[#475569]">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>Export PDF Report</span>
        </button>

        <div className="h-6" />
      </main>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}

export default AnalysisIQScreen
