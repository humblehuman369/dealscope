'use client'

import React from 'react'
import { ListingStatus, SellerType } from '@/types/savedProperty'
import { formatCurrency } from '@/utils/formatters'

interface PropertyStatusPillsProps {
  listingStatus?: ListingStatus
  isOffMarket?: boolean
  listPrice?: number
  zestimate?: number
  sellerType?: SellerType
  isForeclosure?: boolean
  isBankOwned?: boolean
  isAuction?: boolean
  isNewConstruction?: boolean
  daysOnMarket?: number
  className?: string
}

/**
 * PropertyStatusPills - Displays listing status, price, and seller info in the header
 * 
 * Three pills showing:
 * 1. Status (For Sale/For Rent/Off-Market) with optional Active/Under Contract indicator
 * 2. Price (List Price or Est. Value)
 * 3. Owner type (Individual/Corporate/Bank Owned/etc.)
 */
export function PropertyStatusPills({
  listingStatus = 'OFF_MARKET',
  isOffMarket = true,
  listPrice,
  zestimate,
  sellerType,
  isForeclosure,
  isBankOwned,
  isAuction,
  isNewConstruction,
  daysOnMarket,
  className = '',
}: PropertyStatusPillsProps) {
  // Determine status display
  const getStatusDisplay = () => {
    if (listingStatus === 'FOR_SALE') return 'For Sale'
    if (listingStatus === 'FOR_RENT') return 'For Rent'
    if (listingStatus === 'SOLD') return 'Sold'
    if (listingStatus === 'PENDING') return 'Pending'
    return 'Off-Market'
  }

  // Determine if we should show sub-status (Active/Under Contract)
  const showSubStatus = listingStatus === 'FOR_SALE' || listingStatus === 'FOR_RENT'
  const isUnderContract = listingStatus === 'PENDING'
  const subStatusLabel = isUnderContract ? 'Under Contract' : 'Active'

  // Determine price label and value
  const isActivelyListed = !isOffMarket && (listingStatus === 'FOR_SALE' || listingStatus === 'FOR_RENT')
  const priceLabel = isActivelyListed ? 'LIST PRICE' : 'EST. VALUE'
  const priceValue = isActivelyListed && listPrice ? listPrice : (zestimate || listPrice || 0)

  // Determine seller display
  const getSellerDisplay = () => {
    if (isBankOwned || sellerType === 'BankOwned') return 'Bank Owned'
    if (isForeclosure || sellerType === 'Foreclosure') return 'Foreclosure'
    if (isAuction || sellerType === 'Auction') return 'Auction'
    if (isNewConstruction || sellerType === 'NewConstruction') return 'New Construction'
    if (sellerType === 'FSBO') return 'FSBO'
    if (sellerType === 'Agent') return 'Individual'
    return 'Individual'
  }

  // Determine if seller type is a warning (bank owned, foreclosure, auction)
  const isWarningSellerType = isBankOwned || isForeclosure || isAuction || 
    sellerType === 'BankOwned' || sellerType === 'Foreclosure' || sellerType === 'Auction'

  // Status pill is teal for active listings, gray for off-market
  const isActiveListing = listingStatus === 'FOR_SALE' || listingStatus === 'FOR_RENT'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Pill */}
      <div className={`rounded-lg px-4 py-2 ${
        isActiveListing 
          ? 'bg-[rgba(8,145,178,0.12)]' 
          : 'bg-slate-100'
      }`}>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          STATUS
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-sm font-semibold ${
            isActiveListing ? 'text-[#0EA5E9]' : 'text-slate-600'
          }`}>
            {getStatusDisplay()}
          </span>
          {showSubStatus && (
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                isUnderContract ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className={`text-xs font-medium ${
                isUnderContract ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {subStatusLabel}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Price Pill */}
      <div className="rounded-lg px-4 py-2 bg-slate-100">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          {priceLabel}
        </div>
        <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
          {priceValue > 0 ? formatCurrency(priceValue) : '—'}
        </div>
      </div>

      {/* Owner Pill */}
      <div className={`rounded-lg px-4 py-2 ${
        isWarningSellerType 
          ? 'bg-[rgba(245,158,11,0.12)]' 
          : 'bg-slate-100'
      }`}>
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          OWNER
        </div>
        <div className={`text-sm font-semibold mt-0.5 ${
          isWarningSellerType ? 'text-amber-700' : 'text-slate-900'
        }`}>
          {getSellerDisplay()}
        </div>
      </div>
    </div>
  )
}

export default PropertyStatusPills
