import { describe, expect, it } from 'vitest'
import {
  ARTICLES,
  CAMPAIGN,
  CATEGORIES,
  CATEGORY_IDS,
  allIntelligencePaths,
  getArticle,
  getCampaignArticles,
  getCategory,
  getFeaturedArticle,
  RESERVED_SLUGS,
} from '@/lib/investor-intelligence'

describe('Investor Intelligence catalog', () => {
  it('has eight unique categories matching the hub IA', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_IDS])
    const slugs = CATEGORIES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(8)
  })

  it('gives every article a unique slug that does not collide with reserved routes', () => {
    const slugs = ARTICLES.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(ARTICLES.length)
    for (const slug of slugs) {
      expect(RESERVED_SLUGS.has(slug)).toBe(false)
      expect(getArticle(slug)?.slug).toBe(slug)
    }
  })

  it('campaign contains ten ordered chapters', () => {
    const chapters = getCampaignArticles()
    expect(chapters).toHaveLength(10)
    expect(chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(CAMPAIGN.slug).toBe('great-investor-reset-2026')
  })

  it('featured article is the campaign opener', () => {
    const featured = getFeaturedArticle()
    expect(featured.isFeatured).toBe(true)
    expect(featured.campaignSlug).toBe(CAMPAIGN.slug)
    expect(featured.takeaways.length).toBeGreaterThan(0)
    expect(featured.sections.length).toBeGreaterThan(0)
  })

  it('every category is resolvable and listed in sitemap paths', () => {
    const paths = allIntelligencePaths()
    expect(paths).toContain('/investor-intelligence')
    expect(paths).toContain('/authors/brad-geisen')
    for (const category of CATEGORIES) {
      expect(getCategory(category.slug)?.id).toBe(category.id)
      expect(paths).toContain(`/investor-intelligence/${category.slug}`)
    }
    for (const article of ARTICLES) {
      expect(paths).toContain(`/investor-intelligence/${article.slug}`)
    }
  })

  it('does not fabricate market-pulse statistics', () => {
    expect(ARTICLES.every((a) => a.headline.length > 0 && a.summary.length > 0)).toBe(true)
  })
})
