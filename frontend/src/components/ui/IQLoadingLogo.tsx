'use client'

/**
 * Pulsating IQ logo — replaces spinner during property analysis loading.
 * Renders the DealGapIQ icon breathing (scale + opacity) until the Verdict renders.
 */

export function IQLoadingLogo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <img
        src="/images/iq-icon-pulse.png"
        alt="DealGapIQ"
        className="w-24 h-24 md:w-36 md:h-36 animate-pulseSoft"
        style={{ marginTop: -400 }}
      />
    </div>
  )
}
