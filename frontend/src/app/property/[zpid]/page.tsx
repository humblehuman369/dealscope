import { Suspense } from 'react'
import { PropertyDetailsSkeleton } from '@/components/property-details'
import PropertyPage from './PropertyPage'

export function generateStaticParams() {
  return []
}

export default function PropertyDetailsRoute() {
  return (
    <Suspense fallback={<PropertyDetailsSkeleton />}>
      <PropertyPage />
    </Suspense>
  )
}
