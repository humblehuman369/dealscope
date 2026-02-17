'use client'

/**
 * InvestmentAnalysis Component - Decision-Grade UI
 * 
 * Displays IQ Price Selector (Breakeven, Target Buy, Wholesale) with metrics row.
 * Per DealMakerIQ Design System - high contrast, legibility-first.
 * 
 * DYNAMIC ANALYTICS:
 * - Price cards are clickable and trigger recalculation
 * - Metrics row updates based on active price target and strategy
 */

import React, { useState, useCallback } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { formatPrice } from './types'
import { PriceTarget } from '@/lib/priceUtils'
import { MetricId } from '@/config/strategyMetrics'

interface FinancingDefaults {
  down_payment_pct: number
  interest_rate: number
  loan_term_years: number
  closing_costs_pct?: number
}

interface OperatingDefaults {
  vacancy_rate: number
  maintenance_pct: number
  property_management_pct: number
}

interface Strategy {
  short: string
  full: string
}

interface InvestmentAnalysisProps {
  incomeValue: number
  targetBuyPrice: number
  wholesalePrice: number
  isOffMarket: boolean
  priceSource: string
  marketValue: number
  financing: FinancingDefaults
  operating: OperatingDefaults
  onEditAssumptions?: () => void
  currentStrategy?: string
  strategies?: Strategy[]
  onStrategyChange?: (strategy: string) => void
  // Metrics row
  monthlyCashFlow?: number
  cashNeeded?: number
  capRate?: number
  // Dynamic analytics props
  activePriceTarget?: PriceTarget
  onPriceTargetChange?: (target: PriceTarget) => void
  strategyMetrics?: Array<{ id: MetricId; label: string; value: string }>
}

const DEFAULT_STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
]

export function InvestmentAnalysis({
  incomeValue,
  targetBuyPrice,
  wholesalePrice,
  isOffMarket,
  priceSource,
  marketValue,
  financing,
  operating,
  onEditAssumptions,
  currentStrategy = 'Long-term',
  strategies = DEFAULT_STRATEGIES,
  onStrategyChange,
  monthlyCashFlow = 0,
  cashNeeded = 0,
  capRate = 0,
  activePriceTarget = 'targetBuy',
  onPriceTargetChange,
  strategyMetrics,
}: InvestmentAnalysisProps) {
  const [showCalculation, setShowCalculation] = useState(false)
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false)

  // Handle price card clicks
  const handlePriceCardClick = useCallback((target: PriceTarget) => {
    onPriceTargetChange?.(target)
  }, [onPriceTargetChange])

  // Format cash flow with /mo suffix
  const formatCashFlow = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
    return value < 0 ? `-$${formatted}/mo` : `$${formatted}/mo`
  }

  // Format cash needed
  const formatCashNeeded = (value: number) => {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }

  // Format cap rate
  const formatCapRate = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div style={{ background: 'var(--dg-bg-primary)' }}>
      {/* Section Divider */}
      <div className="dg-section-divider" />
      
      {/* Header Section */}
      <div className="p-5 pb-3">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 style={{ 
              fontSize: '14px', 
              fontWeight: 700, 
              color: 'var(--dg-text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              margin: '0 0 2px 0'
            }}>
              YOUR INVESTMENT ANALYSIS
            </h2>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: 'var(--dg-text-primary)' 
            }}>
              Based on YOUR financing terms ({(financing.down_payment_pct * 100).toFixed(0)}% down, {(financing.interest_rate * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button 
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--dg-pacific-teal)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={onEditAssumptions}
            >
              Change terms
            </button>
            {/* Strategy Dropdown */}
            <div className="relative">
              <button
                className="dg-adjust-btn flex items-center gap-1.5"
                style={{ padding: '6px 12px', borderRadius: '4px' }}
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
              >
                {currentStrategy}
                <ChevronDown 
                  className="w-3.5 h-3.5 transition-transform" 
                  style={{ transform: showStrategyDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {showStrategyDropdown && (
                <div 
                  className="absolute right-0 top-full mt-1 z-50"
                  style={{
                    background: 'white',
                    border: '1px solid var(--dg-border-medium)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: '160px',
                  }}
                >
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.short}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: currentStrategy === strategy.short ? 600 : 500,
                        color: currentStrategy === strategy.short ? 'var(--dg-pacific-teal)' : 'var(--dg-text-primary)',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--dg-border-light)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onClick={() => {
                        onStrategyChange?.(strategy.short)
                        setShowStrategyDropdown(false)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--dg-bg-secondary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {strategy.full}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* How Breakeven is calculated link */}
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--dg-pacific-teal)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            margin: '12px 0',
          }}
          onClick={() => setShowCalculation(!showCalculation)}
        >
          <span style={{
            width: '14px',
            height: '14px',
            border: '1.5px solid var(--dg-pacific-teal)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
          }}>i</span>
          How BREAKEVEN is calculated
        </button>

        {/* Calculation Breakdown */}
        {showCalculation && (
          <div style={{
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--dg-border-light)',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--dg-text-primary)',
              marginBottom: '8px',
            }}>
              BREAKEVEN CALCULATION
            </div>
            <div style={{
              background: 'var(--dg-bg-secondary)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--dg-text-secondary)' }}>Monthly Gross Rent</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--dg-text-primary)' }}>× 12 months</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--dg-text-secondary)' }}>Less: Vacancy ({(operating.vacancy_rate * 100).toFixed(0)}%)</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--dg-text-primary)' }}>= Effective Income</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--dg-text-secondary)' }}>Less: Operating Expenses</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--dg-text-primary)' }}>= NOI</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '8px', 
                borderTop: '1px solid var(--dg-border-light)' 
              }}>
                <span style={{ fontSize: '11px', color: 'var(--dg-text-secondary)' }}>NOI ÷ Mortgage Constant</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dg-pacific-teal)' }}>= Breakeven Price</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IQ Price Selector */}
      <div style={{ margin: '0 16px' }}>
        <div className="dg-iq-selector">
          {/* Income Value */}
          <div 
            className={`dg-iq-option ${activePriceTarget === 'breakeven' ? 'selected' : ''}`}
            onClick={() => handlePriceCardClick('breakeven')}
          >
            <div className="dg-iq-option-label">
              INCOME VALUE 
              <span style={{
                width: '12px',
                height: '12px',
                border: '1.5px solid var(--dg-border-medium)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
              }}>i</span>
            </div>
            <div className="dg-iq-option-value">{formatPrice(incomeValue)}</div>
            <div className="dg-iq-option-sub">Max price for $0 cashflow</div>
          </div>
          
          {/* Target Buy */}
          <div 
            className={`dg-iq-option ${activePriceTarget === 'targetBuy' ? 'selected' : ''}`}
            onClick={() => handlePriceCardClick('targetBuy')}
          >
            <div className="dg-iq-option-label">
              TARGET BUY 
              <span style={{
                width: '12px',
                height: '12px',
                border: '1.5px solid var(--dg-border-medium)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
              }}>i</span>
            </div>
            <div className="dg-iq-option-value">{formatPrice(targetBuyPrice)}</div>
            <div className="dg-iq-option-sub">Positive Cashflow</div>
          </div>
          
          {/* Wholesale */}
          <div 
            className={`dg-iq-option ${activePriceTarget === 'wholesale' ? 'selected' : ''}`}
            onClick={() => handlePriceCardClick('wholesale')}
          >
            <div className="dg-iq-option-label">
              WHOLESALE 
              <span style={{
                width: '12px',
                height: '12px',
                border: '1.5px solid var(--dg-border-medium)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
              }}>i</span>
            </div>
            <div className="dg-iq-option-value">{formatPrice(wholesalePrice)}</div>
            <div className="dg-iq-option-sub">30% net discount for assignment</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dg-metrics-row">
        {strategyMetrics && strategyMetrics.length === 3 ? (
          strategyMetrics.map((metric) => (
            <div key={metric.id} className="dg-metrics-box">
              <div className="dg-metrics-box-label">{metric.label}</div>
              <div className="dg-metrics-box-value">{metric.value}</div>
            </div>
          ))
        ) : (
          <>
            <div className="dg-metrics-box">
              <div className="dg-metrics-box-label">CASH FLOW</div>
              <div className="dg-metrics-box-value">{formatCashFlow(monthlyCashFlow)}</div>
            </div>
            <div className="dg-metrics-box">
              <div className="dg-metrics-box-label">CASH NEEDED</div>
              <div className="dg-metrics-box-value">{formatCashNeeded(cashNeeded)}</div>
            </div>
            <div className="dg-metrics-box">
              <div className="dg-metrics-box-label">CAP RATE</div>
              <div className="dg-metrics-box-value">{formatCapRate(capRate)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default InvestmentAnalysis
