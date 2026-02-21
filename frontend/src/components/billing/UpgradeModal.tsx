'use client'

/**
 * UpgradeModal — choose Pro Monthly or Annual, create Stripe Checkout session, redirect.
 * Used from ProGate (inline/section) and from the pricing page when logged in.
 */

import React, { useState, useCallback } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { api } from '@/lib/api-client'
import { billingApi } from '@/lib/api-client'

interface PricingPlan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  is_popular?: boolean
}

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional path to return to after successful checkout (e.g. /verdict, /strategy). */
  returnTo?: string
}

export function UpgradeModal({ isOpen, onClose, returnTo }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true)
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch plans on open (public endpoint)
  React.useEffect(() => {
    if (!isOpen) return
    setError(null)
    api
      .get<{ plans: PricingPlan[] }>('/api/v1/billing/plans')
      .then((res) => setPlans(res.plans || []))
      .catch(() => setError('Could not load plans.'))
  }, [isOpen])

  const proPlan = plans.find((p) => p.id === 'pro')
  const priceMonthly = proPlan ? proPlan.price_monthly / 100 : 39
  const priceYearly = proPlan ? proPlan.price_yearly / 100 : 348
  const pricePerMonthAnnual = priceYearly / 12

  const startCheckout = useCallback(async () => {
    if (!proPlan) return
    const priceId = annual
      ? proPlan.stripe_price_id_yearly
      : proPlan.stripe_price_id_monthly
    if (!priceId) {
      setError('This plan is not available for checkout.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const successPath = '/checkout/success'
      const successQuery = returnTo
        ? `?returnTo=${encodeURIComponent(returnTo)}`
        : ''
      const successUrl = `${origin}${successPath}${successQuery}`
      const cancelUrl = `${origin}/pricing`
      const { checkout_url } = await billingApi.createCheckoutSession({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      window.location.href = checkout_url
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Checkout could not be started.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [annual, proPlan, returnTo])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: '#0d1424',
          border: '1px solid rgba(14,165,233,0.2)',
        }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
            Upgrade to Pro
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} style={{ color: '#94a3b8' }} />
          </button>
        </div>
        <p className="px-6 pb-4 text-sm" style={{ color: '#94a3b8' }}>
          7-day free trial. Cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 px-6 pb-4">
          <span
            className="text-sm font-medium transition-colors"
            style={{ color: annual ? '#64748b' : '#e2e8f0' }}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual(!annual)}
            className="relative w-12 h-6 rounded-full border border-slate-500/20 transition-colors"
            style={{
              background: annual
                ? 'linear-gradient(135deg, #0ea5e9, #06b6d4)'
                : '#1e293b',
            }}
          >
            <span
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow"
              style={{ left: annual ? 26 : 4, transition: 'left 0.2s ease' }}
            />
          </button>
          <span
            className="text-sm font-medium transition-colors"
            style={{ color: annual ? '#e2e8f0' : '#64748b' }}
          >
            Annual
          </span>
          {annual && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                color: '#fff',
              }}
            >
              Save 25%
            </span>
          )}
        </div>

        {/* Price summary */}
        <div
          className="mx-6 mb-4 rounded-lg px-4 py-3"
          style={{
            background: 'rgba(14,165,233,0.06)',
            border: '1px solid rgba(14,165,233,0.15)',
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              ${annual ? pricePerMonthAnnual : priceMonthly}
            </span>
            <span className="text-slate-400 text-sm">/month</span>
            {annual && (
              <span className="text-slate-500 text-xs ml-auto">
                ${priceYearly}/yr
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="px-6 pb-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={startCheckout}
            disabled={loading || !proPlan}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} />
                Start 7-day free trial
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
