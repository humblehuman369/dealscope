import { describe, expect, it } from 'vitest'

import {
  buildWorkflowDiscoveryUrl,
  isPlanView,
  parseWorkflowV1View,
  pipelineDealId,
  resolveWorkDealId,
  workflowV1RedirectTarget,
} from '@/lib/workflowRoutes'

describe('parseWorkflowV1View', () => {
  it('maps workbench and plan to Plan', () => {
    expect(parseWorkflowV1View('workbench')).toBe('plan')
    expect(parseWorkflowV1View('plan')).toBe('plan')
    expect(isPlanView('workbench')).toBe(true)
    expect(isPlanView('plan')).toBe(true)
  })

  it('maps math and sources to Math', () => {
    expect(parseWorkflowV1View('math')).toBe('math')
    expect(parseWorkflowV1View('sources')).toBe('math')
  })

  it('maps work to Work and everything else to Discovery', () => {
    expect(parseWorkflowV1View('work')).toBe('work')
    expect(parseWorkflowV1View(null)).toBe('discovery')
    expect(parseWorkflowV1View('')).toBe('discovery')
  })
})

describe('workflowV1RedirectTarget', () => {
  it('moves Strategy-era sources onto Math', () => {
    expect(
      workflowV1RedirectTarget('/discovery', new URLSearchParams('address=1 Main&view=sources')),
    ).toBe('/discovery?address=1+Main&view=math&section=sources')
  })

  it('leaves Discovery and Plan URLs in place', () => {
    expect(workflowV1RedirectTarget('/discovery', new URLSearchParams('address=1 Main'))).toBe(null)
    expect(
      workflowV1RedirectTarget('/discovery', new URLSearchParams('address=1 Main&view=workbench')),
    ).toBe(null)
  })

  it('maps Comps to Math', () => {
    expect(
      workflowV1RedirectTarget(
        '/price-intel',
        new URLSearchParams('address=1 Main&zpid=9&lat=1&lng=2'),
      ),
    ).toBe('/discovery?address=1+Main&view=math&section=comps&zpid=9&lat=1&lng=2')
  })

  it('maps Estimator to Math', () => {
    expect(
      workflowV1RedirectTarget('/rehab', new URLSearchParams('address=1 Main&sqft=1400')),
    ).toBe('/discovery?address=1+Main&view=math&section=estimator&sqft=1400')
  })

  it('maps the DealMaker product route to Plan and leaves the marketing page', () => {
    expect(workflowV1RedirectTarget('/deal-maker', new URLSearchParams())).toBe(null)
    expect(workflowV1RedirectTarget('/deal-maker', new URLSearchParams('address=1 Main'))).toBe(
      '/discovery?address=1+Main&view=workbench',
    )
    expect(workflowV1RedirectTarget('/deal-maker/1-Main-St', new URLSearchParams())).toBe(
      '/discovery?address=1+Main+St&view=workbench',
    )
  })

  it('does not move /compare', () => {
    expect(workflowV1RedirectTarget('/compare', new URLSearchParams('a=1&b=2'))).toBe(null)
  })
})

describe('buildWorkflowDiscoveryUrl', () => {
  it('builds a Plan URL', () => {
    expect(buildWorkflowDiscoveryUrl('1 Main', 'workbench')).toBe(
      '/discovery?address=1+Main&view=workbench',
    )
  })
})

describe('pipelineDealId', () => {
  it('returns dealId and ignores saved or watched property ids', () => {
    expect(
      pipelineDealId(
        new URLSearchParams('propertyId=saved-1&dealId=deal-9'),
      ),
    ).toBe('deal-9')
    expect(pipelineDealId(new URLSearchParams('propertyId=saved-1'))).toBe(null)
    expect(pipelineDealId(new URLSearchParams('address=1+Main'))).toBe(null)
    expect(pipelineDealId(new URLSearchParams('dealId=%20'))).toBe(null)
  })
})

describe('resolveWorkDealId', () => {
  it('uses the URL dealId when present', () => {
    expect(
      resolveWorkDealId(
        new URLSearchParams('dealId=deal-9&propertyId=saved-1'),
        'pipeline-from-address',
      ),
    ).toBe('deal-9')
  })

  it('falls back to the property pipeline id, not the saved or watched URL ids', () => {
    expect(
      resolveWorkDealId(
        new URLSearchParams('propertyId=saved-1&savedPropertyId=watched-2'),
        'pipeline-from-address',
      ),
    ).toBe('pipeline-from-address')
    expect(resolveWorkDealId(new URLSearchParams('address=1+Main'), null)).toBe(null)
    expect(resolveWorkDealId(new URLSearchParams('address=1+Main'), '  ')).toBe(null)
  })
})
