'use client'

import { ChevronRight, ChevronLeft, Check, Sparkles, ArrowRight } from 'lucide-react'
import { useOnboarding } from './_components/useOnboarding'
import { ExperienceStep } from './_components/ExperienceStep'
import { StrategiesStep } from './_components/StrategiesStep'
import { FinancingStep } from './_components/FinancingStep'
import { GoalsStep } from './_components/GoalsStep'
import { MarketsStep } from './_components/MarketsStep'

// ===========================================
// Onboarding Page — Thin Orchestrator
// ===========================================

export default function OnboardingPage() {
  const {
    isAuthenticated,
    isLoading,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    formData,
    updateFormData,
    toggleStrategy,
    toggleMarket,
    selectBudgetRange,
    selectFinancingType,
    selectDownPayment,
    isSaving,
    isCompleting,
    error,
    valueMessage,
    valueMessageKey,
  } = useOnboarding()

  // ── Loading state ────────────────────────────

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  // ── Completing state ─────────────────────────

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
          <p className="text-gray-400">Taking you to your dashboard...</p>
          <div className="mt-4 animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">DealGapIQ</span>
          </div>
          <button
            onClick={skipOnboarding}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Skip to analyze
          </button>
        </div>
      </div>

      {/* Optional Badge */}
      <div className="px-6 pb-2">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-medium">
            <Check className="w-3 h-3" />
            Optional — analyze properties anytime
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  i <= currentStep ? 'bg-brand-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-2">Step {currentStep + 1} of {totalSteps}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Value Message Toast */}
          {valueMessage && (
            <div
              key={valueMessageKey}
              className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500/20 border border-brand-500/30 animate-fade-in"
            >
              <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <p className="text-sm text-brand-300">{valueMessage}</p>
            </div>
          )}

          {/* Step content */}
          {currentStep === 0 && (
            <ExperienceStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 1 && (
            <StrategiesStep formData={formData} toggleStrategy={toggleStrategy} />
          )}
          {currentStep === 2 && (
            <FinancingStep
              formData={formData}
              selectFinancingType={selectFinancingType}
              selectDownPayment={selectDownPayment}
            />
          )}
          {currentStep === 3 && (
            <GoalsStep
              formData={formData}
              updateFormData={updateFormData}
              selectBudgetRange={selectBudgetRange}
            />
          )}
          {currentStep === 4 && (
            <MarketsStep formData={formData} toggleMarket={toggleMarket} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentStep === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={nextStep}
            disabled={
              isSaving ||
              (currentStep === 0 && !formData.investment_experience) ||
              (currentStep === 1 && formData.preferred_strategies.length === 0)
            }
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : currentStep === totalSteps - 1 ? (
              <>
                Complete Setup
                <Check className="w-5 h-5" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
