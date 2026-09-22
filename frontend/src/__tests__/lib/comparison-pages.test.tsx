import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { COMPARISON_LINKS, ComparisonPage, monthYearLabel } from '@/components/comparisons/ComparisonPage'
import { META_DESCRIPTION_MAX } from '@/lib/content-schema'
import { COMPARISON_PAGES, PRICES_CHECKED } from '@/lib/seo/comparison-pages'
import { buildComparisonJsonLd } from '@/lib/seo/comparison-schema'

type Node = Record<string, unknown>

const PAGES = Object.values(COMPARISON_PAGES)
// Retired offer-path wording (SOT: only "four paths plus a Blend"). Our Pro price
// is asserted separately because a competitor's own price may legitimately be $39.99.
const BANNED_PHRASES = /offer structures|four ways|pre-built paths|offer paths|fourth blends|4 ways/i
const OUR_PRICE_ROW = 'Starting price'

describe('comparison pages (GEO plan Phase 8)', () => {
  it('covers DealCheck, PropStream and DealMachine and links every page from the nav', () => {
    const slugs = PAGES.map((p) => p.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([
        'dealgapiq-vs-dealcheck',
        'dealgapiq-vs-propstream',
        'dealgapiq-vs-dealmachine',
      ]),
    )
    expect(COMPARISON_LINKS.map((l) => l.href).sort()).toEqual(
      slugs.map((s) => `/comparisons/${s}`).sort(),
    )
  })

  it.each(PAGES)('$slug keeps metadata within limits and uses approved wording', (page) => {
    const description = page.metadata.description as string
    expect(description.length).toBeLessThan(META_DESCRIPTION_MAX)
    expect(page.metadata.alternates?.canonical).toBe(`/comparisons/${page.slug}`)
    expect(page.sources.length).toBeGreaterThan(0)
    for (const source of page.sources) expect(source.accessed).toBe(PRICES_CHECKED)
    expect(JSON.stringify(page)).not.toMatch(BANNED_PHRASES)
    const ourPrice = page.table.find((row) => row.label === OUR_PRICE_ROW)!.dealgapiq
    expect(ourPrice).toContain('$34.99')
    expect(ourPrice).not.toContain('$39.99')
  })

  it.each(PAGES)('$slug renders one H1, question H2s each followed by a paragraph, and the dated footnote', (page) => {
    const html = renderToStaticMarkup(<ComparisonPage config={page} />)
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html).toContain(`<h1 class="mb-6 text-3xl font-bold text-[var(--text-heading)] md:text-4xl">${page.headline}</h1>`)
    for (const section of page.sections) {
      expect(section.heading.endsWith('?')).toBe(true)
      const at = html.indexOf(section.heading)
      expect(at).toBeGreaterThan(-1)
      expect(html.slice(at, at + 400)).toMatch(/<\/h2><p[\s>]/)
    }
    expect(html).toContain(
      `Third-party prices from public review sites, ${monthYearLabel(page.dateModified)}; check each vendor.`,
    )
    // FAQ answers are in the HTML, not behind an accordion.
    for (const item of page.faq) expect(html).toContain(item.question)
  })

  it.each(PAGES)('$slug emits Article + FAQPage schema with author, publisher and both dates', (page) => {
    const graph = buildComparisonJsonLd(page)['@graph'] as Node[]
    const article = graph.find((n) => n['@type'] === 'Article')!
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!
    expect(article.headline).toBe(page.headline)
    expect(article.url).toBe(`https://dealgapiq.com/comparisons/${page.slug}`)
    expect(article.datePublished).toMatch(new RegExp(`^${page.datePublished}T`))
    expect(article.dateModified).toMatch(new RegExp(`^${page.dateModified}T`))
    expect((article.author as Node).name).toBe('Brad Geisen')
    expect((article.publisher as Node).name).toBe('DealGapIQ')
    expect((faq.mainEntity as unknown[]).length).toBe(page.faq.length)
  })

  it('formats the footnote month from the price-check date', () => {
    expect(monthYearLabel('2026-09-22')).toBe('September 2026')
  })
})
