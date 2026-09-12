/**
 * Action plan returned by POST .../action-plan and GET /action-plans/:id.
 */

import type { ContactRole, PropertyContact } from '@/types/contact'
import type { ActionPlanSource } from '@/lib/actionPlanCopy'
import type { PropertyTask } from '@/types/task'

export type ActionPlanCase =
  | 'on_market'
  | 'on_market_stale'
  | 'expired_or_on_hold'
  | 'off_market_absentee'
  | 'off_market_owner_occupied'
  | 'pre_foreclosure'
  | 'foreclosure_or_auction'
  | 'bank_owned'
  | 'fsbo'

export interface ActionPlanFact {
  label: string
  value: string
}

export interface ActionPlanTaskItem {
  title: string
  notes: string | null
  due_offset_days: number | null
}

export interface ActionPlanContactItem {
  name: string
  role: ContactRole
  company: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export type ResearchFindingStatus = 'VERIFIED' | 'UNVERIFIED'

export interface ResearchFinding {
  field: string
  value: string
  status: ResearchFindingStatus
  source_url: string | null
  note: string
}

export interface ResearchConflict {
  field: string
  what_disagrees: string
  which_i_trust: string
  why: string
}

export interface ResearchBestFirstCall {
  who: string
  role: string
  phone: string | null
  why: string
}

export interface ActionPlanResearch {
  findings: ResearchFinding[]
  not_found: string[]
  conflicts: ResearchConflict[]
  best_first_call: ResearchBestFirstCall | null
}

export interface ActionPlan {
  id: string
  saved_property_id: string
  case: ActionPlanCase
  case_label: string
  status: 'queued' | 'researching' | 'ready' | 'failed'
  summary: string
  facts: ActionPlanFact[]
  tasks: ActionPlanTaskItem[]
  contacts: ActionPlanContactItem[]
  source: ActionPlanSource
  research: ActionPlanResearch | null
  property_status?: string | null
  created_at: string
  updated_at: string
}

export interface ActionPlanApplyResult {
  plan_id: string
  tasks_created: PropertyTask[]
  tasks_skipped: number
  contacts_created: PropertyContact[]
  contacts_skipped: number
  property_status?: string | null
  can_move_to_pursuing?: boolean
  moved_to_pursuing?: boolean
}

export function isPlanResearching(plan: Pick<ActionPlan, 'status'> | null | undefined): boolean {
  return plan?.status === 'queued' || plan?.status === 'researching'
}
