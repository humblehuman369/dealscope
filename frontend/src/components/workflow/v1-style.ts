import type { CSSProperties } from 'react'

/** UI font for every v1 surface — same DM Sans stack as the rest of the product. */
export const V1_UI_FONT = "var(--font-dm-sans), 'DM Sans', -apple-system, system-ui, sans-serif"

/** Numbers: same brand UI font, aligned digits. */
export const V1_NUM: CSSProperties = {
  fontFamily: V1_UI_FONT,
  fontVariantNumeric: 'tabular-nums',
}

/** Card title, matching the brand "Investment Overview" heading. */
export const V1_TITLE_CLASS = 'm-0 font-bold leading-tight'
export const V1_TITLE_STYLE: CSSProperties = {
  color: 'var(--text-heading)',
  fontSize: 'clamp(18px, 2vw, 24px)',
}

/** Secondary card heading, matching the brand "DATA SOURCES" panel label. */
export const V1_SECTION_CLASS = 'm-0 text-[14px] font-bold uppercase tracking-wide'
export const V1_SECTION_STYLE: CSSProperties = { color: 'var(--text-heading)' }

export const V1_CARD: CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 16,
}

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl text-[14px] font-bold cursor-pointer disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

/** Brand primary CTA: brand blue, white text, 12px corners. */
export const V1_BTN_PRIMARY_CLASS = `${BTN_BASE} border-0 text-white`
export const V1_BTN_PRIMARY_STYLE: CSSProperties = {
  background: 'var(--accent-brand-blue)',
  outlineColor: 'var(--accent-sky)',
}

export const V1_BTN_SECONDARY_CLASS = `${BTN_BASE} bg-transparent`
export const V1_BTN_SECONDARY_STYLE: CSSProperties = {
  border: '1px solid var(--border-default)',
  color: 'var(--text-heading)',
  outlineColor: 'var(--accent-sky)',
}
