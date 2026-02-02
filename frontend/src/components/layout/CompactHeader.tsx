'use client';

/**
 * CompactHeader Component
 * 
 * A space-efficient header for InvestIQ analysis pages with:
 * - Top bar with DealMakerIQ branding, search, dashboard, and user avatar
 * - Page title row with back arrow and strategy selector
 * - Pill-style address selector with property accordion
 * - Dark-themed icon navigation bar with 5 custom icons
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

export type NavItemId = 'analysis' | 'home' | 'compare' | 'rentals' | 'deals';

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

// Custom Icon Components
const VerdictIQIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 147.76 147.76" className="w-5 h-5">
    <path fill="currentColor" fillRule="evenodd" d="M18.39,18.39c21.41-21.38,56.1-21.38,77.48,0,21.41,21.41,21.41,56.1,0,77.51-21.38,21.41-56.07,21.41-77.48,0C-3.02,74.49-3.02,39.8,18.39,18.39h0ZM24.57,24.57c17.99-17.96,47.17-17.96,65.13,0,17.99,17.99,17.99,47.17,0,65.16-17.96,17.99-47.14,17.99-65.13,0-17.99-17.99-17.99-47.17,0-65.16h0Z"/>
    <path fill="currentColor" d="M16.73,16.76C27.89,5.61,42.52,0,57.13,0s29.25,5.61,40.4,16.76,16.76,25.76,16.76,40.4-5.61,29.25-16.76,40.4-25.76,16.73-40.4,16.73-29.24-5.58-40.4-16.73C5.58,86.41,0,71.77,0,57.16S5.58,27.92,16.73,16.76h0ZM57.13,4.71c-13.41,0-26.86,5.11-37.08,15.34-10.26,10.26-15.37,23.67-15.37,37.11s5.11,26.82,15.37,37.08c10.22,10.26,23.67,15.37,37.08,15.37s26.86-5.11,37.11-15.37c10.22-10.26,15.34-23.67,15.34-37.08s-5.11-26.86-15.34-37.11c-10.26-10.22-23.67-15.34-37.11-15.34h0ZM22.9,22.94c9.46-9.46,21.84-14.17,34.23-14.17s24.8,4.71,34.23,14.17c9.46,9.43,14.17,21.84,14.17,34.22s-4.71,24.76-14.17,34.23c-9.43,9.43-21.84,14.17-34.23,14.17s-24.76-4.75-34.23-14.17c-9.46-9.46-14.17-21.84-14.17-34.23s4.71-24.8,14.17-34.22h0ZM57.13,13.44c-11.19,0-22.37,4.25-30.91,12.78-8.53,8.56-12.81,19.75-12.81,30.94s4.28,22.37,12.81,30.91c8.53,8.53,19.72,12.81,30.91,12.81s22.37-4.28,30.94-12.81c8.53-8.53,12.78-19.72,12.78-30.91s-4.25-22.37-12.78-30.94c-8.56-8.53-19.75-12.78-30.94-12.78h0Z"/>
    <polygon fill="currentColor" fillRule="evenodd" points="80.4 52.65 80.4 83.92 65.2 83.92 65.2 62.87 49.06 62.87 49.06 83.92 33.86 83.92 33.86 52.62 29.35 56.43 24.7 50.99 57.13 23.57 68.88 33.49 68.88 27.22 80.4 27.22 80.4 43.25 89.56 50.99 84.92 56.43 80.4 52.65"/>
    <path fill="currentColor" d="M81.56,55.14v28.78c0,.66-.5,1.19-1.16,1.19h-15.2c-.63,0-1.16-.53-1.16-1.19v-19.85h-13.78v19.85c0,.66-.53,1.19-1.19,1.19h-15.2c-.63,0-1.16-.53-1.16-1.19v-28.78l-2.59,2.19c-.5.4-1.23.33-1.63-.13l-4.65-5.44c-.43-.5-.37-1.23.13-1.66l32.43-27.39c.43-.4,1.09-.36,1.49,0l9.79,8.27v-3.75c0-.66.53-1.2,1.2-1.2h11.52c.66,0,1.16.53,1.16,1.2v15.5l8.76,7.37c.5.43.56,1.16.13,1.66l-4.65,5.44c-.43.5-1.16.53-1.66.13l-2.59-2.19Z"/>
    <path fill="currentColor" d="M103.34,87.41l12.28,12.28c.93.93.93,2.42,0,3.32l-12.61,12.65c-.93.9-2.42.9-3.32,0l-12.28-12.31c-.93-.9-.93-2.39,0-3.29.13-.13.3-.27.43-.36,1.1-.8,2.19-1.63,3.25-2.52,1.03-.9,2.09-1.86,3.15-2.92,1.03-1.06,1.99-2.09,2.89-3.15.96-1.13,1.86-2.26,2.66-3.39.76-1.03,2.22-1.29,3.25-.53.1.07.2.17.3.23h0Z"/>
    <path fill="currentColor" fillRule="evenodd" d="M113.96,101.35c2.32.33,4.55,1.39,6.34,3.15l21.84,21.84c4.35,4.35,4.35,11.45,0,15.8h0c-4.35,4.35-11.45,4.35-15.8,0l-21.84-21.84c-1.79-1.76-2.82-4.02-3.15-6.31l12.61-12.65Z"/>
  </svg>
);

const PropertyDetailsIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 93.58 104.2" className="w-5 h-5">
    <path fill="currentColor" d="M46.79,0C20.95,0,0,20.95,0,46.79c0,12.8,5.15,24.38,13.47,32.83l-5.31,24.58,21.5-13.89c5.31,2.09,11.07,3.28,17.13,3.28,25.84,0,46.79-20.95,46.79-46.79S72.63,0,46.79,0Z"/>
    <path fill="#0A1628" d="M76.14,44.3l-9.71-9.73s0-8.5,0-11.34c0-.51-.41-.92-.92-.92h-6.81c-.51,0-.92.41-.92.91,0,1.07,0,2.69,0,2.69l-10.24-10.25c-.21-.21-.55-.21-.76,0l-28.6,28.63c-.69.69-.21,1.87.77,1.88,2.9.03,7.18.07,7.18.07v24.27c0,.83.67,1.5,1.49,1.5h11.83v-16.05h14.67v16.05h12.57c.83,0,1.49-.67,1.49-1.5v-24.27l7.18-.07c.98,0,1.46-1.19.77-1.88Z"/>
  </svg>
);

const SoldCompsIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 151.46 141.28" className="w-5 h-5">
    <path fill="currentColor" fillRule="evenodd" d="M128.4,68.08v70.84H23.07v-70.84l-10.22,8.6-10.49-12.32L75.75,2.32l26.52,22.44v-14.21h26.13v36.28l20.75,17.53-10.52,12.32-10.22-8.6ZM75.75,45.54c22.01,0,39.87,17.89,39.87,39.9s-17.86,39.9-39.87,39.9-39.9-17.86-39.9-39.9,17.86-39.9,39.9-39.9h0Z"/>
    <path fill="currentColor" d="M75.75,43.22c11.65,0,22.21,4.71,29.84,12.38,7.67,7.63,12.38,18.19,12.38,29.84s-4.71,22.24-12.38,29.88c-7.63,7.64-18.19,12.38-29.84,12.38s-22.24-4.75-29.88-12.38c-7.64-7.63-12.38-18.19-12.38-29.88s4.75-22.21,12.38-29.84c7.64-7.67,18.19-12.38,29.88-12.38h0Z"/>
    <path fill="currentColor" d="M92.21,72.56c0,1.29-1.06,2.36-2.36,2.36s-2.32-1.06-2.32-2.36c0-2.36-1.26-4.25-3.09-5.58-2.49-1.89-5.97-2.82-8.96-2.82-3.72,0-6.67.96-8.7,2.59-1.96,1.56-3.02,3.78-3.02,6.37,0,5.05,5.88,7.4,11.58,9.66.13.07,1.26.5,1.26.5l1.23.5c7.17,2.86,14.54,5.78,14.54,13.98,0,4.08-1.69,7.57-4.75,10.02-2.85,2.29-6.84,3.62-11.65,3.62-3.88,0-8.43-1.23-11.75-3.72-2.95-2.19-4.98-5.31-4.98-9.36,0-1.29,1.06-2.32,2.36-2.32s2.36,1.03,2.36,2.32c0,2.39,1.23,4.25,3.05,5.61,2.49,1.86,5.98,2.79,8.96,2.79,3.72,0,6.67-.96,8.7-2.59,1.96-1.53,3.02-3.75,3.02-6.37,0-5.05-5.88-7.37-11.59-9.66-.83-.3-.2-.07-1.26-.47l-1.19-.5c-7.2-2.85-14.57-5.81-14.57-14.01,0-4.05,1.69-7.54,4.75-9.99,2.85-2.29,6.84-3.65,11.65-3.65,3.88,0,8.43,1.26,11.78,3.75,2.92,2.16,4.95,5.28,4.95,9.33h0Z"/>
    <path fill="currentColor" d="M78.07,112.8c0,1.29-1.03,2.36-2.32,2.36s-2.36-1.06-2.36-2.36v-54.67c0-1.29,1.06-2.36,2.36-2.36s2.32,1.06,2.32,2.36v54.67Z"/>
  </svg>
);

const RentCompsIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 147.73 118.16" className="w-5 h-5">
    <path fill="currentColor" fillRule="evenodd" d="M59.87,5.79c-9.33,5.38-14.01,15.77-12.58,25.83L5.82,55.55l-3.49,13.08,13.08,3.52,4.98-2.85.7-7.44,7.14,2.89,1.69-6.24,6.47,1.53,6.21-3.58.33-7.2,6.77,3.09,7.17-4.12c8,6.27,19.32,7.4,28.65,2.02.66-.37,1.26-.76,1.86-1.2l-.03-.07c-2.22-3.85-3.55-7.93-4.02-11.85-.23-1.93-.27-3.85-.1-5.68-1.1.13-2.19.03-3.25-.27-2.16-.56-4.08-1.96-5.35-3.98-.1-.13-.2-.3-.27-.47-1.13-2.09-1.36-4.48-.8-6.64.6-2.16,1.99-4.15,4.08-5.38.1-.1.23-.17.36-.23,2.13-1.13,4.52-1.36,6.64-.8,2.26.6,4.25,2.06,5.51,4.21h0v.03c1.26,2.16,1.49,4.62.9,6.84-.43,1.69-1.4,3.29-2.76,4.48-.53,2.26-.66,4.75-.33,7.3.36,3.12,1.39,6.34,3.05,9.43,7.87-8.03,9.79-20.61,3.88-30.81C87.85,2.9,72.15-1.31,59.87,5.79h0Z"/>
    <path fill="currentColor" fillRule="evenodd" d="M135.12,80.68v35.12h-17.3v-19.82h-17.66v19.82h-17.3v-35.12l-5.08,4.28-5.21-6.11,23.64-20.02c.4.3.8.57,1.2.83,1.13.7,2.29,1.33,3.45,1.86-.27.53-.46,1.09-.63,1.66-.6,2.26-.33,4.71.93,6.87h0c1.23,2.19,3.25,3.62,5.48,4.22,2.22.6,4.71.37,6.87-.9h0c2.16-1.26,3.62-3.25,4.22-5.51.6-2.22.36-4.68-.9-6.84l-.03-.03c-1.23-2.16-3.25-3.62-5.48-4.21-2.22-.6-4.68-.33-6.84.93-.1.03-.16.07-.23.13-1.46-.53-2.92-1.23-4.32-2.12l9.06-7.63,13.15,11.12v-7.07h12.98v18.03l10.26,8.7-5.21,6.11-5.05-4.28Z"/>
  </svg>
);

const DealsMakerIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 92.92 92.92" className="w-5 h-5">
    <circle fill="currentColor" cx="46.46" cy="46.46" r="46.46"/>
    <path fill="#0A1628" d="M46.46,85.68c-21.63,0-39.22-17.59-39.22-39.22S24.83,7.24,46.46,7.24s39.22,17.59,39.22,39.22-17.59,39.22-39.22,39.22ZM46.46,10.29c-19.94,0-36.17,16.22-36.17,36.17s16.22,36.17,36.17,36.17,36.17-16.22,36.17-36.17S66.4,10.29,46.46,10.29Z"/>
    <path fill="#0A1628" d="M44.75,74.6v-6.7l-.81-.1c-3.15-.37-7.57-1.73-10.86-4.42l3.4-5.27c3.43,2.48,6.38,3.59,9.45,3.59,5.34,0,6.46-3.05,6.46-5.61,0-3.57-3.7-5.45-7.61-7.44-4.85-2.47-10.34-5.26-10.34-11.69s3.49-10.43,9.56-11.64l.74-.15v-6.87h4.8v6.77l.78.12c3.42.52,6.29,2.01,8.98,4.66l-3.84,4.4c-2.17-1.85-4.33-3.05-7.32-3.05-4.93,0-5.96,2.88-5.96,5.29,0,3.26,3.5,4.94,7.2,6.71,5.04,2.42,10.75,5.16,10.75,12.2,0,6.36-3.59,10.76-9.85,12.09l-.73.15v6.95h-4.8Z"/>
  </svg>
);

const NAV_ITEMS: { id: NavItemId; label: string; icon: React.FC<{ active?: boolean }> }[] = [
  { id: 'analysis', label: 'VerdictIQ', icon: VerdictIQIcon },
  { id: 'home', label: 'Property Details', icon: PropertyDetailsIcon },
  { id: 'compare', label: 'Sold Comps', icon: SoldCompsIcon },
  { id: 'rentals', label: 'Rent Comps', icon: RentCompsIcon },
  { id: 'deals', label: 'Deals Maker IQ', icon: DealsMakerIcon },
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
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
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

  const handleDashboard = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      setShowAuthModal('login');
    }
  };

  return (
    <header className="font-sans">
      {/* Dark Header Container */}
      <div className="max-w-[480px] mx-auto bg-[#0A1628] relative" ref={dropdownRef}>
        {/* Top Bar - Branding & Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex flex-col">
            <div className="text-lg font-extrabold leading-tight">
              <span className="text-white">Deal</span>
              <span className="text-white">Maker</span>
              <span className="text-[#0891B2]">IQ</span>
            </div>
            <span className="text-[10px] text-white/50 tracking-wide">by InvestIQ</span>
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSearch}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Search properties"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
            <button
              onClick={handleDashboard}
              className="bg-transparent border-none cursor-pointer text-[13px] font-semibold text-white py-2 hover:text-[#0891B2] transition-colors"
            >
              Dashboard
            </button>
            {isAuthenticated ? (
              <div className="w-8 h-8 bg-[#1E293B] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {userInitial}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal('login')}
                className="w-8 h-8 bg-[#1E293B] rounded-lg flex items-center justify-center text-white/60 hover:text-white cursor-pointer transition-colors"
                aria-label="Sign in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-center px-4 py-2 pb-3 relative">
          <button 
            className="w-5 h-5 text-white opacity-70 hover:opacity-100 cursor-pointer absolute left-4 transition-opacity"
            onClick={onBack}
            aria-label="Go back"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="text-lg font-extrabold tracking-wider">
            <span className="text-white">{pageTitle} </span>
            <span className="text-[#00D4FF]">{pageTitleAccent}</span>
          </div>
        </div>

        {/* Address Selector - Pill Style */}
        <button
          className="flex items-center justify-center gap-2 cursor-pointer px-4 py-2.5 rounded-full border-2 border-[#0891B2] bg-[#0891B2]/10 hover:bg-[#0891B2]/20 mx-4 mb-3 transition-all w-[calc(100%-32px)]"
          onClick={handlePropertyToggle}
        >
          <span className="text-[13px] text-white font-medium truncate">{fullAddress}</span>
          <svg 
            className={`w-4 h-4 text-[#0891B2] transition-transform duration-300 flex-shrink-0 ${isPropertyOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {/* Property Accordion Panel */}
        <div 
          className={`overflow-hidden bg-[#0F1D32] rounded-xl mx-4 transition-all duration-300 ease-in-out ${
            isPropertyOpen ? 'max-h-[120px] p-3 mb-3' : 'max-h-0 py-0 px-3 mb-0'
          }`}
        >
          <div className="flex gap-3 items-stretch">
            {property.image ? (
              <img 
                className="w-[90px] h-[68px] rounded-lg object-cover flex-shrink-0 bg-slate-800" 
                src={property.image}
                alt="Property"
              />
            ) : (
              <div className="w-[90px] h-[68px] rounded-lg flex-shrink-0 bg-[#1E293B] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                </svg>
              </div>
            )}
            <div className="flex-1 grid grid-cols-3 gap-1.5 min-w-0">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{property.beds}</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Beds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{property.baths}</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Baths</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{formatNumber(property.sqft)}</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Sqft</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#00D4FF]">{formatPrice(property.price)}</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Est. Value</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#00D4FF]">{formatPrice(property.rent || 5555)}</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Est. Rent</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                  {property.status === 'OFF-MARKET' ? 'Off-Market' : property.status || 'Active'}
                </span>
                <span className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">Status</span>
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
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-[200px] bg-white rounded-xl shadow-xl z-[200] overflow-hidden border border-[#E2E8F0]">
              <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Strategy
              </div>
              {STRATEGIES.map((strategy) => {
                const isSelected = strategy.short === currentStrategy;
                return (
                  <button
                    key={strategy.short}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-[#F8FAFC] transition-colors ${
                      isSelected ? 'text-[#0891B2] font-semibold' : 'text-[#0A1628] font-medium'
                    }`}
                    onClick={() => handleStrategySelect(strategy.short)}
                  >
                    {strategy.full}
                    {isSelected && (
                      <svg className="w-4 h-4 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Icon Nav - Dark Theme */}
        <nav className="bg-[#0A1628] px-3 py-2 flex items-center justify-around border-t border-white/10">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.id;
            // Disable navigation items (except current active) if context is invalid
            const isDisabled = !hasValidNavContext && !isActive;
            
            const tooltipText = isDisabled
              ? `${item.label} (No property selected)`
              : item.label;
                
            return (
              <button
                key={item.id}
                className={`w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed text-white/50'
                    : isActive 
                      ? 'bg-[#0891B2]/20 text-[#0891B2]' 
                      : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
                onClick={() => {
                  if (isDisabled) return;
                  const route = getToolbarRoute(item.id as ToolbarNavId, navContext);
                  router.push(route);
                }}
                title={tooltipText}
                disabled={isDisabled}
              >
                <IconComponent active={isActive} />
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default CompactHeader;
