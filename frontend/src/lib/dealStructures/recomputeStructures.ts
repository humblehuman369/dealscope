import { api } from '@/lib/api-client'

export const DEAL_STRUCTURES_PATH = '/api/v1/analysis/deal-structures'

export function createSettledScheduler(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    schedule(fn: () => void) {
      if (timer != null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        fn()
      }, delayMs)
    },
    cancel() {
      if (timer != null) clearTimeout(timer)
      timer = null
    },
  }
}

/** Structures-only re-solve. Reuses the worksheet payload; does not fetch property. */
export function fetchDealStructures(payload: Record<string, unknown>) {
  return api.post<Record<string, unknown>>(DEAL_STRUCTURES_PATH, payload)
}
