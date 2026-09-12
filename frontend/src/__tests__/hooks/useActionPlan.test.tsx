import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ACTION_PLAN_POLL_MS, useActionPlanPoll } from '@/hooks/useActionPlan'
import type { ActionPlan } from '@/types/actionPlan'

const mockApiGet = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
  },
}))

const plan = (status: ActionPlan['status']): ActionPlan => ({
  id: 'plan-1',
  saved_property_id: 'prop-1',
  case: 'pre_foreclosure',
  case_label: 'Pre-foreclosure',
  status,
  summary: 'Call the last agent.',
  facts: [],
  tasks: [{ title: 'Call the listing agent', notes: null, due_offset_days: 1 }],
  contacts: [],
  source: 'template',
  research: null,
  created_at: '2026-09-12T12:00:00.000Z',
  updated_at: '2026-09-12T12:00:00.000Z',
})

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  queryClient.clear()
})

describe('useActionPlanPoll', () => {
  it('does not fetch without a plan id', async () => {
    renderHook(() => useActionPlanPoll(null, true), { wrapper })
    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('does not fetch when disabled', async () => {
    renderHook(() => useActionPlanPoll('plan-1', false), { wrapper })
    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('GETs the plan and keeps polling while researching', async () => {
    mockApiGet.mockResolvedValue(plan('researching'))
    const { result } = renderHook(() => useActionPlanPoll('plan-1', true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/action-plan/plan-1')
    expect(result.current.data?.status).toBe('researching')
    expect(ACTION_PLAN_POLL_MS).toBe(5_000)
  })
})
