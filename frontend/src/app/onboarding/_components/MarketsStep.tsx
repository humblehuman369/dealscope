'use client'

import { Sparkles } from 'lucide-react'
import type { OnboardingData } from './types'
import { US_STATES, POPULAR_MARKETS } from './types'

interface MarketsStepProps {
  formData: OnboardingData
  toggleMarket: (state: string) => void
}

export function MarketsStep({ formData, toggleMarket }: MarketsStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Where do you want to invest?
        </h1>
        <p className="text-gray-400 text-lg">
          Select your target markets. You can always change this later.
        </p>
      </div>

      {/* Popular Markets */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-3">Popular markets:</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_MARKETS.map(state => (
            <button
              key={state}
              onClick={() => toggleMarket(state)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                formData.target_markets.includes(state)
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* All States */}
      <div className="bg-white/5 rounded-xl p-4 max-h-64 overflow-y-auto">
        <p className="text-sm text-gray-400 mb-3">All states:</p>
        <div className="flex flex-wrap gap-1.5">
          {US_STATES.map(state => (
            <button
              key={state}
              onClick={() => toggleMarket(state)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                formData.target_markets.includes(state)
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {formData.target_markets.length > 0 && (
        <p className="text-center text-brand-400 mt-4 text-sm">
          {formData.target_markets.length} state{formData.target_markets.length !== 1 ? 's' : ''} selected
        </p>
      )}

      {/* Ready Message */}
      <div className="mt-8 p-6 bg-gradient-to-r from-brand-500/20 to-cyan-500/20 rounded-xl border border-brand-500/30 text-center">
        <Sparkles className="w-8 h-8 text-brand-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">You&apos;re all set!</h3>
        <p className="text-gray-300 text-sm">
          Click &quot;Complete Setup&quot; to start analyzing deals with your personalized settings.
        </p>
      </div>
    </div>
  )
}
