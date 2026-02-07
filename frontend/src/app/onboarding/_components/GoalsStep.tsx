'use client'

import { DollarSign, Target, TrendingUp, Shield } from 'lucide-react'
import type { OnboardingData, BudgetRange } from './types'
import { BUDGET_RANGES, RISK_LEVELS } from './types'

interface GoalsStepProps {
  formData: OnboardingData
  updateFormData: (field: keyof OnboardingData, value: number | string) => void
  selectBudgetRange: (range: BudgetRange) => void
}

export function GoalsStep({ formData, updateFormData, selectBudgetRange }: GoalsStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Investment Goals
        </h1>
        <p className="text-gray-400 text-lg">
          Set your budget range and return targets.
        </p>
      </div>

      {/* Budget Range */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Investment Budget per Deal
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUDGET_RANGES.map(range => {
            const isSelected = formData.investment_budget_min === range.min && formData.investment_budget_max === range.max

            return (
              <button
                key={range.label}
                onClick={() => selectBudgetRange(range)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Return Targets */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label htmlFor="target_coc" className="block text-sm font-medium text-gray-300 mb-2">
            <Target className="w-4 h-4 inline mr-1" />
            Target Cash-on-Cash
          </label>
          <div className="relative">
            <input
              type="number"
              id="target_coc"
              name="target_coc"
              step="1"
              min="0"
              max="50"
              value={(formData.target_cash_on_cash * 100).toFixed(0)}
              onChange={(e) => updateFormData('target_cash_on_cash', parseFloat(e.target.value) / 100)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
          </div>
        </div>
        <div>
          <label htmlFor="target_cap" className="block text-sm font-medium text-gray-300 mb-2">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Target Cap Rate
          </label>
          <div className="relative">
            <input
              type="number"
              id="target_cap"
              name="target_cap"
              step="1"
              min="0"
              max="20"
              value={(formData.target_cap_rate * 100).toFixed(0)}
              onChange={(e) => updateFormData('target_cap_rate', parseFloat(e.target.value) / 100)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
          </div>
        </div>
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          <Shield className="w-4 h-4 inline mr-1" />
          Risk Tolerance
        </label>
        <div className="grid grid-cols-3 gap-3">
          {RISK_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => updateFormData('risk_tolerance', level.value)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                formData.risk_tolerance === level.value
                  ? level.color + ' border-2'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <p className={`font-semibold ${formData.risk_tolerance === level.value ? 'text-white' : 'text-gray-300'}`}>
                {level.label}
              </p>
              <p className="text-xs text-gray-400 mt-1">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
