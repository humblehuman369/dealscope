import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataBoundary } from '@/components/ui/DataBoundary'

describe('DataBoundary', () => {
  describe('loading state', () => {
    it('renders a spinner when isLoading is true', () => {
      const { container } = render(
        <DataBoundary isLoading={true}>
          <div>content</div>
        </DataBoundary>,
      )
      // Spinner should have animate-spin class
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
      expect(screen.queryByText('content')).toBeNull()
    })
  })

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      render(
        <DataBoundary isLoading={false} error="Something went wrong">
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('Something went wrong')).toBeTruthy()
      expect(screen.queryByText('content')).toBeNull()
    })

    it('renders retry button when onRetry is provided', () => {
      const onRetry = vi.fn()
      render(
        <DataBoundary isLoading={false} error="Failed" onRetry={onRetry}>
          <div>content</div>
        </DataBoundary>,
      )
      const retryButton = screen.getByText('Try Again')
      expect(retryButton).toBeTruthy()
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledOnce()
    })

    it('does not render retry button when onRetry is not provided', () => {
      render(
        <DataBoundary isLoading={false} error="Failed">
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.queryByText('Try Again')).toBeNull()
    })
  })

  describe('empty state', () => {
    it('renders empty state with default title', () => {
      render(
        <DataBoundary isLoading={false} isEmpty={true}>
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('No data found')).toBeTruthy()
      expect(screen.queryByText('content')).toBeNull()
    })

    it('renders custom empty title and description', () => {
      render(
        <DataBoundary
          isLoading={false}
          isEmpty={true}
          emptyTitle="No properties saved"
          emptyDescription="Start by searching for a property"
        >
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('No properties saved')).toBeTruthy()
      expect(screen.getByText('Start by searching for a property')).toBeTruthy()
    })

    it('renders empty action when provided', () => {
      render(
        <DataBoundary
          isLoading={false}
          isEmpty={true}
          emptyAction={<button>Search Now</button>}
        >
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('Search Now')).toBeTruthy()
    })

    it('renders custom empty icon', () => {
      render(
        <DataBoundary
          isLoading={false}
          isEmpty={true}
          emptyIcon={<span data-testid="custom-icon">icon</span>}
        >
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByTestId('custom-icon')).toBeTruthy()
    })
  })

  describe('data state', () => {
    it('renders children when data is loaded and not empty', () => {
      render(
        <DataBoundary isLoading={false}>
          <div>My content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('My content')).toBeTruthy()
    })

    it('renders children when isEmpty is explicitly false', () => {
      render(
        <DataBoundary isLoading={false} isEmpty={false}>
          <div>Data here</div>
        </DataBoundary>,
      )
      expect(screen.getByText('Data here')).toBeTruthy()
    })
  })

  describe('priority ordering', () => {
    it('loading takes priority over error', () => {
      const { container } = render(
        <DataBoundary isLoading={true} error="error">
          <div>content</div>
        </DataBoundary>,
      )
      expect(container.querySelector('.animate-spin')).toBeTruthy()
      expect(screen.queryByText('error')).toBeNull()
    })

    it('error takes priority over empty', () => {
      render(
        <DataBoundary isLoading={false} error="error" isEmpty={true}>
          <div>content</div>
        </DataBoundary>,
      )
      expect(screen.getByText('error')).toBeTruthy()
      expect(screen.queryByText('No data found')).toBeNull()
    })
  })
})
