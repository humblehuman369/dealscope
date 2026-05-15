import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  describe('open / closed', () => {
    it('renders nothing when open is false', () => {
      render(
        <Modal open={false} onClose={vi.fn()} title="Hidden">
          <p>Body</p>
        </Modal>,
      )
      expect(screen.queryByText('Body')).toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('renders dialog with title and body when open', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="Sign in">
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeTruthy()
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      expect(screen.getByText('Sign in')).toBeTruthy()
      expect(screen.getByText('Body')).toBeTruthy()
    })
  })

  describe('accessibility wiring', () => {
    it('uses aria-labelledby to point at the rendered title', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="Sign in">
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog')
      const labelledBy = dialog.getAttribute('aria-labelledby')
      expect(labelledBy).toBeTruthy()
      const title = document.getElementById(labelledBy!)
      expect(title?.textContent).toBe('Sign in')
    })

    it('falls back to aria-label when no title is provided', () => {
      render(
        <Modal open={true} onClose={vi.fn()} aria-label="Settings menu" hideCloseButton>
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.getAttribute('aria-label')).toBe('Settings menu')
      expect(dialog.getAttribute('aria-labelledby')).toBeNull()
    })

    it('respects an explicit aria-labelledby override', () => {
      render(
        <Modal open={true} onClose={vi.fn()} aria-labelledby="custom-heading">
          <h3 id="custom-heading">Custom heading</h3>
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.getAttribute('aria-labelledby')).toBe('custom-heading')
    })

    it('renders a close button with aria-label by default', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="With close">
          <p>Body</p>
        </Modal>,
      )
      expect(screen.getByLabelText('Close')).toBeTruthy()
    })

    it('hides the default close button when hideCloseButton is true', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="No close" hideCloseButton>
          <p>Body</p>
        </Modal>,
      )
      expect(screen.queryByLabelText('Close')).toBeNull()
    })
  })

  describe('dismissal', () => {
    it('calls onClose when the X button is clicked', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="X-test">
          <p>Body</p>
        </Modal>,
      )
      fireEvent.click(screen.getByLabelText('Close'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="Escape-test">
          <p>Body</p>
        </Modal>,
      )
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('does NOT call onClose on Escape when closeOnEscape is false', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="Escape-disabled" closeOnEscape={false}>
          <p>Body</p>
        </Modal>,
      )
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose when the backdrop is clicked', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="Backdrop-test">
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog')
      // Click the backdrop itself (the dialog wrapper) — not a child.
      fireEvent.click(dialog)
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('does NOT call onClose when clicking inside the panel', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="Panel-click">
          <button>inside</button>
        </Modal>,
      )
      fireEvent.click(screen.getByText('inside'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('does NOT call onClose on backdrop click when closeOnBackdropClick is false', () => {
      const onClose = vi.fn()
      render(
        <Modal open={true} onClose={onClose} title="Backdrop-disabled" closeOnBackdropClick={false}>
          <p>Body</p>
        </Modal>,
      )
      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('fullBleed', () => {
    it('skips the inner padding wrapper when fullBleed is true', () => {
      const { container } = render(
        <Modal open={true} onClose={vi.fn()} aria-label="bleed" fullBleed hideCloseButton>
          <div data-testid="bleed-content">edge</div>
        </Modal>,
      )
      const content = container.querySelector('[data-testid="bleed-content"]')
      // Direct parent must NOT carry the padded wrapper class.
      const parent = content?.parentElement
      expect(parent?.className).not.toMatch(/px-6|pb-6|pt-2/)
    })

    it('still renders the title header when fullBleed=true and title is provided', () => {
      render(
        <Modal open={true} onClose={vi.fn()} title="With header" fullBleed>
          <p>Body</p>
        </Modal>,
      )
      expect(screen.getByText('With header')).toBeTruthy()
    })

    it('suppresses the default close button when fullBleed=true and no title', () => {
      render(
        <Modal open={true} onClose={vi.fn()} aria-label="suppressed" fullBleed>
          <p>Body</p>
        </Modal>,
      )
      // Caller is responsible for its own close affordance in fullBleed mode.
      expect(screen.queryByLabelText('Close')).toBeNull()
    })
  })

  describe('body scroll lock', () => {
    it('locks body scroll while open and restores it on unmount', () => {
      // Capture whatever overflow was set before the test.
      const originalOverflow = document.body.style.overflow

      const { unmount } = render(
        <Modal open={true} onClose={vi.fn()} title="Scroll-lock">
          <p>Body</p>
        </Modal>,
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      // After unmount the lock is released — should equal whatever was there before.
      expect(document.body.style.overflow).toBe(originalOverflow)
    })
  })
})
