/**
 * Appraisal Report PDF — download via backend WeasyPrint endpoint.
 */

import { API_BASE_URL } from '@/lib/env'
import type { AppraisalResult, CompAdjustment } from '@/utils/appraisalCalculations'
import type { SaleComp } from './types'

export interface AppraisalReportPayload {
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
  }>
  theme?: string
}

/**
 * Build the appraisal report payload from the frontend appraisal result,
 * the raw comps, selected IDs, subject info, and override values.
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
  }
  overrideMarketValue?: number | null
  overrideArv?: number | null
}): AppraisalReportPayload {
  const { appraisalResult, comps, selectedIds, subject } = opts
  const marketValue = opts.overrideMarketValue ?? appraisalResult.marketValue
  const arv = opts.overrideArv ?? appraisalResult.arv

  const selectedComps = comps.filter(c => selectedIds.has(c.id))

  const compAdjMap = new Map(
    appraisalResult.compAdjustments.map(ca => [ca.compId, ca])
  )

  const compPayloads = selectedComps.map(comp => {
    const adj: CompAdjustment | undefined = compAdjMap.get(comp.id)
    return {
      comp_address: comp.address,
      base_price: adj?.basePrice ?? comp.salePrice,
      size_adjustment: adj?.sizeAdjustment ?? 0,
      bedroom_adjustment: adj?.bedroomAdjustment ?? 0,
      bathroom_adjustment: adj?.bathroomAdjustment ?? 0,
      age_adjustment: adj?.ageAdjustment ?? 0,
      lot_adjustment: adj?.lotAdjustment ?? 0,
      total_adjustment: adj?.totalAdjustment ?? 0,
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
    }
  })

  return {
    subject_address: subject.address,
    subject_beds: subject.beds,
    subject_baths: subject.baths,
    subject_sqft: subject.sqft,
    subject_year_built: subject.yearBuilt,
    subject_lot_size: subject.lotSize,
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
  }
}

/**
 * Download the appraisal report as a PDF blob.
 * Falls back to opening the HTML report in a new tab if the PDF endpoint returns 501.
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

  if (response.status === 501) {
    const htmlUrl = `${base}/api/v1/proforma/appraisal-report/html?auto_print=true`
    const htmlRes = await fetch(htmlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    }
    return
  }

  if (!response.ok) {
    throw new Error(`Appraisal PDF download failed: ${response.statusText}`)
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = 'DealGapIQ-Appraisal-Report.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
