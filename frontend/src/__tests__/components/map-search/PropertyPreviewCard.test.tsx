import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapListing } from '@/lib/api'
import { MAP_CARD_COPY } from '@/lib/mapCardCopy'

const push = vi.fn()
const workflow = vi.hoisted(() => ({ enabled: false }))
const search = vi.hoisted(() => new URLSearchParams())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}))

vi.mock('@/hooks/useAppNavigation', () => ({
  useAppSearchParams: () => search,
}))

vi.mock('@/lib/workflowV1', () => ({
  useWorkflowV1: () => ({ enabled: workflow.enabled, ready: true }),
}))

vi.mock('@/components/map-search/listingPhoto', () => ({
  useListingPhoto: () => ({ src: null, handleError: () => {} }),
}))

import { PropertyPreviewCard } from '@/components/map-search/PropertyPreviewCard'

const listing: MapListing = {
  id: '12345678',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip_code: '78701',
  latitude: 30.27,
  longitude: -97.74,
  price: 400000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1800,
  property_type: 'Single Family',
  listing_status: 'FOR_SALE',
  photo_url: null,
  source: 'zillow',
  days_on_market: 10,
  year_built: 1990,
}

describe('PropertyPreviewCard CTA', () => {
  beforeEach(() => {
    push.mockReset()
    workflow.enabled = false
    search.delete('from')
    sessionStorage.clear()
  })

  it('reads Analyze when the flag is off', () => {
    render(<PropertyPreviewCard listing={listing} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Analyze/ })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: MAP_CARD_COPY.seeTheVerdict }),
    ).not.toBeInTheDocument()
  })

  it('reads See the verdict under the flag and still opens Discovery', () => {
    workflow.enabled = true
    render(<PropertyPreviewCard listing={listing} onClose={() => {}} />)
    const cta = screen.getByRole('button', { name: new RegExp(MAP_CARD_COPY.seeTheVerdict) })
    expect(cta).toBeInTheDocument()
    fireEvent.click(cta)
    expect(push).toHaveBeenCalledOnce()
    const href = push.mock.calls[0][0] as string
    expect(href).toContain('/discovery?')
    expect(href).toContain('address=123+Main+St')
    expect(href).toContain('zpid=12345678')
  })

  it('keeps Build Deal when the map was opened from Deal Maker', () => {
    workflow.enabled = true
    search.set('from', 'deal-maker')
    render(<PropertyPreviewCard listing={listing} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Build Deal/ })).toBeInTheDocument()
  })
})
