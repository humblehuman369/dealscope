'use client';

/**
 * CompactHeader Component
 * 
 * A space-efficient header for InvestIQ analysis pages with:
 * - App bar with logo and actions
 * - Address with accordion dropdown for property details
 * - Page title + Strategy selector in one compact row
 * - Icon navigation bar
 * 
 * Navigation is handled directly via centralized navigation config.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToolbarRoute, type ToolbarNavId, type NavContext } from '@/lib/navigation';

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

export type NavItemId = 'search' | 'home' | 'trends' | 'analysis' | 'compare' | 'reports' | 'deals';

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
}

const STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
];

const NAV_ITEMS = [
  { id: 'search' as NavItemId, label: 'Search' },
  { id: 'home' as NavItemId, label: 'Home' },
  { id: 'trends' as NavItemId, label: 'Trends' },
  { id: 'analysis' as NavItemId, label: 'Analysis' },
  { id: 'compare' as NavItemId, label: 'Compare' },
  { id: 'reports' as NavItemId, label: 'Reports' },
  { id: 'deals' as NavItemId, label: 'Deals' },
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
  rent: 3200,
  status: 'OFF-MARKET',
};

// Icon components using inline SVG for consistency with the design
const SearchIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
  </svg>
);

const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
  </svg>
);

const TrendsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
  </svg>
);

const AnalysisIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
  </svg>
);

const CompareIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"/>
  </svg>
);

const ReportsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
  </svg>
);

const DealsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const NAV_ICONS: Record<NavItemId, React.FC<{ active?: boolean }>> = {
  search: SearchIcon,
  home: HomeIcon,
  trends: TrendsIcon,
  analysis: AnalysisIcon,
  compare: CompareIcon,
  reports: ReportsIcon,
  deals: DealsIcon,
};

export function CompactHeader({
  property = DEFAULT_PROPERTY,
  pageTitle = 'ANALYSIS',
  pageTitleAccent = 'IQ',
  currentStrategy = 'Long-term',
  onStrategyChange,
  onBack,
  activeNav = 'analysis',
  onPropertyClick,
  defaultPropertyOpen = false,
}: CompactHeaderProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(defaultPropertyOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
  
  // Navigation context for toolbar
  const navContext: NavContext = {
    address: fullAddress,
    zpid: property.zpid,
  };

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

  return (
    <header className="font-sans">
      {/* Dark Header */}
      <div className="max-w-[480px] mx-auto bg-[#0A1628] px-4 py-3 relative" ref={dropdownRef}>
        {/* Title Row */}
        <div className="flex items-center justify-between mb-1">
          <button 
            className="w-5 h-5 text-white/70 hover:text-white transition-colors"
            onClick={onBack}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2">
              <div className="text-lg font-extrabold tracking-wide">
                <span className="text-white">{pageTitle} </span>
                <span className="text-[#00D4FF]">{pageTitleAccent}</span>
              </div>
              <button
                className={`inline-flex items-center gap-1.5 bg-[#0891B2] hover:bg-[#0e7490] px-2.5 py-1 rounded transition-colors text-xs font-semibold text-white`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{currentStrategy}</span>
                <svg 
                  className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="w-5" />
        </div>

        {/* Address Selector */}
        <button
          className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-md mx-auto transition-colors ${isPropertyOpen ? 'bg-white/10' : 'hover:bg-white/10'}`}
          onClick={handlePropertyToggle}
        >
          <span className="text-[11px] text-white/90 font-medium">{fullAddress}</span>
          <svg 
            className={`w-3.5 h-3.5 text-[#0891B2] transition-transform duration-300 ${isPropertyOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {/* Property Accordion */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-[#0F1D32] rounded-xl ${
            isPropertyOpen ? 'max-h-36 p-3 mt-3' : 'max-h-0 p-0 mt-0'
          }`}
        >
          <div className="flex gap-3">
            {property.image ? (
              <img 
                className="w-[90px] h-[68px] rounded-lg object-cover flex-shrink-0 bg-slate-800" 
                src={property.image}
                alt="Property"
              />
            ) : (
              <div className="w-[90px] h-[68px] rounded-lg flex-shrink-0 bg-slate-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                </svg>
              </div>
            )}
            <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white">{property.beds}</span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Beds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white">{property.baths}</span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Baths</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white">{formatNumber(property.sqft)}</span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Sqft</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#00D4FF]">{formatPrice(property.price)}</span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Est. Value</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#00D4FF]">{formatPrice(property.rent || 3200)}</span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Est. Rent</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white">
                  {property.status === 'OFF-MARKET' ? 'Off-Market' : property.status || 'Active'}
                </span>
                <span className="text-[9px] text-white/70 uppercase tracking-wide mt-0.5">Status</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Dropdown */}
        {isDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-0 bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3.5 pt-2.5 pb-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Strategy
            </div>
            {STRATEGIES.map((strategy) => (
              <button
                key={strategy.short}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                  strategy.short === currentStrategy 
                    ? 'text-[#0891B2] font-semibold' 
                    : 'text-[#0A1628] hover:bg-slate-50'
                }`}
                onClick={() => handleStrategySelect(strategy.short)}
              >
                {strategy.full}
                {strategy.short === currentStrategy && (
                  <svg className="w-4 h-4 text-[#0891B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Icon Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-[480px] mx-auto px-2 py-1.5 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const IconComponent = NAV_ICONS[item.id];
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                isActive ? 'bg-[#0891B2]/10' : 'hover:bg-slate-100'
              }`}
              onClick={() => {
                const route = getToolbarRoute(item.id as ToolbarNavId, navContext);
                // All routes enabled - navigate directly
                router.push(route);
              }}
              title={item.label}
            >
              <IconComponent active={isActive} />
            </button>
          );
        })}
        </div>
      </nav>
    </header>
  );
}

export default CompactHeader;
