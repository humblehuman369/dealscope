'use client'

import { Check } from 'lucide-react'
import type { OnboardingData, FinancingType } from './types'
import { FINANCING_TYPES, DOWN_PAYMENT_OPTIONS } from './types'

interface FinancingStepProps {
  formData: OnboardingData
  selectFinancingType: (financing: FinancingType) => void
  selectDownPayment: (pct: number) => void
}

export function FinancingStep({ formData, selectFinancingType, selectDownPayment }: FinancingStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Your Financing Terms
        </h1>
        <p className="text-gray-400 text-lg">
          How do you typically finance deals? We&apos;ll use this for all analyses.
        </p>
      </div>

      {/* Financing Type */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Financing Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FINANCING_TYPES.map(financing => {
            const isSelected = formData.financing_type === financing.id

            return (
              <button
                key={financing.id}
                onClick={() => selectFinancingType(financing)}
                className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <span className="text-2xl">{financing.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{financing.label}</p>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{financing.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Down Payment */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Default Down Payment
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {DOWN_PAYMENT_OPTIONS.map(option => {
            const isSelected = Math.abs(formData.down_payment_pct - option.value) < 0.001

            return (
              <button
                key={option.label}
                onClick={() => selectDownPayment(option.value)}
                className={`px-3 py-2.5 rounded-lg border transition-all text-center ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                <div className="font-semibold">{option.label}</div>
                <div className="text-xs text-gray-500">{option.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4">
        <p className="text-sm text-brand-300">
          <strong>How this is used:</strong> Your breakeven price and target buy price are calculated using these terms.
          You can customize these in detail anytime in your Dashboard settings.
        </p>
      </div>
    </div>
  )
}
