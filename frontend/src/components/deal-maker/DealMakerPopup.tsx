'use client'

/**
 * DealMakerPopup Component
 * 
 * Slide-up popup modal for adjusting investment terms.
 * Contains sliders for all DealMaker parameters organized by section.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { X, RotateCcw, Check, Info } from 'lucide-react'
import { SliderInput } from './SliderInput'

export interface DealMakerValues {
  buyPrice: number
  downPayment: number
  closingCosts: number
  interestRate: number
  loanTerm: number
  rehabBudget: number
  arv: number
  monthlyRent: number
  vacancyRate: number
  propertyTaxes: number
  insurance: number
  managementRate: number
}

interface DealMakerPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (values: DealMakerValues) => void
  initialValues?: Partial<DealMakerValues>
}

// Default values
const DEFAULT_VALUES: DealMakerValues = {
  buyPrice: 350000,
  downPayment: 20,
  closingCosts: 3,
  interestRate: 6,
  loanTerm: 30,
  rehabBudget: 0,
  arv: 350000,
  monthlyRent: 2800,
  vacancyRate: 1,
  propertyTaxes: 4200,
  insurance: 1800,
  managementRate: 0,
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
}: DealMakerPopupProps) {
  // Merge initial values with defaults
  const [values, setValues] = useState<DealMakerValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  })

  // Reset to initial values when popup opens
  useEffect(() => {
    if (isOpen) {
      setValues({
        ...DEFAULT_VALUES,
        ...initialValues,
      })
    }
  }, [isOpen, initialValues])

  // Calculate derived values
  const loanAmount = values.buyPrice * (1 - values.downPayment / 100)

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
      ...DEFAULT_VALUES,
      ...initialValues,
    })
  }, [initialValues])

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
              <p className="text-xs text-[#64748B] mt-0.5">Customize your investment terms</p>
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

          {/* Rental Income Section */}
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

          {/* Operating Expenses Section */}
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
