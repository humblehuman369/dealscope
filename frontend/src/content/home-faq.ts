import type { FaqItem } from '@/lib/seo/metadata'
import { ANDROID_APPLICATION_ID, IOS_APP_STORE_ID } from '@/config/site'
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PER_MONTH, SPEED_CLAIM } from '@/lib/claims'

/**
 * Home page FAQ. Rendered visibly by `FaqSection` and emitted as `FAQPage`
 * JSON-LD by `HomeJsonLd`, so the two can never disagree.
 */
export const HOME_FAQ: FaqItem[] = [
  {
    question: 'What is DealGapIQ?',
    answer: `DealGapIQ is a real estate investment analysis tool that shows the gap between a property's price and its investor value, then gives four paths plus a Blend to close it. It covers six strategies in every U.S. market and runs in ${SPEED_CLAIM}. It starts free.`,
  },
  {
    question: 'What does "deal gap" mean?',
    answer:
      "The deal gap is the difference between the seller's asking price and the target buy price that makes the deal work for an investor. DealGapIQ reports it as a percentage and a dollar amount. A negative gap means the list price is above the target.",
  },
  {
    question: 'How do I find real estate deals?',
    answer: `Start with the number, not the listing. A good real estate deal is any property, on-market or off-market, where the list price is close to the target buy price for your strategy. To find investment properties and undervalued properties, run every address you see through a deal gap check, then focus on the ones with the smallest gap. Sources that surface good deals include foreclosures, pre-foreclosures, expired listings, absentee owners, tax delinquent lists, and off-market owners you contact directly. DealGapIQ scores any U.S. address against six strategies in ${SPEED_CLAIM} and gives four paths plus a Blend to close the gap: Price, Income, Terms and Equity, and a Blend that combines them. The free plan includes three discoveries a month with no credit card.`,
  },
  {
    question: 'Is DealGapIQ free?',
    answer: `Yes, the free plan gives three discoveries a month, the full analysis, and negotiation scripts, with no credit card. Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually and comes with a 7-day trial.`,
  },
  {
    question: 'Does DealGapIQ work for BRRRR and fix and flip?',
    answer:
      'Yes. Every discovery is scored against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale. Pro users can edit the assumptions for each.',
  },
  {
    question: 'How is DealGapIQ different from DealCheck?',
    answer:
      'DealCheck is a calculator that tells you whether a deal works at a given price. DealGapIQ tells you the price at which it works, how far the listing is from that price, and four paths plus a Blend to get there, including creative financing. DealCheck is cheaper; DealGapIQ includes buyer and lender directories.',
  },
  {
    question: 'Does DealGapIQ need a mailing list or motivated seller?',
    answer:
      'No. Any property qualifies. The tool finds the gap and the structure that closes it, so you can make an offer on a normal listing rather than mailing thousands of owners hoping one is distressed.',
  },
  {
    question: 'Does DealGapIQ cover my area?',
    answer:
      'DealGapIQ is live in every U.S. market. It surfaces foreclosures, pre-foreclosures, expired listings, absentee owners, and distressed sellers by address, city, or ZIP.',
  },
  {
    question: 'Is there a DealGapIQ app?',
    answer: `Yes. There are iOS, macOS and Android apps (App Store ID ${IOS_APP_STORE_ID}; Google Play id ${ANDROID_APPLICATION_ID}) and a Point & Scan feature that runs a discovery when you point your phone camera at a house. Scanning also works without the app installed.`,
  },
]
