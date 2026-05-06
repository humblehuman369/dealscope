/**
 * Per-property timeline events. Mirrors backend ``app.schemas.timeline``.
 */

export type TimelineEventKind =
  | 'status_change'
  | 'flip_stage_change'
  | 'task_added'
  | 'task_completed'
  | 'task_reopened'
  | 'expense_added'
  | 'budget_locked'
  | 'contact_added'
  | 'note'

export interface TimelineEvent {
  id: string
  kind: TimelineEventKind
  occurred_at: string
  title: string
  body: string | null
  meta: Record<string, unknown>
}
