'use client'

import React, { useEffect } from 'react'
import { DealGapIQHomepageV4 } from '@/components/landing'

export default function HomePageClient() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('scan') !== 'true') return
    params.delete('scan')
    const qs = params.toString()
    window.location.replace(qs ? `/scan?${qs}` : '/scan')
  }, [])

  return <DealGapIQHomepageV4 />
}
