import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import {
  listingNeedsMotivatedPinColor,
  listingWhyFacts,
  listingWhyLine,
  listingWhyPinTag,
} from '@/components/map-search/listingWhyFacts'

const base: MapListing = {
  id: 'A',
  address: '1 Main',
  latitude: 0,
  longitude: 0,
  price: 425000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1400,
  property_type: 'Single Family',
  listing_status: 'Active',
  photo_url: null,
  source: 'test',
  days_on_market: 5,
  year_built: null,
}

describe('listingWhyFacts', () => {
  it('adds nothing extra on a fresh Active listing', () => {
    expect(listingWhyFacts(base)).toEqual([])
    expect(listingWhyLine(base)).toBeNull()
    expect(listingWhyPinTag(base)).toBeNull()
  })

  it('does not invent a motivated banner without phrases', () => {
    expect(listingWhyFacts({ ...base, motivated_keywords: [] })).toEqual([])
    expect(listingWhyFacts({ ...base, motivated_keywords: ['  ', ''] })).toEqual([])
  })

  it('does not invent DISTRESSED DEAL unless status is foreclosure / auction / pre-foreclosure', () => {
    expect(listingWhyFacts({ ...base, listing_status: 'FOR_SALE' })).toEqual([])
    expect(listingWhyFacts({ ...base, listing_status: 'Off-Market' })).toEqual([])
  })

  it('distress-only: DISTRESSED DEAL plus the canonical type', () => {
    const facts = listingWhyFacts({ ...base, listing_status: 'Foreclosure' })
    expect(facts.map((f) => f.kind)).toEqual(['distressed'])
    expect(facts[0]).toMatchObject({
      title: 'DISTRESSED DEAL',
      detail: 'Foreclosure',
      pinTag: 'FC',
      tone: 'distressed',
    })
  })

  it('maps auction and pre-foreclosure pin tags', () => {
    expect(listingWhyPinTag({ ...base, listing_status: 'Auction' })).toBe('Auction')
    expect(listingWhyFacts({ ...base, listing_status: 'Pre-Foreclosure' })[0]).toMatchObject({
      title: 'DISTRESSED DEAL',
      detail: 'Pre-Foreclosure',
      pinTag: 'Pre-FC',
    })
  })

  it('keywords-only: MOTIVATED SELLER with up to 3 phrase chips', () => {
    const facts = listingWhyFacts({
      ...base,
      motivated_keywords: ['As Is', 'Cash only', 'Must Sell', 'Bring offers'],
    })
    expect(facts.map((f) => f.kind)).toEqual(['motivated'])
    expect(facts[0]).toMatchObject({
      title: 'MOTIVATED SELLER',
      chips: ['As Is', 'Cash only', 'Must Sell'],
      pinTag: 'Motivated',
      tone: 'motivated',
    })
  })

  it('stacks distress then motivated when both apply', () => {
    const facts = listingWhyFacts({
      ...base,
      listing_status: 'Auction',
      motivated_keywords: ['Cash only'],
    })
    expect(facts.map((f) => f.kind)).toEqual(['distressed', 'motivated'])
    expect(listingWhyPinTag({ ...base, listing_status: 'Auction', motivated_keywords: ['As Is'] })).toBe(
      'Auction',
    )
  })

  it('owner listed: OWNER LISTED / FSBO', () => {
    const facts = listingWhyFacts({ ...base, listing_status: 'Owner Listed' })
    expect(facts.map((f) => f.kind)).toEqual(['owner_listed'])
    expect(facts[0]).toMatchObject({
      title: 'OWNER LISTED',
      detail: 'FSBO / no agent',
      pinTag: 'FSBO',
    })
  })

  it('expired: EXPIRED LISTING with delisted year when present', () => {
    const facts = listingWhyFacts({
      ...base,
      listing_status: 'Expired',
      delisted_date: '2024-11-02',
      days_on_market: null,
    })
    expect(facts.map((f) => f.kind)).toEqual(['expired'])
    expect(facts[0]).toMatchObject({
      title: 'EXPIRED LISTING',
      detail: 'Delisted 2024',
      pinTag: 'Expired',
    })
  })

  it('owner lead: absentee and years held, without inventing from owner-occupied alone', () => {
    const facts = listingWhyFacts({
      ...base,
      owner_occupied: false,
      owner_years: 22.4,
    })
    expect(facts.map((f) => f.kind)).toEqual(['owner_lead'])
    expect(facts[0]).toMatchObject({
      title: 'OWNER LEAD',
      detail: 'Absentee · 22 yrs held',
      pinTag: 'Owner',
    })
    expect(listingWhyFacts({ ...base, owner_occupied: true })).toEqual([])
  })

  it('high DOM is supporting, not a banner on a fresh listing', () => {
    expect(listingWhyFacts({ ...base, days_on_market: 12 })).toEqual([])
    const facts = listingWhyFacts({ ...base, days_on_market: 87 })
    expect(facts.map((f) => f.kind)).toEqual(['dom'])
    expect(facts[0].title).toBe('87 DAYS ON MARKET')
  })

  it('keeps DOM behind stronger signals', () => {
    const facts = listingWhyFacts({
      ...base,
      listing_status: 'Foreclosure',
      motivated_keywords: ['As Is'],
      days_on_market: 87,
    })
    expect(facts.map((f) => f.kind)).toEqual(['distressed', 'motivated', 'dom'])
  })

  it('why-line joins stacked facts for the list overlay', () => {
    expect(
      listingWhyLine({
        ...base,
        listing_status: 'Foreclosure',
        motivated_keywords: ['As Is', 'Cash only'],
      }),
    ).toBe('DISTRESSED DEAL · Foreclosure · MOTIVATED SELLER: As Is · Cash only')
  })

  it('paints an otherwise Active pin hot when motivated phrases exist', () => {
    expect(listingNeedsMotivatedPinColor({ ...base, motivated_keywords: ['As Is'] }, 'active')).toBe(
      true,
    )
    expect(listingNeedsMotivatedPinColor({ ...base, motivated_keywords: ['As Is'] }, 'distressed')).toBe(
      false,
    )
    expect(listingNeedsMotivatedPinColor(base, 'active')).toBe(false)
  })
})
