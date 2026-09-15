import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkflowV1, WORKFLOW_V1_FLAG } from '@/lib/workflowV1'

const initPostHog = vi.hoisted(() => vi.fn())

vi.mock('@/lib/env', () => ({
  WORKFLOW_V1_ENV_ENABLED: true,
}))

vi.mock('@/lib/posthog', () => ({
  initPostHog,
}))

describe('useWorkflowV1 with env on', () => {
  let flagValue: unknown = false
  let errorsLoading = false
  let listener:
    | ((
        flags: string[],
        variants?: Record<string, string | boolean>,
        extra?: { errorsLoading?: boolean },
      ) => void)
    | undefined

  beforeEach(() => {
    flagValue = false
    errorsLoading = false
    listener = undefined
    initPostHog.mockReset()
    initPostHog.mockResolvedValue({
      getFeatureFlag: (key: string) => (key === WORKFLOW_V1_FLAG ? flagValue : undefined),
      onFeatureFlags: (cb: typeof listener) => {
        listener = cb
        return () => {
          listener = undefined
        }
      },
    })
  })

  it('enables when PostHog workflow-v1 is true and stays subscribed', async () => {
    flagValue = true
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(true)

    flagValue = false
    await act(async () => {
      listener?.([], {}, { errorsLoading: false })
    })
    expect(result.current.enabled).toBe(false)

    flagValue = true
    await act(async () => {
      listener?.([], {}, { errorsLoading: false })
    })
    expect(result.current.enabled).toBe(true)
  })

  it('enables v1 when the flag is true even if analytics consent is essential', async () => {
    flagValue = true
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(true)
    expect(initPostHog).toHaveBeenCalled()
  })

  it('stays off when PostHog is missing', async () => {
    initPostHog.mockResolvedValue(null)
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(false)
  })

  it('stays off when PostHog is false, a string, or flags fail to load', async () => {
    flagValue = false
    const { result } = renderHook(() => useWorkflowV1())
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.enabled).toBe(false)

    flagValue = 'control'
    await act(async () => {
      listener?.([], {}, { errorsLoading: false })
    })
    expect(result.current.enabled).toBe(false)

    errorsLoading = true
    await act(async () => {
      listener?.([], {}, { errorsLoading })
    })
    expect(result.current.enabled).toBe(false)
  })
})
