'use client'

import type { OnboardingData } from './types'
import { EXPERIENCE_LEVELS } from './types'

interface ExperienceStepProps {
  formData: OnboardingData
  updateFormData: (field: keyof OnboardingData, value: string) => void
}

export function ExperienceStep({ formData, updateFormData }: ExperienceStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Welcome to InvestIQ! 👋
        </h1>
        <p className="text-gray-400 text-lg">
          Let&apos;s personalize your experience. What&apos;s your investment experience?
        </p>
      </div>

      {/* Name Input */}
      <div className="mb-8">
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-2">
          What should we call you?
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          autoComplete="name"
          value={formData.full_name}
          onChange={(e) => updateFormData('full_name', e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg"
        />
      </div>

      {/* Experience Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPERIENCE_LEVELS.map(level => (
          <button
            key={level.value}
            onClick={() => updateFormData('investment_experience', level.value)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.investment_experience === level.value
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-white/10 hover:border-white/20 bg-white/5'
            }`}
          >
            <span className="text-2xl mb-2 block">{level.icon}</span>
            <p className="font-semibold text-white">{level.label}</p>
            <p className="text-sm text-gray-400">{level.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
