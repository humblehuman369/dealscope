import { ScanQRDisplay } from '@/components/landing/ScanQRDisplay'
import { generateScanQrSvg } from '@/lib/scanQrSvg'
import { scanQrUrl, type ScanQrSource } from '@/lib/scanQr'

export async function ScanQR({
  src,
  size,
  framed = true,
}: {
  src: ScanQrSource
  size?: number
  framed?: boolean
}) {
  const svg = await generateScanQrSvg(scanQrUrl(src))
  return <ScanQRDisplay svg={svg} size={size} framed={framed} />
}
