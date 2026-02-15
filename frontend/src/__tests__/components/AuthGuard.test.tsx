import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useSession at the module level
const mockUseSession = vi.fn()
vi.mock('@/hooks/useSession', () => ({
  useSession: () => mockUseSession(),
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/protected-page',
  useSearchParams: () => new URLSearchParams(),
}))

import { AuthGuard } from '@/components/auth/AuthGuard'

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while session is loading', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isAdmin: false,
    })

    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(container.querySelector('.animate-spin')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders children when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Protected Content')).toBeTruthy()
  })

  it('redirects to auth modal when not authenticated', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>,
    )

    // Should have called replace with auth=required
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('auth=required'),
      expect.any(Object),
    )
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders children for admin users when requireAdmin is true', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isAdmin: true,
    })

    render(
      <AuthGuard requireAdmin>
        <div>Admin Content</div>
      </AuthGuard>,
    )

    expect(screen.getByText('Admin Content')).toBeTruthy()
  })

  it('redirects non-admin users when requireAdmin is true', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
    })

    render(
      <AuthGuard requireAdmin>
        <div>Admin Content</div>
      </AuthGuard>,
    )

    expect(mockReplace).toHaveBeenCalledWith('/search')
  })

  it('redirects to custom adminFallback when provided', () => {
    mockUseSession.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
    })

    render(
      <AuthGuard requireAdmin adminFallback="/dashboard">
        <div>Admin Content</div>
      </AuthGuard>,
    )

    expect(mockReplace).toHaveBeenCalledWith('/dashboard')
  })
})
