'use client'

/**
 * NavTabs Component - Decision-Grade UI
 * 
 * Edge-to-edge navigation tabs for VerdictIQ page.
 * Per DealMakerIQ Design System - high contrast, legibility-first.
 */

import React from 'react'
import { useRouter } from 'next/navigation'

interface NavTab {
  id: string
  label: string
  href?: string
  isActive?: boolean
}

interface NavTabsProps {
  tabs?: NavTab[]
  activeTab?: string
  address?: string
  propertyId?: string
  zpid?: string
}

const DEFAULT_TABS: NavTab[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'details', label: 'Details' },
  { id: 'price-checker', label: 'PriceCheckerIQ' },
  { id: 'dashboard', label: 'Dashboard' },
]

export function NavTabs({
  tabs = DEFAULT_TABS,
  activeTab = 'analyze',
  address,
  propertyId,
  zpid,
}: NavTabsProps) {
  const router = useRouter()
  
  const encodedAddress = address ? encodeURIComponent(address) : ''
  
  const getHref = (tabId: string): string => {
    switch (tabId) {
      case 'analyze':
        return propertyId 
          ? `/verdict?propertyId=${propertyId}` 
          : `/verdict?address=${encodedAddress}`
      case 'details':
        return zpid 
          ? `/property/${zpid}` 
          : `/property?address=${encodedAddress}`
      case 'price-checker':
        return `/price-intel?address=${encodedAddress}`
      case 'dashboard':
        return '/dashboard'
      default:
        return '#'
    }
  }
  
  const handleTabClick = (tabId: string) => {
    const href = getHref(tabId)
    if (href !== '#') {
      router.push(href)
    }
  }

  return (
    <nav className="dg-nav-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`dg-nav-tab ${tab.id === activeTab ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default NavTabs
