// Landing page types and constants

export interface Strategy {
  id: string;
  name: string;
  tagline: string;
  description: string;
  statValue: string;
  statLabel: string;
  color: string;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface FloatingCard {
  value: string;
  label: string;
  position: 'top-right' | 'mid-left' | 'bottom-right';
}

export const strategies: Strategy[] = [
  {
    id: 'long',
    name: 'Long-Term Rental',
    tagline: 'Steady income & build equity',
    description: 'Buy and hold properties for consistent monthly rental income. Build long-term wealth through appreciation and mortgage paydown.',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: '#0465f2',
  },
  {
    id: 'short',
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    description: 'Maximize income through Airbnb or VRBO rentals. Higher returns with more active management and seasonal demand.',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: '#8b5cf6',
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat wealth builder',
    description: 'Buy distressed property, renovate, rent, refinance to pull out capital, then repeat. Build a portfolio with the same initial investment.',
    statValue: '∞',
    statLabel: 'Scale',
    color: '#f97316',
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    description: 'Purchase undervalued properties, renovate strategically, and sell for profit. Quick returns with active project management.',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Cut your housing costs up to 100%',
    description: 'Live in one unit while renting others. Eliminate your housing payment and start building wealth from day one.',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: '#14b8a6',
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts, profit',
    description: 'Find properties under market value, get them under contract, then assign to other investors for a fee. Zero capital required.',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: '#84cc16',
  },
];

export const features: Feature[] = [
  {
    icon: 'scan',
    title: 'Point & Scan',
    description: 'Just point your camera at any property. Our AI instantly identifies it and pulls comprehensive data.',
  },
  {
    icon: 'chart',
    title: '6 Strategies Compared',
    description: 'See how each property performs across all major investment strategies, side by side, instantly.',
  },
  {
    icon: 'clock',
    title: '60-Second Analysis',
    description: 'From address to investment decision in under a minute. Stop wasting hours on spreadsheets.',
  },
  {
    icon: 'check',
    title: 'Accurate Projections',
    description: 'Real market data, local comps, and proven formulas power every calculation.',
  },
  {
    icon: 'folder',
    title: 'Portfolio Tracking',
    description: 'Save properties, track performance, and monitor your entire portfolio from one dashboard.',
  },
  {
    icon: 'lock',
    title: 'Bank-Level Security',
    description: 'Your data is encrypted and secure. We never share your information with third parties.',
  },
];

export const floatingCards: FloatingCard[] = [
  { value: '$847/mo', label: 'Cash Flow', position: 'top-right' },
  { value: '12.4%', label: 'Cash-on-Cash', position: 'mid-left' },
  { value: 'A+', label: 'Deal Grade', position: 'bottom-right' },
];

export const stats = [
  { value: '10K+', label: 'Properties Analyzed' },
  { value: '$2.4M', label: 'Profit Discovered' },
  { value: '60s', label: 'Average Analysis Time' },
];
