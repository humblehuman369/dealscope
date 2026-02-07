'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { getAccessToken } from '@/lib/api'
import {
  Check,
  X,
  Loader2,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Zap,
  Crown,
  Building2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { API_BASE_URL } from '@/lib/env'

// Use relative URLs to go through Next.js API routes (which proxy to backend)

interface PlanFeature {
  name: string
  description: string
  included: boolean
  limit?: string
}

interface PricingPlan {
  id: string
  name: string
  tier: string
  description: string
  price_monthly: number
  price_yearly: number
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  features: PlanFeature[]
  is_popular: boolean
  properties_limit: number
  searches_per_month: number
  api_calls_per_month: number
}

interface Subscription {
  id: string
  tier: string
  status: string
  current_period_end?: string
  cancel_at_period_end: boolean
  properties_limit: number
  searches_per_month: number
  searches_used: number
}

interface Usage {
  tier: string
  properties_saved: number
  properties_limit: number
  properties_remaining: number
  searches_used: number
  searches_limit: number
  searches_remaining: number
  days_until_reset?: number
}

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading } = useSession()
  
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check for success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: 'Subscription successful! Welcome to InvestIQ Pro.' })
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Checkout was canceled. You can try again when ready.' })
    }
  }, [searchParams])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch plans (public)
        const plansRes = await fetch(`${API_BASE_URL}/api/v1/billing/plans`)
        if (plansRes.ok) {
          const plansData = await plansRes.json()
          setPlans(plansData.plans || [])
        }

        // Fetch subscription & usage if authenticated
        if (isAuthenticated) {
          const token = getAccessToken()
          const headers = { 'Authorization': `Bearer ${token}` }

          const [subRes, usageRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/v1/billing/subscription`, { headers }),
            fetch(`${API_BASE_URL}/api/v1/billing/usage`, { headers }),
          ])

          if (subRes.ok) {
            setSubscription(await subRes.json())
          }
          if (usageRes.ok) {
            setUsage(await usageRes.json())
          }
        }
      } catch (err) {
        console.error('Error fetching billing data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchData()
    }
  }, [isAuthenticated, authLoading])

  const handleCheckout = async (priceId: string) => {
    if (!isAuthenticated) {
      router.push('/?login=true')
      return
    }

    setCheckoutLoading(priceId)
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_BASE_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/billing?success=true`,
          cancel_url: `${window.location.origin}/billing?canceled=true`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.checkout_url
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.detail || 'Failed to create checkout session' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_BASE_URL}/api/v1/billing/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.portal_url
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.detail || 'Failed to open billing portal' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setPortalLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'free': return <Sparkles className="w-6 h-6" />
      case 'starter': return <Zap className="w-6 h-6" />
      case 'pro': return <Crown className="w-6 h-6" />
      case 'enterprise': return <Building2 className="w-6 h-6" />
      default: return <Sparkles className="w-6 h-6" />
    }
  }

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'from-gray-500 to-gray-600'
      case 'starter': return 'from-brand-500 to-cyan-500'
      case 'pro': return 'from-purple-500 to-pink-500'
      case 'enterprise': return 'from-amber-500 to-orange-500'
      default: return 'from-brand-500 to-cyan-500'
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-brand-900 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Unlock powerful investment analysis tools. Start free, upgrade when ready.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full p-1.5">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-white text-navy-900 shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-white text-navy-900 shadow-lg'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`max-w-5xl mx-auto px-4 mt-6`}>
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-current opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription (if authenticated) */}
      {isAuthenticated && subscription && subscription.tier !== 'free' && (
        <div className="max-w-5xl mx-auto px-4 mt-8">
          <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-navy-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getPlanColor(subscription.tier)} text-white`}>
                    {subscription.tier.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    subscription.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {subscription.status}
                  </span>
                  {subscription.cancel_at_period_end && (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                      Cancels at period end
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                  Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </h3>
                {subscription.current_period_end && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 text-navy-900 dark:text-white rounded-xl font-medium transition-colors"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Manage Billing
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Usage Stats */}
            {usage && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-navy-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Current Usage</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-navy-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-navy-900 dark:text-white">
                      {usage.properties_saved}
                      <span className="text-sm font-normal text-gray-500">
                        /{usage.properties_limit === -1 ? '∞' : usage.properties_limit}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Properties Saved</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-navy-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-navy-900 dark:text-white">
                      {usage.searches_used}
                      <span className="text-sm font-normal text-gray-500">
                        /{usage.searches_limit === -1 ? '∞' : usage.searches_limit}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Searches This Month</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-navy-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-navy-900 dark:text-white">
                      {usage.searches_remaining === -1 ? '∞' : usage.searches_remaining}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Searches Remaining</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-navy-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-navy-900 dark:text-white">
                      {usage.days_until_reset ?? '-'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Days Until Reset</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.tier === plan.tier
            const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly
            const priceId = isYearly ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-navy-800 rounded-2xl shadow-sm border transition-all hover:shadow-lg ${
                  plan.is_popular
                    ? 'border-brand-500 ring-2 ring-brand-500/20'
                    : 'border-gray-200 dark:border-navy-700'
                } ${isCurrentPlan ? 'ring-2 ring-green-500/50' : ''}`}
              >
                {/* Popular badge */}
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Current
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Header */}
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor(plan.tier)} text-white mb-4`}>
                    {getPlanIcon(plan.tier)}
                  </div>
                  
                  <h3 className="text-xl font-bold text-navy-900 dark:text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-navy-900 dark:text-white">
                      {formatPrice(price)}
                    </span>
                    {plan.price_monthly > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">/month</span>
                    )}
                    {isYearly && plan.price_monthly > 0 && (
                      <p className="text-sm text-gray-400 mt-1">
                        Billed {formatPrice(plan.price_yearly)}/year
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  {plan.tier === 'free' ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl font-semibold bg-gray-100 dark:bg-navy-700 text-gray-500 dark:text-gray-400 cursor-default"
                    >
                      Free Forever
                    </button>
                  ) : plan.tier === 'enterprise' ? (
                    <a
                      href="mailto:sales@investiq.app?subject=Enterprise%20Inquiry"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 transition-opacity"
                    >
                      Contact Sales
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : isCurrentPlan ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full py-3 rounded-xl font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    >
                      {portalLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Manage Plan'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => priceId && handleCheckout(priceId)}
                      disabled={checkoutLoading === priceId || !priceId}
                      className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        plan.is_popular
                          ? 'bg-brand-500 hover:bg-brand-600 text-white'
                          : 'bg-navy-900 dark:bg-white hover:bg-navy-800 dark:hover:bg-gray-100 text-white dark:text-navy-900'
                      } disabled:opacity-50`}
                    >
                      {checkoutLoading === priceId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Upgrade
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Features */}
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${
                          feature.included 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {feature.name}
                          {feature.limit && (
                            <span className="text-gray-400 dark:text-gray-500"> ({feature.limit})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ or Trust Badges */}
      <div className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Cancel anytime
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-500" />
            Secure payment via Stripe
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-500" />
            Instant invoice delivery
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}

