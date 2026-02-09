'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useRefreshUser } from '@/hooks/useSession'
import { apiRequest } from '@/lib/api-client'
import type { OnboardingData, FinancingType } from './types'
import { TOTAL_STEPS } from './types'

// ===========================================
// Value messages — contextual feedback per input
// ===========================================

const VALUE_MESSAGES = {
  experience: {
    beginner: "We'll show more educational context in your analyses.",
    intermediate: "We'll tailor recommendations to your growing expertise.",
    advanced: "You'll see advanced metrics and pro-level insights.",
    expert: "Full access to all professional tools and detailed analytics.",
  },
  strategy: {
    ltr: "Long-Term Rental scores will be highlighted on every analysis.",
    str: "We'll show ADR and occupancy projections for vacation rentals.",
    brrrr: "BRRRR metrics like equity capture will be front and center.",
    flip: "We'll calculate rehab ROI and flip profit margins for you.",
    house_hack: "House Hack savings and owner-occupant benefits will be featured.",
    wholesale: "Assignment fee estimates will appear on qualifying deals.",
  },
  budget: "Filtering deal alerts to properties in your budget range.",
  risk: {
    conservative: "We'll prioritize stable, lower-risk investment opportunities.",
    moderate: "You'll see a balanced mix of risk and reward options.",
    aggressive: "We'll surface high-upside opportunities that match your appetite.",
  },
  market: (state: string) => `You'll get alerts when new deals appear in ${state}.`,
  financing: {
    conventional: "Calculations will use standard 20% down with PMI if lower.",
    fha: "FHA terms with 3.5% down and MIP will be applied.",
    va: "VA loan terms with zero down payment will be used.",
    cash: "All-cash analysis with no financing costs.",
    hard_money: "Short-term hard money rates will be used for flip/BRRRR.",
  },
  downPayment: (pct: number) => `Your breakeven prices will reflect ${(pct * 100).toFixed(1)}% down.`,
} as const

// ===========================================
// useOnboarding — owns all onboarding state & logic
// ===========================================

export function useOnboarding() {
  const { user, isAuthenticated, isLoading } = useSession()
  const refreshUser = useRefreshUser()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<OnboardingData>({
    full_name: '',
    investment_experience: '',
    preferred_strategies: [],
    target_markets: [],
    investment_budget_min: 0,
    investment_budget_max: 500000,
    target_cash_on_cash: 0.08,
    target_cap_rate: 0.06,
    risk_tolerance: 'moderate',
    financing_type: 'conventional',
    down_payment_pct: 0.20,
  })

  // Value messaging state
  const [valueMessage, setValueMessage] = useState<string | null>(null)
  const [valueMessageKey, setValueMessageKey] = useState(0)

  const showValueMessage = (message: string) => {
    setValueMessage(message)
    setValueMessageKey(prev => prev + 1)
    setTimeout(() => setValueMessage(null), 4000)
  }

  // ── Auth redirect ────────────────────────────

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  // Initialize with user data
  useEffect(() => {
    if (user?.full_name) {
      setFormData(prev => ({ ...prev, full_name: user.full_name || '' }))
    }
  }, [user])

  // ── Form updaters ────────────────────────────

  const updateFormData = (field: keyof OnboardingData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (field === 'investment_experience' && typeof value === 'string' && value in VALUE_MESSAGES.experience) {
      showValueMessage(VALUE_MESSAGES.experience[value as keyof typeof VALUE_MESSAGES.experience])
    }

    if (field === 'risk_tolerance' && typeof value === 'string' && value in VALUE_MESSAGES.risk) {
      showValueMessage(VALUE_MESSAGES.risk[value as keyof typeof VALUE_MESSAGES.risk])
    }
  }

  const toggleStrategy = (strategyId: string) => {
    const isAdding = !formData.preferred_strategies.includes(strategyId)
    setFormData(prev => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(strategyId)
        ? prev.preferred_strategies.filter(s => s !== strategyId)
        : [...prev.preferred_strategies, strategyId],
    }))

    if (isAdding && strategyId in VALUE_MESSAGES.strategy) {
      showValueMessage(VALUE_MESSAGES.strategy[strategyId as keyof typeof VALUE_MESSAGES.strategy])
    }
  }

  const toggleMarket = (state: string) => {
    const isAdding = !formData.target_markets.includes(state)
    setFormData(prev => ({
      ...prev,
      target_markets: prev.target_markets.includes(state)
        ? prev.target_markets.filter(s => s !== state)
        : [...prev.target_markets, state],
    }))

    if (isAdding) {
      showValueMessage(VALUE_MESSAGES.market(state))
    }
  }

  const selectBudgetRange = (range: { min: number; max: number }) => {
    setFormData(prev => ({
      ...prev,
      investment_budget_min: range.min,
      investment_budget_max: range.max,
    }))
    showValueMessage(VALUE_MESSAGES.budget)
  }

  const selectFinancingType = (financing: FinancingType) => {
    setFormData(prev => ({
      ...prev,
      financing_type: financing.id,
      down_payment_pct: financing.defaultDownPayment,
    }))
    if (financing.id in VALUE_MESSAGES.financing) {
      showValueMessage(VALUE_MESSAGES.financing[financing.id as keyof typeof VALUE_MESSAGES.financing])
    }
  }

  const selectDownPayment = (pct: number) => {
    setFormData(prev => ({ ...prev, down_payment_pct: pct }))
    showValueMessage(VALUE_MESSAGES.downPayment(pct))
  }

  // ── Save & navigation ───────────────────────

  const saveProgress = async (step: number, completed: boolean = false): Promise<boolean> => {
    setIsSaving(true)
    if (completed) setIsCompleting(true)
    setError(null)

    try {
      // Build profile data based on current step
      const profileData: Record<string, unknown> = {}

      if (step >= 0) profileData.investment_experience = formData.investment_experience
      if (step >= 1) profileData.preferred_strategies = formData.preferred_strategies
      if (step >= 2) {
        profileData.default_assumptions = {
          financing: { down_payment_pct: formData.down_payment_pct },
        }
      }
      if (step >= 3) {
        profileData.investment_budget_min = formData.investment_budget_min
        profileData.investment_budget_max = formData.investment_budget_max
        profileData.target_cash_on_cash = formData.target_cash_on_cash
        profileData.target_cap_rate = formData.target_cap_rate
        profileData.risk_tolerance = formData.risk_tolerance
      }
      if (step >= 4) profileData.target_markets = formData.target_markets

      // Update user name if changed
      if (formData.full_name && formData.full_name !== user?.full_name) {
        try {
          await apiRequest('/api/v1/users/me', {
            method: 'PATCH',
            body: { full_name: formData.full_name },
          })
        } catch {
          console.warn('Failed to update name, continuing anyway')
        }
      }

      // Save onboarding progress
      await apiRequest('/api/v1/users/me/onboarding', {
        method: 'POST',
        body: { step: step + 1, completed, data: profileData },
      })

      if (completed) {
        await apiRequest('/api/v1/users/me/onboarding/complete', { method: 'POST' })
        await refreshUser()
        router.push('/search')
        return true
      }

      return true
    } catch (err) {
      console.error('Onboarding save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const nextStep = async () => {
    if (currentStep < TOTAL_STEPS - 1) {
      const success = await saveProgress(currentStep)
      if (success) setCurrentStep(prev => prev + 1)
    } else {
      await saveProgress(currentStep, true)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const skipOnboarding = async () => {
    await saveProgress(TOTAL_STEPS - 1, true)
  }

  return {
    // Auth / loading
    user,
    isAuthenticated,
    isLoading,

    // Step navigation
    currentStep,
    totalSteps: TOTAL_STEPS,
    nextStep,
    prevStep,
    skipOnboarding,

    // Form data
    formData,
    updateFormData,
    toggleStrategy,
    toggleMarket,
    selectBudgetRange,
    selectFinancingType,
    selectDownPayment,

    // Status
    isSaving,
    isCompleting,
    error,

    // Value messaging
    valueMessage,
    valueMessageKey,
  }
}
