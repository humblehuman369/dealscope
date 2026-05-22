/**
 * Strategy page — comprehensive Excel proforma (all 6 strategies + financial tabs).
 */

import type { StrategyType } from '@/features/deal-maker/components/types'

export interface ComprehensiveExcelParams {
  propertyId: string
  address: string
  activeStrategy: StrategyType
  verdictInput: Record<string, unknown>
  savedPropertyId?: string | null
  includeSensitivity?: boolean
}

function csrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const csrfMatch = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))
  if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]
  return headers
}

export async function downloadComprehensiveExcel(
  params: ComprehensiveExcelParams,
): Promise<void> {
  const url = `/api/v1/reports/property/${encodeURIComponent(params.propertyId)}/comprehensive-excel`

  const response = await fetch(url, {
    method: 'POST',
    headers: csrfHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      address: params.address,
      active_strategy: params.activeStrategy,
      verdict_input: params.verdictInput,
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
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
