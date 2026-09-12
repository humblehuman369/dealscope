/**
 * Action plan — template plan returned by POST .../action-plan (Phase 0, no AI).
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
  created_at: string
  updated_at: string
}

export interface ActionPlanApplyResult {
  plan_id: string
  tasks_created: PropertyTask[]
  tasks_skipped: number
  contacts_created: PropertyContact[]
  contacts_skipped: number
}
