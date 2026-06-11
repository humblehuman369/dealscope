import type { ComparisonPageConfig } from '@/components/comparisons/ComparisonPage'

const BASE = {
  dealgapiqStrengths: [
    'Six-strategy Discovery score with Deal Gap on every address',
    'Transparent IQ Estimate blending Zillow, RentCast, Redfin, and Realtor.com, plus AirROI STR analytics',
    'DealMaker offer scripts and creative-finance structures (Subject-To, seller carry)',
    '60-second first pass before you build a spreadsheet',
  ],
}

export const COMPARISON_PAGES: Record<string, ComparisonPageConfig> = {
  'dealgapiq-vs-dealcheck': {
    slug: 'dealgapiq-vs-dealcheck',
    competitor: 'DealCheck',
    metadata: {
      title: 'DealGapIQ vs DealCheck — Which Tool Fits Your Workflow?',
      description:
        'Compare DealGapIQ and DealCheck for residential underwriting: multi-strategy scoring, Deal Gap, creative finance, and offer scripts vs mobile-first deal checks.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-dealcheck' },
    },
    headline: 'DealGapIQ vs DealCheck',
    summary:
      'DealCheck is known for fast mobile property screens. DealGapIQ goes deeper on six strategies, surfaces the Deal Gap, and generates negotiation-ready offer language — built for investors who need more than a pass/fail.',
    ...BASE,
    competitorStrengths: [
      'Mature mobile app with quick property lookup',
      'Familiar workflow for agents doing light investor math',
      'Established brand in the mobile deal-check category',
    ],
    whenToUse: {
      dealgapiq:
        'You need multi-strategy ranking, creative-finance modeling, and offer scripts on every deal — not just a single metric snapshot.',
      competitor:
        'You only need a lightweight mobile sanity check and already have a separate spreadsheet for full underwriting.',
    },
    faq: [
      {
        question: 'Is DealGapIQ a replacement for DealCheck?',
        answer:
          'For active residential investors who underwrite across multiple strategies, DealGapIQ replaces the spreadsheet-plus-calculator stack many DealCheck users maintain alongside the app.',
      },
      {
        question: 'Does DealGapIQ work on mobile?',
        answer:
          'Yes. DealGapIQ runs in the browser and as native iOS/Android apps via Capacitor, including Point & Scan on mobile.',
      },
    ],
  },
  'dealgapiq-vs-mashvisor': {
    slug: 'dealgapiq-vs-mashvisor',
    competitor: 'Mashvisor',
    metadata: {
      title: 'DealGapIQ vs Mashvisor — STR Data vs Full Deal Underwriting',
      description:
        'Mashvisor excels at short-term rental analytics. DealGapIQ adds six-strategy underwriting, LTR/BRRRR/flip models, and offer scripts on the same property.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-mashvisor' },
    },
    headline: 'DealGapIQ vs Mashvisor',
    summary:
      'Mashvisor is the go-to for Airbnb market research. DealGapIQ pairs AirROI STR revenue projections with multi-source valuations, then ranks the property across LTR, STR, BRRRR, flip, house hack, and wholesale with a unified Deal Gap.',
    dealgapiqStrengths: [
      ...BASE.dealgapiqStrengths,
      'AirROI-powered STR revenue, nightly rate, and occupancy inside a broader six-strategy model',
    ],
    competitorStrengths: [
      'Deep short-term rental market analytics and heatmaps',
      'Strong Airbnb occupancy and revenue forecasting',
      'Market discovery for STR-focused investors',
    ],
    whenToUse: {
      dealgapiq:
        'You want STR insight plus LTR, BRRRR, and flip on the same address with offer-ready numbers.',
      competitor:
        'Your entire business is STR market selection and you do not need buy-and-hold or flip underwriting.',
    },
    faq: [
      {
        question: 'Does DealGapIQ use Mashvisor data?',
        answer:
          'No. DealGapIQ sources STR revenue, nightly rate, and occupancy projections from AirROI, and blends Zillow, RentCast, Redfin, and Realtor.com for valuations and rent.',
      },
    ],
  },
  'dealgapiq-vs-propstream': {
    slug: 'dealgapiq-vs-propstream',
    competitor: 'PropStream',
    metadata: {
      title: 'DealGapIQ vs PropStream — Lead Lists vs Deal Intelligence',
      description:
        'PropStream finds leads and lists. DealGapIQ underwrites the deal: six strategies, Deal Gap, sensitivity, and offer scripts once you have an address.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-propstream' },
    },
    headline: 'DealGapIQ vs PropStream',
    summary:
      'PropStream is a data and marketing platform for finding motivated sellers. DealGapIQ is what you run after you have an address — full financial underwriting, strategy ranking, and negotiation assets.',
    ...BASE,
    competitorStrengths: [
      'Nationwide property search and list building',
      'Skip tracing and direct-mail workflows',
      'Comparable sales and ownership data at scale',
    ],
    whenToUse: {
      dealgapiq:
        'You have a property (from PropStream, MLS, or driving for dollars) and need to know if it is a deal and what to offer.',
      competitor:
        'You are still building lists and need skip trace, filters, and outbound campaigns — not per-deal underwriting.',
    },
    faq: [
      {
        question: 'Can I use DealGapIQ with PropStream leads?',
        answer:
          'Yes. Paste any address from PropStream into Discovery — DealGapIQ is complementary, not a list provider.',
      },
    ],
  },
}
