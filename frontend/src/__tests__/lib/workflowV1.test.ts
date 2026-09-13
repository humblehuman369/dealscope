import { describe, expect, it } from 'vitest'
import { resolveWorkflowV1 } from '@/lib/workflowV1'

describe('resolveWorkflowV1', () => {
  it('is off when the env flag is off', () => {
    expect(resolveWorkflowV1(false, true)).toBe(false)
    expect(resolveWorkflowV1(false, null)).toBe(false)
  })

  it('treats a missing PostHog flag as on once the env flag is on', () => {
    expect(resolveWorkflowV1(true, null)).toBe(true)
  })

  it('honors an explicit PostHog false', () => {
    expect(resolveWorkflowV1(true, false)).toBe(false)
    expect(resolveWorkflowV1(true, true)).toBe(true)
  })
})
