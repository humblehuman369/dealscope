'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { KPIRow } from './KPIRow'
import { ExportActions } from './ExportActions'
import { LTRSectionCard } from './LTRSectionCard'
import { SliderInput } from './SliderInput'
import { ResultBox } from './ResultBox'
import { MetricRow } from './MetricRow'
import { SegmentedControl } from './SegmentedControl'
import { ProfitScale } from './ProfitScale'
import { IQVerdictBreakdown } from './IQVerdictBreakdown'
import { useTheme } from '@/context/ThemeContext'
import { SavedProperty, getDisplayAddress } from '@/types/savedProperty'

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

  // IQ Factors for breakdown
  const iqFactors = useMemo(() => [
    { 
      label: 'Cash Flow', 
      score: calc.monthlyCashFlow > 500 ? 20 : calc.monthlyCashFlow > 200 ? 15 : calc.monthlyCashFlow > 0 ? 8 : 0, 
      max: 20 
    },
    { 
      label: 'Cash-on-Cash', 
      score: calc.cashOnCash > 10 ? 15 : calc.cashOnCash > 8 ? 12 : calc.cashOnCash > 5 ? 8 : 4, 
      max: 15 
    },
    { 
      label: 'Cap Rate', 
      score: calc.capRate > 8 ? 10 : calc.capRate > 6 ? 7 : 4, 
      max: 10 
    },
    { 
      label: 'Debt Coverage', 
      score: calc.dscr > 1.5 ? 8 : calc.dscr > 1.25 ? 5 : 2, 
      max: 8 
    },
    { 
      label: 'Rent Efficiency', 
      score: calc.rentToValue > 1 ? 7 : calc.rentToValue > 0.8 ? 4 : 2, 
      max: 7 
    },
  ], [calc])

  // Dynamic suggestions based on current values
  const suggestions = useMemo(() => {
    const result = []
    if (purchasePrice > 100000) {
      result.push({ action: `Negotiate price to $${(purchasePrice - 25000).toLocaleString()}`, delta: 5 })
    }
    if (monthlyRent < 10000) {
      result.push({ action: `Increase rent to $${(monthlyRent + 400).toLocaleString()}/mo`, delta: 3 })
    }
    if (downPaymentPct > 15) {
      result.push({ action: `Reduce down payment to ${downPaymentPct - 5}%`, delta: 2 })
    }
    return result
  }, [purchasePrice, monthlyRent, downPaymentPct])

  // Format currency helper
  const formatCurrency = useCallback((value: number) => `$${Math.round(value).toLocaleString()}`, [])

  return (
    <div className="bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      
      {/* WORKSHEET HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-5 py-4">
          
          {/* Property Info Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded uppercase tracking-wider">LTR</span>
              <div>
                <div className="text-sm text-slate-900 dark:text-white font-semibold">{address}</div>
                <div className="text-xs text-slate-500">
                  {city}{city && state ? ', ' : ''}{state} {zip} 
                  {beds > 0 && ` · ${beds} BR`}
                  {baths > 0 && ` · ${baths} BA`}
                  {sqft > 0 && ` · ${sqft.toLocaleString()} sqft`}
                </div>
              </div>
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
          
          {/* Actions Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewMode('monthly')}
                className={`text-xs font-medium pb-0.5 border-b-2 ${
                  viewMode === 'monthly' 
                    ? 'text-slate-900 dark:text-white border-cyan-500 dark:border-cyan-400' 
                    : 'text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-white'
                } transition-colors`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setViewMode('yearly')}
                className={`text-xs pb-0.5 ml-2 ${
                  viewMode === 'yearly' 
                    ? 'text-slate-900 dark:text-white border-b-2 border-cyan-500 dark:border-cyan-400' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                } transition-colors`}
              >
                Yearly
              </button>
            </div>
            <ExportActions 
              onExportExcel={onExportExcel}
              onExportPDF={onExportPDF}
              onShare={onShare}
            />
          </div>
        </div>
      </header>
      
      {/* WORKSHEET */}
      <main className="max-w-6xl mx-auto px-5 py-6">
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <LTRSectionCard title="Purchase & Rehab" accentColor="#4dd0e1">
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
                <div className="grid grid-cols-2 gap-3">
                  <ResultBox label="Amount Financed" value={formatCurrency(calc.loanAmount)} />
                  <SliderInput 
                    label="Down Payment" 
                    value={downPaymentPct} 
                    onChange={setDownPaymentPct} 
                    min={0} 
                    max={100} 
                    step={5} 
                    format="percent" 
                  />
                </div>
                <SliderInput 
                  label="Purchase Costs" 
                  value={purchaseCostsPct} 
                  onChange={setPurchaseCostsPct} 
                  min={0} 
                  max={10} 
                  step={0.5} 
                  format="percent" 
                />
                <SliderInput 
                  label="Rehab Costs" 
                  value={rehabCost} 
                  onChange={setRehabCost} 
                  min={0} 
                  max={200000} 
                  step={1000} 
                  format="currency" 
                />
                <ResultBox 
                  label="Total Cash Needed" 
                  value={formatCurrency(calc.totalCashNeeded)} 
                  variant="highlight" 
                  size="large" 
                />
              </LTRSectionCard>
              
              <LTRSectionCard title="Financing" accentColor="#007ea7">
                <div className="grid grid-cols-2 gap-3">
                  <ResultBox label="Loan Amount" value={formatCurrency(calc.loanAmount)} />
                  <ResultBox label="Loan-to-Value" value={`${(100 - downPaymentPct)}%`} />
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
                <ResultBox 
                  label="Monthly Payment (P&I)" 
                  value={formatCurrency(calc.monthlyMortgage)} 
                  size="large" 
                />
              </LTRSectionCard>
            </div>
            
            <LTRSectionCard title="Valuation" accentColor="#10b981">
              <div className="grid md:grid-cols-3 gap-4">
                <SliderInput 
                  label="After Repair Value" 
                  value={arv} 
                  onChange={setArv} 
                  min={Math.round(purchasePrice * 0.8)} 
                  max={Math.round(purchasePrice * 1.5)} 
                  step={5000} 
                  format="currency" 
                />
                <ResultBox label="ARV/sqft" value={sqft > 0 ? `$${Math.round(arv / sqft)}` : 'N/A'} />
                <ResultBox label="Price/sqft" value={sqft > 0 ? `$${Math.round(purchasePrice / sqft)}` : 'N/A'} />
              </div>
              <ResultBox 
                label="Equity at Purchase" 
                value={formatCurrency(calc.equityAtPurchase)} 
                variant="success" 
                size="large" 
              />
            </LTRSectionCard>
            
            <LTRSectionCard title="Cash Flow (Year 1)" accentColor="#f59e0b">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold border-b border-amber-200 dark:border-amber-400/30 pb-2">
                    Income
                  </div>
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
                  <ResultBox label="Annual Gross Rent" value={formatCurrency(calc.annualGrossRent)} />
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
                  <ResultBox 
                    label="Effective Gross Income" 
                    value={formatCurrency(calc.effectiveGrossIncome)} 
                    variant="success" 
                  />
                </div>
                <div className="space-y-4">
                  <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wider font-bold border-b border-orange-200 dark:border-orange-400/30 pb-2">
                    Expenses
                  </div>
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
                    label="Property Mgmt" 
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
                  <ResultBox 
                    label="Total Expenses" 
                    value={formatCurrency(calc.totalOperatingExpenses)} 
                    variant="warning" 
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <ResultBox label="NOI" value={formatCurrency(calc.noi)} />
                <ResultBox 
                  label="Debt Service" 
                  value={`-${formatCurrency(calc.monthlyMortgage * 12)}`} 
                  variant="danger" 
                />
                <ResultBox 
                  label="Annual Cash Flow" 
                  value={formatCurrency(calc.annualCashFlow)} 
                  variant={calc.annualCashFlow >= 0 ? 'success' : 'danger'} 
                  size="large" 
                />
              </div>
            </LTRSectionCard>
            
            <div className="grid md:grid-cols-2 gap-5">
              <LTRSectionCard title="Investment Returns" accentColor="#8b5cf6">
                <MetricRow 
                  label="Cap Rate" 
                  value={`${calc.capRate.toFixed(2)}%`} 
                  good={calc.capRate >= 6} 
                  threshold="> 6%" 
                />
                <MetricRow 
                  label="Cash-on-Cash" 
                  value={`${calc.cashOnCash.toFixed(2)}%`} 
                  good={calc.cashOnCash >= 8} 
                  threshold="> 8%" 
                />
                <MetricRow 
                  label="Rent-to-Value" 
                  value={`${calc.rentToValue.toFixed(2)}%`} 
                  good={calc.rentToValue >= 1} 
                  threshold="> 1%" 
                />
              </LTRSectionCard>
              <LTRSectionCard title="Financial Ratios" accentColor="#ec4899">
                <MetricRow 
                  label="DSCR" 
                  value={`${calc.dscr.toFixed(2)}x`} 
                  good={calc.dscr >= 1.25} 
                  threshold="> 1.25x" 
                />
                <MetricRow 
                  label="GRM" 
                  value={`${calc.grm.toFixed(1)}x`} 
                  good={calc.grm <= 12} 
                  threshold="< 12x" 
                />
                <MetricRow 
                  label="Break-Even" 
                  value={`${calc.breakEvenRatio.toFixed(1)}%`} 
                  good={calc.breakEvenRatio <= 85} 
                  threshold="< 85%" 
                />
              </LTRSectionCard>
            </div>
          </div>
          
          <div className="lg:col-span-4 space-y-5">
            <ProfitScale 
              grossRent={monthlyRent} 
              vacancy={calc.vacancyLoss / 12} 
              expenses={calc.totalOperatingExpenses / 12} 
              mortgage={calc.monthlyMortgage} 
              cashFlow={calc.monthlyCashFlow} 
            />
            <IQVerdictBreakdown 
              score={calc.iqScore} 
              factors={iqFactors} 
              suggestions={suggestions} 
            />
          </div>
        </div>
      </main>
    </div>
  )
}
