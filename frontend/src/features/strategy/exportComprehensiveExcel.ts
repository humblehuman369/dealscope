/**
 * Strategy page — comprehensive Excel proforma (all 6 strategies + financial tabs).
 */

import { apiFetchRaw } from '@/lib/api-client'
import type { StrategyType } from '@/features/deal-maker/components/types'
import { toOccupancyFraction } from '@/utils/verdictPayload'

export interface ComprehensiveExcelParams {
  propertyId: string
  address: string
  activeStrategy: StrategyType
  verdictInput: Record<string, unknown>
  savedPropertyId?: string | null
  includeSensitivity?: boolean
}

const POSITIVE_OPTIONAL_KEYS = ['arv', 'purchase_price', 'sqft', 'zestimate', 'current_value_avm', 'tax_assessed_value'] as const
const TWO_LETTER_KEYS = ['state', 'owner_state'] as const

/**
 * Drop / clamp fields that IQVerdictInput rejects (gt=0, occupancy 0–1, 2-letter
 * state). Worksheet defaults of `arv: 0` otherwise 422 the whole export.
 */
export function sanitizeVerdictInputForExcel(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const payload = { ...input }

  const listPrice = payload.list_price
  if (typeof listPrice !== 'number' || !Number.isFinite(listPrice) || listPrice <= 0) {
    payload.list_price = 1
  }

  for (const key of POSITIVE_OPTIONAL_KEYS) {
    const value = payload[key]
    if (value == null) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      delete payload[key]
    }
  }

  const occupancy = toOccupancyFraction(
    typeof payload.occupancy_rate === 'number' ? payload.occupancy_rate : null,
  )
  if (occupancy == null || occupancy < 0 || occupancy > 1) {
    delete payload.occupancy_rate
  } else {
    payload.occupancy_rate = occupancy
  }

  for (const key of TWO_LETTER_KEYS) {
    const value = payload[key]
    if (value == null) continue
    if (typeof value !== 'string' || value.trim().length !== 2) {
      delete payload[key]
    }
  }

  const interest = payload.interest_rate
  if (typeof interest === 'number' && Number.isFinite(interest) && interest > 0.3) {
    payload.interest_rate = interest > 1 ? interest / 100 : 0.3
  }

  return payload
}

function triggerXlsxDownload(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  // Safari / WKWebView start the download asynchronously; revoking immediately
  // cancels it and looks like a dead button.
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(downloadUrl)
  }, 2000)
}

async function assertXlsxBlob(blob: Blob): Promise<void> {
  if (blob.size < 4) {
    throw new Error('Failed to generate Excel report.')
  }
  const type = blob.type || ''
  if (type.includes('json') || type.includes('html') || type.startsWith('text/')) {
    throw new Error('Failed to generate Excel report.')
  }
  if (typeof blob.arrayBuffer !== 'function') return
  const header = new Uint8Array(await blob.arrayBuffer()).subarray(0, 2)
  // XLSX is a ZIP (PK). HTML/JSON error pages from a proxy fail this check.
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    throw new Error('Failed to generate Excel report.')
  }
}

export async function downloadComprehensiveExcel(
  params: ComprehensiveExcelParams,
): Promise<void> {
  const url = `/api/v1/reports/property/${encodeURIComponent(params.propertyId)}/comprehensive-excel`
  const verdictInput = sanitizeVerdictInputForExcel(params.verdictInput)

  // apiFetchRaw attaches auth (Bearer on Capacitor, cookies + CSRF on web)
  // and silently refreshes + retries on 401 so an expired access token
  // never bounces a signed-in user to the login prompt.
  const response = await apiFetchRaw(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: params.address,
      active_strategy: params.activeStrategy,
      verdict_input: verdictInput,
      saved_property_id: params.savedPropertyId ?? null,
      include_sensitivity: params.includeSensitivity ?? true,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    let detail = ''
    if (typeof errorData.detail === 'string') {
      detail = errorData.detail
    } else if (Array.isArray(errorData.detail)) {
      detail = errorData.detail
        .map((item: { msg?: string }) => item?.msg)
        .filter(Boolean)
        .join('; ')
    }
    if (response.status === 401) {
      throw new Error('Please sign in to download the worksheet.')
    }
    if (response.status === 403) {
      throw new Error('Pro subscription required. Upgrade to download the worksheet.')
    }
    if (response.status === 404) {
      throw new Error(detail || 'Property not found.')
    }
    if (response.status === 503) {
      throw new Error(detail || 'Data providers are temporarily unavailable. Try again shortly.')
    }
    throw new Error(detail || 'Failed to generate Excel report.')
  }

  const contentDisposition = response.headers.get('Content-Disposition')
  const addressSlug = params.address.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) || 'property'
  let filename = `DealGapIQ_Comprehensive_${addressSlug}.xlsx`
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) filename = match[1]
  }

  const blob = await response.blob()
  await assertXlsxBlob(blob)
  triggerXlsxDownload(blob, filename)
}
