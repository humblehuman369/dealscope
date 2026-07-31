// Offer Tracker — mirrors backend app/schemas/offer.py

export type OfferStatus =
  | 'draft'
  | 'submitted'
  | 'countered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'

export interface PropertyOffer {
  id: string
  saved_property_id: string
  /** Serialized Decimal — parse with parseFloat for display. */
  amount: string | number
  counter_amount: string | number | null
  status: OfferStatus
  offer_date: string
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PropertyOfferCreate {
  amount: number
  status?: OfferStatus
  counter_amount?: number | null
  offer_date?: string | null
  expires_at?: string | null
  notes?: string | null
}

export interface PropertyOfferUpdate {
  amount?: number
  status?: OfferStatus
  counter_amount?: number | null
  offer_date?: string | null
  expires_at?: string | null
  notes?: string | null
}
