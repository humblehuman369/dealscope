'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function WorksheetRedirect() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  useEffect(() => {
    if (propertyId) {
      router.replace(`/worksheet/${propertyId}/ltr`)
    }
  }, [propertyId, router])

  return null
}
