'use client'

import { useWorksheetStore } from '@/stores/worksheetStore'
import {
  Home,
  FileText,
  Image,
  MapPin,
  BarChart3,
  TrendingUp,
  DollarSign,
  Building2,
  FileSearch,
  Users,
  Calculator,
  Share2,
  ChevronLeft,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { SavedProperty, getShortAddress, getCityStateZip } from '@/types/savedProperty'

interface WorksheetSidebarProps {
  property: SavedProperty
  isOpen: boolean
  onClose: () => void
}

interface SidebarItem {
  id: string
  label: string
  icon: React.ElementType
  section?: string
  disabled?: boolean
  href?: string
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
}

export function WorksheetSidebar({ property, isOpen, onClose }: WorksheetSidebarProps) {
  const { activeSection, setActiveSection } = useWorksheetStore()
  const propertyData = property.property_data_snapshot || {}

  const sections: SidebarSection[] = [
    {
      title: '',
      items: [
        { id: 'back', label: 'View all properties', icon: ChevronLeft, href: '/dashboard' },
      ],
    },
    {
      title: 'Property Info',
      items: [
        { id: 'description', label: 'Property Description', icon: FileText, disabled: true },
        { id: 'purchase', label: 'Purchase Worksheet', icon: DollarSign, section: 'analysis' },
        { id: 'photos', label: 'Photos', icon: Image, disabled: true },
        { id: 'map', label: 'Map', icon: MapPin, disabled: true },
      ],
    },
    {
      title: 'Analysis',
      items: [
        { id: 'analysis', label: 'Property Analysis', icon: BarChart3, section: 'analysis' },
        { id: 'projections', label: 'Buy & Hold Projections', icon: TrendingUp, section: 'projections' },
      ],
    },
    {
      title: 'Research',
      items: [
        { id: 'sales-comps', label: 'Sales Comps & ARV', icon: Building2, section: 'sales-comps' },
        { id: 'rental-comps', label: 'Rental Comps & Rent', icon: DollarSign, disabled: true },
        { id: 'records', label: 'Records & Listings', icon: FileSearch, disabled: true },
        { id: 'owner', label: 'Owner Lookup', icon: Users, disabled: true },
      ],
    },
    {
      title: 'Tools',
      items: [
        { id: 'offer', label: 'Offer Calculator', icon: Calculator, disabled: true },
        { id: 'reports', label: 'Reports & Sharing', icon: Share2, disabled: true },
      ],
    },
  ]

  const handleItemClick = (item: SidebarItem) => {
    if (item.disabled) return
    if (item.section) {
      setActiveSection(item.section)
    }
    onClose()
  }

  return (
    <aside className={`worksheet-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Property Card */}
      <div className="p-4 border-b border-[var(--ws-border)]">
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 p-1 hover:bg-[var(--ws-bg-alt)] rounded"
        >
          <X className="w-5 h-5 text-[var(--ws-text-secondary)]" />
        </button>
        
        <div className="flex items-start gap-3">
          {/* Property thumbnail */}
          <div className="w-12 h-12 rounded-lg bg-[var(--ws-accent-light)] flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-[var(--ws-accent)]" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--ws-text-primary)] text-sm truncate">
              {getShortAddress(property)}
            </h3>
            <p className="text-xs text-[var(--ws-text-secondary)]">
              {getCityStateZip(property)}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--ws-text-muted)]">
              <span>{propertyData.bedrooms || 0} BR</span>
              <span>•</span>
              <span>{propertyData.bathrooms || 0} BA</span>
              <span>•</span>
              <span>{(propertyData.sqft || 0).toLocaleString()} Sq.Ft.</span>
            </div>
          </div>
        </div>
        
        {/* Price and cap rate */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-bold text-[var(--ws-text-primary)]">
            ${(propertyData.listPrice || 0).toLocaleString()}
          </span>
          <span className="text-[var(--ws-text-secondary)]">
            {/* Cap rate will be calculated */}
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="py-2">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="sidebar-section">
            {section.title && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = item.section === activeSection
              
              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="sidebar-item"
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                )
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`sidebar-item w-full text-left ${isActive ? 'active' : ''} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                  {item.disabled && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[var(--ws-bg-alt)] rounded text-[var(--ws-text-muted)]">
                      Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

