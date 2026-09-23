import { BRAND_ASSETS } from '@/lib/brand'
import { SCAN_QR_ALT, SCAN_QR_MARK_SIZE_PX, SCAN_QR_SIZE_PX } from '@/lib/scanQr'

const DEFAULT_MARK_PAD_PX = 32
const COMPACT_MARK_PAD_PX = 16
const COMPACT_MARK_SIZE_PX = 14

/** Theme-safe QR frame: black modules on white so a phone camera can read it. */
export function ScanQRDisplay({
  svg,
  size = SCAN_QR_SIZE_PX,
  framed = true,
  alt = SCAN_QR_ALT,
  showMark = true,
}: {
  svg: string
  size?: number
  framed?: boolean
  alt?: string
  showMark?: boolean
}) {
  const compact = size <= 80
  const markPad = compact ? COMPACT_MARK_PAD_PX : DEFAULT_MARK_PAD_PX
  const markSize = compact ? COMPACT_MARK_SIZE_PX : SCAN_QR_MARK_SIZE_PX

  return (
    <div
      className={framed ? 'relative inline-flex rounded-lg bg-white p-2' : 'relative inline-flex'}
      role="img"
      aria-label={alt}
    >
      <span className="sr-only">{alt}</span>
      <div
        className="[&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {showMark ? (
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white"
          style={{ width: markPad, height: markPad }}
          aria-hidden
        >
          {/* Decorative mark in the quiet center; error correction H covers it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_ASSETS.markOnLight}
            alt=""
            width={markSize}
            height={markSize}
          />
        </div>
      ) : null}
    </div>
  )
}
