import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPatch = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    patch: (...args: unknown[]) => mockApiPatch(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { ApprovalQueueSection } from '@/features/admin/components/marketing'

const draft = {
  id: 'p1',
  batch: 'bot-2026-09-05',
  key: 'bot-2026-09-05/post-01',
  account: 'founder',
  scheduled_at: '2026-09-06T11:45:00Z',
  body: 'Cash flow is a price attribute.\n\n#CashFlow',
  media_type: 'none',
  media_path: null,
  media_alt_text: null,
  document_title: null,
  first_comment: 'https://dealgapiq.com/blog/x?utm_source=linkedin',
  reshare_of_key: null,
  status: 'draft',
  approved_by: null,
  approved_at: null,
  linkedin_post_urn: null,
  linkedin_comment_urn: null,
  published_at: null,
  error: null,
  attempts: 0,
  created_by: 'bot:content-drafter',
  created_at: '2026-09-05T10:00:00Z',
  updated_at: '2026-09-05T10:00:00Z',
}

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalQueueSection />
    </QueryClientProvider>,
  )
}

describe('ApprovalQueueSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows bot provenance and approves through the admin endpoint only', async () => {
    mockApiGet.mockResolvedValue({ linkedin: [draft] })
    mockApiPost.mockResolvedValue({ ...draft, status: 'approved', approved_by: 'admin@test' })

    renderQueue()

    expect(await screen.findByText('bot-2026-09-05/post-01')).toBeInTheDocument()
    expect(screen.getByText('content-drafter')).toBeInTheDocument()
    expect(screen.getByText('Approval queue (1)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith('/api/v1/admin/linkedin/posts/p1/approve'),
    )
    expect(mockToastSuccess).toHaveBeenCalledWith('Approved bot-2026-09-05/post-01')
    // Queue refetches after the mutation so the row reflects server state.
    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2))
  })

  it('edits copy in place and surfaces server validation errors', async () => {
    mockApiGet.mockResolvedValue({ linkedin: [draft] })
    mockApiPatch.mockRejectedValue(new Error('body is 3200 chars; LinkedIn limit is 3000'))

    renderQueue()
    await screen.findByText('bot-2026-09-05/post-01')

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    const textarea = screen.getByLabelText('Post body')
    fireEvent.change(textarea, { target: { value: 'Tightened copy.\n\n#CashFlow' } })
    fireEvent.click(screen.getByRole('button', { name: /save copy/i }))

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith('/api/v1/admin/linkedin/posts/p1', {
        body: 'Tightened copy.\n\n#CashFlow',
      }),
    )
    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('body is 3200 chars; LinkedIn limit is 3000'),
    )
  })

  it('hides actions for rows that are no longer editable', async () => {
    mockApiGet.mockResolvedValue({
      linkedin: [{ ...draft, id: 'p2', status: 'published', linkedin_post_urn: 'urn:li:share:1' }],
    })

    renderQueue()
    fireEvent.click(await screen.findByRole('tab', { name: 'Published' }))

    expect(await screen.findByText('bot-2026-09-05/post-01')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('explains an empty queue', async () => {
    mockApiGet.mockResolvedValue({ linkedin: [] })
    renderQueue()
    expect(await screen.findByText(/Nothing waiting/)).toBeInTheDocument()
  })
})
