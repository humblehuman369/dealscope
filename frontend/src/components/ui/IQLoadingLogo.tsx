'use client'

/**
 * Pulsating IQ logo — replaces spinner during property analysis loading.
 * Renders the DealGapIQ icon pulsing (scale up / back) until the Verdict renders.
 */

export function IQLoadingLogo({ size = 96 }: { size?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes iq-logo-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        .iq-pulse-logo {
          animation: iq-logo-pulse 1.4s ease-in-out infinite;
        }
      `}} />
      <img
        className="iq-pulse-logo"
        src="/images/iq-logo-icon.png"
        alt="DealGapIQ — analyzing"
        width={size}
        height={size}
        style={{ objectFit: 'contain', marginTop: -200 }}
      />
    </div>
  )
}
