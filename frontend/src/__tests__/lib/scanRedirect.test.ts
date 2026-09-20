import { describe, expect, it } from 'vitest'
import nextConfigJs from '../../../next.config'

interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
  has?: { type: string; key: string; value: string }[]
}

const nextConfig = nextConfigJs as unknown as { redirects: () => Promise<RedirectRule[]> }

describe('the /?scan=true redirect', () => {
  it('sends old scan links to /scan without dropping other query params', async () => {
    const redirects = await nextConfig.redirects()
    const scan = redirects.find(
      (rule) =>
        rule.source === '/' &&
        rule.has?.some((condition) => condition.key === 'scan' && condition.value === 'true'),
    )

    expect(scan).toBeDefined()
    expect(scan?.destination).toBe('/scan')
    expect(scan?.permanent).toBe(false)
  })
})
