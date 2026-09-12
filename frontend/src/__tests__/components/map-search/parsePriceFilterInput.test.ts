import { describe, expect, it } from 'vitest'
import { parsePriceFilterInput } from '@/components/map-search/FilterPanel'

describe('parsePriceFilterInput', () => {
  it('treats an empty field as cleared', () => {
    expect(parsePriceFilterInput('')).toBeUndefined()
    expect(parsePriceFilterInput('   ')).toBeUndefined()
  })

  it('keeps a zero price instead of treating it as cleared', () => {
    expect(parsePriceFilterInput('0')).toBe(0)
  })

  it('parses a positive dollar amount', () => {
    expect(parsePriceFilterInput('250000')).toBe(250000)
  })

  it('rejects non-numeric and negative values', () => {
    expect(parsePriceFilterInput('abc')).toBeUndefined()
    expect(parsePriceFilterInput('-1')).toBeUndefined()
  })
})
