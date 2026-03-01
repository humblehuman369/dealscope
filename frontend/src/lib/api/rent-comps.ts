/**
 * Rent comps — fetch from backend and transform to RentComp[].
 */

import { axessoGet, type AxessoResponse } from './axesso-client'
import { haversineDistance, calculateSimilarity } from './comps-transform-utils'
import type { CompsIdentifier, RentComp, SubjectProperty } from './types'

const SIMILAR_RENT_ENDPOINT = '/api/v1/similar-rent'

interface BackendCompsResponse {
  success?: boolean
  results?: unknown[]
  data?: unknown[]
  similarProperties?: unknown[]
  properties?: unknown[]
  rentals?: unknown[]
  rentalComps?: unknown[]
  similarRentals?: unknown[]
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

function extractRentCompsArray(raw: BackendCompsResponse): unknown[] {
  const list =
    raw.rentalComps ??
    raw.similarRentals ??
    raw.similarProperties ??
    raw.rentals ??
    raw.properties ??
    raw.results ??
    (raw as unknown as { data?: unknown[] }).data ??
    []
  return Array.isArray(list) ? list : []
}

/**
 * Transform backend raw rent comp items into RentComp[].
 */
export function transformRentComps(
  raw: BackendCompsResponse,
  subject?: SubjectProperty
): RentComp[] {
  const list = extractRentCompsArray(raw)
  const subjectLat = subject?.latitude ?? 0
  const subjectLon = subject?.longitude ?? 0

  const comps: RentComp[] = list.map((item: unknown, index: number) => {
    const comp = (item && typeof item === 'object' && 'property' in item
      ? (item as { property: unknown }).property
      : item) as Record<string, unknown>
    const addr = (comp?.address as Record<string, unknown>) ?? {}
    const address = toStr(addr.streetAddress ?? addr.street ?? comp?.address ?? comp?.fullAddress ?? comp?.streetAddress ?? '')
    const city = toStr(addr.city ?? comp?.city ?? '')
    const state = toStr(addr.state ?? comp?.state ?? '')
    const zip = toStr(addr.zipcode ?? addr.zip ?? comp?.zip ?? comp?.zipcode ?? '')
    const monthlyRent = toNum(comp?.price ?? comp?.rent ?? comp?.monthlyRent ?? comp?.listingPrice ?? 0)
    const sqft = toNum(comp?.livingAreaValue ?? comp?.livingArea ?? comp?.sqft ?? comp?.squareFeet ?? comp?.finishedSqFt ?? 0)
    const listingDateRaw = comp?.datePosted ?? comp?.listingDate ?? comp?.listedDate ?? comp?.dateSold ?? ''
    const listingDate = listingDateRaw ? new Date(listingDateRaw as string).toISOString().split('T')[0] : ''
    const daysAgo = listingDate
      ? Math.floor((Date.now() - new Date(listingDate).getTime()) / 86400000)
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
    const rentPerSqft = sqft > 0 ? Math.round((monthlyRent / sqft) * 100) / 100 : 0
    const zpid = toStr(comp?.zpid ?? comp?.id ?? comp?.propertyId ?? '').trim() || `rent-${index + 1}`
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
    if (!imageUrl && comp?.thumbnailUrl) imageUrl = toStr(comp.thumbnailUrl)

    return {
      id: zpid,
      zpid,
      address: address || `${city} ${state} ${zip}`.trim() || 'Unknown',
      city,
      state,
      zip,
      monthlyRent,
      rentPerSqft,
      beds,
      baths,
      sqft,
      yearBuilt,
      listingDate,
      daysAgo,
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      similarityScore,
      propertyType: toStr(comp?.propertyType ?? comp?.homeType ?? ''),
      latitude: lat,
      longitude: lon,
      imageUrl,
      zillowUrl: comp?.url ? toStr(comp.url) : null,
    }
  })

  comps.sort((a, b) => b.similarityScore - a.similarityScore)
  return comps
}

/**
 * Fetch rent comps from backend and return transformed RentComp[].
 */
export async function fetchRentComps(
  identifier: CompsIdentifier,
  subject?: SubjectProperty,
  options?: { signal?: AbortSignal }
): Promise<AxessoResponse<RentComp[]>> {
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
    SIMILAR_RENT_ENDPOINT,
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
      error: body.error ?? 'Failed to load comparable rentals',
      attempts: res.attempts,
      durationMs: res.durationMs,
    }
  }

  const transformed = transformRentComps(res.data, subject)
  return {
    ...res,
    data: transformed,
  }
}
