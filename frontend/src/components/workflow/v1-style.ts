import type { CSSProperties } from 'react'

/** UI font for every v1 surface. Value set by Step 0. Headings stay DM Sans via globals.css. */
export const V1_UI_FONT = "var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif"

/** Old Discovery card recipe (brand guide 7.2). */
export const V1_CARD: CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-card)',
}

/** Tile with a semantic color: colored border, same glow. */
export function v1Tile(color: string): CSSProperties {
  return {
    background: 'var(--surface-card)',
    border: `1px solid ${color}`,
    boxShadow: 'var(--shadow-card)',
  }
}

/** Number text: inherits the UI font, aligned digits. Inter ships tnum; the served DM Sans file does not. */
export const V1_NUM: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}
