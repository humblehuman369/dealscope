'use client'

/**
 * DealMakerPopup Component
 * 
 * Slide-up popup modal for adjusting investment terms.
 * Contains sliders for all DealMaker parameters organized by section.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { X, RotateCcw, Check, Info } from 'lucide-react'
import { SliderInput } from './SliderInput'

// Strategy type - matches VerdictIQ header options
export type PopupStrategyType = 'ltr' | 'str'

export interface DealMakerValues {
  // Common fields (LTR and STR)
  buyPrice: number
  downPayment: number
  closingCosts: number
  interestRate: number
  loanTerm: number
  rehabBudget: number
  arv: number
  propertyTaxes: number
  insurance: number
  
  // LTR-specific fields
  monthlyRent: number
  vacancyRate: number
  managementRate: number
  
  // STR-specific fields
  averageDailyRate: number
  occupancyRate: number
  cleaningFeeRevenue: number
  avgLengthOfStayDays: number
  platformFeeRate: number
  strManagementRate: number
  cleaningCostPerTurnover: number
  suppliesMonthly: number
  additionalUtilitiesMonthly: number
  furnitureSetupCost: number
}

interface DealMakerPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (values: DealMakerValues) => void
  initialValues?: Partial<DealMakerValues>
  strategyType?: PopupStrategyType
  onStrategyChange?: (strategy: PopupStrategyType) => void
}

// Default values for LTR strategy
const DEFAULT_LTR_VALUES: DealMakerValues = {
  // Common fields
  buyPrice: 350000,
  downPayment: 20,
  closingCosts: 3,
  interestRate: 6,
  loanTerm: 30,
  rehabBudget: 0,
  arv: 350000,
  propertyTaxes: 4200,
  insurance: 1800,
  // LTR-specific
  monthlyRent: 2800,
  vacancyRate: 1,
  managementRate: 0,
  // STR fields (not used for LTR, but need defaults)
  averageDailyRate: 200,
  occupancyRate: 65,
  cleaningFeeRevenue: 150,
  avgLengthOfStayDays: 3,
  platformFeeRate: 15,
  strManagementRate: 20,
  cleaningCostPerTurnover: 100,
  suppliesMonthly: 150,
  additionalUtilitiesMonthly: 200,
  furnitureSetupCost: 6000,
}

// Default values for STR strategy
const DEFAULT_STR_VALUES: DealMakerValues = {
  // Common fields
  buyPrice: 350000,
  downPayment: 20,
  closingCosts: 3,
  interestRate: 6,
  loanTerm: 30,
  rehabBudget: 0,
  arv: 350000,
  propertyTaxes: 4200,
  insurance: 2400, // Higher for STR
  // LTR fields (not used for STR, but need defaults)
  monthlyRent: 2800,
  vacancyRate: 1,
  managementRate: 0,
  // STR-specific
  averageDailyRate: 200,
  occupancyRate: 65,
  cleaningFeeRevenue: 150,
  avgLengthOfStayDays: 3,
  platformFeeRate: 15,
  strManagementRate: 20,
  cleaningCostPerTurnover: 100,
  suppliesMonthly: 150,
  additionalUtilitiesMonthly: 200,
  furnitureSetupCost: 6000,
}

// Get defaults based on strategy
function getDefaultValues(strategy: PopupStrategyType): DealMakerValues {
  return strategy === 'str' ? DEFAULT_STR_VALUES : DEFAULT_LTR_VALUES
}

// Calculate monthly mortgage payment
function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
}

// Section divider component
function SectionDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center my-5">
      <div className="flex-1 h-px bg-[#E2E8F0]" />
      <span className="px-3 text-[11px] font-bold text-[#0891B2] uppercase tracking-wide">
        {text}
      </span>
      <div className="flex-1 h-px bg-[#E2E8F0]" />
    </div>
  )
}

// Calculated field display
function CalculatedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3.5 px-4 bg-[#F8FAFC] rounded-[10px] mb-5 border border-[#E2E8F0]">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-base font-bold text-[#0891B2]">{value}</span>
    </div>
  )
}

export function DealMakerPopup({
  isOpen,
  onClose,
  onApply,
  initialValues = {},
  strategyType = 'ltr',
  onStrategyChange,
}: DealMakerPopupProps) {
  // Get defaults based on strategy
  const defaults = useMemo(() => getDefaultValues(strategyType), [strategyType])
  
  // Merge initial values with defaults
  const [values, setValues] = useState<DealMakerValues>({
    ...defaults,
    ...initialValues,
  })

  // Reset to initial values when popup opens or strategy changes
  useEffect(() => {
    if (isOpen) {
      setValues({
        ...defaults,
        ...initialValues,
      })
    }
  }, [isOpen, initialValues, defaults])

  // Calculate derived values
  const loanAmount = values.buyPrice * (1 - values.downPayment / 100)
  
  // STR-specific calculations
  const strCalculations = useMemo(() => {
    if (strategyType !== 'str') return null
    
    const nightsOccupied = Math.round(365 * (values.occupancyRate / 100))
    const turnovers = values.avgLengthOfStayDays > 0 
      ? Math.round(nightsOccupied / values.avgLengthOfStayDays) 
      : 0
    const rentalRevenue = values.averageDailyRate * nightsOccupied
    const cleaningRevenue = values.cleaningFeeRevenue * turnovers
    const annualGrossRevenue = rentalRevenue + cleaningRevenue
    const monthlyGrossRevenue = annualGrossRevenue / 12
    
    // Calculate break-even occupancy
    // Fixed monthly costs
    const monthlyMortgage = calculateMonthlyMortgage(
      values.buyPrice * (1 - values.downPayment / 100),
      values.interestRate / 100,
      values.loanTerm
    )
    const monthlyTaxes = values.propertyTaxes / 12
    const monthlyInsurance = values.insurance / 12
    const fixedMonthlyCosts = monthlyMortgage + monthlyTaxes + monthlyInsurance + values.suppliesMonthly + values.additionalUtilitiesMonthly
    
    // Variable costs per night
    const platformFeePerNight = values.averageDailyRate * (values.platformFeeRate / 100)
    const managementPerNight = values.averageDailyRate * (values.strManagementRate / 100)
    const cleaningCostPerNight = values.avgLengthOfStayDays > 0 
      ? values.cleaningCostPerTurnover / values.avgLengthOfStayDays 
      : 0
    const variableCostPerNight = platformFeePerNight + managementPerNight + cleaningCostPerNight
    
    // Net revenue per night
    const revenuePerNight = values.averageDailyRate + (values.avgLengthOfStayDays > 0 ? values.cleaningFeeRevenue / values.avgLengthOfStayDays : 0)
    const netRevenuePerNight = revenuePerNight - variableCostPerNight
    
    // Break-even nights per month
    const breakEvenNightsPerMonth = netRevenuePerNight > 0 
      ? fixedMonthlyCosts / netRevenuePerNight 
      : 999
    const breakEvenOccupancy = Math.min(100, Math.round((breakEvenNightsPerMonth / 30.4) * 100))
    
    return {
      nightsOccupied,
      turnovers,
      annualGrossRevenue,
      monthlyGrossRevenue,
      breakEvenOccupancy,
    }
  }, [strategyType, values])

  // Handle value change
  const handleChange = useCallback((field: keyof DealMakerValues, value: number) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  // Handle apply
  const handleApply = useCallback(() => {
    onApply(values)
    onClose()
  }, [values, onApply, onClose])

  // Handle reset
  const handleReset = useCallback(() => {
    setValues({
      ...defaults,
      ...initialValues,
    })
  }, [initialValues, defaults])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center animate-fadeIn"
      style={{ 
        background: 'rgba(10, 22, 40, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="w-full max-w-[480px] max-h-[90vh] bg-white rounded-t-[20px] flex flex-col animate-slideUp"
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 pb-2">
          <div className="w-10 h-1 bg-[#E2E8F0] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 100%)' }}
            >
              <svg width="20" height="20" fill="none" stroke="#00D4FF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">
                <span className="text-[#0A1628]">Deal Maker</span>
                <span className="text-[#0891B2]">IQ</span>
              </h2>
              {/* Strategy Toggle */}
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => onStrategyChange?.('ltr')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-l-md transition-colors ${
                    strategyType === 'ltr'
                      ? 'bg-[#0891B2] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  LTR
                </button>
                <button
                  onClick={() => onStrategyChange?.('str')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-r-md transition-colors ${
                    strategyType === 'str'
                      ? 'bg-[#0891B2] text-white'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  STR
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-[#F1F5F9] rounded-[10px] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0A1628] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="flex items-start gap-2.5 px-5 py-3.5 bg-[#F0FDFA] border-b border-[#E2E8F0] flex-shrink-0">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-[#0891B2]" />
          </div>
          <p className="text-[13px] text-[#0E7490] leading-relaxed">
            Adjust the sliders or tap values to edit. Changes will recalculate your deal analytics in real-time.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 overscroll-contain">
          
          {/* Purchase Terms Section */}
          <SectionDivider text="Purchase Terms" />
          
          <SliderInput
            label="Buy Price"
            value={values.buyPrice}
            min={50000}
            max={2000000}
            step={5000}
            format="currency"
            onChange={(val) => handleChange('buyPrice', val)}
          />
          
          <SliderInput
            label="Down Payment"
            value={values.downPayment}
            min={5}
            max={50}
            step={0.5}
            format="percent"
            onChange={(val) => handleChange('downPayment', val)}
          />
          
          <SliderInput
            label="Closing Costs"
            value={values.closingCosts}
            min={2}
            max={5}
            step={0.25}
            format="percent"
            onChange={(val) => handleChange('closingCosts', val)}
          />

          {/* Financing Section */}
          <SectionDivider text="Financing" />
          
          <CalculatedField 
            label="Loan Amount" 
            value={`$${loanAmount.toLocaleString()}`} 
          />
          
          <SliderInput
            label="Interest Rate"
            value={values.interestRate}
            min={5}
            max={12}
            step={0.125}
            format="percent"
            onChange={(val) => handleChange('interestRate', val)}
          />
          
          <SliderInput
            label="Loan Term"
            value={values.loanTerm}
            min={10}
            max={30}
            step={5}
            format="years"
            onChange={(val) => handleChange('loanTerm', val)}
          />

          {/* Rehab & Value Section */}
          <SectionDivider text="Rehab & Value" />
          
          <SliderInput
            label="Rehab Budget"
            value={values.rehabBudget}
            min={0}
            max={100000}
            step={1000}
            format="currency"
            onChange={(val) => handleChange('rehabBudget', val)}
          />
          
          <SliderInput
            label="ARV"
            sublabel="After Repair Value"
            value={values.arv}
            min={values.buyPrice}
            max={Math.max(700000, values.buyPrice * 1.5)}
            step={5000}
            format="currency"
            onChange={(val) => handleChange('arv', val)}
          />
          
          {/* Furniture & Setup - STR only */}
          {strategyType === 'str' && (
            <SliderInput
              label="Furniture & Setup"
              sublabel="STR furnishing costs"
              value={values.furnitureSetupCost}
              min={0}
              max={30000}
              step={1000}
              format="currency"
              onChange={(val) => handleChange('furnitureSetupCost', val)}
            />
          )}

          {/* Rental Income Section - Conditional based on strategy */}
          {strategyType === 'str' ? (
            <>
              {/* STR Income Section */}
              <SectionDivider text="STR Income" />
              
              <SliderInput
                label="Average Daily Rate"
                sublabel="ADR"
                value={values.averageDailyRate}
                min={50}
                max={1000}
                step={10}
                format="currency"
                onChange={(val) => handleChange('averageDailyRate', val)}
              />
              
              <SliderInput
                label="Occupancy Rate"
                value={values.occupancyRate}
                min={30}
                max={95}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('occupancyRate', val)}
              />
              
              <SliderInput
                label="Cleaning Fee"
                sublabel="Revenue per stay"
                value={values.cleaningFeeRevenue}
                min={0}
                max={300}
                step={25}
                format="currency"
                onChange={(val) => handleChange('cleaningFeeRevenue', val)}
              />
              
              <SliderInput
                label="Avg Length of Stay"
                value={values.avgLengthOfStayDays}
                min={1}
                max={30}
                step={1}
                format="days"
                onChange={(val) => handleChange('avgLengthOfStayDays', val)}
              />
              
              {strCalculations && (
                <CalculatedField 
                  label="Annual Gross Revenue" 
                  value={`$${strCalculations.annualGrossRevenue.toLocaleString()}`} 
                />
              )}
            </>
          ) : (
            <>
              {/* LTR Income Section */}
              <SectionDivider text="Rental Income" />
              
              <SliderInput
                label="Monthly Rent"
                value={values.monthlyRent}
                min={500}
                max={10000}
                step={50}
                format="currency"
                onChange={(val) => handleChange('monthlyRent', val)}
              />
              
              <SliderInput
                label="Vacancy Rate"
                value={values.vacancyRate}
                min={0}
                max={20}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('vacancyRate', val)}
              />
            </>
          )}

          {/* Operating Expenses Section - Conditional based on strategy */}
          {strategyType === 'str' ? (
            <>
              {/* STR Expenses Section */}
              <SectionDivider text="STR Expenses" />
              
              <SliderInput
                label="Platform Fees"
                sublabel="Airbnb/VRBO"
                value={values.platformFeeRate}
                min={10}
                max={20}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('platformFeeRate', val)}
              />
              
              <SliderInput
                label="STR Management"
                value={values.strManagementRate}
                min={0}
                max={25}
                step={1}
                format="percent-int"
                onChange={(val) => handleChange('strManagementRate', val)}
              />
              
              <SliderInput
                label="Cleaning Cost"
                sublabel="Per turnover"
                value={values.cleaningCostPerTurnover}
                min={50}
                max={400}
                step={25}
                format="currency"
                onChange={(val) => handleChange('cleaningCostPerTurnover', val)}
              />
              
              <SliderInput
                label="Supplies & Consumables"
                value={values.suppliesMonthly}
                min={0}
                max={500}
                step={25}
                format="currency-month"
                onChange={(val) => handleChange('suppliesMonthly', val)}
              />
              
              <SliderInput
                label="Additional Utilities"
                value={values.additionalUtilitiesMonthly}
                min={0}
                max={500}
                step={25}
                format="currency-month"
                onChange={(val) => handleChange('additionalUtilitiesMonthly', val)}
              />
              
              <SliderInput
                label="Property Taxes"
                value={values.propertyTaxes}
                min={0}
                max={20000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('propertyTaxes', val)}
              />
              
              <SliderInput
                label="Insurance"
                sublabel="STR coverage"
                value={values.insurance}
                min={0}
                max={12000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('insurance', val)}
              />
              
              {strCalculations && (
                <CalculatedField 
                  label="Break-Even Occupancy" 
                  value={`${strCalculations.breakEvenOccupancy}%`} 
                />
              )}
            </>
          ) : (
            <>
              {/* LTR Expenses Section */}
              <SectionDivider text="Operating Expenses" />
              
              <SliderInput
                label="Property Taxes"
                value={values.propertyTaxes}
                min={0}
                max={20000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('propertyTaxes', val)}
              />
              
              <SliderInput
                label="Insurance"
                value={values.insurance}
                min={0}
                max={10000}
                step={100}
                format="currency-year"
                onChange={(val) => handleChange('insurance', val)}
              />
              
              <SliderInput
                label="Management Rate"
                value={values.managementRate}
                min={0}
                max={15}
                step={0.5}
                format="percent-int"
                onChange={(val) => handleChange('managementRate', val)}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#E2E8F0] bg-white flex-shrink-0">
          <button 
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#64748B] text-[13px] font-medium hover:bg-[#F1F5F9] hover:text-[#0A1628] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-[#0891B2] rounded-xl text-white text-[15px] font-semibold hover:bg-[#0E7490] active:scale-[0.98] transition-all"
          >
            Apply Changes
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default DealMakerPopup
