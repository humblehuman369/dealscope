'use client'

import React, { useState } from 'react'
import { Target, Pencil, X, Check } from 'lucide-react'

/**
 * IQTargetHero Component
 * 
 * The hero element displaying the IQ Buy Price - the recommended entry point
 * for a profitable investment. Features a two-column layout with:
 * - Left: Price info (title, price, savings, insight)
 * - Right: Assumptions card with editable inputs
 * 
 * This is the "crown jewel" of the analytics redesign, showing users exactly
 * what price they should target for their chosen strategy.
 */

interface IQTargetHeroProps {
  /** The calculated target price */
  targetPrice: number
  /** Amount below list price */
  discountAmount: number
  /** Percentage below list price */
  discountPercent: number
  /** Strategy-specific rationale text */
  rationale: string
  /** Highlighted metric in rationale (e.g., "$486/mo cash flow") */
  highlightedMetric?: string
  /** Secondary highlighted metric (e.g., "12.4% Cash-on-Cash") */
  secondaryMetric?: string
  /** Custom badge text (defaults to "IQ Buy Price") */
  badgeText?: string
  /** Custom label above price (defaults to "Your Profitable Entry Point") */
  labelText?: string
  /** Monthly rent assumption */
  monthlyRent?: number
  /** Down payment percentage */
  downPaymentPct?: number
  /** Interest rate */
  interestRate?: number
  /** Callback when assumptions change */
  onAssumptionsChange?: (key: string, value: number) => void
}

export function IQTargetHero({
  targetPrice,
  discountAmount,
  discountPercent,
  rationale,
  highlightedMetric,
  secondaryMetric,
  badgeText = 'IQ Buy Price',
  labelText = 'Your profitable entry point',
  monthlyRent = 2500,
  downPaymentPct = 0.20,
  interestRate = 0.0725,
  onAssumptionsChange
}: IQTargetHeroProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedRent, setEditedRent] = useState(monthlyRent)
  const [editedDownPayment, setEditedDownPayment] = useState(downPaymentPct * 100)
  const [editedInterestRate, setEditedInterestRate] = useState(interestRate * 100)

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const formatCompact = (value: number) => 
    Math.abs(value) >= 1000 
      ? `$${Math.round(value / 1000).toLocaleString()}K` 
      : formatCurrency(value)

  const handleSave = () => {
    if (onAssumptionsChange) {
      onAssumptionsChange('monthlyRent', editedRent)
      onAssumptionsChange('downPaymentPct', editedDownPayment / 100)
      onAssumptionsChange('interestRate', editedInterestRate / 100)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedRent(monthlyRent)
    setEditedDownPayment(downPaymentPct * 100)
    setEditedInterestRate(interestRate * 100)
    setIsEditing(false)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 mb-4 border-2 border-teal/40 dark:border-accent-500/40 bg-white dark:bg-white/[0.02]">
      {/* Two-column layout on larger screens */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Side - Price Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-[18px] h-[18px] text-teal" />
            <span className="text-sm font-semibold text-teal">
              {badgeText}
            </span>
          </div>
          
          {/* Subtitle */}
          <div className="text-[13px] text-slate-500 dark:text-white/50 mb-4">
            {labelText}
          </div>

          {/* Buy Price */}
          <div className="text-[44px] font-extrabold text-slate-900 dark:text-white leading-none mb-2 tracking-[-2px]">
            {formatCurrency(targetPrice)}
          </div>

          {/* Discount Info */}
          <div className="text-sm font-semibold text-emerald-600 dark:text-[#00D4AA] mb-4">
            ↓ {formatCompact(discountAmount)} below list ({Math.round(discountPercent)}%)
          </div>

          {/* Rationale / Insight Text */}
          <p className="text-[13px] text-slate-500 dark:text-white/50 leading-relaxed mt-auto">
            {rationale}
            {highlightedMetric && (
              <>
                {' '}
                <strong className="text-teal font-semibold">{highlightedMetric}</strong>
              </>
            )}
            {secondaryMetric && (
              <>
                {' with '}
                <strong className="text-teal font-semibold">{secondaryMetric}</strong>
                {' return'}
              </>
            )}
          </p>
        </div>

        {/* Right Side - Assumptions Card */}
        <div className={`w-full md:w-auto md:min-w-[200px] md:max-w-[280px] flex-shrink-0 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 transition-all duration-300 ${isEditing ? 'md:min-w-[260px]' : ''}`}>
          {/* Header */}
          <div className="text-[11px] font-medium text-slate-500 dark:text-white/40 mb-3.5 pb-2.5 border-b border-slate-200 dark:border-white/[0.06]">
            Buy Price based on these values
          </div>

          {/* Assumptions List (shown when not editing) */}
          {!isEditing && (
            <>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-white/50">Monthly Rent</span>
                  <span className="text-sm font-semibold text-teal">{formatCurrency(monthlyRent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-white/50">Down Payment</span>
                  <span className="text-sm font-semibold text-teal">{Math.round(downPaymentPct * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-white/50">Interest Rate</span>
                  <span className="text-sm font-semibold text-teal">{(interestRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-1.5 w-full mt-3.5 py-2.5 px-4 bg-teal/10 border border-teal/25 rounded-lg text-teal text-[13px] font-semibold transition-all hover:bg-teal/20 hover:border-teal/40"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            </>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <div className="flex flex-col gap-3">
              {/* Monthly Rent Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-white/40">Monthly Rent</label>
                <input
                  type="text"
                  value={`$${editedRent.toLocaleString()}`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    setEditedRent(Number(val) || 0)
                  }}
                  className="bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.12] rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal focus:bg-teal/5 transition-all"
                />
              </div>

              {/* Down Payment Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-white/40">Down Payment</label>
                <input
                  type="text"
                  value={`${editedDownPayment}%`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    setEditedDownPayment(Number(val) || 0)
                  }}
                  className="bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.12] rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal focus:bg-teal/5 transition-all"
                />
              </div>

              {/* Interest Rate Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-white/40">Interest Rate</label>
                <input
                  type="text"
                  value={`${editedInterestRate.toFixed(2)}%`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    setEditedInterestRate(Number(val) || 0)
                  }}
                  className="bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.12] rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-teal focus:bg-teal/5 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 bg-transparent border border-slate-200 dark:border-white/[0.12] rounded-lg text-slate-500 dark:text-white/60 text-[13px] font-semibold transition-all hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-700 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-teal border-none rounded-lg text-white text-[13px] font-bold transition-all hover:bg-teal/90"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * IQTargetHeroCompact Component
 * 
 * A more compact version for use in comparison views or smaller spaces.
 */

interface IQTargetHeroCompactProps {
  targetPrice: number
  discountPercent: number
  primaryMetric: string
  primaryLabel: string
}

export function IQTargetHeroCompact({
  targetPrice,
  discountPercent,
  primaryMetric,
  primaryLabel
}: IQTargetHeroCompactProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="relative overflow-hidden rounded-xl p-4 text-center border border-[rgba(0,212,255,0.25)] bg-white/[0.02]">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Target className="w-3.5 h-3.5 text-[#00D4FF]" />
        <span className="text-[0.65rem] font-bold text-[#00D4FF] uppercase tracking-wider">
          IQ Target
        </span>
      </div>
      
      <div className="text-xl font-bold text-white mb-0.5">
        {formatCurrency(targetPrice)}
      </div>
      
      <div className="text-[0.65rem] text-white/50 mb-2">
        {Math.round(discountPercent)}% below list
      </div>
      
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/10">
        <div>
          <div className="text-sm font-bold text-[#00D4AA]">{primaryMetric}</div>
          <div className="text-[0.6rem] text-white/50 uppercase">{primaryLabel}</div>
        </div>
      </div>
    </div>
  )
}

export default IQTargetHero
