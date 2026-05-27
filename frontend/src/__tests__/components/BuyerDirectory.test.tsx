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
  ApiError: class ApiError extends Error {
    status: number
    code?: string
    detail?: Record<string, unknown>
    constructor(message: string, status: number, code?: string, detail?: Record<string, unknown>) {
      super(message)
      this.status = status
      this.code = code
      this.detail = detail
    }
  },
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

const sampleBuyer = {
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
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('loads directory total for trialing users via stats', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: false,
      isTrialing: true,
      isAuthenticated: true,
      isLoading: false,
    })
    const { ApiError } = await import('@/lib/api-client')
    mockApiGet.mockRejectedValue(
      new ApiError('Cash Buyer Directory requires DealGapIQ Pro', 401, 'PRO_REQUIRED', {
        total: 2812,
      }),
    )

    renderDirectory()

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/api/buyers/stats'),
    )
    expect(screen.getByText('Cash Buyer Directory requires paid Pro')).toBeTruthy()
  })

  it('fetches paginated buyers for paid active users', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    mockApiGet.mockResolvedValue({
      buyers: [sampleBuyer],
      total: 1,
      page: 1,
      limit: 60,
      totalPages: 1,
    })

    renderDirectory()

    await waitFor(() => expect(screen.getByText('Revival Home Buyer')).toBeTruthy())
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining('/api/buyers?'),
    )
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringMatching(/city=Tampa/),
    )
  })

  it('supports county searches via API query params', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    mockApiGet.mockResolvedValue({
      buyers: [{ ...sampleBuyer, company: 'Jefferson Buyer', city: 'Birmingham', state: 'AL' }],
      total: 1,
      page: 1,
      limit: 60,
      totalPages: 1,
    })

    renderDirectory()
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'County' }))
    fireEvent.change(screen.getByPlaceholderText('Hillsborough, Broward, Palm Beach...'), {
      target: { value: 'Jefferson County' },
    })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringMatching(/county=Jefferson/)),
    )
    expect(await screen.findByText('Jefferson Buyer')).toBeTruthy()
  })
})
