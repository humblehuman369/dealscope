'use client'

import React, { useState, useEffect } from 'react'
import { DealGapIQHomepageV4 } from '@/components/landing'
import HomeScannerIsland from './HomeScannerIsland'
import type { HeroGeo } from '@/components/landing/home-map-hero/HomeMapHero'

export default function HomePageClient({ geo }: { geo?: HeroGeo | null }) {
  const [mode, setMode] = useState<'landing' | 'camera'>('landing')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('scan') === 'true') {
      setMode('camera')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  if (mode === 'camera') {
    return <HomeScannerIsland onSwitchMode={() => setMode('landing')} />
  }

  return <DealGapIQHomepageV4 onPointAndScan={() => setMode('camera')} geo={geo ?? undefined} />
}
