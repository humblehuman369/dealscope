'use client'

import { PropertyData } from './types'
import { formatDate } from './utils'

interface ListingInfoProps {
  property: PropertyData
}

/**
 * ListingInfo Component
 * 
 * Displays listing agent information, brokerage,
 * list date, and MLS number.
 */
export function ListingInfo({ property }: ListingInfoProps) {
  const hasListingInfo = property.listingAgent || property.listDate || property.mlsId

  if (!hasListingInfo) {
    return null
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Listing Information
      </div>

      <div className="space-y-0">
        {property.listingAgent?.name && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">Listed By</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {property.listingAgent.name}
            </span>
          </div>
        )}
        {property.listingAgent?.brokerage && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">Brokerage</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {property.listingAgent.brokerage}
            </span>
          </div>
        )}
        {property.listDate && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500 dark:text-slate-400">List Date</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatDate(property.listDate)}
            </span>
          </div>
        )}
        {property.mlsId && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">MLS #</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {property.mlsId}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ListingInfoSkeleton
 * Loading state for listing information
 */
export function ListingInfoSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className={`flex items-center justify-between py-2 ${
              i < 3 ? 'border-b border-slate-100 dark:border-slate-800' : ''
            }`}
          >
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
