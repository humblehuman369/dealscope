import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackEvent = vi.fn()
const post = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))
vi.mock('@/lib/api-client', () => ({ api: { post: (...args: unknown[]) => post(...args) } }))
vi.mock('@/lib/cookieConsent', () => ({ hasAnalyticsConsent: () => true }))
vi.mock('@/lib/attribution', () => ({
  getFirstTouch: () => ({ landing_path: '/for/wholesalers', utm_campaign: 'wholesalers', ts: 1 }),
  firstTouchEventProps: () => ({ ft_utm_campaign: 'wholesalers' }),
  getMetaClickIds: () => ({ fbp: 'fb.1.1', fbc: 'fb.1.2.x' }),
}))
vi.mock('@/lib/metaPixel', () => ({ newMetaEventId: () => 'evt-test' }))

import { VerdictEmailCapture } from '@/components/verdict/VerdictEmailCapture'

describe('VerdictEmailCapture', () => {
  beforeEach(() => {
    trackEvent.mockClear()
    post.mockClear()
  })

  it('renders after the verdict and works logged out', () => {
    render(
      <VerdictEmailCapture
        address="123 Main St, Austin, TX"
        incomeValue={268400}
        targetBuy={241700}
        dealGap={43200}
      />,
    )
    expect(screen.getByLabelText('Email me this verdict')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Email me this verdict' })).toBeInTheDocument()
  })

  it('rejects a bad email', async () => {
    render(
      <VerdictEmailCapture address="123 Main St" incomeValue={1} targetBuy={1} dealGap={1} />,
    )
    fireEvent.change(screen.getByLabelText('Email me this verdict'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me this verdict' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
    expect(post).not.toHaveBeenCalled()
  })

  it('posts the capture and fires verdict_email_captured', async () => {
    render(
      <VerdictEmailCapture
        address="123 Main St, Austin, TX"
        propertyId="abc"
        incomeValue={268400}
        targetBuy={241700}
        dealGap={43200}
      />,
    )
    fireEvent.change(screen.getByLabelText('Email me this verdict'), { target: { value: '  Investor@Example.com ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me this verdict' }))

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toBe('/api/v1/leads/verdict-email')
    expect(post.mock.calls[0][1]).toMatchObject({
      email: 'investor@example.com',
      address: '123 Main St, Austin, TX',
      event_id: 'evt-test',
    })
    expect(trackEvent).toHaveBeenCalledWith('verdict_email_captured', undefined, 'evt-test')
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
  })
})
