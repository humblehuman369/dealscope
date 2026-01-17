'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SectionCardProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  headerRight?: ReactNode
  badge?: string
  isHighlighted?: boolean
}

export function SectionCard({
  title,
  children,
  defaultOpen = true,
  className = '',
  headerRight,
  badge,
  isHighlighted = false,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`section-card ${isHighlighted ? 'highlighted' : ''} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`section-header w-full ${isHighlighted ? 'brrrr-highlight' : ''}`}
      >
        <span className={`section-title ${isHighlighted ? 'brrrr' : ''}`}>{title}</span>
        <div className="flex items-center gap-2">
          {badge && <span className="section-badge">{badge}</span>}
          {headerRight}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--ws-text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--ws-text-muted)]" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  )
}

// Data row component for consistent styling
// Layout: Label (left) | Slider/Value (right-aligned)
interface DataRowProps {
  label: string
  children: ReactNode
  icon?: ReactNode
  isTotal?: boolean
  isHighlight?: boolean
  hasSlider?: boolean
  /** Read-only calculated value - lighter styling, no border */
  isCalculated?: boolean
  className?: string
}

export function DataRow({
  label,
  children,
  icon,
  isTotal = false,
  isHighlight = false,
  hasSlider = false,
  isCalculated = false,
  className = '',
}: DataRowProps) {
  const rowClasses = [
    'data-row',
    isTotal ? 'total' : '',
    isHighlight ? 'highlight' : '',
    hasSlider ? 'has-slider' : '',
    isCalculated ? 'calculated' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={rowClasses}>
      {/* Label - left side, flex-shrink-0 */}
      <div className="data-label flex-shrink-0">
        {icon && <span className="icon">{icon}</span>}
        {label && <span>{label}</span>}
      </div>
      
      {/* Value container - right-aligned, takes remaining space */}
      <div className="data-value-container flex items-center justify-end flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
