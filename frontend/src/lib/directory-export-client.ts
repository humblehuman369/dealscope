/**
 * Client helper for server-side directory exports (buyers / lenders).
 *
 * All gating and metering happen on the server — this just carries auth
 * (via apiFetchRaw), downloads the CSV, or opens the print-to-PDF view,
 * and surfaces the server's message when an export is refused.
 */

import { apiFetchRaw } from '@/lib/api-client'

export type DirectoryExportResult = { ok: true } | { ok: false; message: string }

async function serverMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json()
    const detail = body?.detail
    if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
      return detail.message
    }
    if (typeof detail === 'string') return detail
  } catch {
    /* non-JSON error body */
  }
  return fallback
}

export async function runDirectoryExport(
  path: string,
  fmt: 'csv' | 'print',
  fallbackFilename: string,
): Promise<DirectoryExportResult> {
  const response = await apiFetchRaw(path)

  if (!response.ok) {
    return { ok: false, message: await serverMessage(response, 'Export failed. Please try again.') }
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)

  if (fmt === 'print') {
    // The server's print view auto-opens the browser print dialog.
    const win = window.open(url, '_blank')
    if (!win) {
      URL.revokeObjectURL(url)
      return { ok: false, message: 'Pop-up blocked — allow pop-ups to print.' }
    }
    return { ok: true }
  }

  let filename = fallbackFilename
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  if (match) filename = match[1]

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return { ok: true }
}
