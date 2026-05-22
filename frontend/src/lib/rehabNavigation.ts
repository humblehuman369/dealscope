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
    has_pool: hasPool === 'true',
    stories: stories ? parseInt(stories, 10) : undefined,
  }
}
