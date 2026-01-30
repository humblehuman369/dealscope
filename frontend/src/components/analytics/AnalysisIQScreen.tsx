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

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CompactHeader, type PropertyData as HeaderPropertyData } from '@/components/layout/CompactHeader'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'

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
  // If provided, values will be read from dealMakerStore (saved property mode)
  savedPropertyId?: string
}

// National range benchmarks for horizontal bar scale with LOW/AVG/HIGH thresholds
const NATIONAL_RANGES: Record<string, { 
  low: number; avg: number; high: number; 
  unit: string; higherIsBetter: boolean;
  // For display formatting
  format?: (v: number) => string;
}> = {
  capRate: { low: 4.0, avg: 5.5, high: 7.0, unit: '%', higherIsBetter: true },
  cashOnCash: { low: 5.0, avg: 8.5, high: 12.0, unit: '%', higherIsBetter: true },
  equityCapture: { low: 2.0, avg: 5.0, high: 8.0, unit: '%', higherIsBetter: true },
  dscr: { low: 1.00, avg: 1.25, high: 1.50, unit: '', higherIsBetter: true, format: (v) => v.toFixed(2) },
  cashFlowYield: { low: 2.0, avg: 5.0, high: 8.0, unit: '%', higherIsBetter: true },
  expenseRatio: { low: 20, avg: 35, high: 50, unit: '%', higherIsBetter: false },
  breakevenOcc: { low: 60, avg: 80, high: 100, unit: '%', higherIsBetter: false },
}

// Calculate position on the gradient benchmark bar (0-100%)
function getRangePosition(metric: string, value: number): { position: number; segment: 'low' | 'avg' | 'high' } {
  const range = NATIONAL_RANGES[metric]
  if (!range) return { position: 50, segment: 'avg' }
  
  // Determine which segment and position within the full bar
  // LOW segment covers values from low threshold down
  // AVG segment covers values around avg threshold  
  // HIGH segment covers values from high threshold up
  
  const { low, avg, high, higherIsBetter } = range
  
  let segment: 'low' | 'avg' | 'high'
  let position: number
  
  if (higherIsBetter) {
    // For higher-is-better metrics: low values are bad, high values are good
    if (value <= low) {
      segment = 'low'
      position = 15 // Center of LOW segment (0-30%)
    } else if (value >= high) {
      segment = 'high'
      position = 85 // Center of HIGH segment (70-100%)
    } else if (value < avg) {
      // Between low and avg - position in LOW or early AVG
      const t = (value - low) / (avg - low)
      segment = t < 0.5 ? 'low' : 'avg'
      position = 15 + t * 35 // 15% to 50%
    } else {
      // Between avg and high - position in late AVG or HIGH
      const t = (value - avg) / (high - avg)
      segment = t > 0.5 ? 'high' : 'avg'
      position = 50 + t * 35 // 50% to 85%
    }
  } else {
    // For lower-is-better metrics: low values are good, high values are bad
    if (value <= low) {
      segment = 'high' // Low values = good = green
      position = 85
    } else if (value >= high) {
      segment = 'low' // High values = bad = red
      position = 15
    } else if (value < avg) {
      const t = (value - low) / (avg - low)
      segment = t < 0.5 ? 'high' : 'avg'
      position = 85 - t * 35
    } else {
      const t = (value - avg) / (high - avg)
      segment = t > 0.5 ? 'low' : 'avg'
      position = 50 - t * 35
    }
  }
  
  return { position, segment }
}

// Performance Benchmark Bar Component with Gradient Design
interface BenchmarkBarProps {
  label: string
  value: number
  displayValue: string
  range: typeof NATIONAL_RANGES[keyof typeof NATIONAL_RANGES]
  rangePos: { position: number; segment: 'low' | 'avg' | 'high' }
}

function PerformanceBenchmarkBar({ label, displayValue, range, rangePos }: BenchmarkBarProps) {
  const formatValue = range.format || ((v: number) => v.toString())
  
  return (
    <div className="mb-5 last:mb-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#334155]">{label}</span>
        <span className="text-base font-bold text-[#0A1628] tabular-nums">{displayValue}</span>
      </div>
      
      {/* Gradient bar container */}
      <div className="bg-[#F8FAFC] rounded-xl p-3 px-4 border border-[#E2E8F0]">
        {/* Gradient bar with bullet marker */}
        <div 
          className="relative h-3.5 rounded-full"
          style={{ 
            background: 'linear-gradient(to right, #1E293B 0%, #334155 20%, #475569 40%, #0E7490 60%, #0891B2 75%, #06B6D4 90%, #00D4FF 100%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Bullet marker */}
          <div 
            className="absolute top-1/2 w-5 h-5 rounded-full bg-[#0A1628] border-[3px] border-white"
            style={{ 
              left: `${rangePos.position}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          />
        </div>
        
        {/* Labels below bar */}
        <div className="flex justify-between mt-2">
          <div className="text-left">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Low</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.low)}{range.unit}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Avg</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.avg)}{range.unit}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">High</div>
            <div className="text-[10px] text-[#94A3B8] mt-0.5">{formatValue(range.high)}{range.unit}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AnalysisIQScreen({ property, initialStrategy, savedPropertyId }: AnalysisIQScreenProps) {
  const router = useRouter()
  
  // Deal Maker Store for saved properties
  const dealMakerStore = useDealMakerStore()
  const { hasRecord } = useDealMakerReady()
  const record = dealMakerStore.record
  
  // Determine if using Deal Maker values (saved property mode)
  const isSavedPropertyMode = !!savedPropertyId
  
  // Load Deal Maker record if in saved property mode
  // Check both hasRecord AND if the loaded record is for the correct property
  // This handles navigation between different saved properties
  useEffect(() => {
    if (isSavedPropertyMode && savedPropertyId) {
      const isWrongProperty = dealMakerStore.propertyId !== savedPropertyId
      if (!hasRecord || isWrongProperty) {
        dealMakerStore.loadRecord(savedPropertyId)
      }
    }
  }, [isSavedPropertyMode, savedPropertyId, hasRecord, dealMakerStore])
  
  // State
  const [expandedSections, setExpandedSections] = useState({
    returns: true,
    cashFlow: true,
    atGlance: true
  })
  const [showFactors, setShowFactors] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState(initialStrategy || 'Long-term')

  // Try to load Deal Maker values from sessionStorage (for unsaved properties)
  const [sessionData, setSessionData] = useState<{
    purchasePrice?: number
    monthlyRent?: number
    propertyTaxes?: number
    insurance?: number
    arv?: number
  } | null>(null)
  
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !isSavedPropertyMode) {
      try {
        const sessionKey = `dealMaker_${encodeURIComponent(fullAddress)}`
        const stored = sessionStorage.getItem(sessionKey)
        if (stored) {
          const data = JSON.parse(stored)
          // Check if data is recent (within last hour)
          if (data.timestamp && Date.now() - data.timestamp < 3600000) {
            setSessionData(data)
            console.log('[Analysis IQ] Loaded Deal Maker values from sessionStorage:', data)
          }
        }
      } catch (e) {
        console.warn('Failed to load sessionStorage:', e)
      }
    }
  }, [fullAddress, isSavedPropertyMode])

  // Merge Deal Maker values with property data
  // Priority: dealMakerStore (saved) > sessionStorage (unsaved) > property defaults
  const effectiveProperty = useMemo(() => {
    if (isSavedPropertyMode && hasRecord && record) {
      // Saved property mode: use values from store
      return {
        ...property,
        listPrice: record.buy_price,  // Use user's buy price for calculations
        monthlyRent: record.monthly_rent,
        propertyTaxes: record.annual_property_tax,
        insurance: record.annual_insurance,
        arv: record.arv,
      }
    } else if (sessionData) {
      // Unsaved property with Deal Maker session data
      return {
        ...property,
        listPrice: sessionData.purchasePrice ?? property.listPrice,
        monthlyRent: sessionData.monthlyRent ?? property.monthlyRent,
        propertyTaxes: sessionData.propertyTaxes ?? property.propertyTaxes,
        insurance: sessionData.insurance ?? property.insurance,
        arv: sessionData.arv ?? property.arv,
      }
    }
    return property
  }, [property, isSavedPropertyMode, hasRecord, record, sessionData])

  // Convert to CompactHeader format
  const headerPropertyData: HeaderPropertyData = {
    address: property.address,
    city: property.city,
    state: property.state,
    zip: property.zipCode,
    beds: property.bedrooms,
    baths: property.bathrooms,
    sqft: property.sqft,
    price: effectiveProperty.listPrice,  // Show user's buy price in header
    rent: effectiveProperty.monthlyRent,
    status: 'OFF-MARKET',
    image: property.thumbnailUrl,
    zpid: property.zpid,
  }

  // Calculate metrics based on effective property data (with Deal Maker overrides)
  const metrics = useMemo(() => {
    const annualRent = effectiveProperty.monthlyRent * 12
    const noi = annualRent - effectiveProperty.propertyTaxes - effectiveProperty.insurance - (annualRent * 0.05) // 5% vacancy
    const downPayment = effectiveProperty.listPrice * 0.25 // 25% down
    const loanAmount = effectiveProperty.listPrice * 0.75
    const annualDebtService = (loanAmount * 0.07) / 12 * 12 // ~7% interest approximation
    const cashFlow = noi - annualDebtService
    
    // Cap Rate
    const capRate = (noi / effectiveProperty.listPrice) * 100
    
    // Cash on Cash
    const cashOnCash = (cashFlow / downPayment) * 100
    
    // Equity Capture (using ARV from Deal Maker or default)
    const arv = effectiveProperty.arv || effectiveProperty.listPrice * 1.15
    const equityCapture = ((arv - effectiveProperty.listPrice) / effectiveProperty.listPrice) * 100
    
    // DSCR
    const dscr = noi / annualDebtService
    
    // Expense Ratio
    const totalExpenses = effectiveProperty.propertyTaxes + effectiveProperty.insurance + (annualRent * 0.05)
    const expenseRatio = (totalExpenses / annualRent) * 100
    
    // Cash Flow Yield
    const cashFlowYield = (cashFlow / downPayment) * 100
    
    // Breakeven Occupancy
    const fixedCosts = effectiveProperty.propertyTaxes + effectiveProperty.insurance + annualDebtService
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
  }, [effectiveProperty])

  // Build metric rows with range position data
  const returnMetrics = [
    { 
      key: 'capRate',
      metric: 'Cap Rate', 
      result: `${metrics.capRate.toFixed(1)}%`,
      value: metrics.capRate,
      range: NATIONAL_RANGES.capRate,
      rangePos: getRangePosition('capRate', metrics.capRate)
    },
    { 
      key: 'cashOnCash',
      metric: 'Cash-on-Cash', 
      result: `${metrics.cashOnCash.toFixed(1)}%`,
      value: metrics.cashOnCash,
      range: NATIONAL_RANGES.cashOnCash,
      rangePos: getRangePosition('cashOnCash', metrics.cashOnCash)
    },
    { 
      key: 'equityCapture',
      metric: 'Equity Capture', 
      result: `${metrics.equityCapture.toFixed(0)}%`,
      value: metrics.equityCapture,
      range: NATIONAL_RANGES.equityCapture,
      rangePos: getRangePosition('equityCapture', metrics.equityCapture)
    }
  ]

  const cashFlowMetrics = [
    { 
      key: 'cashFlowYield',
      metric: 'Cash Flow Yield', 
      result: `${metrics.cashFlowYield.toFixed(1)}%`,
      value: metrics.cashFlowYield,
      range: NATIONAL_RANGES.cashFlowYield,
      rangePos: getRangePosition('cashFlowYield', metrics.cashFlowYield)
    },
    { 
      key: 'dscr',
      metric: 'Debt Service Coverage Ratio', 
      result: metrics.dscr.toFixed(2),
      value: metrics.dscr,
      range: NATIONAL_RANGES.dscr,
      rangePos: getRangePosition('dscr', metrics.dscr)
    },
    { 
      key: 'expenseRatio',
      metric: 'Expense Ratio', 
      result: `${metrics.expenseRatio.toFixed(0)}%`,
      value: metrics.expenseRatio,
      range: NATIONAL_RANGES.expenseRatio,
      rangePos: getRangePosition('expenseRatio', metrics.expenseRatio)
    },
    { 
      key: 'breakevenOcc',
      metric: 'Breakeven Occupancy', 
      result: `${metrics.breakevenOcc.toFixed(0)}%`,
      value: metrics.breakevenOcc,
      range: NATIONAL_RANGES.breakevenOcc,
      rangePos: getRangePosition('breakevenOcc', metrics.breakevenOcc)
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalysisIQScreen.tsx:handleContinue:entry',message:'handleContinue called',data:{fullAddress,propertyAddress:property?.address,propertyCity:property?.city,propertyState:property?.state,propertyZip:property?.zipCode},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
    // #endregion
    // Navigate to Deal Maker with property data as query params
    const encodedAddress = encodeURIComponent(fullAddress.replace(/\s+/g, '-'))
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalysisIQScreen.tsx:handleContinue:encodedAddress',message:'Address encoded',data:{encodedAddress,originalFullAddress:fullAddress},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion
    const params = new URLSearchParams({
      listPrice: String(property.listPrice),
      rentEstimate: String(property.monthlyRent),
      propertyTax: String(property.propertyTaxes),
      insurance: String(property.insurance),
    })
    // Add zpid if available
    if (property.zpid) {
      params.set('zpid', property.zpid)
    }
    const targetUrl = `/deal-maker/${encodedAddress}?${params.toString()}`
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalysisIQScreen.tsx:handleContinue:beforePush',message:'About to navigate',data:{targetUrl,hasAccessToken:typeof document!=='undefined'&&document.cookie.includes('access_token')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    router.push(targetUrl)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AnalysisIQScreen.tsx:handleContinue:afterPush',message:'router.push called',data:{targetUrl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }

  // Score and derived values
  const score = Math.round(metrics.score)
  
  // Determine risk level and strategy fit
  const riskLevel = score >= 70 ? 'Low' : score >= 50 ? 'Medium' : 'High'
  const strategyFit = score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : 'Developing'
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
        savedPropertyId={savedPropertyId}
      />

      {/* Main Content */}
      <main>
        {/* Profit Rating Section */}
        <section className="bg-white p-5 border-b border-[#CBD5E1]">
          <div className="text-[11px] font-bold text-[#0891B2] uppercase tracking-[0.08em] mb-4">Profit Rating</div>
          
          <div className="flex items-center gap-5">
            {/* Conic Gradient Score Circle */}
            <div 
              className="w-[90px] h-[90px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `conic-gradient(#0891B2 0deg ${(score / 100) * 360}deg, #E2E8F0 ${(score / 100) * 360}deg 360deg)` 
              }}
            >
              <div className="w-[70px] h-[70px] rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-[28px] font-extrabold text-[#0A1628] leading-none">{score}</span>
                <span className="text-[11px] text-[#94A3B8]">/100</span>
              </div>
            </div>

            {/* Rating Details */}
            <div className="flex-1">
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-[#64748B]">Strategy Fit</span>
                <span className="text-sm font-semibold text-[#059669]">{strategyFit}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-[#64748B]">Risk Level</span>
                <span className="text-sm font-semibold text-[#059669]">{riskLevel}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sm text-[#64748B]">Protection</span>
                <span className={`text-sm font-semibold ${protection === 'Weak' ? 'text-[#E11D48]' : 'text-[#059669]'}`}>
                  {protection}
                </span>
              </div>
              
              {/* View Factors Toggle */}
              <button 
                className="flex items-center gap-1 mt-3 bg-transparent border-none text-[#94A3B8] text-[13px] cursor-pointer p-0"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

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
        </section>

        {/* Summary Banner */}
        <div className="p-4 px-5 bg-white border-b border-[#CBD5E1] flex items-start gap-3">
          <div className="w-1 h-6 bg-[#0891B2] rounded flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#475569] leading-relaxed">
            {score >= 70 
              ? <>This deal shows <strong className="text-[#0891B2] font-semibold">strong fundamentals</strong> with good return potential.</>
              : score >= 50 
              ? <>This deal has potential but requires careful consideration. <strong className="text-[#0891B2] font-semibold">Value-add improvements</strong> may improve returns.</>
              : <>This deal shows <strong className="text-[#E11D48] font-semibold">weak metrics</strong>. Consider negotiating a lower price.</>
            }
          </p>
        </div>

        {/* Return Metrics Card */}
        <div className="bg-white border-b border-[#CBD5E1] overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('returns')}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00D4FF" strokeWidth={1.5}>
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
              strokeWidth={2}
              style={{ transform: expandedSections.returns ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.returns && (
            <div className="px-5 pb-5">
              {returnMetrics.map((row, idx) => (
                <PerformanceBenchmarkBar
                  key={idx}
                  label={row.metric}
                  value={row.value}
                  displayValue={row.result}
                  range={row.range}
                  rangePos={row.rangePos}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cash Flow & Risk Card */}
        <div className="bg-white border-b border-[#CBD5E1] overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('cashFlow')}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00D4FF" strokeWidth={1.5}>
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
              strokeWidth={2}
              style={{ transform: expandedSections.cashFlow ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.cashFlow && (
            <div className="px-5 pb-5">
              {cashFlowMetrics.map((row, idx) => (
                <PerformanceBenchmarkBar
                  key={idx}
                  label={row.metric}
                  value={row.value}
                  displayValue={row.result}
                  range={row.range}
                  rangePos={row.rangePos}
                />
              ))}
            </div>
          )}
        </div>

        {/* At-a-Glance Card */}
        <div className="bg-white border-b border-[#CBD5E1] overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left hover:bg-[#F8FAFC] transition-colors"
            onClick={() => toggleSection('atGlance')}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00D4FF" strokeWidth={1.5}>
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
              strokeWidth={2}
              style={{ transform: expandedSections.atGlance ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.atGlance && (
            <div className="px-5 pb-5">
              {performanceBars.map((bar, idx) => (
                <div key={idx} className="flex items-center mb-3 last:mb-0">
                  <span className="text-sm text-[#475569] min-w-[100px]">{bar.label}</span>
                  <div className="flex-1 mx-4 h-2 bg-[#E2E8F0] rounded overflow-hidden">
                    <div 
                      className="h-full rounded transition-all duration-300"
                      style={{ 
                        width: `${bar.value}%`, 
                        background: bar.value >= 70 
                          ? 'linear-gradient(90deg, #0891B2, #06B6D4)' 
                          : bar.value >= 40 
                            ? 'linear-gradient(90deg, #D97706, #F59E0B)' 
                            : 'linear-gradient(90deg, #DC2626, #EF4444)'
                      }} 
                    />
                  </div>
                  <span className="text-sm font-bold text-[#0A1628] tabular-nums min-w-[45px] text-right">{Math.round(bar.value)}%</span>
                </div>
              ))}
              
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <p className="text-[13px] text-[#64748B]">
                  <span className="font-semibold text-[#0A1628]">Composite:</span> {score}% score across returns and risk protection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 px-5 bg-white border-b border-[#CBD5E1]">
          <button 
            className="w-full bg-[#0891B2] text-white text-[15px] font-semibold py-4 px-6 rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 hover:bg-[#0E7490] transition-colors mb-3"
            onClick={handleContinue}
          >
            <span>Continue to Deal Maker</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          
          <button className="w-full bg-white text-[#64748B] text-sm font-medium py-3.5 px-6 rounded-xl border border-[#E2E8F0] cursor-pointer flex items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export PDF Report</span>
          </button>
        </div>
      </main>

      {/* CSS for tabular-nums */}
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>
    </div>
  )
}

export default AnalysisIQScreen
