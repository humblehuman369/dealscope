import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { HomeHeroStatic } from '@/components/landing/HomeHeroStatic'

describe('HomeHeroStatic', () => {
  beforeEach(() => {
    push.mockClear()
    trackEvent.mockClear()
    detectHeroLocation.mockReset()
    detectHeroLocation.mockResolvedValue(null)
  })

  it('renders the headline, See Now CTA, and city placeholder', () => {
    render(<HomeHeroStatic />)
    expect(screen.getByRole('heading', { name: /Find a Great Deal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'See Now' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('City or ZIP')).toBeInTheDocument()
    expect(screen.getByText('Opens the live map for your area.')).toBeInTheDocument()
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
    expect(screen.getByText('Opens the live map for Boca Raton.')).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    expect(push).toHaveBeenCalledWith(
      '/map-search?q=Boca+Raton%2C+FL&lat=26.3&lng=-80.1&zoom=12',
    )
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
    fireEvent.change(screen.getByPlaceholderText('City or ZIP'), { target: { value: '33433' } })
    fireEvent.submit(screen.getByRole('button', { name: 'See Now' }).closest('form')!)
    expect(push).toHaveBeenCalledWith('/map-search?q=33433')
  })
})
