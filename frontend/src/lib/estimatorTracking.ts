/**
 * Estimator Event Tracking
 *
 * Thin wrapper over the app-wide trackEvent() that provides structured
 * event names and payloads for the Rehab Estimator.  Downstream consumers
 * (Vercel Analytics today, calibration pipeline later) use these events to:
 *
 *  - Measure preset adoption vs manual build
 *  - Detect systematic user corrections by market/category
 *  - Track estimate-to-underwriting conversion
 */

import { trackEvent } from './eventTracking'
import type { EstimatorEventType } from './estimatorTypes'

function fire(
  type: EstimatorEventType,
  props: Record<string, string | number | boolean | undefined>,
): void {
  trackEvent(`estimator_${type}`, props)
}

export function trackPresetSelected(
  presetId: string,
  isPropertyDriven: boolean,
  zipCode?: string,
  sqft?: number,
): void {
  fire('preset_selected', {
    preset_id: presetId,
    property_driven: isPropertyDriven,
    zip_code: zipCode,
    sqft,
  })
}

export function trackLineItemAdded(
  itemId: string,
  quantity: number,
  zipCode?: string,
): void {
  fire('line_item_added', { item_id: itemId, quantity, zip_code: zipCode })
}

export function trackLineItemEdited(
  itemId: string,
  oldQuantity: number,
  newQuantity: number,
  zipCode?: string,
): void {
  fire('line_item_edited', {
    item_id: itemId,
    old_quantity: oldQuantity,
    new_quantity: newQuantity,
    zip_code: zipCode,
  })
}

export function trackLineItemRemoved(
  itemId: string,
  zipCode?: string,
): void {
  fire('line_item_removed', { item_id: itemId, zip_code: zipCode })
}

export function trackContingencyChanged(
  oldPct: number,
  newPct: number,
  zipCode?: string,
): void {
  fire('contingency_changed', {
    old_pct: oldPct,
    new_pct: newPct,
    zip_code: zipCode,
  })
}

export function trackConditionChanged(
  condition: string,
  zipCode?: string,
): void {
  fire('condition_changed', { condition, zip_code: zipCode })
}

export function trackTierChanged(
  tier: string,
  zipCode?: string,
): void {
  fire('tier_changed', { tier, zip_code: zipCode })
}

export function trackModeSwitched(
  fromMode: string,
  toMode: string,
): void {
  fire('mode_switched', { from_mode: fromMode, to_mode: toMode })
}

export function trackEstimateAccepted(
  totalEstimate: number,
  presetId: string | null,
  isPropertyDriven: boolean,
  zipCode?: string,
  sqft?: number,
  confidence?: string,
): void {
  fire('estimate_accepted', {
    total_estimate: totalEstimate,
    preset_id: presetId ?? 'custom',
    property_driven: isPropertyDriven,
    zip_code: zipCode,
    sqft,
    confidence,
  })
}
