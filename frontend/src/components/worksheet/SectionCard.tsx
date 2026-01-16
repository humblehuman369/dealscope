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
interface DataRowProps {
  label: string
  children: ReactNode
  icon?: ReactNode
  isTotal?: boolean
  isHighlight?: boolean
  hasSlider?: boolean
  className?: string
}

export function DataRow({
  label,
  children,
  icon,
  isTotal = false,
  isHighlight = false,
  hasSlider = false,
  className = '',
}: DataRowProps) {
  return (
    <div className={`data-row ${isTotal ? 'total' : ''} ${isHighlight ? 'highlight' : ''} ${hasSlider ? 'has-slider' : ''} ${className}`}>
      <div className="data-label">
        {icon && <span className="icon">{icon}</span>}
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

