import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScanResultSheet } from '@/components/scanner/ScanResultSheet'
import type { ScanResult } from '@/hooks/usePropertyScan'

const result: ScanResult = {
  property: {
    address: '37770 Moonbay Circle',
    city: 'Wellington',
    state: 'FL',
    zip: '33414',
    formattedAddress: '37770 Moonbay Circle, Wellington, FL 33414',
    lat: 26.65,
    lng: -80.24,
  },
  confidence: 95,
  scanTime: 100,
  heading: 55,
  distance: 50,
}

describe('ScanResultSheet', () => {
  it('calls onClose from the close control and Scan Another', () => {
    const onClose = vi.fn()
    render(
      <ScanResultSheet result={result} onClose={onClose} onViewDetails={vi.fn()} />,
    )

    fireEvent.click(screen.getByLabelText('Close'))
    fireEvent.click(screen.getByRole('button', { name: 'Scan Another' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('calls onPickFromMap from Search Map', () => {
    const onPickFromMap = vi.fn()
    render(
      <ScanResultSheet
        result={result}
        onClose={vi.fn()}
        onViewDetails={vi.fn()}
        onPickFromMap={onPickFromMap}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Search Map/i }))
    expect(onPickFromMap).toHaveBeenCalledTimes(1)
  })

  it('calls onViewDetails from Analyze This Property', () => {
    const onViewDetails = vi.fn()
    render(
      <ScanResultSheet result={result} onClose={vi.fn()} onViewDetails={onViewDetails} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Analyze This Property/i }))
    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })
})
