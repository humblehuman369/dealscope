'use client'

/**
 * StrategyWorkbench — the full financial deep-dive for a property (Deal Gap bar,
 * strategy picker, DealMaker worksheet, deal-structure Options, benchmarks).
 *
 * Extracted from the old `app/strategy/page.tsx` (R4 Stage 1) and now embedded
 * exclusively in Discovery as Level 3 of progressive disclosure (R4 Stage 4 —
 * `/strategy` 301s to `/discovery?view=workbench`). URL parsing and auth-redirect
 * construction live in the host page — everything else the workbench needs
 * comes from shared state (`usePropertyData`, `useDealSnapshot`, session hooks).
 *
 * IMPORTANT: every early return must stay BELOW the hooks (React #310 has
 * bitten this page before).
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useRef,
} from 'react'
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
import { usePersona } from '@/hooks/usePersona'
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
import { computeDealGapIncomeValue } from '@/lib/dealGapIncomeValue'
import { computeLtrMetricsFromState } from '@/lib/ltrWorksheetMetrics'
import {
  IQEstimateSelector,
  type IQEstimateSources,
} from '@/components/iq-verdict/IQEstimateSelector'
import {
  buildVerdictAnalysisPayload,
  buildVerdictBaseFromPropertyResponse,
  toOccupancyFraction,
  type VerdictPayloadBase,
} from '@/utils/verdictPayload'
import { mapPropertyToIQSources } from '@/utils/propertySourceMapper'
import { useDealSnapshot } from '@/hooks/useDealSnapshot'
import {
  effectiveMarketValueFromRecord,
  effectiveMonthlyRentFromRecord,
} from '@/lib/dealMakerOverrides'
import { AuthGate } from '@/components/auth/AuthGate'
import { StrategyUnlockPanel } from '@/components/auth/StrategyUnlockPanel'
import {
  formatBuyerDirectoryLabel,
  formatLenderDirectoryTotal,
} from '@/lib/directory-promo'
import {
  strategyWorksheetAnchorId,
  type StrategyWorksheetSection,
} from '@/components/iq-verdict/strategyWorksheetSection'
import { LoadingProperty, ErrorProperty } from '@/components/ui/PropertyStates'
import { VideoModal } from '@/components/ui/VideoModal'
import { DealMakerWorksheet } from '@/features/deal-maker/components/DealMakerWorksheet'
import { downloadComprehensiveExcel } from '@/features/strategy/exportComprehensiveExcel'
import { STRRegulatoryBadge } from '@/components/analytics/STRRegulatoryBadge'
import { STRConfidenceLabel } from '@/components/analytics/STRConfidenceLabel'
import type {
  StrategyType,
  AnyStrategyState,
  LTRDealMakerState,
} from '@/features/deal-maker/components/types'
import type { InlineDealMakerValues } from '@/components/strategy/InlineDealMakerPanel'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { PitchScriptModal } from '@/components/iq-verdict/PitchScriptModal'
import { trackEvent } from '@/lib/eventTracking'
import { StrategySelectDropdown } from './StrategySelectDropdown'
import { InfoPopover } from '@/components/ui/InfoPopover'
import { METRIC_GLOSSARY } from '../lib/metricGlossary'
import { orderPathsForPersona } from '../lib/orderPathsForPersona'
import { DealGapBar } from './DealGapBar'
import { NextStepsSection } from './NextStepsSection'
import { OptionsSection } from './OptionsSection'
import { BenchmarksSection } from './BenchmarksSection'
import { SaveCtaSection } from './SaveCtaSection'
import {
  STRATEGIES_WITHOUT_OPTIONS,
  STRATEGY_EXCLUDED_TEMPLATE_IDS,
  STRATEGY_LABEL,
  formatCurrency,
  colors,
  toStrategyType,
  type BackendAnalysisResponse,
} from '../lib/shared'
import { buildWorksheetState } from '../lib/buildWorksheetState'
import { buildWorksheetMetrics } from '../lib/buildWorksheetMetrics'

export interface StrategyWorkbenchProps {
  /** Canonical full address (the `?address=` param on /strategy). */
  address: string
  /** Selected strategy id, e.g. 'long-term-rental' (the `?strategy=` param). */
  strategyId?: string | null
  /** Property-condition adjustment 1–5 (the `?condition=` param). */
  condition?: string | null
  /** Location-quality adjustment (the `?location=` param). */
  location?: string | null
  /** Worksheet section to scroll to on load (parsed `?section=` param). */
  initialSection?: StrategyWorksheetSection | null
  /** Raw encoded Three Paths scenario payload (the `?scenario=` param). */
  scenarioParam?: string | null
  /** Called once a scenario payload has been applied so the host can strip it from the URL. */
  onScenarioConsumed?: () => void
  /** Sign-in URL with a redirect back to this view (built by the host page). */
  signInUrl: string
}

export function StrategyWorkbench({
  address,
  strategyId = null,
  condition = null,
  location = null,
  initialSection = null,
  scenarioParam = null,
  onScenarioConsumed,
  signInUrl,
}: StrategyWorkbenchProps) {
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: sessionLoading } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()
  const {
    preferredStrategyIds,
    experience,
    isNovice,
    isLoading: personaLoading,
  } = usePersona()
  // R7: experienced investors get a denser page — explanatory prose collapses
  // and creative deal structures lead. Beginners get glossary popovers and
  // benchmark targets inline. Anonymous users render exactly as before.
  const denseMode = experience === 'advanced' || experience === 'expert'

  const addressParam = address
  const conditionParam = condition
  const locationParam = location
  const strategyParam = strategyId
  const worksheetSectionParam = initialSection
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
    rent: { iq: null, zillow: null, rentcast: null, redfin: null },
  })
  const [sourceOverrides, setSourceOverrides] = useState<{ price?: number; monthlyRent?: number }>(
    {},
  )
  const [isRecalculating, setIsRecalculating] = useState(false)
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
    // Wait for the persona before locking so the expert creative-first order
    // (R7) is what gets frozen, not the pre-profile default.
    if (personaLoading) return
    setLockedPathOrder((prev) => {
      if (prev.length === 0) {
        return orderPathsForPersona(displayDealStructurePaths, experience).map((p) => p.id)
      }
      const known = new Set(prev)
      const additions = displayDealStructurePaths.map((p) => p.id).filter((id) => !known.has(id))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [displayDealStructurePaths, personaLoading, experience])

  const orderedDealStructurePaths = useMemo(() => {
    if (lockedPathOrder.length === 0) {
      return orderPathsForPersona(displayDealStructurePaths, experience)
    }
    const byId = new Map(displayDealStructurePaths.map((p) => [p.id, p]))
    return lockedPathOrder
      .map((id) => byId.get(id))
      .filter((p): p is DealStructure => p !== undefined)
  }, [displayDealStructurePaths, lockedPathOrder, experience])

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

  // Three Paths: apply the encoded scenario payload from Verdict, then let the
  // host strip it from the URL (`onScenarioConsumed`).
  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    const sc = scenarioParam
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

    onScenarioConsumed?.()
    // scheduleRecalc / markWorksheetDirty are declared after this effect; calling
    // them in the body is safe (resolved at run time), but they must stay out of
    // the deps array to avoid a temporal-dead-zone reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressParam, scenarioParam, onScenarioConsumed])

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
      // Persist the AirROI per-property monthly STR revenue so the worksheet
      // keeps using it after save/reload without re-fetching.
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
      // STR inputs live on the PropertyResponse `rentals` object (AirROI-fed),
      // not top-level — reading top-level silently sent null and forced the
      // backend onto its rent-heuristic ADR + 65% occupancy defaults.
      averageDailyRate: propInfo?.averageDailyRate ?? propInfo?.rentals?.average_daily_rate ?? null,
      occupancyRate: toOccupancyFraction(
        propInfo?.occupancyRate ?? propInfo?.rentals?.occupancy_rate,
      ),
      monthlyStrRevenue: propInfo?.rentals?.str_market_stats?.monthly_revenue_per_bed ?? null,
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

  const handleStrategyChange = useCallback(
    (strategyIdArg: string) => {
      setSelectedStrategyId(strategyIdArg)
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

  const worksheetState: AnyStrategyState = buildWorksheetState({
    currentStrategyType,
    dealMakerOverrides,
    inlineOverrides,
    dealRecordArv: dealRecord?.arv,
    bd,
    data,
    propertyInfo,
    listPrice,
    targetPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
    rehabCost,
    rate,
    downPaymentPct,
    closingCostsPct,
    loanTermYears,
    vacancyPct,
    maintPct,
    mgmtPct,
    reservesPct,
    dealGapOperatingOverrides,
  })

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

  // R7: novices see each key metric's benchmark target right in the bar,
  // instead of having to connect it to the benchmarks table further down.
  const KEY_BAR_BENCHMARK_SOURCE: Record<string, string> = isFlipOrWholesale
    ? { 'COC Return': 'ROI', 'Annual Profit': 'Profit' }
    : { 'CAP Rate': 'Cap Rate', 'COC Return': 'Cash-on-Cash' }
  const benchmarkForKeyMetric = (label: string) =>
    isNovice ? (benchmarks.find((b) => b.metric === KEY_BAR_BENCHMARK_SOURCE[label]) ?? null) : null

  const worksheetMetrics = buildWorksheetMetrics({
    currentStrategyType,
    worksheetState,
    bd,
    propertyTaxes,
    insurance,
    totalExpenses,
    monthlyPI,
    loanAmount,
    noi,
    dealGapPct,
    strategyCashFlow,
    strategyAnnualCashFlow,
    capRateVal,
    cocVal,
    ltrLiveMetrics,
    dealGapOperatingOverrides,
  })

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

  const strategyUnlockOverlay = (
    <StrategyUnlockPanel
      signInUrl={signInUrl}
      optionCount={strategyFilteredPaths.slice(0, 4).length}
      buyerTotalLabel={formatBuyerDirectoryLabel(null)}
      lenderTotalLabel={formatLenderDirectoryTotal()}
    />
  )

  return (
    <div
      className="strategy-page-shell"
      style={{
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      }}
    >
      {/* Header and property bar are provided by AppHeader in layout */}

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto">
        {/* Deal Gap Price Cards + Scale Bar — synced with Verdict page */}
        <DealGapBar
          listPrice={listPrice}
          targetPrice={targetPrice}
          incomeValue={dealGapIncomeValue}
          listingStatus={propertyInfo?.listingStatus}
          isRecalculating={isRecalculating}
          valuationSnap={valuationSnap}
          onWatchVideo={() => setShowDealGapVideo(true)}
        />

        {/* Next Steps — authenticated only; anon users see the unlock panel instead */}
        {isAuthenticated && (
          <NextStepsSection
            isExporting={isExporting}
            isRecalculating={isRecalculating}
            dealGapPct={dealGapPct}
            onDownloadPDF={() => handlePDFDownload('light')}
            onDownloadExcel={() => {
              void handleComprehensiveExcelDownload()
            }}
          />
        )}

        {/* Apply a Path — authenticated only */}
        {isAuthenticated && (
          <OptionsSection
            hasPaths={displayDealStructurePaths.length > 0}
            optionsHiddenForStrategy={optionsHiddenForStrategy}
            strategyFilteredPaths={strategyFilteredPaths}
            appliedPathId={appliedPathId}
            optionsSubtitle={optionsSubtitle}
            appliedPathEntry={appliedPathEntry}
            propertyState={propertyInfo?.state ?? parsed.state ?? null}
            onSwitchToLongTerm={() => handleStrategyChange('long-term-rental')}
            onClearPath={clearAppliedPath}
            onApplyPath={applyPathPatch}
            onShowPitch={setPitchModalStructure}
          />
        )}

        {/* Financial Breakdown — requires free (logged-in) tier */}
        <AuthGate
          feature="view the full strategy breakdown"
          mode="section"
          overlay={strategyUnlockOverlay}
        >
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
                const preferred = new Set(preferredStrategyIds)
                const available = STRATEGY_DISPLAY.filter((s) =>
                  sortedStrategies.some((ss) => ss.id === s.id),
                )
                  .map((s) => ({ ...s, preferred: preferred.has(s.id) }))
                  // Persona-aware ordering: the user's onboarding strategies
                  // surface first in the picker; everything stays selectable.
                  .sort((a, b) => Number(b.preferred) - Number(a.preferred))
                return (
                  <StrategySelectDropdown
                    options={available}
                    activeId={activeStrategyId}
                    onChange={handleStrategyChange}
                    groupPreferred={isNovice && preferredStrategyIds.length > 0}
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
                ].map((m, i) => {
                  const glossary = isNovice ? METRIC_GLOSSARY[m.label] : undefined
                  const keyBenchmark = benchmarkForKeyMetric(m.label)
                  return (
                    <div
                      key={i}
                      className="flex flex-col text-center items-center py-0.5 sm:py-1"
                    >
                      {glossary ? (
                        <InfoPopover
                          ariaLabel={`What does ${m.label} mean?`}
                          label={
                            <span
                              className="text-[10px] sm:text-xs uppercase tracking-wider underline decoration-dotted underline-offset-2"
                              style={{ color: 'var(--text-body)' }}
                            >
                              {m.label}
                            </span>
                          }
                          content={
                            <p
                              className="text-xs leading-relaxed text-left normal-case"
                              style={{ color: 'var(--text-body)' }}
                            >
                              {glossary}
                            </p>
                          }
                          className="inline-flex"
                          panelClassName="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-56 rounded-lg border border-[var(--border-default)] bg-[var(--chart-tooltip)] px-3 py-2.5 shadow-lg"
                        />
                      ) : (
                        <span
                          className="text-[10px] sm:text-xs uppercase tracking-wider"
                          style={{ color: 'var(--text-body)' }}
                        >
                          {m.label}
                        </span>
                      )}
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
                      {keyBenchmark && (
                        <span
                          className="text-[9px] font-medium tabular-nums"
                          style={{
                            color:
                              keyBenchmark.status === 'good'
                                ? 'var(--status-positive)'
                                : 'var(--status-negative)',
                          }}
                        >
                          Target {keyBenchmark.target}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STR Market Intelligence (AirROI) */}
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
          <BenchmarksSection benchmarks={benchmarks} dense={denseMode} />
        </AuthGate>

        {/* Save CTA — property bookmark + worksheet persistence for dashboard */}
        <SaveCtaSection
          isAuthenticated={isAuthenticated}
          isSaved={isSaved}
          isSaving={isSaving}
          worksheetDirty={worksheetDirty}
          isSavingWorksheet={isSavingWorksheet}
          savedPropertyId={savedPropertyId}
          onSave={() => {
            save().catch((err) => console.error('Save to DealVault failed:', err))
          }}
          onSaveWorksheet={() => {
            saveWorksheet()
              .then((ok) => {
                if (ok) setWorksheetDirty(false)
              })
              .catch((err) => console.error('Save worksheet failed:', err))
          }}
          onToggleSaved={() => {
            toggle().catch((err) => console.error('Unsave failed:', err))
          }}
          onRegister={() => openAuthModal('register')}
        />
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
