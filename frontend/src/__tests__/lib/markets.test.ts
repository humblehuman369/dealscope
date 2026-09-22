import { afterEach, describe, expect, it, vi } from 'vitest'
import { assumptionsSectionCopy, directoryCountPhrases, fetchStateMarket, fetchStateMarkets } from '@/lib/markets'

vi.mock('@/lib/server-env', () => ({ BACKEND_URL: 'https://backend.test' }))

const v1Florida = {
  code: 'FL',
  name: 'Florida',
  slug: 'florida',
  lender_count: 220,
  buyer_count: 200,
  has_state_specific_assumptions: true,
  indexable: true,
}

function mockFetch(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => body })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetch tolerance for pre-split payloads', () => {
  it('treats a v1 detail payload as all-nationwide rather than all-licensed', async () => {
    mockFetch({ ...v1Florida, assumptions: {}, buyer_cities: [], data_sections: [], generated_at: 'x' })
    const detail = await fetchStateMarket('FL')
    expect(detail?.state_lender_count).toBe(0)
    expect(detail?.nationwide_lender_count).toBe(220)
    expect(detail?.lender_count).toBe(220)
  })

  it('passes a v2 list payload through unchanged', async () => {
    mockFetch({
      states: [{ ...v1Florida, state_lender_count: 130, nationwide_lender_count: 90 }],
      generated_at: 'x',
    })
    const states = await fetchStateMarkets()
    expect(states?.[0]).toMatchObject({ state_lender_count: 130, nationwide_lender_count: 90, lender_count: 220 })
  })
})

describe('assumptionsSectionCopy', () => {
  it('claims state scope only when the state has its own row', () => {
    const fl = assumptionsSectionCopy('Florida', true)
    expect(fl.heading).toBe('What DealGapIQ assumes for Florida properties')
    expect(fl.intro).toMatch(/own row/)
  })

  it('names the national baseline in the heading for baseline states', () => {
    const al = assumptionsSectionCopy('Alabama', false)
    expect(al.heading).toBe('National baseline assumptions (no Alabama-specific adjustments yet)')
    expect(al.heading).not.toMatch(/assumes for Alabama/)
    expect(al.intro).toMatch(/national baseline/)
    expect(al.intro).toMatch(/has not set Alabama-specific overrides/)
  })
})

describe('directoryCountPhrases', () => {
  it('keeps in-state and nationwide lenders apart', () => {
    expect(
      directoryCountPhrases('Texas', { state_lender_count: 112, nationwide_lender_count: 90, buyer_count: 242 }),
    ).toEqual(['112 hard money lenders licensed in Texas (plus 90 nationwide)', '242 verified cash buyers based in Texas'])
  })

  it('never presents nationwide lenders as licensed in the state', () => {
    const phrases = directoryCountPhrases('Wyoming', {
      state_lender_count: 0,
      nationwide_lender_count: 90,
      buyer_count: 0,
    })
    expect(phrases).toEqual(['90 nationwide hard money lenders that lend in Wyoming'])
    expect(phrases.join(' ')).not.toMatch(/licensed in Wyoming/)
  })

  it('returns nothing when the directories hold nothing', () => {
    expect(directoryCountPhrases('Alaska', { state_lender_count: 0, nationwide_lender_count: 0, buyer_count: 0 })).toEqual(
      [],
    )
  })

  it('uses singular nouns for a count of one', () => {
    expect(directoryCountPhrases('Maine', { state_lender_count: 1, nationwide_lender_count: 0, buyer_count: 1 })).toEqual([
      '1 hard money lender licensed in Maine',
      '1 verified cash buyer based in Maine',
    ])
  })
})
