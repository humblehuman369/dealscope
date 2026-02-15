/**
 * useDealGap — Hook for Deal Gap calculations and data
 * Matches frontend/src/hooks/useDealGap.ts
 *
 * Computes deal gap metrics from breakeven and list price.
 */

import { useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DealZoneLabel =
  | 'Loss Zone'
  | 'High Risk'
  | 'Breakeven / Negotiate'
  | 'Profit Zone'
  | 'Deep Value';

export type SellerMotivationLevel = 'High' | 'Moderate' | 'Low';

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface DealGapData {
  listPrice: number;
  breakevenPrice: number;
  buyPrice: number;
  dealGapPercent: number;
  buyVsBreakevenPercent: number;
  listVsBreakevenPercent: number;
  zone: DealZoneLabel;
  sellerMotivation: SellerMotivationLevel;
  dealScore: number;
  dealGrade: OpportunityGrade;
}

export interface UseDealGapInput {
  listPrice: number;
  breakevenPrice: number;
  buyPrice: number;
}

export interface UseDealGapResult {
  data: DealGapData;
  /** Compute metrics at a different buy price (for what-if analysis) */
  computeAtPrice: (buyPrice: number) => DealGapData;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDealZone(
  buyPrice: number,
  breakevenPrice: number,
): { zone: DealZoneLabel; motivation: SellerMotivationLevel } {
  const buyBelowBreakevenPct =
    ((breakevenPrice - buyPrice) / breakevenPrice) * 100;

  if (buyPrice > breakevenPrice) return { zone: 'Loss Zone', motivation: 'Low' };
  if (buyBelowBreakevenPct < 2) return { zone: 'High Risk', motivation: 'Moderate' };
  if (buyBelowBreakevenPct < 5) return { zone: 'Breakeven / Negotiate', motivation: 'Moderate' };
  if (buyBelowBreakevenPct < 12) return { zone: 'Profit Zone', motivation: 'High' };
  return { zone: 'Deep Value', motivation: 'High' };
}

function getDealGrade(dealGapPercent: number): OpportunityGrade {
  if (dealGapPercent >= 20) return 'A+';
  if (dealGapPercent >= 15) return 'A';
  if (dealGapPercent >= 10) return 'B';
  if (dealGapPercent >= 5) return 'C';
  if (dealGapPercent >= 0) return 'D';
  return 'F';
}

function computeDealGapData(
  listPrice: number,
  breakevenPrice: number,
  buyPrice: number,
): DealGapData {
  const dealGapPercent =
    listPrice > 0 ? ((listPrice - buyPrice) / listPrice) * 100 : 0;
  const buyVsBreakevenPercent =
    breakevenPrice > 0 ? (buyPrice / breakevenPrice - 1) * 100 : 0;
  const listVsBreakevenPercent =
    breakevenPrice > 0 ? (listPrice / breakevenPrice - 1) * 100 : 0;

  const { zone, motivation } = getDealZone(buyPrice, breakevenPrice);
  const dealGrade = getDealGrade(dealGapPercent);
  const dealScore = Math.min(100, Math.max(0, Math.round(dealGapPercent * 4)));

  return {
    listPrice,
    breakevenPrice,
    buyPrice,
    dealGapPercent,
    buyVsBreakevenPercent,
    listVsBreakevenPercent,
    zone,
    sellerMotivation: motivation,
    dealScore,
    dealGrade,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useDealGap(input: UseDealGapInput): UseDealGapResult {
  const { listPrice, breakevenPrice, buyPrice } = input;

  const data = useMemo(
    () => computeDealGapData(listPrice, breakevenPrice, buyPrice),
    [listPrice, breakevenPrice, buyPrice],
  );

  const computeAtPrice = useMemo(
    () => (newBuyPrice: number) =>
      computeDealGapData(listPrice, breakevenPrice, newBuyPrice),
    [listPrice, breakevenPrice],
  );

  return { data, computeAtPrice };
}

// ─── Utility exports ────────────────────────────────────────────────────────

/** Calculate a suggested buy price based on target discount from breakeven. */
export function calculateSuggestedBuyPrice(
  breakevenPrice: number,
  targetDiscountPercent: number = 10,
): number {
  return Math.round(breakevenPrice * (1 - targetDiscountPercent / 100));
}

/**
 * Calculate buy price from slider position (0-100).
 * 0 = above breakeven (loss zone), 50 = at breakeven, 100 = deep value
 */
export function buyPriceFromSliderPosition(
  breakevenPrice: number,
  position: number,
  range: number = 0.2,
): number {
  const pct = ((50 - position) * range * 2) / 100;
  return Math.round(breakevenPrice * (1 + pct));
}

/** Calculate slider position from buy price. */
export function sliderPositionFromBuyPrice(
  breakevenPrice: number,
  buyPrice: number,
  range: number = 0.2,
): number {
  const pct = buyPrice / breakevenPrice - 1;
  const position = 50 - (pct / (range * 2)) * 100;
  return Math.max(0, Math.min(100, position));
}

export default useDealGap;
