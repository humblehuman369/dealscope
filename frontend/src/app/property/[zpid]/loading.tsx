import { PropertyDetailsSkeleton } from '@/components/property-details'

/**
 * Loading State for Property Details Page
 * 
 * Automatically shown by Next.js while the page is loading.
 */
export default function Loading() {
  return <PropertyDetailsSkeleton />
}
