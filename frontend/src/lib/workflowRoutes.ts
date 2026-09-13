/**
 * Workflow v1 tab URLs and client-redirect targets.
 * Server redirects stay off this path so PostHog-off users are not moved
 * when NEXT_PUBLIC_WORKFLOW_V1 is on.
 */

export type WorkflowV1Tab = 'discovery' | 'plan' | 'math' | 'work'
export type MathSection = 'sources' | 'comps' | 'estimator'

export function parseWorkflowV1View(view: string | null | undefined): WorkflowV1Tab {
  if (view === 'workbench' || view === 'plan') return 'plan'
  if (view === 'math' || view === 'sources') return 'math'
  if (view === 'work') return 'work'
  return 'discovery'
}

export function isPlanView(view: string | null | undefined): boolean {
  return view === 'workbench' || view === 'plan'
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
