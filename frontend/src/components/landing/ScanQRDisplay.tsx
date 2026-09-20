import { BRAND_ASSETS } from '@/lib/brand'
import { SCAN_QR_ALT, SCAN_QR_MARK_SIZE_PX, SCAN_QR_SIZE_PX } from '@/lib/scanQr'

const MARK_PAD_PX = 32

/** Theme-safe QR frame: black modules on white so a phone camera can read it. */
export function ScanQRDisplay({ svg }: { svg: string }) {
  return (
    <div
      className="relative inline-flex rounded-lg bg-white p-2"
      role="img"
      aria-label={SCAN_QR_ALT}
    >
      <span className="sr-only">{SCAN_QR_ALT}</span>
      <div
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        style={{ width: SCAN_QR_SIZE_PX, height: SCAN_QR_SIZE_PX }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white"
        style={{ width: MARK_PAD_PX, height: MARK_PAD_PX }}
        aria-hidden
      >
        {/* Decorative mark in the quiet center; error correction H covers it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_ASSETS.markOnLight}
          alt=""
          width={SCAN_QR_MARK_SIZE_PX}
          height={SCAN_QR_MARK_SIZE_PX}
        />
      </div>
    </div>
  )
}
