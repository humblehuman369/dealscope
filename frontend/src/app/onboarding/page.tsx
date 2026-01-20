'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { 
  ChevronRight, ChevronLeft, Check, Sparkles, User,
  TrendingUp, Target, DollarSign, Home, Building2,
  Briefcase, Rocket, Shield, Zap, ArrowRight
} from 'lucide-react'

// Use relative URLs to go through Next.js API routes (which proxy to backend)
const API_BASE_URL = ''

// ===========================================
// Constants
// ===========================================

const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental', desc: 'Buy and hold for monthly cash flow', icon: Home, color: 'bg-blue-500' },
  { id: 'str', label: 'Short-Term Rental', desc: 'Airbnb/VRBO vacation rentals', icon: Building2, color: 'bg-purple-500' },
  { id: 'brrrr', label: 'BRRRR', desc: 'Buy, Rehab, Rent, Refinance, Repeat', icon: Rocket, color: 'bg-orange-500' },
  { id: 'flip', label: 'Fix & Flip', desc: 'Renovate and sell for profit', icon: Zap, color: 'bg-pink-500' },
  { id: 'house_hack', label: 'House Hack', desc: 'Live in one unit, rent the others', icon: Home, color: 'bg-green-500' },
  { id: 'wholesale', label: 'Wholesale', desc: 'Assign contracts for assignment fees', icon: Briefcase, color: 'bg-cyan-500' },
]

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Just Getting Started', desc: 'New to real estate investing', icon: '🌱' },
  { value: 'intermediate', label: 'Some Experience', desc: '1-5 deals completed', icon: '📈' },
  { value: 'advanced', label: 'Experienced Investor', desc: '5-20 deals under your belt', icon: '🎯' },
  { value: 'expert', label: 'Expert / Full-Time', desc: '20+ deals, investing is your business', icon: '🏆' },
]

const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Stable returns, lower risk', color: 'border-green-500 bg-green-50 dark:bg-green-900/20' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced approach', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk for higher returns', color: 'border-red-500 bg-red-50 dark:bg-red-900/20' },
]

const BUDGET_RANGES = [
  { min: 0, max: 100000, label: 'Under $100K' },
  { min: 100000, max: 250000, label: '$100K - $250K' },
  { min: 250000, max: 500000, label: '$250K - $500K' },
  { min: 500000, max: 1000000, label: '$500K - $1M' },
  { min: 1000000, max: 5000000, label: '$1M - $5M' },
  { min: 5000000, max: 999999999, label: '$5M+' },
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// ===========================================
// Types
// ===========================================

interface OnboardingData {
  full_name: string
  investment_experience: string
  preferred_strategies: string[]
  target_markets: string[]
  investment_budget_min: number
  investment_budget_max: number
  target_cash_on_cash: number
  target_cap_rate: number
  risk_tolerance: string
}

// ===========================================
// Main Component
// ===========================================

export default function OnboardingPage() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
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
  })

  // Redirect if not authenticated
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

  const totalSteps = 4

  const updateFormData = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleStrategy = (strategyId: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(strategyId)
        ? prev.preferred_strategies.filter(s => s !== strategyId)
        : [...prev.preferred_strategies, strategyId]
    }))
  }

  const toggleMarket = (state: string) => {
    setFormData(prev => ({
      ...prev,
      target_markets: prev.target_markets.includes(state)
        ? prev.target_markets.filter(s => s !== state)
        : [...prev.target_markets, state]
    }))
  }

  const selectBudgetRange = (range: typeof BUDGET_RANGES[0]) => {
    setFormData(prev => ({
      ...prev,
      investment_budget_min: range.min,
      investment_budget_max: range.max,
    }))
  }

  const saveProgress = async (step: number, completed: boolean = false): Promise<boolean> => {
    setIsSaving(true)
    if (completed) {
      setIsCompleting(true)
    }
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      // Build profile data based on current step
      let profileData: any = {}
      
      if (step >= 0) {
        profileData.investment_experience = formData.investment_experience
      }
      if (step >= 1) {
        profileData.preferred_strategies = formData.preferred_strategies
      }
      if (step >= 2) {
        profileData.investment_budget_min = formData.investment_budget_min
        profileData.investment_budget_max = formData.investment_budget_max
        profileData.target_cash_on_cash = formData.target_cash_on_cash
        profileData.target_cap_rate = formData.target_cap_rate
        profileData.risk_tolerance = formData.risk_tolerance
      }
      if (step >= 3) {
        profileData.target_markets = formData.target_markets
      }

      // Update user name if provided
      if (formData.full_name && formData.full_name !== user?.full_name) {
        const nameResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ full_name: formData.full_name }),
        })
        if (!nameResponse.ok) {
          console.warn('Failed to update name, continuing anyway')
        }
      }

      // Save onboarding progress
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me/onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: step + 1,
          completed,
          data: profileData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to save progress')
      }

      if (completed) {
        // Mark as complete
        const completeResponse = await fetch(`${API_BASE_URL}/api/v1/users/me/onboarding/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (!completeResponse.ok) {
          throw new Error('Failed to complete onboarding')
        }
        
        // AWAIT refreshUser so dashboard has updated user data
        await refreshUser()
        
        router.push('/dashboard')
        
        return true
      }
      
      return true // Success
    } catch (err) {
      console.error('Onboarding save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      return false // Failed
    } finally {
      setIsSaving(false)
    }
  }

  const nextStep = async () => {
    if (currentStep < totalSteps - 1) {
      const success = await saveProgress(currentStep)
      if (success) {
        setCurrentStep(prev => prev + 1)
      }
    } else {
      await saveProgress(currentStep, true)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const skipOnboarding = async () => {
    await saveProgress(totalSteps - 1, true)
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  // Show completion screen while redirecting
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">InvestIQ</span>
          </div>
          <button
            onClick={skipOnboarding}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Skip for now
          </button>
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
          
          {/* Step 0: Welcome & Experience */}
          {currentStep === 0 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Welcome to InvestIQ! 👋
                </h1>
                <p className="text-gray-400 text-lg">
                  Let's personalize your experience. What's your investment experience?
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
          )}

          {/* Step 1: Investment Strategies */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  What strategies interest you?
                </h1>
                <p className="text-gray-400 text-lg">
                  Select all that apply. We'll customize your analytics accordingly.
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
          )}

          {/* Step 2: Budget & Goals */}
          {currentStep === 2 && (
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
          )}

          {/* Step 3: Target Markets */}
          {currentStep === 3 && (
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
                  {['FL', 'TX', 'NC', 'AZ', 'GA', 'TN', 'OH', 'IN'].map(state => (
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
                <h3 className="text-lg font-bold text-white mb-2">You're all set!</h3>
                <p className="text-gray-300 text-sm">
                  Click "Complete Setup" to start analyzing deals with your personalized settings.
                </p>
              </div>
            </div>
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

