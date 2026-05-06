/**
 * PropertyContact — single source of truth, mirrors backend
 * ``app.schemas.contact``.
 */

export type ContactRole =
  | 'seller'
  | 'listing_agent'
  | 'buyer_agent'
  | 'lender'
  | 'contractor'
  | 'inspector'
  | 'attorney'
  | 'title_company'
  | 'insurance'
  | 'property_manager'
  | 'other'

export interface PropertyContact {
  id: string
  saved_property_id: string
  name: string
  role: ContactRole
  company: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PropertyContactCreate {
  name: string
  role?: ContactRole
  company?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

export interface PropertyContactUpdate {
  name?: string
  role?: ContactRole
  company?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
}

/** Display labels keyed by enum value. */
export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  seller: 'Seller',
  listing_agent: 'Listing Agent',
  buyer_agent: 'Buyer Agent',
  lender: 'Lender',
  contractor: 'Contractor',
  inspector: 'Inspector',
  attorney: 'Attorney',
  title_company: 'Title Co.',
  insurance: 'Insurance',
  property_manager: 'Property Mgr',
  other: 'Other',
}

/** Roles in the order presented in the role select dropdown. */
export const CONTACT_ROLES_ORDERED: ContactRole[] = [
  'seller',
  'listing_agent',
  'buyer_agent',
  'lender',
  'contractor',
  'inspector',
  'attorney',
  'title_company',
  'insurance',
  'property_manager',
  'other',
]
