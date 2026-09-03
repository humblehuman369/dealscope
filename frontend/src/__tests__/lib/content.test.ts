import { beforeEach, describe, expect, it, vi } from 'vitest'

const files = new Map<string, string>()

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn(async (dir: string) => {
      const folder = dir.split('/').pop() ?? ''
      return [...files.keys()]
        .filter((k) => k.startsWith(`${folder}/`))
        .map((k) => k.slice(folder.length + 1))
    }),
    readFile: vi.fn(async (file: string) => {
      const parts = file.split('/')
      const key = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
      const raw = files.get(key)
      if (raw === undefined) throw new Error(`ENOENT ${key}`)
      return raw
    }),
  },
}))

import {
  countWords,
  getAllBlogPosts,
  getBlogPost,
  getRelatedPosts,
  parseBlogFile,
  rankRelatedPosts,
  readTimeLabel,
  sortByDateDesc,
} from '@/lib/content'
import { BlogFrontmatterError, parseBlogFrontmatter } from '@/lib/content-schema'

function post(
  slug: string,
  overrides: Record<string, unknown> = {},
  body = 'Body text that is long enough to count a few words for read time.',
): string {
  const fm: Record<string, unknown> = {
    title: `Title ${slug}`,
    slug,
    status: 'published',
    meta_title: `Meta ${slug}`,
    meta_description: `Description for ${slug}`,
    primary_keyword: slug.replace(/-/g, ' '),
    category: 'deal-analysis',
    date_published: '2026-05-10',
    author: 'Brad Geisen',
    ...overrides,
  }
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`
      return `${k}: ${JSON.stringify(v)}`
    })
  return `---\n${lines.join('\n')}\n---\n\n${body}\n`
}

beforeEach(() => {
  files.clear()
  vi.unstubAllEnvs()
  vi.stubEnv('NODE_ENV', 'production')
  delete process.env.CONTENT_INCLUDE_DRAFTS
})

describe('parseBlogFrontmatter', () => {
  it('accepts a minimal draft', () => {
    const fm = parseBlogFrontmatter('my-post.md', { title: 'X', slug: 'my-post' })
    expect(fm.status).toBe('draft')
  })

  it('rejects a published post missing required SEO fields', () => {
    expect(() =>
      parseBlogFrontmatter('my-post.md', { title: 'X', slug: 'my-post', status: 'published' }),
    ).toThrow(BlogFrontmatterError)
  })

  it('rejects over-length meta fields on published posts', () => {
    expect(() =>
      parseBlogFrontmatter('my-post.md', {
        title: 'X',
        slug: 'my-post',
        status: 'published',
        meta_title: 'a'.repeat(61),
        meta_description: 'ok',
        primary_keyword: 'k',
        category: 'financing',
        date_published: '2026-01-01',
        author: 'A',
      }),
    ).toThrow(/meta_title must be <= 60/)
  })

  it('rejects a slug that does not match the filename', () => {
    expect(() => parseBlogFrontmatter('real-name.md', { title: 'X', slug: 'other' })).toThrow(
      /must match filename/,
    )
  })

  it('rejects an unknown category', () => {
    expect(() =>
      parseBlogFrontmatter('p.md', { title: 'X', slug: 'p', category: 'random' }),
    ).toThrow(BlogFrontmatterError)
  })

  it('requires hero_alt when hero_image is set on a published post', () => {
    expect(() =>
      parseBlogFrontmatter('p.md', {
        title: 'X',
        slug: 'p',
        status: 'published',
        meta_title: 't',
        meta_description: 'd',
        primary_keyword: 'k',
        category: 'markets',
        date_published: '2026-01-01',
        author: 'A',
        hero_image: '/x.png',
      }),
    ).toThrow(/hero_alt/)
  })
})

describe('read time', () => {
  it('ignores markdown syntax when counting words', () => {
    expect(countWords('# Heading\n\n- one **two** _three_ | four')).toBe(5)
  })

  it('rounds to a minimum of one minute', () => {
    expect(readTimeLabel(10)).toBe('1 min read')
    expect(readTimeLabel(2250)).toBe('10 min read')
  })

  it('parseBlogFile attaches computed read_time and word_count', () => {
    const parsed = parseBlogFile('a.md', post('a', {}, Array(450).fill('word').join(' ')))
    expect(parsed.frontmatter.word_count).toBe(450)
    expect(parsed.frontmatter.read_time).toBe('2 min read')
  })
})

describe('getAllBlogPosts', () => {
  it('hides drafts outside development and sorts by date desc', async () => {
    files.set('blog/old.md', post('old', { date_published: '2026-01-01' }))
    files.set('blog/new.md', post('new', { date_published: '2026-06-01' }))
    files.set('blog/draft.md', post('draft', { status: 'draft' }))

    const posts = await getAllBlogPosts()
    expect(posts.map((p) => p.slug)).toEqual(['new', 'old'])
  })

  it('shows drafts in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    files.set('blog/draft.md', post('draft', { status: 'draft' }))
    const posts = await getAllBlogPosts()
    expect(posts.map((p) => p.slug)).toEqual(['draft'])
  })

  it('getBlogPost returns null for a draft in production but throws on invalid frontmatter', async () => {
    files.set('blog/draft.md', post('draft', { status: 'draft' }))
    files.set('blog/bad.md', post('bad', { meta_title: undefined }))

    expect(await getBlogPost('draft')).toBeNull()
    expect(await getBlogPost('missing')).toBeNull()
    await expect(getBlogPost('bad')).rejects.toBeInstanceOf(BlogFrontmatterError)
  })
})

describe('related posts', () => {
  const make = (slug: string, category: string, tags: string[], date: string) =>
    parseBlogFile(slug + '.md', post(slug, { category, tags, date_published: date }))

  it('ranks same category above tag overlap and breaks ties by recency', () => {
    const current = make('cur', 'financing', ['dscr', 'hard-money'], '2026-05-01')
    const sameCat = make('same-cat', 'financing', [], '2026-01-01')
    const twoTags = make('two-tags', 'strategies', ['dscr', 'hard-money'], '2026-02-01')
    const sameCatNewer = make('same-cat-new', 'financing', [], '2026-04-01')
    const unrelated = make('unrelated', 'markets', ['texas'], '2026-06-01')

    const ranked = rankRelatedPosts(current, [unrelated, sameCat, twoTags, sameCatNewer, current])
    expect(ranked.map((p) => p.slug)).toEqual(['same-cat-new', 'same-cat', 'two-tags'])
  })

  it('getRelatedPosts excludes the current post and unrelated ones', async () => {
    files.set('blog/a.md', post('a', { category: 'financing', tags: ['x'] }))
    files.set('blog/b.md', post('b', { category: 'financing' }))
    files.set('blog/c.md', post('c', { category: 'markets' }))
    const related = await getRelatedPosts('a')
    expect(related.map((p) => p.slug)).toEqual(['b'])
  })

  it('sortByDateDesc falls back to title when dates match', () => {
    const a = make('a', 'markets', [], '2026-01-01')
    const b = make('b', 'markets', [], '2026-01-01')
    expect(sortByDateDesc([b, a]).map((p) => p.slug)).toEqual(['a', 'b'])
  })
})