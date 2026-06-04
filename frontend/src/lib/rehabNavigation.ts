/**
 * Centralized URL builder for the Rehab Estimator (/rehab).
 */

export interface RehabPropertySnapshot {
  square_footage?: number
  year_built?: number
  arv?: number
  current_value_avm?: number
  zip_code?: string
  bedrooms?: number
  bathrooms?: number
  has_pool?: boolean
  roof_type?: string
  stories?: number
  garage_spaces?: number
  lot_size?: number
  hoa_monthly?: number
}

export interface BuildRehabUrlOptions {
  address?: string
  savedPropertyId?: string
  budget?: number
  property?: RehabPropertySnapshot
}

export function buildRehabUrl(options: BuildRehabUrlOptions): string {
  const params = new URLSearchParams()

  if (options.address?.trim()) {
    params.set('address', options.address.trim())
  }
  if (options.savedPropertyId) {
    params.set('saved_property_id', options.savedPropertyId)
  }
  if (options.budget != null && Number.isFinite(options.budget) && options.budget > 0) {
    params.set('budget', String(Math.round(options.budget)))
  }

  const p = options.property
  if (p) {
    if (p.square_footage != null) params.set('sqft', String(p.square_footage))
    if (p.year_built != null) params.set('year_built', String(p.year_built))
    if (p.arv != null) params.set('arv', String(p.arv))
    if (p.current_value_avm != null && p.arv == null) {
      params.set('arv', String(p.current_value_avm))
    }
    if (p.zip_code) params.set('zip_code', p.zip_code)
    if (p.bedrooms != null) params.set('bedrooms', String(p.bedrooms))
    if (p.bathrooms != null) params.set('bathrooms', String(p.bathrooms))
    if (p.has_pool) params.set('has_pool', 'true')
    if (p.stories != null) params.set('stories', String(p.stories))
    if (p.garage_spaces != null) params.set('garage_spaces', String(p.garage_spaces))
    if (p.lot_size != null) params.set('lot_size', String(p.lot_size))
    if (p.hoa_monthly != null) params.set('hoa_monthly', String(p.hoa_monthly))
  }

  const qs = params.toString()
  return qs ? `/rehab?${qs}` : '/rehab'
}

/** Map a `/api/v1/properties/search` response into estimator inputs. */
export function rehabSnapshotFromPropertyResponse(
  data: Record<string, unknown>,
): RehabPropertySnapshot {
  const details = data.details as Record<string, unknown> | undefined
  const address = data.address as Record<string, unknown> | undefined
  const valuations = data.valuations as Record<string, unknown> | undefined
  const market = data.market as Record<string, unknown> | undefined
  const features = details?.features
  const hasPoolFromFeatures =
    Array.isArray(features) && features.some((f) => String(f).toLowerCase() === 'pool')

  return {
    square_footage:
      typeof details?.square_footage === 'number' ? details.square_footage : undefined,
    year_built: typeof details?.year_built === 'number' ? details.year_built : undefined,
    arv:
      typeof valuations?.current_value_avm === 'number'
        ? valuations.current_value_avm
        : undefined,
    current_value_avm:
      typeof valuations?.current_value_avm === 'number'
        ? valuations.current_value_avm
        : undefined,
    zip_code: typeof address?.zip_code === 'string' ? address.zip_code : undefined,
    bedrooms: typeof details?.bedrooms === 'number' ? details.bedrooms : undefined,
    bathrooms: typeof details?.bathrooms === 'number' ? details.bathrooms : undefined,
    has_pool: details?.has_pool === true || hasPoolFromFeatures,
    roof_type: typeof details?.roof_type === 'string' ? details.roof_type : undefined,
    stories: typeof details?.stories === 'number' ? details.stories : undefined,
    garage_spaces:
      typeof details?.garage_spaces === 'number' ? details.garage_spaces : undefined,
    lot_size: typeof details?.lot_size === 'number' ? details.lot_size : undefined,
    hoa_monthly:
      typeof market?.hoa_fees_monthly === 'number' ? market.hoa_fees_monthly : undefined,
  }
}

/** Prefer explicit URL overrides; fill gaps from API / saved snapshot. */
export function mergeRehabPropertySnapshots(
  primary?: RehabPropertySnapshot,
  fallback?: RehabPropertySnapshot,
): RehabPropertySnapshot | undefined {
  if (!primary && !fallback) return undefined
  return {
    square_footage: primary?.square_footage ?? fallback?.square_footage,
    year_built: primary?.year_built ?? fallback?.year_built,
    arv: primary?.arv ?? fallback?.arv,
    current_value_avm: primary?.current_value_avm ?? fallback?.current_value_avm,
    zip_code: primary?.zip_code ?? fallback?.zip_code,
    bedrooms: primary?.bedrooms ?? fallback?.bedrooms,
    bathrooms: primary?.bathrooms ?? fallback?.bathrooms,
    has_pool: primary?.has_pool ?? fallback?.has_pool,
    roof_type: primary?.roof_type ?? fallback?.roof_type,
    stories: primary?.stories ?? fallback?.stories,
    garage_spaces: primary?.garage_spaces ?? fallback?.garage_spaces,
    lot_size: primary?.lot_size ?? fallback?.lot_size,
    hoa_monthly: primary?.hoa_monthly ?? fallback?.hoa_monthly,
  }
}

export function rehabPropertySnapshotFromSearchParams(
  searchParams: URLSearchParams,
): RehabPropertySnapshot | undefined {
  const sqft = searchParams.get('sqft')
  const yearBuilt = searchParams.get('year_built')
  const arv = searchParams.get('arv')
  const zipCode = searchParams.get('zip_code')
  const bedrooms = searchParams.get('bedrooms')
  const bathrooms = searchParams.get('bathrooms')
  const hasPool = searchParams.get('has_pool')
  const stories = searchParams.get('stories')

  if (!sqft && !yearBuilt && !arv) return undefined

  return {
    square_footage: sqft ? parseInt(sqft, 10) : undefined,
    year_built: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
    arv: arv ? parseFloat(arv) : undefined,
    zip_code: zipCode || undefined,
    bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
    bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
    ...(hasPool === 'true' ? { has_pool: true } : {}),
    stories: stories ? parseInt(stories, 10) : undefined,
  }
}
