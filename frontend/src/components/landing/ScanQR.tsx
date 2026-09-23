import { ScanQRDisplay } from '@/components/landing/ScanQRDisplay'
import { generateScanQrSvg } from '@/lib/scanQrSvg'
import { scanQrUrl, type ScanQrSource } from '@/lib/scanQr'

export async function ScanQR({
  src,
  size,
  framed = true,
  alt,
  url,
}: {
  src: ScanQrSource
  size?: number
  framed?: boolean
  alt?: string
  /** Overrides the encoded payload. The homepage passes the site root. */
  url?: string
}) {
  const svg = await generateScanQrSvg(url ?? scanQrUrl(src))
  // A center mark on the 72px homepage code covers too many modules to scan.
  const showMark = (size ?? 148) > 80
  return <ScanQRDisplay svg={svg} size={size} framed={framed} alt={alt} showMark={showMark} />
}
