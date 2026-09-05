/**
 * The /for pages are generated from this config and each one is an ad
 * destination, so a broken entry burns paid clicks. The invariants the
 * template and the marketing plan rely on are checked here: unique slugs, a
 * headline count that matches the list it introduces, persona reasons in the
 * two-to-four band, every base reason id resolving, enough FAQ for schema,
 * links resolving to real pages, and the indexing rule.
 */

import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BASE_REASONS,
  PERSONA_PAGES,
  getBaseReason,
  getPersonaPage,
  headlineCount,
  resolveReasons,
} from '@/lib/seo/persona-pages'
import { getProblemPage } from '@/lib/seo/problem-pages'

const blogSlugs = new Set(
  readdirSync(resolve(__dirname, '../../../content/blog'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, '')),
)

describe('BASE_REASONS', () => {
  it('has unique ids', () => {
    const ids = BASE_REASONS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('PERSONA_PAGES', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = PERSONA_PAGES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('opens every headline with the number of reasons it lists', () => {
    for (const p of PERSONA_PAGES) {
      const count = headlineCount(p.headline)
      expect(count, `${p.slug} headline has no leading count`).not.toBeNull()
      expect(count, `${p.slug} headline count`).toBe(resolveReasons(p).length)
    }
  })

  it('gives every page two to four persona reasons and only known base reasons', () => {
    for (const p of PERSONA_PAGES) {
      expect(p.personaReasons.length, `${p.slug} persona reasons`).toBeGreaterThanOrEqual(2)
      expect(p.personaReasons.length, `${p.slug} persona reasons`).toBeLessThanOrEqual(4)
      for (const id of p.reasonIds) {
        expect(getBaseReason(id), `${p.slug} → base reason ${id}`).not.toBeNull()
      }
      const ids = resolveReasons(p).map((r) => r.id)
      expect(new Set(ids).size, `${p.slug} duplicate reason ids`).toBe(ids.length)
    }
  })

  it('renders persona reasons before base reasons', () => {
    for (const p of PERSONA_PAGES) {
      const rendered = resolveReasons(p)
      expect(rendered.slice(0, p.personaReasons.length)).toEqual(p.personaReasons)
    }
  })

  it('has at least three FAQ items and an offer block on every page', () => {
    for (const p of PERSONA_PAGES) {
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(3)
      expect(p.offer.heading.length, p.slug).toBeGreaterThan(0)
      expect(p.offer.body.length, p.slug).toBeGreaterThan(0)
    }
  })

  it('keeps titles and descriptions within SERP limits', () => {
    for (const p of PERSONA_PAGES) {
      expect(p.metaTitle.length, `${p.slug} title`).toBeLessThanOrEqual(75)
      expect(p.metaDescription.length, `${p.slug} description`).toBeLessThanOrEqual(170)
    }
  })

  it('links only to answers and posts that exist', () => {
    for (const p of PERSONA_PAGES) {
      expect(p.relatedAnswerSlugs.length, `${p.slug} related answers`).toBeGreaterThan(0)
      for (const rel of p.relatedAnswerSlugs) {
        expect(getProblemPage(rel), `${p.slug} → answers/${rel}`).not.toBeNull()
      }
      for (const blog of p.blogSlugs) {
        expect(blogSlugs.has(blog), `${p.slug} → blog/${blog}`).toBe(true)
      }
    }
  })

  it('only allows indexing when the persona content is substantially unique', () => {
    // Ad landers are near-duplicates of each other; a page earns the index
    // with at least four persona-specific reasons.
    for (const p of PERSONA_PAGES) {
      if (p.indexable) {
        expect(p.personaReasons.length, `${p.slug} indexable with thin persona content`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('returns null for an unknown slug', () => {
    expect(getPersonaPage('nope')).toBeNull()
  })
})

describe('headlineCount', () => {
  it('reads the leading integer and nothing else', () => {
    expect(headlineCount('9 reasons wholesalers run Discovery')).toBe(9)
    expect(headlineCount('Reasons without a number')).toBeNull()
    expect(headlineCount('12reasons')).toBeNull()
  })
})
