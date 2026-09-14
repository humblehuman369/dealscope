import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowV1, WORKFLOW_V1_FLAG } from '@/lib/workflowV1'

const isPostHogFeatureEnabled = vi.hoisted(() => vi.fn())

vi.mock('@/lib/env', () => ({
  WORKFLOW_V1_ENV_ENABLED: true,
}))

vi.mock('@/lib/posthog', () => ({
  isPostHogFeatureEnabled,
}))

describe('useWorkflowV1 with env on', () => {
  beforeEach(() => {
    isPostHogFeatureEnabled.mockReset()
  })

  it('enables when PostHog workflow-v1 is true', async () => {
    isPostHogFeatureEnabled.mockResolvedValue(true)
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(true)
    expect(isPostHogFeatureEnabled).toHaveBeenCalledWith(WORKFLOW_V1_FLAG)
  })

  it('stays off when PostHog is missing', async () => {
    isPostHogFeatureEnabled.mockResolvedValue(null)
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(false)
  })

  it('stays off when PostHog is false', async () => {
    isPostHogFeatureEnabled.mockResolvedValue(false)
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(false)
  })
})
