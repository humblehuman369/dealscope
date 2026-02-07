'use client'

import { Check } from 'lucide-react'
import type { OnboardingData } from './types'
import { STRATEGIES } from './types'

interface StrategiesStepProps {
  formData: OnboardingData
  toggleStrategy: (strategyId: string) => void
}

export function StrategiesStep({ formData, toggleStrategy }: StrategiesStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          What strategies interest you?
        </h1>
        <p className="text-gray-400 text-lg">
          Select all that apply. We&apos;ll customize your analytics accordingly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STRATEGIES.map(strategy => {
          const Icon = strategy.icon
          const isSelected = formData.preferred_strategies.includes(strategy.id)

          return (
            <button
              key={strategy.id}
              onClick={() => toggleStrategy(strategy.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                isSelected
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/5'
              }`}
            >
              <div className={`p-2 rounded-lg ${strategy.color}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{strategy.label}</p>
                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-400" />
                  )}
                </div>
                <p className="text-sm text-gray-400">{strategy.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {formData.preferred_strategies.length === 0 && (
        <p className="text-center text-gray-500 mt-4 text-sm">
          Select at least one strategy to continue
        </p>
      )}
    </div>
  )
}
