export const STRATEGY_SCHEMA_BY_SLUG: Record<
  string,
  { name: string; description: string; steps: { name: string; text: string }[] }
> = {
  'long-term-rental': {
    name: 'Long-Term Rental',
    description:
      'Buy-and-hold rental underwriting: rent comps, expense ratio, cap rate, cash-on-cash, and vacancy stress tests.',
    steps: [
      { name: 'Verify rent', text: 'Compare IQ Estimate, Zillow, RentCast, and Redfin rent signals.' },
      { name: 'Model expenses', text: 'Apply taxes, insurance, management, maintenance, and vacancy.' },
      { name: 'Stress financing', text: 'Test rate, down payment, and DSCR at your lender minimum.' },
      { name: 'Set offer', text: 'Use Target Buy and Deal Gap to size your offer.' },
    ],
  },
  'short-term-rental': {
    name: 'Short-Term Rental',
    description:
      'Airbnb-style income modeling with seasonality, furnishing costs, and platform fees.',
    steps: [
      { name: 'Estimate ADR', text: 'Use Mashvisor and market comps for nightly rate and occupancy.' },
      { name: 'Load operating costs', text: 'Include cleaning, supplies, utilities, and management.' },
      { name: 'Compare to LTR', text: 'See whether STR beats long-term rent on the same property.' },
      { name: 'Price the deal', text: 'Anchor offer to cash flow after furnishing and ramp-up.' },
    ],
  },
  brrrr: {
    name: 'BRRRR',
    description:
      'Buy, Rehab, Rent, Refinance, Repeat — ARV-based acquisition, rehab budget, and refi cash-out targets.',
    steps: [
      { name: 'Set ARV', text: 'Triangulate value from multiple AVM sources and sale comps.' },
      { name: 'Budget rehab', text: 'Itemize capex and hold costs through lease-up.' },
      { name: 'Stabilize rent', text: 'Underwrite post-rehab rent and operating expenses.' },
      { name: 'Plan refi', text: 'Model LTV, seasoning, and cash left in the deal after refinance.' },
    ],
  },
  'fix-flip': {
    name: 'Fix & Flip',
    description:
      'Acquisition, rehab, holding, and disposition math with profit margin and timeline risk.',
    steps: [
      { name: 'Estimate ARV', text: 'Use sale comps and value estimates for exit price.' },
      { name: 'Build rehab scope', text: 'Separate hard and soft costs with contingency.' },
      { name: 'Add carry', text: 'Include interest, taxes, insurance, and selling costs.' },
      { name: 'Check margin', text: 'Require minimum profit after all-in costs and slippage.' },
    ],
  },
  'house-hack': {
    name: 'House Hack',
    description:
      'Owner-occupant financing with roommate or duplex income offsetting the mortgage.',
    steps: [
      { name: 'Split units', text: 'Model owner unit vs rentable portion separately.' },
      { name: 'Use OO financing', text: 'Apply FHA or conventional owner-occupant terms.' },
      { name: 'Offset payment', text: 'Calculate net housing cost after rental income.' },
      { name: 'Plan exit', text: 'Evaluate converting to full rental after 12 months.' },
    ],
  },
  wholesale: {
    name: 'Wholesale',
    description:
      'Contract-and-assign math: MAO, assignment fee, and buyer appetite for the spread.',
    steps: [
      { name: 'Find ARV', text: 'Establish after-repair or as-is value for end buyers.' },
      { name: 'Estimate repairs', text: 'Use rehab ranges your cash buyers expect.' },
      { name: 'Calculate MAO', text: 'Apply your margin rule (e.g. 70% minus repairs minus fee).' },
      { name: 'Market the deal', text: 'Compare list price to MAO and assignment feasibility.' },
    ],
  },
}
