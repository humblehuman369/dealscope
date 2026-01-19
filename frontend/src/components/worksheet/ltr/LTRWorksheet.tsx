'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { KPIRow } from './KPIRow'
import { LTRSectionCard } from './LTRSectionCard'
import { SliderInput } from './SliderInput'
import { ResultBox } from './ResultBox'
import { MetricRow } from './MetricRow'
import { SegmentedControl } from './SegmentedControl'
import { useTheme } from '@/context/ThemeContext'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'
import { ProfitZoneDashboard, generateProfitZoneTips, type ProfitZoneMetrics } from '@/components/analytics/ProfitZoneDashboard'

interface LTRWorksheetProps {
  property: SavedProperty
  propertyId: string
  onExportExcel?: () => void
  onExportPDF?: () => void
  onShare?: () => void
}

export function LTRWorksheet({ 
  property, 
  propertyId,
  onExportExcel, 
  onExportPDF, 
  onShare 
}: LTRWorksheetProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Property data from snapshot
  const propertyData = property.property_data_snapshot || {}
  const beds = propertyData.bedrooms || 0
  const baths = propertyData.bathrooms || 0
  const sqft = propertyData.sqft || 0
  const address = getDisplayAddress(property)
  const city = property.address_city || ''
  const state = property.address_state || ''
  const zip = property.address_zip || ''

  // State for all editable values
  const [purchasePrice, setPurchasePrice] = useState(propertyData.listPrice || 500000)
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [purchaseCostsPct, setPurchaseCostsPct] = useState(3)
  const [rehabCost, setRehabCost] = useState(0)
  const [interestRate, setInterestRate] = useState(7.0)
  const [loanTerm, setLoanTerm] = useState<number>(30)
  const [arv, setArv] = useState(propertyData.arv || propertyData.listPrice || 500000)
  const [monthlyRent, setMonthlyRent] = useState(propertyData.monthlyRent || 3000)
  const [vacancyRate, setVacancyRate] = useState(8)
  const [propertyTaxes, setPropertyTaxes] = useState(propertyData.propertyTaxes || 5000)
  const [insurance, setInsurance] = useState(propertyData.insurance || 2000)
  const [propertyMgmtPct, setPropertyMgmtPct] = useState(8)
  const [maintenancePct, setMaintenancePct] = useState(5)
  const [capExPct, setCapExPct] = useState(5)
  const [hoaFees, setHoaFees] = useState(0)
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')

  // Calculations
  const calc = useMemo(() => {
    const downPayment = purchasePrice * (downPaymentPct / 100)
    const loanAmount = purchasePrice - downPayment
    const purchaseCosts = purchasePrice * (purchaseCostsPct / 100)
    const totalCashNeeded = downPayment + purchaseCosts + rehabCost
    
    // Monthly mortgage calculation
    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTerm * 12
    const monthlyMortgage = loanAmount > 0 && monthlyRate > 0
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    
    const equityAtPurchase = arv - purchasePrice - rehabCost
    
    // Annual income calculations
    const annualGrossRent = monthlyRent * 12
    const vacancyLoss = annualGrossRent * (vacancyRate / 100)
    const effectiveGrossIncome = annualGrossRent - vacancyLoss
    
    // Annual expense calculations
    const annualPropertyMgmt = effectiveGrossIncome * (propertyMgmtPct / 100)
    const annualMaintenance = effectiveGrossIncome * (maintenancePct / 100)
    const annualCapEx = effectiveGrossIncome * (capExPct / 100)
    const totalOperatingExpenses = propertyTaxes + insurance + annualPropertyMgmt + annualMaintenance + annualCapEx + (hoaFees * 12)
    
    // NOI and cash flow
    const noi = effectiveGrossIncome - totalOperatingExpenses
    const annualMortgage = monthlyMortgage * 12
    const annualCashFlow = noi - annualMortgage
    const monthlyCashFlow = annualCashFlow / 12
    
    // Returns and ratios
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0
    const cashOnCash = totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : 0
    const rentToValue = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0
    const dscr = annualMortgage > 0 ? noi / annualMortgage : 0
    const grm = annualGrossRent > 0 ? purchasePrice / annualGrossRent : 0
    const breakEvenRatio = effectiveGrossIncome > 0 
      ? ((totalOperatingExpenses + annualMortgage) / effectiveGrossIncome) * 100 
      : 0
    
    // IQ Score calculation
    let iqScore = 50
    if (monthlyCashFlow > 500) iqScore += 20
    else if (monthlyCashFlow > 200) iqScore += 15
    else if (monthlyCashFlow > 0) iqScore += 8
    else iqScore -= 10
    
    if (cashOnCash > 10) iqScore += 15
    else if (cashOnCash > 8) iqScore += 12
    else if (cashOnCash > 5) iqScore += 8
    else if (cashOnCash > 0) iqScore += 4
    
    if (capRate > 8) iqScore += 10
    else if (capRate > 6) iqScore += 7
    else if (capRate > 4) iqScore += 4
    
    if (dscr > 1.5) iqScore += 8
    else if (dscr > 1.25) iqScore += 5
    else if (dscr > 1.0) iqScore += 2
    
    if (rentToValue > 1.0) iqScore += 7
    else if (rentToValue > 0.8) iqScore += 4
    
    iqScore = Math.max(0, Math.min(100, iqScore))
    
    return { 
      downPayment, 
      loanAmount, 
      purchaseCosts, 
      totalCashNeeded, 
      monthlyMortgage, 
      equityAtPurchase, 
      annualGrossRent, 
      vacancyLoss, 
      effectiveGrossIncome, 
      totalOperatingExpenses, 
      noi, 
      annualCashFlow, 
      monthlyCashFlow, 
      capRate, 
      cashOnCash, 
      rentToValue, 
      dscr, 
      grm, 
      breakEvenRatio, 
      iqScore 
    }
  }, [purchasePrice, downPaymentPct, purchaseCostsPct, rehabCost, interestRate, loanTerm, arv, monthlyRent, vacancyRate, propertyTaxes, insurance, propertyMgmtPct, maintenancePct, capExPct, hoaFees])

  // Profit Zone Dashboard metrics
  const profitZoneMetrics: ProfitZoneMetrics = useMemo(() => ({
    buyPrice: purchasePrice,
    cashNeeded: calc.totalCashNeeded,
    monthlyCashFlow: calc.monthlyCashFlow,
    cashOnCash: calc.cashOnCash,
    capRate: calc.capRate,
    dealScore: calc.iqScore,
  }), [purchasePrice, calc])

  // Calculate projected profit (10-year estimate)
  const projectedProfit = useMemo(() => {
    const tenYearCashFlow = calc.annualCashFlow * 10
    const appreciationGain = purchasePrice * 0.03 * 10 // Assume 3% annual appreciation
    return tenYearCashFlow + appreciationGain
  }, [calc, purchasePrice])

  // Calculate breakeven price
  const breakevenPrice = useMemo(() => {
    // Price at which cash flow = $0
    // Simplified: reduce price until cash flow is positive
    return purchasePrice * 0.85 // Approximate
  }, [purchasePrice])

  // Generate tips
  const profitZoneTips = useMemo(() => {
    return generateProfitZoneTips(profitZoneMetrics, projectedProfit)
  }, [profitZoneMetrics, projectedProfit])

  // Format currency helper
  const formatCurrency = useCallback((value: number) => `$${Math.round(value).toLocaleString()}`, [])

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-800 transition-colors duration-300">
      
      {/* WORKSHEET HEADER - InvestIQ Design */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 sticky top-14 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          
          {/* Property Info Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors text-sm font-medium">
                ← Back
              </button>
              <div>
                <h1 className="text-base font-semibold text-navy dark:text-white">{address}</h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {city}{city && state ? ', ' : ''}{state} {zip}
                  {beds > 0 && ` · ${beds} bed`}
                  {baths > 0 && ` · ${baths} bath`}
                  {sqft > 0 && ` · ${sqft.toLocaleString()} sqft`}
                </p>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-surface-100 dark:bg-surface-700 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'monthly' 
                    ? 'bg-teal-600 dark:bg-teal-500 text-white' 
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setViewMode('yearly')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'yearly' 
                    ? 'bg-teal-600 dark:bg-teal-500 text-white' 
                    : 'text-surface-500 hover:text-surface-700 dark:hover:text-white'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          
          {/* KPI Row */}
          <KPIRow 
            purchasePrice={purchasePrice}
            cashNeeded={Math.round(calc.totalCashNeeded)}
            cashFlow={Math.round(calc.annualCashFlow)}
            capRate={calc.capRate}
            cocReturn={calc.cashOnCash}
            dealScore={calc.iqScore}
            isDark={isDark}
          />
        </div>
      </header>
      
      {/* WORKSHEET - Two Column Layout */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT COLUMN - Worksheet Inputs */}
          <div className="space-y-3">
            {/* Purchase Section */}
            <LTRSectionCard 
              title="Purchase" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>}
            >
              <SliderInput 
                label="Purchase Price" 
                value={purchasePrice} 
                onChange={setPurchasePrice} 
                min={100000} 
                max={2000000} 
                step={5000} 
                format="currency" 
                quickAdjust={[-25000, -10000, 10000, 25000]} 
              />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Loan Amount</span>
                <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.loanAmount)}</span>
              </div>
              <SliderInput 
                label="Down Payment" 
                value={downPaymentPct} 
                onChange={setDownPaymentPct} 
                min={0} 
                max={100} 
                step={5} 
                format="percent" 
              />
              <SliderInput 
                label="Closing Costs" 
                value={purchaseCostsPct} 
                onChange={setPurchaseCostsPct} 
                min={0} 
                max={10} 
                step={0.5} 
                format="percent" 
              />
              <div className="mt-3 pt-3">
                <ResultBox 
                  label="Total Cash Required" 
                  value={formatCurrency(calc.totalCashNeeded)} 
                  variant="teal" 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Financing Section */}
            <LTRSectionCard 
              title="Financing" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"/></svg>}
            >
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Loan Amount</span>
                <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.loanAmount)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Loan Type</span>
                <span className="text-sm text-surface-400">30-Year Fixed</span>
              </div>
              <SliderInput 
                label="Interest Rate" 
                value={interestRate} 
                onChange={setInterestRate} 
                min={3} 
                max={12} 
                step={0.125} 
                format="percent" 
                benchmark={6.875} 
              />
              <SegmentedControl 
                label="Loan Term" 
                options={[
                  { value: 15, label: '15yr' }, 
                  { value: 20, label: '20yr' }, 
                  { value: 25, label: '25yr' }, 
                  { value: 30, label: '30yr' }
                ]} 
                value={loanTerm} 
                onChange={(v) => setLoanTerm(v as number)} 
              />
              <div className="mt-3 pt-3">
                <ResultBox 
                  label="Monthly Payment" 
                  value={formatCurrency(calc.monthlyMortgage)} 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Rehab & Valuation Section */}
            <LTRSectionCard 
              title="Rehab & Valuation" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>}
            >
              <SliderInput 
                label="Rehab Budget" 
                value={rehabCost} 
                onChange={setRehabCost} 
                min={0} 
                max={200000} 
                step={1000} 
                format="currency" 
              />
              <SliderInput 
                label="After Repair Value" 
                value={arv} 
                onChange={setArv} 
                min={Math.round(purchasePrice * 0.8)} 
                max={Math.round(purchasePrice * 1.5)} 
                step={5000} 
                format="currency" 
              />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Price / Sq.Ft.</span>
                <span className="text-sm font-semibold text-navy dark:text-white num">{sqft > 0 ? `$${Math.round(purchasePrice / sqft)}` : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">ARV / Sq.Ft.</span>
                <span className="text-sm font-semibold text-navy dark:text-white num">{sqft > 0 ? `$${Math.round(arv / sqft)}` : 'N/A'}</span>
              </div>
              <div className="mt-3 pt-3">
                <ResultBox 
                  label="Instant Equity" 
                  value={formatCurrency(calc.equityAtPurchase)} 
                  variant="teal" 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Income Section */}
            <LTRSectionCard 
              title="Income" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>}
            >
              <SliderInput 
                label="Monthly Rent" 
                value={monthlyRent} 
                onChange={setMonthlyRent} 
                min={1000} 
                max={20000} 
                step={50} 
                format="currency" 
                quickAdjust={[-200, -100, 100, 200]} 
                benchmark={propertyData.monthlyRent || undefined} 
              />
              <SliderInput 
                label="Vacancy Rate" 
                value={vacancyRate} 
                onChange={setVacancyRate} 
                min={0} 
                max={20} 
                step={1} 
                format="percent" 
                benchmark={8} 
              />
              <div className="mt-3 pt-3">
                <ResultBox 
                  label="Effective Gross Income" 
                  value={formatCurrency(calc.effectiveGrossIncome)} 
                  variant="teal" 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Expenses Section */}
            <LTRSectionCard 
              title="Expenses" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>}
            >
              <SliderInput 
                label="Property Taxes" 
                value={propertyTaxes} 
                onChange={setPropertyTaxes} 
                min={0} 
                max={30000} 
                step={100} 
                format="currency" 
              />
              <SliderInput 
                label="Insurance" 
                value={insurance} 
                onChange={setInsurance} 
                min={0} 
                max={10000} 
                step={100} 
                format="currency" 
              />
              <SliderInput 
                label="Management" 
                value={propertyMgmtPct} 
                onChange={setPropertyMgmtPct} 
                min={0} 
                max={15} 
                step={1} 
                format="percent" 
                benchmark={8} 
              />
              <SliderInput 
                label="Maintenance" 
                value={maintenancePct} 
                onChange={setMaintenancePct} 
                min={0} 
                max={15} 
                step={1} 
                format="percent" 
                benchmark={5} 
              />
              <SliderInput 
                label="CapEx Reserve" 
                value={capExPct} 
                onChange={setCapExPct} 
                min={0} 
                max={15} 
                step={1} 
                format="percent" 
              />
              <SliderInput 
                label="HOA" 
                value={hoaFees} 
                onChange={setHoaFees} 
                min={0} 
                max={1000} 
                step={25} 
                format="currency" 
              />
              <div className="mt-3 pt-3">
                <ResultBox 
                  label="Total Operating Expenses" 
                  value={formatCurrency(calc.totalOperatingExpenses)} 
                  variant="danger" 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Cash Flow Section */}
            <LTRSectionCard 
              title="Cash Flow" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>}
            >
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Gross Income</span>
                <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.effectiveGrossIncome)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Operating Expenses</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 num">−{formatCurrency(calc.totalOperatingExpenses)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-surface-500">Debt Service</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 num">−{formatCurrency(calc.monthlyMortgage * 12)}</span>
              </div>
              <div className="mt-3 pt-3 space-y-2">
                <ResultBox 
                  label="Monthly Cash Flow" 
                  value={formatCurrency(calc.monthlyCashFlow)} 
                  variant={calc.monthlyCashFlow >= 0 ? 'teal' : 'danger'} 
                />
                <ResultBox 
                  label="Annual Cash Flow" 
                  value={formatCurrency(calc.annualCashFlow)} 
                  variant={calc.annualCashFlow >= 0 ? 'teal' : 'danger'} 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            {/* Returns Section */}
            <LTRSectionCard 
              title="Returns" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>}
            >
              <MetricRow 
                label="Cap Rate (Purchase)" 
                value={`${calc.capRate.toFixed(2)}%`} 
                good={calc.capRate >= 8} 
                threshold="8%" 
              />
              <MetricRow 
                label="Cash on Cash" 
                value={`${calc.cashOnCash.toFixed(2)}%`} 
                good={calc.cashOnCash >= 10} 
                threshold="10%" 
              />
            </LTRSectionCard>
            
            {/* Ratios Section */}
            <LTRSectionCard 
              title="Ratios" 
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"/></svg>}
            >
              <MetricRow 
                label="1% Rule (Rent/Value)" 
                value={`${calc.rentToValue.toFixed(2)}%`} 
                good={calc.rentToValue >= 1} 
                threshold="1%" 
              />
              <MetricRow 
                label="Gross Rent Multiplier" 
                value={`${calc.grm.toFixed(2)}x`} 
                good={calc.grm <= 12} 
                threshold="12x" 
              />
              <MetricRow 
                label="Break-Even Ratio" 
                value={`${calc.breakEvenRatio.toFixed(2)}%`} 
                good={calc.breakEvenRatio <= 85} 
                threshold="85%" 
              />
              <MetricRow 
                label="DSCR" 
                value={`${calc.dscr.toFixed(2)}x`} 
                good={calc.dscr >= 1.2} 
                threshold="1.2x" 
              />
            </LTRSectionCard>
          </div>
          
          {/* RIGHT COLUMN - Sticky Insight Panel */}
          <div className="lg:sticky lg:top-[208px] space-y-4" style={{ maxHeight: 'calc(100vh - 228px)', overflowY: 'auto' }}>
            {/* IQ Verdict Card */}
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-card overflow-hidden">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(8, 145, 178, 0.08) 0%, rgba(8, 145, 178, 0.02) 100%)' }}>
                <div className="section-label text-teal-600 dark:text-teal-400 mb-3">IQ VERDICT: LONG-TERM RENTAL</div>
                <div className="flex items-center gap-4 bg-white dark:bg-surface-700 rounded-pill px-5 py-3 shadow-card mb-3">
                  <span className="text-3xl font-extrabold num text-teal-600 dark:text-teal-400">{calc.iqScore}</span>
                  <div>
                    <div className="text-base font-bold text-navy dark:text-white">
                      {calc.iqScore >= 70 ? 'Strong Investment' : calc.iqScore >= 50 ? 'Moderate Deal' : calc.iqScore > 0 && calc.annualCashFlow >= 0 ? 'Marginal Deal' : 'Cash Flow Negative'}
                    </div>
                    <div className="text-xs text-surface-500">Deal Score</div>
                  </div>
                </div>
                <p className="text-sm text-surface-500 text-center">
                  {calc.iqScore >= 70 ? 'Excellent potential with solid returns' : calc.iqScore >= 50 ? 'Acceptable returns, room to optimize' : calc.annualCashFlow >= 0 ? 'Consider negotiating price' : 'Deal loses money as structured'}
                </p>
              </div>
              
              {/* Returns vs Targets */}
              <div className="px-5 py-4 border-t border-surface-100 dark:border-surface-700">
                <div className="section-label text-navy dark:text-white mb-3">RETURNS VS TARGETS</div>
                <MetricRow label="Cap Rate" value={`${calc.capRate.toFixed(1)}%`} good={calc.capRate >= 8} threshold="8%" />
                <MetricRow label="Cash on Cash" value={`${calc.cashOnCash.toFixed(1)}%`} good={calc.cashOnCash >= 10} threshold="10%" />
                <MetricRow label="DSCR" value={`${calc.dscr.toFixed(2)}x`} good={calc.dscr >= 1.2} threshold="1.2x" />
                <MetricRow label="1% Rule" value={`${calc.rentToValue.toFixed(2)}%`} good={calc.rentToValue >= 1} threshold="1%" />
              </div>
            </div>
            
            {/* Key Numbers Card */}
            <div className="bg-white dark:bg-surface-800 rounded-xl shadow-card p-5">
              <div className="section-label text-navy dark:text-white mb-3">KEY NUMBERS</div>
              <div className="space-y-0 divide-y divide-surface-100 dark:divide-surface-700">
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">Cash Required</span>
                  <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.totalCashNeeded)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">NOI</span>
                  <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.noi)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">Debt Service</span>
                  <span className="text-sm font-semibold text-navy dark:text-white num">{formatCurrency(calc.monthlyMortgage * 12)}/yr</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-surface-500">DSCR</span>
                  <span className={`text-sm font-semibold num ${calc.dscr >= 1.25 ? 'text-teal-600 dark:text-teal-400' : 'text-navy dark:text-white'}`}>{calc.dscr.toFixed(2)}x</span>
                </div>
              </div>
            </div>
            
            {/* Profit Zone Dashboard */}
            <ProfitZoneDashboard
              metrics={profitZoneMetrics}
              projectedProfit={projectedProfit}
              breakevenPrice={breakevenPrice}
              listPrice={purchasePrice}
              tips={profitZoneTips}
            />
            
            {/* Export CTA Button */}
            <button 
              onClick={onExportPDF}
              className="w-full py-4 px-6 bg-teal-600/10 dark:bg-teal-400/10 hover:bg-teal-600/20 dark:hover:bg-teal-400/20 border border-teal-600/25 dark:border-teal-400/25 rounded-pill text-navy dark:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              Export PDF Report →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
