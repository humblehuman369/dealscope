'use client'

/**
 * Pulsating IQ logo — replaces spinner during property analysis loading.
 * Renders a centered, gently pulsing DealGapIQ icon with a subtle glow.
 * Stays visible until the parent component unmounts (i.e. Verdict renders).
 */

export function IQLoadingLogo({ size = 96 }: { size?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <style>{`
        @keyframes iq-logo-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            filter: drop-shadow(0 0 12px rgba(14,165,233,0.3))
                    drop-shadow(0 0 32px rgba(14,165,233,0.12));
          }
          50% {
            transform: scale(1.08);
            opacity: 0.85;
            filter: drop-shadow(0 0 24px rgba(14,165,233,0.5))
                    drop-shadow(0 0 56px rgba(14,165,233,0.2));
          }
        }
      `}</style>
      <img
        src="/images/iq-logo-icon.png"
        alt="DealGapIQ — analyzing"
        width={size}
        height={size}
        style={{
          animation: 'iq-logo-pulse 2.4s ease-in-out infinite',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
