import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressComponents, PlaceMetadata } from '@/components/AddressAutocomplete'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}))

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))

const detectHeroLocation = vi.fn()
vi.mock('@/components/map-search/mapUserLocation', () => ({
  detectHeroLocation: (...args: unknown[]) => detectHeroLocation(...args),
}))

type PlaceSelect = (address: string, c?: AddressComponents, meta?: PlaceMetadata) => void
let lastPlaceSelect: PlaceSelect | undefined
vi.mock('@/components/AddressAutocomplete', () => ({
  AddressAutocomplete: (props: {
    value: string
    onChange: (v: string) => void
    onPlaceSelect?: PlaceSelect
    placeholder?: string
    'aria-label'?: string
  }) => {
    lastPlaceSelect = props.onPlaceSelect
    return (
      <input
        aria-label={props['aria-label']}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )
  },
}))

import { HomeHeroStatic } from '@/components/landing/HomeHeroStatic'

function pushedUrl(): URL {
  expect(push).toHaveBeenCalledTimes(1)
  return new URL(push.mock.calls[0][0] as string, 'https://dealgapiq.com')
}

describe('HomeHeroStatic', () => {
  beforeEach(() => {
    push.mockClear()
    trackEvent.mockClear()
    detectHeroLocation.mockReset()
    detectHeroLocation.mockResolvedValue(null)
    lastPlaceSelect = undefined
    window.location.search = ''
  })

  it('renders the headline, See Now CTA, and address placeholder', () => {
    render(<HomeHeroStatic />)
    expect(screen.getByRole('heading', { name: /Find a Great Deal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'See Now' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Address, city, or ZIP')).toBeInTheDocument()
    expect(screen.queryByText(/Opens the live map/)).not.toBeInTheDocument()
  })

  it('submits an empty field to /map-search with no query', () => {
    render(<HomeHeroStatic />)
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    expect(trackEvent).toHaveBeenCalledWith('search_started', {
      search_type: 'city',
      source: 'home_hero',
    })
    expect(push).toHaveBeenCalledWith('/map-search')
  })

  it('prefills GPS/IP location and submits q= with lat/lng', async () => {
    detectHeroLocation.mockResolvedValue({
      label: 'Boca Raton, FL',
      lat: 26.3,
      lng: -80.1,
    })
    render(<HomeHeroStatic />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Boca Raton, FL')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Opens the live map/)).not.toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    const url = pushedUrl()
    expect(url.pathname).toBe('/map-search')
    expect(url.searchParams.get('q')).toBe('Boca Raton, FL')
    expect(url.searchParams.get('lat')).toBe('26.3')
    expect(url.searchParams.get('lng')).toBe('-80.1')
    expect(url.searchParams.get('zoom')).toBe('12')
    expect(url.searchParams.get('source')).toBe('home_hero')
  })

  it('does not attach stale coords when the user edits the autofill', async () => {
    detectHeroLocation.mockResolvedValue({
      label: 'Hialeah, FL',
      lat: 25.86,
      lng: -80.28,
    })
    render(<HomeHeroStatic />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hialeah, FL')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByPlaceholderText('Address, city, or ZIP'), {
      target: { value: '33433' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    const url = pushedUrl()
    expect(url.pathname).toBe('/map-search')
    expect(url.searchParams.get('q')).toBe('33433')
    expect(url.searchParams.has('lat')).toBe(false)
  })

  it('routes a typed street address to /discovery', () => {
    render(<HomeHeroStatic />)
    fireEvent.change(screen.getByPlaceholderText('Address, city, or ZIP'), {
      target: { value: '123 Main St, Austin, TX 78701' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    const url = pushedUrl()
    expect(url.pathname).toBe('/discovery')
    expect(url.searchParams.get('address')).toBe('123 Main St, Austin, TX 78701')
    expect(url.searchParams.get('source')).toBe('home_hero')
    expect(trackEvent).toHaveBeenCalledWith('property_searched', {
      source: 'home_hero',
      type: 'address',
    })
  })

  it('routes a selected city place to /map-search with coordinates', () => {
    render(<HomeHeroStatic />)
    lastPlaceSelect!('Austin, TX, USA', undefined, {
      placeTypes: ['locality', 'political'],
      location: { lat: 30.27, lng: -97.74 },
    })
    const url = pushedUrl()
    expect(url.pathname).toBe('/map-search')
    expect(url.searchParams.get('q')).toBe('Austin, TX, USA')
    expect(url.searchParams.get('lat')).toBe('30.27')
    expect(url.searchParams.get('lng')).toBe('-97.74')
    expect(url.searchParams.get('zoom')).toBeTruthy()
  })

  it('routes a selected street place to /discovery with components', () => {
    render(<HomeHeroStatic />)
    lastPlaceSelect!(
      '123 Main St, Austin, TX 78701, USA',
      { streetNumber: '123', street: 'Main St', city: 'Austin', state: 'TX', zipCode: '78701' },
      { placeTypes: ['street_address'] },
    )
    const url = pushedUrl()
    expect(url.pathname).toBe('/discovery')
    expect(url.searchParams.get('city')).toBe('Austin')
    expect(url.searchParams.get('state')).toBe('TX')
    expect(url.searchParams.get('zip_code')).toBe('78701')
  })
})
