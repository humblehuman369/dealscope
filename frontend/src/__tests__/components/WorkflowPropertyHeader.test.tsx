import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/photoService', () => ({
  fetchPropertyPhotos: vi.fn(),
}))

vi.mock('@/components/property-details/PhotoLightbox', () => ({
  PhotoLightbox: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Photo gallery">
      <button type="button" onClick={onClose}>
        Close gallery
      </button>
    </div>
  ),
}))

import { fetchPropertyPhotos } from '@/services/photoService'
import {
  formatFactsLine,
  formatStatusPill,
  photoAltText,
  WorkflowPropertyHeader,
} from '@/components/workflow/WorkflowPropertyHeader'

const fetchPhotos = vi.mocked(fetchPropertyPhotos)

describe('header copy helpers', () => {
  it('builds the facts line in the UI font fields with city, zip, and year', () => {
    expect(
      formatFactsLine({
        city: 'Wellington',
        zip: '33414',
        beds: 4,
        baths: 3,
        sqft: 2184,
        yearBuilt: 2006,
      }),
    ).toBe('Wellington 33414 · 4 bd · 3 ba · 2,184 sqft · Built 2006')
    expect(
      formatFactsLine({
        city: 'Greenacres',
        zip: '33413',
        beds: 3,
        baths: 2.7,
        sqft: 1600,
      }),
    ).toBe('Greenacres 33413 · 3 bd · 2.5 ba · 1,600 sqft')
  })

  it('uses listing days or the pipeline stage for the status pill', () => {
    expect(formatStatusPill({ listingStatus: 'FOR_SALE', daysOnMarket: 224 })).toBe(
      'Listed · 224 days',
    )
    expect(formatStatusPill({ listingStatus: 'FOR_SALE', daysOnMarket: 1 })).toBe(
      'Listed · 1 day',
    )
    expect(formatStatusPill({ listingStatus: 'OFF_MARKET' })).toBe('Off-market')
    expect(formatStatusPill({ listingStatus: 'FOR_SALE', pipelineStage: 'Analyzing' })).toBe(
      'Analyzing',
    )
    expect(formatStatusPill({})).toBeNull()
    expect(formatStatusPill({ listingStatus: undefined })).toBeNull()
  })

  it('does not show Off-market while listing status is still unknown', () => {
    render(<WorkflowPropertyHeader address="4944 Mcconnell Street" />)
    expect(screen.queryByText('Off-market')).not.toBeInTheDocument()
  })

  it('puts the address and a one-line description in the alt text', () => {
    expect(
      photoAltText({
        address: '1766 Wandering Willow Way',
        description: 'Open floor plan. Pool in back.',
      }),
    ).toBe('1766 Wandering Willow Way. Open floor plan.')
  })
})

describe('WorkflowPropertyHeader', () => {
  beforeEach(() => {
    fetchPhotos.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders the thumbnail, facts, and opens the gallery from N photos', async () => {
    fetchPhotos.mockResolvedValue({
      status: 'success',
      photos: ['https://img.example/1.jpg', 'https://img.example/2.jpg'],
    })
    render(
      <WorkflowPropertyHeader
        address="1766 Wandering Willow Way"
        city="Wellington"
        zip="33414"
        beds={4}
        baths={3}
        sqft={2184}
        yearBuilt={2006}
        listingStatus="FOR_SALE"
        daysOnMarket={224}
        zpid="123"
        description="Covered lanai and a pool."
      />,
    )
    expect(screen.getByRole('heading', { name: '1766 Wandering Willow Way' })).toBeInTheDocument()
    expect(
      screen.getByText('Wellington 33414 · 4 bd · 3 ba · 2,184 sqft · Built 2006'),
    ).toBeInTheDocument()
    expect(screen.getByText('Listed · 224 days')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: '2 photos' })).toBeInTheDocument())
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      '1766 Wandering Willow Way. Covered lanai and a pool.',
    )
    fireEvent.click(screen.getByRole('button', { name: '2 photos' }))
    expect(screen.getByRole('dialog', { name: 'Photo gallery' })).toBeInTheDocument()
  })

  it('uses a dashed grey outline for a pending listing', () => {
    render(
      <WorkflowPropertyHeader
        address="1766 Wandering Willow Way"
        listingStatus="PENDING"
        daysOnMarket={12}
      />,
    )
    const pill = screen.getByText('Listed · 12 days')
    expect(pill.getAttribute('style')).toContain('1px dashed var(--border-strong)')
  })

  it('uses the same photo array the gallery already fetched', async () => {
    render(
      <WorkflowPropertyHeader
        address="110 Crosswinds Drive"
        zpid="999"
        photos={['https://img.example/listing-1.jpg', 'https://img.example/listing-2.jpg']}
      />,
    )
    expect(fetchPhotos).not.toHaveBeenCalled()
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://img.example/listing-1.jpg')
    expect(screen.getByRole('button', { name: '2 photos' })).toBeInTheDocument()
  })

  it('shows No photos instead of a broken image when the listing has none', async () => {
    fetchPhotos.mockResolvedValue({ status: 'failed', photos: [] })
    render(
      <WorkflowPropertyHeader
        address="110 Crosswinds Drive"
        city="Greenacres"
        zip="33413"
        listingStatus="OFF_MARKET"
      />,
    )
    await waitFor(() => expect(screen.getByText('No photos')).toBeInTheDocument())
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /photos?/ })).not.toBeInTheDocument()
  })

  it('uses a satellite thumbnail when the listing has no photos but has coordinates', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'KEY123')
    render(
      <WorkflowPropertyHeader
        address="4370 Ruth Ln"
        city="Delray Beach"
        zip="33446"
        listingStatus="OFF_MARKET"
        photos={[]}
        latitude={26.45}
        longitude={-80.15}
      />,
    )
    expect(fetchPhotos).not.toHaveBeenCalled()
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('maps.googleapis.com/maps/api/staticmap'))
    expect(img).toHaveAttribute('src', expect.stringContaining('maptype=satellite'))
    expect(img).toHaveAttribute('alt', 'Satellite view of 4370 Ruth Ln')
    expect(screen.queryByRole('button', { name: /photos?/ })).not.toBeInTheDocument()
    expect(screen.queryByText('No photos')).not.toBeInTheDocument()
  })
})
