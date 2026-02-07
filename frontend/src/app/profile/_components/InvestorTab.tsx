'use client'

import { TrendingUp, DollarSign, Save } from 'lucide-react'
import type { InvestorFormData } from './types'
import { STRATEGIES, EXPERIENCE_LEVELS, RISK_LEVELS, US_STATES } from './types'

interface InvestorTabProps {
  investorForm: InvestorFormData
  setInvestorForm: React.Dispatch<React.SetStateAction<InvestorFormData>>
  isSaving: boolean
  onSave: () => void
  onToggleStrategy: (strategyId: string) => void
  onToggleMarket: (state: string) => void
}

export function InvestorTab({
  investorForm,
  setInvestorForm,
  isSaving,
  onSave,
  onToggleStrategy,
  onToggleMarket,
}: InvestorTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-navy-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-brand-500" />
        Investor Profile
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        These preferences will customize your property analytics and recommendations.
      </p>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Investment Experience
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXPERIENCE_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => setInvestorForm(prev => ({ ...prev, investment_experience: level.value }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                investorForm.investment_experience === level.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
              }`}
            >
              <p className="font-medium text-navy-900 dark:text-white">{level.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Strategies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Preferred Investment Strategies
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STRATEGIES.map(strategy => (
            <button
              key={strategy.id}
              onClick={() => onToggleStrategy(strategy.id)}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                investorForm.preferred_strategies.includes(strategy.id)
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${strategy.color}`}></div>
              <span className="text-sm font-medium text-navy-900 dark:text-white">{strategy.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Investment Budget Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={investorForm.investment_budget_min || ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_min: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="100,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Maximum</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={investorForm.investment_budget_max || ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_max: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="500,000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Target Returns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Target Returns
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target Cash-on-Cash Return</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={investorForm.target_cash_on_cash ? (investorForm.target_cash_on_cash * 100).toFixed(1) : ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cash_on_cash: parseFloat(e.target.value) / 100 || 0 }))}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Target Cap Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={investorForm.target_cap_rate ? (investorForm.target_cap_rate * 100).toFixed(1) : ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cap_rate: parseFloat(e.target.value) / 100 || 0 }))}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-navy-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="6"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Risk Tolerance
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RISK_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => setInvestorForm(prev => ({ ...prev, risk_tolerance: level.value }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                investorForm.risk_tolerance === level.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
              }`}
            >
              <p className="font-medium text-navy-900 dark:text-white">{level.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Target Markets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Target Markets (States)
        </label>
        <div className="flex flex-wrap gap-2">
          {US_STATES.map(state => (
            <button
              key={state}
              onClick={() => onToggleMarket(state)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                investorForm.target_markets.includes(state)
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-gray-50 dark:bg-navy-700 text-gray-600 dark:text-gray-400 border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Investor Profile
        </button>
      </div>
    </div>
  )
}
