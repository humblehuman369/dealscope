'use client'

import React, { useState } from 'react'
import { Target, Pencil } from 'lucide-react'

/**
 * DesktopIQTargetHero Component
 * 
 * Enhanced desktop version of the IQ Target Hero with two-column layout:
 * - Left: Price info (title, price, savings, insight)
 * - Right: Assumptions card with editable inputs
 */

interface DesktopIQTargetHeroProps {
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
  /** Custom badge text (defaults to "IQ Target Price") */
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

export function DesktopIQTargetHero({
  targetPrice,
  discountAmount,
  discountPercent,
  rationale,
  highlightedMetric,
  secondaryMetric,
  badgeText = 'IQ Target Price',
  labelText = 'Your profitable entry point',
  monthlyRent = 2500,
  downPaymentPct = 0.20,
  interestRate = 0.0725,
  onAssumptionsChange
}: DesktopIQTargetHeroProps) {
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
    <div className="relative overflow-hidden rounded-2xl p-6 mb-5 border border-[rgba(0,212,255,0.25)] bg-white/[0.02] shadow-[0_0_20px_rgba(0,212,255,0.05)]">
      {/* Two-column layout */}
      <div className="flex gap-8 items-start">
        
        {/* Left Side - Price Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-[#00D4FF]" />
            <span className="text-base font-semibold text-[#00D4FF]">
              {badgeText}
            </span>
          </div>
          
          {/* Subtitle */}
          <div className="text-sm text-white/50 mb-5">
            {labelText}
          </div>

          {/* Target Price */}
          <div className="text-[52px] font-extrabold text-white leading-none mb-2 tracking-[-2px]">
            {formatCurrency(targetPrice)}
          </div>

          {/* Discount Info */}
          <div className="text-base font-semibold text-[#00D4AA] mb-5">
            ↓ {formatCompact(discountAmount)} below list ({Math.round(discountPercent)}%)
          </div>

          {/* Rationale / Insight Text */}
          <p className="text-sm text-white/50 leading-relaxed mt-auto">
            {rationale}
            {highlightedMetric && (
              <>
                {' '}
                <strong className="text-[#00D4FF] font-semibold">{highlightedMetric}</strong>
              </>
            )}
            {secondaryMetric && (
              <>
                {' with '}
                <strong className="text-[#00D4FF] font-semibold">{secondaryMetric}</strong>
                {' return'}
              </>
            )}
          </p>
        </div>

        {/* Right Side - Assumptions Card */}
        <div className={`min-w-[220px] max-w-[300px] flex-shrink-0 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all duration-300 ${isEditing ? 'min-w-[280px]' : ''}`}>
          {/* Header */}
          <div className="text-xs font-medium text-white/40 mb-4 pb-3 border-b border-white/[0.06]">
            Price calculated from your inputs
          </div>

          {/* Assumptions List (shown when not editing) */}
          {!isEditing && (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Monthly Rent</span>
                  <span className="text-base font-semibold text-white">{formatCurrency(monthlyRent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Down Payment</span>
                  <span className="text-base font-semibold text-white">{Math.round(downPaymentPct * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Interest Rate</span>
                  <span className="text-base font-semibold text-white">{(interestRate * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-2 w-full mt-4 py-3 px-4 bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.25)] rounded-lg text-[#00D4FF] text-sm font-semibold transition-all hover:bg-[rgba(0,212,255,0.18)] hover:border-[rgba(0,212,255,0.4)]"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <div className="flex flex-col gap-3">
              {/* Monthly Rent Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-white/40">Monthly Rent</label>
                <input
                  type="text"
                  value={`$${editedRent.toLocaleString()}`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '')
                    setEditedRent(Number(val) || 0)
                  }}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-lg py-3 px-4 text-base font-semibold text-white focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:bg-[rgba(0,212,255,0.05)] transition-all"
                />
              </div>

              {/* Down Payment Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-white/40">Down Payment</label>
                <input
                  type="text"
                  value={`${editedDownPayment}%`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    setEditedDownPayment(Number(val) || 0)
                  }}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-lg py-3 px-4 text-base font-semibold text-white focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:bg-[rgba(0,212,255,0.05)] transition-all"
                />
              </div>

              {/* Interest Rate Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-white/40">Interest Rate</label>
                <input
                  type="text"
                  value={`${editedInterestRate.toFixed(2)}%`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    setEditedInterestRate(Number(val) || 0)
                  }}
                  className="bg-white/[0.05] border border-white/[0.12] rounded-lg py-3 px-4 text-base font-semibold text-white focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:bg-[rgba(0,212,255,0.05)] transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-transparent border border-white/[0.12] rounded-lg text-white/60 text-sm font-semibold transition-all hover:bg-white/[0.05] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-[#00D4FF] border-none rounded-lg text-[#0A1628] text-sm font-bold transition-all hover:bg-[#00c4ec]"
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

export default DesktopIQTargetHero
