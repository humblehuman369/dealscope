import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let searchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

let workflowV1Enabled = false
vi.mock('@/lib/workflowV1', () => ({
  useWorkflowV1: () => ({ enabled: workflowV1Enabled, ready: true }),
}))

import { DiscoveryExplainerVisibility } from '@/app/discovery/DiscoveryExplainerVisibility'
import { DiscoveryPageExplainer } from '@/app/discovery/DiscoveryPageExplainer'
import { PageExplainer } from '@/components/seo/PageExplainer'

describe('PageExplainer', () => {
  it('renders the title as the page h1 and sections as h2s', () => {
    render(
      <PageExplainer
        title="What is Discovery?"
        intro="Intro copy."
        sections={[{ heading: 'How it works', body: 'Body copy.' }]}
        relatedLinks={[{ href: '/pricing', label: 'Pricing' }]}
      />,
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What is Discovery?')
    expect(screen.getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pricing/ })).toHaveAttribute('href', '/pricing')
  })
})

describe('DiscoveryPageExplainer', () => {
  it('is a server component with no hooks, so the copy prerenders', () => {
    render(<DiscoveryPageExplainer />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What is Discovery?')
    expect(screen.getByText(/instant scoring tool for residential investment properties/)).toBeInTheDocument()
  })
})

describe('DiscoveryExplainerVisibility', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams()
    workflowV1Enabled = false
  })

  function renderWrapped() {
    return render(
      <DiscoveryExplainerVisibility>
        <p>Explainer copy</p>
      </DiscoveryExplainerVisibility>,
    )
  }

  it('shows the explainer on the legacy layout with no workbench open', () => {
    renderWrapped()
    expect(screen.getByText('Explainer copy')).toBeVisible()
  })

  it('keeps the copy in the DOM but hidden while Level 3 (?view=workbench) is open', () => {
    searchParams = new URLSearchParams('view=workbench')
    renderWrapped()
    const copy = screen.getByText('Explainer copy')
    expect(copy).toBeInTheDocument()
    expect(copy).not.toBeVisible()
  })

  it('keeps the copy in the DOM but hidden under workflow v1 (P1-7)', () => {
    workflowV1Enabled = true
    renderWrapped()
    const copy = screen.getByText('Explainer copy')
    expect(copy).toBeInTheDocument()
    expect(copy).not.toBeVisible()
  })
})
