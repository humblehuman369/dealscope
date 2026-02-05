// Landing page types and constants

export interface Strategy {
  id: string;
  name: string;
  tagline: string;
  description: string;
  statValue: string;
  statLabel: string;
  color: string;
  href: string;
  badge?: string;
}

// IQ Stats Bar - Five core IQ products
export interface IQStat {
  name: string;
  desc: string;
  icon: string;
}

export const iqStats: IQStat[] = [
  { name: 'Price', desc: '3 prices that define your deal', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { name: 'Scan', desc: 'Point at any property', icon: 'M3 3h18v18H3V3zM3 9h18M9 21V9' },
  { name: 'Strategy', desc: '6 strategies analyzed', icon: 'M12 2L2 7l12 12l22 7l12 2zM2 17l10 5l10-5M2 12l10 5l10-5' },
  { name: 'Model', desc: '15+ variables you control', icon: 'M18 20V10M12 20V4M6 20v-6' },
  { name: 'Verdict', desc: 'Clear recommendation', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
];

// PriceIQ Sample Data
export interface PriceIQCard {
  name: string;
  suffix: string;
  value: string;
  description: string;
  subtext: string;
  subtext2?: string;
  featured?: boolean;
}

export const priceIQData: PriceIQCard[] = [
  {
    name: 'Breakeven',
    suffix: '',
    value: '$807,087',
    description: 'Max price for $0 cashflow',
    subtext: 'Your ceiling. Don\'t cross it.',
  },
  {
    name: 'Target',
    suffix: '',
    value: '$766,733',
    description: '5% discount for profit',
    subtext: 'Your optimal offer price',
    subtext2: 'Your optimal ARV price',
    featured: true,
  },
  {
    name: 'Wholesale',
    suffix: '',
    value: '$564,961',
    description: '30% discount for assignment',
    subtext: 'Your wholesale number',
  },
];

// ScanIQ Input Methods
export interface InputMethod {
  title: string;
  description: string;
  icon: string;
  action: 'scan' | 'address' | 'link';
}

export const inputMethods: InputMethod[] = [
  {
    title: 'Point & Scan',
    description: 'Snap a For Sale sign, address, or listing sheet. ScanIQ reads it instantly.',
    icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    action: 'scan',
  },
  {
    title: 'Enter Address',
    description: 'Type or paste any property address. We pull the data automatically.',
    icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    action: 'address',
  },
  {
    title: 'Drop a Link',
    description: 'Paste a Zillow, Redfin, or MLS URL. We extract everything we need.',
    icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    action: 'link',
  },
];

// VerdictIQ Types
export interface VerdictType {
  verdict: string;
  color: 'emerald' | 'amber' | 'red';
  title: string;
  description: string;
  logic: string;
}

export const verdictTypes: VerdictType[] = [
  {
    verdict: 'Strong Buy',
    color: 'emerald',
    title: 'Move Fast',
    description: 'Asking price is at or below your Target. This deal works across multiple strategies.',
    logic: 'Asking ≤ Target',
  },
  {
    verdict: 'Marginal',
    color: 'amber',
    title: 'Negotiate Down',
    description: 'Asking price is between Target and Breakeven. Thin margins — proceed with caution.',
    logic: 'Target < Asking < Breakeven',
  },
  {
    verdict: 'Pass',
    color: 'red',
    title: 'Walk Away',
    description: "Asking price exceeds your Breakeven. This deal doesn't work at any strategy.",
    logic: 'Asking > Breakeven',
  },
];

// Founder Section
export interface FounderStat {
  value: string;
  label: string;
}

export const founderStats: FounderStat[] = [
  { value: '35+', label: 'Years' },
  { value: '80+', label: 'Companies' },
  { value: '30+', label: 'Years with GSEs' },
  { value: '500+', label: 'Projects' },
];

export const founderInfo = {
  name: 'Brad Geisen',
  title: 'Founder, InvestIQ • Real Estate Technology Pioneer',
  quote: 'I built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. Founded Foreclosure.com before data platforms existed and spent 35 years building the infrastructure institutions depend on. DealMakerIQ puts that same intelligence in your hands.',
  credentials: ['Fannie Mae', 'Freddie Mac', 'HUD'],
};

// IQ Features (Complete Toolkit)
export interface IQFeature {
  name: string;
  hasIQ: boolean;
  description: string;
}

export const iqFeatures: IQFeature[] = [
  { name: 'Price', hasIQ: true, description: 'Three numbers that define your deal: Breakeven, Target, and Wholesale prices calculated instantly.' },
  { name: 'Scan', hasIQ: true, description: 'Point your camera at any property. Address, sign, or listing — we read it instantly.' },
  { name: 'Strategy', hasIQ: true, description: 'See how every property performs across all 6 investment strategies simultaneously.' },
  { name: 'Model', hasIQ: true, description: 'Adjust 15+ variables and watch your prices and returns update in real time.' },
  { name: 'Verdict', hasIQ: true, description: 'Clear recommendation based on where asking price falls relative to your target prices.' },
  { name: 'Comp', hasIQ: true, description: 'See what similar properties sold for. Validate your analysis with real market data.' },
  { name: 'Report', hasIQ: true, description: 'Generate lender-ready PDF reports to share with partners or your investment team.' },
  { name: 'Pipeline', hasIQ: true, description: 'Save deals, build your pipeline, and compare opportunities side-by-side.' },
  { name: '60-Second', hasIQ: false, description: 'From address to actionable intelligence in under a minute. Speed is your advantage.' },
];

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
    description: 'Buy and hold for consistent monthly rental income. Build wealth through appreciation and mortgage paydown.',
    statValue: '8-12%',
    statLabel: 'CoC',
    color: '#0465f2',
    href: '/strategies/strategy-long-term-rental.html',
    badge: 'Most Popular',
  },
  {
    id: 'short',
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    description: 'Maximize income through Airbnb or VRBO. Higher returns with active management and seasonal demand.',
    statValue: '15-25%',
    statLabel: 'CoC',
    color: '#8b5cf6',
    href: '/strategies/strategy-short-term-rental.html',
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    description: 'Buy, Rehab, Rent, Refinance, Repeat. Recycle your capital to build a portfolio quickly.',
    statValue: 'Scale Fast',
    statLabel: '',
    color: '#f97316',
    href: '/strategies/strategy-brrrr.html',
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    description: 'Purchase undervalued, renovate strategically, sell for profit. Quick returns with active management.',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
    href: '/strategies/strategy-fix-flip.html',
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Cut your housing costs up to 100%',
    description: 'Live in one unit, rent the others. Eliminate your housing payment while building equity.',
    statValue: '75%',
    statLabel: 'Cost Cut',
    color: '#14b8a6',
    href: '/strategies/strategy-house-hack.html',
    badge: 'Beginner Friendly',
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts, profit',
    description: 'Find deals, assign contracts, collect fees. Zero capital required — just hustle and knowledge.',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: '#84cc16',
    href: '/strategies/strategy-wholesale.html',
  },
];

export const features: Feature[] = [
  {
    icon: 'scan',
    title: "Know if it's a deal in 60 seconds",
    description: 'Point your camera at any property and get instant analysis without spreadsheets.',
  },
  {
    icon: 'strategy',
    title: 'Find the strategy that fits YOUR goals',
    description: 'See how every property performs across all 6 investment strategies instantly.',
  },
  {
    icon: 'comps',
    title: 'See what similar properties sold for',
    description: 'Access real market comps to validate your analysis and make confident offers.',
  },
  {
    icon: 'profit',
    title: 'Model your exact profit before offering',
    description: 'Adjust every variable and watch returns update in real-time with DealMakerIQ.',
  },
  {
    icon: 'report',
    title: 'Professional PDF reports',
    description: 'Generate lender-ready reports to share with partners or your investment team.',
  },
  {
    icon: 'compare',
    title: 'Save & compare deals',
    description: 'Build a pipeline of investments and compare them side-by-side.',
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

// Capability Stats for launch (replaces social proof)
export const capabilityStats = [
  { value: '60s', label: 'Analysis Time' },
  { value: '6', label: 'Strategies Per Property' },
  { value: '15+', label: 'Variables You Control' },
  { value: '100%', label: 'Free to Start' },
];

// Trust Stats Bar - credibility signals for above the fold
export const trustStats = [
  { value: '10K+', label: 'Properties Analyzed', icon: 'chart' },
  { value: 'Zillow', label: 'Data from Zillow API', icon: 'database' },
  { value: '256-bit', label: 'Bank-level Encryption', icon: 'shield' },
];

// How It Works Steps
export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
  color: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    number: 1,
    title: 'Point & Scan',
    description: 'Open InvestIQ and point your camera at any address, For Sale sign, or MLS listing. Our AI reads it instantly.',
    color: '#0891B2',
  },
  {
    number: 2,
    title: 'Instant Analysis',
    description: 'InvestIQ pulls real-time market data and runs comprehensive analysis across all six investment strategies.',
    color: '#8b5cf6',
  },
  {
    number: 3,
    title: 'Decide with Confidence',
    description: 'Get clear recommendations on the best strategy. Compare deals and invest with confidence.',
    color: '#06B6D4',
  },
];

// Testimonials
export interface Testimonial {
  text: string;
  authorName: string;
  authorTitle: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  {
    text: "I analyzed 47 properties during a single Saturday driving around neighborhoods. InvestIQ found me a BRRRR deal that everyone else missed.",
    authorName: 'Marcus Chen',
    authorTitle: 'Portfolio Investor • Denver, CO',
    initials: 'MC',
  },
  {
    text: "The six-strategy comparison saved me from making a huge mistake. What I thought was a flip was actually a perfect long-term hold.",
    authorName: 'Sarah Williams',
    authorTitle: 'First-Time Investor • Austin, TX',
    initials: 'SW',
  },
  {
    text: "Finally, a tool built for how I actually find deals—in my car, driving past properties. Point, scan, done.",
    authorName: 'David Rodriguez',
    authorTitle: 'Real Estate Agent • Phoenix, AZ',
    initials: 'DR',
  },
];

// About section cards
export interface AboutCard {
  icon: string;
  title: string;
  description: string;
}

export const aboutCards: AboutCard[] = [
  {
    icon: 'database',
    title: 'Data Sources',
    description: 'We aggregate data from public records, MLS feeds, and proprietary rental estimates to ensure accuracy.',
  },
  {
    icon: 'calculator',
    title: 'Calculation Methods',
    description: 'Every metric follows industry-standard formulas used by professional investors and lenders.',
  },
  {
    icon: 'shield',
    title: 'Accuracy Commitment',
    description: 'Our estimates are designed for initial screening. We always recommend verifying with local data before making offers.',
  },
];
