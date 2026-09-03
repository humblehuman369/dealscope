/**
 * The consented early-user testimonials. Single source for SocialProof
 * (client) and the /answers landing pages (server). Add entries only when
 * the quote is real and the person agreed to be quoted.
 */

export interface Testimonial {
  quote: string
  initials: string
  name: string
  role: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'I used to spend 45 minutes per property on a spreadsheet. DealGapIQ gives me a better answer in under a minute. The Deal Gap concept alone changed how I evaluate deals.',
    initials: 'MR',
    name: 'Michael R.',
    role: 'Portfolio investor \u00b7 12 properties',
  },
  {
    quote:
      'The Income Value calculation is something I\u2019ve never seen anywhere else. Knowing exactly where breakeven sits \u2014 before I even tour a property \u2014 saves me from chasing bad deals.',
    initials: 'TL',
    name: 'Tamara L.',
    role: 'BRRRR investor \u00b7 Denver, CO',
  },
  {
    quote:
      'I was skeptical of another calculator tool. But seeing the actual assumptions behind the numbers \u2014 and being able to change them \u2014 that\u2019s what convinced me to pay for Pro.',
    initials: 'JK',
    name: 'James K.',
    role: 'CPA & buy-and-hold investor',
  },
]
