'use client'

import { useEffect } from 'react'
import { useAppParams } from '@/hooks/useAppNavigation'
import { useRouter } from 'next/navigation'

export default function WorksheetRedirect() {
  const params = useAppParams()
  const router = useRouter()
  const propertyId = params.id as string

  useEffect(() => {
    if (propertyId) {
      router.replace(`/worksheet/${propertyId}/ltr`)
    }
  }, [propertyId, router])

  return null
}
