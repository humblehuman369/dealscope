import { describe, expect, it } from 'vitest'
import { siteGraph } from '@/components/seo/SiteJsonLd'
import { SITE_URL } from '@/config/site'
import { WEBSITE_ID } from '@/lib/seo/site-schema'

type Node = Record<string, unknown>

describe('site-wide schema', () => {
  it('points the WebSite SearchAction at the query param /discovery actually reads', () => {
    const website = (siteGraph['@graph'] as Node[]).find((n) => n['@type'] === 'WebSite')!
    expect(website['@id']).toBe(WEBSITE_ID)
    const action = website.potentialAction as Node
    expect(action['@type']).toBe('SearchAction')
    // DiscoveryClient reads `searchParams.get('address')`, not `q`.
    expect((action.target as Node).urlTemplate).toBe(`${SITE_URL}/discovery?address={search_term_string}`)
    expect(action['query-input']).toBe('required name=search_term_string')
  })
})
