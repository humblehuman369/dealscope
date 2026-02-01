'use client';

/**
 * CompactHeader Component
 * 
 * A space-efficient header for InvestIQ analysis pages with:
 * - Top bar with DealMakerIQ branding, search, dashboard, and user avatar
 * - Page title row with back arrow and strategy selector
 * - Pill-style address selector with property accordion
 * - Dark-themed icon navigation bar
 * 
 * Navigation is handled directly via centralized navigation config.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getToolbarRoute, isValidNavContext, type ToolbarNavId, type NavContext } from '@/lib/navigation';

// Types
export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  rent?: number;
  status?: string;
  image?: string;
  zpid?: string;
}

export interface Strategy {
  short: string;
  full: string;
}

export type NavItemId = 'search' | 'home' | 'analysis' | 'compare' | 'rentals' | 'reports' | 'deals';

interface CompactHeaderProps {
  property?: PropertyData;
  pageTitle?: string;
  pageTitleAccent?: string;
  currentStrategy?: string;
  onStrategyChange?: (strategy: string) => void;
  onBack?: () => void;
  activeNav?: NavItemId;
  onPropertyClick?: (isOpen: boolean) => void;
  defaultPropertyOpen?: boolean;
  // For saved properties, include propertyId in navigation context
  savedPropertyId?: string;
}

const STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
];

const DEFAULT_PROPERTY: PropertyData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  rent: 5555,
  status: 'OFF-MARKET',
};

// Navigation icon paths (Heroicons style)
const NAV_ICON_PATHS: Record<NavItemId, string> = {
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  home: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  analysis: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  compare: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  rentals: 'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
  reports: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  deals: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const NAV_ITEMS: { id: NavItemId; label: string; disabled?: boolean }[] = [
  { id: 'search', label: 'Search' },
  { id: 'home', label: 'Home' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'compare', label: 'Compare' },
  { id: 'rentals', label: 'Rentals' },
  { id: 'reports', label: 'Reports', disabled: true },
  { id: 'deals', label: 'Deals' },
];

export function CompactHeader({
  property = DEFAULT_PROPERTY,
  pageTitle = 'VERDICT',
  pageTitleAccent = 'IQ',
  currentStrategy = 'Short-term',
  onStrategyChange,
  onBack,
  activeNav = 'analysis',
  onPropertyClick,
  defaultPropertyOpen = false,
  savedPropertyId,
}: CompactHeaderProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(defaultPropertyOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
  
  // Navigation context for toolbar
  const navContext: NavContext = useMemo(() => ({
    address: fullAddress,
    zpid: property.zpid,
    propertyId: savedPropertyId,
  }), [fullAddress, property.zpid, savedPropertyId]);
  
  // Validate navigation context
  const hasValidNavContext = useMemo(() => isValidNavContext(navContext), [navContext]);

  // Get user initial for avatar
  const userInitial = user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  // Format helpers
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStrategySelect = (strategy: string) => {
    setIsDropdownOpen(false);
    onStrategyChange?.(strategy);
  };

  const handlePropertyToggle = () => {
    const newState = !isPropertyOpen;
    setIsPropertyOpen(newState);
    onPropertyClick?.(newState);
  };

  const handleSearch = () => {
    router.push('/search');
  };

  return (
    <header className="font-sans">
      {/* Dark Header Container */}
      <div className="max-w-[480px] mx-auto bg-[#0A1628] relative" ref={dropdownRef}>
        {/* Top Bar - Branding & Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex flex-col">
            <div className="text-lg font-extrabold leading-tight">
              <span className="text-white">DealMaker</span>
              <span className="text-cyan-600">IQ</span>
            </div>
            <span className="text-[9px] text-white/50">by InvestIQ</span>
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSearch}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Search properties"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                >
                  Dashboard
                </Link>
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  {userInitial}
                </div>
              </>
            ) : (
              <Link
                href="/?auth=login"
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-full text-sm font-semibold text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-center px-4 py-2 gap-2 relative">
          <button 
            className="w-5 h-5 text-white/70 hover:text-white cursor-pointer absolute left-4 transition-colors"
            onClick={onBack}
            aria-label="Go back"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="text-lg font-extrabold tracking-wide">
              <span className="text-white">{pageTitle} </span>
              <span className="text-cyan-400">{pageTitleAccent}</span>
            </div>
            <button
              className="relative inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded-md cursor-pointer text-xs font-semibold text-white transition-colors"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{currentStrategy}</span>
              <svg 
                className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Address Selector - Pill Style */}
        <button
          className={`flex items-center justify-center gap-2 mx-4 mb-3 px-4 py-2.5 rounded-full border-2 border-cyan-600 bg-cyan-600/10 hover:bg-cyan-600/20 cursor-pointer transition-all w-[calc(100%-32px)]`}
          onClick={handlePropertyToggle}
        >
          <span className="text-sm text-white font-medium truncate">{fullAddress}</span>
          <svg 
            className={`w-4 h-4 text-cyan-600 transition-transform duration-300 flex-shrink-0 ${isPropertyOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {/* Property Accordion */}
        <div 
          className={`overflow-hidden transition-all duration-300 mx-4 rounded-xl bg-[#0F1D32] ${
            isPropertyOpen ? 'max-h-32 p-3 mb-3' : 'max-h-0 p-0 mb-0'
          }`}
        >
          <div className="flex gap-3">
            {property.image ? (
              <img 
                className="w-[90px] h-[68px] rounded-lg object-cover flex-shrink-0 bg-slate-700" 
                src={property.image}
                alt="Property"
              />
            ) : (
              <div className="w-[90px] h-[68px] rounded-lg flex-shrink-0 bg-slate-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                </svg>
              </div>
            )}
            <div className="flex-1 grid grid-cols-3 gap-x-2 gap-y-1.5">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{property.beds}</span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Beds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{property.baths}</span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Baths</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{formatNumber(property.sqft)}</span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Sqft</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-cyan-400">{formatPrice(property.price)}</span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Est. Value</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-cyan-400">{formatPrice(property.rent || 5555)}</span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Est. Rent</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                  {property.status === 'OFF-MARKET' ? 'Off-Market' : property.status || 'Active'}
                </span>
                <span className="text-[9px] text-white/60 uppercase tracking-wide">Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Dropdown */}
        {isDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-[150]" 
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-[140px] left-1/2 -translate-x-1/2 w-52 bg-white rounded-xl shadow-xl z-[200] overflow-hidden">
              <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                Strategy
              </div>
              {STRATEGIES.map((strategy) => {
                const isSelected = strategy.short === currentStrategy;
                return (
                  <button
                    key={strategy.short}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${
                      isSelected ? 'text-cyan-600 font-semibold' : 'text-slate-800 font-medium'
                    }`}
                    onClick={() => handleStrategySelect(strategy.short)}
                  >
                    {strategy.full}
                    {isSelected && (
                      <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Icon Navigation - Dark Theme */}
        <nav className="bg-[#0A1628] px-3 py-2 flex items-center justify-around border-t border-white/10">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            const isExplicitlyDisabled = item.disabled;
            // Disable navigation items (except current active and search) if context is invalid
            const isDisabled = isExplicitlyDisabled || (!hasValidNavContext && !isActive && item.id !== 'search');
            
            const tooltipText = isExplicitlyDisabled 
              ? `${item.label} (Coming Soon)` 
              : !hasValidNavContext && !isActive && item.id !== 'search'
                ? `${item.label} (No property selected)`
                : item.label;
                
            return (
              <button
                key={item.id}
                className={`w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isActive 
                      ? 'bg-cyan-600/20' 
                      : 'hover:bg-white/10'
                }`}
                onClick={() => {
                  if (isDisabled) return;
                  if (item.id === 'search') {
                    router.push('/search');
                  } else {
                    const route = getToolbarRoute(item.id as ToolbarNavId, navContext);
                    router.push(route);
                  }
                }}
                title={tooltipText}
                disabled={isDisabled}
              >
                <svg 
                  className={`w-5 h-5 ${isActive ? 'text-cyan-600' : 'text-white/50 hover:text-white/80'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={NAV_ICON_PATHS[item.id]} />
                </svg>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default CompactHeader;
