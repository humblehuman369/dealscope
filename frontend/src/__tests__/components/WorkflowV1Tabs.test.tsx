import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'

import { parseWorkflowV1View, workflowV1TabHref, type WorkflowV1Tab } from '@/lib/workflowRoutes'

const TABS: { id: WorkflowV1Tab; label: string }[] = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'plan', label: 'Plan' },
  { id: 'math', label: 'Math' },
  { id: 'work', label: 'Work' },
]

const ADDRESS = '1 Main St'

function WorkflowV1TabBar() {
  const [href, setHref] = useState(workflowV1TabHref('discovery', ADDRESS))
  const view = parseWorkflowV1View(new URL(href, 'https://dealgapiq.com').searchParams.get('view'))

  return (
    <div>
      <p>view:{view}</p>
      <div role="tablist" aria-label="Property analysis">
        {TABS.map((tab) => (
          <a
            key={tab.id}
            role="tab"
            href={workflowV1TabHref(tab.id, ADDRESS)}
            onClick={(event) => {
              event.preventDefault()
              setHref(workflowV1TabHref(tab.id, ADDRESS))
            }}
          >
            {tab.label}
          </a>
        ))}
      </div>
    </div>
  )
}

describe('workflow V1 tabs', () => {
  it('sends each tab to its own view', () => {
    render(<WorkflowV1TabBar />)
    expect(screen.getByRole('tab', { name: 'Discovery' })).toHaveAttribute(
      'href',
      '/discovery?address=1+Main+St',
    )
    expect(screen.getByRole('tab', { name: 'Plan' })).toHaveAttribute(
      'href',
      '/discovery?address=1+Main+St&view=workbench',
    )
    expect(screen.getByRole('tab', { name: 'Math' })).toHaveAttribute(
      'href',
      '/discovery?address=1+Main+St&view=math',
    )
    expect(screen.getByRole('tab', { name: 'Work' })).toHaveAttribute(
      'href',
      '/discovery?address=1+Main+St&view=work',
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Discovery' }))
    expect(screen.getByText('view:discovery')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Plan' }))
    expect(screen.getByText('view:plan')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Math' }))
    expect(screen.getByText('view:math')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Work' }))
    expect(screen.getByText('view:work')).toBeInTheDocument()
  })
})
