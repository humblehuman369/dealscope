'use client'

/**
 * UpgradeModal — choose Pro Monthly or Annual.
 *
 * Web:       Stripe Checkout redirect.
 * Capacitor: RevenueCat in-app purchase via StoreKit / Google Play Billing.
 */

import React, { useState, useCallback } from 'react'
import { X, Loader2, Check, RotateCcw, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api-client'
import { billingApi } from '@/lib/api-client'
import { trackEvent } from '@/lib/eventTracking'
import { IS_CAPACITOR } from '@/lib/env'
import { useRevenueCat, type RCPackage } from '@/hooks/useRevenueCat'
import { PriceCents } from '@/components/ui/PriceCents'

const FALLBACK_PRICE_MONTHLY = '$39.99'
const FALLBACK_PRICE_ANNUAL = '$349.99'

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

function pickRCPackage(packages: RCPackage[], annual: boolean): RCPackage | undefined {
  const targetType = annual ? 'ANNUAL' : 'MONTHLY'
  return (
    packages.find((p) => p.packageType === targetType) ??
    packages.find((p) =>
      annual
        ? p.identifier.toLowerCase().includes('annual')
        : p.identifier.toLowerCase().includes('monthly'),
    )
  )
}

export function UpgradeModal({ isOpen, onClose, returnTo }: UpgradeModalProps) {
  const [annual, setAnnual] = useState(true)
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [error, setError] = useState<string | null>(null)

  const rc = useRevenueCat()

  // Fetch Stripe plans on open (web only)
  React.useEffect(() => {
    if (!isOpen || IS_CAPACITOR) return
    setError(null)
    api
      .get<{ plans: PricingPlan[] }>('/api/v1/billing/plans')
      .then((res) => setPlans(res.plans || []))
      .catch(() => setError('Could not load plans.'))
  }, [isOpen])

  // --- Pricing from RevenueCat or Stripe ---
  const rcPkgMonthly = IS_CAPACITOR ? pickRCPackage(rc.packages, false) : undefined
  const rcPkgAnnual = IS_CAPACITOR ? pickRCPackage(rc.packages, true) : undefined
  const rcPkg = annual ? rcPkgAnnual : rcPkgMonthly
  const proPlan = plans.find((p) => p.id === 'pro')

  const rcLoading = IS_CAPACITOR && !rc.ready

  // IAP failed to initialize: no package for the selected plan AND an error
  // was surfaced. Swap the purchase CTA for a retry affordance so reviewers
  // and real users never see a dead button. We intentionally ignore
  // `rc.ready` here so the retry UI stays in place during an in-flight retry.
  const iapUnavailable = IS_CAPACITOR && !rcPkg && !!rc.error

  const displayPriceMonthly = IS_CAPACITOR
    ? (rcPkgMonthly?.product.priceString ?? FALLBACK_PRICE_MONTHLY)
    : `$${proPlan ? proPlan.price_monthly / 100 : 39.99}`
  const displayPriceAnnual = IS_CAPACITOR
    ? (rcPkgAnnual?.product.priceString ?? FALLBACK_PRICE_ANNUAL)
    : `$${proPlan ? proPlan.price_yearly / 100 : 349.99}`

  const startCheckout = useCallback(async () => {
    if (IS_CAPACITOR) {
      if (!rcPkg) return
      trackEvent('checkout_started', { source: 'upgrade_modal', plan: annual ? 'yearly' : 'monthly', platform: 'capacitor' })
      const success = await rc.purchase(rcPkg.identifier)
      if (success) onClose()
      return
    }

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
      trackEvent('checkout_started', { source: 'upgrade_modal', plan: annual ? 'yearly' : 'monthly' })
      window.location.href = checkout_url
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Checkout could not be started.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [annual, proPlan, returnTo, rcPkg, rc, onClose])

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
          backgroundColor: 'var(--surface-card)',
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
                ? 'linear-gradient(135deg, #0ea5e9, #0EA5E9)'
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
                background: 'linear-gradient(135deg, #0ea5e9, #0EA5E9)',
                color: '#fff',
              }}
            >
              Save 27%
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
            {rcLoading ? (
              <span className="inline-block h-7 w-24 rounded bg-white/10 animate-pulse" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {IS_CAPACITOR
                  ? <PriceCents>{annual ? displayPriceAnnual : displayPriceMonthly}</PriceCents>
                  : <PriceCents>{`$${annual ? (proPlan ? ((proPlan.price_yearly / 100) / 12).toFixed(2) : '29.17') : (proPlan ? proPlan.price_monthly / 100 : 39.99)}`}</PriceCents>}
              </span>
            )}
            <span className="text-slate-400 text-sm">
              {IS_CAPACITOR ? (annual ? '/year' : '/month') : '/month'}
            </span>
            {!IS_CAPACITOR && annual && (
              <span className="text-slate-500 text-xs ml-auto">
                ${proPlan ? proPlan.price_yearly / 100 : 349.99}/yr
              </span>
            )}
          </div>
        </div>

        {error && !iapUnavailable && (
          <p className="px-6 pb-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {iapUnavailable && (
          <div
            className="mx-6 mb-4 rounded-lg px-4 py-3 flex items-start gap-2"
            role="alert"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: '#fecaca' }}>
                {rc.error}
              </p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 flex flex-col gap-2">
          {iapUnavailable ? (
            <button
              type="button"
              onClick={() => rc.retry()}
              disabled={rcLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              }}
            >
              {rcLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <RotateCcw size={16} />
                  Try again
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading || rc.isPurchasing || (IS_CAPACITOR ? !rcPkg : !proPlan)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-white disabled:opacity-50 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              }}
            >
              {loading || rc.isPurchasing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  Start 7-day free trial
                </>
              )}
            </button>
          )}
          {IS_CAPACITOR && (
            <button
              type="button"
              onClick={() => rc.restore()}
              disabled={rc.isPurchasing}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm transition-colors"
              style={{ color: '#94a3b8' }}
            >
              <RotateCcw size={14} />
              Restore purchases
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Maybe later
          </button>
          <div className="flex items-center justify-center gap-3 pt-1 pb-1">
            <a
              href="https://dealgapiq.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-slate-400 underline transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-slate-600 text-[11px]">·</span>
            <a
              href="https://dealgapiq.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-slate-400 underline transition-colors"
            >
              Terms of Use
            </a>
          </div>
          {IS_CAPACITOR && (
            <p className="text-[10px] leading-snug text-center mt-1" style={{ color: '#64748b' }}>
              Payment will be charged to your Apple&nbsp;ID account at confirmation
              of purchase. Subscription automatically renews unless canceled at
              least 24&nbsp;hours before the end of the current period. Your account
              will be charged for renewal within 24&nbsp;hours prior to the end of
              the current period at the same price. You can manage and cancel your
              subscriptions by going to your App&nbsp;Store account settings after
              purchase.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
