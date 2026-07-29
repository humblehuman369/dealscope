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

vi.mock('@/components/SaveDirectoryContactButton', () => ({
  SaveDirectoryContactButton: () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

import HardMoneyDirectory from '@/components/lender-directory/HardMoneyDirectory'

function renderDirectory() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <HardMoneyDirectory />
    </QueryClientProvider>,
  )
}

const sampleLender = {
  id: 42,
  domain: 'kiavi.com',
  company_name: 'Kiavi',
  website: 'https://kiavi.com',
  phone: '(844) 415-4663',
  email: 'hello@kiavi.com',
  contact_type: 'phone_email',
  city: 'San Francisco',
  state: 'CA',
  states_served: ['CA', 'FL', 'TX'],
  states_served_count: 3,
  nationwide: false,
  loan_products: ['fix_flip', 'brrrr'],
  description: 'Bridge and rental loans for real estate investors.',
  min_loan_amount: 100000,
  max_loan_amount: 3000000,
  max_ltv: 0.9,
  max_arv: 0.75,
  min_interest_rate: 0.0799,
  max_interest_rate: 0.1225,
  min_points: 1.5,
  max_points: 3,
  min_term_months: 12,
  max_term_months: 24,
  interest_only: true,
  display: {
    loan_range: '$100K – $3M',
    max_ltv: '90%',
    max_arv: '75%',
    interest_rate: '7.99% – 12.25%',
    points: '1.5 – 3',
    term: '12 – 24 mo',
  },
  nmls_id: '1125207',
  aapl_member: true,
  year_founded: 2013,
  credit_check_policy: 'soft_pull',
  min_credit_score: 660,
  no_credit_check: false,
}

const statsResponse = {
  total: 484,
  byState: { CA: 120, FL: 96 },
  byProduct: { fix_flip: 300, brrrr: 180 },
  byCreditPolicy: { soft_pull: 40, unknown: 141 },
  noCreditCheckCount: 22,
  nationwideCount: 79,
}

const singleLenderPage = {
  lenders: [sampleLender],
  total: 1,
  page: 1,
  limit: 25,
  totalPages: 1,
}

/** Route each call by path so stats, ZIP lookup and list can differ. */
function respondByPath(handlers: Record<string, unknown>) {
  mockApiGet.mockImplementation((path: string) => {
    const match = Object.keys(handlers).find((prefix) => path.startsWith(prefix))
    if (!match) return Promise.reject(new Error(`unexpected request: ${path}`))
    return Promise.resolve(handlers[match])
  })
}

function listPaths() {
  return mockApiGet.mock.calls
    .map(([path]) => String(path))
    .filter((path) => path.startsWith('/api/lenders?'))
}

describe('HardMoneyDirectory paid access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSubscription.mockReturnValue({
      isPaidPro: false,
      isTrialing: false,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('does not fetch lenders for anonymous users', () => {
    renderDirectory()

    expect(screen.getByText('Sign in to browse verified lenders')).toBeTruthy()
    expect(screen.getByText('Verified Hard Money Lender')).toBeTruthy()
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('blocks trialing users — the directory is not part of the free trial', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: false,
      isTrialing: true,
      isAuthenticated: true,
      isLoading: false,
    })
    respondByPath({ '/api/lenders/stats': statsResponse })

    renderDirectory()

    expect(await screen.findByText(/not included in the free trial/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /start paid pro/i })).toBeTruthy()
    expect(listPaths()).toEqual([])
  })

  it('fetches paginated lenders for paid active users', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    respondByPath({
      '/api/lenders/stats': statsResponse,
      '/api/lenders?': singleLenderPage,
    })

    renderDirectory()

    await waitFor(() => expect(screen.getByText('Kiavi')).toBeTruthy())

    // The first view is nationwide: no filters are sent until the user picks some.
    const [firstList] = listPaths()
    expect(firstList).toBeDefined()
    expect(firstList).not.toMatch(/[?&](state|product|min_loan|credit|q)=/)
  })

  it('sends the selected state and loan product as query params', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    respondByPath({
      '/api/lenders/stats': statsResponse,
      '/api/lenders?': singleLenderPage,
    })

    renderDirectory()
    await waitFor(() => expect(listPaths().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'FL' } })
    fireEvent.change(screen.getByLabelText('Loan product'), { target: { value: 'fix_flip' } })

    await waitFor(() =>
      expect(listPaths().some((path) => /state=FL/.test(path) && /product=fix_flip/.test(path))).toBe(
        true,
      ),
    )
  })

  it('resolves a deal ZIP to its state and filters by it', async () => {
    mockUseSubscription.mockReturnValue({
      isPaidPro: true,
      isTrialing: false,
      isAuthenticated: true,
      isLoading: false,
    })
    respondByPath({
      '/api/lenders/stats': statsResponse,
      '/api/lenders?': singleLenderPage,
      '/api/geo/zip/33460': {
        zip: '33460',
        state: 'FL',
        county: 'Palm Beach County',
        counties: ['Palm Beach County'],
      },
    })

    renderDirectory()
    await waitFor(() => expect(listPaths().length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('Deal ZIP code'), { target: { value: '33460' } })

    // Coverage is state-licensed, so the ZIP only ever narrows to its state.
    expect(await screen.findByText('Palm Beach County, FL')).toBeTruthy()
    await waitFor(() => expect(listPaths().some((path) => /state=FL/.test(path))).toBe(true))
  })
})
