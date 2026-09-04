import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackEvent = vi.fn()
vi.mock('@/lib/eventTracking', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }))

import { SavePlanForm } from '@/components/iq-verdict/make-it-work/SavePlanForm'

describe('SavePlanForm', () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  it('anonymous: validates the email before calling the claim endpoint', async () => {
    const onClaim = vi.fn().mockResolvedValue(undefined)
    render(<SavePlanForm isAuthenticated={false} onSaveAuthenticated={vi.fn()} onClaim={onClaim} family="price" />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('anonymous: lower-cases + trims the email, then shows the inbox confirmation', async () => {
    const onClaim = vi.fn().mockResolvedValue(undefined)
    render(<SavePlanForm isAuthenticated={false} onSaveAuthenticated={vi.fn()} onClaim={onClaim} family="blended" />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: '  Investor@Example.com ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my plan' }))

    await waitFor(() => expect(onClaim).toHaveBeenCalledWith('investor@example.com'))
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('plan_save_submitted', { mode: 'email', family: 'blended' })
    expect(trackEvent).toHaveBeenCalledWith('plan_save_email_sent', { family: 'blended' })
  })

  it('anonymous: explains a 429 instead of a generic failure', async () => {
    const onClaim = vi.fn().mockRejectedValue(Object.assign(new Error('rate'), { status: 429 }))
    render(<SavePlanForm isAuthenticated={false} onSaveAuthenticated={vi.fn()} onClaim={onClaim} family={null} />)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i)
  })

  it('signed in: saves directly with no email field, and treats an existing save (409) as success', async () => {
    const onSaveAuthenticated = vi.fn().mockRejectedValue(Object.assign(new Error('dup'), { status: 409 }))
    render(<SavePlanForm isAuthenticated onSaveAuthenticated={onSaveAuthenticated} onClaim={vi.fn()} family="income" />)

    expect(screen.queryByLabelText('Email address')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save my plan' }))

    expect(await screen.findByText('Plan saved to your deals')).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('plan_save_submitted', { mode: 'authenticated', family: 'income' })
  })
})
