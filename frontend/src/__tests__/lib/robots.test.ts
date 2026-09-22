import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'

describe('robots', () => {
  const rules = () => {
    const { rules } = robots()
    return Array.isArray(rules) ? rules : [rules]
  }

  it('keeps /_next/ crawlable so Googlebot can fetch JS, CSS and fonts to render pages', () => {
    for (const rule of rules()) {
      expect(rule.disallow).not.toContain('/_next/')
    }
  })

  it('blocks /api/ and private app routes for every user agent', () => {
    for (const rule of rules()) {
      expect(rule.allow).toBe('/')
      expect(rule.disallow).toContain('/api/')
      expect(rule.disallow).toContain('/admin')
    }
  })

  it('covers the wildcard agent and the AI crawlers', () => {
    const agents = rules().map((r) => r.userAgent)
    expect(agents).toContain('*')
    expect(agents).toContain('GPTBot')
  })
})
