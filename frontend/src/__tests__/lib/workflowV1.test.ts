import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  layoutFromFlag,
  layoutFromRender,
  resolveWorkflowV1,
  useWorkflowV1,
} from '@/lib/workflowV1'

describe('resolveWorkflowV1', () => {
  it('is off when the env flag is off, regardless of PostHog', () => {
    expect(resolveWorkflowV1(false, true)).toBe(false)
    expect(resolveWorkflowV1(false, false)).toBe(false)
    expect(resolveWorkflowV1(false, null)).toBe(false)
  })

  it('is on when the env flag is on unless PostHog is explicitly false', () => {
    expect(resolveWorkflowV1(true, true)).toBe(true)
    expect(resolveWorkflowV1(true, null)).toBe(true)
    expect(resolveWorkflowV1(true, undefined)).toBe(true)
    expect(resolveWorkflowV1(true, 'control')).toBe(true)
  })

  it('is off when the env flag is on and PostHog is false', () => {
    expect(resolveWorkflowV1(true, false)).toBe(false)
  })
})

describe('layout helpers', () => {
  it('uses the rendered screen, not the flag, for plan and verdict events', () => {
    expect(layoutFromRender(true)).toBe('v1')
    expect(layoutFromRender(false)).toBe('legacy')
  })

  it('sets card_opened layout from the loaded flag only', () => {
    expect(layoutFromFlag(true, true)).toBe('v1')
    expect(layoutFromFlag(true, false)).toBe('legacy')
    expect(layoutFromFlag(false, true)).toBe('legacy')
  })
})

describe('useWorkflowV1', () => {
  it('stays off when the env flag is off', () => {
    const { result } = renderHook(() => useWorkflowV1())
    expect(result.current).toEqual({ enabled: false, ready: true })
  })
})
