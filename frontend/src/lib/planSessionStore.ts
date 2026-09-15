/**
 * Per-property Plan session. StrategyWorkbench unmounts when the user leaves
 * the Plan tab; this store outlives that remount so Apply / Tune survive
 * Math and Work. Keyed like `dgiq_verdict_viewed_v1:<propertyId>`.
 */

import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'

export const PLAN_SESSION_KEY_PREFIX = 'dgiq_plan_session_v1:'

export type PlanSessionState = {
  appliedPathId: string | null
  appliedStructure: DealStructure | null
  planCustomized: boolean
  worksheetPatch: Record<string, unknown> | null
  monthlyRentOverride: number | null
}

export function planSessionKey(propertyId: string): string {
  return `${PLAN_SESSION_KEY_PREFIX}${propertyId}`
}

function emptySession(): PlanSessionState {
  return {
    appliedPathId: null,
    appliedStructure: null,
    planCustomized: false,
    worksheetPatch: null,
    monthlyRentOverride: null,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseSession(raw: string): PlanSessionState | null {
  try {
    const parsed = asRecord(JSON.parse(raw))
    if (!parsed) return null
    const worksheetPatch = asRecord(parsed.worksheetPatch)
    const monthlyRentOverride =
      typeof parsed.monthlyRentOverride === 'number' && Number.isFinite(parsed.monthlyRentOverride)
        ? parsed.monthlyRentOverride
        : null
    return {
      appliedPathId: typeof parsed.appliedPathId === 'string' ? parsed.appliedPathId : null,
      appliedStructure: (parsed.appliedStructure as DealStructure | null) ?? null,
      planCustomized: parsed.planCustomized === true,
      worksheetPatch,
      monthlyRentOverride:
        monthlyRentOverride ??
        (typeof worksheetPatch?.monthlyRent === 'number' && Number.isFinite(worksheetPatch.monthlyRent)
          ? worksheetPatch.monthlyRent
          : null),
    }
  } catch {
    return null
  }
}

export function readPlanSession(propertyId: string): PlanSessionState | null {
  if (!propertyId || typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(planSessionKey(propertyId))
    if (!raw) return null
    return parseSession(raw)
  } catch {
    return null
  }
}

export function writePlanSession(propertyId: string, state: PlanSessionState): void {
  if (!propertyId || typeof window === 'undefined') return
  try {
    sessionStorage.setItem(planSessionKey(propertyId), JSON.stringify(state))
  } catch {
    /* ignore quota / private-mode */
  }
}

export function clearPlanSession(propertyId: string): void {
  if (!propertyId || typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(planSessionKey(propertyId))
  } catch {
    /* ignore */
  }
}

export function sessionHasAppliedPlan(session: PlanSessionState | null): boolean {
  return Boolean(session?.appliedPathId)
}

export function hydratePlanSession(propertyId: string): PlanSessionState {
  return readPlanSession(propertyId) ?? emptySession()
}
