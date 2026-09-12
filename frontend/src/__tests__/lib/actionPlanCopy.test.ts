import { describe, expect, it } from 'vitest'
import { ACTION_PLAN_COPY, researchProgressLabel } from '@/lib/actionPlanCopy'
import { isPlanResearching } from '@/types/actionPlan'

describe('researchProgressLabel', () => {
  const created = '2026-09-12T12:00:00.000Z'
  const t0 = Date.parse(created)

  it('starts on listing history', () => {
    expect(researchProgressLabel(created, t0 + 1_000)).toBe(ACTION_PLAN_COPY.researchingSteps[0])
  })

  it('moves to court records after 15s', () => {
    expect(researchProgressLabel(created, t0 + 16_000)).toBe(ACTION_PLAN_COPY.researchingSteps[1])
  })

  it('moves to who to call after 45s', () => {
    expect(researchProgressLabel(created, t0 + 60_000)).toBe(ACTION_PLAN_COPY.researchingSteps[2])
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
