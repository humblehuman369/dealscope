import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SaveCtaSection } from '@/features/strategy-workbench/components/SaveCtaSection'

const noop = vi.fn()

describe('SaveCtaSection', () => {
  it('keeps the from-plan email note as an aside, not a hero', () => {
    render(
      <SaveCtaSection
        isAuthenticated={false}
        isSaved={false}
        isSaving={false}
        worksheetDirty={false}
        isSavingWorksheet={false}
        savedPropertyId={null}
        fromPlan
        planEmail="pat@example.com"
        onSave={noop}
        onSaveWorksheet={noop}
        onToggleSaved={noop}
        onRegister={noop}
      />,
    )
    expect(screen.getByText(/we emailed a link to pat@example.com/i)).toBeInTheDocument()
    expect(screen.queryByText(/check email to reopen/i)).toBeNull()
    expect(screen.queryByText(/your plan is in this tab/i)).toBeNull()
  })

  it('does not render the legacy save block in the V1 layout', () => {
    render(
      <SaveCtaSection
        hidden
        isAuthenticated
        isSaved
        isSaving={false}
        worksheetDirty
        isSavingWorksheet={false}
        savedPropertyId="prop-1"
        onSave={noop}
        onSaveWorksheet={noop}
        onToggleSaved={noop}
        onRegister={noop}
      />,
    )
    expect(screen.queryByText('Almost there')).not.toBeInTheDocument()
    expect(screen.queryByText('Save Your Worksheet')).not.toBeInTheDocument()
    expect(screen.queryByText('Save worksheet to DealVault')).not.toBeInTheDocument()
    expect(screen.queryByText('View in dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('remove from DealVault')).not.toBeInTheDocument()
  })
})
