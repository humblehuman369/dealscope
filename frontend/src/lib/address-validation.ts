/**
 * Utilities for parsing Google Address Validation API responses
 * into our application types.
 */

import type {
  AddressValidationResult,
  AddressIssue,
  StandardizedAddress,
  ValidationConfidence,
} from '@/types/address'

/** Raw Google API result (subset we use). */
interface GoogleVerdict {
  addressComplete?: boolean
  validationGranularity?: string
  hasUnconfirmedComponents?: boolean
  hasReplacedComponents?: boolean
  hasInferredComponents?: boolean
  hasSpellCorrectedComponents?: boolean
}
interface GooglePostalAddress {
  addressLines?: string[]
  regionCode?: string
  locality?: string
  administrativeArea?: string
  postalCode?: string
}
interface GoogleAddress {
  formattedAddress?: string
  postalAddress?: GooglePostalAddress
  missingComponentTypes?: string[]
  unconfirmedComponentTypes?: string[]
}
interface GoogleValidationResult {
  result?: {
    verdict?: GoogleVerdict
    address?: GoogleAddress
    geocode?: { location?: { latitude?: number; longitude?: number } }
    uspsData?: {
      standardizedAddress?: string
      deliveryPointBarcode?: string
      carrierRoute?: string
    }
  }
}

const GRANULARITY_ORDER: ValidationConfidence[] = [
  'SUB_PREMISE',
  'PREMISE',
  'PREMISE_PROXIMITY',
  'BLOCK',
  'ROUTE',
  'OTHER',
  'GRANULARITY_UNSPECIFIED',
]

function parseGranularity(value: string | undefined): ValidationConfidence {
  if (!value) return 'GRANULARITY_UNSPECIFIED'
  const upper = value.toUpperCase().replace(/-/g, '_')
  return GRANULARITY_ORDER.includes(upper as ValidationConfidence)
    ? (upper as ValidationConfidence)
    : 'OTHER'
}

function extractComponentsFromPostalAddress(pa: {
  addressLines?: string[]
  locality?: string
  administrativeArea?: string
  postalCode?: string
}): StandardizedAddress {
  const lines = pa.addressLines ?? []
  const streetLine = lines[0] ?? ''
  const streetNumber = streetLine.replace(/^(\d+[\w-]*)\s*.*$/, '$1').trim()
  const street = streetLine.replace(/^\d+[\w-]*\s*/, '').trim() || streetLine
  return {
    streetNumber: streetNumber && /^\d/.test(streetNumber) ? streetNumber : '',
    street,
    city: pa.locality ?? '',
    state: pa.administrativeArea ?? '',
    zipCode: pa.postalCode ?? '',
    zipPlus4: undefined,
    county: undefined,
  }
}

/**
 * Build issues list from verdict and address metadata.
 */
function buildIssues(verdict: GoogleVerdict | undefined, address: GoogleAddress | undefined): AddressIssue[] {
  const issues: AddressIssue[] = []
  if (verdict?.hasUnconfirmedComponents) {
    issues.push({
      type: 'UNCONFIRMED',
      message: 'Some address components could not be confirmed.',
    })
  }
  if (verdict?.hasReplacedComponents) {
    issues.push({
      type: 'CORRECTED',
      message: 'Some parts of the address were corrected.',
    })
  }
  if (verdict?.hasInferredComponents) {
    issues.push({
      type: 'INFERRED',
      message: 'Some address components were inferred.',
    })
  }
  if (verdict?.hasSpellCorrectedComponents) {
    issues.push({
      type: 'SPELL_CORRECTED',
      message: 'Spelling was corrected.',
    })
  }
  const missing = address?.missingComponentTypes ?? []
  if (missing.some((t) => t?.toLowerCase().includes('subpremise') || t?.toLowerCase().includes('sub_premise'))) {
    issues.push({
      type: 'MISSING_UNIT',
      message: 'Apartment or unit number may be missing.',
      field: 'subpremise',
    })
  }
  return issues
}

/**
 * Parse a Google Address Validation API response into our AddressValidationResult.
 */
export function parseGoogleValidationResponse(
  data: unknown
): AddressValidationResult | null {
  const raw = data as GoogleValidationResult
  const result = raw?.result
  if (!result) return null

  const verdict = result.verdict ?? {}
  const addr = result.address ?? {}
  const postal = addr.postalAddress ?? {}
  const geo = result.geocode?.location
  const lat = typeof geo?.latitude === 'number' ? geo.latitude : 0
  const lng = typeof geo?.longitude === 'number' ? geo.longitude : 0

  const validationGranularity = parseGranularity(verdict.validationGranularity)
  const isDeliverable =
    validationGranularity === 'PREMISE' ||
    validationGranularity === 'SUB_PREMISE' ||
    validationGranularity === 'PREMISE_PROXIMITY'
  const addressComplete = verdict.addressComplete === true
  const isValid = addressComplete && isDeliverable

  const standardizedAddress = extractComponentsFromPostalAddress(postal)
  const formattedAddress =
    (addr.formattedAddress ?? (postal.addressLines ?? []).join(', ')) || ''

  const issues = buildIssues(verdict, addr)

  const out: AddressValidationResult = {
    isValid,
    confidence: validationGranularity,
    standardizedAddress,
    formattedAddress,
    geocode: { latitude: lat, longitude: lng },
    issues,
  }

  if (result.uspsData) {
    out.uspsData = {
      standardizedAddress: result.uspsData.standardizedAddress ?? '',
      deliveryPointBarcode: result.uspsData.deliveryPointBarcode,
      carrierRoute: result.uspsData.carrierRoute,
    }
  }

  return out
}
