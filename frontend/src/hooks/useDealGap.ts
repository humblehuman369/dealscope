/**
 * useDealGap - Hook for Deal Gap calculations and data
 * 
 * Computes deal gap metrics from Income Value and list price.
 * Uses the backend deal-score API for Income Value calculation.
 */

import { useMemo } from 'react'
import { DealGapData, DealZoneLabel, SellerMotivationLevel, OpportunityGrade } from '@/components/analytics/types'

export interface UseDealGapInput {
  listPrice: number
  incomeValue: number
  buyPrice: number
}

export interface UseDealGapResult {
  data: DealGapData
  /** Compute metrics at a different buy price (for what-if analysis) */
  computeAtPrice: (buyPrice: number) => DealGapData
}

/**
 * Determine the deal zone based on buy position relative to Income Value
 */
function getDealZone(buyPrice: number, incomeValue: number): { zone: DealZoneLabel; motivation: SellerMotivationLevel } {
  const buyBelowIncomeValuePct = ((incomeValue - buyPrice) / incomeValue) * 100

  if (buyPrice > incomeValue) {
    return { zone: 'Loss Zone', motivation: 'Low' }
  }
  if (buyBelowIncomeValuePct < 2) {
    return { zone: 'High Risk', motivation: 'Moderate' }
  }
  if (buyBelowIncomeValuePct < 5) {
    return { zone: 'Income Value / Negotiate', motivation: 'Moderate' }
  }
  if (buyBelowIncomeValuePct < 12) {
    return { zone: 'Profit Zone', motivation: 'High' }
  }
  return { zone: 'Deep Value', motivation: 'High' }
}

/**
 * Get deal grade from deal gap percentage
 */
function getDealGrade(dealGapPercent: number): OpportunityGrade {
  if (dealGapPercent >= 20) return 'A+'
  if (dealGapPercent >= 15) return 'A'
  if (dealGapPercent >= 10) return 'B'
  if (dealGapPercent >= 5) return 'C'
  if (dealGapPercent >= 0) return 'D'
  return 'F'
}

/**
 * Compute deal gap data from prices
 */
function computeDealGapData(listPrice: number, incomeValue: number, buyPrice: number): DealGapData {
  const dealGapPercent = listPrice > 0 ? ((listPrice - buyPrice) / listPrice) * 100 : 0
  const buyVsIncomeValuePercent = incomeValue > 0 ? ((buyPrice / incomeValue) - 1) * 100 : 0
  const listVsIncomeValuePercent = incomeValue > 0 ? ((listPrice / incomeValue) - 1) * 100 : 0
  
  const { zone, motivation } = getDealZone(buyPrice, incomeValue)
  const dealGrade = getDealGrade(dealGapPercent)
  
  // Score: 0-100 based on deal gap (higher gap = higher score)
  const dealScore = Math.min(100, Math.max(0, Math.round(dealGapPercent * 4)))

  return {
    listPrice,
    incomeValue,
    buyPrice,
    dealGapPercent,
    buyVsIncomeValuePercent,
    listVsIncomeValuePercent,
    zone,
    sellerMotivation: motivation,
    dealScore,
    dealGrade,
  }
}

/**
 * Hook to compute deal gap metrics
 */
export function useDealGap(input: UseDealGapInput): UseDealGapResult {
  const { listPrice, incomeValue, buyPrice } = input

  const data = useMemo(() => {
    return computeDealGapData(listPrice, incomeValue, buyPrice)
  }, [listPrice, incomeValue, buyPrice])

  const computeAtPrice = useMemo(() => {
    return (newBuyPrice: number) => computeDealGapData(listPrice, incomeValue, newBuyPrice)
  }, [listPrice, incomeValue])

  return { data, computeAtPrice }
}

/**
 * Calculate a suggested buy price based on target discount from Income Value
 */
export function calculateSuggestedBuyPrice(
  incomeValue: number,
  targetDiscountPercent: number = 10
): number {
  return Math.round(incomeValue * (1 - targetDiscountPercent / 100))
}

/**
 * Calculate buy price from slider position (0-100)
 * 0 = above Income Value (loss zone)
 * 50 = at Income Value
 * 100 = deep value (well below Income Value)
 */
export function buyPriceFromSliderPosition(
  incomeValue: number,
  position: number,
  range: number = 0.20 // +/- 20% of Income Value
): number {
  // Map 0-100 to +range to -range of Income Value
  const pct = ((50 - position) * range * 2) / 100
  return Math.round(incomeValue * (1 + pct))
}

/**
 * Calculate slider position from buy price
 */
export function sliderPositionFromBuyPrice(
  incomeValue: number,
  buyPrice: number,
  range: number = 0.20
): number {
  const pct = (buyPrice / incomeValue) - 1
  const position = 50 - (pct / (range * 2)) * 100
  return Math.max(0, Math.min(100, position))
}

export default useDealGap
