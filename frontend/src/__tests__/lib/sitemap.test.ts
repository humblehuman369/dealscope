import { describe, expect, it, vi } from 'vitest'
import type { StateMarketSummary } from '@/lib/markets'

const markets = vi.hoisted(() => ({ states: null as StateMarketSummary[] | null }))

vi.mock('@/lib/content', () => ({
  getAllContent: async (kind: string) =>
    kind === 'investor-intelligence'
      ? [{ slug: 'great-investor-reset-2026', frontmatter: { date_published: '2026-09-01' }, content: '' }]
      : [],
}))
vi.mock('@/lib/markets', () => ({ fetchStateMarkets: async () => markets.states }))
vi.mock('@/lib/blog-categories', () => ({ BLOG_CATEGORY_SLUGS: [] }))
vi.mock('@/components/blog/BlogIndexView', () => ({ BLOG_PAGE_SIZE: 12 }))
vi.mock('@/lib/blog-index', () => ({ blogPageHref: (n: number) => `/blog/page/${n}` }))
vi.mock('@/lib/seo/persona-pages', () => ({ PERSONA_PAGES: [] }))
vi.mock('@/lib/seo/problem-pages', () => ({ PROBLEM_PAGES: [] }))

import sitemap from '@/app/sitemap'

function state(code: string, name: string, overrides: Partial<StateMarketSummary> = {}): StateMarketSummary {
  return {
    code,
    name,
    slug: name.toLowerCase().replace(/ /g, '-'),
    lender_count: 90,
    state_lender_count: 0,
    nationwide_lender_count: 90,
    buyer_count: 0,
    has_state_specific_assumptions: false,
    indexable: false,
    ...overrides,
  }
}

describe('sitemap', () => {
  it('lists the indexable directory hubs', async () => {
    markets.states = null
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://dealgapiq.com/lenders')
    expect(urls).toContain('https://dealgapiq.com/directory')
  })

  it('emits Investor Intelligence URLs without the redirecting trailing slash', async () => {
    markets.states = null
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://dealgapiq.com/investor-intelligence/great-investor-reset-2026')
    expect(urls.filter((u) => u.endsWith('/') && u !== 'https://dealgapiq.com/')).toEqual([])
  })

  it('emits no state URLs when the backend is unreachable', async () => {
    markets.states = null
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.filter((u) => /\/markets\/(?!near-me$)/.test(u))).toEqual([])
    expect(urls).toContain('https://dealgapiq.com/markets')
  })

  it('lists only the states the backend marks indexable', async () => {
    markets.states = [
      state('FL', 'Florida', {
        has_state_specific_assumptions: true,
        state_lender_count: 130,
        lender_count: 220,
        buyer_count: 200,
        indexable: true,
      }),
      // Baseline assumptions plus a padded lender count: rendered, not indexed.
      state('OH', 'Ohio', { buyer_count: 40, indexable: false }),
      // Own assumptions row but nothing in-state: not indexed either.
      state('GA', 'Georgia', { has_state_specific_assumptions: true, indexable: false }),
      state('WY', 'Wyoming'),
    ]
    const urls = (await sitemap()).map((e) => e.url)
    const stateUrls = urls.filter((u) => /\/markets\/(?!near-me$)/.test(u))
    expect(stateUrls).toEqual(['https://dealgapiq.com/markets/florida'])
  })
})
