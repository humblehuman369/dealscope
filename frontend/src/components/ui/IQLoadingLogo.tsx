'use client'

import { useTheme } from '@/context/ThemeContext'

interface IQLoadingLogoProps {
  message?: string
}

export function IQLoadingLogo({ message }: IQLoadingLogoProps) {
  const { theme } = useTheme()
  const iconSrc = theme === 'dark'
    ? '/images/dealgapiq-icon-dark.png'
    : '/images/dealgapiq-icon.png'

  return (
    <div className="min-h-screen flex items-center justify-center pb-[20vh] bg-[var(--surface-base)]">
      <div className="flex flex-col items-center gap-4">
        <img
          src={iconSrc}
          alt="DealGapIQ"
          className="w-24 h-24 md:w-36 md:h-36 animate-pulseSoft"
        />
        {message && (
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
