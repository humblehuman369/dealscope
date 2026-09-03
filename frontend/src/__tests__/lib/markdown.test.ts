import { describe, expect, it } from 'vitest'
import { extractHeadings } from '@/lib/markdown/headings'
import { remarkDirectiveComponents } from '@/lib/markdown/remark-directive-components'
import { withBlogUtm } from '@/lib/blog-utm'
import { normalizeInternalLink } from '@/lib/blog-links'
import type { Root } from 'mdast'

describe('extractHeadings', () => {
  it('returns H2/H3 with github-style ids and skips H1, H4, and fenced code', () => {
    const md = [
      '# Title',
      '## Path 1 — Verify *or* lift the rent',
      '### The `math`',
      '#### Too deep',
      '```',
      '## not a heading',
      '```',
      '## Path 1 — Verify or lift the rent',
    ].join('\n')
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: 'Path 1 — Verify or lift the rent', id: 'path-1--verify-or-lift-the-rent' },
      { depth: 3, text: 'The math', id: 'the-math' },
      { depth: 2, text: 'Path 1 — Verify or lift the rent', id: 'path-1--verify-or-lift-the-rent-1' },
    ])
  })

  it('unwraps link text in headings', () => {
    expect(extractHeadings('## See [the guide](/x)')[0]).toMatchObject({ text: 'See the guide', id: 'see-the-guide' })
  })
})

describe('remarkDirectiveComponents', () => {
  it('maps known directives to div with data attributes and ignores unknown ones', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'leafDirective',
          name: 'cta',
          attributes: { href: '/discovery' },
          children: [{ type: 'text', value: 'Go' }],
        },
        {
          type: 'containerDirective',
          name: 'callout',
          attributes: { type: 'warning', title: 'Careful' },
          children: [],
        },
        { type: 'leafDirective', name: 'bogus', attributes: {}, children: [] },
      ],
    } as unknown as Root

    remarkDirectiveComponents()(tree)
    const [cta, callout, bogus] = tree.children as Array<{ data?: Record<string, unknown> }>
    expect(cta.data).toEqual({
      hName: 'div',
      hProperties: { dataDirective: 'cta', dataHref: '/discovery', dataType: undefined, dataTitle: undefined },
    })
    expect(callout.data?.hProperties).toMatchObject({ dataDirective: 'callout', dataType: 'warning', dataTitle: 'Careful' })
    expect(bogus.data).toBeUndefined()
  })
})

describe('withBlogUtm', () => {
  it('appends the blog UTM triple and preserves existing params', () => {
    expect(withBlogUtm('/discovery', 'post', 'my-post')).toBe(
      '/discovery?utm_source=blog&utm_medium=post&utm_campaign=my-post',
    )
    expect(withBlogUtm('/discovery?view=workbench', 'inline', 'p')).toBe(
      '/discovery?view=workbench&utm_source=blog&utm_medium=inline&utm_campaign=p',
    )
  })

  it('leaves external URLs alone', () => {
    expect(withBlogUtm('https://example.com', 'post', 'p')).toBe('https://example.com')
  })
})

describe('normalizeInternalLink', () => {
  it('drops trailing annotations', () => {
    expect(normalizeInternalLink('/glossary/subject-to-financing (G1)')).toBe('/glossary/subject-to-financing')
  })
})
