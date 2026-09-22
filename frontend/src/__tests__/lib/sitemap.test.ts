import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/content', () => ({
  getAllContent: async (kind: string) =>
    kind === 'investor-intelligence'
      ? [{ slug: 'great-investor-reset-2026', frontmatter: { date_published: '2026-09-01' }, content: '' }]
      : [],
}))
vi.mock('@/lib/markets', () => ({ fetchStateMarkets: async () => null }))
vi.mock('@/lib/blog-categories', () => ({ BLOG_CATEGORY_SLUGS: [] }))
vi.mock('@/components/blog/BlogIndexView', () => ({ BLOG_PAGE_SIZE: 12 }))
vi.mock('@/lib/blog-index', () => ({ blogPageHref: (n: number) => `/blog/page/${n}` }))
vi.mock('@/lib/seo/persona-pages', () => ({ PERSONA_PAGES: [] }))
vi.mock('@/lib/seo/problem-pages', () => ({ PROBLEM_PAGES: [] }))

import sitemap from '@/app/sitemap'

describe('sitemap', () => {
  it('lists the indexable directory hubs', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://dealgapiq.com/lenders')
    expect(urls).toContain('https://dealgapiq.com/directory')
  })

  it('emits Investor Intelligence URLs without the redirecting trailing slash', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://dealgapiq.com/investor-intelligence/great-investor-reset-2026')
    expect(urls.filter((u) => u.endsWith('/') && u !== 'https://dealgapiq.com/')).toEqual([])
  })
})
