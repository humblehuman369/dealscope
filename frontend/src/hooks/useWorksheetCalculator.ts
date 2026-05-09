/**
 * useWorksheetCalculator — Unified worksheet calculation hook
 *
 * This is the SINGLE generic hook that powers all 5 worksheet strategies
 * (STR, BRRRR, Flip, Wholesale, HouseHack). Each strategy provides a
 * configuration object that defines:
 *  - API endpoint
 *  - Default inputs
 *  - Property → initial inputs mapping
 *  - Admin-resolved-defaults → inputs mapping (defaults-architecture rule)
 *  - Inputs → API payload mapping
 *  - Optional input-update side effects
 *
 * The hook handles the shared boilerplate:
 *  - State management (inputs, result, isCalculating, error)
 *  - One-time initialization from static defaults → admin defaults → property
 *  - Debounced API calculation (150ms)
 *  - Error handling
 *  - Generic updateInput with optional side-effect overrides
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { SavedProperty } from '@/types/savedProperty'
import { useDefaults } from './useDefaults'
import type { AllAssumptions } from '@/stores/index'

// ---------------------------------------------------------------------------
// Configuration interface — each strategy implements this
// ---------------------------------------------------------------------------

export interface WorksheetStrategyConfig<
  TInputs extends object,
  TResult,
> {
  /** POST endpoint, e.g. '/api/v1/worksheet/str/calculate' */
  apiUrl: string

  /** Human-readable name for error messages, e.g. 'STR' */
  strategyName: string

  /** Static default values used before property data loads */
  defaultInputs: TInputs

  /**
   * Derive initial overrides from the property data snapshot.
   * Return a partial object — only the fields that should differ from defaults.
   */
  initializeFromProperty: (property: SavedProperty, defaults: TInputs) => Partial<TInputs>

  /**
   * Map admin-resolved defaults (system → market → user assumptions, from
   * `useDefaults()`) onto the strategy's input shape. Return a partial
   * object — only the fields that should be sourced from admin. Property
   * overrides win, so this should NOT include property-derived fields.
   */
  applyAdminDefaults?: (admin: AllAssumptions) => Partial<TInputs>

  /**
   * Transform the current inputs into the API payload shape.
   * The payload is JSON-stringified and POSTed to `apiUrl`.
   */
  buildPayload: (inputs: TInputs) => Record<string, unknown>

  /**
   * Optional: Handle coupled field updates (e.g. changing loan_to_cost_pct
   * should sync down_payment_pct). Return a full new inputs object to apply,
   * or `null` to fall through to the default simple key-value set.
   */
  onUpdateInput?: (
    key: keyof TInputs,
    value: unknown,
    prev: TInputs,
  ) => TInputs | null
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseWorksheetCalculatorReturn<
  TInputs extends object,
  TResult,
> {
  inputs: TInputs
  updateInput: <K extends keyof TInputs>(key: K, value: TInputs[K]) => void
  result: TResult | null
  isCalculating: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CALC_DEBOUNCE_MS = 150

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorksheetCalculator<
  TInputs extends object,
  TResult,
>(
  property: SavedProperty | null,
  config: WorksheetStrategyConfig<TInputs, TResult>,
): UseWorksheetCalculatorReturn<TInputs, TResult> {
  // -- Admin-resolved defaults (system → market → user) --------------------
  // Drives initial slider values so e.g. STR `platform_fees_pct`,
  // `furnishing_budget`, `cleaning_cost_per_turn` reflect whatever the owner
  // has configured in /admin/assumptions instead of static fallbacks.
  const zip = property?.address_zip || undefined
  const { defaults: adminDefaults } = useDefaults(zip)

  // -- State ----------------------------------------------------------------
  const [inputs, setInputs] = useState<TInputs>(config.defaultInputs)
  const [result, setResult] = useState<TResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)
  const adminAppliedRef = useRef(false)

  // Keep config in a ref so the calculation effect doesn't re-fire when the
  // caller happens to define config inline (unstable reference). The config
  // shape is treated as static for the lifetime of the hook.
  const configRef = useRef(config)
  configRef.current = config

  // -- Initialize from property (once) --------------------------------------
  // Resolution order: static defaults → admin defaults → property snapshot.
  // Property snapshot wins so real listing data is never replaced by an
  // admin assumption.
  useEffect(() => {
    if (!property || hasInitialized.current) return

    const adminOverrides =
      adminDefaults && configRef.current.applyAdminDefaults
        ? configRef.current.applyAdminDefaults(adminDefaults)
        : {}

    const propertyOverrides = configRef.current.initializeFromProperty(
      property,
      configRef.current.defaultInputs,
    )

    setInputs((prev) => ({ ...prev, ...adminOverrides, ...propertyOverrides }))
    hasInitialized.current = true
    adminAppliedRef.current = !!adminDefaults
  }, [property, adminDefaults])

  // -- Late-arriving admin defaults ----------------------------------------
  // If property arrived first and admin defaults resolve later, layer them
  // in once. We only overwrite admin-managed fields; the user's edits and
  // property snapshot values are preserved by re-applying property
  // overrides on top.
  useEffect(() => {
    if (!property) return
    if (!adminDefaults) return
    if (!hasInitialized.current) return
    if (adminAppliedRef.current) return
    if (!configRef.current.applyAdminDefaults) {
      adminAppliedRef.current = true
      return
    }

    const adminOverrides = configRef.current.applyAdminDefaults(adminDefaults)
    const propertyOverrides = configRef.current.initializeFromProperty(
      property,
      configRef.current.defaultInputs,
    )

    setInputs((prev) => ({ ...prev, ...adminOverrides, ...propertyOverrides }))
    adminAppliedRef.current = true
  }, [adminDefaults, property])

  // -- Debounced API calculation --------------------------------------------
  useEffect(() => {
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)

      try {
        const payload = configRef.current.buildPayload(inputs)
        const data = await apiRequest<TResult>(configRef.current.apiUrl, {
          method: 'POST',
          body: payload,
          signal: controller.signal,
        })

        setResult(data)
      } catch (err) {
        if (controller.signal.aborted) return
        const message =
          err instanceof Error
            ? err.message
            : `Failed to calculate ${configRef.current.strategyName} worksheet metrics`
        setError(message)
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculating(false)
        }
      }
    }, CALC_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [inputs])

  // -- Input updater --------------------------------------------------------
  const updateInput = useCallback(
    <K extends keyof TInputs>(key: K, value: TInputs[K]) => {
      setInputs((prev) => {
        if (configRef.current.onUpdateInput) {
          const overridden = configRef.current.onUpdateInput(key, value, prev)
          if (overridden) return overridden
        }
        return { ...prev, [key]: value }
      })
    },
    [],
  )

  return { inputs, updateInput, result, isCalculating, error }
}
