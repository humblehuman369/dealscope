import type { CSSProperties } from 'react'

/** UI font for every v1 surface — same DM Sans stack as the rest of the product. */
export const V1_UI_FONT = "var(--font-dm-sans), 'DM Sans', -apple-system, system-ui, sans-serif"

/** Numbers: same brand UI font, aligned digits. */
export const V1_NUM: CSSProperties = {
  fontFamily: V1_UI_FONT,
  fontVariantNumeric: 'tabular-nums',
}
