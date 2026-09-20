'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import HomeScannerIsland from '@/app/_components/HomeScannerIsland'
import { ScanDesktopPanel } from '@/app/scan/ScanDesktopPanel'
import { isCapacitor } from '@/lib/env'
import { isMobileScanDevice, parseScanSource, type ScanSource } from '@/lib/scanQr'

export default function ScanClient({
  prefersCamera,
  qr,
}: {
  prefersCamera: boolean
  qr: ReactNode
}) {
  const router = useRouter()
  const [useCamera, setUseCamera] = useState(prefersCamera)
  const [scanSource, setScanSource] = useState<ScanSource>(
    isCapacitor() ? 'app' : 'header',
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fallback: ScanSource = isCapacitor() ? 'app' : 'header'
    setScanSource(parseScanSource(params.get('src'), fallback))
    if (isCapacitor() || isMobileScanDevice()) {
      setUseCamera(true)
    }
  }, [])

  if (useCamera) {
    return (
      <HomeScannerIsland
        scanSource={scanSource}
        onSwitchMode={() => router.push('/')}
      />
    )
  }

  return <ScanDesktopPanel qr={qr} />
}
