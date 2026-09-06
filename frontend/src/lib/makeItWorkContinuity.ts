/**
 * This-tab continuity after a Make It Work plan save.
 *
 * The claim endpoint signs in new / unverified users. Existing verified
 * accounts cannot be signed in from a typed email (that would be takeover),
 * so this sessionStorage flag is what lets that tab skip the cold Strategy
 * unlock overlay and land on the loaded worksheet.
 *
 * Tab-scoped on purpose: a refresh in this tab keeps the worksheet; a new
 * tab or shared URL still hits the gate unless they are signed in.
 */

import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'

const KEY = 'dgiq_miw_continuity'

export interface PlanContinuity {
  addressKey: string
  planLabel: string
  email: string | null
  at: number
}

export function markPlanContinuity(input: {
  address: string
  planLabel: string
  email?: string | null
}): void {
  if (typeof window === 'undefined') return
  const payload: PlanContinuity = {
    addressKey: canonicalizeAddressForIdentity(input.address),
    planLabel: input.planLabel,
    email: input.email ?? null,
    at: Date.now(),
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // private mode / quota — skip; authenticated users do not need this flag
  }
}

export function peekPlanContinuity(): PlanContinuity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PlanContinuity
    if (!data?.addressKey) return null
    return data
  } catch {
    return null
  }
}

export function readPlanContinuity(address: string): PlanContinuity | null {
  const data = peekPlanContinuity()
  if (!data) return null
  if (data.addressKey !== canonicalizeAddressForIdentity(address)) return null
  return data
}

/** Remap the flag onto the address the workbench actually opened. */
export function retargetPlanContinuity(address: string): PlanContinuity | null {
  const existing = peekPlanContinuity()
  if (!existing) return null
  markPlanContinuity({
    address,
    planLabel: existing.planLabel,
    email: existing.email,
  })
  return readPlanContinuity(address)
}
