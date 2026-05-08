/**
 * Activation Arc Phase 3 (C1) — small reusable IQ icon component.
 *
 * Reuses the existing brand mark (`/images/iq-logo-icon.png`) — the head
 * + house + brain glyph the founder originally designed. No face, no
 * cartoon styling; the icon is a labeled chip used to attribute UI moments
 * to "IQ" without crossing into mascot territory. See
 * docs/feature-plans/ACTIVATION_ARC.md §6/C1 for the doctrine.
 */

import Image from 'next/image'

export interface IQIconProps {
  /** Pixel size (square). Defaults to 16px — the chip-inline size. */
  size?: number
  /** Optional aria-label override; defaults to "IQ". */
  ariaLabel?: string
  /** When true, the icon renders inline-block rather than block. */
  inline?: boolean
}

export function IQIcon({ size = 16, ariaLabel = 'IQ', inline = true }: IQIconProps) {
  return (
    <Image
      src="/images/iq-logo-icon.png"
      alt={ariaLabel}
      width={size}
      height={size}
      style={{
        display: inline ? 'inline-block' : 'block',
        verticalAlign: 'middle',
        objectFit: 'contain',
      }}
      // The icon decorates labeled UI; the parent's text provides the
      // actual semantic content. Keeping unoptimized=true avoids the
      // optimizer adding a large delay on first render in dev — the
      // PNG is already small.
      unoptimized
    />
  )
}
