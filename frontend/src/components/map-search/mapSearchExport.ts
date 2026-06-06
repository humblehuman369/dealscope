import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'

export type MapListingExportRow = {
  Address: string
  City: string
  State: string
  Zip: string
  Price: string
  Beds: string
  Baths: string
  Sqft: string
  '$/Sqft': string
  'Property Type': string
  Status: string
  'Days on Market': string
  'Year Built': string
  'Deal Signal': string
  Latitude: string
  Longitude: string
  'Owner Years': string
  'Owner Occupied': string
}

const EXPORT_COLUMNS: (keyof MapListingExportRow)[] = [
  'Address',
  'City',
  'State',
  'Zip',
  'Price',
  'Beds',
  'Baths',
  'Sqft',
  '$/Sqft',
  'Property Type',
  'Status',
  'Days on Market',
  'Year Built',
  'Deal Signal',
  'Latitude',
  'Longitude',
  'Owner Years',
  'Owner Occupied',
]

function formatExportPrice(price: number | null): string {
  if (price == null) return ''
  return String(price)
}

function formatPricePerSqft(price: number | null, sqft: number | null): string {
  if (price == null || sqft == null || sqft <= 0) return ''
  return String(Math.round(price / sqft))
}

function formatOwnerOccupied(value: boolean | null | undefined): string {
  if (value == null) return ''
  return value ? 'Yes' : 'No'
}

function resolveYearBuilt(listing: MapListing): string {
  const raw =
    listing.year_built ??
    (listing as MapListing & { yearBuilt?: number | string | null }).yearBuilt
  if (raw == null || raw === '') return ''
  const year = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(year) || year <= 0) return ''
  return String(Math.floor(year))
}

export function buildExportRows(
  listings: MapListing[],
  dealSignals: Map<string, DealSignalResult>,
): MapListingExportRow[] {
  return listings.map((listing) => {
    const signal = dealSignals.get(listing.id)
    return {
      Address: listing.address,
      City: listing.city ?? '',
      State: listing.state ?? '',
      Zip: listing.zip_code ?? '',
      Price: formatExportPrice(listing.price),
      Beds: listing.bedrooms != null ? String(listing.bedrooms) : '',
      Baths: listing.bathrooms != null ? String(listing.bathrooms) : '',
      Sqft: listing.sqft != null ? String(listing.sqft) : '',
      '$/Sqft': formatPricePerSqft(listing.price, listing.sqft),
      'Property Type': listing.property_type ?? '',
      Status: listing.listing_status ?? '',
      'Days on Market': listing.days_on_market != null ? String(listing.days_on_market) : '',
      'Year Built': resolveYearBuilt(listing),
      'Deal Signal': signal?.label ?? '',
      Latitude: String(listing.latitude),
      Longitude: String(listing.longitude),
      'Owner Years': listing.owner_years != null ? String(Math.round(listing.owner_years)) : '',
      'Owner Occupied': formatOwnerOccupied(listing.owner_occupied),
    }
  })
}

function escapeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function triggerDownload(buffer: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportListingsCsv(rows: MapListingExportRow[]): void {
  if (rows.length === 0) return
  const headerLine = EXPORT_COLUMNS.join(',')
  const dataLines = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => escapeCsvCell(row[col])).join(','),
  )
  const csv = [headerLine, ...dataLines].join('\n')
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(csv, `dealgapiq-map-listings-${date}.csv`, 'text/csv;charset=utf-8')
}

export async function exportListingsExcel(rows: MapListingExportRow[]): Promise<void> {
  if (rows.length === 0) return
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Listings')
  ws.addRow([...EXPORT_COLUMNS])
  rows.forEach((row) => {
    ws.addRow(EXPORT_COLUMNS.map((col) => row[col]))
  })
  ws.getRow(1).font = { bold: true }
  ws.columns = EXPORT_COLUMNS.map(() => ({ width: 16 }))
  const buffer = await wb.xlsx.writeBuffer()
  const date = new Date().toISOString().slice(0, 10)
  triggerDownload(
    buffer as ArrayBuffer,
    `dealgapiq-map-listings-${date}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}
