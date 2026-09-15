import { seedPlanNextMoveTasks } from '@/lib/seedPlanNextMoveTasks'
import { workflowV1TabHref } from '@/lib/workflowRoutes'

export const START_DEAL_PUSH_RETRY_MS = 1500

export function workHrefAfterStartDeal(
  address: string,
  dealId: string,
  zpid?: string,
): string {
  return workflowV1TabHref('work', address, {
    dealId,
    tab: 'tasks',
    zpid,
  })
}

export function workHrefIsCurrent(href: string, locationHref: string): boolean {
  try {
    const want = new URL(href, 'https://dealgapiq.com')
    const have = new URL(locationHref, 'https://dealgapiq.com')
    if (want.pathname !== have.pathname) return false
    for (const key of ['view', 'dealId', 'tab'] as const) {
      if (want.searchParams.get(key) !== have.searchParams.get(key)) return false
    }
    return true
  } catch {
    return false
  }
}

/**
 * Save the deal, seed Next-move tasks, emit deal_started, then open Work/Tasks.
 * Seed failure is logged and ignored so the deal still opens.
 * If a competing navigation swallows the Work href, push once more after 1500 ms.
 */
export async function startWorkingThisDeal(input: {
  save: () => Promise<string | null>
  existingDealId?: string | null
  titles: readonly string[]
  emitDealStarted: (dealId: string, includePlan: boolean) => void
  push: (href: string) => void
  address: string
  zpid?: string
  seedTasks?: typeof seedPlanNextMoveTasks
  readLocation?: () => string
  wait?: (ms: number) => Promise<void>
}): Promise<'opened' | 'no-deal'> {
  const dealId = (await input.save()) ?? input.existingDealId ?? null
  if (!dealId) return 'no-deal'
  try {
    await (input.seedTasks ?? seedPlanNextMoveTasks)(dealId, input.titles)
  } catch (err) {
    console.error('Start working this deal: task seed failed:', err)
  }
  input.emitDealStarted(dealId, true)
  const href = workHrefAfterStartDeal(input.address, dealId, input.zpid)
  input.push(href)
  const wait = input.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const readLocation = input.readLocation ?? (() => window.location.href)
  await wait(START_DEAL_PUSH_RETRY_MS)
  if (!workHrefIsCurrent(href, readLocation())) {
    console.warn('Start working this deal: Work href missing after push, retrying', href)
    input.push(href)
  }
  return 'opened'
}
