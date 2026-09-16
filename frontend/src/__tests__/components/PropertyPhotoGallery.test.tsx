import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/services/photoService', () => ({
  fetchPropertyPhotos: vi.fn(),
  zillowListingUrl: (zpid: string) => `https://www.zillow.com/homedetails/${zpid}_zpid/`,
}))

vi.mock('@/lib/eventTracking', () => ({
  trackEvent: vi.fn(),
}))

const resolveBestStreetView = vi.fn()

vi.mock('@/lib/streetView', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/streetView')>()
  return {
    ...actual,
    resolveBestStreetView: (...args: unknown[]) => resolveBestStreetView(...args),
  }
})

import { fetchPropertyPhotos } from '@/services/photoService'
import { PropertyPhotoGallery } from '@/components/property-details/PropertyPhotoGallery'

const fetchPhotos = vi.mocked(fetchPropertyPhotos)

describe('PropertyPhotoGallery off-market fallback', () => {
  beforeEach(() => {
    fetchPhotos.mockReset()
    resolveBestStreetView.mockReset()
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'KEY123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows satellite first instead of an address-facing Street View', async () => {
    fetchPhotos.mockResolvedValue({ status: 'failed', photos: [] })
    resolveBestStreetView.mockReturnValue(new Promise(() => {}))

    render(
      <PropertyPhotoGallery
        zpid="123"
        address="43770 Ruth Lane"
        latitude={26.45}
        longitude={-80.15}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        expect.stringContaining('maps.googleapis.com/maps/api/staticmap'),
      )
    })
    expect(screen.getByText('Satellite view')).toBeInTheDocument()
    expect(screen.queryByText('Street View')).not.toBeInTheDocument()
  })

  it('upgrades to Street View only after the camera faces the parcel', async () => {
    fetchPhotos.mockResolvedValue({ status: 'failed', photos: [] })
    resolveBestStreetView.mockResolvedValue({
      pano: 'pano-1',
      heading: 210,
      fov: 80,
      pitch: 0,
    })

    render(
      <PropertyPhotoGallery
        zpid="123"
        address="43770 Ruth Lane"
        latitude={26.45}
        longitude={-80.15}
      />,
    )

    await waitFor(() => expect(screen.getByText('Street View')).toBeInTheDocument())
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('pano=pano-1'))
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('heading=210'))
  })
})
