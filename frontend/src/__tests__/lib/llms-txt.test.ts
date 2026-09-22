import { describe, expect, it } from 'vitest'
import { buildLlmsTxt, LLMS_TXT_DESCRIPTION } from '@/lib/seo/llms-txt'

describe('llms.txt', () => {
  it('opens with the approved GEO sentence and the indexable marketing URLs', () => {
    const body = buildLlmsTxt([{ href: '/blog/how-to-calculate-dscr', label: 'How to calculate DSCR' }])
    expect(body.startsWith('# DealGapIQ\n')).toBe(true)
    expect(body).toContain(LLMS_TXT_DESCRIPTION)
    expect(body).toContain('four paths plus a Blend')
    expect(body).toContain('https://dealgapiq.com/')
    expect(body).toContain('https://dealgapiq.com/press')
    expect(body).toContain('https://dealgapiq.com/blog/feed.xml')
    expect(body).toContain('https://dealgapiq.com/methodology')
    expect(body).toContain('https://dealgapiq.com/comparisons/dealgapiq-vs-mashvisor')
    expect(body).toContain('https://dealgapiq.com/answers')
    expect(body).toContain('https://dealgapiq.com/glossary')
    expect(body).toContain('https://dealgapiq.com/blog/how-to-calculate-dscr')
    expect(body).not.toMatch(/offer structures|four ways/)
  })
})
