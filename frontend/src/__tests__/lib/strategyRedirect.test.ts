/**
 * R4 cut-over: /strategy no longer exists as a route — it 301s to
 * /discovery?view=workbench, and every in-app URL builder that used to emit
 * /strategy?… must now emit the workbench view of Discovery.
 *
 * Query params on the old links (address, strategy, condition, location,
 * section, scenario) pass through the redirect because Next.js forwards
 * unmatched query params to the destination.
 */

import { describe, expect, it } from 'vitest'
import nextConfigJs from '../../../next.config'
import { ROUTES } from '@/lib/navigation'
import { buildStrategyUrlWithScenario } from '@/lib/dealStructures/loadScenario'
import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'

// The config is plain JS and assigns `redirects` conditionally (non-Capacitor
// builds only), so TS's inferred literal type omits it.
interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
}
const nextConfig = nextConfigJs as unknown as { redirects: () => Promise<RedirectRule[]> }

describe('the /strategy 301', () => {
  it('redirects to the Discovery workbench view permanently', async () => {
    const redirects = await nextConfig.redirects()
    const strategy = redirects.find((r) => r.source === '/strategy')

    expect(strategy).toBeDefined()
    expect(strategy?.destination).toBe('/discovery?view=workbench')
    expect(strategy?.permanent).toBe(true)
  })

  it('has no other rule shadowing or rewriting /strategy', async () => {
    const redirects = await nextConfig.redirects()
    const matching = redirects.filter(
      (r) => r.source === '/strategy' || r.source.startsWith('/strategy/'),
    )
    expect(matching).toHaveLength(1)
  })
})

describe('in-app URL builders', () => {
  it('ROUTES.strategy targets the Discovery workbench view', () => {
    const url = ROUTES.strategy({ address: '1014 N J St, Lake Worth Beach, FL 33460' })
    const parsed = new URL(url, 'https://dealgapiq.com')

    expect(parsed.pathname).toBe('/discovery')
    expect(parsed.searchParams.get('view')).toBe('workbench')
    expect(parsed.searchParams.get('address')).toBe('1014 N J St, Lake Worth Beach, FL 33460')
  })

  it('Three Paths scenario URLs open the workbench with the payload intact', () => {
    const structure = {
      id: 'seller-carry-1',
      family: 'capital_stack',
      familyLabel: 'Seller Carry',
      headline: 'Seller carries 20%',
      preLoadedRecord: { custom_purchase_price: 371_915 },
    } as unknown as DealStructure

    const url = buildStrategyUrlWithScenario({
      address: '1014 N J St, Lake Worth Beach, FL 33460',
      structure,
      pathIndex: 0,
      condition: '3',
      location: 'good',
    })
    const parsed = new URL(url, 'https://dealgapiq.com')

    expect(parsed.pathname).toBe('/discovery')
    expect(parsed.searchParams.get('view')).toBe('workbench')
    expect(parsed.searchParams.get('scenario')).toBeTruthy()
    expect(parsed.searchParams.get('condition')).toBe('3')
    expect(parsed.searchParams.get('location')).toBe('good')
  })

  it('no source file navigates to the deleted /strategy route', async () => {
    // Guards against regressions reintroducing links to the dead route.
    const { execFileSync } = await import('node:child_process')
    const { join } = await import('node:path')
    const srcDir = join(__dirname, '..', '..')
    let output = ''
    try {
      output = execFileSync(
        'grep',
        ['-rnE', "(href|push|replace|location\\.href)[^\\n]*['\"`]/strategy[?'\"`]", srcDir, '--include=*.ts', '--include=*.tsx', '--exclude-dir=__tests__'],
        { encoding: 'utf8' },
      )
    } catch {
      // grep exits 1 when nothing matches — the desired outcome.
    }
    expect(output.trim()).toBe('')
  })
})
