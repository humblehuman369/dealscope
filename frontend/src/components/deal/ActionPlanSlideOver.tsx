'use client'

/**
 * Slide-over for the Action Plan.
 *
 * Opens from Discovery and the deal page. Shows the template immediately,
 * polls research in the background, and Apply writes tasks and contacts into
 * the deal. Findings land as-is with VERIFIED / UNVERIFIED badges.
 */

import { useEffect, useRef, useState } from 'react'
import { Route, X } from 'lucide-react'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { useActionPlanPoll, useApplyActionPlan, useCreateActionPlan } from '@/hooks/useActionPlan'
import { ACTION_PLAN_COPY } from '@/lib/actionPlanCopy'
import { isPlanResearching, type ActionPlan, type ResearchFinding } from '@/types/actionPlan'

interface ActionPlanSlideOverProps {
  open: boolean
  onClose: () => void
  propertyId: string | null
}

export function ActionPlanButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--hover-overlay)] hover:border-[var(--border-focus)] disabled:opacity-50 transition-colors"
      aria-label={ACTION_PLAN_COPY.buttonLabel}
    >
      <Route className="w-4 h-4" />
      {ACTION_PLAN_COPY.buttonLabel}
    </button>
  )
}

export function ActionPlanSlideOver({ open, onClose, propertyId }: ActionPlanSlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open)

  const create = useCreateActionPlan(propertyId)
  const apply = useApplyActionPlan(propertyId)
  const [moveToPursuing, setMoveToPursuing] = useState(false)
  const createdPlan = create.data
  const poll = useActionPlanPoll(
    createdPlan?.id ?? null,
    open && isPlanResearching(createdPlan),
  )
  const plan = poll.data ?? createdPlan

  useEffect(() => {
    if (!open || !propertyId) return
    apply.reset()
    create.mutate()
    setMoveToPursuing(false)
    // Create once per open. Reset apply so a previous "Added" doesn't stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const applied = apply.isSuccess

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={ACTION_PLAN_COPY.featureName}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'var(--surface-overlay)' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative h-full w-full sm:max-w-md flex flex-col outline-none"
        style={{
          background: 'var(--surface-card)',
          borderLeft: '1px solid var(--border-default)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-[var(--border-default)] shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)]">
              {ACTION_PLAN_COPY.featureName}
            </p>
            <h2 className="text-lg font-bold text-[var(--text-heading)] m-0">
              {plan?.case_label ?? ACTION_PLAN_COPY.buttonLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--hover-overlay)] flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!propertyId ? (
            <p className="text-sm text-[var(--text-label)]">Save this property to build a plan.</p>
          ) : create.isPending ? (
            <p className="text-sm text-[var(--text-label)] text-center py-8">
              {ACTION_PLAN_COPY.loadingLabel}
            </p>
          ) : create.isError ? (
            <p className="text-sm text-[var(--status-negative)]">
              Couldn&apos;t build a plan.{' '}
              <button type="button" onClick={() => create.mutate()} className="underline">
                Retry
              </button>
            </p>
          ) : plan ? (
            <PlanBody plan={plan} />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border-default)] px-4 py-3 space-y-3">
          {applied ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--status-positive)] text-center py-2">
                {apply.data?.moved_to_pursuing
                  ? ACTION_PLAN_COPY.moveToPursuingDone
                  : 'Added to this deal'}
                {apply.data && apply.data.tasks_skipped > 0
                  ? ` · ${apply.data.tasks_skipped} already on the list`
                  : ''}
              </p>
              {apply.data?.can_move_to_pursuing && plan ? (
                <button
                  type="button"
                  onClick={() => apply.mutate({ planId: plan.id, moveToPursuing: true })}
                  disabled={apply.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border border-[var(--border-default)] text-[var(--text-heading)] hover:bg-[var(--hover-overlay)] disabled:opacity-50"
                >
                  {ACTION_PLAN_COPY.moveToPursuingLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {plan?.property_status === 'prospecting' ? (
                <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={moveToPursuing}
                    onChange={(e) => setMoveToPursuing(e.target.checked)}
                    className="rounded border-[var(--border-default)]"
                  />
                  {ACTION_PLAN_COPY.moveToPursuingLabel}
                </label>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  plan && apply.mutate({ planId: plan.id, moveToPursuing })
                }
                disabled={!plan || apply.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[var(--accent-sky)] text-[var(--text-inverse)] hover:bg-[var(--accent-sky-light)] disabled:opacity-50"
              >
                {apply.isPending ? ACTION_PLAN_COPY.applyingLabel : ACTION_PLAN_COPY.applyLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanBody({ plan }: { plan: ActionPlan }) {
  const researching = isPlanResearching(plan)
  const research = plan.research

  return (
    <>
      {researching ? (
        <p className="text-sm text-[var(--text-label)]" aria-live="polite">
          {ACTION_PLAN_COPY.researchingLabel}
        </p>
      ) : null}

      {plan.status === 'failed' ? (
        <p className="text-sm text-[var(--text-label)]">
          Research didn&apos;t finish. Using the template.
        </p>
      ) : null}

      <p className="text-sm leading-relaxed text-[var(--text-body)]">{plan.summary}</p>

      {plan.facts.length > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            What we have
          </h3>
          <dl className="space-y-1.5">
            {plan.facts.map((fact) => (
              <div key={fact.label} className="flex gap-2 text-sm">
                <dt className="shrink-0 text-[var(--text-label)]">{fact.label}</dt>
                <dd className="m-0 text-[var(--text-heading)]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {research?.best_first_call ? (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            {ACTION_PLAN_COPY.firstCallHeading}
          </h3>
          <p className="text-sm text-[var(--text-heading)]">
            {research.best_first_call.who}
            {research.best_first_call.phone ? (
              <span className="text-[var(--text-label)]"> · {research.best_first_call.phone}</span>
            ) : null}
          </p>
          {research.best_first_call.why ? (
            <p className="text-sm text-[var(--text-label)] mt-1">{research.best_first_call.why}</p>
          ) : null}
        </section>
      ) : null}

      {research && research.findings.length > 0 ? (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            {ACTION_PLAN_COPY.findingsHeading}
          </h3>
          <ul className="space-y-2">
            {research.findings.map((finding) => (
              <li key={`${finding.field}-${finding.value}`}>
                <FindingRow finding={finding} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {research && research.conflicts.length > 0 ? (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            {ACTION_PLAN_COPY.conflictsHeading}
          </h3>
          <ul className="space-y-2">
            {research.conflicts.map((conflict) => (
              <li key={conflict.field} className="text-sm">
                <p className="text-[var(--text-heading)]">{conflict.what_disagrees}</p>
                <p className="text-[var(--text-label)] mt-0.5">
                  Trusting {conflict.which_i_trust}. {conflict.why}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {research && research.not_found.length > 0 ? (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            {ACTION_PLAN_COPY.notFoundHeading}
          </h3>
          <ul className="space-y-1">
            {research.not_found.map((item) => (
              <li key={item} className="text-sm text-[var(--text-label)]">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
          Next steps
        </h3>
        <ol className="space-y-2 list-decimal pl-4">
          {plan.tasks.map((task) => (
            <li key={task.title} className="text-sm text-[var(--text-heading)]">
              {task.title}
            </li>
          ))}
        </ol>
      </section>

      {plan.contacts.length > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-label)] mb-2">
            Contacts
          </h3>
          <ul className="space-y-1.5">
            {plan.contacts.map((contact) => (
              <li key={`${contact.role}-${contact.name}`} className="text-sm">
                <span className="text-[var(--text-heading)]">{contact.name}</span>
                {contact.phone ? (
                  <span className="text-[var(--text-label)]"> · {contact.phone}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function findingBadge(status: ResearchFinding['status']): string {
  switch (status) {
    case 'VERIFIED':
      return ACTION_PLAN_COPY.verifiedBadge
    case 'UNVERIFIED':
      return ACTION_PLAN_COPY.unverifiedBadge
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function FindingRow({ finding }: { finding: ResearchFinding }) {
  const badge = findingBadge(finding.status)
  return (
    <div className="text-sm">
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 mt-0.5 inline-flex text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]"
        >
          {badge}
        </span>
        <div className="min-w-0">
          <p className="text-[var(--text-heading)] m-0">
            {finding.field.replace(/_/g, ' ')}
            {finding.value ? `: ${finding.value}` : ''}
          </p>
          {finding.note ? <p className="text-[var(--text-label)] mt-0.5">{finding.note}</p> : null}
          {finding.source_url ? (
            <a
              href={finding.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--accent-sky)] break-all"
            >
              {finding.source_url}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
