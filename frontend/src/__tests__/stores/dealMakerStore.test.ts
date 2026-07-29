/**
 * Save/rollback behaviour for the live Deal Maker store.
 *
 * This is the store the DealMaker, Discovery and AnalysisIQ screens actually
 * use, so the invariant that matters is that a failed save never leaves the
 * screen showing numbers the backend rejected: Verdict and Strategy recalculate
 * from the server's record, and a silent divergence between the two is a wrong
 * answer presented as a confident one.
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

import { useDealMakerStore, type DealMakerRecord } from '@/stores/dealMakerStore'

const store = () => useDealMakerStore.getState()

const record = (overrides: Partial<DealMakerRecord> = {}) =>
  ({ buy_price: 250_000, rehab_budget: 10_000, arv: 400_000, ...overrides }) as DealMakerRecord

/** A PATCH/GET envelope carrying the record the server would return. */
const response = (rec: DealMakerRecord) => ({
  record: rec,
  cash_needed: null,
  deal_gap: null,
  annual_profit: null,
  cap_rate: null,
  coc_return: null,
})

/** The toast's Retry action, as the user would click it. */
function retryFromToast() {
  const [, options] = mockToastError.mock.calls.at(-1) as [
    string,
    { action: { label: string; onClick: () => void } },
  ]
  options.action.onClick()
}

/** Puts the store in the state it reaches after opening a saved property. */
async function loadProperty() {
  mockApiRequest.mockResolvedValueOnce(response(record()))
  await store().loadRecord('prop-1')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  store().reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('saving an edit', () => {
  it('adopts the server record and clears the dirty state', async () => {
    await loadProperty()

    mockApiRequest.mockResolvedValueOnce(response(record({ buy_price: 300_000 })))
    store().updateField('buy_price', 300_000)
    await store().flushAndSave()

    expect(mockApiRequest).toHaveBeenLastCalledWith(
      '/api/v1/properties/saved/prop-1/deal-maker',
      { method: 'PATCH', body: { buy_price: 300_000 } },
    )
    expect(store().record?.buy_price).toBe(300_000)
    expect(store().isDirty).toBe(false)
    expect(store().pendingUpdates).toEqual({})
    expect(store().error).toBeNull()
  })

  it('coalesces a burst of slider moves into one request', async () => {
    await loadProperty()
    mockApiRequest.mockResolvedValueOnce(response(record({ buy_price: 275_000 })))

    store().updateField('buy_price', 260_000)
    store().updateField('buy_price', 270_000)
    store().updateField('buy_price', 275_000)
    await vi.advanceTimersByTimeAsync(300)

    // One PATCH beyond the initial load.
    expect(mockApiRequest).toHaveBeenCalledTimes(2)
    expect(mockApiRequest.mock.calls[1][1]).toMatchObject({ body: { buy_price: 275_000 } })
  })

  it('ignores edits before a record is loaded', () => {
    store().updateField('buy_price', 300_000)

    expect(store().isDirty).toBe(false)
    expect(mockApiRequest).not.toHaveBeenCalled()
  })
})

describe('when the save fails', () => {
  beforeEach(async () => {
    await loadProperty()
    mockApiRequest.mockRejectedValue(new Error('Session expired'))
  })

  it('reverts the record to the last server-confirmed values', async () => {
    store().updateField('buy_price', 300_000)
    expect(store().record?.buy_price).toBe(300_000) // optimistic

    await store().flushAndSave()

    expect(store().record?.buy_price).toBe(250_000)
    expect(store().error).toBe('Session expired')
  })

  it('leaves nothing pending that disagrees with the server', async () => {
    store().updateField('buy_price', 300_000)
    store().updateField('rehab_budget', 50_000)

    await store().flushAndSave()

    // What the screen renders and what Verdict/Strategy would compute from the
    // server record have to be the same thing after a failure.
    expect(store().record).toEqual(store().lastGoodRecord)
    expect(store().pendingUpdates).toEqual({})
    expect(store().isDirty).toBe(false)
  })

  it('tells the user, rather than only the console', async () => {
    store().updateField('buy_price', 300_000)

    await store().flushAndSave()

    expect(mockToastError).toHaveBeenCalledTimes(1)
    const [message, options] = mockToastError.mock.calls[0]
    expect(message).toMatch(/could not be saved/i)
    expect(options.action.label).toBe('Retry')
  })

  it('resends the failed edit when the user retries', async () => {
    store().updateField('buy_price', 300_000)
    store().updateField('rehab_budget', 50_000)
    await store().flushAndSave()

    mockApiRequest.mockResolvedValueOnce(
      response(record({ buy_price: 300_000, rehab_budget: 50_000 })),
    )
    retryFromToast()
    await vi.runAllTimersAsync()

    expect(mockApiRequest).toHaveBeenLastCalledWith(
      '/api/v1/properties/saved/prop-1/deal-maker',
      { method: 'PATCH', body: { buy_price: 300_000, rehab_budget: 50_000 } },
    )
    expect(store().record?.buy_price).toBe(300_000)
    expect(store().isDirty).toBe(false)
    expect(store().error).toBeNull()
  })

  it('retries the first edit to a property, where nothing else is pending', async () => {
    // The first write is the likeliest to fail on an expired session, and it is
    // the case where a rollback leaves no pending updates behind.
    store().updateField('buy_price', 300_000)
    await store().flushAndSave()

    mockApiRequest.mockResolvedValueOnce(response(record({ buy_price: 300_000 })))
    retryFromToast()
    await vi.runAllTimersAsync()

    expect(mockApiRequest.mock.calls.at(-1)?.[1]).toMatchObject({
      body: { buy_price: 300_000 },
    })
    expect(store().record?.buy_price).toBe(300_000)
  })

  it('does not stack a retry on top of an in-flight save', async () => {
    store().updateField('buy_price', 300_000)
    await store().flushAndSave()

    useDealMakerStore.setState({ isSaving: true })
    const callsBefore = mockApiRequest.mock.calls.length
    store().retryLastSave()

    expect(mockApiRequest.mock.calls.length).toBe(callsBefore)
  })
})

describe('reset', () => {
  it('drops the recovery state with the record', async () => {
    await loadProperty()
    mockApiRequest.mockRejectedValueOnce(new Error('Session expired'))
    store().updateField('buy_price', 300_000)
    await store().flushAndSave()

    store().reset()

    expect(store().record).toBeNull()
    expect(store().lastGoodRecord).toBeNull()
    expect(store().failedUpdates).toEqual({})
    expect(store().error).toBeNull()
  })

  it('cancels a pending save so it cannot land on the next property', async () => {
    await loadProperty()
    store().updateField('buy_price', 300_000)

    store().reset()
    await vi.runAllTimersAsync()

    // Only the initial load.
    expect(mockApiRequest).toHaveBeenCalledTimes(1)
  })
})
