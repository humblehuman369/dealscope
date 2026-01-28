'use client'

/**
 * ProgressiveProfilingPrompt Component
 * 
 * Shows a single question prompt after analysis to collect profile info incrementally.
 * Part of progressive profiling flow - asks one question at a time based on analysis count.
 */

import React, { useState } from 'react'
import { X, Sparkles, Check, ChevronRight } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export type ProfileQuestion = 
  | 'experience'
  | 'strategies'
  | 'budget'
  | 'markets'

interface ProgressiveProfilingPromptProps {
  question: ProfileQuestion
  onAnswer: (answer: any) => void
  onSkip: () => void
  onClose: () => void
}

// =============================================================================
// QUESTION DATA
// =============================================================================

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Just Getting Started', desc: 'New to real estate investing', icon: '🌱' },
  { value: 'intermediate', label: 'Some Experience', desc: '1-5 deals completed', icon: '📈' },
  { value: 'advanced', label: 'Experienced Investor', desc: '5-20 deals', icon: '🎯' },
  { value: 'expert', label: 'Expert / Full-Time', desc: '20+ deals', icon: '🏆' },
]

const STRATEGY_OPTIONS = [
  { id: 'ltr', label: 'Long-Term Rental' },
  { id: 'str', label: 'Short-Term Rental' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Fix & Flip' },
  { id: 'house_hack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
]

const BUDGET_OPTIONS = [
  { min: 0, max: 100000, label: 'Under $100K' },
  { min: 100000, max: 250000, label: '$100K - $250K' },
  { min: 250000, max: 500000, label: '$250K - $500K' },
  { min: 500000, max: 1000000, label: '$500K - $1M' },
  { min: 1000000, max: 5000000, label: '$1M+' },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function ProgressiveProfilingPrompt({
  question,
  onAnswer,
  onSkip,
  onClose,
}: ProgressiveProfilingPromptProps) {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null)
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
  const [selectedBudget, setSelectedBudget] = useState<{ min: number; max: number } | null>(null)

  const getQuestionContent = () => {
    switch (question) {
      case 'experience':
        return {
          title: "What's your experience level?",
          subtitle: "We'll tailor recommendations to your needs",
          benefit: "Get personalized strategy suggestions",
          content: (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {EXPERIENCE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedExperience(option.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedExperience === option.value
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1 block">{option.icon}</span>
                  <p className="text-sm font-semibold text-slate-800">{option.label}</p>
                  <p className="text-[10px] text-slate-500">{option.desc}</p>
                </button>
              ))}
            </div>
          ),
          onSubmit: () => onAnswer({ investment_experience: selectedExperience }),
          isValid: !!selectedExperience,
        }

      case 'strategies':
        return {
          title: "What strategies interest you?",
          subtitle: "Select all that apply",
          benefit: "We'll highlight relevant scores on every analysis",
          content: (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {STRATEGY_OPTIONS.map(option => {
                const isSelected = selectedStrategies.includes(option.id)
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedStrategies(prev => 
                      isSelected 
                        ? prev.filter(s => s !== option.id)
                        : [...prev, option.id]
                    )}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-800">{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-teal-500" />}
                  </button>
                )
              })}
            </div>
          ),
          onSubmit: () => onAnswer({ preferred_strategies: selectedStrategies }),
          isValid: selectedStrategies.length > 0,
        }

      case 'budget':
        return {
          title: "What's your budget range?",
          subtitle: "Per deal investment budget",
          benefit: "Filter alerts to properties in your range",
          content: (
            <div className="grid grid-cols-1 gap-2 mt-4">
              {BUDGET_OPTIONS.map(option => {
                const isSelected = selectedBudget?.min === option.min && selectedBudget?.max === option.max
                return (
                  <button
                    key={option.label}
                    onClick={() => setSelectedBudget({ min: option.min, max: option.max })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-800">{option.label}</span>
                  </button>
                )
              })}
            </div>
          ),
          onSubmit: () => onAnswer({ 
            investment_budget_min: selectedBudget?.min,
            investment_budget_max: selectedBudget?.max,
          }),
          isValid: !!selectedBudget,
        }

      default:
        return null
    }
  }

  const questionContent = getQuestionContent()
  if (!questionContent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-teal-600">Personalize Your Experience</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {questionContent.title}
          </h2>
          <p className="text-sm text-slate-500 mb-1">
            {questionContent.subtitle}
          </p>
          <p className="text-xs text-teal-600">
            {questionContent.benefit}
          </p>

          {questionContent.content}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={onSkip}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Skip for now
            </button>
            <button
              onClick={questionContent.onSubmit}
              disabled={!questionContent.isValid}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Time estimate */}
          <p className="text-[10px] text-slate-400 text-center mt-4">
            Takes about 3 seconds
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ProgressiveProfilingPrompt
