/**
 * Rent comps — rebuilt from scratch to match legacy compsService + in-component transform.
 * Fetches from /api/v1/similar-rent and maps backend response to RentComp[].
 */

import { haversineDistance, calculateSimilarity } from './comps-transform-utils'
import type { CompsIdentifier, RentComp, SubjectProperty } from './types'

const ENDPOINT = '/api/v1/similar-rent'
const TIMEOUT_MS = 15_000

/** Response shape from our backend (and legacy compsService) */
interface SimilarRentResponse {
  success?: boolean
  results?: unknown[]
  rentalComps?: unknown[]
  data?: unknown[]
  rentals?: unknown[]
  error?: string
}

/** Return type aligned with AxessoResponse so callers stay unchanged */
export interface RentCompsResponse {
  ok: boolean
  data: RentComp[] | null
  status: number
  error: string | null
  attempts: number
  durationMs: number
}

function num(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

/** Get comp list in legacy order: rentalComps, results, data, rentals (no other keys) */
function getRawList(body: SimilarRentResponse): unknown[] {
  const list =
    body.rentalComps ?? body.results ?? body.data ?? body.rentals ?? []
  return Array.isArray(list) ? list : []
}

/**
 * Map one raw item to RentComp. Uses item.property if present, else item.
 * Field order and fallbacks match legacy transformRentResponse / transformRentalResponse.
 */
function mapItemToRentComp(
  item: unknown,
  index: number,
  subjectLat: number,
  subjectLon: number,
  subject: SubjectProperty | undefined
): RentComp {
  const raw = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
  const comp = raw.property != null && typeof raw.property === 'object'
    ? (raw.property as Record<string, unknown>)
    : raw

  const addrRaw = comp.address
  const addr =
    typeof addrRaw === 'object' && addrRaw !== null
      ? (addrRaw as Record<string, unknown>)
      : {}
  const street = str(addr.streetAddress ?? addr.street ?? comp.streetAddress ?? comp.address)
  const city = str(addr.city ?? comp.city ?? '')
  const state = str(addr.state ?? comp.state ?? '')
  const zip = str(addr.zipcode ?? addr.zip ?? comp.zipcode ?? comp.zip ?? '')

  const units = comp.units as unknown[] | undefined
  const unitPrice =
    Array.isArray(units) && units.length > 0
      ? num((units[0] as Record<string, unknown>)?.price)
      : 0
  const monthlyRent = num(
    comp.price ??
      comp.rent ??
      comp.monthlyRent ??
      comp.listPrice ??
      comp.unformattedPrice ??
      unitPrice
  )

  const sqft = num(
    comp.livingAreaValue ??
      comp.livingArea ??
      comp.sqft ??
      comp.squareFeet ??
      comp.squareFootage ??
      comp.area
  )
  const lat = num(comp.latitude ?? (comp.latLong as Record<string, number>)?.latitude)
  const lon = num(comp.longitude ?? (comp.latLong as Record<string, number>)?.longitude)
  const distanceMiles =
    subjectLat && subjectLon && lat && lon
      ? haversineDistance(subjectLat, subjectLon, lat, lon)
      : 0
  const beds = Math.floor(num(comp.bedrooms ?? comp.beds ?? comp.bd))
  const baths = num(comp.bathrooms ?? comp.baths ?? comp.ba)
  const yearBuilt = Math.floor(num(comp.yearBuilt ?? comp.yearConstructed))

  const listingDateRaw = str(
    comp.listedDate ??
      comp.lastSeenDate ??
      comp.listingDate ??
      comp.seenDate ??
      comp.datePosted ??
      comp.dateSeen
  )
  const listingDate = listingDateRaw
    ? new Date(listingDateRaw).toISOString().split('T')[0]
    : ''
  const daysAgo = listingDate
    ? Math.floor((Date.now() - new Date(listingDate).getTime()) / 86400000)
    : 999

  let imageUrl: string | null = null
  const miniPhotos = comp.miniCardPhotos as Array<Record<string, string>> | undefined
  if (miniPhotos?.length && miniPhotos[0]?.url) {
    imageUrl = miniPhotos[0].url
  }
  if (!imageUrl) {
    const photos = comp.compsCarouselPropertyPhotos as Record<string, unknown>[] | undefined
    if (photos?.length) {
      const first = photos[0] as Record<string, unknown>
      const jpeg = (first?.mixedSources as Record<string, unknown[]>)?.jpeg
      if (Array.isArray(jpeg) && jpeg.length) {
        const u = (jpeg[0] as Record<string, string>)?.url
        if (u) imageUrl = u
      }
    }
  }
  if (!imageUrl) imageUrl = str(comp.imgSrc || comp.imageUrl || comp.image || comp.thumbnailUrl) || null

  const zpidStr = str(comp.zpid ?? comp.id ?? comp.providerListingID).trim()
  const zpid = zpidStr || `rent-${index + 1}`

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
  const address = street || [city, state, zip].filter(Boolean).join(', ') || 'Unknown'

  const hdpUrl = str(comp.hdpUrl)
  const zillowUrl = comp.url
    ? str(comp.url)
    : hdpUrl
      ? `https://www.zillow.com${hdpUrl.startsWith('/') ? '' : '/'}${hdpUrl}`
      : null

  return {
    id: zpid,
    zpid,
    address,
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
    propertyType: str(comp.homeType ?? comp.propertyType),
    latitude: lat,
    longitude: lon,
    imageUrl,
    zillowUrl,
  }
}

/**
 * Transform backend body into RentComp[] (legacy extraction + per-item mapping).
 */
export function transformRentComps(
  body: SimilarRentResponse,
  subject?: SubjectProperty
): RentComp[] {
  const list = getRawList(body)
  const subjectLat = subject?.latitude ?? 0
  const subjectLon = subject?.longitude ?? 0

  const comps = list.map((item, i) =>
    mapItemToRentComp(item, i, subjectLat, subjectLon, subject)
  )
  comps.sort((a, b) => b.similarityScore - a.similarityScore)
  return comps
}

/**
 * Fetch rent comps from backend. Single attempt, 15s timeout.
 * Returns { ok, data: RentComp[] | null, status, error, attempts, durationMs }.
 */
export async function fetchRentComps(
  identifier: CompsIdentifier,
  subject?: SubjectProperty,
  options?: { signal?: AbortSignal }
): Promise<RentCompsResponse> {
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

  const qs = new URLSearchParams(params).toString()
  const url = `${ENDPOINT}?${qs}`
  const start = performance.now()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const signal = options?.signal ?? controller.signal

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'include',
      signal,
    })
    clearTimeout(timeoutId)
    const durationMs = Math.round(performance.now() - start)
    const body = (await res.json().catch(() => null)) as SimilarRentResponse | null

    if (!res.ok) {
      const err = body?.error ?? res.statusText ?? `HTTP ${res.status}`
      return {
        ok: false,
        data: null,
        status: res.status,
        error: err,
        attempts: 1,
        durationMs,
      }
    }

    if (body?.success === false) {
      return {
        ok: false,
        data: null,
        status: res.status,
        error: body.error ?? 'Failed to load comparable rentals',
        attempts: 1,
        durationMs,
      }
    }

    const raw = body ?? {}
    const transformed = transformRentComps(raw, subject)

    return {
      ok: true,
      data: transformed,
      status: res.status,
      error: null,
      attempts: 1,
      durationMs,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    const durationMs = Math.round(performance.now() - start)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      data: null,
      status: 0,
      error: isAbort ? 'Request timed out' : (err instanceof Error ? err.message : String(err)),
      attempts: 1,
      durationMs,
    }
  }
}
