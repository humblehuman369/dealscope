import { describe, it, expect } from 'vitest'
import {
  getPriceLabel,
  getPriceTargetLabel,
  getPriceTargetDescription,
  isPropertyOffMarket,
  getAtPriceLabel,
  getReturnsAtPriceLabel,
} from '@/lib/priceUtils'

describe('priceUtils', () => {
  describe('getPriceLabel', () => {
    it('returns "Est. Market Value" for off-market properties', () => {
      expect(getPriceLabel(true)).toBe('Est. Market Value')
    })

    it('returns "List Price (Pending)" for pending status', () => {
      expect(getPriceLabel(false, 'PENDING')).toBe('List Price (Pending)')
    })

    it('returns "List Price" for on-market properties', () => {
      expect(getPriceLabel(false, 'FOR_SALE')).toBe('List Price')
    })

    it('returns "List Price" when no arguments provided', () => {
      expect(getPriceLabel()).toBe('List Price')
    })

    it('returns "Est. Market Value" when off-market regardless of status', () => {
      expect(getPriceLabel(true, 'PENDING')).toBe('Est. Market Value')
    })
  })

  describe('getPriceTargetLabel', () => {
    it('returns "Breakeven" for breakeven target', () => {
      expect(getPriceTargetLabel('breakeven')).toBe('Breakeven')
    })

    it('returns "Target Buy" for targetBuy target', () => {
      expect(getPriceTargetLabel('targetBuy')).toBe('Target Buy')
    })

    it('returns "Wholesale" for wholesale target', () => {
      expect(getPriceTargetLabel('wholesale')).toBe('Wholesale')
    })
  })

  describe('getPriceTargetDescription', () => {
    it('returns breakeven description', () => {
      expect(getPriceTargetDescription('breakeven')).toBe('Max price for $0 cashflow')
    })

    it('returns targetBuy description', () => {
      expect(getPriceTargetDescription('targetBuy')).toBe('Positive Cashflow')
    })

    it('returns wholesale description', () => {
      expect(getPriceTargetDescription('wholesale')).toBe('30% net discount for assignment')
    })
  })

  describe('isPropertyOffMarket', () => {
    it('returns true when no status provided', () => {
      expect(isPropertyOffMarket()).toBe(true)
      expect(isPropertyOffMarket(undefined)).toBe(true)
    })

    it('returns true for OFF_MARKET status', () => {
      expect(isPropertyOffMarket('OFF_MARKET')).toBe(true)
    })

    it('returns true for SOLD status', () => {
      expect(isPropertyOffMarket('SOLD')).toBe(true)
    })

    it('returns true for FOR_RENT status', () => {
      expect(isPropertyOffMarket('FOR_RENT')).toBe(true)
    })

    it('returns false for FOR_SALE status', () => {
      expect(isPropertyOffMarket('FOR_SALE')).toBe(false)
    })

    it('returns false for PENDING status', () => {
      expect(isPropertyOffMarket('PENDING')).toBe(false)
    })
  })

  describe('getAtPriceLabel', () => {
    it('returns "At List Price" for on-market', () => {
      expect(getAtPriceLabel(false)).toBe('At List Price')
    })

    it('returns "At Est. Market Value" for off-market', () => {
      expect(getAtPriceLabel(true)).toBe('At Est. Market Value')
    })

    it('returns "At List Price (Pending)" for pending status', () => {
      expect(getAtPriceLabel(false, 'PENDING')).toBe('At List Price (Pending)')
    })
  })

  describe('getReturnsAtPriceLabel', () => {
    it('returns returns label for on-market', () => {
      expect(getReturnsAtPriceLabel(false)).toBe('Returns at List Price')
    })

    it('returns returns label for off-market', () => {
      expect(getReturnsAtPriceLabel(true)).toBe('Returns at Est. Market Value')
    })
  })
})
