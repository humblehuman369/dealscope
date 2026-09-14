import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { resolveWorkflowV1, useWorkflowV1 } from '@/lib/workflowV1'

describe('resolveWorkflowV1', () => {
  it('is off when the env flag is off, regardless of PostHog', () => {
    expect(resolveWorkflowV1(false, true)).toBe(false)
    expect(resolveWorkflowV1(false, false)).toBe(false)
    expect(resolveWorkflowV1(false, null)).toBe(false)
  })

  it('is on only when the env flag is on and PostHog is true', () => {
    expect(resolveWorkflowV1(true, true)).toBe(true)
  })

  it('is off when the env flag is on and PostHog is missing or false', () => {
    expect(resolveWorkflowV1(true, null)).toBe(false)
    expect(resolveWorkflowV1(true, false)).toBe(false)
  })
})

describe('useWorkflowV1', () => {
  it('stays off when the env flag is off', () => {
    const { result } = renderHook(() => useWorkflowV1())
    expect(result.current).toEqual({ enabled: false, ready: true })
  })
})
