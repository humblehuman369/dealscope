/**
 * DealMakerPage - Deal Maker IQ main container
 * EXACT implementation from design files
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { MetricsHeader } from './MetricsHeader'
import { WorksheetTab } from './WorksheetTab'
import { DealMakerSlider, formatSliderValue } from './DealMakerSlider'
import {
  DealMakerState,
  DealMakerMetrics,
  DealMakerPageProps,
  TabId,
  TabConfig,
  TAB_CONFIGS,
  DEFAULT_DEAL_MAKER_STATE,
  BUY_PRICE_SLIDERS,
  FINANCING_SLIDERS,
  REHAB_VALUATION_SLIDERS,
  INCOME_SLIDERS,
  EXPENSES_SLIDERS,
  LoanType,
} from './types'

function calculateMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  
  return isFinite(payment) ? payment : 0
}

function calculateDealMakerMetrics(
  state: DealMakerState,
  listPrice?: number
): DealMakerMetrics {
  const {
    buyPrice,
    downPaymentPercent,
    closingCostsPercent,
    interestRate,
    loanTermYears,
    rehabBudget,
    arv,
    monthlyRent,
    otherIncome,
    vacancyRate,
    maintenanceRate,
    managementRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
  } = state

  const downPaymentAmount = buyPrice * downPaymentPercent
  const closingCostsAmount = buyPrice * closingCostsPercent
  const cashNeeded = downPaymentAmount + closingCostsAmount

  const loanAmount = buyPrice - downPaymentAmount
  const monthlyPayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears)

  const totalInvestment = buyPrice + rehabBudget
  const equityCreated = arv - totalInvestment

  const grossMonthlyIncome = monthlyRent + otherIncome

  const vacancy = grossMonthlyIncome * vacancyRate
  const maintenance = grossMonthlyIncome * maintenanceRate
  const management = grossMonthlyIncome * managementRate
  const propertyTaxMonthly = annualPropertyTax / 12
  const insuranceMonthly = annualInsurance / 12

  const monthlyOperatingExpenses = vacancy + maintenance + management + 
    propertyTaxMonthly + insuranceMonthly + monthlyHoa
  const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment

  const annualNOI = (grossMonthlyIncome - monthlyOperatingExpenses) * 12
  const annualCashFlow = (grossMonthlyIncome - totalMonthlyExpenses) * 12
  const annualProfit = annualCashFlow

  const capRate = buyPrice > 0 ? annualNOI / buyPrice : 0
  const cocReturn = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0

  const effectiveListPrice = listPrice ?? buyPrice
  const discountFromList = effectiveListPrice > 0 
    ? (effectiveListPrice - buyPrice) / effectiveListPrice 
    : 0
  const dealGap = discountFromList

  const dealScore = calculateDealScore(cocReturn, capRate, annualCashFlow)
  const dealGrade = getDealGrade(dealScore)
  const profitQuality = getProfitQualityGrade(cocReturn)

  return {
    cashNeeded,
    downPaymentAmount,
    closingCostsAmount,
    loanAmount,
    monthlyPayment,
    equityCreated,
    totalInvestment,
    grossMonthlyIncome,
    totalMonthlyExpenses,
    monthlyOperatingExpenses,
    dealGap,
    annualProfit,
    capRate,
    cocReturn,
    dealScore,
    dealGrade,
    profitQuality,
  }
}

function calculateDealScore(cocReturn: number, capRate: number, annualCashFlow: number): number {
  let score = 0

  const cocPercent = cocReturn * 100
  if (cocPercent >= 15) score += 40
  else if (cocPercent >= 10) score += 35
  else if (cocPercent >= 8) score += 30
  else if (cocPercent >= 5) score += 20
  else if (cocPercent >= 2) score += 10
  else if (cocPercent > 0) score += 5

  const capPercent = capRate * 100
  if (capPercent >= 10) score += 30
  else if (capPercent >= 8) score += 25
  else if (capPercent >= 6) score += 20
  else if (capPercent >= 4) score += 10
  else if (capPercent > 0) score += 5

  if (annualCashFlow >= 12000) score += 30
  else if (annualCashFlow >= 6000) score += 25
  else if (annualCashFlow >= 3000) score += 20
  else if (annualCashFlow >= 1200) score += 10
  else if (annualCashFlow > 0) score += 5

  return Math.min(100, score)
}

function getDealGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A+'
  if (score >= 70) return 'A'
  if (score >= 55) return 'B'
  if (score >= 40) return 'C'
  if (score >= 25) return 'D'
  return 'F'
}

function getProfitQualityGrade(cocReturn: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const cocPercent = cocReturn * 100
  if (cocPercent >= 12) return 'A+'
  if (cocPercent >= 10) return 'A'
  if (cocPercent >= 8) return 'B'
  if (cocPercent >= 5) return 'C'
  if (cocPercent >= 2) return 'D'
  return 'F'
}

export function DealMakerPage({
  propertyAddress,
  listPrice,
  initialState,
  propertyTax,
  insurance,
  rentEstimate,
}: DealMakerPageProps) {
  const router = useRouter()

  const [state, setState] = useState<DealMakerState>(() => ({
    ...DEFAULT_DEAL_MAKER_STATE,
    buyPrice: listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice,
    annualPropertyTax: propertyTax ?? DEFAULT_DEAL_MAKER_STATE.annualPropertyTax,
    annualInsurance: insurance ?? DEFAULT_DEAL_MAKER_STATE.annualInsurance,
    monthlyRent: rentEstimate ?? DEFAULT_DEAL_MAKER_STATE.monthlyRent,
    arv: (listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice) * 1.2,
    ...initialState,
  }))

  const [activeTab, setActiveTab] = useState<TabId | null>('buyPrice')
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set())

  const metrics = useMemo<DealMakerMetrics>(() => {
    return calculateDealMakerMetrics(state, listPrice)
  }, [state, listPrice])

  const updateState = useCallback(<K extends keyof DealMakerState>(
    key: K,
    value: DealMakerState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTabToggle = useCallback((tabId: TabId) => {
    setActiveTab(prev => prev === tabId ? null : tabId)
  }, [])

  const handleFinish = useCallback(() => {
    console.log('Deal saved:', { state, metrics })
    router.back()
  }, [state, metrics, router])

  const handleContinue = useCallback((currentTabId: TabId) => {
    setCompletedTabs(prev => new Set(prev).add(currentTabId))

    const tabOrder: TabId[] = ['buyPrice', 'financing', 'rehabValuation', 'income', 'expenses']
    const currentIndex = tabOrder.indexOf(currentTabId)
    
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1])
    } else {
      handleFinish()
    }
  }, [handleFinish])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const tabConfigs = useMemo<TabConfig[]>(() => {
    return TAB_CONFIGS.map(config => ({
      ...config,
      status: completedTabs.has(config.id) 
        ? 'completed' 
        : config.id === activeTab 
          ? 'active' 
          : 'pending',
    }))
  }, [activeTab, completedTabs])

  const loanTypeOptions: LoanType[] = ['15-year', '30-year', 'arm']
  const loanTypeLabels = ['15-Year Fixed', '30-Year Fixed', 'ARM']

  const handleLoanTypeChange = useCallback((newType: LoanType) => {
    updateState('loanType', newType)
    
    if (newType === '15-year') {
      updateState('loanTermYears', 15)
    } else if (newType === '30-year') {
      updateState('loanTermYears', 30)
    }
  }, [updateState])

  // Reset all sliders to IQ defaults (but keep property-specific values)
  const handleResetToDefaults = useCallback(() => {
    setState(prev => ({
      ...DEFAULT_DEAL_MAKER_STATE,
      // Preserve property-specific values
      buyPrice: listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice,
      annualPropertyTax: propertyTax ?? DEFAULT_DEAL_MAKER_STATE.annualPropertyTax,
      annualInsurance: insurance ?? DEFAULT_DEAL_MAKER_STATE.annualInsurance,
      monthlyRent: rentEstimate ?? DEFAULT_DEAL_MAKER_STATE.monthlyRent,
      arv: (listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice) * 1.2,
    }))
  }, [listPrice, propertyTax, insurance, rentEstimate])

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9' }}>
      {/* DealGapIQ Header */}
      <div 
        className="sticky top-0 z-50 flex items-center justify-between"
        style={{ 
          background: 'white', 
          padding: '8px 20px 12px',
        }}
      >
        <button 
          onClick={handleBack}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <svg width="18" height="18" fill="none" stroke="#0EA5E9" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 500, color: '#0EA5E9' }}>Back</span>
        </button>
        
        <div style={{ fontSize: '22px', fontWeight: 700 }}>
          <span style={{ color: '#0A1628' }}>DealGap</span>
          <span style={{ color: '#0EA5E9' }}>IQ</span>
        </div>
        
        {/* Reset to IQ Defaults button */}
        <button 
          onClick={handleResetToDefaults}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ 
            cursor: 'pointer', 
            background: 'none', 
            border: 'none',
            fontSize: '12px',
            fontWeight: 500,
            color: '#64748B'
          }}
          title="Reset all sliders to IQ-recommended defaults"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Reset
        </button>
      </div>

      {/* Deal Maker IQ Header with Metrics */}
      <div className="sticky top-[52px] z-40">
        <MetricsHeader 
          state={state} 
          metrics={metrics} 
          listPrice={listPrice}
          propertyAddress={propertyAddress}
        />
      </div>

      {/* Scrollable Worksheet Tabs */}
      <div style={{ padding: '16px 0', paddingBottom: '40px' }}>
        {/* Tab 1: Buy Price */}
        <WorksheetTab
          config={tabConfigs[0]}
          isExpanded={activeTab === 'buyPrice'}
          onToggle={() => handleTabToggle('buyPrice')}
          onContinue={() => handleContinue('buyPrice')}
          derivedOutput={{
            label: 'CASH NEEDED',
            value: formatSliderValue(metrics.cashNeeded, 'currency'),
          }}
        >
          {BUY_PRICE_SLIDERS.map(slider => (
            <DealMakerSlider
              key={slider.id}
              config={slider}
              value={state[slider.id] as number}
              onChange={(value) => updateState(slider.id, value)}
            />
          ))}
        </WorksheetTab>

        {/* Tab 2: Financing */}
        <WorksheetTab
          config={tabConfigs[1]}
          isExpanded={activeTab === 'financing'}
          onToggle={() => handleTabToggle('financing')}
          onContinue={() => handleContinue('financing')}
          derivedOutput={{
            label: 'MONTHLY PAYMENT',
            value: formatSliderValue(metrics.monthlyPayment, 'currency'),
          }}
        >
          {/* Loan Amount */}
          <div 
            className="flex justify-between items-center"
            style={{ 
              padding: '12px 0', 
              marginTop: '16px',
              marginBottom: '8px',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628' }}>
              Loan Amount
            </span>
            <span 
              className="tabular-nums"
              style={{ fontSize: '16px', fontWeight: 700, color: '#0EA5E9' }}
            >
              {formatSliderValue(metrics.loanAmount, 'currency')}
            </span>
          </div>

          {/* Loan Type */}
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', display: 'block', marginBottom: '8px' }}>
              Loan Type
            </label>
            <div className="flex rounded-lg p-1" style={{ background: '#F1F5F9' }}>
              {loanTypeOptions.map((type, idx) => (
                <button
                  key={type}
                  onClick={() => handleLoanTypeChange(type)}
                  className="flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all"
                  style={{
                    background: state.loanType === type ? '#0EA5E9' : 'transparent',
                    color: state.loanType === type ? 'white' : '#64748B',
                  }}
                >
                  {loanTypeLabels[idx]}
                </button>
              ))}
            </div>
          </div>

          {FINANCING_SLIDERS.map(slider => (
            <DealMakerSlider
              key={slider.id}
              config={slider}
              value={state[slider.id] as number}
              onChange={(value) => updateState(slider.id, value)}
            />
          ))}
        </WorksheetTab>

        {/* Tab 3: Rehab & Valuation */}
        <WorksheetTab
          config={tabConfigs[2]}
          isExpanded={activeTab === 'rehabValuation'}
          onToggle={() => handleTabToggle('rehabValuation')}
          onContinue={() => handleContinue('rehabValuation')}
          derivedOutput={{
            label: 'EQUITY CREATED',
            value: formatSliderValue(metrics.equityCreated, 'currency'),
          }}
        >
          {REHAB_VALUATION_SLIDERS.map(slider => (
            <DealMakerSlider
              key={slider.id}
              config={{
                ...slider,
                ...(slider.id === 'arv' && {
                  min: state.buyPrice,
                  max: state.buyPrice * 2,
                }),
              }}
              value={state[slider.id] as number}
              onChange={(value) => updateState(slider.id, value)}
            />
          ))}
        </WorksheetTab>

        {/* Tab 4: Income */}
        <WorksheetTab
          config={tabConfigs[3]}
          isExpanded={activeTab === 'income'}
          onToggle={() => handleTabToggle('income')}
          onContinue={() => handleContinue('income')}
          derivedOutput={{
            label: 'GROSS MONTHLY INCOME',
            value: formatSliderValue(metrics.grossMonthlyIncome, 'currencyPerMonth'),
          }}
        >
          {INCOME_SLIDERS.map(slider => (
            <DealMakerSlider
              key={slider.id}
              config={slider}
              value={state[slider.id] as number}
              onChange={(value) => updateState(slider.id, value)}
            />
          ))}
        </WorksheetTab>

        {/* Tab 5: Expenses */}
        <WorksheetTab
          config={tabConfigs[4]}
          isExpanded={activeTab === 'expenses'}
          onToggle={() => handleTabToggle('expenses')}
          onContinue={() => handleContinue('expenses')}
          derivedOutput={{
            label: 'TOTAL MONTHLY EXPENSES',
            value: formatSliderValue(metrics.totalMonthlyExpenses, 'currencyPerMonth'),
          }}
          isLastTab
        >
          {EXPENSES_SLIDERS.map(slider => (
            <DealMakerSlider
              key={slider.id}
              config={slider}
              value={state[slider.id] as number}
              onChange={(value) => updateState(slider.id, value)}
            />
          ))}
        </WorksheetTab>
      </div>
    </div>
  )
}

export default DealMakerPage
