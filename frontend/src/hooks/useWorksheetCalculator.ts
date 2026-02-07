/**
 * useWorksheetCalculator — Unified worksheet calculation hook
 *
 * This is the SINGLE generic hook that powers all 5 worksheet strategies
 * (STR, BRRRR, Flip, Wholesale, HouseHack). Each strategy provides a
 * configuration object that defines:
 *  - API endpoint
 *  - Default inputs
 *  - Property → initial inputs mapping
 *  - Inputs → API payload mapping
 *  - Optional input-update side effects
 *
 * The hook handles the shared boilerplate:
 *  - State management (inputs, result, isCalculating, error)
 *  - One-time initialization from property data
 *  - Debounced API calculation (150ms)
 *  - Error handling
 *  - Generic updateInput with optional side-effect overrides
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { SavedProperty } from '@/types/savedProperty'

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
  // -- State ----------------------------------------------------------------
  const [inputs, setInputs] = useState<TInputs>(config.defaultInputs)
  const [result, setResult] = useState<TResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  // Keep config in a ref so the calculation effect doesn't re-fire when the
  // caller happens to define config inline (unstable reference). The config
  // shape is treated as static for the lifetime of the hook.
  const configRef = useRef(config)
  configRef.current = config

  // -- Initialize from property (once) --------------------------------------
  useEffect(() => {
    if (!property || hasInitialized.current) return

    const overrides = configRef.current.initializeFromProperty(
      property,
      configRef.current.defaultInputs,
    )

    setInputs((prev) => ({ ...prev, ...overrides }))
    hasInitialized.current = true
  }, [property])

  // -- Debounced API calculation --------------------------------------------
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)

      try {
        const payload = configRef.current.buildPayload(inputs)
        const response = await fetch(configRef.current.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              `Failed to calculate ${configRef.current.strategyName} worksheet metrics`,
          )
        }

        setResult(data as TResult)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to calculate ${configRef.current.strategyName} worksheet metrics`
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, CALC_DEBOUNCE_MS)

    return () => clearTimeout(timer)
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
