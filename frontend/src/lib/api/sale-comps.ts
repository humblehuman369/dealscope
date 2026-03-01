/**
 * Sale comps — fetch from backend and transform to SaleComp[].
 */

import { axessoGet, type AxessoResponse } from './axesso-client'
import { haversineDistance, calculateSimilarity } from './comps-transform-utils'
import type { CompsIdentifier, SaleComp, SubjectProperty } from './types'

const SIMILAR_SOLD_ENDPOINT = '/api/v1/similar-sold'

interface BackendCompsResponse {
  success?: boolean
  results?: unknown[]
  data?: unknown[]
  error?: string
}

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim() || ''
}

function extractCompsArray(raw: BackendCompsResponse): unknown[] {
  const list =
    raw.results ??
    (raw as unknown as { similarProperties?: unknown[] }).similarProperties ??
    (raw as unknown as { comparableSales?: unknown[] }).comparableSales ??
    (raw as unknown as { properties?: unknown[] }).properties ??
    (raw as unknown as { comps?: unknown[] }).comps ??
    (raw as unknown as { data?: unknown[] }).data ??
    []
  return Array.isArray(list) ? list : []
}

/**
 * Transform backend raw comp items into SaleComp[]. Handles multiple possible field names.
 */
export function transformSaleComps(
  raw: BackendCompsResponse,
  subject?: SubjectProperty
): SaleComp[] {
  const list = extractCompsArray(raw)
  const subjectLat = subject?.latitude ?? 0
  const subjectLon = subject?.longitude ?? 0
  const subjectSqft = subject?.sqft ?? 1
  const subjectBeds = subject?.beds ?? 0
  const subjectBaths = subject?.baths ?? 0
  const subjectYear = subject?.yearBuilt ?? 0

  const comps: SaleComp[] = list.map((item: unknown, index: number) => {
    const comp = (item && typeof item === 'object' && 'property' in item
      ? (item as { property: unknown }).property
      : item) as Record<string, unknown>
    const addr = (comp?.address as Record<string, unknown>) ?? {}
    const address = toStr(addr.streetAddress ?? addr.street ?? comp?.address ?? comp?.fullAddress ?? comp?.streetAddress ?? '')
    const city = toStr(addr.city ?? comp?.city ?? '')
    const state = toStr(addr.state ?? comp?.state ?? '')
    const zip = toStr(addr.zipcode ?? addr.zip ?? comp?.zip ?? comp?.zipcode ?? '')
    const salePrice = toNum(comp?.lastSoldPrice ?? comp?.soldPrice ?? comp?.salePrice ?? comp?.price ?? 0)
    const sqft = toNum(comp?.livingAreaValue ?? comp?.livingArea ?? comp?.sqft ?? comp?.squareFeet ?? comp?.finishedSqFt ?? 0)
    const saleDateRaw = comp?.dateSold ?? comp?.saleDate ?? comp?.soldDate ?? comp?.lastSoldDate ?? ''
    const saleDate = saleDateRaw ? new Date(saleDateRaw as string).toISOString().split('T')[0] : ''
    const daysAgo = saleDate
      ? Math.floor((Date.now() - new Date(saleDate).getTime()) / 86400000)
      : 999
    const lat = toNum(comp?.latitude ?? comp?.lat ?? 0)
    const lon = toNum(comp?.longitude ?? comp?.lng ?? comp?.lon ?? 0)
    const distanceMiles =
      subjectLat && subjectLon && lat && lon
        ? haversineDistance(subjectLat, subjectLon, lat, lon)
        : 0
    const beds = Math.floor(toNum(comp?.bedrooms ?? comp?.beds ?? comp?.bd ?? 0))
    const baths = toNum(comp?.bathrooms ?? comp?.baths ?? comp?.ba ?? 0)
    const yearBuilt = Math.floor(toNum(comp?.yearBuilt ?? comp?.yearConstructed ?? 0))
    const similarityScore = subject
      ? calculateSimilarity(subject, {
          beds,
          baths,
          sqft: sqft || 1,
          yearBuilt,
          distanceMiles,
        })
      : 0
    const pricePerSqft = sqft > 0 ? Math.round(salePrice / sqft) : 0
    let lotSize: number | undefined
    const lotRaw = toNum(comp?.lotAreaValue ?? comp?.lotSize ?? 0)
    if (comp?.lotAreaUnits === 'Square Feet' || comp?.lotAreaUnits === 'sqft') {
      lotSize = Math.round((lotRaw / 43560) * 100) / 100
    } else if (lotRaw > 0) {
      lotSize = Math.round(lotRaw * 100) / 100
    }
    const zpid = toStr(comp?.zpid ?? comp?.id ?? comp?.propertyId ?? '').trim() || `sale-${index + 1}`
    let imageUrl: string | null = null
    const photos = comp?.compsCarouselPropertyPhotos as unknown[] | undefined
    if (Array.isArray(photos) && photos.length > 0) {
      const first = photos[0] as Record<string, unknown>
      const mixed = first?.mixedSources as Record<string, unknown[]> | undefined
      const jpeg = mixed?.jpeg
      if (Array.isArray(jpeg) && jpeg.length > 0) {
        const img = jpeg[0] as Record<string, string>
        if (img?.url) imageUrl = img.url
      }
    }
    if (!imageUrl && comp?.imgSrc) imageUrl = toStr(comp.imgSrc)
    if (!imageUrl && comp?.image) imageUrl = toStr(comp.image)
    if (!imageUrl && comp?.photo) imageUrl = toStr(comp.photo)
    if (!imageUrl && comp?.thumbnailUrl) imageUrl = toStr(comp.thumbnailUrl)

    return {
      id: zpid,
      zpid,
      address: address || `${city} ${state} ${zip}`.trim() || 'Unknown',
      city,
      state,
      zip,
      salePrice,
      pricePerSqft,
      beds,
      baths,
      sqft,
      yearBuilt,
      saleDate,
      daysAgo,
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      similarityScore,
      propertyType: toStr(comp?.propertyType ?? comp?.homeType ?? ''),
      latitude: lat,
      longitude: lon,
      imageUrl,
      zillowUrl: comp?.url ? toStr(comp.url) : null,
      ...(lotSize !== undefined && { lotSize }),
    }
  })

  comps.sort((a, b) => b.similarityScore - a.similarityScore)
  return comps
}

/**
 * Fetch sale comps from backend and return transformed SaleComp[].
 */
export async function fetchSaleComps(
  identifier: CompsIdentifier,
  subject?: SubjectProperty,
  options?: { signal?: AbortSignal }
): Promise<AxessoResponse<SaleComp[]>> {
  const params: Record<string, string> = {}
  if (identifier.zpid) params.zpid = identifier.zpid
  if (identifier.address) params.address = identifier.address
  if (identifier.url) params.url = identifier.url
  if (identifier.limit != null) params.limit = String(identifier.limit)
  if (identifier.offset != null) params.offset = String(identifier.offset)
  if (identifier.exclude_zpids) params.exclude_zpids = identifier.exclude_zpids
  if (!params.zpid && !params.address && !params.url) {
    return {
      ok: false,
      data: null,
      status: 0,
      error: 'No property address or ID available',
      attempts: 0,
      durationMs: 0,
    }
  }
  if (params.limit === undefined) params.limit = '10'
  if (params.offset === undefined) params.offset = '0'

  const res = await axessoGet<BackendCompsResponse>(
    SIMILAR_SOLD_ENDPOINT,
    params,
    undefined,
    options?.signal
  )

  if (!res.ok || !res.data) {
    return {
      ...res,
      data: null,
    }
  }

  const body = res.data as BackendCompsResponse
  if (body.success === false) {
    return {
      ok: false,
      data: null,
      status: res.status,
      error: body.error ?? 'Failed to load comparable sales',
      attempts: res.attempts,
      durationMs: res.durationMs,
    }
  }

  const transformed = transformSaleComps(res.data, subject)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[comps_api] similar-sold transformed', { count: transformed.length, rawResultsLength: Array.isArray(body.results) ? body.results.length : 0 })
  }
  return {
    ...res,
    data: transformed,
  }
}
