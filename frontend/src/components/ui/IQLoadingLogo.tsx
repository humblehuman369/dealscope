'use client'

/**
 * Pulsating IQ logo — replaces spinner during property analysis loading.
 * Renders the DealGapIQ icon pulsing (scale up / back) until the Verdict renders.
 */

export function IQLoadingLogo({ size = 120 }: { size?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes iq-logo-breathe {
          0%, 100% { transform: scale(1);    opacity: 0.85; }
          50%      { transform: scale(1.12); opacity: 1; }
        }
        .iq-breathe-logo {
          animation: iq-logo-breathe 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
      `}} />
      <img
        className="iq-breathe-logo"
        src="/images/iq-logo-icon.png"
        alt="DealGapIQ — analyzing"
        width={size}
        height={size}
        style={{ objectFit: 'contain', marginTop: -200 }}
      />
    </div>
  )
}
