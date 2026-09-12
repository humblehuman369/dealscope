import { describe, expect, it } from 'vitest'
import { ACTION_PLAN_COPY } from '@/lib/actionPlanCopy'
import { isPlanResearching } from '@/types/actionPlan'

describe('ACTION_PLAN_COPY', () => {
  it('uses VERIFIED and UNVERIFIED badges', () => {
    expect(ACTION_PLAN_COPY.verifiedBadge).toBe('VERIFIED')
    expect(ACTION_PLAN_COPY.unverifiedBadge).toBe('UNVERIFIED')
  })
})

describe('isPlanResearching', () => {
  it('is true for queued and researching', () => {
    expect(isPlanResearching({ status: 'queued' })).toBe(true)
    expect(isPlanResearching({ status: 'researching' })).toBe(true)
  })

  it('is false once ready or failed', () => {
    expect(isPlanResearching({ status: 'ready' })).toBe(false)
    expect(isPlanResearching({ status: 'failed' })).toBe(false)
  })
})
