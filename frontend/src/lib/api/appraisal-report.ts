/**
 * URAR Form 1004 Appraisal Report — download via backend WeasyPrint endpoint.
 *
 * Expanded payload supports: Subject, Neighborhood (market stats),
 * Site & Improvements (property details), Sales Comparison (comps),
 * Income Approach (rental data), and AI narrative generation opt-in.
 */

import { API_BASE_URL } from '@/lib/env'
import type { AppraisalResult, CompAdjustment } from '@/utils/appraisalCalculations'
import type { SaleComp } from './types'

export interface AppraisalReportPayload {
  // Subject
  subject_address: string
  subject_beds: number
  subject_baths: number
  subject_sqft: number
  subject_year_built: number
  subject_lot_size: number
  subject_property_type?: string | null
  list_price?: number | null
  rehab_cost?: number | null
  image_url?: string | null

  // Sales Comparison values
  market_value: number
  arv: number
  confidence: number
  range_low: number
  range_high: number
  adjusted_price_value: number
  price_per_sqft_value: number
  weighted_average_ppsf: number
  comp_adjustments: Array<{
    comp_address: string
    base_price: number
    size_adjustment: number
    bedroom_adjustment: number
    bathroom_adjustment: number
    age_adjustment: number
    lot_adjustment: number
    total_adjustment: number
    adjusted_price: number
    price_per_sqft: number
    similarity_score: number
    weight: number
    beds: number
    baths: number
    sqft: number
    year_built: number
    sale_date?: string | null
    distance_miles?: number | null
    gross_adjustment_pct?: number | null
    net_adjustment_pct?: number | null
  }>

  // Expanded property details (Form 1004 Improvements section)
  property_details?: {
    stories?: number | null
    heating_type?: string | null
    cooling_type?: string | null
    has_garage?: boolean | null
    garage_spaces?: number | null
    exterior_type?: string | null
    roof_type?: string | null
    foundation_type?: string | null
    has_fireplace?: boolean | null
    has_pool?: boolean | null
  } | null

  // Market stats (Form 1004 Neighborhood section)
  market_stats?: {
    median_days_on_market?: number | null
    total_listings?: number | null
    new_listings?: number | null
    median_price?: number | null
    avg_price_per_sqft?: number | null
    market_temperature?: string | null
  } | null

  // Rental data (Form 1004 Income Approach)
  rental_data?: {
    monthly_rent?: number | null
    rent_range_low?: number | null
    rent_range_high?: number | null
    grm?: number | null
    cap_rate?: number | null
    noi?: number | null
    vacancy_rate?: number | null
  } | null

  // Options
  theme?: string
  generate_ai_narratives?: boolean
}

/**
 * Build the URAR appraisal report payload from frontend data.
 *
 * Accepts optional propertyData (full property response from usePropertyData)
 * to populate the expanded sections (details, market stats, rental data).
 */
export function buildAppraisalPayload(opts: {
  appraisalResult: AppraisalResult
  comps: SaleComp[]
  selectedIds: Set<string | number>
  subject: {
    address: string
    beds: number
    baths: number
    sqft: number
    yearBuilt: number
    lotSize: number
    rehabCost?: number
    price?: number
    propertyType?: string
  }
  overrideMarketValue?: number | null
  overrideArv?: number | null
  propertyData?: Record<string, any> | null
}): AppraisalReportPayload {
  const { appraisalResult, comps, selectedIds, subject } = opts
  const marketValue = opts.overrideMarketValue ?? appraisalResult.marketValue
  const arv = opts.overrideArv ?? appraisalResult.arv
  const pd = opts.propertyData

  const selectedComps = comps.filter(c => selectedIds.has(c.id))
  const compAdjMap = new Map(
    appraisalResult.compAdjustments.map(ca => [ca.compId, ca])
  )

  const compPayloads = selectedComps.map(comp => {
    const adj: CompAdjustment | undefined = compAdjMap.get(comp.id)
    const basePrice = adj?.basePrice ?? comp.salePrice
    const totalAdj = adj?.totalAdjustment ?? 0
    const absAdj = Math.abs(adj?.sizeAdjustment ?? 0)
      + Math.abs(adj?.bedroomAdjustment ?? 0)
      + Math.abs(adj?.bathroomAdjustment ?? 0)
      + Math.abs(adj?.ageAdjustment ?? 0)
      + Math.abs(adj?.lotAdjustment ?? 0)

    return {
      comp_address: comp.address,
      base_price: basePrice,
      size_adjustment: adj?.sizeAdjustment ?? 0,
      bedroom_adjustment: adj?.bedroomAdjustment ?? 0,
      bathroom_adjustment: adj?.bathroomAdjustment ?? 0,
      age_adjustment: adj?.ageAdjustment ?? 0,
      lot_adjustment: adj?.lotAdjustment ?? 0,
      total_adjustment: totalAdj,
      adjusted_price: adj?.adjustedPrice ?? comp.salePrice,
      price_per_sqft: adj?.pricePerSqft ?? comp.pricePerSqft,
      similarity_score: adj?.similarityScore ?? 0,
      weight: adj?.weight ?? 0,
      beds: comp.beds,
      baths: comp.baths,
      sqft: comp.sqft,
      year_built: comp.yearBuilt,
      sale_date: comp.saleDate ?? null,
      distance_miles: comp.distanceMiles ?? null,
      gross_adjustment_pct: basePrice > 0 ? (absAdj / basePrice) * 100 : null,
      net_adjustment_pct: basePrice > 0 ? (totalAdj / basePrice) * 100 : null,
    }
  })

  const details = pd?.details
  const market = pd?.market
  const rentals = pd?.rentals

  return {
    subject_address: subject.address,
    subject_beds: subject.beds,
    subject_baths: subject.baths,
    subject_sqft: subject.sqft,
    subject_year_built: subject.yearBuilt,
    subject_lot_size: subject.lotSize,
    subject_property_type: subject.propertyType ?? details?.property_type ?? null,
    list_price: subject.price ?? null,
    rehab_cost: subject.rehabCost ?? null,
    market_value: marketValue,
    arv,
    confidence: appraisalResult.confidence,
    range_low: appraisalResult.rangeLow,
    range_high: appraisalResult.rangeHigh,
    adjusted_price_value: appraisalResult.adjustedPriceValue,
    price_per_sqft_value: appraisalResult.pricePerSqftValue,
    weighted_average_ppsf: appraisalResult.weightedAveragePpsf,
    comp_adjustments: compPayloads,

    property_details: details ? {
      stories: details.stories ?? null,
      heating_type: details.heating_type ?? null,
      cooling_type: details.cooling_type ?? null,
      has_garage: details.has_garage ?? null,
      garage_spaces: details.garage_spaces ?? null,
      exterior_type: details.exterior_type ?? null,
      roof_type: details.roof_type ?? null,
      foundation_type: details.foundation_type ?? null,
      has_fireplace: details.has_fireplace ?? null,
      has_pool: details.has_pool ?? null,
    } : null,

    market_stats: market?.market_stats ? {
      median_days_on_market: market.market_stats.median_days_on_market ?? null,
      total_listings: market.market_stats.total_listings ?? null,
      new_listings: market.market_stats.new_listings ?? null,
      median_price: market.market_stats.median_price ?? null,
      avg_price_per_sqft: market.market_stats.avg_price_per_sqft ?? null,
      market_temperature: market.market_stats.market_temperature ?? null,
    } : null,

    rental_data: rentals ? {
      monthly_rent: rentals.monthly_rent_ltr ?? null,
      rent_range_low: rentals.rent_range_low ?? null,
      rent_range_high: rentals.rent_range_high ?? null,
      grm: null,
      cap_rate: null,
      noi: null,
      vacancy_rate: null,
    } : null,

    // Reliability-first default: deterministic template narratives, no LLM dependency.
    generate_ai_narratives: false,
  }
}

/**
 * Download the appraisal report as a PDF blob.
 * Falls back to downloading an HTML report if WeasyPrint is unavailable (501)
 * or the PDF endpoint fails for any reason.
 */
export async function downloadAppraisalReportPDF(
  payload: AppraisalReportPayload,
): Promise<void> {
  const base = API_BASE_URL
  const url = `${base}/api/v1/proforma/appraisal-report/pdf`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (response.ok) {
    triggerBlobDownload(await response.blob(), 'DealGapIQ-URAR-Appraisal-Report.pdf')
    return
  }

  // Only fall back for the explicit WeasyPrint-unavailable path.
  if (response.status === 501) {
    return downloadAppraisalReportHTML(payload)
  }

  const errText = await response.text().catch(() => '')
  throw new Error(`Appraisal PDF failed (${response.status}): ${errText || response.statusText}`)
}

async function downloadAppraisalReportHTML(
  payload: AppraisalReportPayload,
): Promise<void> {
  const base = API_BASE_URL
  const htmlUrl = `${base}/api/v1/proforma/appraisal-report/html?auto_print=true`

  const htmlRes = await fetch(htmlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!htmlRes.ok) {
    const errText = await htmlRes.text().catch(() => '')
    throw new Error(`Appraisal HTML fallback failed (${htmlRes.status}): ${errText || htmlRes.statusText}`)
  }

  const html = await htmlRes.text()
  const blob = new Blob([html], { type: 'text/html' })
  triggerBlobDownload(blob, 'DealGapIQ-URAR-Appraisal-Report.html')
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
