/**
 * Property task — single source of truth for the slide-over UI and kanban
 * card task badges. Mirrors backend ``app.schemas.task.TaskOut``.
 */

export interface PropertyTask {
  id: string
  saved_property_id: string
  title: string
  notes: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PropertyTaskCreate {
  title: string
  notes?: string | null
  due_date?: string | null
}

export interface PropertyTaskUpdate {
  title?: string
  notes?: string | null
  due_date?: string | null
  /** Datetime ISO to mark complete; null to reopen. Omit field to leave unchanged. */
  completed_at?: string | null
}

/** Row in the dashboard "Due this week" widget — task + property context. */
export interface UpcomingTask {
  id: string
  saved_property_id: string
  property_nickname: string | null
  property_address_street: string
  property_address_city: string | null
  property_address_state: string | null
  property_status: string
  title: string
  due_date: string
  is_overdue: boolean
}
