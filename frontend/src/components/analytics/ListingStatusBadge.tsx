'use client'

import React from 'react'
import { Home, Key, Clock, AlertTriangle, Gavel, Building2, User, Sparkles } from 'lucide-react'

// Types
export type ListingStatus = 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER'
export type SellerType = 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown'

interface ListingStatusBadgeProps {
  listingStatus?: ListingStatus
  isOffMarket?: boolean
  sellerType?: SellerType
  isForeclosure?: boolean
  isBankOwned?: boolean
  isAuction?: boolean
  isNewConstruction?: boolean
  daysOnMarket?: number
  className?: string
}

/**
 * ListingStatusBadge - Displays property listing status and seller type
 * 
 * Shows status badges like:
 * - FOR_SALE (green), FOR_RENT (blue), PENDING (yellow), OFF_MARKET/SOLD (gray)
 * - Special flags: Foreclosure (red), Bank Owned (orange), Auction (purple), New Construction (cyan)
 * - Days on market indicator
 */
export function ListingStatusBadge({
  listingStatus,
  isOffMarket,
  sellerType,
  isForeclosure,
  isBankOwned,
  isAuction,
  isNewConstruction,
  daysOnMarket,
  className = ''
}: ListingStatusBadgeProps) {
  // Determine the effective status to display
  const effectiveStatus = isOffMarket ? 'OFF_MARKET' : (listingStatus || 'OFF_MARKET')
  
  // Get status badge configuration
  const getStatusConfig = (status: ListingStatus) => {
    switch (status) {
      case 'FOR_SALE':
        return {
          label: 'For Sale',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          icon: Home
        }
      case 'FOR_RENT':
        return {
          label: 'For Rent',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: Key
        }
      case 'PENDING':
        return {
          label: 'Pending',
          bgColor: 'bg-yellow-500',
          textColor: 'text-gray-900',
          icon: Clock
        }
      case 'SOLD':
        return {
          label: 'Sold',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          icon: Home
        }
      case 'OFF_MARKET':
      default:
        return {
          label: 'Off Market',
          bgColor: 'bg-gray-400',
          textColor: 'text-white',
          icon: Home
        }
    }
  }
  
  const statusConfig = getStatusConfig(effectiveStatus)
  const StatusIcon = statusConfig.icon

  // Determine special seller type badges
  const specialBadges: { label: string; bgColor: string; textColor: string; icon: React.ComponentType<{ className?: string }> }[] = []
  
  if (isForeclosure || sellerType === 'Foreclosure') {
    specialBadges.push({
      label: 'Foreclosure',
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      icon: AlertTriangle
    })
  }
  
  if (isBankOwned || sellerType === 'BankOwned') {
    specialBadges.push({
      label: 'Bank Owned',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      icon: Building2
    })
  }
  
  if (isAuction || sellerType === 'Auction') {
    specialBadges.push({
      label: 'Auction',
      bgColor: 'bg-purple-500',
      textColor: 'text-white',
      icon: Gavel
    })
  }
  
  if (isNewConstruction || sellerType === 'NewConstruction') {
    specialBadges.push({
      label: 'New Construction',
      bgColor: 'bg-cyan-500',
      textColor: 'text-white',
      icon: Sparkles
    })
  }
  
  if (sellerType === 'FSBO') {
    specialBadges.push({
      label: 'FSBO',
      bgColor: 'bg-indigo-500',
      textColor: 'text-white',
      icon: User
    })
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Primary Listing Status Badge */}
      <span 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
      >
        <StatusIcon className="w-3.5 h-3.5" />
        {statusConfig.label}
      </span>
      
      {/* Special Seller Type Badges */}
      {specialBadges.map((badge, index) => {
        const BadgeIcon = badge.icon
        return (
          <span 
            key={index}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bgColor} ${badge.textColor}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            {badge.label}
          </span>
        )
      })}
      
      {/* Days on Market - only show for active listings */}
      {!isOffMarket && daysOnMarket !== undefined && daysOnMarket > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <Clock className="w-3 h-3" />
          {daysOnMarket} days
        </span>
      )}
    </div>
  )
}

/**
 * Compact version of the listing status badge for use in smaller spaces
 */
export function ListingStatusBadgeCompact({
  listingStatus,
  isOffMarket,
  sellerType,
  isForeclosure,
  className = ''
}: Pick<ListingStatusBadgeProps, 'listingStatus' | 'isOffMarket' | 'sellerType' | 'isForeclosure' | 'className'>) {
  const effectiveStatus = isOffMarket ? 'OFF_MARKET' : (listingStatus || 'OFF_MARKET')
  
  const getStatusDot = (status: ListingStatus) => {
    switch (status) {
      case 'FOR_SALE': return 'bg-green-500'
      case 'FOR_RENT': return 'bg-blue-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'SOLD': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }
  
  const getStatusLabel = (status: ListingStatus) => {
    switch (status) {
      case 'FOR_SALE': return 'For Sale'
      case 'FOR_RENT': return 'For Rent'
      case 'PENDING': return 'Pending'
      case 'SOLD': return 'Sold'
      default: return 'Off Market'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${getStatusDot(effectiveStatus)}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {getStatusLabel(effectiveStatus)}
      </span>
      {(isForeclosure || sellerType === 'Foreclosure') && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          Foreclosure
        </span>
      )}
    </div>
  )
}

export default ListingStatusBadge
