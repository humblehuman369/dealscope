'use client'

/**
 * Pulsating IQ logo — replaces spinner during property analysis loading.
 * Renders the DealGapIQ icon breathing (scale + opacity) until the Verdict renders.
 */

export function IQLoadingLogo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <img
        src="/DealGapIQ_Icon_Transparent_1024.png"
        alt="DealGapIQ"
        className="w-24 h-24 animate-pulseSoft"
        style={{ marginTop: -200 }}
      />
    </div>
  )
}
