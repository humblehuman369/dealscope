'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Sun, 
  Moon, 
  Camera, 
  Bookmark, 
  Share2, 
  FileText,
  ChevronRight,
  Home,
  Search
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { StrategyId } from './types'
import './property-premium.css'

interface PropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  listPrice: number
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv: number
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
}

interface Strategy {
  id: StrategyId
  number: number
  name: string
  statValue: string
  statLabel: string
  color: 'green' | 'pink' | 'lime' | 'yellow' | 'purple' | 'cyan'
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr',
    number: 1,
    name: 'Long-Term Rental',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: 'green'
  },
  { 
    id: 'str',
    number: 2,
    name: 'Short-Term Rental',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: 'pink'
  },
  { 
    id: 'brrrr',
    number: 3,
    name: 'BRRRR',
    statValue: '∞',
    statLabel: 'Scale',
    color: 'lime'
  },
  { 
    id: 'flip',
    number: 4,
    name: 'Fix & Flip',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: 'yellow'
  },
  { 
    id: 'house_hack',
    number: 5,
    name: 'House Hack',
    statValue: '75%',
    statLabel: 'Savings',
    color: 'purple'
  },
  { 
    id: 'wholesale',
    number: 6,
    name: 'Wholesale',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: 'cyan'
  },
]

// Sample photos for fallback
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop'
]

interface PropertyPremiumPageProps {
  property: PropertyData
  onBack?: () => void
  onSelectStrategy?: (strategyId: StrategyId) => void
  onSave?: () => void
  onShare?: () => void
  onGenerateLOI?: () => void
  onTryItNow?: () => void
  isSaved?: boolean
  isSaving?: boolean
  saveMessage?: string | null
}

/**
 * PropertyPremiumPage - World-class property analysis landing page
 * 
 * Features:
 * - Immersive hero section with property imagery
 * - 6 strategy cards with rich hover effects
 * - Bottom action bar with Save, Generate LOI, Share
 * - Smooth animations and transitions
 */
export function PropertyPremiumPage({
  property,
  onBack,
  onSelectStrategy,
  onSave,
  onShare,
  onGenerateLOI,
  onTryItNow,
  isSaved = false,
  isSaving = false,
  saveMessage = null
}: PropertyPremiumPageProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // Build photo list
  const photos = property.photos && property.photos.length > 0 
    ? property.photos 
    : (property.thumbnailUrl ? [property.thumbnailUrl, ...SAMPLE_PHOTOS.slice(1)] : SAMPLE_PHOTOS)
  const totalPhotos = property.photoCount || photos.length

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const handleSelectStrategy = (strategyId: StrategyId) => {
    if (onSelectStrategy) {
      onSelectStrategy(strategyId)
    }
  }

  const location = `${property.city}, ${property.state} ${property.zipCode}`
  const specs = `${property.bedrooms} bd · ${property.bathrooms} ba · ${property.sqft.toLocaleString()} sqft`

  return (
    <div className="premium-property-page">
      {/* Header */}
      <header className="premium-header">
        <button className="premium-back-btn" onClick={handleBack} aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Link href="/" className="premium-logo">
          Invest<span>IQ</span>
        </Link>
        <div className="premium-header-actions">
          <button 
            className="premium-try-btn"
            onClick={onTryItNow || (() => router.push('/search'))}
          >
            <Search className="w-4 h-4" />
            <span>Try It Now</span>
          </button>
          <button 
            className="premium-theme-btn" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>
        </div>
      </header>

      {/* Photo Section - Clean, no overlays */}
      <div className="premium-photo-section">
        {/* Main Photo */}
        <div className="premium-photo-main">
          {photos[activePhotoIndex] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={photos[activePhotoIndex]} 
              alt={`Property photo ${activePhotoIndex + 1}`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="premium-photo-placeholder">
              <Home className="w-16 h-16 opacity-30" />
            </div>
          )}
          
          {/* Photo Counter Badge */}
          <div className="premium-photo-counter">
            <Camera className="w-4 h-4" />
            <span>{activePhotoIndex + 1}/{totalPhotos}</span>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="premium-thumb-strip">
          {photos.slice(0, 6).map((photo, idx) => (
            <button
              key={idx}
              className={`premium-thumb ${idx === activePhotoIndex ? 'active' : ''}`}
              onClick={() => setActivePhotoIndex(idx)}
              aria-label={`View photo ${idx + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" />
            </button>
          ))}
          {totalPhotos > 6 && (
            <div className="premium-thumb-more">+{totalPhotos - 6}</div>
          )}
        </div>
      </div>

      {/* Property Info Card - Below photo */}
      <div className="premium-info-card">
        <div className="premium-info-left">
          <h1 className="premium-info-address">{property.address}</h1>
          <p className="premium-info-location">{location}</p>
          <p className="premium-info-specs">{specs}</p>
        </div>
        <div className="premium-info-right">
          <div className="premium-info-price">{formatCurrency(property.listPrice)}</div>
          <div className="premium-info-label">List Price</div>
        </div>
      </div>

      {/* Content Section */}
      <div className="premium-content">
        {/* Status */}
        <div className="premium-status">
          <div className="premium-status-dot" />
          <span className="premium-status-text">IQ&apos;s Recommendations</span>
        </div>

        {/* Section Header */}
        <div className="premium-section-header">
          <h2>6 Ways to Profit</h2>
          <p>Select a strategy to view your detailed analysis.</p>
        </div>

        {/* Strategy Grid */}
        <div className="premium-strategy-grid">
          {STRATEGIES.map((strategy) => (
            <button
              key={strategy.id}
              className="premium-strategy-card"
              data-color={strategy.color}
              onClick={() => handleSelectStrategy(strategy.id)}
            >
              <div className="premium-accent-bar" />
              <div className="premium-watermark-number">{strategy.number}</div>
              <div className="premium-card-content">
                <div className="premium-metric">{strategy.statValue}</div>
                <div className="premium-metric-label">{strategy.statLabel}</div>
                <h3 className="premium-strategy-name">{strategy.name}</h3>
              </div>
              <div className="premium-arrow-btn">
                <ChevronRight />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Message Toast */}
      {saveMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-navy-800 dark:bg-white text-white dark:text-navy-900 rounded-lg shadow-lg font-medium text-sm animate-fade-in">
          {saveMessage}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="premium-action-bar">
        <button 
          className={`premium-action-btn ${isSaved ? 'premium-action-btn-saved' : ''}`}
          onClick={onSave} 
          disabled={isSaving}
          aria-label={isSaved ? 'Property saved' : 'Save property'}
        >
          <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
          <span>{isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button className="premium-primary-btn" onClick={onGenerateLOI}>
          <FileText className="w-5 h-5" />
          <span>Generate LOI</span>
        </button>

        <button className="premium-action-btn" onClick={onShare} aria-label="Share property">
          <Share2 className="w-6 h-6" />
          <span>Share</span>
        </button>
      </div>
    </div>
  )
}

export default PropertyPremiumPage

