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
    href: '/strategies/strategy-long-term-rental.html',
  },
  {
    id: 'short',
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    description: 'Maximize income through Airbnb or VRBO rentals. Higher returns with more active management and seasonal demand.',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: '#8b5cf6',
    href: '/strategies/strategy-short-term-rental.html',
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat wealth builder',
    description: 'Buy a fixer-upper, Renovate it, Rent it out, then Refinance to get your cash back and Repeat',
    statValue: '∞',
    statLabel: 'Scale',
    color: '#f97316',
    href: '/strategies/strategy-brrrr.html',
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    description: 'Purchase undervalued properties, renovate strategically, and sell for profit. Quick returns with active project management.',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
    href: '/strategies/strategy-fix-flip.html',
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Cut your housing costs up to 100%',
    description: 'Live in one unit while renting others. Eliminate your housing payment and start building wealth from day one.',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: '#14b8a6',
    href: '/strategies/strategy-house-hack.html',
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts, profit',
    description: 'Find properties under market value, get them under contract, then assign to other investors for a fee. Zero capital required.',
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
