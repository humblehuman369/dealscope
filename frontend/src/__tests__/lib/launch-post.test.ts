import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { LAUNCH_POST_DATE, LAUNCH_POST_SLUG } from '@/config/site'

/**
 * The launch post's frontmatter is static YAML, so it cannot import the
 * `LAUNCH_POST_DATE` constant the press page and JSON-LD use. This keeps the
 * two from drifting when Brad picks the final announcement date.
 */
describe('launch announcement post', () => {
  const file = path.join(process.cwd(), 'content', 'blog', `${LAUNCH_POST_SLUG}.md`)

  it('exists at the slug the press page links to', () => {
    expect(fs.existsSync(file)).toBe(true)
  })

  it('is dated with LAUNCH_POST_DATE', () => {
    const { data } = matter(fs.readFileSync(file, 'utf8'))
    expect(data.slug).toBe(LAUNCH_POST_SLUG)
    expect(data.date_published).toBe(LAUNCH_POST_DATE)
    expect(data.date_modified).toBe(LAUNCH_POST_DATE)
    expect(data.author).toBe('Brad Geisen')
    expect(data.status).toBe('published')
  })
})
