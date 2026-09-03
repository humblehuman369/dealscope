/**
 * The /answers pages are generated from this config. A broken entry ships a
 * broken indexable page, so the invariants the template relies on are checked
 * here: unique slugs, the fixed three-step strip, enough FAQ for schema, and
 * every internal link resolving to a real page or post.
 */

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROBLEM_PAGES, getProblemPage } from '@/lib/seo/problem-pages'

const blogSlugs = new Set(
  readdirSync(resolve(__dirname, '../../../content/blog'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, '')),
)

describe('PROBLEM_PAGES', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = PROBLEM_PAGES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives every page three steps and at least three FAQ items', () => {
    for (const p of PROBLEM_PAGES) {
      expect(p.steps, p.slug).toHaveLength(3)
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps titles and descriptions within SERP limits', () => {
    for (const p of PROBLEM_PAGES) {
      expect(p.metaTitle.length, `${p.slug} title`).toBeLessThanOrEqual(75)
      expect(p.metaDescription.length, `${p.slug} description`).toBeLessThanOrEqual(170)
    }
  })

  it('links only to pages and posts that exist', () => {
    for (const p of PROBLEM_PAGES) {
      for (const rel of p.relatedSlugs) {
        expect(rel, `${p.slug} → ${rel}`).not.toBe(p.slug)
        expect(getProblemPage(rel), `${p.slug} → ${rel}`).not.toBeNull()
      }
      for (const blog of p.blogSlugs) {
        expect(blogSlugs.has(blog), `${p.slug} → blog/${blog}`).toBe(true)
      }
    }
  })

  it('returns null for an unknown slug', () => {
    expect(getProblemPage('nope')).toBeNull()
  })
})
