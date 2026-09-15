import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  startWorkingThisDeal,
  workHrefAfterStartDeal,
  workHrefIsCurrent,
} from '@/lib/startWorkingThisDeal'
import { resolveWorkflowRedirect } from '@/lib/workflowRoutes'

const ADDRESS = '7026 NW 21st Ave, Miami, FL 33147'
const DEAL_ID = 'deal-1'
const WORK_HREF = workHrefAfterStartDeal(ADDRESS, DEAL_ID)
const WORK_LOCATION = `https://dealgapiq.com${WORK_HREF}`

describe('Start working this deal navigation', () => {
  const save = vi.fn()
  const seedTasks = vi.fn()
  const emitDealStarted = vi.fn()
  const push = vi.fn()
  const wait = vi.fn(async () => undefined)

  beforeEach(() => {
    save.mockReset()
    seedTasks.mockReset()
    emitDealStarted.mockReset()
    push.mockReset()
    wait.mockReset()
    wait.mockResolvedValue(undefined)
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
      wait,
      readLocation: () => WORK_LOCATION,
    })

    expect(result).toBe('opened')
    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith(WORK_HREF)
    expect(WORK_HREF).toContain('view=work')
    expect(WORK_HREF).toContain('dealId=deal-1')
    expect(WORK_HREF).toContain('tab=tasks')
    expect(emitDealStarted).toHaveBeenCalledWith(DEAL_ID, true)
    expect(workHrefIsCurrent(WORK_HREF, WORK_LOCATION)).toBe(true)

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

  it('retries the Work href when a competing push landed on bare Discovery', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await startWorkingThisDeal({
      save,
      titles: ['Call the agent.'],
      emitDealStarted,
      push,
      address: ADDRESS,
      seedTasks,
      wait,
      readLocation: () =>
        'https://dealgapiq.com/discovery?address=7026+NW+21st+Ave%2C+Miami%2C+FL+33147',
    })

    expect(result).toBe('opened')
    expect(push).toHaveBeenCalledTimes(2)
    expect(push).toHaveBeenNthCalledWith(1, WORK_HREF)
    expect(push).toHaveBeenNthCalledWith(2, WORK_HREF)
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain('Work href missing after push, retrying')
    warn.mockRestore()
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
      wait,
      readLocation: () => WORK_LOCATION,
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
      wait,
    })

    expect(result).toBe('no-deal')
    expect(seedTasks).not.toHaveBeenCalled()
    expect(emitDealStarted).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(wait).not.toHaveBeenCalled()
  })
})
