import { seedPlanNextMoveTasks } from '@/lib/seedPlanNextMoveTasks'
import { workflowV1TabHref } from '@/lib/workflowRoutes'

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

/**
 * Save the deal, seed Next-move tasks, emit deal_started, then open Work/Tasks.
 * Seed failure is logged and ignored so the deal still opens.
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
}): Promise<'opened' | 'no-deal'> {
  const dealId = (await input.save()) ?? input.existingDealId ?? null
  if (!dealId) return 'no-deal'
  try {
    await (input.seedTasks ?? seedPlanNextMoveTasks)(dealId, input.titles)
  } catch (err) {
    console.error('Start working this deal: task seed failed:', err)
  }
  input.emitDealStarted(dealId, true)
  input.push(workHrefAfterStartDeal(input.address, dealId, input.zpid))
  return 'opened'
}
