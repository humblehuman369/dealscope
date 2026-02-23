'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api-client'
import {
  Check,
  X,
  Loader2,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Crown,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { billingApi } from '@/lib/api-client'
import { AuthGuard } from '@/components/auth/AuthGuard'

interface Subscription {
  id: string
  tier: string
  status: string
  current_period_end?: string
  cancel_at_period_end: boolean
  trial_start?: string
  trial_end?: string
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
  const { isAuthenticated, isLoading: authLoading } = useSession()
  const { isPro, isTrialing, tier } = useSubscription()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: 'Subscription successful! Welcome to DealGapIQ Pro.' })
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Checkout was canceled. You can try again when ready.' })
    }
  }, [searchParams])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isAuthenticated) {
          const [subData, usageData] = await Promise.all([
            api.get<Subscription>('/api/v1/billing/subscription'),
            api.get<Usage>('/api/v1/billing/usage'),
          ])
          setSubscription(subData)
          setUsage(usageData)
        }
      } catch (err) {
        console.error('Error fetching billing data:', err)
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading) fetchData()
  }, [isAuthenticated, authLoading])

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    setMessage(null)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { checkout_url } = await billingApi.createCheckoutSession({
        success_url: `${origin}/billing?success=true`,
        cancel_url: `${origin}/billing?canceled=true`,
      })
      window.location.href = checkout_url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start checkout. Please try again.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const data = await api.post<{ portal_url: string }>('/api/v1/billing/portal')
      window.location.href = data.portal_url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open billing portal'
      setMessage({ type: 'error', text: msg })
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B1120', color: '#E2E8F0' }}>
      {/* Header */}
      <div className="py-12 px-4 text-center" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
        <h1 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
          Billing & Subscription
        </h1>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          Manage your DealGapIQ plan and usage
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-900/20 text-green-400 border border-green-800'
              : 'bg-red-900/20 text-red-400 border border-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm">{message.text}</p>
            <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Current Plan Card */}
        <div
          style={{
            background: '#0D1424',
            border: `1px solid ${isPro ? 'rgba(14,165,233,0.2)' : 'rgba(148,163,184,0.08)'}`,
            borderRadius: '12px',
            padding: '28px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: isPro
                    ? 'linear-gradient(135deg, #0EA5E9, #0284C7)'
                    : 'rgba(148,163,184,0.1)',
                }}
              >
                {isPro ? <Crown className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-slate-400" />}
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {isPro ? 'Pro Investor' : 'Starter'}
                </div>
                <div className="text-xs" style={{ color: '#64748B' }}>
                  {isPro ? (
                    isTrialing ? 'Trialing — 7-day free trial' : '$29/mo billed annually'
                  ) : (
                    'Free forever'
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: subscription?.status === 'active' || subscription?.status === 'trialing'
                    ? 'rgba(34,197,94,0.1)'
                    : 'rgba(239,68,68,0.1)',
                  color: subscription?.status === 'active' || subscription?.status === 'trialing'
                    ? '#22C55E'
                    : '#EF4444',
                }}
              >
                {subscription?.status === 'trialing' ? 'Trial' : (subscription?.status || 'active').charAt(0).toUpperCase() + (subscription?.status || 'active').slice(1)}
              </span>
              {subscription?.cancel_at_period_end && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                  Cancels at period end
                </span>
              )}
            </div>
          </div>

          {/* Trial end / renewal info */}
          {isPro && subscription?.trial_end && isTrialing && (
            <div className="text-xs mb-2" style={{ color: '#64748B' }}>
              Trial ends {new Date(subscription.trial_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          {isPro && subscription?.current_period_end && (
            <div className="text-xs mb-4" style={{ color: '#64748B' }}>
              {subscription.cancel_at_period_end ? 'Access until' : 'Renews'}{' '}
              {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          )}

          {/* Usage Stats */}
          {usage && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div style={{ background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(148,163,184,0.04)', borderRadius: '8px', padding: '14px' }}>
                <div className="text-xl font-bold text-white">
                  {usage.properties_saved}
                  <span className="text-xs font-normal" style={{ color: '#64748B' }}>
                    /{usage.properties_limit === -1 ? '∞' : usage.properties_limit}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#64748B' }}>Properties</div>
              </div>
              <div style={{ background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(148,163,184,0.04)', borderRadius: '8px', padding: '14px' }}>
                <div className="text-xl font-bold text-white">
                  {usage.searches_used}
                  <span className="text-xs font-normal" style={{ color: '#64748B' }}>
                    /{usage.searches_limit === -1 ? '∞' : usage.searches_limit}
                  </span>
                </div>
                <div className="text-xs" style={{ color: '#64748B' }}>Analyses</div>
              </div>
              <div style={{ background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(148,163,184,0.04)', borderRadius: '8px', padding: '14px' }}>
                <div className="text-xl font-bold text-white">
                  {usage.days_until_reset ?? '—'}
                </div>
                <div className="text-xs" style={{ color: '#64748B' }}>Days to reset</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isPro ? (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)', color: '#CBD5E1' }}
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Manage Subscription
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}
              >
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Upgrade to Pro
                <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
            )}
          </div>
        </div>

        {/* What's included */}
        <div
          style={{
            background: '#0D1424',
            border: '1px solid rgba(148,163,184,0.06)',
            borderRadius: '12px',
            padding: '28px',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isPro ? 'Pro Investor Features' : 'Starter Features'}
          </h3>
          <div className="space-y-3">
            {(isPro ? [
              'Unlimited property analyses',
              'Deal Gap + Income Value + Target Buy',
              'IQ Verdict score (Pass / Marginal / Buy)',
              'All 6 strategy models — full detail',
              'Seller Motivation indicator',
              'Full calculation breakdown',
              'Editable inputs & stress testing',
              'Comparable rental data sources',
              'Downloadable Excel proforma',
              'DealVaultIQ pipeline & tracking',
              'Lender-ready PDF reports',
              'Side-by-side deal comparison',
            ] : [
              '5 property analyses per month',
              'Deal Gap + Income Value + Target Buy',
              'IQ Verdict score (Pass / Marginal / Buy)',
              'All 6 strategy snapshots',
              'Seller Motivation indicator',
            ]).map((feature, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#0EA5E9' }} />
                <span className="text-sm" style={{ color: '#CBD5E1' }}>{feature}</span>
              </div>
            ))}
          </div>

          {!isPro && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
              <p className="text-xs mb-3" style={{ color: '#64748B' }}>Upgrade to unlock:</p>
              <div className="space-y-2">
                {[
                  'Full calculation breakdown',
                  'Editable inputs & stress testing',
                  'Downloadable Excel proforma',
                  'Lender-ready PDF reports',
                  'Side-by-side deal comparison',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5 opacity-50">
                    <X className="w-4 h-4 flex-shrink-0" style={{ color: '#475569' }} />
                    <span className="text-sm" style={{ color: '#475569' }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs" style={{ color: '#475569' }}>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-green-500" />
            Cancel anytime
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-sky-500" />
            Secured by Stripe
          </div>
          <div className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-purple-500" />
            Instant invoices
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </div>
      }>
        <BillingContent />
      </Suspense>
    </AuthGuard>
  )
}
