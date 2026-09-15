/**
 * Workflow v1 tab URLs and client-redirect targets.
 * Server redirects stay off this path so PostHog-off users are not moved
 * when NEXT_PUBLIC_WORKFLOW_V1 is on.
 */

export type WorkflowV1Tab = 'discovery' | 'plan' | 'math' | 'work'
export type MathSection = 'sources' | 'comps' | 'estimator'

/**
 * Work shows the deal page only when this property has a pipeline deal.
 * Saved / watched ids (`propertyId`, `savedPropertyId`) are not a deal id.
 */
export function pipelineDealId(
  search: Pick<URLSearchParams, 'get'>,
): string | null {
  const id = search.get('dealId')?.trim()
  return id || null
}

/**
 * URL `dealId` wins. Otherwise use the pipeline id looked up for this
 * property (saved/check `saved_property_id`). Never the saved flag, and
 * never `propertyId` / `savedPropertyId` from the URL.
 */
export function resolveWorkDealId(
  search: Pick<URLSearchParams, 'get'>,
  propertyPipelineId: string | null | undefined,
): string | null {
  return pipelineDealId(search) ?? (propertyPipelineId?.trim() || null)
}

export function parseWorkflowV1View(view: string | null | undefined): WorkflowV1Tab {
  if (view === 'workbench' || view === 'plan') return 'plan'
  if (view === 'math' || view === 'sources') return 'math'
  if (view === 'work') return 'work'
  return 'discovery'
}

export function isPlanView(view: string | null | undefined): boolean {
  return view === 'workbench' || view === 'plan'
}

/**
 * V1 tab targets. Discovery is the bare address URL. Plan keeps the
 * workbench query the Plan tab and stepper already use.
 */
export function workflowV1TabHref(
  tab: WorkflowV1Tab,
  address: string,
  extra?: Record<string, string | undefined>,
): string {
  const trimmed = address.trim()
  if (!trimmed) return '/search'
  switch (tab) {
    case 'discovery':
      return buildWorkflowDiscoveryUrl(trimmed, undefined, extra)
    case 'plan':
      return buildWorkflowDiscoveryUrl(trimmed, 'workbench', extra)
    case 'math':
      return buildWorkflowDiscoveryUrl(trimmed, 'math', extra)
    case 'work':
      return buildWorkflowDiscoveryUrl(trimmed, 'work', extra)
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}

export function buildWorkflowDiscoveryUrl(
  address: string,
  view?: 'workbench' | 'plan' | 'math' | 'work',
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams()
  if (address) params.set('address', address)
  if (view) params.set('view', view)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }
  const qs = params.toString()
  return qs ? `/discovery?${qs}` : '/discovery'
}

/**
 * Where an old analysis URL should land when workflow v1 is on.
 * Bare `/deal-maker` (no address) is the marketing/SEO page — do not move it.
 */
export function workflowV1RedirectTarget(
  pathname: string,
  search: URLSearchParams,
): string | null {
  const address = search.get('address') || ''

  if (pathname === '/discovery' || pathname.startsWith('/discovery/')) {
    if (search.get('view') === 'sources') {
      const next = new URLSearchParams(search)
      next.set('view', 'math')
      if (!next.get('section')) next.set('section', 'sources')
      return `/discovery?${next.toString()}`
    }
    return null
  }

  if (pathname.startsWith('/price-intel') || pathname.startsWith('/rental-comps')) {
    const compsView = search.get('view')
    return buildWorkflowDiscoveryUrl(address, 'math', {
      section: 'comps',
      zpid: search.get('zpid') || undefined,
      lat: search.get('lat') || undefined,
      lng: search.get('lng') || undefined,
      compsView: compsView === 'rent' || compsView === 'sale' ? compsView : undefined,
    })
  }

  if (pathname.startsWith('/rehab')) {
    const extra: Record<string, string | undefined> = { section: 'estimator' }
    for (const key of [
      'saved_property_id',
      'budget',
      'sqft',
      'year_built',
      'zip_code',
      'bedrooms',
      'bathrooms',
      'arv',
      'has_pool',
      'stories',
    ]) {
      extra[key] = search.get(key) || undefined
    }
    return buildWorkflowDiscoveryUrl(address, 'math', extra)
  }

  if (pathname === '/deal-maker' || pathname === '/deal-maker/') {
    if (!address.trim()) return null
    return buildWorkflowDiscoveryUrl(address, 'workbench')
  }

  if (pathname.startsWith('/deal-maker/')) {
    const slug = pathname.slice('/deal-maker/'.length).split('/')[0] || ''
    let fromPath = ''
    try {
      fromPath = decodeURIComponent(slug.replace(/-/g, ' '))
    } catch {
      fromPath = slug.replace(/-/g, ' ')
    }
    const resolved = address.trim() || fromPath
    if (!resolved) return null
    return buildWorkflowDiscoveryUrl(resolved, 'workbench')
  }

  return null
}

/**
 * Reverse of the P1-1 table. Flag-off users who open a V1 tab URL land on
 * the old equivalent. /price-intel is the old Comps tab.
 */
export function workflowLegacyRedirectTarget(
  pathname: string,
  search: URLSearchParams,
  propertyPipelineId?: string | null,
  hasCheckedPipeline = true,
): string | null {
  if (pathname !== '/discovery' && !pathname.startsWith('/discovery/')) return null
  const view = search.get('view')
  if (view === 'math') {
    const next = new URLSearchParams()
    const address = search.get('address')
    if (address) next.set('address', address)
    const zpid = search.get('zpid')
    if (zpid) next.set('zpid', zpid)
    const lat = search.get('lat')
    if (lat) next.set('lat', lat)
    const lng = search.get('lng')
    if (lng) next.set('lng', lng)
    const compsView = search.get('compsView')
    if (compsView === 'rent' || compsView === 'sale') next.set('view', compsView)
    const qs = next.toString()
    return qs ? `/price-intel?${qs}` : '/price-intel'
  }
  if (view === 'work') {
    const urlDeal = pipelineDealId(search)
    if (urlDeal) return `/deals/${urlDeal}`
    if (!hasCheckedPipeline) return null
    const dealId = propertyPipelineId?.trim()
    return dealId ? `/deals/${dealId}` : '/dashboard'
  }
  return null
}

/** Nobody moves while the flag is loading. */
export function resolveWorkflowRedirect(input: {
  ready: boolean
  enabled: boolean
  pathname: string
  search: URLSearchParams
  propertyPipelineId?: string | null
  hasCheckedPipeline?: boolean
}): string | null {
  if (!input.ready || !input.pathname) return null
  if (input.enabled) return workflowV1RedirectTarget(input.pathname, input.search)
  return workflowLegacyRedirectTarget(
    input.pathname,
    input.search,
    input.propertyPipelineId,
    input.hasCheckedPipeline ?? true,
  )
}
