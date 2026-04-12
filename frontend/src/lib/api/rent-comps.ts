/**
 * Rent comps — fetch from backend and transform to RentComp[].
 * Same pattern as sale-comps: same client, same flow; only endpoint and field names differ.
 */

import { axessoGet, type AxessoResponse } from './axesso-client'
import { haversineDistance, calculateSimilarity } from './comps-transform-utils'
import type { CompsIdentifier, RentComp, SubjectProperty } from './types'

const ZILLOW_RENT_ENDPOINT = '/api/v1/similar-rent'
const RENTCAST_ENDPOINT = '/api/v1/rentcast/rental-comps'

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

function hasFiniteNumber(value: unknown): boolean {
  if (value == null || value === '') return false
  const n = Number(value)
  return Number.isFinite(n)
}

function pickPhotoUrl(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return toStr(value) || null
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = pickPhotoUrl(item)
      if (url) return url
    }
    return null
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const direct =
      toStr(obj.url) ||
      toStr(obj.href) ||
      toStr(obj.src) ||
      toStr(obj.imageUrl) ||
      toStr(obj.imgSrc) ||
      toStr(obj.thumbnailUrl)
    if (direct) return direct
    return (
      pickPhotoUrl(obj.jpeg) ||
      pickPhotoUrl(obj.webp) ||
      pickPhotoUrl(obj.png) ||
      pickPhotoUrl(obj.mixedSources) ||
      pickPhotoUrl(obj.photo) ||
      pickPhotoUrl(obj.image) ||
      null
    )
  }
  return null
}

/** Same extraction as sale-comps: results first, then same fallback keys. Backend normalizes both to results. */
function extractCompsArray(raw: BackendCompsResponse): unknown[] {
  const list =
    raw.results ??
    (raw as unknown as { similarProperties?: unknown[] }).similarProperties ??
    (raw as unknown as { rentalComps?: unknown[] }).rentalComps ??
    (raw as unknown as { properties?: unknown[] }).properties ??
    (raw as unknown as { rentals?: unknown[] }).rentals ??
    (raw as unknown as { data?: unknown[] }).data ??
    []
  return Array.isArray(list) ? list : []
}

/**
 * Transform backend raw rent comp items into RentComp[]. Same structure as transformSaleComps.
 */
export function transformRentComps(
  raw: BackendCompsResponse,
  subject?: SubjectProperty
): RentComp[] {
  const list = extractCompsArray(raw)
  const subjectLat = subject?.latitude ?? null
  const subjectLon = subject?.longitude ?? null
  const hasSubjectCoords =
    hasFiniteNumber(subjectLat) && hasFiniteNumber(subjectLon)

  const comps: RentComp[] = list.map((item: unknown, index: number) => {
    const wrapper = (item && typeof item === 'object')
      ? (item as Record<string, unknown>)
      : null
    const comp = (item && typeof item === 'object' && 'property' in item
      ? (item as { property: unknown }).property
      : item) as Record<string, unknown>
    const addr = (comp?.address as Record<string, unknown>) ?? {}
    const address = toStr(addr.streetAddress ?? addr.street ?? comp?.formattedAddress ?? comp?.addressLine1 ?? comp?.address ?? comp?.fullAddress ?? comp?.streetAddress ?? '')
    const city = toStr(addr.city ?? comp?.city ?? '')
    const state = toStr(addr.state ?? comp?.state ?? '')
    const zip = toStr(addr.zipcode ?? addr.zip ?? comp?.zipCode ?? comp?.zip ?? comp?.zipcode ?? '')
    const units = comp?.units as unknown[] | undefined
    const unitPrice = Array.isArray(units) && units.length > 0 ? (units[0] as Record<string, unknown>)?.price : undefined
    const monthlyRent = toNum(
      comp?.price ??
        comp?.rent ??
        comp?.monthlyRent ??
        comp?.listingPrice ??
        comp?.unformattedPrice ??
        comp?.listPrice ??
        unitPrice ??
        0
    )
    const sqft = toNum(comp?.squareFootage ?? comp?.livingAreaValue ?? comp?.livingArea ?? comp?.sqft ?? comp?.squareFeet ?? comp?.finishedSqFt ?? 0)
    const listingDateRaw = comp?.datePosted ?? comp?.listingDate ?? comp?.listedDate ?? comp?.dateSold ?? comp?.seenDate ?? comp?.lastSeenDate ?? comp?.dateSeen ?? ''
    const listingDate = listingDateRaw ? new Date(listingDateRaw as string).toISOString().split('T')[0] : ''
    const daysAgo = listingDate
      ? Math.floor((Date.now() - new Date(listingDate).getTime()) / 86400000)
      : 999
    const rawLat = comp?.latitude ?? comp?.lat
    const rawLon = comp?.longitude ?? comp?.lng ?? comp?.lon
    const lat = hasFiniteNumber(rawLat) ? Number(rawLat) : 0
    const lon = hasFiniteNumber(rawLon) ? Number(rawLon) : 0
    const hasCompCoords = hasFiniteNumber(rawLat) && hasFiniteNumber(rawLon)
    const haversineDist =
      hasSubjectCoords && hasCompCoords
        ? haversineDistance(subjectLat as number, subjectLon as number, lat, lon)
        : null
    const distanceMiles =
      haversineDist ?? toNum(comp?.distance ?? comp?.distanceMiles ?? 0)
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
    imageUrl =
      pickPhotoUrl(comp?.compsCarouselPropertyPhotos) ||
      pickPhotoUrl(comp?.miniCardPhotos) ||
      pickPhotoUrl(comp?.carouselPhotos) ||
      pickPhotoUrl(comp?.photos) ||
      pickPhotoUrl(comp?.listingPhotos) ||
      pickPhotoUrl(comp?.responsivePhotos) ||
      pickPhotoUrl(wrapper?.compsCarouselPropertyPhotos) ||
      pickPhotoUrl(wrapper?.miniCardPhotos) ||
      pickPhotoUrl(wrapper?.carouselPhotos) ||
      pickPhotoUrl(wrapper?.photos) ||
      pickPhotoUrl(wrapper?.listingPhotos) ||
      pickPhotoUrl(wrapper?.responsivePhotos)
    if (!imageUrl && comp?.imageUrl) imageUrl = toStr(comp.imageUrl)
    if (!imageUrl && comp?.imgSrc) imageUrl = toStr(comp.imgSrc)
    if (!imageUrl && comp?.image) imageUrl = toStr(comp.image)
    if (!imageUrl && comp?.photo) imageUrl = toStr(comp.photo)
    if (!imageUrl && comp?.thumbnailUrl) imageUrl = toStr(comp.thumbnailUrl)
    if (!imageUrl && wrapper?.imageUrl) imageUrl = toStr(wrapper.imageUrl)
    if (!imageUrl && wrapper?.imgSrc) imageUrl = toStr(wrapper.imgSrc)
    if (!imageUrl && wrapper?.image) imageUrl = toStr(wrapper.image)
    if (!imageUrl && wrapper?.photo) imageUrl = toStr(wrapper.photo)
    if (!imageUrl && wrapper?.thumbnailUrl) imageUrl = toStr(wrapper.thumbnailUrl)
    if (!imageUrl) {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
      if (key) {
        if (hasCompCoords) {
          imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${lat},${lon}&key=${key}`
        } else if (address) {
          const fullAddr = address + (city ? `, ${city}` : '') + (state ? `, ${state}` : '') + (zip ? ` ${zip}` : '')
          imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${encodeURIComponent(fullAddr)}&key=${key}`
        }
      }
    }

    const hdpUrl = comp?.hdpUrl ? toStr(comp.hdpUrl) : ''
    const zillowUrl = comp?.url ? toStr(comp.url) : (hdpUrl ? `https://www.zillow.com${hdpUrl.startsWith('/') ? '' : '/'}${hdpUrl}` : null)

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
      zillowUrl,
    }
  })

  comps.sort((a, b) => b.similarityScore - a.similarityScore)
  return comps
}

/**
 * Fetch rent comps: try Zillow first (has photos), fall back to RentCast (reliable data + distance).
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
  if (identifier.subject_lat != null) params.subject_lat = String(identifier.subject_lat)
  if (identifier.subject_lon != null) params.subject_lon = String(identifier.subject_lon)
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

  // Try Zillow first (returns photos via AXESSO)
  const zillowRes = await axessoGet<BackendCompsResponse>(
    ZILLOW_RENT_ENDPOINT,
    params,
    undefined,
    options?.signal
  )

  if (zillowRes.ok && zillowRes.data) {
    const body = zillowRes.data as BackendCompsResponse
    if (body.success !== false) {
      const transformed = transformRentComps(zillowRes.data, subject)
      if (transformed.length > 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[comps_api] rental-comps (zillow) transformed', { count: transformed.length })
        }
        return { ...zillowRes, data: transformed }
      }
    }
  }

  // Zillow returned nothing — fall back to RentCast (reliable, has distance, no photos)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[comps_api] Zillow rent comps empty, falling back to RentCast')
  }

  const rcRes = await axessoGet<BackendCompsResponse>(
    RENTCAST_ENDPOINT,
    params,
    undefined,
    options?.signal
  )

  if (!rcRes.ok || !rcRes.data) {
    return { ...rcRes, data: null }
  }

  const rcBody = rcRes.data as BackendCompsResponse
  if (rcBody.success === false) {
    return {
      ok: false,
      data: null,
      status: rcRes.status,
      error: rcBody.error ?? 'Failed to load comparable rentals',
      attempts: rcRes.attempts,
      durationMs: rcRes.durationMs,
    }
  }

  const transformed = transformRentComps(rcRes.data, subject)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[comps_api] rental-comps (rentcast fallback) transformed', { count: transformed.length })
  }
  return { ...rcRes, data: transformed }
}
