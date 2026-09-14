import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TuneDrawer } from '@/components/workflow/TuneDrawer'

describe('TuneDrawer', () => {
  it('exposes a dialog with Reset and Done', () => {
    const onClose = vi.fn()
    const onReset = vi.fn()
    render(
      <TuneDrawer open onClose={onClose} onReset={onReset} resetLabel="Reset to creative finance">
        <p>Buy Price $625,999</p>
      </TuneDrawer>,
    )

    expect(screen.getByRole('dialog', { name: 'Tune the numbers' })).toBeInTheDocument()
    expect(screen.getByText('Buy Price $625,999')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset to creative finance' }))
    expect(onReset).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onDone from Done and leaves onClose for the backdrop', () => {
    const onClose = vi.fn()
    const onDone = vi.fn()
    render(
      <TuneDrawer open onClose={onClose} onDone={onDone} onReset={vi.fn()} resetLabel="Reset">
        <p>tuned</p>
      </TuneDrawer>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Close tune drawer' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <TuneDrawer open={false} onClose={vi.fn()} onReset={vi.fn()} resetLabel="Reset to blend">
        <p>hidden</p>
      </TuneDrawer>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
