'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import {
  PropertyData,
  PropertyPhotoGallery,
  PropertyHeader,
  KeyFactsGrid,
  PropertyDescription,
  PropertyFeatures,
  PriceHistory,
  TaxHistory,
  NearbySchools,
  ListingInfo,
  LocationMap,
} from './index'

interface PropertyDetailsClientProps {
  property: PropertyData
  initialStrategy?: string
}

/**
 * PropertyDetailsClient — Full property profile page.
 *
 * Core details (facts, description, features, listing) use the same compact
 * layout as the address-bar detail panel. Additional data (gallery, schools,
 * map, price/tax history) renders below in a responsive grid.
 */
export function PropertyDetailsClient({ property, initialStrategy }: PropertyDetailsClientProps) {
  const router = useRouter()
  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  const hasFeatures =
    (property.interiorFeatures?.length ?? 0) > 0 ||
    (property.exteriorFeatures?.length ?? 0) > 0 ||
    (property.appliances?.length ?? 0) > 0 ||
    (property.construction?.length ?? 0) > 0 ||
    !!property.roof ||
    !!property.foundation

  return (
    <div
      className="min-h-screen pb-8 font-['Inter',sans-serif]"
      style={{
        background:
          'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)',
      }}
    >
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-3 mb-6" aria-label="Breadcrumb">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[var(--surface-card-hover)]"
            style={{ color: 'var(--text-heading)' }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--accent-sky)' }}
          >
            Property Details
          </span>
          <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
          <span
            className="text-[10px] uppercase tracking-wide truncate max-w-[200px] sm:max-w-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            {property.address.streetAddress}
          </span>
        </nav>

        {/* Photo Gallery */}
        <PropertyPhotoGallery
          zpid={String(property.zpid)}
          initialImages={property.images}
          views={property.views}
          address={fullAddress}
          latitude={property.latitude}
          longitude={property.longitude}
        />

        {/* Property Header */}
        <div className="mt-6">
          <PropertyHeader property={property} />
        </div>

        {/* Core Details — matches address-bar detail panel design */}
        <div
          className="mt-6 rounded-lg overflow-hidden"
          style={{
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="px-6 sm:px-10 py-5 space-y-5">
            <KeyFactsGrid property={property} />

            {property.description && (
              <PropertyDescription description={property.description} />
            )}

            {hasFeatures && (
              <PropertyFeatures
                interiorFeatures={property.interiorFeatures || []}
                exteriorFeatures={property.exteriorFeatures || []}
                appliances={property.appliances || []}
                construction={property.construction || []}
                roof={property.roof}
                foundation={property.foundation}
                isWaterfront={property.isWaterfront}
                waterfrontFeatures={property.waterfrontFeatures}
              />
            )}

            <ListingInfo property={property} />
          </div>
        </div>

        {/* Additional Data — schools, map, price & tax history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {property.schools && property.schools.length > 0 && (
            <NearbySchools schools={property.schools} />
          )}

          <LocationMap
            latitude={property.latitude}
            longitude={property.longitude}
            address={fullAddress}
          />

          {property.taxHistory && property.taxHistory.length > 0 && (
            <TaxHistory history={property.taxHistory} />
          )}

          {property.priceHistory && property.priceHistory.length > 0 && (
            <PriceHistory history={property.priceHistory} />
          )}
        </div>
      </div>
    </div>
  )
}
