import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}))

import { PHASE_15_COPY } from '@/lib/phase15Copy'
import { seedPlanNextMoveTasks } from '@/lib/seedPlanNextMoveTasks'

const MOVES = [
  'Call the listing agent. Confirm the seller\'s situation before you write the offer at $349,094.',
  'Verify the rent. The plan needs $3,100 a month. Two local property managers should agree.',
  'Get pre-approval for a $279,275 loan.',
] as const

describe('Next moves become the first tasks', () => {
  beforeEach(() => {
    mockApiGet.mockReset()
    mockApiPost.mockReset()
    mockApiPost.mockResolvedValue({ id: 't1' })
  })

  it('creates the three Plan lines with source From the plan.', async () => {
    mockApiGet.mockResolvedValue([])
    await seedPlanNextMoveTasks('deal-1', MOVES)
    expect(mockApiPost).toHaveBeenCalledTimes(3)
    expect(mockApiPost.mock.calls[0][1]).toEqual({
      title: MOVES[0],
      notes: PHASE_15_COPY.fromThePlan,
    })
  })

  it('does not add duplicates when Start working this deal is pressed twice', async () => {
    mockApiGet.mockResolvedValue([{ title: MOVES[0] }, { title: MOVES[1] }, { title: MOVES[2] }])
    await seedPlanNextMoveTasks('deal-1', MOVES)
    expect(mockApiPost).not.toHaveBeenCalled()
  })
})
