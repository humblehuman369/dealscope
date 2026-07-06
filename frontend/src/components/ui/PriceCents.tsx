import React from 'react'

/**
 * Renders a price string with cents as a smaller superscript.
 *
 * The decimal point is kept in the output: without it the text content of
 * "$29.17" is "$2917", which is what screen readers announce, what copy/paste
 * produces, and what users misread when the superscript styling is subtle
 * (the "annual Pro shows $2,917/mo" bug).
 *
 *   <PriceCents>29.17</PriceCents>   →  29.<sup>17</sup>
 *   <PriceCents>$39.99</PriceCents>  →  $39.<sup>99</sup>
 *   <PriceCents>Free</PriceCents>    →  Free  (passthrough)
 */
export function PriceCents({ children }: { children: string }) {
  const dot = children.indexOf('.')
  if (dot === -1) return <>{children}</>

  const dollars = children.slice(0, dot)
  const cents = children.slice(dot + 1)

  return (
    <>
      {dollars}.
      <span
        style={{
          fontSize: '0.45em',
          verticalAlign: 'super',
          fontWeight: 'inherit',
          letterSpacing: '0',
        }}
      >
        {cents}
      </span>
    </>
  )
}
