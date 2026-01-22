/**
 * useDealScore - Hook for calculating Deal Score via backend API
 * 
 * This hook ensures all worksheets use the centralized backend calculation
 * for Deal Score, providing consistency across the application.
 * 
 * NO FINANCIAL CALCULATIONS ARE DONE IN THIS HOOK - all math is on the backend.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface DealScoreInput {
  listPrice: number
  purchasePrice: number
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  // Optional overrides
  vacancyRate?: number
  maintenancePct?: number
  managementPct?: number
  downPaymentPct?: number
  interestRate?: number
  loanTermYears?: number
}

export interface DealScoreResult {
  dealScore: number
  dealVerdict: string
  discountPercent: number
  breakevenPrice: number
  purchasePrice: number
  listPrice: number
  calculationDetails?: {
    monthly_rent: number
    property_taxes: number
    insurance: number
    vacancy_rate: number
    maintenance_pct: number
    management_pct: number
    down_payment_pct: number
    interest_rate: number
    loan_term_years: number
  }
}

interface UseDealScoreOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Whether to fetch immediately on mount */
  fetchOnMount?: boolean
}

interface UseDealScoreReturn {
  /** The Deal Score result from the backend */
  result: DealScoreResult | null
  /** Whether the calculation is in progress */
  isLoading: boolean
  /** Error message if calculation failed */
  error: string | null
  /** Manually trigger a recalculation */
  recalculate: () => void
}

/**
 * Hook to calculate Deal Score via the backend API.
 * 
 * @param input - The calculation inputs
 * @param options - Hook options
 * @returns Deal Score result, loading state, and error
 * 
 * @example
 * ```tsx
 * const { result, isLoading, error } = useDealScore({
 *   listPrice: 500000,
 *   purchasePrice: 450000,
 *   monthlyRent: 3500,
 *   propertyTaxes: 6000,
 *   insurance: 2000,
 * })
 * 
 * if (result) {
 *   console.log(`Deal Score: ${result.dealScore} - ${result.dealVerdict}`)
 * }
 * ```
 */
export function useDealScore(
  input: DealScoreInput,
  options: UseDealScoreOptions = {}
): UseDealScoreReturn {
  const { debounceMs = 300, fetchOnMount = true } = options
  
  const [result, setResult] = useState<DealScoreResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const fetchDealScore = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Validate inputs
    if (!input.listPrice || !input.purchasePrice || !input.monthlyRent) {
      return
    }
    
    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/worksheet/deal-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          list_price: input.listPrice,
          purchase_price: input.purchasePrice,
          monthly_rent: input.monthlyRent,
          property_taxes: input.propertyTaxes,
          insurance: input.insurance,
          vacancy_rate: input.vacancyRate,
          maintenance_pct: input.maintenancePct,
          management_pct: input.managementPct,
          down_payment_pct: input.downPaymentPct,
          interest_rate: input.interestRate,
          loan_term_years: input.loanTermYears,
        }),
        signal: abortControllerRef.current.signal,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to calculate deal score')
      }
      
      const data = await response.json()
      
      setResult({
        dealScore: data.deal_score,
        dealVerdict: data.deal_verdict,
        discountPercent: data.discount_percent,
        breakevenPrice: data.breakeven_price,
        purchasePrice: data.purchase_price,
        listPrice: data.list_price,
        calculationDetails: data.calculation_details,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('[useDealScore] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [
    input.listPrice,
    input.purchasePrice,
    input.monthlyRent,
    input.propertyTaxes,
    input.insurance,
    input.vacancyRate,
    input.maintenancePct,
    input.managementPct,
    input.downPaymentPct,
    input.interestRate,
    input.loanTermYears,
  ])
  
  // Debounced fetch when inputs change
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      fetchDealScore()
    }, debounceMs)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [fetchDealScore, debounceMs])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])
  
  return {
    result,
    isLoading,
    error,
    recalculate: fetchDealScore,
  }
}

/**
 * Get Deal Score color based on score value.
 * This is a display utility - no calculation involved.
 */
export function getDealScoreColor(score: number): string {
  if (score >= 80) return '#10B981' // Green
  if (score >= 60) return '#3B82F6' // Blue
  if (score >= 40) return '#F59E0B' // Amber
  if (score >= 20) return '#F97316' // Orange
  return '#EF4444' // Red
}

/**
 * Get Deal Score gauge angle for display.
 * This is a display utility - no calculation involved.
 */
export function getDealScoreGaugeAngle(score: number): number {
  return 180 - (score * 1.8)
}
