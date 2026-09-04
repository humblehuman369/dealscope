'use client'

import React from 'react'
import Image from 'next/image'
import { brandMark } from '@/lib/brand'

interface IQBrainIconProps {
  size?: number
  className?: string
  /** Surface the icon sits on: 'dark' → cyan + white mark, 'light' → cyan + black mark */
  mode?: 'dark' | 'light'
}

/**
 * IQ Brain Icon - the DealGapIQ head + house mark (see public/brand).
 * Represents "real estate on the brain" - the genius investment advisor.
 */
export function IQBrainIcon({ size = 20, className = '', mode = 'dark' }: IQBrainIconProps) {
  return (
    <Image
      src={brandMark(mode)}
      alt="IQ - Real Estate on the Brain"
      width={size}
      height={size}
      className={`iq-brain-icon ${className}`}
    />
  )
}

export default IQBrainIcon
