import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Home } from 'lucide-react'
import { WORKSHEET_STRATEGIES, WorksheetStrategyId } from '@/constants/worksheetStrategies'

interface StrategyDropdownProps {
  propertyId: string
  activeStrategy: WorksheetStrategyId
}

export function StrategyDropdown({ propertyId, activeStrategy }: StrategyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const active = WORKSHEET_STRATEGIES.find((strategy) => strategy.id === activeStrategy)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [])

  const handleSelect = (strategyId: WorksheetStrategyId) => {
    setIsOpen(false)
    if (strategyId === activeStrategy) return
    router.push(`/worksheet/${propertyId}/${strategyId}`)
  }

  return (
    <div className="strategy-dropdown" ref={dropdownRef}>
      <button
        className="strategy-dropdown-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-haspopup="menu"
      >
        <Home className="w-4 h-4" />
        <span>{active?.shortName ?? 'Worksheet'}</span>
        <ChevronDown className={`dropdown-arrow ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="strategy-dropdown-menu">
          <div className="strategy-dropdown-header">Select Strategy</div>
          {WORKSHEET_STRATEGIES.map((strategy) => (
            <button
              key={strategy.id}
              type="button"
              onClick={() => handleSelect(strategy.id)}
              className={`strategy-option ${strategy.id === activeStrategy ? 'active' : ''}`}
            >
              <div className="strategy-option-content">
                <div className="strategy-option-name">{strategy.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
