'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useDealScore } from '@/hooks/useDealScore'
import { calculateInitialPurchasePrice, DEFAULT_RENOVATION_BUDGET_PCT } from '@/lib/iqTarget'
import { ProGate } from '@/components/ProGate'

// ============================================
// STRATEGY DEFINITIONS
// ============================================
const strategies = [
  'Long-term Rental',
  'Short-term Rental',
  'BRRRR',
  'Fix & Flip',
  'House Hack',
  'Wholesale',
]

// ============================================
// GRADE STYLING HELPERS
// ============================================
const getGradeStyles = (grade: string) => {
  switch(grade) {
    case 'A': return { bg: '#E0F7FA', text: '#0EA5E9' }
    case 'B': return { bg: '#F1F5F9', text: '#64748B' }
    case 'C': return { bg: '#FEF3C7', text: '#D97706' }
    case 'D': return { bg: '#FEE2E2', text: '#E11D48' }
    case 'F': return { bg: '#FEE2E2', text: '#E11D48' }
    default: return { bg: '#F1F5F9', text: '#64748B' }
  }
}

const getBarColor = (value: number) => {
  if (value >= 70) return '#0EA5E9'
  if (value >= 40) return '#F59E0B'
  return '#E11D48'
}

// ============================================
// GRADE CALCULATION HELPERS
// ============================================
const getCapRateGrade = (capRate: number): { grade: string; label: string; status: string } => {
  if (capRate >= 10) return { grade: 'A', label: 'STRONG', status: 'Excellent' }
  if (capRate >= 8) return { grade: 'A', label: 'STRONG', status: 'Great' }
  if (capRate >= 6) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
  if (capRate >= 4) return { grade: 'C', label: 'POTENTIAL', status: 'Below Target' }
  return { grade: 'D', label: 'WEAK', status: 'Weak' }
}

const getCoCGrade = (coc: number): { grade: string; label: string; status: string } => {
  if (coc >= 12) return { grade: 'A', label: 'STRONG', status: 'Excellent' }
  if (coc >= 8) return { grade: 'B', label: 'MODERATE', status: 'Good' }
  if (coc >= 4) return { grade: 'C', label: 'POTENTIAL', status: 'Fair' }
  if (coc >= 0) return { grade: 'D', label: 'WEAK', status: 'Weak' }
  return { grade: 'F', label: 'WEAK', status: 'Negative' }
}

const getEquityCaptureGrade = (equity: number, purchasePrice: number): { grade: string; label: string; status: string } => {
  const equityPct = purchasePrice > 0 ? (equity / purchasePrice) * 100 : 0
  if (equityPct >= 20) return { grade: 'A', label: 'STRONG', status: 'Discounted Entry' }
  if (equityPct >= 10) return { grade: 'B', label: 'MODERATE', status: 'Good Value' }
  if (equityPct >= 0) return { grade: 'C', label: 'POTENTIAL', status: 'Fair Value' }
  return { grade: 'D', label: 'WEAK', status: 'Overpaying' }
}

const getCashFlowYieldGrade = (cfy: number): { grade: string; label: string; status: string } => {
  if (cfy >= 15) return { grade: 'A', label: 'STRONG', status: 'Healthy' }
  if (cfy >= 10) return { grade: 'B', label: 'MODERATE', status: 'Good' }
  if (cfy >= 5) return { grade: 'C', label: 'POTENTIAL', status: 'Acceptable' }
  return { grade: 'D', label: 'WEAK', status: 'Weak' }
}

const getDSCRGrade = (dscr: number): { grade: string; label: string; status: string } => {
  if (dscr >= 1.5) return { grade: 'A', label: 'STRONG', status: 'Strong Coverage' }
  if (dscr >= 1.25) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
  if (dscr >= 1.0) return { grade: 'C', label: 'POTENTIAL', status: 'Tight' }
  return { grade: 'D', label: 'WEAK', status: 'Insufficient' }
}

const getExpenseRatioGrade = (ratio: number): { grade: string; label: string; status: string } => {
  if (ratio <= 30) return { grade: 'A', label: 'STRONG', status: 'Efficient' }
  if (ratio <= 40) return { grade: 'B', label: 'MODERATE', status: 'Good' }
  if (ratio <= 50) return { grade: 'C', label: 'POTENTIAL', status: 'Fair' }
  return { grade: 'D', label: 'WEAK', status: 'High Costs' }
}

const getBreakevenOccGrade = (breakeven: number): { grade: string; label: string; status: string } => {
  if (breakeven <= 80) return { grade: 'A', label: 'STRONG', status: 'Comfortable' }
  if (breakeven <= 90) return { grade: 'B', label: 'MODERATE', status: 'Acceptable' }
  if (breakeven <= 96) return { grade: 'C', label: 'POTENTIAL', status: 'Tight' }
  return { grade: 'D', label: 'WEAK', status: 'Risky' }
}

// ============================================
// PROPS
// ============================================
interface LTRWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportPDF?: () => void
}

// ============================================
// MAIN COMPONENT
// ============================================
export function LTRWorksheet({ 
  property,
  propertyId,
  onExportPDF,
}: LTRWorksheetProps) {
  const router = useRouter()
  
  // ============================================
  // UI STATE
  // ============================================
  const [expandedSections, setExpandedSections] = useState({
    returns: true,
    cashFlow: true,
    atGlance: false,
  })
  const [showFactors, setShowFactors] = useState(false)
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState('Long-term Rental')

  const toggleSection = (section: 'returns' | 'cashFlow' | 'atGlance') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleStrategySelect = (strategy: string) => {
    setSelectedStrategy(strategy)
    setShowStrategyDropdown(false)
  }

  // ============================================
  // PROPERTY DATA
  // ============================================
  const propertyData = property.property_data_snapshot || {}
  const sqft = propertyData.sqft || 1
  const address = propertyData.street || property.address_street || getDisplayAddress(property)
  const city = propertyData.city || property.address_city || ''
  const state = propertyData.state || property.address_state || ''
  const zip = propertyData.zipCode || property.address_zip || ''
  const fullAddress = property.full_address || `${address}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${zip ? ` ${zip}` : ''}`

  // ============================================
  // FINANCIAL INPUTS (from property data or defaults)
  // ============================================
  const listPrice = propertyData.listPrice || 723600
  const defaultMonthlyRent = propertyData.monthlyRent || 8081
  const defaultPropertyTaxes = propertyData.propertyTaxes || 6471
  const defaultInsurance = propertyData.insurance || (listPrice * 0.01)
  const defaultArv = propertyData.arv || listPrice * 1.1 || 795960

  // Calculate initial purchase price as 95% of estimated breakeven
  const initialPurchasePrice = calculateInitialPurchasePrice({
    monthlyRent: defaultMonthlyRent,
    propertyTaxes: defaultPropertyTaxes,
    insurance: defaultInsurance,
    listPrice: listPrice,
    vacancyRate: 0.01,
    maintenancePct: 0.05,
    managementPct: 0,
    downPaymentPct: 0.20,
    interestRate: 0.06,
    loanTermYears: 30,
  })

  const initialRehabBudget = Math.round(defaultArv * DEFAULT_RENOVATION_BUDGET_PCT)

  // State for editable inputs
  const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice)
  const [downPaymentPct] = useState(20)
  const [purchaseCostsPct] = useState(3)
  const [interestRate] = useState(6.0)
  const [loanTerm] = useState(30)
  const [rehabCosts] = useState(initialRehabBudget)
  const [arv] = useState(defaultArv)
  const [monthlyRent] = useState(defaultMonthlyRent)
  const [vacancyRate] = useState(1)
  const [propertyTaxes] = useState(defaultPropertyTaxes)
  const [insurance] = useState(defaultInsurance)
  const [propertyMgmtPct] = useState(0)
  const [maintenancePct] = useState(5)
  const [capExPct] = useState(0)
  const [hoaFees] = useState(0)

  // ============================================
  // DEAL SCORE FROM BACKEND API
  // ============================================
  const { result: dealScoreResult } = useDealScore({
    listPrice: listPrice,
    purchasePrice: purchasePrice,
    monthlyRent: monthlyRent,
    propertyTaxes: propertyTaxes,
    insurance: insurance,
    vacancyRate: vacancyRate / 100,
    maintenancePct: maintenancePct / 100,
    managementPct: propertyMgmtPct / 100,
    downPaymentPct: downPaymentPct / 100,
    interestRate: interestRate / 100,
    loanTermYears: loanTerm,
  })

  const opportunityScore = dealScoreResult?.dealScore ?? 0

  // ============================================
  // CALCULATIONS
  // ============================================
  const calc = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPct / 100)
    const loanAmount = purchasePrice - downPayment
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const totalCashNeeded = downPayment + purchaseCosts + rehabCosts

    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTerm * 12
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0

    const equityAtPurchase = arv - purchasePrice - rehabCosts

    const annualGrossRent = monthlyRent * 12
    const vacancyLoss = annualGrossRent * (vacancyRate / 100)
    const grossIncome = annualGrossRent - vacancyLoss

    const annualPropertyMgmt = grossIncome * (propertyMgmtPct / 100)
    const annualMaintenance = grossIncome * (maintenancePct / 100)
    const annualCapEx = grossIncome * (capExPct / 100)
    const annualHOA = hoaFees * 12
    const grossExpenses = propertyTaxes + insurance + annualPropertyMgmt + annualMaintenance + annualCapEx + annualHOA

    const annualLoanPayments = monthlyPayment * 12
    const noi = grossIncome - grossExpenses
    const monthlyCashFlow = (noi - annualLoanPayments) / 12
    const annualCashFlow = monthlyCashFlow * 12

    const capRatePurchase = (noi / purchasePrice) * 100
    const cashOnCash = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0
    const equityCapturePct = purchasePrice > 0 ? (equityAtPurchase / purchasePrice) * 100 : 0

    // Cash Flow Yield = Annual Cash Flow / Total Cash Invested
    const cashFlowYield = totalCashNeeded > 0 ? (Math.abs(annualCashFlow) / totalCashNeeded) * 100 : 0
    
    const dscr = annualLoanPayments > 0 ? noi / annualLoanPayments : 0
    
    // Expense Ratio = Operating Expenses / Gross Income
    const expenseRatio = grossIncome > 0 ? (grossExpenses / grossIncome) * 100 : 0
    
    // Breakeven Occupancy = (Operating Expenses + Debt Service) / Gross Potential Rent
    const breakEvenOccupancy = annualGrossRent > 0 ? ((grossExpenses + annualLoanPayments) / annualGrossRent) * 100 : 0

    return {
      downPayment, loanAmount, purchaseCosts, totalCashNeeded, monthlyPayment,
      equityAtPurchase, grossIncome, grossExpenses, annualLoanPayments, 
      monthlyCashFlow, annualCashFlow, noi,
      capRatePurchase, cashOnCash, equityCapturePct,
      cashFlowYield, dscr, expenseRatio, breakEvenOccupancy,
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, interestRate, loanTerm, rehabCosts, arv, monthlyRent, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, capExPct, hoaFees])

  // ============================================
  // PERFORMANCE SCORE (LTR-specific based on CoC)
  // ============================================
  const performanceScore = Math.max(0, Math.min(100, Math.round(50 + (calc.cashOnCash * 5))))
  
  // Combined profit quality score
  const profitQualityScore = Math.round((opportunityScore + performanceScore) / 2)

  // ============================================
  // DERIVE METRICS FOR UI
  // ============================================
  const capRateInfo = getCapRateGrade(calc.capRatePurchase)
  const cocInfo = getCoCGrade(calc.cashOnCash)
  const equityInfo = getEquityCaptureGrade(calc.equityAtPurchase, purchasePrice)
  const cfyInfo = getCashFlowYieldGrade(calc.cashFlowYield)
  const dscrInfo = getDSCRGrade(calc.dscr)
  const expenseInfo = getExpenseRatioGrade(calc.expenseRatio)
  const breakEvenInfo = getBreakevenOccGrade(calc.breakEvenOccupancy)

  const returnMetrics = [
    { metric: 'Cap Rate', result: `${calc.capRatePurchase.toFixed(1)}%`, status: capRateInfo.status, grade: capRateInfo.grade, gradeLabel: capRateInfo.label },
    { metric: 'Cash-on-Cash', result: `${calc.cashOnCash.toFixed(1)}%`, status: cocInfo.status, grade: cocInfo.grade, gradeLabel: cocInfo.label },
    { metric: 'Equity Capture', result: `${calc.equityCapturePct.toFixed(0)}%`, status: equityInfo.status, grade: equityInfo.grade, gradeLabel: equityInfo.label },
  ]

  const cashFlowMetrics = [
    { metric: 'Cash Flow Yield', result: `${calc.cashFlowYield.toFixed(1)}%`, status: cfyInfo.status, grade: cfyInfo.grade, gradeLabel: cfyInfo.label },
    { metric: 'DSCR', result: calc.dscr.toFixed(2), status: dscrInfo.status, grade: dscrInfo.grade, gradeLabel: dscrInfo.label },
    { metric: 'Expense Ratio', result: `${calc.expenseRatio.toFixed(0)}%`, status: expenseInfo.status, grade: expenseInfo.grade, gradeLabel: expenseInfo.label },
    { metric: 'Breakeven Occ.', result: `${calc.breakEvenOccupancy.toFixed(0)}%`, status: breakEvenInfo.status, grade: breakEvenInfo.grade, gradeLabel: breakEvenInfo.label },
  ]

  // Performance bars for At-a-Glance section
  const performanceBars = [
    { label: 'Returns', value: Math.min(100, Math.max(0, Math.round((calc.cashOnCash + calc.capRatePurchase) * 5))) },
    { label: 'Cash Flow', value: Math.min(100, Math.max(0, Math.round(50 + calc.cashFlowYield * 3))) },
    { label: 'Equity Gain', value: Math.min(100, Math.max(0, Math.round(50 + calc.equityCapturePct * 2.5))) },
    { label: 'Debt Safety', value: Math.min(100, Math.max(0, Math.round(calc.dscr * 60))) },
    { label: 'Cost Control', value: Math.min(100, Math.max(0, Math.round(100 - calc.expenseRatio))) },
    { label: 'Downside Risk', value: Math.min(100, Math.max(0, Math.round(100 - calc.breakEvenOccupancy))) },
  ]

  // Circular gauge calculation
  const circumference = 2 * Math.PI * 42
  const strokeDasharray = `${(profitQualityScore / 100) * circumference} ${circumference}`
  
  // Score color based on profit quality
  const scoreColor = profitQualityScore >= 70 ? '#0EA5E9' : profitQualityScore >= 40 ? '#F59E0B' : '#E11D48'

  // Strategy fit and risk level
  const getStrategyFit = (score: number) => {
    if (score >= 80) return 'Excellent Fit'
    if (score >= 60) return 'Good Fit'
    if (score >= 40) return 'Fair Fit'
    return 'Development'
  }
  
  const getRiskLevel = (score: number) => {
    if (score >= 70) return 'Low'
    if (score >= 50) return 'Moderate'
    return 'High'
  }
  
  const getProtection = (dscr: number) => {
    if (dscr >= 1.5) return 'Strong'
    if (dscr >= 1.25) return 'Good'
    if (dscr >= 1.0) return 'Fair'
    return 'Weak'
  }
  
  const protectionColor = calc.dscr >= 1.25 ? '#0A1628' : calc.dscr >= 1.0 ? '#D97706' : '#E11D48'

  // Deal rating based on combined score
  const getDealRating = (score: number) => {
    if (score >= 80) return 'STRONG DEAL'
    if (score >= 60) return 'GOOD DEAL'
    if (score >= 40) return 'POTENTIAL DEAL'
    return 'WEAK DEAL'
  }
  const dealRatingColor = profitQualityScore >= 60 ? '#0EA5E9' : profitQualityScore >= 40 ? '#D97706' : '#E11D48'

  // Summary text
  const getSummaryText = (score: number) => {
    if (score >= 70) return 'This deal shows strong fundamentals with healthy returns.'
    if (score >= 50) return 'This deal has potential but requires careful consideration.'
    return 'This deal needs significant improvements to generate acceptable returns.'
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F8FAFC',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      
      {/* Dark Header */}
      <header style={{
        backgroundColor: '#0A1628',
        padding: '16px 20px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Back + Title Row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <button 
            onClick={() => router.back()}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'rgba(255,255,255,0.8)',
              padding: '4px',
              cursor: 'pointer'
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ 
              fontSize: '11px', 
              color: '#94A3B8', 
              margin: '0 0 4px 0',
              letterSpacing: '0.02em'
            }}>
              {fullAddress}
            </p>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: 800, 
              margin: 0,
              letterSpacing: '0.05em'
            }}>
              <span style={{ color: '#FFFFFF' }}>ANALYSIS </span>
              <span style={{ color: '#00D4FF' }}>IQ</span>
            </h1>
          </div>
          <div style={{ width: '28px' }} />
        </div>

        {/* Strategy Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: showStrategyDropdown ? '#0EA5E9' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={showStrategyDropdown ? '#FFFFFF' : '#00D4FF'} strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#FFFFFF'
              }}>
                {selectedStrategy}
              </span>
            </div>
            <svg 
              width="18" height="18" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#FFFFFF"
              strokeWidth={2}
              style={{ 
                transform: showStrategyDropdown ? 'rotate(180deg)' : 'rotate(0)', 
                transition: 'transform 0.2s' 
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showStrategyDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              zIndex: 30
            }}>
              <div style={{
                padding: '12px 16px 8px',
                borderBottom: '1px solid #F1F5F9'
              }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94A3B8',
                  margin: 0,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  Investment Strategies
                </p>
              </div>
              {strategies.map((strategy, idx) => (
                <button
                  key={idx}
                  onClick={() => handleStrategySelect(strategy)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: selectedStrategy === strategy ? 'rgba(8, 145, 178, 0.08)' : 'none',
                    border: 'none',
                    borderBottom: idx !== strategies.length - 1 ? '1px solid #F8FAFC' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                >
                  <span style={{
                    fontSize: '15px',
                    fontWeight: selectedStrategy === strategy ? 600 : 400,
                    color: selectedStrategy === strategy ? '#0EA5E9' : '#0A1628'
                  }}>
                    {strategy}
                  </span>
                  {selectedStrategy === strategy && (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </header>

      {/* Overlay when dropdown is open */}
      {showStrategyDropdown && (
        <div 
          onClick={() => setShowStrategyDropdown(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 15
          }}
        />
      )}

      {/* Content Area */}
      <main style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
        
        {/* Profit Quality Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <p style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            color: scoreColor,
            letterSpacing: '0.1em',
            margin: '0 0 16px 0'
          }}>
            PROFIT QUALITY
          </p>
          
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Circular Score Gauge */}
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
              <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                <circle 
                  cx="48" cy="48" r="42" 
                  fill="none" 
                  stroke="#E2E8F0" 
                  strokeWidth="8"
                />
                <circle 
                  cx="48" cy="48" r="42" 
                  fill="none" 
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                />
              </svg>
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#0A1628', lineHeight: 1 }}>{profitQualityScore}</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>/100</span>
              </div>
            </div>

            {/* Score Details */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748B' }}>Strategy Fit</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628' }}>{getStrategyFit(profitQualityScore)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#64748B' }}>Risk Level</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628' }}>{getRiskLevel(profitQualityScore)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#64748B' }}>Protection</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: protectionColor }}>{getProtection(calc.dscr)}</span>
              </div>
            </div>
          </div>

          {/* View Factors Toggle */}
          <button 
            onClick={() => setShowFactors(!showFactors)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '14px',
              cursor: 'pointer',
              padding: 0
            }}
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
            <div style={{ 
              marginTop: '12px', 
              paddingTop: '12px', 
              borderTop: '1px solid #F1F5F9',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <div>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Return Profile</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', margin: 0 }}>Yield Focused</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Rating</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: dealRatingColor, margin: 0 }}>{getDealRating(profitQualityScore)}</p>
              </div>
            </div>
          )}

          {/* Summary Text */}
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            gap: '8px'
          }}>
            <div style={{ width: '3px', backgroundColor: '#0EA5E9', borderRadius: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              {getSummaryText(profitQualityScore)}{' '}
              {profitQualityScore < 70 && (
                <span style={{ color: '#0EA5E9', fontWeight: 500 }}>Value-add improvements</span>
              )}
              {profitQualityScore < 70 && ' may improve returns.'}
            </p>
          </div>
        </div>

        {/* Return Metrics Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <button 
            onClick={() => toggleSection('returns')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0A1628' }}>Return Metrics</span>
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
            <div style={{ padding: '0 16px 16px' }}>
              {returnMetrics.map((row, idx) => {
                const gradeStyle = getGradeStyles(row.grade)
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: idx !== returnMetrics.length - 1 ? '1px solid #F8FAFC' : 'none'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#0A1628', margin: '0 0 2px 0' }}>{row.metric}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{row.status}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: gradeStyle.text,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {row.result}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: gradeStyle.bg,
                        color: gradeStyle.text
                      }}>
                        {row.gradeLabel} {row.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cash Flow & Risk Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <button 
            onClick={() => toggleSection('cashFlow')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0A1628' }}>Cash Flow & Risk</span>
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
            <div style={{ padding: '0 16px 16px' }}>
              {cashFlowMetrics.map((row, idx) => {
                const gradeStyle = getGradeStyles(row.grade)
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderBottom: idx !== cashFlowMetrics.length - 1 ? '1px solid #F8FAFC' : 'none'
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#0A1628', margin: '0 0 2px 0' }}>{row.metric}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{row.status}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: gradeStyle.text,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {row.result}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: gradeStyle.bg,
                        color: gradeStyle.text
                      }}>
                        {row.gradeLabel} {row.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* At-a-Glance Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <button 
            onClick={() => toggleSection('atGlance')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(8, 145, 178, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0EA5E9" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#0A1628', display: 'block' }}>At-a-Glance</span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>Performance breakdown</span>
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
            <div style={{ padding: '0 16px 16px' }}>
              {performanceBars.map((bar, idx) => (
                <div key={idx} style={{ marginBottom: idx !== performanceBars.length - 1 ? '16px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', color: '#475569' }}>{bar.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0A1628', fontVariantNumeric: 'tabular-nums' }}>{bar.value}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${bar.value}%`, 
                      backgroundColor: getBarColor(bar.value),
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
              
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                  <span style={{ fontWeight: 600, color: '#0A1628' }}>Composite: </span>
                  {profitQualityScore}% score across returns and risk protection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button 
          onClick={() => {
            // Navigate to Deal Maker with property data
            const encodedAddress = encodeURIComponent(fullAddress.replace(/\s+/g, '-'))
            const params = new URLSearchParams({
              listPrice: String(listPrice),
              rentEstimate: String(monthlyRent),
              propertyTax: String(propertyTaxes),
              insurance: String(insurance),
            })
            if (property.zpid) {
              params.set('zpid', property.zpid)
            }
            router.push(`/deal-maker/${encodedAddress}?${params.toString()}`)
          }}
          style={{
            width: '100%',
            backgroundColor: '#0EA5E9',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <span>Continue to Analysis</span>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>

        {/* Export Link — Pro only */}
        <ProGate feature="Export PDF Report" mode="inline">
          <button 
            onClick={onExportPDF}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#64748B',
              fontSize: '14px',
              padding: '12px',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export PDF Report</span>
          </button>
        </ProGate>

        <div style={{ height: '24px' }} />
      </main>
    </div>
  )
}
