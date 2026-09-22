import { SPEED_CLAIM } from '@/lib/claims'

/** Shared by the home How it works section and the HowTo JSON-LD. */
export const HOME_HOWTO_NAME = `How DealGapIQ analyzes a deal in ${SPEED_CLAIM}`

export const HOME_HOWTO_DESCRIPTION =
  'It runs three steps: search an address, see the deal gap, and get four paths plus a Blend. The whole analysis runs in under a minute.'

export const HOME_HOWTO_STEPS = [
  {
    name: 'Search any address',
    text: 'Works on active listings, expired, or even off-market comps. No login required for first discovery.',
  },
  {
    name: 'See the Deal Gap instantly',
    text: 'Multi-source valuation + our proprietary gap calculation. Know exactly how far off the listing is from a real deal.',
  },
  {
    name: 'Get four paths plus a Blend',
    text: 'Price, Income, Terms and Equity, and a Blend that combines them. One click opens the full negotiation script, worksheet, and talking points tailored to the seller type.',
  },
] as const
