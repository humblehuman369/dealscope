export type DirectoryEntityType = 'lender' | 'buyer'

/** Display fields persisted when saving a directory contact. */
export interface DirectoryContactSnapshot {
  company?: string
  owner?: string
  phone?: string | null
  email?: string | null
  website?: string | null
  city?: string | null
  state?: string | null
  states_served?: string[]
  loan_products?: string[]
  loan_range?: string | null
  strategies?: string[]
  coverage?: string[]
  description?: string | null
  contact_type?: string | null
}

export interface SavedDirectoryContact {
  id: string
  user_id: string
  entity_type: DirectoryEntityType
  entity_id: number
  snapshot: DirectoryContactSnapshot
  created_at: string
}

export interface SavedDirectoryContactList {
  items: SavedDirectoryContact[]
  total: number
}

export interface SavedDirectoryContactCheck {
  is_saved: boolean
  saved_contact_id: string | null
}

export function buildLenderSnapshot(lender: {
  company_name: string
  phone?: string | null
  email?: string | null
  website?: string
  city?: string | null
  state?: string | null
  states_served?: string[]
  loan_products?: string[]
  contact_type?: string
  description?: string | null
  display?: { loan_range?: string | null }
}): DirectoryContactSnapshot {
  return {
    company: lender.company_name,
    phone: lender.phone ?? null,
    email: lender.email ?? null,
    website: lender.website ?? null,
    city: lender.city ?? null,
    state: lender.state ?? null,
    states_served: lender.states_served ?? [],
    loan_products: lender.loan_products ?? [],
    loan_range: lender.display?.loan_range ?? null,
    contact_type: lender.contact_type ?? null,
    description: lender.description ?? null,
  }
}

export function buildBuyerSnapshot(buyer: {
  company: string
  owner?: string
  phone?: string
  email?: string
  website?: string
  city?: string
  state?: string
  strategies?: string[]
  coverage?: string[]
  description?: string
}): DirectoryContactSnapshot {
  return {
    company: buyer.company,
    owner: buyer.owner,
    phone: buyer.phone ?? null,
    email: buyer.email ?? null,
    website: buyer.website ?? null,
    city: buyer.city ?? null,
    state: buyer.state ?? null,
    strategies: buyer.strategies ?? [],
    coverage: buyer.coverage ?? [],
    description: buyer.description ?? null,
  }
}

export function snapshotCompany(snapshot: DirectoryContactSnapshot): string {
  return snapshot.company?.trim() || 'Unknown'
}
