'use client'

import { TrendingUp, DollarSign, Save } from 'lucide-react'
import type { InvestorFormData } from './types'
import { STRATEGIES, EXPERIENCE_LEVELS, RISK_LEVELS, US_STATES } from './types'

// ===========================================
// Investor Tab — Dark Fintech Theme
// ===========================================
// Financial data uses font-weight 600 + tabular-nums for column alignment
// Sky-400 for primary selections, semantic colors for strategy dots
// Selection cards use subtle sky-400 glow borders
// ===========================================

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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-400" />
          Investor Profile
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          These preferences will customize your property analytics and recommendations.
        </p>
      </div>

      {/* ── Experience Level ────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Investment Experience
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXPERIENCE_LEVELS.map(level => {
            const isSelected = investorForm.investment_experience === level.value
            return (
              <button
                key={level.value}
                onClick={() => setInvestorForm(prev => ({ ...prev, investment_experience: level.value }))}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-sky-400/50 bg-sky-400/[0.08] shadow-[0_0_12px_rgba(56,189,248,0.06)]'
                    : 'border-white/[0.07] hover:border-white/[0.14]'
                }`}
              >
                <p className={`font-semibold ${isSelected ? 'text-sky-400' : 'text-slate-100'}`}>
                  {level.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">{level.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Preferred Strategies ─────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Preferred Investment Strategies
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STRATEGIES.map(strategy => {
            const isSelected = investorForm.preferred_strategies.includes(strategy.id)
            return (
              <button
                key={strategy.id}
                onClick={() => onToggleStrategy(strategy.id)}
                className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                  isSelected
                    ? 'border-sky-400/50 bg-sky-400/[0.08]'
                    : 'border-white/[0.07] hover:border-white/[0.14]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${strategy.color}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                  {strategy.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Budget Range ─────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Investment Budget Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Minimum</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                value={investorForm.investment_budget_min || ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_min: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 font-semibold tabular-nums placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
                placeholder="100,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Maximum</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="number"
                value={investorForm.investment_budget_max || ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, investment_budget_max: parseFloat(e.target.value) || 0 }))}
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-slate-100 font-semibold tabular-nums placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
                placeholder="500,000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Target Returns ───────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Target Returns
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Target Cash-on-Cash Return</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={investorForm.target_cash_on_cash ? (investorForm.target_cash_on_cash * 100).toFixed(1) : ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cash_on_cash: parseFloat(e.target.value) / 100 || 0 }))}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-emerald-400 font-semibold tabular-nums placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
                placeholder="8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Target Cap Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={investorForm.target_cap_rate ? (investorForm.target_cap_rate * 100).toFixed(1) : ''}
                onChange={(e) => setInvestorForm(prev => ({ ...prev, target_cap_rate: parseFloat(e.target.value) / 100 || 0 }))}
                className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg text-emerald-400 font-semibold tabular-nums placeholder:text-slate-600 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400/30 transition-colors"
                placeholder="6"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Risk Tolerance ───────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Risk Tolerance
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {RISK_LEVELS.map(level => {
            const isSelected = investorForm.risk_tolerance === level.value
            // Semantic color per risk level: conservative=teal, moderate=amber, aggressive=red
            const accentMap: Record<string, { border: string; bg: string; text: string }> = {
              conservative: { border: 'border-teal-400/50', bg: 'bg-teal-400/[0.08]', text: 'text-teal-400' },
              moderate: { border: 'border-amber-400/50', bg: 'bg-amber-400/[0.08]', text: 'text-amber-400' },
              aggressive: { border: 'border-red-400/50', bg: 'bg-red-400/[0.08]', text: 'text-red-400' },
            }
            const accent = accentMap[level.value] || { border: 'border-sky-400/50', bg: 'bg-sky-400/[0.08]', text: 'text-sky-400' }

            return (
              <button
                key={level.value}
                onClick={() => setInvestorForm(prev => ({ ...prev, risk_tolerance: level.value }))}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? `${accent.border} ${accent.bg}`
                    : 'border-white/[0.07] hover:border-white/[0.14]'
                }`}
              >
                <p className={`font-semibold ${isSelected ? accent.text : 'text-slate-100'}`}>
                  {level.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">{level.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Target Markets ───────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Target Markets <span className="text-slate-500">(States)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {US_STATES.map(state => {
            const isSelected = investorForm.target_markets.includes(state)
            return (
              <button
                key={state}
                onClick={() => onToggleMarket(state)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all font-medium ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.12)]'
                    : 'bg-white/[0.03] text-slate-400 border-white/[0.07] hover:text-slate-300 hover:border-white/[0.14]'
                }`}
              >
                {state}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Save ─────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-sky-500 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Investor Profile
        </button>
      </div>
    </div>
  )
}
