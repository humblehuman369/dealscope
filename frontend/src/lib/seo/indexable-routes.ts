/** Marketing URLs we want crawled and indexed (matches GSC sitemap discovery set). */
export const INDEXABLE_SITE_SECTIONS = [
  {
    title: 'Product',
    links: [
      { href: '/discovery', label: 'Discovery — instant deal score' },
      { href: '/strategy', label: 'Strategy — full financial deep-dive' },
      { href: '/deal-maker', label: 'DealMaker — assumptions & offer scripts' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/what-is-dealgapiq', label: 'What is DealGapIQ?' },
    ],
  },
  {
    title: 'Investment strategies',
    links: [
      { href: '/strategies/long-term-rental', label: 'Long-term rental' },
      { href: '/strategies/short-term-rental', label: 'Short-term rental (STR)' },
      { href: '/strategies/brrrr', label: 'BRRRR' },
      { href: '/strategies/fix-flip', label: 'Fix & flip' },
      { href: '/strategies/house-hack', label: 'House hack' },
      { href: '/strategies/wholesale', label: 'Wholesale' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { href: '/methodology', label: 'Methodology' },
      { href: '/national-averages', label: 'National benchmarks' },
      { href: '/glossary', label: 'Glossary' },
      { href: '/blog', label: 'Blog' },
      { href: '/help', label: 'Help center' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    title: 'Comparisons',
    links: [
      { href: '/comparisons/dealgapiq-vs-dealcheck', label: 'DealGapIQ vs DealCheck' },
      { href: '/comparisons/dealgapiq-vs-mashvisor', label: 'DealGapIQ vs Mashvisor' },
      { href: '/comparisons/dealgapiq-vs-propstream', label: 'DealGapIQ vs PropStream' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/disclosures', label: 'Disclosures' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
    ],
  },
] as const
