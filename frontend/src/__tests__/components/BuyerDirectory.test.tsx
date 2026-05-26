import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseSubscription = vi.fn()
const mockApiGet = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}))

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}))

vi.mock('@/components/billing/UpgradeModal', () => ({
  UpgradeModal: ({ isOpen, paidOnlyFeature }: { isOpen: boolean; paidOnlyFeature?: string }) =>
    isOpen ? <div>{paidOnlyFeature} paid checkout</div> : null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

import BuyerDirectory from '@/components/buyer-directory/BuyerDirectory'

function renderDirectory() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BuyerDirectory />
    </QueryClientProvider>,
  )
}

describe('BuyerDirectory paid access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSubscription.mockReturnValue({
      isPaidPro: false,
      isTrialing: false,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('does not fetch buyer contacts for anonymous users', () => {
    renderDirectory()

    expect(screen.getByText('Sign in to unlock paid buyer access')).toBeTruthy()
    expect(screen.getByText('Verified Palm Beach Buyer')).toBeTruthy()
    expect(screen.queryByText('Hello Reeve')).toBeNull()
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('blocks trialing users with paid-only copy', () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: false,
      isTrialing: true,
      isAuthenticated: true,
      isLoading: false,
    })

    renderDirectory()

    expect(screen.getByText('Cash Buyer Directory requires paid Pro')).toBeTruthy()
    expect(screen.getByText(/Your 7-day trial does not include buyer contacts/)).toBeTruthy()
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('fetches and renders buyer contacts for paid active users', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    mockApiGet.mockResolvedValue({
      buyers: [
        {
          id: 1,
          initials: 'DD',
          accent: '#0EA5E9',
          company: 'Revival Home Buyer',
          owner: 'Daniel Di Bartolomeo',
          street: '4830 W Kennedy Blvd, Suite 600',
          city: 'Tampa',
          state: 'FL',
          zip: '33609',
          phone: '(813) 548-3674',
          email: 'info@revivalhomebuyer.com',
          website: 'revivalhomebuyer.com',
          coverage: ['Hillsborough', 'Pinellas'],
          description: 'Family-run fix-and-flip operator serving Tampa Bay.',
          deals: 184,
          years: 8,
          response: '< 24h',
          strategies: ['Fix & Flip', 'BRRRR'],
        },
        {
          id: 2,
          initials: 'CB',
          accent: '#A78BFA',
          company: 'Countywide Buyer',
          owner: 'Casey Buyer',
          street: '1 Main St',
          city: 'Brandon',
          state: 'FL',
          zip: '33511',
          phone: '(813) 555-0100',
          email: 'casey@example.com',
          website: 'countywide.example',
          coverage: ['Hillsborough'],
          description: 'Buys throughout Hillsborough County.',
          deals: 20,
          years: 4,
          response: '< 24h',
          strategies: ['Buy & Hold'],
        },
      ],
    })

    renderDirectory()

    await waitFor(() => expect(screen.getByText('Revival Home Buyer')).toBeTruthy())
    expect(screen.getByText('Countywide Buyer')).toBeTruthy()
    expect(screen.getByText('(813) 548-3674')).toBeTruthy()
    expect(screen.queryByText('Cash Buyer Directory requires paid Pro')).toBeNull()
    expect(mockApiGet).toHaveBeenCalledWith('/api/v1/buyer-directory')
  })

  it('supports county suffix searches for paid users', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    mockApiGet.mockResolvedValue({
      buyers: [
        {
          id: 1,
          initials: 'JB',
          accent: '#0EA5E9',
          company: 'Jefferson Buyer',
          owner: 'Jess Buyer',
          street: '790 Montclair Rd',
          city: 'Birmingham',
          state: 'AL',
          zip: '35213',
          phone: '(205) 555-0100',
          email: 'buyer@example.com',
          website: 'buyer.example',
          coverage: ['Jefferson'],
          description: 'Buys throughout Jefferson County.',
          deals: 12,
          years: 3,
          response: '24 hours',
          strategies: ['Wholesale'],
        },
      ],
    })

    renderDirectory()
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/api/v1/buyer-directory'))

    fireEvent.click(screen.getByRole('button', { name: 'County' }))
    fireEvent.change(screen.getByPlaceholderText('Hillsborough, Broward, Palm Beach...'), {
      target: { value: 'Jefferson County' },
    })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))

    expect(await screen.findByText('Jefferson Buyer')).toBeTruthy()
  })
})
