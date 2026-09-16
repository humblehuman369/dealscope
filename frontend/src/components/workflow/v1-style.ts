import type { CSSProperties } from 'react'

/** UI font for every v1 surface. Headings stay DM Sans via the global h1–h6 rule. */
export const V1_UI_FONT = "var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif"

/** Numbers: same font, aligned digits. */
export const V1_NUM: CSSProperties = {
  fontFamily: V1_UI_FONT,
  fontVariantNumeric: 'tabular-nums',
}
