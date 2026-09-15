import { api } from '@/lib/api-client'
import { PHASE_15_COPY } from '@/lib/phase15Copy'
import type { PropertyTask } from '@/types/task'

export async function seedPlanNextMoveTasks(
  dealId: string,
  titles: readonly string[],
): Promise<void> {
  if (!dealId || titles.length === 0) return
  const existing = await api.get<PropertyTask[]>(`/api/v1/properties/saved/${dealId}/tasks`)
  const have = new Set(existing.map((task) => task.title))
  for (const title of titles) {
    if (!title || have.has(title)) continue
    await api.post<PropertyTask>(`/api/v1/properties/saved/${dealId}/tasks`, {
      title,
      notes: PHASE_15_COPY.fromThePlan,
    })
    have.add(title)
  }
}
