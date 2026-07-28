import { describe, expect, it } from 'vitest'
import {
  buildZipLookupPath,
  formatZipLocation,
  normalizeZip,
  type ZipLocation,
} from '@/lib/geo-api'

describe('normalizeZip', () => {
  it('accepts a plain 5-digit ZIP', () => {
    expect(normalizeZip('33460')).toBe('33460')
  })

  it('preserves leading zeros', () => {
    expect(normalizeZip('00501')).toBe('00501')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeZip('  90210 ')).toBe('90210')
  })

  it('takes the 5-digit prefix of a ZIP+4', () => {
    expect(normalizeZip('33460-1234')).toBe('33460')
  })

  it.each(['', '  ', '9021', '904105', 'abcde', '9021a'])(
    'rejects partial or non-numeric input: %s',
    (input) => {
      expect(normalizeZip(input)).toBeNull()
    },
  )
})

describe('buildZipLookupPath', () => {
  it('targets the geo endpoint', () => {
    expect(buildZipLookupPath('33460')).toBe('/api/geo/zip/33460')
  })
})

describe('formatZipLocation', () => {
  const base: ZipLocation = { zip: '33460', state: 'FL', county: null, counties: [] }

  it('shows county and state when a county is known', () => {
    expect(
      formatZipLocation({
        ...base,
        county: 'Palm Beach County',
        counties: ['Palm Beach County'],
      }),
    ).toBe('Palm Beach County, FL')
  })

  it('falls back to the state for ZIPs with no county', () => {
    expect(formatZipLocation(base)).toBe('FL')
  })
})
