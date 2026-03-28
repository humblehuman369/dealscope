/**
 * Shared Estimator Contract
 *
 * Defines the unified types consumed by both Quick and Detailed estimator modes,
 * the regional cost context returned by the backend, and the confidence metadata
 * that drives explainability UI.
 */

import type { RehabSelection, RehabPreset } from './analytics'
import type { PropertyCondition, AssetClass } from './rehabIntelligence'

// ============================================
// Property Input (unified shape for both modes)
// ============================================

export interface EstimatorPropertyInput {
  square_footage?: number
  year_built?: number
  arv?: number
  current_value_avm?: number
  zip_code?: string
  bedrooms?: number
  bathrooms?: number
  has_pool?: boolean
  roof_type?: string
  stories?: number
  garage_spaces?: number
  lot_size?: number
  hoa_monthly?: number
}

// ============================================
// Regional Cost Context (from backend)
// ============================================

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface RegionalCostContext {
  region_id: string
  market_label: string
  labor_factor: number
  material_factor: number
  permit_factor: number
  combined_factor: number
  confidence: ConfidenceLevel
  confidence_score: number
  data_sources: string[]
  last_updated: string
}

// ============================================
// Generated Presets (property-specific)
// ============================================

export interface GeneratedPreset extends RehabPreset {
  property_driven: true
  scope_drivers: ScopeDriver[]
}

export interface ScopeDriver {
  field: string
  label: string
  value: string | number
  impact: string
}

// ============================================
// Estimate Confidence Metadata
// ============================================

export interface EstimateConfidence {
  level: ConfidenceLevel
  score: number
  factors: ConfidenceFactor[]
  recommendation: string
}

export interface ConfidenceFactor {
  label: string
  status: 'strong' | 'adequate' | 'weak'
  detail: string
}

// ============================================
// Cost Explanation (for "Why this number" panel)
// ============================================

export interface CostExplanation {
  property_drivers: PropertyDriver[]
  regional_impact: {
    market_label: string
    combined_factor: number
    premium_or_discount_pct: number
  }
  top_cost_contributors: CostContributor[]
  confidence: EstimateConfidence
}

export interface PropertyDriver {
  label: string
  value: string
  effect: 'increases' | 'decreases' | 'neutral'
  description: string
}

export interface CostContributor {
  category: string
  amount: number
  pct_of_total: number
}

// ============================================
// Estimator Events (for feedback loop)
// ============================================

export type EstimatorEventType =
  | 'preset_selected'
  | 'line_item_added'
  | 'line_item_edited'
  | 'line_item_removed'
  | 'contingency_changed'
  | 'condition_changed'
  | 'tier_changed'
  | 'mode_switched'
  | 'estimate_accepted'

export interface EstimatorEvent {
  type: EstimatorEventType
  timestamp: number
  zip_code?: string
  property_sqft?: number
  payload: Record<string, string | number | boolean | undefined>
}
