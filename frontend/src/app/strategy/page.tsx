'use client'

/**
 * StrategyIQ Page — Financial Deep-Dive (Page 2 of 2)
 * Route: /strategy?address=...
 *
 * Full financial breakdown, benchmarks, data quality, and next steps.
 * Navigated from VerdictIQ page via "Show Me the Numbers" CTA.
 *
 * Design: VerdictIQ 3.3 — True black base, Inter typography, Slate text hierarchy
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useRef,
  Suspense,
} from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { ScreenErrorBoundary } from '@/components/ErrorBoundary'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { useSaveStrategyWorksheet } from '@/hooks/useSaveStrategyWorksheet'
import { api } from '@/lib/api-client'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import { usePropertyData } from '@/hooks/usePropertyData'
import { useDefaults } from '@/hooks/useDefaults'
import { parseAddressString } from '@/utils/formatters'
import {
  canonicalizeAddressForIdentity,
  isInitialOverrideEligible,
  isLikelyFullAddress,
  readDealMakerOverrides,
  writeDealMakerOverrides,
} from '@/utils/addressIdentity'
import { decodeScenario } from '@/lib/dealStructures/scenarioPayload'
import {
  appendSavedThreePathScenario,
  PATH_PATCH_FIELD_KEYS,
  preLoadedRecordToDealMakerPatch,
  readLastAppliedScenario,
  writeLastAppliedScenario,
} from '@/lib/dealStructures/loadScenario'
import { mapDealStructuresFromApi } from '@/lib/dealStructures/mapDealStructures'
import {
  computeHighlightedStateFields,
  inlineOverrideKeyToStateField,
} from '@/lib/dealStructures/pathHighlights'
import { getConditionAdjustment } from '@/utils/property-adjustments'
import { calculateMortgagePayment } from '@/utils/calculations'
import { computeLtrOperatingExpenseBreakdown } from '@/lib/ltrOperatingExpenses'
import { computeDealGapIncomeValue } from '@/lib/dealGapIncomeValue'
import { computeLtrMetricsFromState } from '@/lib/ltrWorksheetMetrics'
import { sellerMonthlyPayment } from '@/lib/sellerFinancing'
import {
  DEFAULT_OPERATING_CAPEX_PCT,
  DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
  DEFAULT_OPERATING_UTILITIES_MONTHLY,
} from '@/lib/operatingExpenseDefaults'
import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import {
  IQEstimateSelector,
  type IQEstimateSources,
} from '@/components/iq-verdict/IQEstimateSelector'
import {
  buildVerdictAnalysisPayload,
  buildVerdictBaseFromPropertyResponse,
  type VerdictPayloadBase,
} from '@/utils/verdictPayload'
import { mapPropertyToIQSources } from '@/utils/propertySourceMapper'
import { useDealSnapshot } from '@/hooks/useDealSnapshot'
import {
  effectiveMarketValueFromRecord,
  effectiveMonthlyRentFromRecord,
} from '@/lib/dealMakerOverrides'
import { AuthGate } from '@/components/auth/AuthGate'
import {
  parseStrategyWorksheetSection,
  strategyWorksheetAnchorId,
} from '@/components/iq-verdict/strategyWorksheetSection'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { LoadingProperty, ErrorProperty } from '@/components/ui/PropertyStates'
import { VideoModal } from '@/components/ui/VideoModal'
import { DealMakerWorksheet } from '@/features/deal-maker/components/DealMakerWorksheet'
import { downloadComprehensiveExcel } from '@/features/strategy/exportComprehensiveExcel'
import { STRRegulatoryBadge } from '@/components/analytics/STRRegulatoryBadge'
import { STRConfidenceLabel } from '@/components/analytics/STRConfidenceLabel'
import type {
  StrategyType,
  AnyStrategyState,
  AnyStrategyMetrics,
  LTRDealMakerState,
  LTRDealMakerMetrics,
  STRDealMakerState,
  STRMetrics,
  BRRRRDealMakerState,
  BRRRRMetrics,
  FlipDealMakerState,
  FlipFinancingType,
  FlipMetrics,
  HouseHackDealMakerState,
  HouseHackLoanType,
  HouseHackMetrics,
  WholesaleDealMakerState,
  WholesaleMetrics,
} from '@/features/deal-maker/components/types'
import {
  DEFAULT_STR_DEAL_MAKER_STATE,
  DEFAULT_BRRRR_DEAL_MAKER_STATE,
  DEFAULT_FLIP_DEAL_MAKER_STATE,
  DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
} from '@/features/deal-maker/components/types'
import type { InlineDealMakerValues } from '@/components/strategy/InlineDealMakerPanel'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { PathOptionCard } from '@/components/iq-verdict/PathOptionCard'
import { PitchScriptModal } from '@/components/iq-verdict/PitchScriptModal'
import { SweetSpotZone } from '@/components/iq-verdict/SweetSpotZone'
import { PathButton } from '@/components/strategy/PathButton'
import { trackEvent } from '@/lib/eventTracking'

/**
 * MarketPriceInfoTip — explains how Market Price is derived for off-market homes.
 * Renders a tiny circled-"i" trigger in the corner of the Market Price card.
 * Hover reveals it on desktop; tap toggles it on mobile (with outside-click dismiss).
 */
function MarketPriceInfoTip() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div ref={ref} className="absolute top-1 right-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="What is Market Price?"
        aria-expanded={open}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${open ? 'var(--accent-sky)' : 'var(--text-secondary)'}`,
          background: 'transparent',
          color: open ? 'var(--accent-sky)' : 'var(--text-secondary)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: -4,
            width: 260,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-body)',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            letterSpacing: 'normal',
            textTransform: 'none',
            textAlign: 'left',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
            zIndex: 60,
          }}
        >
          {/* Caret pointing up to the icon */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: 6,
              width: 10,
              height: 10,
              background: 'var(--surface-elevated)',
              borderTop: '1px solid var(--border-default)',
              borderLeft: '1px solid var(--border-default)',
              transform: 'rotate(45deg)',
            }}
          />
          <strong style={{ color: 'var(--accent-sky)' }}>Market Price</strong> is an{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>automated estimate</strong> (not a list
          price) for <strong style={{ color: 'var(--accent-sky)' }}>Off-market</strong> homes, which
          aren&apos;t currently for sale. Deal Gap and Price Gap use this value—if you{' '}
          <strong style={{ color: 'var(--accent-sky)' }}>adjust</strong> the price, the gaps will
          update too.
        </div>
      )}
    </div>
  )
}

/** Info tooltip on the Income Value price card — explains $0 cash-flow breakeven. */
function IncomeValueInfoTip() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div ref={ref} className="absolute top-1 right-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label="What is Income Value?"
        aria-expanded={open}
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: `1px solid ${open ? 'var(--status-warning)' : 'var(--text-secondary)'}`,
          background: 'transparent',
          color: open ? 'var(--status-warning)' : 'var(--text-secondary)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          fontStyle: 'italic',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: -4,
            width: 280,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-body)',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.55,
            letterSpacing: 'normal',
            textTransform: 'none',
            textAlign: 'left',
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
            zIndex: 60,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: 6,
              width: 10,
              height: 10,
              background: 'var(--surface-elevated)',
              borderTop: '1px solid var(--border-default)',
              borderLeft: '1px solid var(--border-default)',
              transform: 'rotate(45deg)',
            }}
          />
          <strong style={{ color: 'var(--status-warning)' }}>Income Value</strong> is the max
          price where rent fully covers your loan payment and operating costs—annual cash flow
          ≈ $0.{' '}
          <strong style={{ color: 'var(--status-warning)' }}>Target Buy</strong> is ~5% below
          that for a margin of safety.
        </div>
      )}
    </div>
  )
}

/** Strategies where deal-structure Options do not apply (non-rental economics). */
const STRATEGIES_WITHOUT_OPTIONS = new Set(['fix-and-flip', 'wholesale'])

/** Per-strategy template IDs to hide from the Options row. */
const STRATEGY_EXCLUDED_TEMPLATE_IDS: Record<string, ReadonlySet<string>> = {
  'short-term-rental': new Set(['rent-verification', 'fha-house-hack']),
  brrrr: new Set(['rent-verification', 'fha-house-hack']),
}

const STRATEGY_LABEL: Record<string, string> = {
  'long-term-rental': 'Long-Term Rental',
  'short-term-rental': 'Short-Term Rental',
  brrrr: 'BRRRR',
  'house-hack': 'House Hack',
}

/**
 * StrategySelectDropdown — compact replacement for the 6-pill strategy selector.
 * Trigger uses the active strategy's color so the page reads as color-coded
 * without the visual noise of six full-width pills.
 */
type StrategyOption = { id: string; label: string; color: string }

function StrategySelectDropdown({
  options,
  activeId,
  onChange,
}: {
  options: StrategyOption[]
  activeId: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const active = options.find((o) => o.id === activeId) ?? options[0]
  if (!active) return null

  return (
    <div ref={ref} className="relative w-full sm:w-72 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Strategy: ${active.label}`}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all"
        style={{
          background: 'transparent',
          color: active.color,
          border: `0.5px solid ${active.color}`,
          boxShadow: open ? `0 0 0 2px ${active.color}33` : undefined,
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: active.color,
              flexShrink: 0,
            }}
          />
          <span className="truncate">{active.label}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          style={{
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : undefined,
            flexShrink: 0,
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Investment strategy"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl py-1"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          }}
        >
          {options.map((opt) => {
            const isActive = opt.id === activeId
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-left transition-colors"
                  style={{
                    background: isActive ? `${opt.color}1f` : 'transparent',
                    color: isActive ? opt.color : 'var(--text-heading)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opt.color,
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate flex-1">{opt.label}</span>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path
                        d="M4 10.5L8 14.5L16 6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Cash to close from DealMaker sliders (must stay aligned with DealMakerWorksheet). */
function cashNeededFromLtrState(s: LTRDealMakerState): number {
  const buy = s.buyPrice
  if (buy <= 0) return 0
  const cc = buy * s.closingCostsPercent
  const sc = Math.max(0, s.sellerFinancingAmount ?? 0)
  const loan = Math.max(0, buy - buy * s.downPaymentPercent - sc)
  // Sources & uses: (price + closing + rehab) − (bank loan + seller note). May be negative.
  return buy + cc + (s.rehabBudget ?? 0) - loan - sc
}

function cashNeededFromStrState(s: STRDealMakerState): number {
  const buy = s.buyPrice
  if (buy <= 0) return 0
  const cc = buy * s.closingCostsPercent
  const sc = Math.max(0, s.sellerFinancingAmount ?? 0)
  const loan = Math.max(0, buy - buy * s.downPaymentPercent - sc)
  const extra = (s.rehabBudget ?? 0) + (s.furnitureSetupCost ?? 0)
  // Sources & uses: (price + closing + rehab + furniture) − (bank loan + seller note).
  return buy + cc + extra - loan - sc
}

// Types from existing verdict system
interface BackendAnalysisResponse {
  deal_score: number
  deal_verdict: string
  verdict_description: string
  discount_percent: number
  strategies: Array<{
    id: string
    name: string
    metric: string
    metric_label: string
    metric_value: number
    score: number
    rank: number
    badge: string | null
    cap_rate?: number
    cash_on_cash?: number
    dscr?: number
    monthly_cash_flow?: number
    annual_cash_flow?: number
    breakdown?: Record<string, number>
  }>
  purchase_price: number
  income_value: number
  list_price: number
  valuation_snapshot?: {
    noi?: number
    income_value?: number | null
    incomeValue?: number | null
    purchase_price?: number
    purchasePrice?: number
    monthly_cash_flow?: number
    monthlyCashFlow?: number
    price_gap_to_income_pct?: number | null
    priceGapToIncomePct?: number | null
    formula_version?: number
    formulaVersion?: number
  }
  return_factors?: {
    capRate?: number
    cashOnCash?: number
    dscr?: number
    annualRoi?: number
  }
  opportunity_factors?: {
    dealGap?: number
    motivation?: number
    motivationLabel?: string
    buyerMarket?: string
  }
  opportunity?: { score?: number }
  [key: string]: any
}

function formatCurrency(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

const colors = {
  brand: {
    blue: 'var(--accent-sky)',
    teal: 'var(--accent-sky)',
    gold: 'var(--status-warning)',
  },
  text: {
    primary: 'var(--text-heading)',
    body: 'var(--text-body)',
  },
  background: {
    cardUp: 'var(--surface-card)',
    card: 'var(--surface-card)',
  },
  status: {
    positive: 'var(--status-positive)',
    negative: 'var(--status-negative)',
  },
  accentBg: {
    green: 'var(--color-green-dim)',
    red: 'var(--color-red-dim)',
    gold: 'var(--color-gold-dim)',
  },
  ui: {
    border: 'var(--border-subtle)',
  },
} as const

function toStrategyType(backendId: string): StrategyType {
  const map: Record<string, StrategyType> = {
    'long-term-rental': 'ltr',
    'short-term-rental': 'str',
    brrrr: 'brrrr',
    'fix-and-flip': 'flip',
    'house-hack': 'house_hack',
    wholesale: 'wholesale',
  }
  return map[backendId] || 'ltr'
}

function StrategyContent() {
  const router = useRouter()
  const searchParams = useAppSearchParams()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: sessionLoading } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()

  const addressParam = searchParams.get('address') || ''
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  const strategyParam = searchParams.get('strategy')
  const worksheetSectionParam = parseStrategyWorksheetSection(searchParams.get('section'))
  const { fetchProperty } = usePropertyData()
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  /** Matches `data` to `addressParam` so we never show another property's paths during a fetch. */
  const [analysisAddressKey, setAnalysisAddressKey] = useState<string | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  // Admin-resolved operating defaults (capex / utilities / pest control) drive
  // the Deal Gap bar's live Income Value during slider edits before the backend
  // recalc returns. Without this, the bar uses compile-time fallbacks and can
  // disagree with the worksheet when the admin has tuned `OPERATING.*`.
  const adminZipCode = (propertyInfo?.address?.zip_code ?? propertyInfo?.address?.zip) || undefined
  const { defaults: adminDefaults } = useDefaults(adminZipCode)
  const dealGapOperatingOverrides = useMemo(
    () =>
      adminDefaults
        ? {
            capexPct: adminDefaults.operating?.capex_pct,
            utilitiesMonthly: adminDefaults.operating?.utilities_monthly,
            landscapingAnnual: adminDefaults.operating?.landscaping_annual,
            pestControlAnnual: adminDefaults.operating?.pest_control_annual,
          }
        : null,
    [adminDefaults],
  )
  const [isLoading, setIsLoading] = useState(() => {
    if (!addressParam) return true
    const canonical = canonicalizeAddressForIdentity(addressParam)
    return !queryClient.getQueryData(['property-search', canonical])
  })
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(strategyParam)
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null, mashvisor: null },
  })
  const [sourceOverrides, setSourceOverrides] = useState<{ price?: number; monthlyRent?: number }>(
    {},
  )
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [nextStepsOpen, setNextStepsOpen] = useState(false)
  const [showDealGapVideo, setShowDealGapVideo] = useState(false)
  const [pitchModalStructure, setPitchModalStructure] = useState<DealStructure | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recalcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolvedAddressRef = useRef(addressParam)
  /** After first successful property load, refetches skip full-page loader (DealMaker sliders / session echo). */
  const hasLoadedPropertyRef = useRef(false)
  const threePathsScenarioKeyRef = useRef<string | null>(null)
  /** Set when a ?scenario= patch is applied before property data has loaded, so we
   *  can recompute the verdict once `propertyInfo` is available. */
  const pendingScenarioRecalcRef = useRef(false)
  /** Synced every render after `worksheetState` is computed (below early returns). */
  const worksheetStateRef = useRef<AnyStrategyState | null>(null)
  const currentStrategyTypeRef = useRef<StrategyType>('ltr')

  useEffect(() => {
    hasLoadedPropertyRef.current = false
  }, [addressParam])

  // Overrides from sessionStorage (Verdict / DealMaker page) — drives initial API fetch.
  const [initialOverrides, setInitialOverrides] = useState<Record<string, any> | null>(null)
  // Inline slider overrides — local-only, never re-triggers API fetch.
  const [inlineOverrides, setInlineOverrides] = useState<Record<string, any>>({})
  /** True after worksheet edits once a property is saved — drives "Save worksheet" CTA. */
  const [worksheetDirty, setWorksheetDirty] = useState(false)
  /** Mirrors `inlineOverrides` for debounced recalc so we always merge the latest committed state. */
  const inlineOverridesRef = useRef<Record<string, any>>({})
  useEffect(() => {
    inlineOverridesRef.current = inlineOverrides
  }, [inlineOverrides])
  // Currently applied Three Paths structure (so the matching button highlights).
  const [appliedPathId, setAppliedPathId] = useState<string | null>(null)
  // Worksheet state-field names whose value the most recently applied path
  // actually changed vs the prior baseline. Drives the soft glow on
  // SliderRow's via WorksheetHighlightContext.
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(() => new Set())

  // Wipe highlights whenever the analyzed address changes — different property,
  // different baseline.
  useEffect(() => {
    setHighlightedFields(new Set())
    setAppliedPathId(null)
  }, [addressParam])
  // Merged view used by all downstream calculations.
  const dealMakerOverrides = useMemo(() => {
    if (!initialOverrides && Object.keys(inlineOverrides).length === 0) return null
    return { ...(initialOverrides ?? {}), ...inlineOverrides }
  }, [initialOverrides, inlineOverrides])

  /**
   * Parse `data.deal_structures` into the typed `DealStructure[]` shape used by
   * the Verdict page's `FourPathsPanel`. We re-use the same structure so the
   * Strategy "Apply a Path" buttons share a single source of truth.
   */
  const dealStructurePaths = useMemo<DealStructure[]>(() => {
    const addrKey = addressParam ? canonicalizeAddressForIdentity(addressParam) : ''
    if (!addrKey || analysisAddressKey !== addrKey) return []
    // FastAPI serializes IQVerdictResponse with camelCase aliases (`dealStructures`);
    // keep snake_case for any client that still receives it.
    const d = data as Record<string, unknown> | null
    const raw =
      (d?.deal_structures as Record<string, unknown> | undefined) ??
      (d?.dealStructures as Record<string, unknown> | undefined)
    if (!raw) return []
    const mapped = mapDealStructuresFromApi(raw)
    if (!mapped || mapped.paths.length === 0) {
      if (mapped?.hasPaths === false) return []
      return []
    }
    return mapped.paths
  }, [data, addressParam, analysisAddressKey])

  /**
   * After a path is applied, `scheduleRecalc` can return a verdict payload with
   * `dealStructures` omitted (backend sets it to null when `has_paths` is
   * false). Keep the last non-empty list so the four Path buttons stay visible
   * and re-selectable; refresh from the server whenever a new non-empty
   * payload arrives.
   */
  const [cachedDealStructurePaths, setCachedDealStructurePaths] = useState<DealStructure[]>([])

  // Clear first, then refill from the latest payload in a separate effect below.
  // If these run in the opposite order, the address effect wipes the cache after
  // we populate it — so after a recalc omits `dealStructures`, buttons disappear.
  useEffect(() => {
    setCachedDealStructurePaths([])
    setAnalysisAddressKey(null)
  }, [addressParam])

  useEffect(() => {
    if (dealStructurePaths.length > 0) {
      setCachedDealStructurePaths(dealStructurePaths)
    }
  }, [dealStructurePaths])

  const displayDealStructurePaths = useMemo(
    () => (dealStructurePaths.length > 0 ? dealStructurePaths : cachedDealStructurePaths),
    [dealStructurePaths, cachedDealStructurePaths],
  )

  /**
   * Lock the visual order of the four Path buttons to the first non-empty
   * lineup we receive for a given address. Without this, applying a path
   * triggers a backend recalc which promotes the just-applied structure to
   * highest-ranked, so it takes slot 1 on the next render — making it look
   * like the buttons "rotate" each time the user clicks one. Buttons keyed
   * by structure id stay in their original slots; new structures (rare,
   * but possible if a recalc surfaces a previously-unranked option) are
   * appended to the end so existing slots never move.
   */
  const [lockedPathOrder, setLockedPathOrder] = useState<string[]>([])

  useEffect(() => {
    setLockedPathOrder([])
  }, [addressParam])

  useEffect(() => {
    if (displayDealStructurePaths.length === 0) return
    setLockedPathOrder((prev) => {
      if (prev.length === 0) {
        return displayDealStructurePaths.map((p) => p.id)
      }
      const known = new Set(prev)
      const additions = displayDealStructurePaths.map((p) => p.id).filter((id) => !known.has(id))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [displayDealStructurePaths])

  const orderedDealStructurePaths = useMemo(() => {
    if (lockedPathOrder.length === 0) return displayDealStructurePaths
    const byId = new Map(displayDealStructurePaths.map((p) => [p.id, p]))
    return lockedPathOrder
      .map((id) => byId.get(id))
      .filter((p): p is DealStructure => p !== undefined)
  }, [displayDealStructurePaths, lockedPathOrder])

  /** Fire once per address when the Strategy page surfaces path buttons. */
  const pathsRenderedAddressRef = useRef<string | null>(null)
  useEffect(() => {
    if (displayDealStructurePaths.length === 0) return
    if (pathsRenderedAddressRef.current === addressParam) return
    pathsRenderedAddressRef.current = addressParam
    trackEvent('three_paths_rendered_in_strategy', {
      path_count: displayDealStructurePaths.length,
      address_present: Boolean(addressParam),
    })
  }, [displayDealStructurePaths.length, addressParam])

  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    const loadOverrides = () => {
      try {
        const parsed = readDealMakerOverrides(addressParam)
        if (!(parsed?.timestamp && Date.now() - parsed.timestamp < 3600000)) return
        if (isInitialOverrideEligible(parsed)) {
          console.log(
            '[StrategyIQ] Loaded eligible DealMaker overrides from sessionStorage:',
            parsed,
          )
          setInitialOverrides(parsed)
          const storedListPrice = typeof parsed.listPrice === 'number' ? parsed.listPrice : null
          if (storedListPrice != null && storedListPrice > 0) {
            setSourceOverrides((prev) => ({ ...prev, price: storedListPrice }))
          }
          if (!strategyParam && typeof parsed.strategy === 'string' && parsed.strategy) {
            setSelectedStrategyId(parsed.strategy)
          }
        } else if (parsed?.origin === 'source_selection') {
          const srcPatch: Record<string, number> = {}
          if (typeof parsed.listPrice === 'number' && parsed.listPrice > 0)
            srcPatch.price = parsed.listPrice
          if (typeof parsed.monthlyRent === 'number' && parsed.monthlyRent > 0)
            srcPatch.monthlyRent = parsed.monthlyRent
          if (Object.keys(srcPatch).length > 0) {
            setSourceOverrides((prev) => ({ ...prev, ...srcPatch }))
          }
        }
      } catch (e) {
        console.warn('[StrategyIQ] Failed to read sessionStorage:', e)
      }
    }
    loadOverrides()
    // Do not subscribe to dealMakerOverridesUpdated: this page writes session on slider change;
    // re-loading would setInitialOverrides and retrigger full fetch + loading flash. Initial read on mount is enough.
  }, [addressParam, strategyParam])

  // Three Paths: apply ?scenario= base64 payload from Verdict, then strip from URL.
  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    const sc = searchParams.get('scenario')
    if (!sc) return
    const dedupeKey = `${addressParam}|${sc}`
    if (threePathsScenarioKeyRef.current === dedupeKey) return
    threePathsScenarioKeyRef.current = dedupeKey

    let decoded = decodeScenario(sc)
    if (!decoded) {
      decoded = readLastAppliedScenario()
    }
    if (!decoded) return
    const scenario = decoded
    writeLastAppliedScenario(scenario)

    const patch = preLoadedRecordToDealMakerPatch((scenario.levers ?? {}) as Record<string, unknown>)

    // Apply the patch to the inline-override layer — the SAME layer the in-page
    // "Apply an Option" buttons (applyPathPatch) write to. This autofills the
    // worksheet AND lets "Reset to baseline" cleanly remove it. Writing to
    // session with origin 'verdict_sync' alone is not enough: that origin is not
    // `isInitialOverrideEligible`, so it never reaches the worksheet calc.
    setInlineOverrides((prev) => {
      const cleared: Record<string, unknown> = { ...prev }
      for (const key of PATH_PATCH_FIELD_KEYS) {
        delete cleared[key as string]
      }
      const next = {
        ...cleared,
        ...patch,
        threePathsLabel: scenario.label,
      }
      inlineOverridesRef.current = next as Record<string, any>
      return next as Record<string, any>
    })

    // Keep session in sync so the DealMaker tab reflects the same numbers.
    try {
      writeDealMakerOverrides(
        addressParam,
        { ...patch, threePathsLabel: scenario.label } as Record<string, unknown>,
        { origin: 'verdict_sync' },
      )
    } catch {
      /* ignore */
    }

    // Mark the matching Option as selected so the worksheet's path UI reflects
    // the structure the user opened from Discovery (highlight + applied card).
    if (scenario.structureId) {
      setAppliedPathId(scenario.structureId)
    }

    // Glow the worksheet rows this Option fills in — same accent the in-page
    // "Apply an Option" button (applyPathPatch) sets. Without this, opening from
    // Discovery auto-populated the worksheet but left the changed fields un-highlighted.
    setHighlightedFields(
      computeHighlightedStateFields(
        patch,
        worksheetStateRef.current,
        currentStrategyTypeRef.current,
      ),
    )

    // Recompute the verdict panel against the freshly applied overrides. If the
    // property hasn't loaded yet (arriving via URL), recalcVerdict is a no-op, so
    // flag a pending recalc that fires once `propertyInfo` is available.
    pendingScenarioRecalcRef.current = true
    scheduleRecalc()
    markWorksheetDirty()

    appendSavedThreePathScenario({
      label: scenario.label,
      structureId: scenario.structureId,
      savedAt: Date.now(),
      address: addressParam,
      payload: scenario,
    })

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('scenario')
    router.replace(`/strategy?${nextParams.toString()}`, { scroll: false })
    // scheduleRecalc / markWorksheetDirty are declared after this effect; calling
    // them in the body is safe (resolved at run time), but they must stay out of
    // the deps array to avoid a temporal-dead-zone reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressParam, searchParams, router])

  const savePropertySnapshot = useMemo(() => {
    if (!addressParam || !propertyInfo) return undefined
    const addr = propertyInfo.address || {}
    const strStats = propertyInfo.rentals?.str_market_stats
    return {
      street: addr.street ?? (addressParam.split(',')[0]?.trim() || ''),
      city: addr.city ?? '',
      state: addr.state ?? '',
      zipCode: addr.zip_code ?? addr.zip ?? '',
      bedrooms: propertyInfo.details?.bedrooms,
      bathrooms: propertyInfo.details?.bathrooms,
      sqft: propertyInfo.details?.square_footage,
      listPrice: propertyInfo.price,
      zpid: propertyInfo.zpid,
      // Persist Mashvisor /rental-rates data so the worksheet keeps using
      // it after save/reload without re-fetching.
      monthlyStrRevenuePerBed: strStats?.monthly_revenue_per_bed ?? undefined,
      monthlyStrRevenueSampleSize: strStats?.monthly_revenue_sample_size ?? undefined,
    }
  }, [addressParam, propertyInfo])

  const resolvedAddress = (propertyInfo?.address?.full_address || addressParam).trim()
  resolvedAddressRef.current = resolvedAddress

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (recalcDebounceRef.current) clearTimeout(recalcDebounceRef.current)
    }
  }, [resolvedAddress])

  const { isSaved, isSaving, save, toggle, savedPropertyId } = useSaveProperty({
    displayAddress: resolvedAddress,
    propertySnapshot: savePropertySnapshot,
  })
  const { record: dealRecord } = useDealSnapshot(savedPropertyId)

  const strategyTypeForPersistence = toStrategyType(
    selectedStrategyId ?? strategyParam ?? 'long-term-rental',
  )

  const markWorksheetDirty = useCallback(() => {
    setWorksheetDirty(true)
  }, [])

  const { saveWorksheet, isSavingWorksheet } = useSaveStrategyWorksheet({
    savedPropertyId,
    strategyType: strategyTypeForPersistence,
    getWorksheetState: () => worksheetStateRef.current,
  })

  useEffect(() => {
    if (!addressParam || !dealRecord) return
    const canonical = canonicalizeAddressForIdentity(addressParam)
    const propData = queryClient.getQueryData(['property-search', canonical]) as
      | import('@dealscope/shared').PropertyResponse
      | undefined
    if (!propData) return
    setIqSources(
      mapPropertyToIQSources(propData, {
        marketValueOverride: dealRecord.market_value_override,
        monthlyRentOverride: dealRecord.monthly_rent_override,
      }),
    )
  }, [addressParam, dealRecord, queryClient])

  // Keep browser from restoring a mid-page scroll when landing on Strategy.
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
    const prev = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = prev
    }
  }, [])

  // Distance from the viewport top to just under the sticky property address
  // bar (safe-area inset + the live-measured address-bar height).
  const measureStrategyAddressOffset = useCallback(() => {
    if (typeof window === 'undefined') return 0
    const root = document.documentElement
    const addressH = parseFloat(
      getComputedStyle(root).getPropertyValue('--app-address-bar-height') || '0',
    )
    let safeInset = 0
    try {
      const probe = document.createElement('div')
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.style.paddingTop = 'env(safe-area-inset-top)'
      document.body.appendChild(probe)
      safeInset = parseFloat(getComputedStyle(probe).paddingTop) || 0
      document.body.removeChild(probe)
    } catch {
      /* ignore */
    }
    return safeInset + addressH
  }, [])

  const scrollStrategyToDealGapBar = useCallback(() => {
    if (typeof window === 'undefined') return
    const bar = document.getElementById('strategy-deal-gap-bar')
    if (!bar) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      return
    }
    const stickyTop = measureStrategyAddressOffset()
    // The bar is position: sticky. If the page lands already scrolled (e.g. the
    // browser carried over the Discovery scroll position on client-side nav),
    // the bar is already pinned, so getBoundingClientRect() returns its stuck
    // position — we'd compute target === current scrollY and never realign,
    // leaving the page scrolled past the bar onto the content below it. Reset to
    // the top first so the bar reports its natural document position.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const barDocTop = bar.getBoundingClientRect().top + window.scrollY
    const target = Math.max(0, barDocTop - stickyTop)
    window.scrollTo({ top: target, left: 0, behavior: 'instant' })
  }, [measureStrategyAddressOffset])

  // After an Option is picked, bring its card to the top of view — directly
  // under the sticky address bar + Deal Gap bar so it reads as the focus.
  const scrollStrategyToOptionCard = useCallback(() => {
    if (typeof window === 'undefined') return
    const card = document.getElementById('strategy-option-card')
    if (!card) return
    const bar = document.getElementById('strategy-deal-gap-bar')
    const barH = bar ? bar.getBoundingClientRect().height : 0
    const stickyTop = measureStrategyAddressOffset() + barH
    const cardDocTop = card.getBoundingClientRect().top + window.scrollY
    const target = Math.max(0, cardDocTop - stickyTop - 8)
    window.scrollTo({ top: target, left: 0, behavior: 'smooth' })
  }, [measureStrategyAddressOffset])

  // Initial load: align Deal Gap bar under the sticky property address bar.
  const shouldScrollToDealGapBar =
    !worksheetSectionParam && !isLoading && !!data

  useLayoutEffect(() => {
    if (!shouldScrollToDealGapBar) return
    scrollStrategyToDealGapBar()
  }, [shouldScrollToDealGapBar, addressParam, scrollStrategyToDealGapBar])

  // Re-align across animation frames while the page settles — data, fonts, and
  // async panels (verdict recalculation, worksheet) can shift the bar's
  // position after the first paint, which the old fixed 120/320ms retries
  // missed. Stops early once the position holds steady, after ~1.5s, or the
  // instant the user scrolls so we never fight their input.
  useEffect(() => {
    if (!shouldScrollToDealGapBar || typeof window === 'undefined') return

    let raf = 0
    let cancelled = false
    let lastTop = -1
    let stableFrames = 0
    const start = performance.now()

    const stop = () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
    }

    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.addEventListener('pointerdown', stop)

    const tick = () => {
      if (cancelled) return
      scrollStrategyToDealGapBar()
      const top = Math.round(window.scrollY)
      if (top === lastTop) {
        stableFrames += 1
      } else {
        stableFrames = 0
        lastTop = top
      }
      if (stableFrames < 3 && performance.now() - start < 1500) {
        raf = requestAnimationFrame(tick)
      } else {
        stop()
      }
    }
    raf = requestAnimationFrame(tick)
    return stop
  }, [shouldScrollToDealGapBar, addressParam, scrollStrategyToDealGapBar])

  const hasRecordedAnalysisRef = useRef(false)

  useEffect(() => {
    if (
      !isLoading &&
      data &&
      addressParam &&
      isAuthenticated &&
      !isPro &&
      !hasRecordedAnalysisRef.current
    ) {
      hasRecordedAnalysisRef.current = true
      api
        .post('/api/v1/billing/usage/record-analysis')
        .then(() => queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] }))
        .catch(() => {})
    }
  }, [isLoading, data, addressParam, isAuthenticated, isPro, queryClient])

  const toPayloadBase = useCallback((propInfo: any): VerdictPayloadBase => {
    const v = propInfo?.valuations || propInfo || {}
    return {
      listPrice: propInfo?.price ?? 1,
      monthlyRent: propInfo?.monthlyRent ?? 0,
      propertyTaxes: propInfo?.propertyTaxes ?? 0,
      insurance: propInfo?.insurance ?? 0,
      hoaFeesMonthly: propInfo?.market?.hoa_fees_monthly ?? null,
      bedrooms: propInfo?.details?.bedrooms || 3,
      bathrooms: propInfo?.details?.bathrooms || 2,
      sqft: propInfo?.details?.square_footage || 1500,
      arv: propInfo?.arv ?? null,
      averageDailyRate: propInfo?.averageDailyRate ?? null,
      occupancyRate: propInfo?.occupancyRate ?? null,
      isListed: propInfo?._isListed ?? undefined,
      zestimate: v.zestimate ?? undefined,
      currentValueAvm: v.current_value_avm ?? undefined,
      taxAssessedValue: v.tax_assessed_value ?? undefined,
      listingStatus: propInfo?.listing?.listing_status ?? propInfo?.listingStatus ?? undefined,
      daysOnMarket: propInfo?.listing?.days_on_market ?? undefined,
      sellerType: propInfo?.listing?.seller_type ?? undefined,
      isForeclosure: propInfo?.listing?.is_foreclosure || false,
      isBankOwned: propInfo?.listing?.is_bank_owned || false,
      isFsbo: propInfo?.listing?.is_fsbo || false,
      marketTemperature: propInfo?.market?.market_stats?.market_temperature || undefined,
      state: propInfo?.state ?? undefined,
    }
  }, [])

  // Debounced backend recalculation — calls verdict API with all current overrides
  const recalcVerdict = useCallback(
    async (
      propInfo: any,
      overrides: Record<string, any> | null,
      srcOverrides: {
        price?: number
        monthlyRent?: number
        marketValueOverride?: number | null
        monthlyRentOverride?: number | null
      },
    ) => {
      if (!propInfo) return
      try {
        setIsRecalculating(true)
        const mergedSrc: typeof srcOverrides = {
          ...srcOverrides,
          marketValueOverride:
            dealRecord?.market_value_override ?? srcOverrides.marketValueOverride,
          monthlyRentOverride:
            dealRecord?.monthly_rent_override ?? srcOverrides.monthlyRentOverride,
        }
        const payload = buildVerdictAnalysisPayload(
          toPayloadBase(propInfo),
          overrides,
          mergedSrc,
        )
        const analysis = await api.post<BackendAnalysisResponse>(
          '/api/v1/analysis/verdict',
          payload,
        )
        setData(analysis)
        if (addressParam) {
          setAnalysisAddressKey(canonicalizeAddressForIdentity(addressParam))
        }
      } catch (err) {
        console.error('[StrategyIQ] Recalculation failed:', err)
      } finally {
        setIsRecalculating(false)
      }
    },
    [toPayloadBase, addressParam, dealRecord?.market_value_override, dealRecord?.monthly_rent_override],
  )

  const verdictSourceOverrides = useMemo(
    () => ({
      ...sourceOverrides,
      marketValueOverride: dealRecord?.market_value_override ?? null,
      monthlyRentOverride: dealRecord?.monthly_rent_override ?? null,
    }),
    [sourceOverrides, dealRecord?.market_value_override, dealRecord?.monthly_rent_override],
  )

  useEffect(() => {
    async function fetchData() {
      if (!addressParam) {
        setError('No address')
        setIsLoading(false)
        return
      }

      let fetchAddr = addressParam
      if (!isLikelyFullAddress(fetchAddr) && typeof window !== 'undefined') {
        const activeAddr = sessionStorage.getItem('dealMaker_activeAddress')
        // Match the full street segment (before first comma) rather than just
        // a prefix, so "1451 NW 10th St" doesn't wrongly match "1451 SW 10th St"
        const inputStreet = fetchAddr.split(',')[0].trim().toLowerCase()
        const activeStreet = activeAddr?.split(',')[0].trim().toLowerCase()
        if (activeAddr && isLikelyFullAddress(activeAddr) && inputStreet === activeStreet) {
          fetchAddr = activeAddr
        }
      }

      const canonical = canonicalizeAddressForIdentity(fetchAddr)
      const hasCachedProperty = !!queryClient.getQueryData(['property-search', canonical])
      const showBlockingLoader = !hasCachedProperty && !hasLoadedPropertyRef.current
      try {
        if (showBlockingLoader) setIsLoading(true)
        const propData = await fetchProperty(fetchAddr)
        const appraiserOverrides = {
          marketValueOverride: dealRecord?.market_value_override ?? null,
          monthlyRentOverride: dealRecord?.monthly_rent_override ?? null,
        }
        const baseDefaults = buildVerdictBaseFromPropertyResponse(propData, {
          condition: conditionParam ? Number(conditionParam) : null,
          location: locationParam ? Number(locationParam) : null,
          ...appraiserOverrides,
        })
        let price = baseDefaults.listPrice
        let monthlyRent = baseDefaults.monthlyRent
        let propertyTaxes = baseDefaults.propertyTaxes
        let insuranceVal = baseDefaults.insurance

        if (dealMakerOverrides) {
          if (dealMakerOverrides.listPrice != null && dealMakerOverrides.listPrice > 0) {
            price = dealMakerOverrides.listPrice
          } else if (dealMakerOverrides.price != null && dealMakerOverrides.price > 0) {
            price = dealMakerOverrides.price
          }
          if (dealMakerOverrides.monthlyRent != null) monthlyRent = dealMakerOverrides.monthlyRent
          if (dealMakerOverrides.propertyTaxes != null)
            propertyTaxes = dealMakerOverrides.propertyTaxes
          if (dealMakerOverrides.insurance != null) insuranceVal = dealMakerOverrides.insurance
        }

        const isListed = !!baseDefaults.isListed && price > 0
        const enrichedPropInfo = {
          ...propData,
          price,
          monthlyRent,
          propertyTaxes,
          insurance: insuranceVal,
          _isListed: isListed,
        }
        setPropertyInfo(enrichedPropInfo)

        setIqSources(mapPropertyToIQSources(propData, appraiserOverrides))

        const payload = buildVerdictAnalysisPayload(
          toPayloadBase(enrichedPropInfo),
          dealMakerOverrides,
          appraiserOverrides,
        )
        const analysis = await api.post<BackendAnalysisResponse>(
          '/api/v1/analysis/verdict',
          payload,
        )
        setData(analysis)
        setAnalysisAddressKey(canonical)
        hasLoadedPropertyRef.current = true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (showBlockingLoader) setIsLoading(false)
      }
    }
    fetchData()
    // Inline slider changes merge into dealMakerOverrides but must NOT refetch property + full-page loader — use debounced recalcVerdict only.
    // sourceOverrides changes are handled by recalcVerdict from IQ selector, not a full refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps
  }, [addressParam, conditionParam, locationParam, initialOverrides, toPayloadBase, fetchProperty])

  const handleBack = useCallback(() => {
    router.push(`/discovery?address=${encodeURIComponent(resolvedAddress)}`)
  }, [router, resolvedAddress])

  const handleStrategyChange = useCallback(
    (strategyId: string) => {
      setSelectedStrategyId(strategyId)
      // Highlights are tracked under per-strategy state-field names; switching
      // strategies invalidates them.
      setHighlightedFields(new Set())
      const merged = { ...(initialOverrides ?? {}), ...inlineOverrides }
      recalcVerdict(propertyInfo, merged, verdictSourceOverrides)
    },
    [initialOverrides, inlineOverrides, propertyInfo, verdictSourceOverrides, recalcVerdict],
  )

  // Debounced verdict recalc — reads overrides from `inlineOverridesRef` at fire time so merges stay in sync with React state.
  const scheduleRecalc = useCallback(() => {
    if (recalcDebounceRef.current) clearTimeout(recalcDebounceRef.current)
    recalcDebounceRef.current = setTimeout(() => {
      const merged = { ...(initialOverrides ?? {}), ...inlineOverridesRef.current }
      recalcVerdict(propertyInfo, merged, verdictSourceOverrides)
    }, 300)
  }, [initialOverrides, propertyInfo, verdictSourceOverrides, recalcVerdict])

  // Fire the pending recalc once property data is available for a scenario that
  // was applied from the URL before the property finished loading.
  useEffect(() => {
    if (!pendingScenarioRecalcRef.current || !propertyInfo) return
    pendingScenarioRecalcRef.current = false
    const merged = { ...(initialOverrides ?? {}), ...inlineOverridesRef.current }
    recalcVerdict(propertyInfo, merged, verdictSourceOverrides)
  }, [propertyInfo, initialOverrides, verdictSourceOverrides, recalcVerdict])

  const handleInlineSliderChange = useCallback(
    (field: keyof InlineDealMakerValues, value: number) => {
      const FIELD_MAP: Record<
        keyof InlineDealMakerValues,
        { key: string; toOverride?: (v: number) => number }
      > = {
        buyPrice: { key: 'purchasePrice' },
        downPayment: { key: 'downPayment', toOverride: (v) => v * 100 },
        closingCosts: { key: 'closingCosts', toOverride: (v) => v * 100 },
        interestRate: { key: 'interestRate' },
        loanTerm: { key: 'loanTerm' },
        sellerFinancingAmount: { key: 'sellerFinancingAmount' },
        sellerInterestRate: { key: 'sellerInterestRate' },
        sellerTermYears: { key: 'sellerTermYears' },
        rehabBudget: { key: 'rehabBudget' },
        marketValue: { key: 'listPrice' },
        arv: { key: 'arv' },
        monthlyRent: { key: 'monthlyRent' },
        vacancyRate: { key: 'vacancyRate', toOverride: (v) => v * 100 },
        propertyTaxes: { key: 'propertyTaxes' },
        insurance: { key: 'insurance' },
        managementRate: { key: 'managementRate', toOverride: (v) => v * 100 },
      }
      const mapping = FIELD_MAP[field]
      const overrideValue = mapping.toOverride ? mapping.toOverride(value) : value
      if (field === 'marketValue') {
        setSourceOverrides((prev) => ({ ...prev, price: value }))
      }
      setInlineOverrides((prev) => {
        const next = { ...prev, [mapping.key]: overrideValue }
        inlineOverridesRef.current = next
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          try {
            writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'dealmaker_edit' })
          } catch {
            /* ignore */
          }
        }, 300)
        scheduleRecalc()
        markWorksheetDirty()
        return next
      })
      // A manual slider edit invalidates the path-applied glow on this field.
      setHighlightedFields((prev) => {
        if (prev.size === 0) return prev
        const stateField = inlineOverrideKeyToStateField(
          mapping.key,
          currentStrategyTypeRef.current,
        )
        if (!stateField || !prev.has(stateField)) return prev
        const next = new Set(prev)
        next.delete(stateField)
        return next
      })
    },
    [scheduleRecalc, markWorksheetDirty],
  )

  /**
   * Apply a Three Paths structure to the worksheet directly (bypasses the
   * slider FIELD_MAP scaling because `preLoadedRecordToDealMakerPatch` already
   * returns values in the canonical `inlineOverrides` shape). Persists to
   * session so the DealMaker tab stays in sync, and triggers a debounced recalc.
   */
  const applyPathPatch = useCallback(
    (structure: DealStructure, idx: number) => {
      const patch = preLoadedRecordToDealMakerPatch(structure.preLoadedRecord ?? {})
      setInlineOverrides((prev) => {
        // Reset any prior path-applied fields back to baseline before layering
        // the new patch — otherwise switching Path 1 → Path 2 leaves stale
        // auto-fills (e.g. Path 1's purchasePrice) when Path 2 only touches
        // a different subset of fields.
        const cleared: Record<string, unknown> = { ...prev }
        for (const key of PATH_PATCH_FIELD_KEYS) {
          delete cleared[key as string]
        }
        const next = {
          ...cleared,
          ...patch,
          threePathsLabel: `Path ${idx + 1} — ${structure.familyLabel || structure.headline}`,
        }
        inlineOverridesRef.current = next as Record<string, any>
        try {
          writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'verdict_sync' })
        } catch {
          /* ignore */
        }
        scheduleRecalc()
        markWorksheetDirty()
        return next as Record<string, any>
      })
      setAppliedPathId(structure.id)
      setHighlightedFields(
        computeHighlightedStateFields(
          patch,
          worksheetStateRef.current,
          currentStrategyTypeRef.current,
        ),
      )
      trackEvent('path_applied_in_strategy', {
        structure_id: structure.id,
        family: structure.family,
        path_index: idx + 1,
      })
      // Wait for the Option card to mount/paint, then bring it to the top.
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => requestAnimationFrame(scrollStrategyToOptionCard))
      }
    },
    [scheduleRecalc, markWorksheetDirty, scrollStrategyToOptionCard],
  )

  /**
   * Strip every key the path mapper might have written from `inlineOverrides`,
   * persist the cleared state, and trigger a recalc so the worksheet returns
   * to its baseline (backend-derived) values.
   */
  const clearAppliedPath = useCallback(() => {
    setInlineOverrides((prev) => {
      const next: Record<string, unknown> = { ...prev }
      for (const key of PATH_PATCH_FIELD_KEYS) {
        delete next[key as string]
      }
      inlineOverridesRef.current = next as Record<string, any>
      try {
        writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'dealmaker_edit' })
      } catch {
        /* ignore */
      }
      scheduleRecalc()
      return next as Record<string, any>
    })
    setAppliedPathId(null)
    setHighlightedFields(new Set())
    trackEvent('path_cleared_in_strategy')
  }, [scheduleRecalc])

  useEffect(() => {
    if (isLoading || sessionLoading || !data || !worksheetSectionParam) return
    const id = strategyWorksheetAnchorId(worksheetSectionParam)
    const delay = isAuthenticated ? 400 : 550
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, delay)
    return () => window.clearTimeout(t)
  }, [isLoading, sessionLoading, data, worksheetSectionParam, isAuthenticated])

  if (isLoading) {
    return <LoadingProperty message="Loading property analysis..." />
  }

  if (error === 'No address' || error === 'No address provided') {
    return null
  }

  if (error || !data) {
    return (
      <ErrorProperty
        title="Unable to Load Strategy Analysis"
        message={error || 'We couldn’t load the property data needed for strategy comparison.'}
        actionLabel="Try Again"
        onAction={() => window.location.reload()}
        secondaryActionLabel="Back to Verdict"
        onSecondaryAction={handleBack}
      />
    )
  }

  // Strategy selection — user-chosen > URL param > long-term-rental default
  // Default to Long-Term Rental because Target Buy is calculated using that model;
  // other strategies may show a loss at the Target Buy price.
  const sortedStrategies = data.strategies?.length
    ? [...data.strategies].sort((a, b) => b.score - a.score)
    : []
  const topStrategy = selectedStrategyId
    ? sortedStrategies.find((s) => s.id === selectedStrategyId) || sortedStrategies[0] || null
    : sortedStrategies.find((s) => s.id === 'long-term-rental') || sortedStrategies[0] || null
  const topStrategyName = topStrategy?.name || 'Long-Term Rental'
  const recommendedStrategyName = sortedStrategies[0]?.name || 'Long-Term Rental'
  const activeStrategyId = topStrategy?.id || 'long-term-rental'
  const currentStrategyType = toStrategyType(activeStrategyId)

  const optionsHiddenForStrategy = STRATEGIES_WITHOUT_OPTIONS.has(activeStrategyId)
  const strategyExcludeIds = STRATEGY_EXCLUDED_TEMPLATE_IDS[activeStrategyId]
  const strategyFilteredPaths = strategyExcludeIds
    ? orderedDealStructurePaths.filter((p) => !strategyExcludeIds.has(p.id))
    : orderedDealStructurePaths
  const optionsSubtitle = appliedPathId
    ? 'Pre-fills price, rent, financing, and seller-carry sliders.'
    : `Each Option pre-fills the worksheet to show how this could work as a ${STRATEGY_LABEL[activeStrategyId] ?? 'rental'}.`

  const appliedPathEntry = (() => {
    if (!appliedPathId) return null
    const paths = strategyFilteredPaths.slice(0, 4)
    const index = paths.findIndex((p) => p.id === appliedPathId)
    if (index < 0) return null
    return { structure: paths[index], index }
  })()

  // Score — capped at 95 (no deal is 100% certain)
  const verdictScore = Math.min(95, Math.max(0, data.deal_score ?? (data as any).dealScore ?? 0))

  // List / target buy: API is canonical after recalc, but DealMaker session overrides must win
  // immediately so the Deal Gap graph and metric bar match the worksheet (not one request behind).
  const appraiserMarketValue = effectiveMarketValueFromRecord(dealRecord)
  const listPriceBase = data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? 0
  const listPriceOverride = dealMakerOverrides != null ? dealMakerOverrides.listPrice : undefined
  const listPrice =
    appraiserMarketValue != null && appraiserMarketValue > 0
      ? appraiserMarketValue
      : typeof listPriceOverride === 'number' && isFinite(listPriceOverride) && listPriceOverride > 0
        ? listPriceOverride
        : listPriceBase

  const targetFromOverrides =
    dealMakerOverrides != null
      ? (dealMakerOverrides.purchasePrice ?? dealMakerOverrides.buyPrice)
      : undefined
  const targetPrice =
    typeof targetFromOverrides === 'number' &&
    isFinite(targetFromOverrides) &&
    targetFromOverrides > 0
      ? targetFromOverrides
      : (data.purchase_price ?? (data as any).purchasePrice ?? Math.round(listPrice * 0.85))
  const parsed = parseAddressString(addressParam)

  // Strategy-specific financial breakdown from backend
  const bd = topStrategy?.breakdown as Record<string, number> | undefined
  const inputsUsed = (data.inputs_used ?? (data as any).inputsUsed ?? {}) as Record<
    string,
    number | undefined
  >

  // All derived financials come from the backend breakdown
  const effectiveRent = effectiveMonthlyRentFromRecord(dealRecord)
  const monthlyRent =
    effectiveRent != null && effectiveRent > 0
      ? effectiveRent
      : (bd?.monthly_rent ?? propertyInfo?.monthlyRent ?? 0)
  const propertyTaxes = bd?.property_taxes ?? propertyInfo?.propertyTaxes ?? 0
  const insurance = bd?.insurance ?? propertyInfo?.insurance ?? 0
  // Prefer explicit DealMaker/session rehab so sliders win over stale breakdown during debounce;
  // backend `rehab_cost` of 0 must not block a user-entered budget (use `??` only after override check).
  const rehabCost =
    dealMakerOverrides != null && dealMakerOverrides.rehabBudget != null
      ? dealMakerOverrides.rehabBudget
      : (bd?.rehab_cost ??
        (conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0))

  const rate =
    bd?.interest_rate != null ? bd.interest_rate / 100 : (inputsUsed.interest_rate ?? 0.06)
  const downPaymentPct =
    bd?.down_payment_pct != null ? bd.down_payment_pct / 100 : (inputsUsed.down_payment_pct ?? 0.2)
  const closingCostsPct =
    bd?.closing_costs_pct != null
      ? bd.closing_costs_pct / 100
      : (inputsUsed.closing_costs_pct ?? 0.03)
  const loanTermYears = bd?.loan_term_years ?? inputsUsed.loan_term_years ?? 30
  const vacancyPct =
    bd?.vacancy_rate != null ? bd.vacancy_rate / 100 : (inputsUsed.vacancy_rate ?? 0.05)
  const mgmtPct =
    bd?.management_pct != null ? bd.management_pct / 100 : (inputsUsed.management_pct ?? 0.08)
  const maintPct =
    bd?.maintenance_pct != null ? bd.maintenance_pct / 100 : (inputsUsed.maintenance_pct ?? 0.05)
  const reservesPct =
    bd?.reserves_pct != null ? bd.reserves_pct / 100 : (inputsUsed.capex_pct ?? 0.05)

  const downPayment = bd?.down_payment ?? targetPrice * downPaymentPct
  const closingCosts = bd?.closing_costs ?? targetPrice * closingCostsPct
  const sellerFinancingAmount = Math.max(
    0,
    ((dealMakerOverrides as Record<string, number | undefined> | null)?.sellerFinancingAmount ??
      (dealMakerOverrides as Record<string, number | undefined> | null)?.seller_carry_amount ??
      bd?.seller_carry_amount ??
      inputsUsed.seller_carry_amount ??
      0) as number,
  )
  // BRRRR backend breakdown uses refinance loan for `loan_amount` / debt service (post-refi model).
  // This page always renders the LTR-style worksheet, so show acquisition P&I tied to Target Buy.
  const purchaseLoanAmount = Math.max(0, targetPrice - downPayment - sellerFinancingAmount)
  const loanAmount =
    activeStrategyId === 'brrrr' || sellerFinancingAmount > 0
      ? purchaseLoanAmount
      : (bd?.loan_amount ?? purchaseLoanAmount)
  let monthlyPI = bd?.monthly_payment ?? 0
  if (activeStrategyId === 'brrrr') {
    monthlyPI = calculateMortgagePayment(loanAmount, rate * 100, loanTermYears)
  }
  const annualRent = bd?.annual_gross_rent ?? monthlyRent * 12
  const vacancyLoss = bd?.vacancy_loss ?? annualRent * vacancyPct
  const effectiveIncome = bd?.effective_income ?? annualRent - vacancyLoss
  const mgmt = bd?.management ?? annualRent * mgmtPct
  const maint = bd?.maintenance ?? annualRent * maintPct
  const reserves = bd?.reserves ?? annualRent * reservesPct
  const totalExpenses =
    bd?.total_operating_expenses ?? propertyTaxes + insurance + mgmt + maint + reserves
  const noi = bd?.noi ?? effectiveIncome - totalExpenses
  const annualDebt =
    activeStrategyId === 'brrrr' ? monthlyPI * 12 : (bd?.annual_debt_service ?? monthlyPI * 12)
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  const isFlipOrWholesale = activeStrategyId === 'fix-and-flip' || activeStrategyId === 'wholesale'

  // Sources & uses: (price + closing + rehab) − (bank loan + seller note). May be negative
  // when financing exceeds purchase + costs (cash back at close).
  let totalCashNeeded = targetPrice + closingCosts + rehabCost - loanAmount - sellerFinancingAmount
  const dealGapPct = listPrice ? ((listPrice - targetPrice) / listPrice) * 100 : 0
  const strategyDscr =
    activeStrategyId === 'brrrr' && annualDebt > 0 ? noi / annualDebt : (topStrategy?.dscr ?? null)

  // Rental strategies: derive all metrics from breakdown values so the metrics
  // bar, summary cards, and breakdown section stay internally consistent.
  // Flip/wholesale use backend strategy-level metrics (different economics model).
  let strategyCashFlow = isFlipOrWholesale
    ? (topStrategy?.monthly_cash_flow ?? monthlyCashFlow)
    : monthlyCashFlow
  let strategyAnnualCashFlow = isFlipOrWholesale
    ? (topStrategy?.annual_cash_flow ?? annualCashFlow)
    : annualCashFlow
  let capRateVal: number | null = isFlipOrWholesale
    ? ((topStrategy as { cap_rate?: number; capRate?: number })?.capRate ??
      topStrategy?.cap_rate ??
      null)
    : targetPrice > 0
      ? (noi / targetPrice) * 100
      : null
  let cocVal: number | null = isFlipOrWholesale
    ? ((topStrategy as { cash_on_cash?: number; cashOnCash?: number })?.cashOnCash ??
      topStrategy?.cash_on_cash ??
      null)
    : totalCashNeeded > 0
      ? (annualCashFlow / totalCashNeeded) * 100
      : null

  const worksheetState: AnyStrategyState = (() => {
    // Read from the SAME merged source we send to the backend (`dealMakerOverrides`)
    // — not `inlineOverrides` alone. Otherwise initialOverrides (session storage,
    // saved Three Paths scenarios) get sent to the backend silently while the
    // slider UI shows the un-applied default, producing inconsistent math
    // (e.g., $0 seller-financing slider but a $130K seller note in the cash flow).
    const mergedOverrides = (dealMakerOverrides ?? {}) as Record<string, unknown>
    const io = mergedOverrides as Record<string, number | undefined>
    const ioAny = mergedOverrides
    const sf = {
      sellerFinancingAmount:
        (typeof ioAny.sellerFinancingAmount === 'number' ? ioAny.sellerFinancingAmount : null) ??
        (typeof ioAny.seller_carry_amount === 'number' ? ioAny.seller_carry_amount : null) ??
        0,
      sellerInterestRate:
        (typeof ioAny.sellerInterestRate === 'number' ? ioAny.sellerInterestRate : null) ??
        (typeof ioAny.seller_carry_rate === 'number' ? ioAny.seller_carry_rate : null) ??
        0,
      sellerTermYears:
        (typeof ioAny.sellerTermYears === 'number' ? ioAny.sellerTermYears : null) ??
        (typeof ioAny.seller_carry_term_years === 'number'
          ? ioAny.seller_carry_term_years
          : null) ??
        30,
      sellerBalloonYears:
        (typeof ioAny.sellerBalloonYears === 'number' ? ioAny.sellerBalloonYears : null) ??
        (typeof ioAny.seller_carry_balloon_years === 'number'
          ? ioAny.seller_carry_balloon_years
          : null) ??
        10,
      sellerInterestOnly:
        (typeof ioAny.sellerInterestOnly === 'boolean' ? ioAny.sellerInterestOnly : null) ??
        (typeof ioAny.seller_carry_interest_only === 'boolean'
          ? ioAny.seller_carry_interest_only
          : null) ??
        false,
    }
    const arvVal =
      io.arv ?? (dealRecord?.arv && dealRecord.arv > 0 ? dealRecord.arv : null) ?? bd?.arv ?? data?.inputs_used?.arv ?? listPrice

    switch (currentStrategyType) {
      case 'str': {
        const adr = bd?.adr ?? DEFAULT_STR_DEAL_MAKER_STATE.averageDailyRate
        const occRate =
          bd?.occupancy_rate != null
            ? bd.occupancy_rate / 100
            : DEFAULT_STR_DEAL_MAKER_STATE.occupancyRate
        // Bank Loan is the stored financing input; Down Payment is the derived residual.
        const strBuy = io.purchasePrice ?? targetPrice
        const strSeller = Math.max(0, sf.sellerFinancingAmount)
        const strBankLoan =
          typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
        const strDownPct =
          strBankLoan != null && strBuy > 0
            ? Math.max(-1, Math.min(1, (strBuy - strBankLoan - strSeller) / strBuy))
            : io.downPayment != null
              ? io.downPayment / 100
              : downPaymentPct
        return {
          buyPrice: strBuy,
          downPaymentPercent: strDownPct,
          bankLoanAmount: strBankLoan ?? undefined,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          loanType: '30-year' as const,
          interestRate: io.interestRate ?? rate,
          loanTermYears: io.loanTerm ?? loanTermYears,
          rehabBudget: io.rehabBudget ?? rehabCost,
          arv: arvVal,
          furnitureSetupCost:
            io.furnitureSetupCost ??
            bd?.furniture_setup ??
            DEFAULT_STR_DEAL_MAKER_STATE.furnitureSetupCost,
          averageDailyRate: io.averageDailyRate ?? adr,
          occupancyRate: io.occupancyRate ?? occRate,
          cleaningFeeRevenue:
            io.cleaningFeeRevenue ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningFeeRevenue,
          avgLengthOfStayDays:
            io.avgLengthOfStayDays ?? DEFAULT_STR_DEAL_MAKER_STATE.avgLengthOfStayDays,
          platformFeeRate:
            io.platformFeeRate ??
            (bd?.platform_fees_pct != null
              ? bd.platform_fees_pct / 100
              : DEFAULT_STR_DEAL_MAKER_STATE.platformFeeRate),
          strManagementRate:
            io.strManagementRate ??
            (bd?.management_pct != null
              ? bd.management_pct / 100
              : DEFAULT_STR_DEAL_MAKER_STATE.strManagementRate),
          cleaningCostPerTurnover:
            io.cleaningCostPerTurnover ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningCostPerTurnover,
          suppliesMonthly:
            io.suppliesMonthly ??
            (bd?.supplies != null
              ? bd.supplies / 12
              : DEFAULT_STR_DEAL_MAKER_STATE.suppliesMonthly),
          additionalUtilitiesMonthly:
            io.additionalUtilitiesMonthly ??
            (bd?.utilities != null
              ? bd.utilities / 12
              : DEFAULT_STR_DEAL_MAKER_STATE.additionalUtilitiesMonthly),
          maintenanceRate: io.maintenanceRate ?? maintPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
          ...sf,
        } satisfies STRDealMakerState
      }

      case 'brrrr': {
        // Acquisition loan is sized off the discount-adjusted effective price; the Bank
        // Loan is the stored financing input and the down payment is the derived residual.
        const brBuy = io.purchasePrice ?? targetPrice
        const brDiscount = io.buyDiscountPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.buyDiscountPct
        const brEff = brBuy * (1 - brDiscount)
        const brSeller = Math.max(0, sf.sellerFinancingAmount)
        const brBankLoan =
          typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
        const brDownPct =
          brBankLoan != null && brEff > 0
            ? Math.max(-1, Math.min(1, (brEff - brBankLoan - brSeller) / brEff))
            : io.downPayment != null
              ? io.downPayment / 100
              : downPaymentPct
        return {
          purchasePrice: brBuy,
          buyDiscountPct: brDiscount,
          downPaymentPercent: brDownPct,
          bankLoanAmount: brBankLoan ?? undefined,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          hardMoneyRate: io.hardMoneyRate ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.hardMoneyRate,
          rehabBudget: io.rehabBudget ?? rehabCost,
          contingencyPct: io.contingencyPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.contingencyPct,
          holdingPeriodMonths:
            io.holdingPeriodMonths ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingPeriodMonths,
          holdingCostsMonthly:
            io.holdingCostsMonthly ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingCostsMonthly,
          arv: arvVal,
          postRehabMonthlyRent: io.monthlyRent ?? monthlyRent,
          postRehabRentIncreasePct: DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabRentIncreasePct,
          refinanceLtv: io.refinanceLtv ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceLtv,
          refinanceInterestRate:
            io.refinanceInterestRate ??
            (bd?.interest_rate != null
              ? bd.interest_rate / 100
              : DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceInterestRate),
          refinanceTermYears:
            bd?.loan_term_years ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceTermYears,
          refinanceClosingCostsPct: DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceClosingCostsPct,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
          ...sf,
        } satisfies BRRRRDealMakerState
      }

      case 'flip': {
        const hoa = io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0
        return {
          purchasePrice: io.purchasePrice ?? targetPrice,
          purchaseDiscountPct:
            io.purchaseDiscountPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.purchaseDiscountPct,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          financingType: (inlineOverrides.financingType as FlipFinancingType) ?? 'hardMoney',
          hardMoneyLtv: io.hardMoneyLtv ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyLtv,
          hardMoneyRate: io.hardMoneyRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyRate,
          loanPoints: io.loanPoints ?? DEFAULT_FLIP_DEAL_MAKER_STATE.loanPoints,
          rehabBudget: io.rehabBudget ?? rehabCost,
          contingencyPct: io.contingencyPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.contingencyPct,
          rehabTimeMonths:
            io.rehabTimeMonths ??
            bd?.holding_months ??
            DEFAULT_FLIP_DEAL_MAKER_STATE.rehabTimeMonths,
          arv: arvVal,
          // HOA accrues during the hold period, so seed it into the holding-costs
          // baseline when the user hasn't overridden the row directly.
          holdingCostsMonthly:
            io.holdingCostsMonthly ?? propertyTaxes / 12 + insurance / 12 + 200 + hoa,
          daysOnMarket: io.daysOnMarket ?? DEFAULT_FLIP_DEAL_MAKER_STATE.daysOnMarket,
          sellingCostsPct:
            io.sellingCostsPct ??
            (bd?.selling_costs_pct != null
              ? bd.selling_costs_pct / 100
              : DEFAULT_FLIP_DEAL_MAKER_STATE.sellingCostsPct),
          capitalGainsRate: io.capitalGainsRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.capitalGainsRate,
          monthlyHoa: hoa,
          ...sf,
        } satisfies FlipDealMakerState
      }

      case 'house_hack': {
        const totalBeds = bd?.total_bedrooms ?? propertyInfo?.details?.bedrooms ?? 4
        const rentPerRoom = bd?.rent_per_room ?? monthlyRent / Math.max(totalBeds, 1)
        // Bank Loan is the stored financing input; Down Payment is the derived residual.
        const hhBuy = io.purchasePrice ?? targetPrice
        const hhSeller = Math.max(0, sf.sellerFinancingAmount)
        const hhBankLoan =
          typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
        const hhDownPct =
          hhBankLoan != null && hhBuy > 0
            ? Math.max(-1, Math.min(1, (hhBuy - hhBankLoan - hhSeller) / hhBuy))
            : io.downPayment != null
              ? io.downPayment / 100
              : bd?.down_payment_pct != null
                ? bd.down_payment_pct / 100
                : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.downPaymentPercent
        return {
          purchasePrice: hhBuy,
          totalUnits: io.totalUnits ?? totalBeds,
          ownerOccupiedUnits: io.ownerOccupiedUnits ?? 1,
          ownerUnitMarketRent: rentPerRoom,
          loanType: (inlineOverrides.loanType as HouseHackLoanType) ?? 'fha',
          downPaymentPercent: hhDownPct,
          bankLoanAmount: hhBankLoan ?? undefined,
          interestRate:
            io.interestRate ??
            (bd?.interest_rate != null
              ? bd.interest_rate / 100
              : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.interestRate),
          loanTermYears:
            io.loanTerm ?? bd?.loan_term_years ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.loanTermYears,
          pmiRate: io.pmiRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.pmiRate,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          avgRentPerUnit: io.avgRentPerUnit ?? rentPerRoom,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          currentHousingPayment:
            io.currentHousingPayment ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.currentHousingPayment,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
          utilitiesMonthly:
            io.utilitiesMonthly ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.utilitiesMonthly,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          capexRate: io.capexRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.capexRate,
          ...sf,
        } satisfies HouseHackDealMakerState
      }

      case 'wholesale': {
        const contractPrice = io.purchasePrice ?? targetPrice
        return {
          arv: arvVal,
          estimatedRepairs: io.rehabBudget ?? rehabCost,
          squareFootage: propertyInfo?.details?.square_footage ?? 1500,
          contractPrice,
          earnestMoney:
            io.earnestMoney ?? bd?.emd ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.earnestMoney,
          inspectionPeriodDays:
            io.inspectionPeriodDays ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.inspectionPeriodDays,
          daysToClose: io.daysToClose ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.daysToClose,
          assignmentFee:
            io.assignmentFee ??
            bd?.assignment_fee ??
            DEFAULT_WHOLESALE_DEAL_MAKER_STATE.assignmentFee,
          marketingCosts: io.marketingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.marketingCosts,
          closingCosts: io.closingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.closingCosts,
          monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
          ...sf,
        } satisfies WholesaleDealMakerState
      }

      case 'ltr':
      default: {
        // Bank Loan + Seller Financing are the financing inputs; Down Payment is the
        // derived residual. When the user has set an explicit Bank Loan it is the source
        // of truth, so the down payment absorbs buy-price / seller-financing changes
        // (this keeps the Bank Loan slider stable instead of feeding back through dp%).
        const ltrBuy = io.purchasePrice ?? targetPrice
        const ltrSeller = Math.max(0, sf.sellerFinancingAmount)
        const ltrBankLoan =
          typeof ioAny.bankLoanAmount === 'number' ? Math.max(0, ioAny.bankLoanAmount) : null
        const ltrDownPct =
          ltrBankLoan != null && ltrBuy > 0
            ? Math.max(-1, Math.min(1, (ltrBuy - ltrBankLoan - ltrSeller) / ltrBuy))
            : io.downPayment != null
              ? io.downPayment / 100
              : downPaymentPct
        return {
          buyPrice: ltrBuy,
          downPaymentPercent: ltrDownPct,
          bankLoanAmount: ltrBankLoan ?? undefined,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          interestRate: io.interestRate ?? rate,
          loanTermYears: io.loanTerm ?? loanTermYears,
          rehabBudget: io.rehabBudget ?? rehabCost,
          arv: arvVal,
          monthlyRent: io.monthlyRent ?? monthlyRent,
          otherIncome: 0,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          // Seed HOA from the property feed (`market.hoa_fees_monthly`) so condo /
          // townhome / co-op carrying costs are part of NOI on first render.
          monthlyHoa: io.monthlyHoa ?? propertyInfo?.market?.hoa_fees_monthly ?? 0,
          capexRate:
            io.capexRate ??
            (io.capexPct != null ? io.capexPct : undefined) ??
            reservesPct ??
            dealGapOperatingOverrides?.capexPct ??
            DEFAULT_OPERATING_CAPEX_PCT,
          utilitiesMonthly:
            io.utilitiesMonthly ??
            dealGapOperatingOverrides?.utilitiesMonthly ??
            DEFAULT_OPERATING_UTILITIES_MONTHLY,
          pestControlAnnual:
            io.pestControlAnnual ??
            dealGapOperatingOverrides?.pestControlAnnual ??
            DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
          ...sf,
        } satisfies LTRDealMakerState
      }
    }
  })()

  worksheetStateRef.current = worksheetState
  currentStrategyTypeRef.current = currentStrategyType

  const ltrLiveMetrics =
    currentStrategyType === 'ltr'
      ? computeLtrMetricsFromState(worksheetState as LTRDealMakerState, {
          dealGapPct,
          landscapingAnnual: dealGapOperatingOverrides?.landscapingAnnual,
        })
      : null

  if (ltrLiveMetrics) {
    strategyAnnualCashFlow = ltrLiveMetrics.annualProfit
    strategyCashFlow = ltrLiveMetrics.annualProfit / 12
    capRateVal = ltrLiveMetrics.capRate
    cocVal = ltrLiveMetrics.cocReturn
    totalCashNeeded = ltrLiveMetrics.cashNeeded
  }

  const benchmarks = isFlipOrWholesale
    ? [
        {
          metric: 'ROI',
          value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—',
          target: '20%',
          status: cocVal !== null && cocVal >= 20 ? 'good' : 'poor',
        },
        {
          metric: 'Profit',
          value: formatCurrency(strategyAnnualCashFlow),
          target: '+$30K',
          status: strategyAnnualCashFlow >= 30000 ? 'good' : 'poor',
        },
      ]
    : [
        {
          metric: 'Cap Rate',
          value: capRateVal !== null ? `${capRateVal.toFixed(1)}%` : '—',
          target: '6.0%',
          status: capRateVal !== null && capRateVal >= 6.0 ? 'good' : 'poor',
        },
        {
          metric: 'Cash-on-Cash',
          value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—',
          target: '8.0%',
          status: cocVal !== null && cocVal >= 8.0 ? 'good' : 'poor',
        },
        {
          metric: 'Monthly Cash Flow',
          value: formatCurrency(strategyCashFlow),
          target: '+$300',
          status: strategyCashFlow >= 300 ? 'good' : 'poor',
        },
        ...(strategyDscr != null
          ? [
              {
                metric: 'DSCR',
                value: strategyDscr.toFixed(2),
                target: '1.25',
                status: strategyDscr >= 1.25 ? 'good' : 'poor',
              },
            ]
          : []),
      ]

  const worksheetMetrics = (() => {
    switch (currentStrategyType) {
      case 'str': {
        const strState = worksheetState as STRDealMakerState
        const adr = strState.averageDailyRate
        const occ = strState.occupancyRate
        const annualRevenue = bd?.annual_gross_revenue ?? adr * 365 * occ
        const nightsOcc = Math.round(365 * occ)
        const turnovers = Math.ceil(nightsOcc / strState.avgLengthOfStayDays)
        const cashNeededWs = cashNeededFromStrState(strState)
        const dpFromState = strState.buyPrice * strState.downPaymentPercent
        const closingFromState = strState.buyPrice * strState.closingCostsPercent
        return {
          cashNeeded: cashNeededWs,
          totalInvestmentWithFurniture: cashNeededWs,
          downPaymentAmount: dpFromState,
          closingCostsAmount: closingFromState,
          loanAmount,
          monthlyPayment: monthlyPI,
          grossNightlyRevenue: adr,
          monthlyGrossRevenue: annualRevenue / 12,
          annualGrossRevenue: annualRevenue,
          revPAR: adr * occ,
          numberOfTurnovers: turnovers,
          nightsOccupied: nightsOcc,
          monthlyExpenses: {
            mortgage: monthlyPI,
            taxes: propertyTaxes / 12,
            insurance: insurance / 12,
            hoa: strState.monthlyHoa,
            utilities: (bd?.utilities ?? 0) / 12,
            maintenance: (bd?.maintenance ?? 0) / 12,
            management: (bd?.management ?? 0) / 12,
            platformFees: (bd?.platform_fees ?? 0) / 12,
            cleaning: (strState.cleaningCostPerTurnover * turnovers) / 12,
            supplies: strState.suppliesMonthly,
          },
          totalMonthlyExpenses: totalExpenses / 12,
          totalAnnualExpenses: totalExpenses,
          monthlyCashFlow: strategyCashFlow,
          annualCashFlow: strategyAnnualCashFlow,
          noi,
          capRate: capRateVal ?? 0,
          cocReturn: cocVal ?? 0,
          breakEvenOccupancy: adr > 0 ? (totalExpenses + monthlyPI * 12) / (adr * 365) : 0,
          equityCreated: 0,
          dealScore: 0,
          dealGrade: 'C' as const,
          profitQuality: 'C' as const,
        } satisfies STRMetrics
      }

      case 'brrrr': {
        const brState = worksheetState as BRRRRDealMakerState
        const initialDown = brState.purchasePrice * brState.downPaymentPercent
        const initialClosing = brState.purchasePrice * brState.closingCostsPercent
        const totalRehabCost = brState.rehabBudget * (1 + brState.contingencyPct)
        const holdCosts = brState.holdingCostsMonthly * brState.holdingPeriodMonths
        const cashPhase1 = initialDown + initialClosing
        const cashPhase2 = totalRehabCost + holdCosts
        const allIn = brState.purchasePrice + totalRehabCost + holdCosts
        const refiLoan = brState.arv * brState.refinanceLtv
        const refiClosing = refiLoan * brState.refinanceClosingCostsPct
        const cashOut = Math.max(0, refiLoan - (brState.purchasePrice - initialDown) - refiClosing)
        const totalInvested = cashPhase1 + cashPhase2
        const cashLeftInDeal = Math.max(0, totalInvested - cashOut)
        const capitalRecycled =
          totalInvested > 0 ? ((totalInvested - cashLeftInDeal) / totalInvested) * 100 : 0
        const refiPayment = calculateMortgagePayment(
          refiLoan,
          brState.refinanceInterestRate * 100,
          brState.refinanceTermYears,
        )
        const annualRentBrrrr = brState.postRehabMonthlyRent * 12
        const effIncome = annualRentBrrrr * (1 - brState.vacancyRate)
        const opex =
          propertyTaxes +
          insurance +
          annualRentBrrrr * (brState.managementRate + brState.maintenanceRate)
        const estNoi = effIncome - opex
        const postRefiAnnualCF = estNoi - refiPayment * 12
        const minCashForCoc = Math.max(cashLeftInDeal, totalInvested * 0.1)
        const postRefiCoc =
          cashLeftInDeal <= 0
            ? postRefiAnnualCF > 0
              ? 999
              : 0
            : (postRefiAnnualCF / minCashForCoc) * 100
        return {
          initialLoanAmount: brState.purchasePrice - initialDown,
          initialDownPayment: initialDown,
          initialClosingCosts: initialClosing,
          cashRequiredPhase1: cashPhase1,
          totalRehabCost,
          holdingCosts: holdCosts,
          cashRequiredPhase2: cashPhase2,
          allInCost: allIn,
          estimatedNoi: estNoi,
          estimatedCapRate: brState.purchasePrice > 0 ? (estNoi / brState.purchasePrice) * 100 : 0,
          refinanceLoanAmount: refiLoan,
          refinanceClosingCosts: refiClosing,
          cashOutAtRefinance: cashOut,
          newMonthlyPayment: refiPayment,
          totalCashInvested: totalInvested,
          cashLeftInDeal,
          capitalRecycledPct: capitalRecycled,
          infiniteRoiAchieved: cashLeftInDeal <= 0,
          equityPosition: brState.arv - refiLoan,
          equityPct: brState.arv > 0 ? ((brState.arv - refiLoan) / brState.arv) * 100 : 0,
          postRefiMonthlyCashFlow: postRefiAnnualCF / 12,
          postRefiAnnualCashFlow: postRefiAnnualCF,
          postRefiCashOnCash: postRefiCoc,
          dealScore: 0,
          dealGrade: 'C' as const,
        } satisfies BRRRRMetrics
      }

      case 'flip': {
        const fState = worksheetState as FlipDealMakerState
        const fSeller = Math.max(0, fState.sellerFinancingAmount ?? 0)
        const fLoan =
          fState.financingType !== 'cash' ? fState.purchasePrice * fState.hardMoneyLtv : 0
        // Down payment is the residual after the hard money loan and any seller note:
        // Down Payment = Purchase Price − (Hard Money Loan + Seller Financing).
        const fDown = fState.purchasePrice - fLoan - fSeller
        const fClosing = fState.purchasePrice * fState.closingCostsPercent
        const pointsCost = fLoan * (fState.loanPoints / 100)
        const totalRehab = fState.rehabBudget * (1 + fState.contingencyPct)
        const domMonths = fState.daysOnMarket / 30
        const holdMonths = fState.rehabTimeMonths + domMonths
        const interestCosts =
          fState.financingType !== 'cash' ? fLoan * fState.hardMoneyRate * (holdMonths / 12) : 0
        const totalHolding = fState.holdingCostsMonthly * holdMonths + interestCosts
        const totalProject =
          fState.purchasePrice + fClosing + totalRehab + totalHolding + pointsCost
        const sellingCosts = fState.arv * fState.sellingCostsPct
        const grossProfit = fState.arv - totalProject - sellingCosts
        const capGainsTax = Math.max(0, grossProfit) * fState.capitalGainsRate
        const netProfit = grossProfit - capGainsTax
        const cashRequired = fDown + fClosing + pointsCost + totalRehab + totalHolding
        const fRoi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0
        const annRoi = holdMonths > 0 ? fRoi * (12 / holdMonths) : 0
        const mao = fState.arv * 0.7 - fState.rehabBudget
        return {
          loanAmount: fLoan,
          downPayment: fDown,
          closingCosts: fClosing,
          loanPointsCost: pointsCost,
          cashAtPurchase: fDown + fClosing + pointsCost,
          totalRehabCost: totalRehab,
          holdingPeriodMonths: holdMonths,
          totalHoldingCosts: totalHolding,
          interestCosts,
          grossSaleProceeds: fState.arv,
          sellingCosts,
          netSaleProceeds: fState.arv - sellingCosts,
          totalProjectCost: totalProject,
          grossProfit,
          capitalGainsTax: capGainsTax,
          netProfit,
          cashRequired,
          roi: fRoi,
          annualizedRoi: annRoi,
          profitMargin: fState.arv > 0 ? (netProfit / fState.arv) * 100 : 0,
          maxAllowableOffer: mao,
          meets70PercentRule: fState.purchasePrice <= mao,
          dealScore: 0,
          dealGrade: 'C' as const,
        } satisfies FlipMetrics
      }

      case 'house_hack': {
        const hState = worksheetState as HouseHackDealMakerState
        const hSeller = Math.max(0, hState.sellerFinancingAmount ?? 0)
        const hDown = hState.purchasePrice * hState.downPaymentPercent
        // Bank loan is the residual after the buyer's cash down and the seller note.
        const hLoan = Math.max(0, hState.purchasePrice - hDown - hSeller)
        const hBankPi = calculateMortgagePayment(
          hLoan,
          hState.interestRate * 100,
          hState.loanTermYears,
        )
        const hSellerPi =
          hSeller > 0
            ? sellerMonthlyPayment(
                hSeller,
                hState.sellerInterestRate,
                hState.sellerTermYears,
                hState.sellerInterestOnly ?? false,
              )
            : 0
        const hPI = hBankPi + hSellerPi
        const hPmi = (hLoan * hState.pmiRate) / 12
        const hTaxes = hState.annualPropertyTax / 12
        const hIns = hState.annualInsurance / 12
        const hPiti = hPI + hPmi + hTaxes + hIns + hState.monthlyHoa
        const hClosing = hState.purchasePrice * hState.closingCostsPercent
        // Sources & uses: (price + closing) − (bank loan + seller note). May be negative.
        const hCashToClose = hState.purchasePrice + hClosing - hLoan - hSeller
        const rentedUnits = Math.max(0, hState.totalUnits - hState.ownerOccupiedUnits)
        const grossRental = hState.avgRentPerUnit * rentedUnits
        const effectiveRental = grossRental * (1 - hState.vacancyRate)
        const monthlyMaint = effectiveRental * hState.maintenanceRate
        const monthlyCapex = effectiveRental * hState.capexRate
        const monthlyOpex = hState.utilitiesMonthly + monthlyMaint + monthlyCapex
        const netRental = effectiveRental - monthlyOpex
        const effectiveCost = hPiti - netRental
        return {
          loanAmount: hLoan,
          monthlyPrincipalInterest: hPI,
          monthlyPmi: hPmi,
          monthlyTaxes: hTaxes,
          monthlyInsurance: hIns,
          monthlyPITI: hPiti,
          downPayment: hDown,
          closingCosts: hClosing,
          cashToClose: hCashToClose,
          rentedUnits,
          grossRentalIncome: grossRental,
          effectiveRentalIncome: effectiveRental,
          monthlyMaintenance: monthlyMaint,
          monthlyCapex,
          monthlyOperatingExpenses: monthlyOpex,
          netRentalIncome: netRental,
          effectiveHousingCost: effectiveCost,
          housingCostSavings: hState.currentHousingPayment - effectiveCost,
          housingOffsetPercent: hPiti > 0 ? (netRental / hPiti) * 100 : 0,
          livesForFree: effectiveCost <= 0,
          annualCashFlow: netRental * 12 - hPiti * 12,
          cashOnCashReturn:
            hCashToClose > 0 ? (((netRental - hPiti) * 12) / hCashToClose) * 100 : 0,
          fullRentalIncome: hState.avgRentPerUnit * hState.totalUnits,
          fullRentalCashFlow:
            (hState.avgRentPerUnit * hState.totalUnits * (1 - hState.vacancyRate) -
              monthlyOpex -
              hPiti) *
            12,
          fullRentalCoCReturn: 0,
          dealScore: 0,
          dealGrade: 'C' as const,
        } satisfies HouseHackMetrics
      }

      case 'wholesale': {
        const wState = worksheetState as WholesaleDealMakerState
        const mao = wState.arv * 0.7 - wState.estimatedRepairs
        const endBuyerPrice = wState.contractPrice + wState.assignmentFee
        const endBuyerAllIn = endBuyerPrice + wState.estimatedRepairs
        const endBuyerProfit = wState.arv - endBuyerAllIn
        const cashAtRisk = wState.earnestMoney + wState.marketingCosts + wState.closingCosts
        const netProfit = wState.assignmentFee - wState.marketingCosts - wState.closingCosts
        const wRoi = cashAtRisk > 0 ? (netProfit / cashAtRisk) * 100 : 0
        const annROI = wState.daysToClose > 0 ? wRoi * (365 / wState.daysToClose) : 0
        const viability: 'strong' | 'moderate' | 'tight' | 'notViable' =
          wState.contractPrice <= mao * 0.9
            ? 'strong'
            : wState.contractPrice <= mao
              ? 'moderate'
              : wState.contractPrice <= mao * 1.05
                ? 'tight'
                : 'notViable'
        return {
          maxAllowableOffer: mao,
          contractVsMAO: wState.contractPrice - mao,
          meets70PercentRule: wState.contractPrice <= mao,
          endBuyerPrice,
          endBuyerAllIn,
          endBuyerProfit,
          endBuyerROI: endBuyerAllIn > 0 ? (endBuyerProfit / endBuyerAllIn) * 100 : 0,
          totalCashAtRisk: cashAtRisk,
          grossProfit: wState.assignmentFee,
          netProfit,
          roi: wRoi,
          annualizedROI: annROI,
          dealViability: viability,
          dealScore: 0,
          dealGrade: 'C' as const,
        } satisfies WholesaleMetrics
      }

      case 'ltr':
      default: {
        if (ltrLiveMetrics) return ltrLiveMetrics
        const ltrState = worksheetState as LTRDealMakerState
        const ltrGrossMonthly = ltrState.monthlyRent + (ltrState.otherIncome ?? 0)
        const ltrOpex = computeLtrOperatingExpenseBreakdown({
          annualPropertyTax: ltrState.annualPropertyTax,
          annualInsurance: ltrState.annualInsurance,
          monthlyHoa: ltrState.monthlyHoa,
          managementRate: ltrState.managementRate ?? 0,
          maintenanceRate: ltrState.maintenanceRate,
          annualGrossRent: ltrGrossMonthly * 12,
          capexPct: ltrState.capexRate,
          utilitiesMonthly: ltrState.utilitiesMonthly,
          pestControlAnnual: ltrState.pestControlAnnual,
          landscapingAnnual: dealGapOperatingOverrides?.landscapingAnnual,
        })
        return {
          cashNeeded: cashNeededFromLtrState(ltrState),
          dealGap: dealGapPct / 100,
          annualProfit: strategyAnnualCashFlow,
          capRate: capRateVal ?? 0,
          cocReturn: cocVal ?? 0,
          monthlyPayment: monthlyPI,
          loanAmount,
          equityCreated: 0,
          grossMonthlyIncome: ltrGrossMonthly,
          totalMonthlyExpenses: ltrOpex.total / 12,
        } satisfies LTRDealMakerMetrics
      }
    }
  })() as AnyStrategyMetrics

  /** Income Value — live from worksheet (rent, financing, opex); API snapshot as fallback. */
  const valuationSnap =
    data?.valuation_snapshot ?? (data as Record<string, unknown>)?.valuationSnapshot
  const snapIv =
    (valuationSnap as { income_value?: number; incomeValue?: number } | undefined)
      ?.income_value ??
    (valuationSnap as { incomeValue?: number } | undefined)?.incomeValue
  const apiIncomeValue =
    typeof snapIv === 'number' && Number.isFinite(snapIv) && snapIv > 0
      ? snapIv
      : (data?.income_value ?? (data as Record<string, unknown>)?.incomeValue ?? 0)

  const liveIncomeValue =
    currentStrategyType === 'flip' || currentStrategyType === 'wholesale'
      ? 0
      : computeDealGapIncomeValue(
          currentStrategyType,
          worksheetState,
          dealGapOperatingOverrides,
        )

  const dealGapIncomeValue =
    liveIncomeValue > 0
      ? liveIncomeValue
      : typeof apiIncomeValue === 'number' && apiIncomeValue > 0
        ? apiIncomeValue
        : listPrice

  const handleWorksheetUpdate = (key: string, value: number | string) => {
    /* Worksheet `up()` field names → InlineDealMakerValues keys (`propertyTaxes`/`insurance` match worksheetState `io.*` and verdictPayload). */
    const fieldMap: Record<string, keyof InlineDealMakerValues> = {
      buyPrice: 'buyPrice',
      downPaymentPercent: 'downPayment',
      closingCostsPercent: 'closingCosts',
      interestRate: 'interestRate',
      loanTermYears: 'loanTerm',
      sellerFinancingAmount: 'sellerFinancingAmount',
      sellerInterestRate: 'sellerInterestRate',
      sellerTermYears: 'sellerTermYears',
      rehabBudget: 'rehabBudget',
      arv: 'arv',
      monthlyRent: 'monthlyRent',
      vacancyRate: 'vacancyRate',
      annualPropertyTax: 'propertyTaxes',
      annualInsurance: 'insurance',
      managementRate: 'managementRate',
      purchasePrice: 'buyPrice',
      postRehabMonthlyRent: 'monthlyRent',
      contractPrice: 'buyPrice',
      estimatedRepairs: 'rehabBudget',
    }
    const mapped = fieldMap[key]
    if (mapped) {
      handleInlineSliderChange(mapped, typeof value === 'number' ? value : parseFloat(value))
    } else {
      setInlineOverrides((prev) => {
        const next = { ...prev, [key]: value }
        inlineOverridesRef.current = next
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          try {
            writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'dealmaker_edit' })
          } catch {
            /* ignore */
          }
        }, 300)
        scheduleRecalc()
        markWorksheetDirty()
        return next
      })
    }
  }

  const handlePDFDownload = (theme: 'light' | 'dark' = 'light') => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    if (!isPro) {
      alert('Full Report download is a Pro feature. Visit Pricing to upgrade.')
      return
    }
    setIsExporting('pdf')
    try {
      const propertyId = propertyInfo?.property_id || propertyInfo?.zpid || 'general'
      const params = new URLSearchParams({
        address: addressParam,
        strategy: activeStrategyId,
        theme,
        propertyId,
      })
      params.set('purchase_price', String(targetPrice))
      params.set('monthly_rent', String(monthlyRent))
      params.set('interest_rate', String(rate * 100))
      params.set('down_payment_pct', String(downPaymentPct * 100))
      params.set('property_taxes', String(propertyTaxes))
      params.set('insurance', String(insurance))
      const reportBase = IS_CAPACITOR ? WEB_BASE_URL : ''
      const url = `${reportBase}/api/report?${params}`
      window.open(url, '_blank')
    } catch (err) {
      console.error('PDF report failed:', err)
    } finally {
      setIsExporting(null)
    }
  }

  const handleComprehensiveExcelDownload = async () => {
    const propertyId = propertyInfo?.property_id || propertyInfo?.zpid
    if (!propertyId) {
      alert('Property data is still loading. Please wait a moment and try again.')
      return
    }
    if (!propertyInfo) return

    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    if (!isPro) {
      alert('Excel worksheet download is a Pro feature. Visit Pricing to upgrade.')
      return
    }

    setIsExporting('excel')
    try {
      const exportOverrides: Record<string, unknown> = {
        ...(dealMakerOverrides ?? {}),
        purchasePrice:
          dealMakerOverrides?.purchasePrice ?? dealMakerOverrides?.buyPrice ?? targetPrice,
        buyPrice: dealMakerOverrides?.buyPrice ?? dealMakerOverrides?.purchasePrice ?? targetPrice,
        monthlyRent: dealMakerOverrides?.monthlyRent ?? monthlyRent,
        propertyTaxes: dealMakerOverrides?.propertyTaxes ?? propertyTaxes,
        insurance: dealMakerOverrides?.insurance ?? insurance,
        interestRate: dealMakerOverrides?.interestRate ?? rate,
        downPayment: dealMakerOverrides?.downPayment ?? downPaymentPct * 100,
        closingCosts: dealMakerOverrides?.closingCosts ?? closingCostsPct * 100,
        rehabBudget: dealMakerOverrides?.rehabBudget ?? dealMakerOverrides?.rehabCost,
        arv: dealMakerOverrides?.arv ?? (dealRecord?.arv && dealRecord.arv > 0 ? dealRecord.arv : undefined),
      }

      const verdictInput = buildVerdictAnalysisPayload(
        toPayloadBase(propertyInfo),
        exportOverrides,
        verdictSourceOverrides,
      )

      await downloadComprehensiveExcel({
        propertyId: String(propertyId),
        address: addressParam,
        activeStrategy: currentStrategyType,
        verdictInput,
        savedPropertyId,
      })
    } catch (err) {
      console.error('Excel download failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate worksheet. Please try again.')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div
      className="strategy-page-shell min-h-screen"
      style={{
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
    >
      {/* Header and property bar are provided by AppHeader in layout */}

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto">
        {/* Deal Gap Price Cards + Scale Bar — synced with Verdict page */}
        {listPrice > 0 &&
          targetPrice > 0 &&
          (() => {
            const incomeVal = dealGapIncomeValue
            const isListedProp =
              !!propertyInfo?.listingStatus &&
              ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(propertyInfo.listingStatus)
            const pLabel = isListedProp ? 'Asking' : 'Market'
            return (
              <>
                <section className="px-[1px] sm:px-5 pt-6 pb-2">
                  {/* Three price metric cards */}
                  <div className="flex flex-row gap-1.5 sm:gap-2.5 items-stretch mb-4">
                    {[
                      {
                        label: 'Target Buy',
                        value: targetPrice,
                        sub: 'Positive Cashflow',
                        color: 'var(--accent-sky)',
                        dominant: true,
                        showInfo: false,
                      },
                      {
                        label: 'Income Value',
                        value: incomeVal,
                        sub: '$0 Cashflow Breakeven',
                        color: 'var(--status-warning)',
                        dominant: false,
                        showInfo: false,
                        incomeInfo: true,
                      },
                      {
                        label: 'Market Price',
                        value: listPrice,
                        sub: 'Market Value or List Price',
                        color: 'var(--status-negative)',
                        dominant: false,
                        showInfo: !isListedProp,
                      },
                    ].map((card, i) => (
                      <div
                        key={i}
                        className={`relative rounded-xl py-3 px-1.5 sm:px-2 text-center min-w-0 ${card.dominant ? 'flex-[1.2]' : 'flex-1'}`}
                        style={{
                          background: 'var(--surface-card)',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: `3px solid ${card.color}`,
                          boxShadow: card.dominant
                            ? 'var(--shadow-card-hover)'
                            : 'var(--shadow-card)',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                      >
                        {card.showInfo && <MarketPriceInfoTip />}
                        {'incomeInfo' in card && card.incomeInfo && <IncomeValueInfoTip />}
                        <p
                          className="text-[10px] sm:text-[12px] font-bold uppercase tracking-wide mb-1"
                          style={{ color: 'var(--text-body)' }}
                        >
                          {card.label}
                        </p>
                        <p
                          className="tabular-nums mb-0.5 font-bold text-[15px] sm:text-[20px]"
                          style={{ color: card.color }}
                        >
                          {formatCurrency(card.value)}
                        </p>
                        <p
                          className="text-[9px] sm:text-[12px] font-medium leading-snug"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {card.sub}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-start gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => setShowDealGapVideo(true)}
                      className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors"
                      style={{
                        color: 'var(--accent-sky)',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      Watch: What is the Deal Gap?
                    </button>
                    <p
                      className="text-[10px] sm:text-[11px] leading-snug max-w-xl"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Income Value = max price where rent fully covers your loan payment and
                      operating costs. Target Buy is ~5% below that.
                    </p>
                  </div>
                </section>

                {/*
            Sticky Deal Gap bar — pins directly under the property address bar
            so the user can keep watching the gaps move while editing the worksheet.
            Containing block is the page-level wrapper, so the bar stays pinned
            through the entire scroll of cards / next-steps / worksheet content.
            Income Value updates immediately from worksheet sliders; Target Buy and
            Market Price follow overrides / verdict recalc. Prior values stay visible
            while recalculating (stale-while-revalidate).
          */}
                <div
                  id="strategy-deal-gap-bar"
                  className="sticky z-30 px-[1px] sm:px-5"
                  style={{
                    top: 'calc(env(safe-area-inset-top, 0px) + var(--app-address-bar-height, 0px))',
                    paddingTop: 10,
                    paddingBottom: 12,
                    boxShadow: 'var(--shadow-sticky)',
                  }}
                >
                  <div
                    className="deal-gap-chart-panel relative mx-0 sm:mx-0"
                    style={{
                      opacity: isRecalculating ? 0.55 : 1,
                    }}
                    aria-busy={isRecalculating}
                  >
                    {(() => {
                      const snapPg =
                        (valuationSnap as { price_gap_to_income_pct?: number } | undefined)
                          ?.price_gap_to_income_pct ??
                        (valuationSnap as { priceGapToIncomePct?: number } | undefined)
                          ?.priceGapToIncomePct
                      const markers = [
                        { label: 'TARGET', price: targetPrice, dotColor: 'var(--accent-sky)' },
                        { label: 'INCOME', price: incomeVal, dotColor: 'var(--status-warning)' },
                        { label: 'MARKET', price: listPrice, dotColor: 'var(--status-negative)' },
                      ]
                        .filter((m) => m.price > 0)
                        .sort((a, b) => a.price - b.price)

                      const allPrices = markers.map((m) => m.price)
                      const scaleMin = Math.min(...allPrices) * 0.95
                      const scaleMax = Math.max(...allPrices) * 1.05
                      const range = scaleMax - scaleMin
                      const pos = (v: number) =>
                        Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

                      const targetBuyPos = targetPrice > 0 ? pos(targetPrice) : null
                      const marketPos = listPrice > 0 ? pos(listPrice) : null
                      const incomePos = incomeVal > 0 ? pos(incomeVal) : null

                      const priceGapPct =
                        typeof snapPg === 'number' && Number.isFinite(snapPg)
                          ? snapPg * 100
                          : listPrice > 0 && incomeVal > 0
                            ? ((incomeVal - listPrice) / listPrice) * 100
                            : 0
                      const isPositiveIncomeCase = incomeVal > listPrice && priceGapPct > 0.1

                      const dealBracketLeft =
                        targetBuyPos != null && marketPos != null
                          ? Math.min(targetBuyPos, marketPos)
                          : 0
                      const dealBracketPct =
                        listPrice > 0 && targetPrice > 0
                          ? ((listPrice - targetPrice) / listPrice) * 100
                          : 0
                      const effectiveDisplayPct = -dealBracketPct
                      const isDealGain = dealBracketPct < 0.5 && isPositiveIncomeCase
                      const dealBracketRight =
                        isDealGain && incomePos != null
                          ? incomePos
                          : targetBuyPos != null && marketPos != null
                            ? Math.max(targetBuyPos, marketPos)
                            : 0
                      const showDealBracket = isDealGain
                        ? dealBracketRight - dealBracketLeft >= 3
                        : dealBracketRight - dealBracketLeft >= 3 && Math.abs(dealBracketPct) > 0.1
                      const dealDisplayPct = isDealGain
                        ? ((incomeVal - targetPrice) / listPrice) * 100
                        : effectiveDisplayPct

                      const priceGapLeft =
                        incomePos != null && marketPos != null ? Math.min(incomePos, marketPos) : 0
                      const priceGapRight =
                        incomePos != null && marketPos != null ? Math.max(incomePos, marketPos) : 0
                      const priceGap =
                        listPrice > 0 && incomeVal > 0
                          ? ((incomeVal - listPrice) / listPrice) * 100
                          : 0
                      const showPriceGap =
                        incomePos != null &&
                        marketPos != null &&
                        priceGap < -0.1 &&
                        priceGapRight - priceGapLeft >= 3

                      const isBuyZone = dealDisplayPct >= 0
                      const bracketLabel = isBuyZone ? 'DEAL WORKS' : 'DEAL GAP'
                      const bracketColor = isBuyZone
                        ? 'var(--status-positive)'
                        : 'var(--accent-sky)'
                      const sweetSpotLeft =
                        marketPos != null && incomePos != null ? Math.min(marketPos, incomePos) : 0
                      const sweetSpotWidth =
                        marketPos != null && incomePos != null ? Math.abs(incomePos - marketPos) : 0
                      const tbMarketOverlap =
                        targetBuyPos != null &&
                        marketPos != null &&
                        Math.abs(targetBuyPos - marketPos) < 3
                      const fmtPrice = (v: number) =>
                        v >= 1_000_000
                          ? `$${(v / 1_000_000).toFixed(1)}M`
                          : `$${Math.round(v / 1000)}K`

                      return (
                        <>
                          {showDealBracket && (
                            <div
                              className="relative mb-1"
                              style={{
                                marginLeft: `${dealBracketLeft}%`,
                                width: `${dealBracketRight - dealBracketLeft}%`,
                              }}
                            >
                              <p
                                className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mb-0.5"
                                style={{ color: bracketColor }}
                              >
                                {bracketLabel} &nbsp;{dealDisplayPct >= 0 ? '+' : ''}
                                {dealDisplayPct.toFixed(1)}%
                              </p>
                              <div className="flex items-start">
                                <div
                                  style={{
                                    width: 1,
                                    height: 14,
                                    background: bracketColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <div style={{ height: 1, background: bracketColor, flex: 1 }} />
                                <div
                                  style={{
                                    width: 1,
                                    height: 14,
                                    background: bracketColor,
                                    flexShrink: 0,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Bar with proportionally-positioned dots and optional Sweet Spot zone */}
                          <div
                            className="relative rounded-full"
                            style={{
                              height: 26,
                              background: 'var(--deal-gap-track-bg)',
                              border: '2px solid var(--deal-gap-track-border)',
                              boxShadow: 'var(--deal-gap-track-shadow)',
                            }}
                          >
                            {isPositiveIncomeCase && sweetSpotWidth > 0 && (
                              <SweetSpotZone
                                leftPercent={sweetSpotLeft}
                                widthPercent={sweetSpotWidth}
                              />
                            )}
                            {markers.map((m, i) => {
                              const isRing = tbMarketOverlap && m.label === 'TARGET'
                              return (
                                <div
                                  key={i}
                                  className="absolute rounded-full deal-gap-marker"
                                  style={{
                                    width: isRing ? 24 : 18,
                                    height: isRing ? 24 : 18,
                                    top: '50%',
                                    left: `${pos(m.price)}%`,
                                    transform: 'translate(-50%, -50%)',
                                    background: isRing ? 'transparent' : m.dotColor,
                                    border: isRing
                                      ? `2px solid ${m.dotColor}`
                                      : '2px solid var(--surface-card)',
                                    color: m.dotColor,
                                    boxShadow: 'var(--deal-gap-marker-shadow)',
                                    zIndex: isRing ? 0 : 1,
                                  }}
                                />
                              )
                            })}
                          </div>

                          {/* Price labels below dots (grouped when overlapping) */}
                          <div className="relative" style={{ height: 18, marginTop: 4 }}>
                            {(() => {
                              const groups: {
                                labels: string[]
                                price: number
                                colors: string[]
                                left: number
                              }[] = []
                              markers.forEach((m) => {
                                const p = pos(m.price)
                                const existing = groups.find((g) => Math.abs(g.left - p) < 3)
                                if (existing) {
                                  existing.labels.push(m.label)
                                  existing.colors.push(m.dotColor)
                                } else {
                                  groups.push({
                                    labels: [m.label],
                                    price: m.price,
                                    colors: [m.dotColor],
                                    left: p,
                                  })
                                }
                              })
                              return groups.map((g, i) => (
                                <div
                                  key={i}
                                  className="absolute text-center"
                                  style={{
                                    left: `${g.left}%`,
                                    transform: 'translateX(-50%)',
                                    top: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      lineHeight: 1.2,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {g.labels.map((l, j) => (
                                      <span key={j}>
                                        {j > 0 && (
                                          <span style={{ color: 'var(--text-muted)' }}> / </span>
                                        )}
                                        <span style={{ color: g.colors[j] }}>{l}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))
                            })()}
                          </div>

                          {showPriceGap && (
                            <div
                              className="relative mt-0"
                              style={{
                                marginLeft: `${priceGapLeft}%`,
                                width: `${priceGapRight - priceGapLeft}%`,
                              }}
                            >
                              <div className="flex items-end">
                                <div
                                  style={{
                                    width: 1,
                                    height: 14,
                                    background: 'var(--status-warning)',
                                    flexShrink: 0,
                                  }}
                                />
                                <div
                                  style={{
                                    height: 1,
                                    background: 'var(--status-warning)',
                                    flex: 1,
                                  }}
                                />
                                <div
                                  style={{
                                    width: 1,
                                    height: 14,
                                    background: 'var(--status-warning)',
                                    flexShrink: 0,
                                  }}
                                />
                              </div>
                              <p
                                className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mt-0.5"
                                style={{ color: 'var(--status-warning)', marginBottom: 8 }}
                              >
                                PRICE GAP &nbsp;{priceGap >= 0 ? '+' : ''}
                                {priceGap.toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              </>
            )
          })()}

        {/* Next Steps — accordion, closed by default */}
        <section className="px-[1px] sm:px-5" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            {/* Export links — siblings of the toggle (never nested inside it) so
                interactive elements stay out of the accordion control. */}
            <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handlePDFDownload('light')
                  }}
                  disabled={isExporting === 'pdf'}
                  className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium transition-colors hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait"
                  style={{
                    color: 'var(--accent-sky)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {isExporting === 'pdf' ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  )}
                  {isExporting === 'pdf' ? 'Generating…' : 'Full Report'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void handleComprehensiveExcelDownload()
                  }}
                  disabled={isExporting === 'excel' || isRecalculating}
                  className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium transition-colors hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait"
                  style={{
                    color: 'var(--accent-sky)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {isExporting === 'excel' ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                  )}
                  {isExporting === 'excel' ? 'Generating…' : 'Download Excel'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNextStepsOpen((v) => !v)}
                aria-expanded={nextStepsOpen}
                aria-controls="next-steps-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    color: 'var(--accent-sky)',
                    margin: 0,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '0.02em',
                  }}
                >
                  Next Steps?
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 22 22"
                  fill="none"
                  style={{
                    flexShrink: 0,
                    transition: 'transform 0.3s ease',
                    transform: nextStepsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <circle cx="11" cy="11" r="10" stroke="var(--accent-sky)" strokeWidth="1.5" />
                  <path
                    d="M7.5 9.5L11 13L14.5 9.5"
                    stroke="var(--accent-sky)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {nextStepsOpen && (
            <div id="next-steps-panel" style={{ paddingTop: 12 }}>
              <p
                className={tw.textBody}
                style={{ color: colors.text.body, marginBottom: 20, lineHeight: 1.55 }}
              >
                Follow these steps to move forward with your property deal:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    num: '1',
                    text: (
                      <>
                        <strong style={{ color: 'var(--text-heading)' }}>Review Deal Terms</strong>{' '}
                        – Check the down payment, financing, interest rate, and other details to
                        understand the deal.
                      </>
                    ),
                  },
                  {
                    num: '2',
                    text: (
                      <>
                        <strong style={{ color: 'var(--text-heading)' }}>Adjust the Numbers</strong>{' '}
                        – Use the DealMaker tab to tweak parameters and see real-time changes.
                      </>
                    ),
                  },
                  {
                    num: '3',
                    text: (
                      <>
                        <strong style={{ color: 'var(--text-heading)' }}>Download Reports</strong> –
                        Get the full property report and Excel worksheet below for deeper insight.
                      </>
                    ),
                  },
                  {
                    num: '4',
                    text: (
                      <>
                        <strong style={{ color: 'var(--text-heading)' }}>
                          Use Comps to Set Your Values
                        </strong>{' '}
                        – Visit the Comps tab to confirm value, set the ARV and create your own
                        appraisal report.
                      </>
                    ),
                  },
                  ...(dealGapPct > 20
                    ? [
                        {
                          num: '5',
                          text: (
                            <>
                              <strong style={{ color: 'var(--text-heading)' }}>
                                Stress-test structure, not just price
                              </strong>{' '}
                              – If the Deal Gap is wide, model a lower interest rate, larger down
                              payment, shorter loan term, or seller financing (including low- or
                              zero-rate carry) in the worksheet below.
                            </>
                          ),
                        },
                        {
                          num: '6',
                          text: (
                            <>
                              <strong style={{ color: 'var(--text-heading)' }}>
                                Verify income and value anchors
                              </strong>{' '}
                              – Use the IQ Estimate selector when you sign in to swap value or rent
                              sources; small changes there move Income Value and Target Buy.
                            </>
                          ),
                        },
                      ]
                    : []),
                ].map((step) => (
                  <div
                    key={step.num}
                    style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                  >
                    <div
                      style={{
                        minWidth: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: 'var(--color-sky-dim)',
                        border: '1px solid var(--accent-sky)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--accent-sky)',
                        flexShrink: 0,
                      }}
                    >
                      {step.num}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        lineHeight: 1.55,
                        color: 'var(--text-body)',
                        paddingTop: 4,
                      }}
                    >
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            )}
        </section>

        {/* Apply a Path — OUTSIDE AuthGate so signed-out users are not clipped by
            AuthGate section maxHeight (~320px); paths still apply overrides + recalc. */}
        {displayDealStructurePaths.length > 0 && optionsHiddenForStrategy && (
          <section className="px-[1px] sm:px-5 pt-2 pb-2">
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Deal-making Options use long-term-rental economics.{' '}
                <button
                  type="button"
                  onClick={() => handleStrategyChange('long-term-rental')}
                  className="font-semibold underline"
                  style={{ color: 'var(--accent-sky)' }}
                >
                  Switch to Long-term
                </button>{' '}
                to explore Options for this property.
              </p>
            </div>
          </section>
        )}
        {displayDealStructurePaths.length > 0 &&
          !optionsHiddenForStrategy &&
          strategyFilteredPaths.length > 0 && (
            <section className="px-[1px] sm:px-5 pt-2 pb-2">
              <div
                className="rounded-xl p-3 sm:p-4"
                style={{ background: 'var(--surface-path-strip, #f2f2f2)' }}
              >
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex flex-col">
                      <h3
                        className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        {appliedPathId
                          ? 'Apply an Option to the Worksheet'
                          : 'Start here — pick an Option'}
                      </h3>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {optionsSubtitle}
                      </p>
                    </div>
                    {appliedPathId && (
                      <button
                        type="button"
                        onClick={clearAppliedPath}
                        className="text-xs font-semibold underline shrink-0"
                        style={{ color: 'var(--accent-sky)' }}
                      >
                        Reset to baseline
                      </button>
                    )}
                  </div>
                  <div
                    className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl"
                    style={
                      !appliedPathId
                        ? {
                            padding: 8,
                            background: 'var(--surface-card)',
                            border: '1px solid var(--accent-sky)',
                            boxShadow: '0 0 0 3px rgba(4, 101, 242, 0.12)',
                          }
                        : { background: 'var(--surface-card)', padding: 4 }
                    }
                  >
                  {strategyFilteredPaths.slice(0, 4).map((p, i) => (
                    <PathButton
                      key={p.id}
                      structure={p}
                      index={i}
                      active={appliedPathId === p.id}
                      onClick={applyPathPatch}
                    />
                  ))}
                  </div>
                  {appliedPathEntry && (
                    <div id="strategy-option-card" className="mt-3 scroll-mt-2">
                      <PathOptionCard
                        structure={appliedPathEntry.structure}
                        index={appliedPathEntry.index}
                        propertyState={propertyInfo?.state ?? parsed.state ?? null}
                        applied
                        onShowPitch={setPitchModalStructure}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        {/* Financial Breakdown — requires free (logged-in) tier */}
        <AuthGate feature="view the full strategy breakdown" mode="section">
          <section className="px-[1px] sm:px-5 pt-2 pb-6">
            {/* Strategy Tabs — matches DealMaker page styling, per-strategy color coded */}
            {sortedStrategies.length > 1 &&
              (() => {
                const STRATEGY_DISPLAY = [
                  { id: 'long-term-rental', label: 'Long-term', color: '#0465f2' },
                  { id: 'short-term-rental', label: 'Short-term', color: '#8b5cf6' },
                  { id: 'brrrr', label: 'BRRRR', color: '#f97316' },
                  { id: 'fix-and-flip', label: 'Fix & Flip', color: '#ec4899' },
                  { id: 'house-hack', label: 'House Hack', color: '#14b8a6' },
                  { id: 'wholesale', label: 'Wholesale', color: '#84cc16' },
                ]
                const available = STRATEGY_DISPLAY.filter((s) =>
                  sortedStrategies.some((ss) => ss.id === s.id),
                )
                return (
                  <StrategySelectDropdown
                    options={available}
                    activeId={activeStrategyId}
                    onChange={handleStrategyChange}
                  />
                )
              })()}

            {/* Key Metrics Bar — own container */}
            <div
              className="rounded-xl px-4 sm:px-5 py-3 mb-4 relative"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {isRecalculating && (
                <div className="absolute top-1 right-2 flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-[var(--accent-sky)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--accent-sky)' }}>
                    Recalculating
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
                {[
                  { label: 'Buy Price', value: formatCurrency(targetPrice) },
                  { label: 'Cash Needed', value: formatCurrency(totalCashNeeded) },
                  {
                    label: 'Deal Gap',
                    value: `${dealGapPct >= 0 ? '-' : '+'}${Math.abs(dealGapPct).toFixed(1)}%`,
                    highlight: true,
                    negative: dealGapPct > 0,
                  },
                  {
                    label: 'Annual Profit',
                    value: formatCurrency(strategyAnnualCashFlow),
                    highlight: true,
                    negative: strategyAnnualCashFlow < 0,
                  },
                  {
                    label: 'CAP Rate',
                    value: capRateVal !== null ? `${capRateVal.toFixed(1)}%` : '—',
                    negative: capRateVal !== null && capRateVal < 0,
                  },
                  {
                    label: 'COC Return',
                    value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—',
                    negative: cocVal !== null && cocVal < 0,
                  },
                ].map((m, i) => (
                  <div key={i} className="flex flex-col text-center items-center py-0.5 sm:py-1">
                    <span
                      className="text-[10px] sm:text-xs uppercase tracking-wider"
                      style={{ color: 'var(--text-body)' }}
                    >
                      {m.label}
                    </span>
                    <span
                      className="text-[13px] sm:text-base font-semibold tabular-nums"
                      style={{
                        color: m.negative
                          ? 'var(--status-negative)'
                          : m.highlight
                            ? 'var(--accent-sky)'
                            : 'var(--text-heading)',
                      }}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STR Market Intelligence (Mashvisor) */}
            {currentStrategyType === 'str' &&
              (propertyInfo?.rentals?.str_market_stats ||
                propertyInfo?.rentals?.str_regulatory) && (
                <div className="mx-4 sm:mx-6 mb-4 flex flex-wrap items-start gap-3">
                  {propertyInfo.rentals.str_regulatory?.rating && (
                    <STRRegulatoryBadge regulatory={propertyInfo.rentals.str_regulatory} />
                  )}
                  {propertyInfo.rentals.str_market_stats?.median_occupancy != null && (
                    <STRConfidenceLabel stats={propertyInfo.rentals.str_market_stats} />
                  )}
                </div>
              )}

            {/* Financial Breakdown — DealMaker Worksheet */}
            <DealMakerWorksheet
              strategyType={currentStrategyType}
              state={worksheetState}
              metrics={worksheetMetrics}
              listPrice={listPrice}
              updateState={handleWorksheetUpdate}
              isCalculating={isRecalculating}
              propertyAddress={resolvedAddress}
              onExportPDF={() => handlePDFDownload('light')}
              onExportExcel={handleComprehensiveExcelDownload}
              flushWithinParent
              highlightedFields={highlightedFields}
              operatingExpenseDefaults={
                dealGapOperatingOverrides?.landscapingAnnual != null
                  ? { landscapingAnnual: dealGapOperatingOverrides.landscapingAnnual }
                  : undefined
              }
            />

            {/* IQ Estimate Source Selector */}
            {!isFlipOrWholesale &&
              (iqSources.value.iq != null ||
                iqSources.value.zillow != null ||
                iqSources.value.rentcast != null ||
                iqSources.value.redfin != null ||
                iqSources.value.realtor != null ||
                iqSources.rent.iq != null ||
                iqSources.rent.zillow != null ||
                iqSources.rent.rentcast != null ||
                iqSources.rent.realtor != null) && (
                <div className="px-4 sm:px-6 -mt-16">
                  <IQEstimateSelector
                    sources={iqSources}
                    onSourceChange={(type, _sourceId, _value) => {
                      if (_value == null) return
                      const patch = type === 'value' ? { price: _value } : { monthlyRent: _value }
                      const nextSrcOverrides = { ...sourceOverrides, ...patch }
                      setSourceOverrides((prev) => ({ ...prev, ...patch }))
                      try {
                        if (type === 'value') {
                          writeDealMakerOverrides(
                            resolvedAddress,
                            {
                              price: _value,
                              listPrice: _value,
                            },
                            { origin: 'source_selection' },
                          )
                        } else {
                          writeDealMakerOverrides(
                            resolvedAddress,
                            {
                              monthlyRent: _value,
                            },
                            { origin: 'source_selection' },
                          )
                        }
                      } catch {
                        /* ignore */
                      }
                      const merged = { ...(initialOverrides ?? {}), ...inlineOverrides }
                      recalcVerdict(propertyInfo, merged, {
                        ...nextSrcOverrides,
                        marketValueOverride: dealRecord?.market_value_override ?? null,
                        monthlyRentOverride: dealRecord?.monthly_rent_override ?? null,
                      })
                    }}
                  />
                </div>
              )}

            {/* The Bottom Line */}
            <div
              className="mt-7 p-5 rounded-xl border"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card-hover)',
              }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
                style={{ color: colors.brand.blue }}
              >
                The Bottom Line
              </p>
              <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
                {isFlipOrWholesale ? (
                  strategyAnnualCashFlow >= 0 ? (
                    <>
                      At {formatCurrency(targetPrice)}, this {topStrategyName.toLowerCase()} deal
                      projects an estimated{' '}
                      <strong style={{ color: colors.status.positive, fontWeight: 600 }}>
                        profit of {formatCurrency(strategyAnnualCashFlow)}
                      </strong>
                      . Verify rehab costs, ARV, and timeline with your own due diligence.
                    </>
                  ) : (
                    <>
                      At the current numbers, this {topStrategyName.toLowerCase()} deal{' '}
                      <strong style={{ color: colors.text.primary, fontWeight: 600 }}>
                        doesn&apos;t pencil out
                      </strong>
                      . You&apos;d need a lower purchase price or higher ARV to make the numbers
                      work.
                    </>
                  )
                ) : strategyCashFlow >= 0 ? (
                  <>
                    At the Profit Entry Point of {formatCurrency(targetPrice)}, this property would{' '}
                    <strong style={{ color: colors.status.positive, fontWeight: 600 }}>
                      generate about {formatCurrency(Math.round(strategyCashFlow))}/mo in cash flow
                    </strong>{' '}
                    as a {topStrategyName.toLowerCase()}. The numbers work — verify the assumptions
                    with your own due diligence before making an offer.
                  </>
                ) : (
                  <>
                    Even at the discounted Profit Entry Point of {formatCurrency(targetPrice)}, this
                    property would{' '}
                    <strong style={{ color: colors.text.primary, fontWeight: 600 }}>
                      cost you about {formatCurrency(Math.abs(Math.round(strategyCashFlow)))}/mo out
                      of pocket
                    </strong>{' '}
                    as a {topStrategyName.toLowerCase()}. That doesn&apos;t mean it&apos;s a bad
                    investment — but it means your returns come from appreciation and equity, not
                    cashflow. Consider whether that fits your strategy.
                  </>
                )}
              </p>
            </div>
          </section>

          {/* Benchmarks — same width and rounded corners as Try Another Strategy card above */}
          <section
            className="px-[1px] sm:px-5 py-8 border-t"
            style={{ borderColor: colors.ui.border }}
          >
            <div
              className="w-full rounded-[14px] p-5"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card-hover)',
              }}
            >
              <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>
                Investor Benchmarks
              </p>
              <h2
                className={tw.textHeading}
                style={{ color: colors.text.primary, marginBottom: 6 }}
              >
                How Does This Stack Up?
              </h2>
              <p
                className={tw.textBody}
                style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}
              >
                We compare this deal against the numbers experienced investors actually look for.
                Green means this deal meets or beats the benchmark.
              </p>
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.ui.border }}>
                    <th
                      className="text-left text-xs font-bold uppercase tracking-wide py-3"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      Metric
                    </th>
                    <th
                      className="text-left text-xs font-bold uppercase tracking-wide py-3"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      This Deal
                    </th>
                    <th
                      className="text-left text-xs font-bold uppercase tracking-wide py-3"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      Target
                    </th>
                    <th className="py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((b, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: colors.ui.border }}>
                      <td
                        className="py-3 text-sm font-medium"
                        style={{ color: colors.text.primary }}
                      >
                        {b.metric}
                      </td>
                      <td
                        className="py-3 text-sm font-semibold tabular-nums"
                        style={{ color: colors.text.primary }}
                      >
                        {b.value}
                      </td>
                      <td
                        className="py-3 text-sm font-medium tabular-nums"
                        style={{ color: 'var(--text-body)' }}
                      >
                        {b.target}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            color:
                              b.status === 'good' ? colors.status.positive : colors.status.negative,
                            background:
                              b.status === 'good' ? colors.accentBg.green : colors.accentBg.red,
                          }}
                        >
                          {b.status === 'good' ? 'Good' : 'Below'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </AuthGate>

        {/* Save CTA — property bookmark + worksheet persistence for dashboard */}
        <section
          className="px-[1px] sm:px-5 py-10 text-center border-t"
          style={{ borderColor: colors.ui.border }}
        >
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 12 }}>
            {isSaved && worksheetDirty ? 'Almost there' : 'You screened it. You proved it.'}
          </p>
          <h2
            className="text-2xl font-extrabold mb-3"
            style={{ color: colors.text.primary, letterSpacing: '-0.5px', lineHeight: 1.25 }}
          >
            {isSaved && worksheetDirty ? 'Save Your Worksheet' : 'Now Save It.'}
          </h2>
          <p
            className="text-[15px] mb-7 mx-auto max-w-md"
            style={{ color: colors.text.body, lineHeight: 1.6 }}
          >
            {isSaved && worksheetDirty
              ? 'Your slider changes are not in DealVault yet. Save the worksheet so your dashboard and deal pages reopen with these numbers.'
              : 'Save to your DealVaultIQ and we&apos;ll keep the numbers fresh and alert you if anything changes.'}
          </p>
          {isAuthenticated ? (
            <>
              {!isSaved ? (
                <button
                  type="button"
                  onClick={() =>
                    save().catch((err) => console.error('Save to DealVault failed:', err))
                  }
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: colors.brand.teal }}
                >
                  {isSaving ? 'Saving…' : 'Save to DealVaultIQ'}
                </button>
              ) : worksheetDirty ? (
                <button
                  type="button"
                  onClick={() => {
                    saveWorksheet()
                      .then((ok) => {
                        if (ok) setWorksheetDirty(false)
                      })
                      .catch((err) => console.error('Save worksheet failed:', err))
                  }}
                  disabled={isSavingWorksheet || !savedPropertyId}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: colors.brand.teal }}
                >
                  {isSavingWorksheet ? 'Saving worksheet…' : 'Save worksheet to DealVault'}
                </button>
              ) : (
                <p
                  className="text-sm font-semibold mb-4"
                  style={{ color: colors.status.positive }}
                >
                  Saved to DealVault ✓
                </p>
              )}
              {isSaved && (
                <p className="text-xs mb-4" style={{ color: 'var(--text-body)' }}>
                  <a
                    href="/dashboard"
                    className="font-semibold underline underline-offset-2"
                    style={{ color: colors.brand.teal }}
                  >
                    View in dashboard
                  </a>
                  {worksheetDirty ? (
                    <>
                      {' '}
                      · or{' '}
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2"
                        style={{ color: colors.brand.teal }}
                        onClick={() => toggle().catch((err) => console.error('Unsave failed:', err))}
                      >
                        remove from DealVault
                      </button>
                    </>
                  ) : (
                    <>
                      {' '}
                      ·{' '}
                      <button
                        type="button"
                        className="font-semibold underline underline-offset-2"
                        style={{ color: colors.brand.teal }}
                        onClick={() => toggle().catch((err) => console.error('Unsave failed:', err))}
                      >
                        remove from DealVault
                      </button>
                    </>
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4"
                style={{ background: colors.brand.teal }}
              >
                Create Free Account
              </button>
              <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                No credit card · 3 free scans per month
              </p>
            </>
          )}
        </section>
      </div>

      <VideoModal
        open={showDealGapVideo}
        onClose={() => setShowDealGapVideo(false)}
        src="/videos/what-is-dealgapiq-v3.mp4"
        title="What is Deal Gap?"
      />

      <PitchScriptModal
        structure={pitchModalStructure}
        onClose={() => setPitchModalStructure(null)}
        propertyAddress={addressParam}
      />
    </div>
  )
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <ScreenErrorBoundary>
        <StrategyContent />
      </ScreenErrorBoundary>
    </Suspense>
  )
}
