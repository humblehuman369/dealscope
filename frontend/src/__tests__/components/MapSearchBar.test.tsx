import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/AddressAutocomplete', () => ({
  AddressAutocomplete: (props: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    'aria-label'?: string
  }) => (
    <input
      aria-label={props['aria-label']}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}))

import { MapSearchBar } from '@/components/map-search/MapSearchBar'

describe('MapSearchBar', () => {
  it('keeps a static placeholder when no rotating prompts are passed', () => {
    render(<MapSearchBar onSelect={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'placeholder',
      'Search address, city, state, or ZIP',
    )
  })

  it('cycles rotating prompts while the input is empty', () => {
    vi.useFakeTimers()
    render(
      <MapSearchBar
        onSelect={vi.fn()}
        placeholders={['Type any address to see the gap', 'Type your next flip to see the numbers']}
      />,
    )

    expect(screen.getByText('Type any address to see the gap')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '')

    act(() => {
      vi.advanceTimersByTime(3200)
    })

    expect(screen.getByText('Type your next flip to see the numbers')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
