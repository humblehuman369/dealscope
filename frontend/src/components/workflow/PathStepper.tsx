'use client'

import Link from 'next/link'

import type { WorkflowV1Tab } from '@/lib/workflowRoutes'
import { V1_UI_FONT } from '@/components/workflow/v1-style'

export type PathStepId = 'find' | 'discovery' | 'plan' | 'work' | 'track'

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
  const encoded = encodeURIComponent(address)
  switch (id) {
    case 'find':
      return '/map-search'
    case 'discovery':
      return address ? `/discovery?address=${encoded}` : '/discovery'
    case 'plan':
      return address ? `/discovery?address=${encoded}&view=workbench` : '/search'
    case 'work':
      return address ? `/discovery?address=${encoded}&view=work` : '/search'
    case 'track':
      return '/dashboard'
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}

export function PathStepper({
  tab,
  address,
}: {
  tab: WorkflowV1Tab
  address: string
}) {
  const current = currentPathStep(tab)

  return (
    <nav aria-label="Deal path" className="px-2 sm:px-4 py-2" style={{ fontFamily: V1_UI_FONT }}>
      <ol className="flex flex-wrap items-center gap-1">
        {STEPS.map((step, index) => {
          const lit = step.id === current
          return (
            <li key={step.id} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  ›
                </span>
              ) : null}
              <Link
                href={stepHref(step.id, address)}
                aria-current={lit ? 'step' : undefined}
                className="inline-flex items-center min-h-11 px-2 text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderRadius: 8,
                  color: lit ? 'var(--text-heading)' : 'var(--text-secondary)',
                  background: lit ? 'var(--surface-elevated)' : 'transparent',
                  outlineColor: 'var(--accent-sky)',
                }}
              >
                {step.label}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
