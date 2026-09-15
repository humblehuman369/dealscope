import { describe, expect, it } from 'vitest'

import {
  buildWorkflowDiscoveryUrl,
  isPlanView,
  parseWorkflowV1View,
  pipelineDealId,
  resolveWorkDealId,
  resolveWorkflowRedirect,
  workflowV1RedirectTarget,
  workflowV1TabHref,
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

  it('leaves Discovery, Plan, and Work URLs in place', () => {
    expect(workflowV1RedirectTarget('/discovery', new URLSearchParams('address=1 Main'))).toBe(null)
    expect(
      workflowV1RedirectTarget('/discovery', new URLSearchParams('address=1 Main&view=workbench')),
    ).toBe(null)
    expect(
      workflowV1RedirectTarget(
        '/discovery',
        new URLSearchParams(
          'address=7026 NW 21st Ave&city=Miami&state=FL&zip_code=33147&view=work&dealId=deal-1&tab=tasks',
        ),
      ),
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

describe('resolveWorkflowRedirect', () => {
  const math = new URLSearchParams('address=1 Main&view=math&zpid=9')
  const work = new URLSearchParams('address=1 Main&view=work&dealId=deal-9')
  const workEmpty = new URLSearchParams('address=1 Main&view=work')
  const plan = new URLSearchParams('address=1 Main&view=plan')
  const workbench = new URLSearchParams('address=1 Main&view=workbench')
  const comps = new URLSearchParams('address=1 Main&zpid=9')

  it('moves nobody while the flag is loading', () => {
    expect(
      resolveWorkflowRedirect({
        ready: false,
        enabled: true,
        pathname: '/price-intel',
        search: comps,
      }),
    ).toBe(null)
    expect(
      resolveWorkflowRedirect({
        ready: false,
        enabled: false,
        pathname: '/discovery',
        search: math,
      }),
    ).toBe(null)
    expect(
      resolveWorkflowRedirect({
        ready: false,
        enabled: false,
        pathname: '/discovery',
        search: work,
      }),
    ).toBe(null)
  })

  it('moves flag-on users off old Comps, Estimator, and DealMaker routes', () => {
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: true,
        pathname: '/price-intel',
        search: comps,
      }),
    ).toBe('/discovery?address=1+Main&view=math&section=comps&zpid=9')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: true,
        pathname: '/rehab',
        search: new URLSearchParams('address=1 Main&sqft=1400'),
      }),
    ).toBe('/discovery?address=1+Main&view=math&section=estimator&sqft=1400')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: true,
        pathname: '/deal-maker',
        search: new URLSearchParams('address=1 Main'),
      }),
    ).toBe('/discovery?address=1+Main&view=workbench')
  })

  it('moves flag-off view=math to /price-intel with the same params', () => {
    const mathWithParams = new URLSearchParams(
      'address=1 Main&view=math&zpid=9&lat=1&lng=2&compsView=rent',
    )
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: mathWithParams,
      }),
    ).toBe('/price-intel?address=1+Main&zpid=9&lat=1&lng=2&view=rent')
  })

  it('moves flag-off view=work to the pipeline deal or /dashboard', () => {
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: work,
      }),
    ).toBe('/deals/deal-9')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: workEmpty,
        propertyPipelineId: 'pipeline-1',
        hasCheckedPipeline: true,
      }),
    ).toBe('/deals/pipeline-1')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: workEmpty,
        propertyPipelineId: null,
        hasCheckedPipeline: true,
      }),
    ).toBe('/dashboard')
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: workEmpty,
        hasCheckedPipeline: false,
      }),
    ).toBe(null)
  })

  it('leaves flag-off users on view=plan and view=workbench', () => {
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: plan,
      }),
    ).toBe(null)
    expect(
      resolveWorkflowRedirect({
        ready: true,
        enabled: false,
        pathname: '/discovery',
        search: workbench,
      }),
    ).toBe(null)
  })
})

describe('buildWorkflowDiscoveryUrl', () => {
  it('builds a Plan URL', () => {
    expect(buildWorkflowDiscoveryUrl('1 Main', 'workbench')).toBe(
      '/discovery?address=1+Main&view=workbench',
    )
  })
})

describe('workflowV1TabHref', () => {
  it('targets Discovery, Plan, Math, and Work', () => {
    expect(workflowV1TabHref('discovery', '1 Main')).toBe('/discovery?address=1+Main')
    expect(workflowV1TabHref('plan', '1 Main')).toBe(
      '/discovery?address=1+Main&view=workbench',
    )
    expect(workflowV1TabHref('math', '1 Main')).toBe('/discovery?address=1+Main&view=math')
    expect(workflowV1TabHref('work', '1 Main')).toBe('/discovery?address=1+Main&view=work')
  })

  it('Start working this deal uses the Work tab href plus dealId and tasks', () => {
    expect(
      workflowV1TabHref('work', '7026 NW 21st Ave, Miami, FL 33147', {
        dealId: 'deal-1',
        tab: 'tasks',
      }),
    ).toBe(
      '/discovery?address=7026+NW+21st+Ave%2C+Miami%2C+FL+33147&view=work&dealId=deal-1&tab=tasks',
    )
  })

  it('sends a tab with no address to search', () => {
    expect(workflowV1TabHref('math', '')).toBe('/search')
    expect(workflowV1TabHref('discovery', '   ')).toBe('/search')
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
