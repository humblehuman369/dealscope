/**
 * Address validation types for Google Address Validation API integration.
 * Used by the validate-address API route and search flow.
 */

export type ValidationConfidence =
  | 'PREMISE'
  | 'SUB_PREMISE'
  | 'PREMISE_PROXIMITY'
  | 'BLOCK'
  | 'ROUTE'
  | 'OTHER'
  | 'GRANULARITY_UNSPECIFIED'

export interface StandardizedAddress {
  streetNumber: string
  street: string
  city: string
  state: string
  zipCode: string
  zipPlus4?: string
  county?: string
}

export interface AddressIssue {
  type: 'MISSING_UNIT' | 'UNCONFIRMED' | 'UNDELIVERABLE' | 'CORRECTED' | 'INFERRED' | 'SPELL_CORRECTED'
  message: string
  field?: string
}

export interface AddressValidationResult {
  isValid: boolean
  confidence: ValidationConfidence
  standardizedAddress: StandardizedAddress
  formattedAddress: string
  geocode: {
    latitude: number
    longitude: number
  }
  issues: AddressIssue[]
  uspsData?: {
    standardizedAddress: string
    deliveryPointBarcode?: string
    carrierRoute?: string
  }
}

export interface ValidateAddressRequest {
  /** Single-line or multi-line address string(s). */
  address: string | string[]
}
