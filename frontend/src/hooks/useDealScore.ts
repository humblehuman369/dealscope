/**
 * useDealScore - Hook for calculating Deal Score via backend API
 * 
 * This hook ensures all worksheets use the centralized backend calculation
 * for Deal Score, providing consistency across the application.
 * 
 * NO FINANCIAL CALCULATIONS ARE DONE IN THIS HOOK - all math is on the backend.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'

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
  // Enhanced Deal Opportunity Score - Listing Context (optional)
  listingStatus?: string | null
  sellerType?: string | null
  isForeclosure?: boolean
  isBankOwned?: boolean
  isFsbo?: boolean
  isAuction?: boolean
  priceReductions?: number
  daysOnMarket?: number | null
}

export interface DealScoreFactors {
  dealGapScore: number
  dealGapPercent: number
  availabilityScore: number
  availabilityStatus: string
  availabilityLabel: string
  availabilityMotivation: 'high' | 'medium' | 'low'
  domScore: number
  domLeverage: 'high' | 'medium' | 'low' | 'unknown'
  daysOnMarket: number | null
}

export interface DealScoreResult {
  dealScore: number
  dealVerdict: string
  discountPercent: number
  incomeValue: number
  purchasePrice: number
  listPrice: number
  // Enhanced scoring (populated when listing context provided)
  factors?: DealScoreFactors
  grade?: string
  color?: string
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
      const data = await api.post<Record<string, any>>(
        '/api/v1/worksheet/deal-score',
        {
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
          // Enhanced Deal Opportunity Score - Listing Context
          listing_status: input.listingStatus,
          seller_type: input.sellerType,
          is_foreclosure: input.isForeclosure,
          is_bank_owned: input.isBankOwned,
          is_fsbo: input.isFsbo,
          is_auction: input.isAuction,
          price_reductions: input.priceReductions,
          days_on_market: input.daysOnMarket,
        },
        { signal: abortControllerRef.current.signal },
      )
      
      setResult({
        dealScore: data.deal_score,
        dealVerdict: data.deal_verdict,
        discountPercent: data.discount_percent,
        incomeValue: data.income_value ?? data.breakeven_price,
        purchasePrice: data.purchase_price,
        listPrice: data.list_price,
        grade: data.grade,
        color: data.color,
        factors: data.factors ? {
          dealGapScore: data.factors.deal_gap_score,
          dealGapPercent: data.factors.deal_gap_percent,
          availabilityScore: data.factors.availability_score,
          availabilityStatus: data.factors.availability_status,
          availabilityLabel: data.factors.availability_label,
          availabilityMotivation: data.factors.availability_motivation,
          domScore: data.factors.dom_score,
          domLeverage: data.factors.dom_leverage,
          daysOnMarket: data.factors.days_on_market,
        } : undefined,
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
    // Listing context dependencies
    input.listingStatus,
    input.sellerType,
    input.isForeclosure,
    input.isBankOwned,
    input.isFsbo,
    input.isAuction,
    input.priceReductions,
    input.daysOnMarket,
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

/**
 * Grade labels for Deal Score display
 */
export type DealScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
export type DealScoreLabel = 'STRONG OPPORTUNITY' | 'GOOD OPPORTUNITY' | 'MODERATE OPPORTUNITY' | 'MARGINAL OPPORTUNITY' | 'UNLIKELY OPPORTUNITY' | 'PASS'

export interface DealScoreGradeDisplay {
  grade: DealScoreGrade
  label: DealScoreLabel
  color: string
}

export function getDealScoreGrade(score: number): DealScoreGradeDisplay {
  if (score >= 85) return { grade: 'A+', label: 'STRONG OPPORTUNITY', color: '#22c55e' }
  if (score >= 70) return { grade: 'A', label: 'GOOD OPPORTUNITY', color: '#22c55e' }
  if (score >= 55) return { grade: 'B', label: 'MODERATE OPPORTUNITY', color: '#84cc16' }
  if (score >= 40) return { grade: 'C', label: 'MARGINAL OPPORTUNITY', color: '#f97316' }
  if (score >= 25) return { grade: 'D', label: 'UNLIKELY OPPORTUNITY', color: '#f97316' }
  return { grade: 'F', label: 'PASS', color: '#ef4444' }
}
