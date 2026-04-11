'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api-client'
import {
  Check,
  X,
  CreditCard,
  FileText,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { IS_CAPACITOR } from '@/lib/env'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

/* ── Design tokens (DealGapIQ billing design system) ─────────── */

const T = {
  teal: 'var(--accent-sky)',
  green: 'var(--status-positive)',
  muted: 'var(--text-label)',
  border: 'var(--border-default)',
  glowLg: 'var(--shadow-card)',
  proBorder: 'var(--border-focus)',
  proGlow: 'var(--shadow-card-hover)',
  proGlowHover: 'var(--shadow-card-hover)',
  proBorderHover: 'var(--accent-sky-light)',
  featureX: 'var(--text-label)',
  lockedText: 'var(--text-label)',
  faqBorder: 'var(--border-focus)',
}

const FONT_DM = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const FONT_MONO = "var(--font-space-mono), 'Space Mono', monospace"

/* ── Plan data (arrays for easy updates) ─────────────────────── */

interface PlanFeature {
  text: string
  bold?: string
  available: boolean
}

interface PlanConfig {
  id: 'pro' | 'starter'
  name: string
  price: string
  period: string
  note: string
  recommended?: boolean
  features: PlanFeature[]
}

function getPlans(isAnnual: boolean): PlanConfig[] {
  return [
    {
      id: 'pro',
      name: 'Pro',
      price: isAnnual ? '$29.17' : '$39.99',
      period: '/month',
      note: isAnnual
        ? 'Billed annually at $349.99 · Cancel anytime · 7-day free trial'
        : 'Billed monthly · Cancel anytime · 7-day free trial',
      recommended: true,
      features: [
        { bold: 'Unlimited', text: 'property analyses', available: true },
        { text: 'Deal Gap + Income Value + Target Buy', available: true },
        { text: 'Verdict score (Pass / Marginal / Buy)', available: true },
        { text: '6 strategy snapshots', available: true },
        { text: 'Seller Motivation indicator', available: true },
        { bold: 'Full calculation breakdown', text: '— see every assumption', available: true },
        { bold: 'Editable inputs', text: '— stress test any variable', available: true },
        { bold: 'Excel proforma', text: '+ lender-ready PDF reports', available: true },
        { bold: 'Side-by-side', text: 'deal comparison pipeline', available: true },
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$0',
      period: '/month',
      note: 'Free forever · 3 analyses/month',
      features: [
        { text: '3 property analyses per month', available: true },
        { text: 'Deal Gap + Income Value + Target Buy', available: true },
        { text: 'Verdict score (Pass / Marginal / Buy)', available: true },
        { text: '6 strategy snapshots', available: true },
        { text: 'Seller Motivation indicator', available: true },
        { text: 'Full calculation breakdown', available: false },
        { text: 'Editable inputs & stress testing', available: false },
        { text: 'Excel proforma & PDF reports', available: false },
        { text: 'Side-by-side deal comparison', available: false },
      ],
    },
  ]
}

const FAQ_ITEMS = [
  {
    q: 'What happens when my trial ends?',
    a: "You'll be charged $349.99/yr (annual) or $39.99/mo (monthly). Cancel before the trial ends and you're never charged.",
  },
  {
    q: 'Can I switch back to Starter?',
    a: "Yes — downgrade anytime. You'll keep Pro features until the end of your billing period, then revert to Starter limits.",
  },
  {
    q: "What's in the Excel proforma?",
    a: 'A full financial model with all inputs, cash flow projections, return calculations, and sensitivity analysis — ready for lenders or partners.',
  },
  {
    q: 'Do unused analyses roll over?',
    a: "On Starter, no — your 3 analyses reset monthly. On Pro, there's no limit so it doesn't matter.",
  },
]

const TRUST_ITEMS_WEB = [
  { Icon: Check, text: 'Cancel anytime' },
  { Icon: CreditCard, text: 'Secured by Stripe' },
  { Icon: FileText, text: 'Instant invoices' },
  { Icon: Shield, text: '7-day free trial' },
]

const TRUST_ITEMS_CAPACITOR = [
  { Icon: Check, text: 'Cancel anytime' },
  { Icon: Shield, text: '7-day free trial' },
  { Icon: Check, text: 'Restore purchases anytime' },
]

/* ── Shared CTA style for disabled/current plan button ───────── */

const ctaDisabledStyle = {
  display: 'block' as const,
  width: '100%',
  textAlign: 'center' as const,
  padding: '0.85rem',
  minHeight: '48px',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: '0.95rem',
  background: 'transparent',
  border: `1px solid ${T.border}`,
  color: T.muted,
  cursor: 'default' as const,
  fontFamily: FONT_DM,
}

/* ── Billing Page Content ────────────────────────────────────── */

function BillingContent() {
  const searchParams = useSearchParams()
  const { isLoading: authLoading } = useSession()
  const { isPro, isTrialing } = useSubscription()

  const [isAnnual, setIsAnnual] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [proHovered, setProHovered] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const PLANS = getPlans(isAnnual)

  useEffect(() => {
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: 'Subscription successful! Welcome to DealGapIQ Pro.' })
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Checkout was canceled. You can try again when ready.' })
    }
  }, [searchParams])

  const handleUpgrade = () => {
    setShowUpgradeModal(true)
  }

  const handleManageBilling = async () => {
    if (IS_CAPACITOR) {
      setShowUpgradeModal(true)
      return
    }
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.teal }} />
      </div>
    )
  }

  const currentPlanId = isPro ? 'pro' : 'starter'

  return (
    <>
    <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} returnTo="/billing" />
    <div
      className="min-h-screen bg-[var(--surface-base)]"
      style={{ color: 'var(--text-heading)', fontFamily: FONT_DM, lineHeight: 1.7 }}
    >
      <div className="max-w-[960px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-12 md:pb-16">

        {/* ── Success / Error Toast ── */}
        {message && (
          <div className="mb-8">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: message.type === 'success'
                  ? 'rgba(52,211,153,0.08)' : 'rgba(249,112,102,0.08)',
                border: `1px solid ${message.type === 'success'
                  ? 'rgba(52,211,153,0.25)' : 'rgba(249,112,102,0.25)'}`,
                color: message.type === 'success' ? T.green : 'var(--status-negative)',
              }}
            >
              {message.type === 'success'
                ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
                : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <p className="flex-1">{message.text}</p>
              <button
                onClick={() => setMessage(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="text-center" style={{ marginBottom: '3.5rem' }}>
          <h1
            className="text-[var(--text-heading)]"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem',
            }}
          >
            Your Plan
          </h1>
          <p style={{ fontSize: '1rem', color: T.muted }}>
            {isPro
              ? isTrialing
                ? "You're trialing Pro. All features unlocked."
                : "You're on Pro. All features unlocked."
              : "You're on Starter. Upgrade to unlock the full toolkit."}
          </p>
        </div>

        {/* ── Value Anchor ── */}
        <div
          className="text-center"
          style={{
            marginBottom: '3rem',
            padding: '2rem',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: '1.5rem',
              fontWeight: 700,
              color: T.teal,
              marginBottom: '0.5rem',
            }}
          >
            {isAnnual ? '$29.17' : '$39.99'}/mo vs. one bad deal
          </div>
          <div style={{ fontSize: '1rem', lineHeight: 1.75 }}>
            The average investor who skips proper underwriting overpays by{' '}
            <strong style={{ color: T.teal, fontWeight: 700 }}>
              $15,000–$40,000
            </strong>{' '}
            per property. Pro pays for itself on the first deal you walk away from.
          </div>
        </div>

        {/* ── Motivating CTA ── */}
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <h2
            className="text-[var(--text-heading)]"
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              marginBottom: '0.75rem',
            }}
          >
            Stop Screening Blind.<br />See the Full Picture.
          </h2>
          <p className="mx-auto" style={{ fontSize: '1rem', color: T.muted, maxWidth: 540 }}>
            Starter shows you the three numbers. Pro shows you <em>why</em> they
            are what they are — and lets you change every assumption until
            you&apos;re confident enough to make an offer.
          </p>
        </div>

        {/* ── Billing Toggle ── */}
        <div className="flex justify-center" style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0,
              background: 'var(--surface-card)',
              borderRadius: 40,
              padding: 4,
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '8px 20px',
                borderRadius: 36,
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: FONT_DM,
                background: !isAnnual ? T.teal : 'transparent',
                color: !isAnnual ? 'var(--text-inverse)' : T.muted,
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '8px 20px',
                borderRadius: 36,
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: FONT_DM,
                background: isAnnual ? T.teal : 'transparent',
                color: isAnnual ? 'var(--text-inverse)' : T.muted,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Annual
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  background: isAnnual ? 'rgba(255,255,255,0.22)' : 'var(--color-sky-dim)',
                  color: isAnnual ? 'var(--text-inverse)' : T.teal,
                  padding: '2px 6px',
                  borderRadius: 6,
                }}
              >
                SAVE 27%
              </span>
            </button>
          </div>
        </div>

        {/* ── Plan Comparison Grid ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          style={{ marginBottom: '3rem' }}
        >
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId
            const isPlanPro = plan.id === 'pro'

            return (
              <div
                key={plan.id}
                className="relative"
                style={{
                  borderRadius: 16,
                  padding: '2.25rem',
                  background: 'var(--surface-card)',
                  border: `1px solid ${
                    isPlanPro
                      ? proHovered ? T.proBorderHover : T.proBorder
                      : T.border
                  }`,
                  boxShadow: isPlanPro
                    ? proHovered ? T.proGlowHover : T.proGlow
                    : 'var(--shadow-card)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onMouseEnter={() => isPlanPro && setProHovered(true)}
                onMouseLeave={() => isPlanPro && setProHovered(false)}
              >
                {/* Recommended badge */}
                {plan.recommended && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
                    style={{
                      top: -12,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-inverse)',
                      background: T.teal,
                      padding: '0.3rem 1rem',
                      borderRadius: 20,
                    }}
                  >
                    Recommended
                  </div>
                )}

                {/* Plan name */}
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.15rem' }}>
                  {plan.name}
                </div>

                {/* Price */}
                <div
                  className="flex items-baseline"
                  style={{ gap: '0.25rem', marginBottom: '0.25rem' }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '2.25rem',
                      fontWeight: 700,
                      color: isPlanPro ? T.teal : 'var(--text-heading)',
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: T.muted }}>
                    {plan.period}
                  </span>
                </div>

                {/* Price note */}
                <div style={{ fontSize: '0.72rem', color: T.muted, marginBottom: '1.75rem' }}>
                  {plan.note}
                </div>

                {/* Feature list */}
                <div
                  className="flex flex-col"
                  style={{ gap: '0.7rem', marginBottom: '2rem' }}
                >
                  {plan.features.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start"
                      style={{ gap: '0.6rem', fontSize: '0.88rem', lineHeight: 1.5 }}
                    >
                      {f.available ? (
                        <Check
                          className="flex-shrink-0"
                          style={{ width: 18, height: 18, color: T.green, marginTop: 2 }}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <X
                          className="flex-shrink-0"
                          style={{ width: 18, height: 18, color: T.featureX, marginTop: 2 }}
                          strokeWidth={2}
                        />
                      )}
                      <span style={!f.available ? { color: T.lockedText } : undefined}>
                        {f.bold && <strong>{f.bold}</strong>}
                        {f.bold && f.text ? ` ${f.text}` : f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                {isPlanPro ? (
                  isCurrentPlan ? (
                    <div className="space-y-2">
                      <div style={ctaDisabledStyle}>Current Plan</div>
                      <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        className="flex items-center justify-center gap-2 w-full min-h-[48px] transition-opacity hover:opacity-80"
                        style={{
                          padding: '0.65rem',
                          borderRadius: 10,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: T.muted,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: FONT_DM,
                        }}
                      >
                        {portalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {IS_CAPACITOR ? 'Manage Subscription' : <>Manage Subscription <ExternalLink className="w-3 h-3" /></>}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      className="w-full min-h-[48px] transition-opacity hover:opacity-90"
                      style={{
                        display: 'block' as const,
                        textAlign: 'center' as const,
                        padding: '0.85rem',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        background: T.teal,
                        color: 'var(--text-inverse)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: FONT_DM,
                      }}
                    >
                      Start 7-Day Free Trial →
                    </button>
                  )
                ) : (
                  <div style={ctaDisabledStyle}>
                    {isCurrentPlan ? 'Current Plan' : 'Free Plan'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Trust Row ── */}
        <div
          className="grid grid-cols-2 sm:flex sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-x-10"
          style={{ padding: '2rem 0' }}
        >
          {(IS_CAPACITOR ? TRUST_ITEMS_CAPACITOR : TRUST_ITEMS_WEB).map(({ Icon, text }) => (
            <div
              key={text}
              className="flex items-center"
              style={{ gap: '0.5rem', fontSize: '0.8rem', color: T.muted }}
            >
              <Icon
                className="flex-shrink-0"
                style={{ width: 16, height: 16, color: T.green }}
              />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* ── Teal Divider ── */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, var(--accent-sky) 20%, var(--accent-sky) 80%, transparent)`,
            boxShadow: 'var(--shadow-card)',
            margin: '3rem 0',
          }}
        />

        {/* ── FAQ Section ── */}
        <div style={{ marginTop: '2rem' }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.teal,
              marginBottom: '1rem',
            }}
          >
            Common Questions
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-2"
            style={{ gap: '1.25rem', marginTop: '1.5rem' }}
          >
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface-card)',
                  border: `1px solid ${T.faqBorder}`,
                  borderRadius: 12,
                  boxShadow: T.glowLg,
                  padding: '1.5rem',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {item.q}
                </div>
                <div style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.6 }}>
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
    </>
  )
}

/* ── Page Export ──────────────────────────────────────────────── */

export default function BillingPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.teal }} />
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </AuthGuard>
  )
}
