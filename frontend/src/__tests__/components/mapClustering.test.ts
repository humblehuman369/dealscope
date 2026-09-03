import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'
import { classifyListings } from '@/lib/dealSignal'
import { CLUSTER_PIN_THRESHOLD, clusterListings } from '@/components/map-search/mapClustering'

const BOUNDS = { north: 27.48, south: 27.38, east: -80.28, west: -80.38 }

function listing(overrides: Partial<MapListing> & { id: string }): MapListing {
  return {
    address: `${overrides.id} Test St`,
    city: 'Fort Pierce',
    state: 'FL',
    zip_code: '34981',
    latitude: 27.43,
    longitude: -80.33,
    price: 300000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    property_type: 'Single Family',
    listing_status: 'FOR_SALE',
    photo_url: null,
    source: 'rentcast',
    days_on_market: 5,
    year_built: 1995,
    ...overrides,
  }
}

/** N listings piled onto one spot, so they land in a single grid cell. */
function pile(count: number, overrides: Partial<MapListing> = {}): MapListing[] {
  return Array.from({ length: count }, (_, i) =>
    listing({ id: `p${i}`, latitude: 27.43, longitude: -80.33, ...overrides }),
  )
}

function signals(listings: MapListing[]): Map<string, DealSignalResult> {
  return classifyListings(listings)
}

describe('clusterListings', () => {
  it('leaves a sparse viewport alone — the price on each pin is the point', () => {
    const listings = pile(CLUSTER_PIN_THRESHOLD - 1)

    const { singles, clusters } = clusterListings(listings, signals(listings), BOUNDS)

    expect(clusters).toHaveLength(0)
    expect(singles).toHaveLength(listings.length)
  })

  it('collapses a dense cell into one bubble', () => {
    const listings = pile(CLUSTER_PIN_THRESHOLD + 20)

    const { singles, clusters } = clusterListings(listings, signals(listings), BOUNDS)

    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(listings.length)
    expect(singles).toHaveLength(0)
  })

  it('keeps a lone pin in a cell as a price pill, not a bubble of one', () => {
    const listings = [
      ...pile(CLUSTER_PIN_THRESHOLD),
      // Opposite corner of the viewport — its own cell.
      listing({ id: 'lonely', latitude: 27.475, longitude: -80.375 }),
    ]

    const { singles, clusters } = clusterListings(listings, signals(listings), BOUNDS)

    expect(singles.map((l) => l.id)).toEqual(['lonely'])
    expect(clusters).toHaveLength(1)
  })

  it('paints the cluster with the strongest signal inside it', () => {
    // The whole point: one foreclosure must not be averaged away by the
    // ordinary active listings it sits among.
    const listings = [
      ...pile(CLUSTER_PIN_THRESHOLD + 5),
      listing({
        id: 'distressed',
        latitude: 27.43,
        longitude: -80.33,
        listing_status: 'PRE_FORECLOSURE',
      }),
    ]

    const { clusters } = clusterListings(listings, signals(listings), BOUNDS)

    expect(clusters).toHaveLength(1)
    expect(clusters[0].category).toBe('distressed')
  })

  it('does not cluster without bounds to size the cells against', () => {
    const listings = pile(CLUSTER_PIN_THRESHOLD + 20)

    const { singles, clusters } = clusterListings(listings, signals(listings), null)

    expect(clusters).toHaveLength(0)
    expect(singles).toHaveLength(listings.length)
  })

  it('accounts for every listing exactly once', () => {
    const listings = [
      ...pile(CLUSTER_PIN_THRESHOLD),
      listing({ id: 'a', latitude: 27.40, longitude: -80.36 }),
      listing({ id: 'b', latitude: 27.46, longitude: -80.30 }),
    ]

    const { singles, clusters } = clusterListings(listings, signals(listings), BOUNDS)

    const seen = [...singles, ...clusters.flatMap((c) => c.listings)].map((l) => l.id)
    expect(new Set(seen).size).toBe(listings.length)
  })
})
