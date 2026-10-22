import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

function request(path: string) {
  return new NextRequest(`https://dealgapiq.com${path}`, {
    headers: { host: 'dealgapiq.com', 'x-forwarded-proto': 'https' },
  })
}

const rewriteTarget = (res: Response) => res.headers.get('x-middleware-rewrite')

describe('proxy maintenance mode', () => {
  afterEach(() => vi.unstubAllEnvs())

  describe('when MAINTENANCE_MODE=true', () => {
    it('serves the coming-soon page at / and keeps it indexable', () => {
      vi.stubEnv('MAINTENANCE_MODE', 'true')
      const res = proxy(request('/'))
      expect(rewriteTarget(res)).toBe('https://dealgapiq.com/coming-soon')
      expect(res.headers.get('X-Robots-Tag')).toBeNull()
    })

    it.each(['/discovery', '/dashboard', '/markets/tx', '/pricing'])(
      'rewrites %s to coming-soon with noindex',
      (path) => {
        vi.stubEnv('MAINTENANCE_MODE', 'true')
        const res = proxy(request(path))
        expect(rewriteTarget(res)).toBe('https://dealgapiq.com/coming-soon')
        expect(res.headers.get('X-Robots-Tag')).toBe('noindex, follow')
      },
    )

    it.each(['/privacy', '/terms', '/robots.txt', '/.well-known/apple-app-site-association'])(
      'passes %s through untouched',
      (path) => {
        vi.stubEnv('MAINTENANCE_MODE', 'true')
        const res = proxy(request(path))
        expect(rewriteTarget(res)).toBeNull()
        expect(res.headers.get('location')).toBeNull()
      },
    )
  })

  describe('when maintenance mode is off', () => {
    it('serves real pages and sends /coming-soon back home', () => {
      expect(rewriteTarget(proxy(request('/discovery')))).toBeNull()
      const res = proxy(request('/coming-soon'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('https://dealgapiq.com/')
    })
  })
})
