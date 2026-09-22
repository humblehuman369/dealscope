import { describe, expect, it } from 'vitest'
import { META_DESCRIPTION_MAX } from '@/lib/content-schema'
import { buildHomeJsonLd, HOME_DESCRIPTION, HOME_TITLE, HOME_URL } from '@/lib/seo/home-schema'
import { HOME_FAQ } from '@/content/home-faq'
import { toSchemaDateTime } from '@/lib/seo/dates'
import { HOME_H1, HOME_PUBLISHED_AT, HOME_UPDATED_AT } from '@/config/site'

type Node = Record<string, unknown>

function graph(): Node[] {
  return buildHomeJsonLd()['@graph'] as Node[]
}

describe('home page schema', () => {
  it('keeps the meta description under the SERP limit', () => {
    expect(HOME_DESCRIPTION.length).toBeLessThan(META_DESCRIPTION_MAX)
  })

  it('uses the same URL form as the root canonical (no trailing slash)', () => {
    expect(HOME_URL.endsWith('/')).toBe(false)
    const article = graph().find((n) => n['@type'] === 'Article')!
    expect(article.url).toBe(HOME_URL)
    expect(article.mainEntityOfPage).toBe(HOME_URL)
  })

  it('emits a WebPage whose breadcrumb resolves to the BreadcrumbList node in the same graph', () => {
    const page = graph().find((n) => n['@type'] === 'WebPage')!
    const crumbs = graph().find((n) => n['@type'] === 'BreadcrumbList')!
    expect(page.url).toBe(HOME_URL)
    expect(page.name).toBe(HOME_TITLE)
    expect(page.description).toBe(HOME_DESCRIPTION)
    expect(page.dateModified).toBe(toSchemaDateTime(HOME_UPDATED_AT))
    expect((page.breadcrumb as Node)['@id']).toBe(crumbs['@id'])
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: HOME_URL },
    ])
  })

  it('mirrors the visible H1, dates and FAQ', () => {
    const article = graph().find((n) => n['@type'] === 'Article')!
    const faq = graph().find((n) => n['@type'] === 'FAQPage')!
    expect(article.headline).toBe(HOME_H1)
    expect(article.description).toBe(HOME_DESCRIPTION)
    expect(article.datePublished).toBe(toSchemaDateTime(HOME_PUBLISHED_AT))
    expect(article.dateModified).toBe(toSchemaDateTime(HOME_UPDATED_AT))
    expect(faq['@type']).toBe('FAQPage')
    expect((faq.mainEntity as unknown[]).length).toBe(HOME_FAQ.length)
  })

  it('emits full ISO 8601 datetimes with a UTC offset, derived from the YYYY-MM-DD constants', () => {
    // Rich Results Test flags bare dates as "Invalid datetime value / missing a timezone".
    const article = graph().find((n) => n['@type'] === 'Article')!
    expect(article.datePublished).toBe('2026-01-15T09:00:00-05:00')
    expect(article.dateModified).toBe(`${HOME_UPDATED_AT}T09:00:00-04:00`)
    expect(HOME_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('emits the approved app FAQ answer verbatim in the FAQPage node', () => {
    const faq = graph().find((n) => n['@type'] === 'FAQPage')!
    const apps = (faq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).find(
      (q) => q.name === 'Is there a DealGapIQ app?',
    )!
    expect(apps.acceptedAnswer.text).toBe(
      'Yes. There are iOS, macOS and Android apps (App Store ID 6759636866; Google Play id com.dealgapiq.mobile) and a Point & Scan feature that runs a discovery when you point your phone camera at a house. Scanning also works without the app installed.',
    )
  })

  it('emits HowTo, DefinedTerm and Dataset nodes for the visible home sections', () => {
    const howTo = graph().find((n) => n['@type'] === 'HowTo')!
    const term = graph().find((n) => n['@type'] === 'DefinedTerm')!
    const dataset = graph().find((n) => n['@type'] === 'Dataset')!
    expect((howTo.step as unknown[]).length).toBe(3)
    expect(howTo.name).toContain('under 60 seconds')
    expect(term.name).toBe('deal gap')
    expect(term.description).toMatch(/difference between what a seller is asking/)
    expect(dataset.name).toBe('DealGapIQ first-party figures')
    expect(dataset.dateModified).toBe(toSchemaDateTime(HOME_UPDATED_AT))
    expect(dataset.description).toMatch(/worked example, not a market average/)
    expect(dataset.variableMeasured).toEqual(expect.arrayContaining(['Deal gap', 'List price']))
  })

  it('includes the DSCR, 1031 and house-hack questions in FAQPage', () => {
    const faq = graph().find((n) => n['@type'] === 'FAQPage')!
    const names = (faq.mainEntity as Array<{ name: string }>).map((q) => q.name)
    expect(names).toContain('Does DealGapIQ calculate DSCR?')
    expect(names).toContain('Does DealGapIQ model a 1031 exchange?')
    expect(names).toContain('What is house hacking and does DealGapIQ score it?')
    const exchange = (faq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).find(
      (q) => q.name === 'Does DealGapIQ model a 1031 exchange?',
    )!
    expect(exchange.acceptedAnswer.text.startsWith('No.')).toBe(true)
  })
})
