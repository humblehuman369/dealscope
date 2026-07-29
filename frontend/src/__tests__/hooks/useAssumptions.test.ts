/**
 * The optimistic-update contract in AGENTS.md §2.
 *
 * These assumptions are the inputs every verdict and worksheet number is derived
 * from, so a save that fails silently — or rolls back to the wrong property's
 * values — corrupts the analysis without telling anyone. Driven through the
 * store directly rather than a rendered component: the contract lives in the
 * state machine, not the view.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiRequest = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { useAssumptionsStore } from '@/hooks/useAssumptions'

const store = () => useAssumptionsStore.getState()

/** The toast's Retry action, as the user would click it. */
function retryFromToast() {
  const [, options] = mockToastError.mock.calls.at(-1) as [
    string,
    { action: { label: string; onClick: () => void } },
  ]
  options.action.onClick()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  store().reset()
  mockApiRequest.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('saving assumptions', () => {
  it('PATCHes the pending updates to the deal-maker endpoint', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)

    await store().flushAndSave()

    expect(mockApiRequest).toHaveBeenCalledWith(
      '/api/v1/properties/saved/prop-1/deal-maker',
      { method: 'PATCH', body: { buy_price: 250_000 } },
    )
    expect(store().isDirty).toBe(false)
    expect(store().pendingUpdates).toEqual({})
    expect(store().error).toBeNull()
  })

  it('coalesces a burst of edits into one request', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)
    store().updateField('arv', 400_000)

    await vi.advanceTimersByTimeAsync(300)

    expect(mockApiRequest).toHaveBeenCalledTimes(1)
    expect(mockApiRequest.mock.calls[0][1]).toMatchObject({
      body: { buy_price: 250_000, rehab_budget: 40_000, arv: 400_000 },
    })
  })

  it('sends nothing until the debounce elapses', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)

    await vi.advanceTimersByTimeAsync(299)
    expect(mockApiRequest).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(mockApiRequest).toHaveBeenCalledTimes(1)
  })

  it('does not save without a property id', async () => {
    store().updateField('buy_price', 250_000)

    await store().flushAndSave()

    expect(mockApiRequest).not.toHaveBeenCalled()
  })
})

describe('rollback on a failed save', () => {
  beforeEach(() => {
    mockApiRequest.mockRejectedValue(new Error('Session expired'))
  })

  it('restores the values captured before the failed edit', async () => {
    store().setPropertyId('prop-1')
    mockApiRequest.mockResolvedValueOnce({})
    store().updateField('buy_price', 250_000)
    await store().flushAndSave()

    // Second edit fails. lastGoodState is the pending map as it stood before
    // this edit, which after a successful save is empty.
    store().updateField('rehab_budget', 40_000)
    await store().flushAndSave()

    expect(store().pendingUpdates).toEqual({})
    expect(store().error).toBe('Session expired')
    // Left dirty so the user can retry rather than losing the edit silently.
    expect(store().isDirty).toBe(true)
  })

  it('rolls back only the last edit when several are pending', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)

    await store().flushAndSave()

    // lastGoodState is captured per edit, so the earlier edit survives.
    expect(store().pendingUpdates).toEqual({ buy_price: 250_000 })
  })

  it('reports the failure with a working Retry action', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)
    await store().flushAndSave()

    expect(mockToastError).toHaveBeenCalledTimes(1)
    const [message, options] = mockToastError.mock.calls[0]
    expect(message).toMatch(/could not be saved/i)
    expect(options.action.label).toBe('Retry')

    mockApiRequest.mockResolvedValueOnce({})
    retryFromToast()
    await vi.runAllTimersAsync()

    // Retry resends the payload that failed, so the edit is not lost.
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      '/api/v1/properties/saved/prop-1/deal-maker',
      { method: 'PATCH', body: { buy_price: 250_000, rehab_budget: 40_000 } },
    )
    expect(store().isDirty).toBe(false)
  })

  it('offers a Retry that works on the very first edit to a property', async () => {
    // The first edit is the likeliest save to fail (an expired session shows up
    // on the first write), and it is the case where lastGoodState is empty. If
    // rollback leaves nothing pending, Retry must not be a no-op button.
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    await store().flushAndSave()

    expect(store().isDirty).toBe(true)

    mockApiRequest.mockResolvedValueOnce({})
    retryFromToast()
    await vi.runAllTimersAsync()

    expect(mockApiRequest).toHaveBeenCalledTimes(2)
    expect(mockApiRequest.mock.calls[1][1]).toMatchObject({
      body: { buy_price: 250_000 },
    })
  })

  it('does not fire a second request while one is in flight', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    await store().flushAndSave()

    useAssumptionsStore.setState({ isSaving: true })
    const callsBefore = mockApiRequest.mock.calls.length
    store().retryLastSave()

    expect(mockApiRequest.mock.calls.length).toBe(callsBefore)
  })
})

describe('revertToLastGood', () => {
  it('discards the current edit and clears the error', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)
    mockApiRequest.mockRejectedValueOnce(new Error('nope'))
    await store().flushAndSave()

    store().revertToLastGood()

    expect(store().pendingUpdates).toEqual({ buy_price: 250_000 })
    expect(store().isDirty).toBe(true)
    expect(store().error).toBeNull()
  })

  it('leaves nothing dirty when there was no earlier state', () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)

    store().revertToLastGood()

    expect(store().pendingUpdates).toEqual({})
    expect(store().isDirty).toBe(false)
  })
})

describe('switching between properties', () => {
  it('does not carry one property\u2019s values into another on rollback', async () => {
    // The store is a module-level singleton shared by every property. A rollback
    // that replays a previous property's edits would write someone else's
    // numbers into this deal and look like a legitimate saved value.
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)

    store().setPropertyId('prop-2')
    mockApiRequest.mockRejectedValueOnce(new Error('Session expired'))
    store().updateField('arv', 400_000)
    await store().flushAndSave()

    expect(store().pendingUpdates).not.toHaveProperty('buy_price')
    expect(store().pendingUpdates).not.toHaveProperty('rehab_budget')
  })

  it('does not carry values across a reset', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)

    store().reset()
    store().setPropertyId('prop-2')
    mockApiRequest.mockRejectedValueOnce(new Error('Session expired'))
    store().updateField('arv', 400_000)
    await store().flushAndSave()

    expect(store().pendingUpdates).not.toHaveProperty('buy_price')
    expect(store().pendingUpdates).not.toHaveProperty('rehab_budget')
  })

  it('does not let revertToLastGood replay the previous property', () => {
    // Reachable without an intervening edit: navigate away with unsaved changes,
    // then hit the recovery control on the next deal.
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)
    store().updateField('rehab_budget', 40_000)

    store().setPropertyId('prop-2')
    store().revertToLastGood()

    expect(store().pendingUpdates).toEqual({})
    expect(store().isDirty).toBe(false)
  })

  it('cancels a pending save so it cannot land on the next property', async () => {
    store().setPropertyId('prop-1')
    store().updateField('buy_price', 250_000)

    store().reset()
    await vi.runAllTimersAsync()

    expect(mockApiRequest).not.toHaveBeenCalled()
  })
})
