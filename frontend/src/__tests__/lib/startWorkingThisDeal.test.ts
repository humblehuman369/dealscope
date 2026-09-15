import { beforeEach, describe, expect, it, vi } from 'vitest'

import { startWorkingThisDeal, workHrefAfterStartDeal } from '@/lib/startWorkingThisDeal'
import { resolveWorkflowRedirect } from '@/lib/workflowRoutes'

const ADDRESS = '7026 NW 21st Ave, Miami, FL 33147'
const DEAL_ID = 'deal-1'
const WORK_HREF = workHrefAfterStartDeal(ADDRESS, DEAL_ID)

describe('Start working this deal navigation', () => {
  const save = vi.fn()
  const seedTasks = vi.fn()
  const emitDealStarted = vi.fn()
  const push = vi.fn()

  beforeEach(() => {
    save.mockReset()
    seedTasks.mockReset()
    emitDealStarted.mockReset()
    push.mockReset()
    save.mockResolvedValue(DEAL_ID)
    seedTasks.mockResolvedValue(undefined)
  })

  it('pushes the Work href with dealId and tab=tasks, and nothing pushes afterward', async () => {
    const result = await startWorkingThisDeal({
      save,
      titles: ['Call the agent.'],
      emitDealStarted,
      push,
      address: ADDRESS,
      seedTasks,
    })

    expect(result).toBe('opened')
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(WORK_HREF)
    expect(WORK_HREF).toContain('view=work')
    expect(WORK_HREF).toContain('dealId=deal-1')
    expect(WORK_HREF).toContain('tab=tasks')
    expect(emitDealStarted).toHaveBeenCalledWith(DEAL_ID, true)
    expect(push.mock.calls.length).toBe(1)

    const url = new URL(WORK_HREF, 'https://dealgapiq.com')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: true,
        pathname: url.pathname,
        search: url.searchParams,
      }),
    ).toBe(null)
  })

  it('still opens Work when task seeding rejects', async () => {
    seedTasks.mockRejectedValue(new Error('tasks down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await startWorkingThisDeal({
      save,
      titles: ['Call the agent.'],
      emitDealStarted,
      push,
      address: ADDRESS,
      seedTasks,
    })

    expect(result).toBe('opened')
    expect(emitDealStarted).toHaveBeenCalledWith(DEAL_ID, true)
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(WORK_HREF)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('does not navigate when save returns no deal', async () => {
    save.mockResolvedValue(null)

    const result = await startWorkingThisDeal({
      save,
      titles: ['Call the agent.'],
      emitDealStarted,
      push,
      address: ADDRESS,
      seedTasks,
    })

    expect(result).toBe('no-deal')
    expect(seedTasks).not.toHaveBeenCalled()
    expect(emitDealStarted).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
