import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressComponents, PlaceMetadata } from '@/components/AddressAutocomplete'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))

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

import { AddressCtaForm } from '@/components/landing/AddressCtaForm'

function submitText(text: string) {
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.submit(input.closest('form')!)
}

function pushedUrl(): URL {
  expect(push).toHaveBeenCalledTimes(1)
  return new URL(push.mock.calls[0][0] as string, 'https://dealgapiq.com')
}

describe('AddressCtaForm', () => {
  beforeEach(() => {
    push.mockClear()
    trackEvent.mockClear()
    // setup.ts replaces window.location with a plain object; assign the search directly.
    window.location.search = '?utm_source=test&utm_campaign=x&gclid=g1&other=drop'
  })

  it('routes a street address to /discovery with utm and source preserved', () => {
    render(<AddressCtaForm source="answers:x" />)
    submitText('123 Main St, Austin, TX 78701')

    const url = pushedUrl()
    expect(url.pathname).toBe('/discovery')
    expect(url.searchParams.get('address')).toBe('123 Main St, Austin, TX 78701')
    expect(url.searchParams.get('utm_source')).toBe('test')
    expect(url.searchParams.get('utm_campaign')).toBe('x')
    expect(url.searchParams.get('gclid')).toBe('g1')
    expect(url.searchParams.get('source')).toBe('answers:x')
    expect(url.searchParams.has('other')).toBe(false)
    expect(trackEvent).toHaveBeenCalledWith('property_searched', { source: 'answers:x', type: 'address' })
  })

  it('routes a ZIP to /map-search', () => {
    render(<AddressCtaForm source="home_hero" />)
    submitText('78701')

    const url = pushedUrl()
    expect(url.pathname).toBe('/map-search')
    expect(url.searchParams.get('label')).toBe('78701')
    expect(url.searchParams.get('utm_campaign')).toBe('x')
    expect(trackEvent).toHaveBeenCalledWith('property_searched', { source: 'home_hero', type: 'zip' })
  })

  it('routes a selected city place to /map-search with coordinates', () => {
    render(<AddressCtaForm source="home_hero" />)
    lastPlaceSelect!('Austin, TX, USA', undefined, {
      placeTypes: ['locality', 'political'],
      location: { lat: 30.27, lng: -97.74 },
    })

    const url = pushedUrl()
    expect(url.pathname).toBe('/map-search')
    expect(url.searchParams.get('lat')).toBe('30.27')
    expect(url.searchParams.get('lng')).toBe('-97.74')
    expect(url.searchParams.get('zoom')).toBeTruthy()
  })

  it('routes a selected street place to /discovery with components', () => {
    render(<AddressCtaForm source="home_hero" />)
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

  it('shows an error and does not navigate on empty submit', () => {
    render(<AddressCtaForm source="home_hero" />)
    submitText('   ')
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
