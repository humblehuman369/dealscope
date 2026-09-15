'use client'

import Link from 'next/link'

import { workflowV1TabHref, type WorkflowV1Tab } from '@/lib/workflowRoutes'

export type PathStepId = 'find' | 'discovery' | 'plan' | 'work' | 'track'

/** Marks map-search as opened from the path stepper's Find link. */
export const MAP_FIND_FROM = 'path'
export const MAP_FIND_HREF = `/map-search?from=${MAP_FIND_FROM}`

export function isMapPathStripArrival(search: { get: (name: string) => string | null }): boolean {
  return search.get('source') === 'home_hero' || search.get('from') === MAP_FIND_FROM
}

const STEPS: { id: PathStepId; label: string }[] = [
  { id: 'find', label: 'Find' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'plan', label: 'Plan' },
  { id: 'work', label: 'Work' },
  { id: 'track', label: 'Track' },
]

export function currentPathStep(tab: WorkflowV1Tab): PathStepId {
  if (tab === 'math' || tab === 'discovery') return 'discovery'
  if (tab === 'plan') return 'plan'
  return 'work'
}

function stepHref(id: PathStepId, address: string): string {
  switch (id) {
    case 'find':
      return MAP_FIND_HREF
    case 'discovery':
      return workflowV1TabHref('discovery', address)
    case 'plan':
      return workflowV1TabHref('plan', address)
    case 'work':
      return workflowV1TabHref('work', address)
    case 'track':
      return '/dashboard'
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

const STEP_CLASS =
  'inline-flex items-center min-h-11 px-2 text-[13px] font-medium whitespace-nowrap'

export function PathStepper({ tab, address }: { tab?: WorkflowV1Tab; address?: string | null }) {
  const trimmedAddress = address?.trim() ?? ''
  const noProperty = !trimmedAddress
  const current: PathStepId = noProperty ? 'find' : currentPathStep(tab ?? 'discovery')

  return (
    <nav aria-label="Deal path" className={noProperty ? 'px-1 py-0' : 'px-2 sm:px-4 py-2'}>
      <ol className={`flex items-center gap-1 ${noProperty ? 'flex-nowrap' : 'flex-wrap'}`}>
        {STEPS.map((step, index) => {
          const lit = step.id === current
          const stepStyle = {
            borderRadius: 8,
            color: lit ? 'var(--text-heading)' : 'var(--text-secondary)',
            background: lit ? 'var(--surface-elevated)' : 'transparent',
            outlineColor: 'var(--accent-sky)',
          } as const
          return (
            <li key={step.id} className="flex items-center gap-1">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ›
                </span>
              ) : null}
              {noProperty ? (
                <span
                  aria-current={lit ? 'step' : undefined}
                  className={STEP_CLASS}
                  style={stepStyle}
                >
                  {step.label}
                </span>
              ) : (
                <Link
                  href={stepHref(step.id, trimmedAddress)}
                  prefetch={false}
                  aria-current={lit ? 'step' : undefined}
                  className={`${STEP_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                  style={stepStyle}
                >
                  {step.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
