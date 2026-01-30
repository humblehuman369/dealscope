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

export type NavItemId = 'search' | 'home' | 'trends' | 'analysis' | 'compare' | 'rentals' | 'reports' | 'deals';

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

const NAV_ITEMS = [
  { id: 'search' as NavItemId, label: 'Search' },
  { id: 'home' as NavItemId, label: 'Home' },
  { id: 'trends' as NavItemId, label: 'Trends' },
  { id: 'analysis' as NavItemId, label: 'Analysis' },
  { id: 'compare' as NavItemId, label: 'Compare' },
  { id: 'rentals' as NavItemId, label: 'Rentals' },
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

// Icon components using custom InvestIQ SVG designs
const SearchIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
  </svg>
);

// Property Details icon - House with speech bubble
const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 93.58 104.2" fill="none">
    <path fill={active ? '#0891B2' : '#94A3B8'} d="M46.79,0C20.95,0,0,20.95,0,46.79c0,12.8,5.15,24.38,13.47,32.83l-5.31,24.58,21.5-13.89c5.31,2.09,11.07,3.28,17.13,3.28,25.84,0,46.79-20.95,46.79-46.79S72.63,0,46.79,0Z"/>
    <path fill="#fff" d="M76.14,44.3l-9.71-9.73s0-8.5,0-11.34c0-.51-.41-.92-.92-.92h-6.81c-.51,0-.92.41-.92.91,0,1.07,0,2.69,0,2.69l-10.24-10.25c-.21-.21-.55-.21-.76,0l-28.6,28.63c-.69.69-.21,1.87.77,1.88,2.9.03,7.18.07,7.18.07v24.27c0,.83.67,1.5,1.49,1.5h11.83v-16.05h14.67v16.05h12.57c.83,0,1.49-.67,1.49-1.5v-24.27l7.18-.07c.98,0,1.46-1.19.77-1.88Z"/>
  </svg>
);

// Verdict IQ icon - Checkmark with house
const TrendsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 3772.65 1997.63" fill={active ? '#0891B2' : '#94A3B8'}>
    <path d="M1859.01,1.5c220.68-12.18,523.65,51.47,725.86,136.46,366.8,151.46,676.58,414.6,885.37,752.07,26.45,42.64,83.38,137.53,101.86,182.77-61.24,34.43-129.68,66.98-192.35,99.06-129.17,66.86-259.13,132.17-389.87,195.92-31.56-81.09-111.55-204.93-167.82-270.63,47.41-51.09,97.93-97,147.37-145.94,85.92-85.05,175.66-166.86,260.48-252.91-38.11-41.89-79.01-83.04-116.17-125.25-62.82,53.76-126.14,116.01-188.75,171.63-46.18,40.52-92.09,81.36-137.72,122.5-31.98,28.39-66.04,57.5-96.11,87.67-76.8-70.39-163.11-129.66-256.39-176.05,11.41-23.72,26.7-49.82,38.9-74.61l246.68-496.77c-15.19-7.55-32.65-16.76-48.18-23.03-15.98,27.17-34.18,69.56-49.39,98.86-54.08,104.87-107.13,210.26-159.16,316.16l-78.52,159.44c-22.84-8.85-44.5-18.38-68.07-27.22-158.61-59.51-308.64-83.92-478.72-76.14-244.78,11.2-485.08,100.52-680.61,248.43-51.59,39.03-119.77,103.26-163.24,150.77-176.02,192.41-283.96,440.45-318.69,697.99-11.03,81.79-11.23,159.15-8.82,240.39l-666.96-.33c4.86-116.92,5.81-204.12,22.1-322.79,54.42-411.41,238.39-794.82,525.27-1094.69C890.46,216.59,1362.73,10,1859.01,1.5Z"/>
    <path d="M3588.51,1127.3l2.61.73c12.2,12.6,38.9,82.04,46.53,101.49,97.18,247.83,136.12,498.39,134.97,763.55l-573.18-.45-90.99.34c.73-30.69,3.29-59.7,2.85-91.02-1.77-125.04-16.25-247.14-52.96-366.93-12.28-40.07-29.04-81.56-44.13-120.71,192.25-94.01,383.69-189.68,574.29-287Z"/>
    <path d="M3062.94,756.41l.58.38.26,2.36-346.23,354.31c-41.1,41.97-80.86,84.97-122.64,126.36l-305.43,299.78c-66.5,64.85-137.71,132.65-202.25,199.07,15.61,77.54-4.84,141.2-59.12,198.26-78.47,82.47-214.01,79.4-293.36-.06-104.28-110.93-79.07-291.1,62.5-358.78,37.67-18.01,92.57-20.79,131.9-5.69,35.62-22.32,69.09-48.11,103.7-72.03l214.63-147.54c107.31-73.2,213.64-147.83,318.98-223.85,27.76-20.06,57.57-39.96,84.75-60.54l235.83-179.79c55.78-43.12,118.05-93.66,175.89-132.25Z"/>
  </svg>
);

// Analyze icon - House in magnifying glass
const AnalysisIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 147.76 147.76" fill={active ? '#0891B2' : '#94A3B8'}>
    <path fillRule="evenodd" d="M18.39,18.39c21.41-21.38,56.1-21.38,77.48,0,21.41,21.41,21.41,56.1,0,77.51-21.38,21.41-56.07,21.41-77.48,0C-3.02,74.49-3.02,39.8,18.39,18.39h0ZM24.57,24.57c17.99-17.96,47.17-17.96,65.13,0,17.99,17.99,17.99,47.17,0,65.16-17.96,17.99-47.14,17.99-65.13,0-17.99-17.99-17.99-47.17,0-65.16h0Z"/>
    <polygon fillRule="evenodd" points="80.4 52.65 80.4 83.92 65.2 83.92 65.2 62.87 49.06 62.87 49.06 83.92 33.86 83.92 33.86 52.62 29.35 56.43 24.7 50.99 57.13 23.57 68.88 33.49 68.88 27.22 80.4 27.22 80.4 43.25 89.56 50.99 84.92 56.43 80.4 52.65"/>
    <path fillRule="evenodd" d="M113.96,101.35c2.32.33,4.55,1.39,6.34,3.15l21.84,21.84c4.35,4.35,4.35,11.45,0,15.8h0c-4.35,4.35-11.45,4.35-15.8,0l-21.84-21.84c-1.79-1.76-2.82-4.02-3.15-6.31l12.61-12.65Z"/>
  </svg>
);

// Sold Comps icon - House with dollar sign
const CompareIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 151.46 141.28" fill={active ? '#0891B2' : '#94A3B8'}>
    <path fillRule="evenodd" d="M128.4,68.08v70.84H23.07v-70.84l-10.22,8.6-10.49-12.32L75.75,2.32l26.52,22.44v-14.21h26.13v36.28l20.75,17.53-10.52,12.32-10.22-8.6ZM75.75,45.54c22.01,0,39.87,17.89,39.87,39.9s-17.86,39.9-39.87,39.9-39.9-17.86-39.9-39.9,17.86-39.9,39.9-39.9h0Z"/>
    <path d="M92.21,72.56c0,1.29-1.06,2.36-2.36,2.36s-2.32-1.06-2.32-2.36c0-2.36-1.26-4.25-3.09-5.58-2.49-1.89-5.97-2.82-8.96-2.82-3.72,0-6.67.96-8.7,2.59-1.96,1.56-3.02,3.78-3.02,6.37,0,5.05,5.88,7.4,11.58,9.66.13.07,1.26.5,1.26.5l1.23.5c7.17,2.86,14.54,5.78,14.54,13.98,0,4.08-1.69,7.57-4.75,10.02-2.85,2.29-6.84,3.62-11.65,3.62-3.88,0-8.43-1.23-11.75-3.72-2.95-2.19-4.98-5.31-4.98-9.36,0-1.29,1.06-2.32,2.36-2.32s2.36,1.03,2.36,2.32c0,2.39,1.23,4.25,3.05,5.61,2.49,1.86,5.98,2.79,8.96,2.79,3.72,0,6.67-.96,8.7-2.59,1.96-1.53,3.02-3.75,3.02-6.37,0-5.05-5.88-7.37-11.59-9.66-.83-.3-.2-.07-1.26-.47l-1.19-.5c-7.2-2.85-14.57-5.81-14.57-14.01,0-4.05,1.69-7.54,4.75-9.99,2.85-2.29,6.84-3.65,11.65-3.65,3.88,0,8.43,1.26,11.78,3.75,2.92,2.16,4.95,5.28,4.95,9.33h0Z"/>
    <path d="M78.07,112.8c0,1.29-1.03,2.36-2.32,2.36s-2.36-1.06-2.36-2.36v-54.67c0-1.29,1.06-2.36,2.36-2.36s2.32,1.06,2.32,2.36v54.67Z"/>
  </svg>
);

// Keep Reports icon as-is (routes to same place as Trends)
const ReportsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" fill="none" stroke={active ? '#0891B2' : '#94A3B8'} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
  </svg>
);

// Rental Comps icon - House with key
const RentalsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 147.73 118.16" fill={active ? '#0891B2' : '#94A3B8'}>
    <path fillRule="evenodd" d="M59.87,5.79c-9.33,5.38-14.01,15.77-12.58,25.83L5.82,55.55l-3.49,13.08,13.08,3.52,4.98-2.85.7-7.44,7.14,2.89,1.69-6.24,6.47,1.53,6.21-3.58.33-7.2,6.77,3.09,7.17-4.12c8,6.27,19.32,7.4,28.65,2.02.66-.37,1.26-.76,1.86-1.2l-.03-.07c-2.22-3.85-3.55-7.93-4.02-11.85-.23-1.93-.27-3.85-.1-5.68-1.1.13-2.19.03-3.25-.27-2.16-.56-4.08-1.96-5.35-3.98-.1-.13-.2-.3-.27-.47-1.13-2.09-1.36-4.48-.8-6.64.6-2.16,1.99-4.15,4.08-5.38.1-.1.23-.17.36-.23,2.13-1.13,4.52-1.36,6.64-.8,2.26.6,4.25,2.06,5.51,4.21h0v.03c1.26,2.16,1.49,4.62.9,6.84-.43,1.69-1.4,3.29-2.76,4.48-.53,2.26-.66,4.75-.33,7.3.36,3.12,1.39,6.34,3.05,9.43,7.87-8.03,9.79-20.61,3.88-30.81C87.85,2.9,72.15-1.31,59.87,5.79h0Z"/>
    <path d="M60.93,7.88c-4.12,2.39-7.24,5.88-9.19,9.89-2.03,4.15-2.79,8.9-2.12,13.51.13,1-.36,1.93-1.19,2.39L7.85,57.08l-2.66,9.89,9.89,2.66,3.09-1.76.6-6.24c.13-1.26,1.26-2.22,2.56-2.09.23,0,.47.07.66.17v-.03l4.68,1.93,1-3.68c.33-1.26,1.59-1.99,2.86-1.66l.1.03,5.41,1.26,4.32-2.49.27-5.91c.07-1.29,1.13-2.29,2.42-2.22.37,0,.66.1.96.23l5.61,2.56,6.11-3.52c.83-.5,1.86-.37,2.59.2,3.68,2.89,8.17,4.58,12.78,4.88h0c4.48.33,9.1-.63,13.28-3.05.66-.4,1.33-.8,1.93-1.23.33.66.7,1.33,1.06,1.99.43.73.83,1.39,1.29,2.06-.63.43-1.26.83-1.96,1.23-5.01,2.89-10.56,4.05-15.93,3.68-5.01-.36-9.86-2.06-14.04-4.95l-5.74,3.32c-.66.4-1.46.5-2.22.13l-3.62-1.66-.2,3.75c-.03.76-.43,1.53-1.16,1.93l-6.21,3.59c-.5.3-1.1.4-1.73.26l-4.25-1.03-1.06,4.02c-.03.1-.07.2-.1.33-.5,1.19-1.86,1.76-3.05,1.26l-4.25-1.69-.4,4.28c-.1.73-.5,1.43-1.16,1.83l-4.81,2.76c-.53.36-1.23.53-1.93.33l-13.08-3.52c-1.26-.33-1.99-1.59-1.66-2.85l3.49-13.08c.17-.6.53-1.09,1.1-1.43l40.13-23.17c-.43-5.04.53-10.12,2.76-14.64,2.32-4.78,6.07-8.96,11.02-11.88l.13-.07C65.41-.12,73.04-.88,79.95.94c6.87,1.86,13.05,6.31,16.93,12.91l.07.17c3.88,6.67,4.65,14.31,2.82,21.25-1.3,4.78-3.85,9.2-7.5,12.78-.3-.46-.56-.93-.86-1.39-.53-.96-1.03-1.92-1.46-2.92,2.56-2.79,4.35-6.11,5.31-9.69,1.53-5.78.86-12.12-2.36-17.69l-.07-.13c-3.22-5.51-8.37-9.2-14.07-10.72-5.78-1.56-12.15-.9-17.73,2.32l-.1.07Z"/>
    <path fillRule="evenodd" d="M135.12,80.68v35.12h-17.3v-19.82h-17.66v19.82h-17.3v-35.12l-5.08,4.28-5.21-6.11,23.64-20.02c.4.3.8.57,1.2.83,1.13.7,2.29,1.33,3.45,1.86-.27.53-.46,1.09-.63,1.66-.6,2.26-.33,4.71.93,6.87h0c1.23,2.19,3.25,3.62,5.48,4.22,2.22.6,4.71.37,6.87-.9h0c2.16-1.26,3.62-3.25,4.22-5.51.6-2.22.36-4.68-.9-6.84l-.03-.03c-1.23-2.16-3.25-3.62-5.48-4.21-2.22-.6-4.68-.33-6.84.93-.1.03-.16.07-.23.13-1.46-.53-2.92-1.23-4.32-2.12l9.06-7.63,13.15,11.12v-7.07h12.98v18.03l10.26,8.7-5.21,6.11-5.05-4.28Z"/>
    <path d="M137.45,85.69v30.11c0,1.29-1.03,2.36-2.32,2.36h-17.3c-1.29,0-2.36-1.06-2.36-2.36v-17.5h-12.98v17.5c0,1.29-1.03,2.36-2.32,2.36h-17.3c-1.29,0-2.36-1.06-2.36-2.36v-30.11l-1.23,1.03c-.96.83-2.42.7-3.25-.27h0l-5.21-6.11c-.86-.96-.73-2.46.23-3.29l23.3-19.69c.96.86,2.02,1.59,3.05,2.29.3.17.6.33.86.5l-22.37,18.96,2.16,2.56,3.15-2.62c.4-.43,1-.73,1.66-.73,1.29,0,2.36,1.06,2.36,2.36v32.8h12.58v-17.49c0-1.29,1.06-2.36,2.36-2.36h17.66c1.29,0,2.32,1.06,2.32,2.36v17.49h12.61v-32.8h0c0-.53.2-1.06.56-1.49.83-1,2.29-1.13,3.29-.3l3.29,2.79,2.19-2.56-8.37-7.1c-.6-.4-.96-1.09-.96-1.86v-15.67h-8.27v4.71h0c0,.53-.2,1.06-.56,1.49-.83,1-2.29,1.13-3.29.3l-11.65-9.86-6.87,5.81c-.76-.36-1.49-.76-2.19-1.23-.66-.43-1.33-.9-1.96-1.39l9.49-8.03c.9-.76,2.19-.73,3.05.03l9.3,7.83v-2.02c0-1.29,1.03-2.32,2.32-2.32h12.98c1.29,0,2.32,1.03,2.32,2.32v16.93l9.46,8c1,.83,1.09,2.29.27,3.29l-5.21,6.11c-.83,1-2.32,1.1-3.29.27l-.1-.1-1.13-.93Z"/>
  </svg>
);

// Deals Maker icon - Dollar sign in circle
const DealsIcon = ({ active }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 92.92 92.92" fill="none">
    <circle fill={active ? '#0891B2' : '#94A3B8'} cx="46.46" cy="46.46" r="46.46"/>
    <path fill="#fff" d="M46.46,85.68c-21.63,0-39.22-17.59-39.22-39.22S24.83,7.24,46.46,7.24s39.22,17.59,39.22,39.22-17.59,39.22-39.22,39.22ZM46.46,10.29c-19.94,0-36.17,16.22-36.17,36.17s16.22,36.17,36.17,36.17,36.17-16.22,36.17-36.17S66.4,10.29,46.46,10.29Z"/>
    <path fill="#fff" d="M44.75,74.6v-6.7l-.81-.1c-3.15-.37-7.57-1.73-10.86-4.42l3.4-5.27c3.43,2.48,6.38,3.59,9.45,3.59,5.34,0,6.46-3.05,6.46-5.61,0-3.57-3.7-5.45-7.61-7.44-4.85-2.47-10.34-5.26-10.34-11.69s3.49-10.43,9.56-11.64l.74-.15v-6.87h4.8v6.77l.78.12c3.42.52,6.29,2.01,8.98,4.66l-3.84,4.4c-2.17-1.85-4.33-3.05-7.32-3.05-4.93,0-5.96,2.88-5.96,5.29,0,3.26,3.5,4.94,7.2,6.71,5.04,2.42,10.75,5.16,10.75,12.2,0,6.36-3.59,10.76-9.85,12.09l-.73.15v6.95h-4.8Z"/>
  </svg>
);

const NAV_ICONS: Record<NavItemId, React.FC<{ active?: boolean }>> = {
  search: SearchIcon,
  home: HomeIcon,
  trends: TrendsIcon,
  analysis: AnalysisIcon,
  compare: CompareIcon,
  rentals: RentalsIcon,
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
  savedPropertyId,
}: CompactHeaderProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(defaultPropertyOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
  
  // Navigation context for toolbar
  // Include propertyId for saved properties so Deal Maker values persist across pages
  const navContext: NavContext = {
    address: fullAddress,
    zpid: property.zpid,
    propertyId: savedPropertyId,
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
