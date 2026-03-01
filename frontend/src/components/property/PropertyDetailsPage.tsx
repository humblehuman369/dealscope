'use client';

/**
 * PropertyDetailsPage Component
 * 
 * A mobile-first property details page featuring:
 * - CompactHeader with strategy selector
 * - Image gallery with thumbnails
 * - Property facts with key specs hero cards
 * - Features & amenities tabs
 * - Location section
 * - Bottom action bar
 * 
 * Uses DealGapIQ Universal Style Guide colors
 */

import React, { useState, useCallback, useMemo } from 'react';
import { formatPrice, formatNumber } from '@/utils/formatters';
import { LocationMap } from '@/components/property-details/LocationMap';

// Types
export interface PropertyDetailsData {
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  price: number;
  rent?: number;
  status?: string;
  images?: string[];
  pricePerSqft?: number;
  lotSize?: string;
  lotAcres?: string;
  propertyType?: string;
  stories?: string;
  hoaFee?: string;
  annualTax?: number;
  parking?: string;
  heating?: string;
  cooling?: string;
  mlsNumber?: string;
  latitude?: number;
  longitude?: number;
}

interface PropertyDetailsPageProps {
  property?: PropertyDetailsData;
  onBack?: () => void;
  onAnalyze?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onStrategyChange?: (strategy: string) => void;
  onNavChange?: (navId: string) => void;
  showPhoneFrame?: boolean;
  isDark?: boolean;
}

// Default property data
const DEFAULT_PROPERTY: PropertyDetailsData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  yearBuilt: 1969,
  price: 821000,
  rent: 5555,
  status: 'FOR SALE',
  images: [],
};

// Strategies
const STRATEGIES = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
];

// Nav items
const NAV_ITEMS = [
  { id: 'search', label: 'Search' },
  { id: 'home', label: 'Home' },
  { id: 'trends', label: 'Trends' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'compare', label: 'Compare' },
  { id: 'reports', label: 'Reports' },
  { id: 'deals', label: 'Deals' },
];

// Icon components
const NavIcons: Record<string, (isActive: boolean) => JSX.Element> = {
  search: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
    </svg>
  ),
  home: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
    </svg>
  ),
  trends: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
    </svg>
  ),
  analysis: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
    </svg>
  ),
  compare: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"/>
    </svg>
  ),
  reports: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
    </svg>
  ),
  deals: (isActive) => (
    <svg width="18" height="18" fill="none" stroke={isActive ? '#0EA5E9' : '#F1F5F9'} strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
};

// Fact icons
const FactIcons: Record<string, JSX.Element> = {
  dollar: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
  grid: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>,
  home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>,
  layers: <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"/>,
  trending: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>,
  rent: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"/>,
  shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>,
  receipt: <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>,
  car: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>,
  flame: <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>,
  snowflake: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>,
  hash: <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5"/>,
  bed: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V18a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 18V7.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18v3H3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 12V9a2 2 0 012-2h2a2 2 0 012 2v3"/><path strokeLinecap="round" strokeLinejoin="round" d="M12.5 12V9a2 2 0 012-2h2a2 2 0 012 2v3"/><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5V21m15-1.5V21"/></>,
  bath: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 12V5a2 2 0 012-2h1a2 2 0 012 2v1"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 20v1m12-1v1"/></>,
  sqft: <><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></>,
  calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>,
};

function FactIcon({ type }: { type: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      {FactIcons[type] || FactIcons.home}
    </svg>
  );
}

export function PropertyDetailsPage({
  property: propOverride,
  onBack,
  onAnalyze,
  onSave,
  onShare,
  onStrategyChange,
  onNavChange,
  showPhoneFrame = true,
  isDark = false,
}: PropertyDetailsPageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState('home');
  const [expandedSections, setExpandedSections] = useState({
    facts: true,
    features: false,
    location: false,
  });
  const [activeFeatureTab, setActiveFeatureTab] = useState('interior');

  const property = propOverride || DEFAULT_PROPERTY;
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;

  // Key specs
  const keySpecs = useMemo(() => [
    { label: 'Beds', value: property.beds, icon: 'bed' },
    { label: 'Baths', value: property.baths, icon: 'bath' },
    { label: 'Sqft', value: formatNumber(property.sqft), icon: 'sqft' },
    { label: 'Built', value: property.yearBuilt || 'N/A', icon: 'calendar' },
  ], [property]);

  // Property facts
  const propertyFacts = useMemo(() => [
    { label: 'PRICE/SQFT', value: `$${Math.round(property.price / property.sqft)}`, icon: 'dollar' },
    { label: 'LOT SIZE', value: property.lotSize || '9,091 sqft', subValue: property.lotAcres || '0.21 acres', icon: 'grid' },
    { label: 'PROPERTY TYPE', value: property.propertyType || 'Single Family', icon: 'home' },
    { label: 'STORIES', value: property.stories || 'N/A', icon: 'layers' },
    { label: 'ZESTIMATE®', value: formatPrice(property.price), icon: 'trending', highlight: true },
    { label: 'RENT ZESTIMATE®', value: `${formatPrice(property.rent || 0)}/mo`, icon: 'rent', highlight: true },
    { label: 'HOA FEE', value: property.hoaFee || 'None', icon: 'shield' },
    { label: 'ANNUAL TAX', value: property.annualTax ? formatPrice(property.annualTax) : '$9,980', icon: 'receipt' },
    { label: 'PARKING', value: property.parking || 'N/A', icon: 'car' },
    { label: 'HEATING', value: property.heating || 'N/A', icon: 'flame' },
    { label: 'COOLING', value: property.cooling || 'N/A', icon: 'snowflake' },
    { label: 'MLS #', value: property.mlsNumber || 'N/A', icon: 'hash' },
  ], [property]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleStrategySelect = useCallback((strategy: string) => {
    setCurrentStrategy(strategy);
    setIsStrategyOpen(false);
    onStrategyChange?.(strategy);
  }, [onStrategyChange]);

  const handleNavClick = useCallback((navId: string) => {
    setActiveNav(navId);
    onNavChange?.(navId);
  }, [onNavChange]);

  // Content component
  const PageContent = () => (
    <div className="flex flex-col h-full bg-[#F1F5F9] font-sans relative">
      {/* Compact Header */}
      <header className="sticky top-0 z-50">
        {/* App Header */}
        <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
          <div className="text-lg font-extrabold">
            <span className="text-[#0A1628]">DealGap</span>
            <span className="text-[#0EA5E9]">IQ</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            </button>
            <button className="p-1 text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
              </svg>
            </button>
            <div className="w-7 h-7 bg-[#0EA5E9] rounded-full flex items-center justify-center text-white font-semibold text-xs">
              H
            </div>
          </div>
        </div>

        {/* Dark Header */}
        <div className="bg-[#0A1628] px-4 py-3 relative">
          <div className="flex items-center justify-between mb-1">
            <button 
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-white/10 rounded-md"
              onClick={onBack}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <div className="flex-1 flex flex-col items-center">
              <div className="flex items-center gap-2.5">
                <div className="text-base font-bold tracking-wide">
                  <span className="text-white">PROPERTY </span>
                  <span className="text-[#00D4FF]">DETAILS</span>
                </div>
                <button
                  className={`flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/20 rounded-2xl text-[#00D4FF] text-[11px] font-semibold hover:bg-white/15 transition-colors`}
                  onClick={() => setIsStrategyOpen(!isStrategyOpen)}
                >
                  <span>{currentStrategy}</span>
                  <svg 
                    className={`w-3 h-3 transition-transform ${isStrategyOpen ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="w-8" />
          </div>

          {/* Address Selector */}
          <button
            className={`flex items-center justify-center gap-1.5 w-full py-1 text-white text-[11px] hover:text-white/80 ${isPropertyOpen ? 'text-white/80' : ''}`}
            onClick={() => setIsPropertyOpen(!isPropertyOpen)}
          >
            <span>{fullAddress}</span>
            <svg 
              className={`w-3 h-3 transition-transform ${isPropertyOpen ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {/* Property Accordion */}
          <div className={`overflow-hidden transition-all duration-300 ${isPropertyOpen ? 'max-h-52' : 'max-h-0'}`}>
            <div className="flex gap-3 pt-3 pb-1 border-t border-white/10 mt-2">
              {property.images?.[0] && (
                <img
                  className="w-20 h-[60px] rounded-md object-cover"
                  src={property.images[0]}
                  alt="Property"
                />
              )}
              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 flex-1">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{property.beds}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Beds</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{property.baths}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Baths</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">{formatNumber(property.sqft)}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Sqft</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#00D4FF]">{formatPrice(property.price)}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Est. Value</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#00D4FF]">{formatPrice(property.rent || 0)}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide">Est. Rent</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-[#0A1628] bg-[#00D4FF] px-1.5 py-0.5 rounded inline-block w-fit">For Sale</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">Status</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Dropdown */}
          {isStrategyOpen && (
            <div className="absolute top-full left-4 right-4 bg-white rounded-xl shadow-2xl z-50 overflow-hidden mt-0">
              <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                Strategy
              </div>
              {STRATEGIES.map((strategy) => (
                <button
                  key={strategy.short}
                  className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[13px] font-medium hover:bg-slate-50 transition-colors ${
                    strategy.short === currentStrategy ? 'text-[#0EA5E9] font-semibold' : 'text-[#0A1628]'
                  }`}
                  onClick={() => handleStrategySelect(strategy.short)}
                >
                  {strategy.full}
                  {strategy.short === currentStrategy && (
                    <svg className="w-4 h-4 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon Nav */}
        <nav className="bg-white px-2 py-1.5 flex items-center justify-around border-b border-slate-200">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                activeNav === item.id ? 'bg-[#0EA5E9]/10' : 'hover:bg-slate-100'
              }`}
              onClick={() => handleNavClick(item.id)}
              title={item.label}
            >
              {NavIcons[item.id](activeNav === item.id)}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {/* Image Gallery */}
        <section className="bg-white mb-2.5">
          <div className="relative w-full h-60 overflow-hidden bg-slate-100">
            {property.images?.length ? (
              <>
                <img
                  className="w-full h-full object-cover"
                  src={property.images[currentImageIndex]}
                  alt={`Property view ${currentImageIndex + 1}`}
                />
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
                  onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                >
                  <svg width="16" height="16" fill="none" stroke="#0A1628" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg"
                  onClick={() => setCurrentImageIndex(i => Math.min(property.images!.length - 1, i + 1))}
                >
                  <svg width="16" height="16" fill="none" stroke="#0A1628" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <div className="absolute top-3 right-3 bg-[#0A1628]/70 text-white px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                  </svg>
                  {currentImageIndex + 1}/{property.images.length}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No photos available
              </div>
            )}
          </div>
          {property.images && property.images.length > 0 && (
            <div className="flex gap-1.5 p-3 overflow-x-auto">
              {property.images.slice(0, 12).map((img, idx) => (
                <img
                  key={idx}
                  className={`w-12 h-9 rounded-md object-cover cursor-pointer flex-shrink-0 border-2 transition-all ${
                    idx === currentImageIndex ? 'opacity-100 border-[#0EA5E9]' : 'opacity-60 border-transparent hover:opacity-90'
                  }`}
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Property Facts Accordion */}
        <div className={`bg-white rounded-xl mx-4 mb-2.5 border border-slate-100 shadow-sm overflow-hidden ${expandedSections.facts ? 'open' : ''}`}>
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => toggleSection('facts')}
          >
            <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Property Facts</span>
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.facts ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          {expandedSections.facts && (
            <div className="px-4 pb-4">
              {/* Key Specs Hero Row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {keySpecs.map((spec, idx) => (
                  <div 
                    key={idx}
                    className="bg-gradient-to-br from-[#0A1628] to-[#1E293B] rounded-xl py-3 px-2 flex flex-col items-center gap-1"
                  >
                    <div className="text-[#00D4FF]">
                      <FactIcon type={spec.icon} />
                    </div>
                    <div className="text-lg font-bold text-white tabular-nums">{spec.value}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{spec.label}</div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200 mb-3" />

              {/* Property Facts List */}
              <div className="flex flex-col">
                {propertyFacts.map((fact, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between py-2.5 ${idx !== propertyFacts.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center text-slate-500">
                        <FactIcon type={fact.icon} />
                      </div>
                      <span className="text-[13px] font-medium text-slate-500">{fact.label}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-semibold tabular-nums ${fact.highlight ? 'text-[#0EA5E9]' : 'text-[#0A1628]'}`}>
                        {fact.value}
                      </span>
                      {fact.subValue && (
                        <span className="text-[11px] text-slate-400">{fact.subValue}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Features & Amenities Accordion */}
        <div className={`bg-white rounded-xl mx-4 mb-2.5 border border-slate-100 shadow-sm overflow-hidden ${expandedSections.features ? 'open' : ''}`}>
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => toggleSection('features')}
          >
            <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Features & Amenities</span>
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.features ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          {expandedSections.features && (
            <div className="px-4 pb-4">
              <div className="flex gap-2 mb-3">
                {['interior', 'exterior', 'appliances'].map((tab) => (
                  <button
                    key={tab}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${
                      activeFeatureTab === tab 
                        ? 'bg-[#0EA5E9] text-white' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    onClick={() => setActiveFeatureTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-[13px]">
                No {activeFeatureTab} features listed
              </div>
            </div>
          )}
        </div>

        {/* Location Accordion */}
        <div className={`bg-white rounded-xl mx-4 mb-2.5 border border-slate-100 shadow-sm overflow-hidden ${expandedSections.location ? 'open' : ''}`}>
          <div 
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => toggleSection('location')}
          >
            <svg className="w-6 h-6 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
            </svg>
            <span className="flex-1 text-sm font-semibold text-[#0A1628] uppercase tracking-wide">Location</span>
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.location ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
          {expandedSections.location && (
            <div className="px-4 pb-4">
              <LocationMap
                latitude={property.latitude}
                longitude={property.longitude}
                address={fullAddress}
              />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 flex items-center justify-between gap-2 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <button className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-slate-500 hover:text-[#0EA5E9] transition-colors" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-slate-500 hover:text-[#0EA5E9] transition-colors" onClick={onSave}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
          </svg>
          <span className="text-[10px] font-medium">Save</span>
        </button>
        <button 
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#0EA5E9] hover:bg-[#0E7490] text-white rounded-xl font-semibold text-sm transition-colors"
          onClick={onAnalyze}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
          </svg>
          Analyze Property
        </button>
        <button className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-slate-500 hover:text-[#0EA5E9] transition-colors" onClick={onShare}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
          </svg>
          <span className="text-[10px] font-medium">Share</span>
        </button>
      </div>
    </div>
  );

  // Render with or without phone frame
  if (showPhoneFrame) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-start justify-center p-5">
        <div className="w-[390px] h-[844px] bg-slate-100 rounded-[40px] overflow-hidden shadow-2xl relative font-sans">
          <PageContent />
        </div>
      </div>
    );
  }

  return <PageContent />;
}

export default PropertyDetailsPage;
