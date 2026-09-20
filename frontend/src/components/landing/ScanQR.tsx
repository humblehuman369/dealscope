import { ScanQRDisplay } from '@/components/landing/ScanQRDisplay'
import { generateScanQrSvg } from '@/lib/scanQrSvg'
import { scanQrUrl, type ScanQrSource } from '@/lib/scanQr'

export async function ScanQR({ src }: { src: ScanQrSource }) {
  const svg = await generateScanQrSvg(scanQrUrl(src))
  return <ScanQRDisplay svg={svg} />
}
