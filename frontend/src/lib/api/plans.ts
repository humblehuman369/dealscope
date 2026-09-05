/**
 * Make It Work plan endpoints — narrative, email-first save, magic-link consume.
 */

import { api } from '@/lib/api-client'
import type { ScenarioPayloadV1 } from '@/lib/dealStructures/scenarioPayload'
import type { WizardAnswers } from '@/components/iq-verdict/make-it-work/wizardMapping'

export interface PlanNarrativeRequest {
  address: string
  family: string
  family_label: string
  headline: string
  bullets: string[]
  levers: Array<{ label: string; before_label: string; after_label: string }>
  monthly_savings: number
  cash_required: number
  list_price: number | null
  target_buy_price: number | null
  wizard_answers: WizardAnswers
}

export interface PlanNarrative {
  summary: string
  pitch: string
  source: 'ai' | 'template'
}

export function requestPlanNarrative(body: PlanNarrativeRequest): Promise<PlanNarrative> {
  return api.post<PlanNarrative>('/api/v1/plans/narrative', body, { softAuth: true, timeoutMs: 12_000 })
}

export interface BreakevenWayInput {
  family: 'price' | 'income' | 'financing' | 'capital_stack'
  name: string
  change_pct: number | null
  change_amount: number | null
  result_amount: number
  result_label: string
  closes_gap_alone: boolean
  terms_note: string | null
  rating: 'high' | 'medium' | 'low' | 'your_call' | null
  reasons: string[]
  cash_required: number | null
}

export interface BreakevenNarrativeRequest {
  address: string
  list_price: number | null
  target_buy_price: number | null
  income_value: number | null
  gap_amount: number | null
  gap_pct: number | null
  monthly_shortfall: number | null
  baseline_cash_required: number | null
  ways: BreakevenWayInput[]
  blend_recommendation: string | null
}

/**
 * The section's "Your move". Deliberately not per-lever text: every row
 * already shows its own change, result, and likelihood, so prose that repeats
 * them adds nothing. This is sequencing and a walk-away instead.
 */
export interface BreakevenNarrative {
  /** The opening play and the order of asks. */
  move: string
  /** The line past which this stops being a deal. */
  walk_away: string
  source: 'ai' | 'template'
}

export function requestBreakevenNarrative(body: BreakevenNarrativeRequest): Promise<BreakevenNarrative> {
  return api.post<BreakevenNarrative>('/api/v1/plans/breakeven-narrative', body, {
    softAuth: true,
    timeoutMs: 12_000,
  })
}

export interface PlanClaimRequest {
  email: string
  address: string
  address_parts: {
    street: string
    city?: string
    state?: string
    zip?: string
  }
  zpid?: string | null
  latitude?: number | null
  longitude?: number | null
  property_snapshot: Record<string, unknown>
  scenario: ScenarioPayloadV1 | null
  wizard_answers: WizardAnswers
  narrative: PlanNarrative | null
}

export interface PlanClaimResponse {
  status: 'accepted'
  message: string
}

export function claimPlan(body: PlanClaimRequest): Promise<PlanClaimResponse> {
  return api.post<PlanClaimResponse>('/api/v1/plans/claim', body, { softAuth: true })
}

export interface MagicLinkConsumeResponse {
  redirect: string
  access_token?: string | null
  refresh_token?: string | null
}

export function consumeMagicLink(
  token: string,
  next?: string | null,
): Promise<MagicLinkConsumeResponse> {
  const query = next ? `?${new URLSearchParams({ next }).toString()}` : ''
  return api.post<MagicLinkConsumeResponse>(
    `/api/v1/auth/magic-link/consume${query}`,
    { token },
    { skipAuth: true },
  )
}
