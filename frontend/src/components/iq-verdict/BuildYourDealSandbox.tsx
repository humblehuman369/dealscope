'use client'

/**
 * BuildYourDealSandbox — Activation Arc Phase 0 (B1).
 *
 * Inline slider sandbox on the verdict page. Renders four sliders (price,
 * rent, down payment %, seller carry) and a live readout of the recomputed
 * Deal Gap, motivating tier, monthly cash flow, and cash to close.
 *
 * Sliders open pre-set to the P0 headline structure values when one exists,
 * so the user lands on a working deal and adjusts from there. When no
 * headline is available, sliders default to the property's list price + base
 * assumptions.
 *
 * See docs/feature-plans/ACTIVATION_ARC.md §5 for the doctrine. Companion
 * backend endpoint: POST /api/v1/analysis/sandbox (services/sandbox.py).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent } from '@/lib/eventTracking'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { IQIcon } from '@/lib/iq/iqIcon'

// ---------------------------------------------------------------------------
// Types — kept local; these mirror backend/app/schemas/sandbox.py.
// ---------------------------------------------------------------------------

export interface SandboxBaseInputs {
  listPrice: number
  monthlyRent: number
  propertyTaxesAnnual: number
  insuranceAnnual: number
  downPaymentPct: number
  interestRate: number
  loanTermYears: number
  closingCostsPct: number
  vacancyRate: number
  maintenancePct: number
  managementPct: number
  capexPct: number
  utilitiesAnnual?: number
  otherAnnualExpenses?: number
  buyDiscountPct: number
  isListed: boolean
}

export interface SandboxAdjustments {
  price?: number
  monthlyRent?: number
  downPaymentPct?: number
  sellerCarryAmount?: number
}

interface SandboxResponse {
  dealGapPct: number
  motivatingLabel: string
  monthlyCashFlow: number
  monthlyPi: number
  cashRequired: number
  incomeValue: number
  targetBuyPrice: number
}

export interface BuildYourDealSandboxProps {
  /** Resolved property + assumption inputs from the verdict response. */
  baseInputs: SandboxBaseInputs
  /**
   * Headline structure from the verdict payload, when present. Drives the
   * initial slider positions — users land on a working deal, not at baseline.
   */
  headlineStructure?: DealStructure | null
  /**
   * Apply this scenario in Strategy. Receives the current adjustments.
   * Wired in B3 — the verdict page handles the URL-based handoff.
   */
  onApplyInStrategy?: (adjustments: SandboxAdjustments) => void
  /**
   * Restore previously-saved adjustments (B4). When provided and non-empty,
   * the sandbox opens in this state instead of the headline-derived state.
   */
  initialAdjustments?: SandboxAdjustments | null
  /** Persist adjustments per-property (B4). Called on each settled change. */
  onAdjustmentsChanged?: (adjustments: SandboxAdjustments) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the adjustments encoded into the headline's pre-loaded record.
 *  Mirrors what headline_conventional_blend.py writes:
 *    - custom_purchase_price → price
 *    - custom_rent_estimate → monthlyRent
 *    - pending_extras.down_payment_pct_override → downPaymentPct
 */
function adjustmentsFromHeadline(
  headline: DealStructure | null | undefined,
): SandboxAdjustments {
  if (!headline?.preLoadedRecord) return {}
  const pre = headline.preLoadedRecord as Record<string, unknown>
  const out: SandboxAdjustments = {}
  if (typeof pre.custom_purchase_price === 'number') out.price = pre.custom_purchase_price
  if (typeof pre.custom_rent_estimate === 'number') out.monthlyRent = pre.custom_rent_estimate
  const extras = pre.pending_extras as Record<string, unknown> | undefined
  if (extras && typeof extras.down_payment_pct_override === 'number') {
    out.downPaymentPct = extras.down_payment_pct_override
  }
  return out
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`
}

const TIER_COLOR: Record<string, string> = {
  'Cash-Flow Deal': '#22c55e',
  'Negotiable Deal': '#84cc16',
  'Near Deal': '#c7c95b',
  'Potential Deal': '#d9a657',
  'Structured Deal': '#e48657',
  'Reset Deal': '#ef4444',
}

// Debounce window for slider→backend calls. 100ms feels live without flooding.
const RECOMPUTE_DEBOUNCE_MS = 100

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BuildYourDealSandbox({
  baseInputs,
  headlineStructure,
  onApplyInStrategy,
  initialAdjustments,
  onAdjustmentsChanged,
}: BuildYourDealSandboxProps) {
  // Initial slider state: prefer persisted adjustments (B4) → headline → empty.
  const headlineAdj = useMemo(
    () => adjustmentsFromHeadline(headlineStructure),
    [headlineStructure],
  )
  const startingAdj = useMemo<SandboxAdjustments>(() => {
    if (initialAdjustments && Object.keys(initialAdjustments).length > 0) {
      return initialAdjustments
    }
    return headlineAdj
  }, [initialAdjustments, headlineAdj])

  const [adjustments, setAdjustments] = useState<SandboxAdjustments>(startingAdj)
  const [result, setResult] = useState<SandboxResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Effective values for slider positions — fall back to base inputs.
  const effPrice = adjustments.price ?? baseInputs.listPrice
  const effRent = adjustments.monthlyRent ?? baseInputs.monthlyRent
  const effDpPct = adjustments.downPaymentPct ?? baseInputs.downPaymentPct
  const effCarry = adjustments.sellerCarryAmount ?? 0

  // Slider bounds. Keep min/max stable across renders so React doesn't
  // re-mount the inputs (which loses focus on touch devices). Ranges are
  // intentionally wide enough to let the user reach profitability on most
  // properties — even when the headline blend lands at the edge of viable.
  // Engineering doctrine: sliders are exploratory; the headline shows what's
  // *plausible*, the sandbox lets the user explore what's *possible*.
  const PRICE_MIN = Math.round(baseInputs.listPrice * 0.70) // up to 30% off list
  const PRICE_MAX = baseInputs.listPrice
  const RENT_MIN = Math.round(baseInputs.monthlyRent * 0.50)
  const RENT_MAX = Math.round(baseInputs.monthlyRent * 1.50) // up to +50% (covers STR)
  const DP_MIN_PCT = 5
  const DP_MAX_PCT = 80 // cash-heavy buyers exist
  const CARRY_MAX = Math.round(effPrice * 0.50) // Sub2 + seller-second can stack here

  // Telemetry: fire `sandbox_engaged` on first slider movement. The ref
  // ensures it fires once per session even if the user toggles back and forth.
  const engagedRef = useRef(false)
  const lastTierRef = useRef<string | null>(null)

  // Debounced backend recompute. Called on every adjustment change; only the
  // last one within the debounce window fires the request.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recompute = useCallback(
    (next: SandboxAdjustments) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/v1/analysis/sandbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base: baseInputs, adjustments: next }),
          })
          if (!res.ok) {
            setError(`Sandbox recompute failed (${res.status})`)
            return
          }
          const json = (await res.json()) as SandboxResponse
          setResult(json)
          setError(null)

          // Telemetry: sandbox_gap_closed_to_tier when the tier improves.
          if (lastTierRef.current && lastTierRef.current !== json.motivatingLabel) {
            trackEvent('sandbox_gap_closed_to_tier', {
              from_tier: lastTierRef.current,
              to_tier: json.motivatingLabel,
              gap_pct: json.dealGapPct,
            })
          }
          lastTierRef.current = json.motivatingLabel
        } catch (e) {
          setError(e instanceof Error ? e.message : 'recompute failed')
        }
      }, RECOMPUTE_DEBOUNCE_MS)
    },
    [baseInputs],
  )

  // Initial recompute on mount + whenever the starting adjustments change.
  useEffect(() => {
    setAdjustments(startingAdj)
    recompute(startingAdj)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [startingAdj, recompute])

  // Apply a single field update and trigger recompute + telemetry.
  const update = useCallback(
    (patch: SandboxAdjustments) => {
      setAdjustments((prev) => {
        const next = { ...prev, ...patch }
        if (!engagedRef.current) {
          engagedRef.current = true
          trackEvent('sandbox_engaged', {
            started_from: headlineStructure ? 'headline' : 'baseline',
            entry_gap_pct: result?.dealGapPct ?? 0,
          })
        }
        // Track which slider moved (the last one in the patch).
        const slider = Object.keys(patch)[0]
        if (slider) {
          trackEvent('sandbox_slider_moved', {
            slider,
            new_value: String(patch[slider as keyof SandboxAdjustments] ?? ''),
          })
        }
        recompute(next)
        onAdjustmentsChanged?.(next)
        return next
      })
    },
    [headlineStructure, result?.dealGapPct, recompute, onAdjustmentsChanged],
  )

  const reset = useCallback(() => {
    setAdjustments(headlineAdj)
    recompute(headlineAdj)
    onAdjustmentsChanged?.(headlineAdj)
  }, [headlineAdj, recompute, onAdjustmentsChanged])

  const hasMovedFromHeadline = useMemo(() => {
    const keys: (keyof SandboxAdjustments)[] = [
      'price',
      'monthlyRent',
      'downPaymentPct',
      'sellerCarryAmount',
    ]
    return keys.some((k) => adjustments[k] !== headlineAdj[k])
  }, [adjustments, headlineAdj])

  const tierColor = result ? (TIER_COLOR[result.motivatingLabel] ?? '#94a3b8') : '#94a3b8'

  // Activation Arc Phase 4 (D2) — IQ nudges. State-triggered phrase library;
  // no LLM, just template interpolation over the current sandbox result.
  // Picks the most-relevant nudge given the user's progress toward Cash-Flow.
  const iqNudge = useMemo<string | null>(() => {
    if (!result) return null
    if (result.motivatingLabel === 'Cash-Flow Deal') {
      return "Nice — this combination cashflows. Hit *Apply in Strategy* to lock it in."
    }
    if (result.motivatingLabel === 'Negotiable Deal' || result.motivatingLabel === 'Near Deal') {
      const cfShortMonthly = Math.max(0, -result.monthlyCashFlow)
      if (cfShortMonthly > 0) {
        // Suggest the smallest rent or DP nudge that closes the gap.
        return `You're about $${Math.round(cfShortMonthly)}/mo from a Cash-Flow Deal. Try bumping rent or down payment.`
      }
      return 'Almost there — one more small move closes this.'
    }
    if (result.motivatingLabel === 'Reset Deal') {
      return 'This property is far from cashflowing on conventional terms. Look at Other Ways below for creative paths — Sub2 or seller carry can sometimes bridge the gap.'
    }
    // Potential / Structured tiers — guide toward useful levers.
    if (effPrice === baseInputs.listPrice && (adjustments.monthlyRent ?? 0) === 0) {
      return 'Try moving the rent slider first — verifying actual market rent often does more than negotiating price.'
    }
    return null
  }, [result, effPrice, baseInputs.listPrice, adjustments.monthlyRent])

  // Apply-in-Strategy CTA gates on the user having actually moved something
  // (B3 doctrine — only show after the user has made the deal "their own").
  const canApply = !!onApplyInStrategy && hasMovedFromHeadline

  return (
    <section
      role="region"
      aria-label="Build Your Deal — adjust the math to fit your budget"
      style={{
        marginTop: 16,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        borderRadius: 12,
        // Elevated surface + thicker border so the card reads as a distinct
        // panel against the page background in both light and dark modes.
        // Pair with the existing HeadlineStructureCard pattern (which uses
        // a 2px accent border) — sandbox uses a neutral 2px border so it
        // doesn't compete with the headline's visual primacy.
        background: 'var(--surface-elevated, var(--surface-card))',
        border: '2px solid var(--border-default)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent-sky)',
            marginBottom: 4,
          }}
        >
          Build Your Deal
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-heading)',
            lineHeight: 1.3,
          }}
        >
          Adjust the math to fit your budget
        </h3>
      </div>

      {/* Live readout — gap, tier, cash flow, cash to close */}
      {result && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            padding: 12,
            borderRadius: 10,
            background: 'var(--surface-base, var(--surface-card))',
            border: '1px solid var(--border-subtle, var(--border-default))',
          }}
        >
          <ReadoutItem
            label="Deal Gap"
            value={formatPct(result.dealGapPct)}
            sub={result.motivatingLabel}
            subColor={tierColor}
          />
          <ReadoutItem
            label="Monthly cash flow"
            value={formatMoney(result.monthlyCashFlow)}
            sub={result.monthlyCashFlow >= 0 ? 'Positive' : 'Negative'}
            subColor={result.monthlyCashFlow >= 0 ? '#22c55e' : '#ef4444'}
          />
          <ReadoutItem label="Cash to close" value={formatMoney(result.cashRequired)} />
          <ReadoutItem label="Monthly P&I" value={formatMoney(result.monthlyPi)} />
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
      )}

      {/* D2 — IQ nudge based on the current recompute state. State-triggered;
          no LLM. Only renders when there's something genuinely useful to say. */}
      {iqNudge && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--surface-card)',
            border: '1px solid var(--accent-sky)',
          }}
        >
          <IQIcon size={18} />
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-body)' }}>
            {iqNudge}
          </span>
        </div>
      )}

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Slider
          label="Price"
          valueLabel={formatMoney(effPrice)}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={1000}
          value={effPrice}
          onChange={(v) => update({ price: v })}
          minLabel={formatMoney(PRICE_MIN)}
          maxLabel={formatMoney(PRICE_MAX)}
        />
        <Slider
          label="Monthly rent"
          valueLabel={formatMoney(effRent)}
          min={RENT_MIN}
          max={RENT_MAX}
          step={25}
          value={effRent}
          onChange={(v) => update({ monthlyRent: v })}
          minLabel={formatMoney(RENT_MIN)}
          maxLabel={formatMoney(RENT_MAX)}
        />
        <Slider
          label="Down payment"
          valueLabel={`${Math.round(effDpPct * 100)}%`}
          min={DP_MIN_PCT}
          max={DP_MAX_PCT}
          step={1}
          value={Math.round(effDpPct * 100)}
          onChange={(v) => update({ downPaymentPct: v / 100 })}
          minLabel={`${DP_MIN_PCT}%`}
          maxLabel={`${DP_MAX_PCT}%`}
        />
        <Slider
          label="Seller carry"
          valueLabel={effCarry > 0 ? formatMoney(effCarry) : 'None'}
          min={0}
          max={CARRY_MAX}
          step={1000}
          value={effCarry}
          onChange={(v) => update({ sellerCarryAmount: v })}
          minLabel="$0"
          maxLabel={formatMoney(CARRY_MAX)}
        />
      </div>

      {/* Action row — reset + apply-in-strategy */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 4,
        }}
      >
        {hasMovedFromHeadline && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--surface-card)]"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            Reset to headline
          </button>
        )}
        {canApply && (
          <button
            type="button"
            onClick={() => onApplyInStrategy?.(adjustments)}
            className="rounded-md px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base, #fff)',
              border: 'none',
              minWidth: 160,
            }}
          >
            Apply in Strategy
          </button>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function ReadoutItem({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-heading)',
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11.5,
            color: subColor ?? 'var(--text-secondary)',
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}

function Slider({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  label: string
  valueLabel: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  minLabel: string
  maxLabel: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-heading)', fontWeight: 700 }}>
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} — ${valueLabel}`}
        // No `accentColor` — global CSS in globals.css handles full track +
        // thumb styling via -webkit-/-moz- pseudo-elements. Setting
        // accent-color on a styled range input causes some browsers to fall
        // back to hybrid native rendering and drop the custom track.
        style={{ width: '100%' }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: 'var(--text-secondary)',
        }}
      >
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
