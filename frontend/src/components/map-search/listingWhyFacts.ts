import type { MapListing } from '@/lib/api'
import {
  displayListingStatus,
  normalizeListingStatus,
  type CanonicalStatus,
  type DealCategory,
} from '@/lib/dealSignal'

export type WhyFactKind =
  | 'distressed'
  | 'motivated'
  | 'expired'
  | 'owner_listed'
  | 'owner_lead'
  | 'dom'

export type WhyFactTone = WhyFactKind

export interface ListingWhyFact {
  kind: WhyFactKind
  title: string
  detail?: string
  chips?: string[]
  pinTag: string
  tone: WhyFactTone
}

const HIGH_DOM_DAYS = 30
const MAX_MOTIVATED_CHIPS = 3

function motivatedPhrases(listing: MapListing): string[] {
  const raw = listing.motivated_keywords
  if (!raw?.length) return []
  const seen = new Set<string>()
  const phrases: string[] = []
  for (const keyword of raw) {
    const phrase = keyword.trim()
    if (!phrase) continue
    const key = phrase.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    phrases.push(phrase)
    if (phrases.length >= MAX_MOTIVATED_CHIPS) break
  }
  return phrases
}

function isDistressedStatus(
  status: CanonicalStatus,
): status is 'foreclosure' | 'pre-foreclosure' | 'auction' {
  return status === 'foreclosure' || status === 'pre-foreclosure' || status === 'auction'
}

function distressedPinTag(status: 'foreclosure' | 'pre-foreclosure' | 'auction'): string {
  switch (status) {
    case 'foreclosure':
      return 'FC'
    case 'auction':
      return 'Auction'
    case 'pre-foreclosure':
      return 'Pre-FC'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function ownerLeadDetail(listing: MapListing): string | null {
  const parts: string[] = []
  if (listing.owner_occupied === false) parts.push('Absentee')
  if (listing.owner_years != null && Number.isFinite(listing.owner_years)) {
    const years = Math.round(listing.owner_years)
    parts.push(`${years} yr${years === 1 ? '' : 's'} held`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

function delistedYear(listing: MapListing): string | undefined {
  const raw = listing.delisted_date
  if (!raw) return undefined
  const year = String(raw).slice(0, 4)
  return /^\d{4}$/.test(year) ? year : undefined
}

/**
 * Filter-identified reasons this listing is on the map.
 * Strongest first: distressed → motivated → expired → owner listed → owner lead → high DOM.
 * Returns [] for a plain Active listing with no matching fields — never invents a banner.
 */
export function listingWhyFacts(listing: MapListing): ListingWhyFact[] {
  const facts: ListingWhyFact[] = []
  const canonical = normalizeListingStatus(listing.listing_status)

  if (isDistressedStatus(canonical)) {
    facts.push({
      kind: 'distressed',
      title: 'DISTRESSED DEAL',
      detail: displayListingStatus(listing.listing_status),
      pinTag: distressedPinTag(canonical),
      tone: 'distressed',
    })
  }

  const phrases = motivatedPhrases(listing)
  if (phrases.length > 0) {
    facts.push({
      kind: 'motivated',
      title: 'MOTIVATED SELLER',
      chips: phrases,
      pinTag: 'Motivated',
      tone: 'motivated',
    })
  }

  if (canonical === 'expired') {
    const year = delistedYear(listing)
    facts.push({
      kind: 'expired',
      title: 'EXPIRED LISTING',
      detail: year ? `Delisted ${year}` : undefined,
      pinTag: 'Expired',
      tone: 'expired',
    })
  }

  if (canonical === 'owner_listed') {
    facts.push({
      kind: 'owner_listed',
      title: 'OWNER LISTED',
      detail: 'FSBO / no agent',
      pinTag: 'FSBO',
      tone: 'owner_listed',
    })
  }

  const lead = ownerLeadDetail(listing)
  if (lead) {
    facts.push({
      kind: 'owner_lead',
      title: 'OWNER LEAD',
      detail: lead,
      pinTag: 'Owner',
      tone: 'owner_lead',
    })
  }

  const dom = listing.days_on_market
  if (dom != null && Number.isFinite(dom) && dom >= HIGH_DOM_DAYS) {
    facts.push({
      kind: 'dom',
      title: `${Math.round(dom)} DAYS ON MARKET`,
      pinTag: `${Math.round(dom)}d`,
      tone: 'dom',
    })
  }

  return facts
}

export function listingWhyLine(listing: MapListing): string | null {
  const facts = listingWhyFacts(listing)
  if (facts.length === 0) return null
  return facts
    .map((fact) => {
      if (fact.chips && fact.chips.length > 0) {
        return `${fact.title}: ${fact.chips.join(' · ')}`
      }
      if (fact.detail) return `${fact.title} · ${fact.detail}`
      return fact.title
    })
    .join(' · ')
}

export function listingWhyPinTag(listing: MapListing): string | null {
  return listingWhyFacts(listing)[0]?.pinTag ?? null
}

/** Motivated phrases on an otherwise Active-green pin — paint it hot so it does not look like MLS inventory. */
export function listingNeedsMotivatedPinColor(
  listing: MapListing,
  category: DealCategory | undefined,
): boolean {
  return Boolean(motivatedPhrases(listing).length > 0 && category === 'active')
}
