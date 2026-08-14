import type { Author } from './types'

export const AUTHORS: Record<string, Author> = {
  'brad-geisen': {
    slug: 'brad-geisen',
    name: 'Brad Geisen',
    role: 'Founder & CEO, DealGapIQ',
    shortBio:
      'Founder of DealGapIQ and Foreclosure.com. Built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac.',
    bio: [
      'DealGapIQ Investor Intelligence is written by Brad Geisen — founder of Foreclosure.com and the technologist Fannie Mae and Freddie Mac trusted to build the public faces of their portfolios.',
      'Over two decades ago, Fannie Mae discovered that Brad’s proprietary data platform knew more about their portfolio than their own internal infrastructure — and commissioned him to build HomePath.com. He went on to build HomeSteps.com for Freddie Mac, establishing a technology partnership with both GSEs that has lasted 30+ years. Earlier work on the 1991 HUD public/private partnership shaped how distressed residential portfolios are evaluated, priced, and sold at institutional scale.',
      'Behind those institutional programs, he has personally invested in thousands of properties — the firsthand reps that separate a listing from a true opportunity. DealGapIQ takes that same analytical rigor and puts it in the hands of every individual investor.',
    ],
    credentials: [
      'Founded Foreclosure.com',
      'Built HomePath.com for Fannie Mae',
      'Built HomeSteps.com for Freddie Mac',
      '30+ year GSE technology partnership',
      '1991 HUD public/private partnership',
    ],
    linkedin: 'https://www.linkedin.com/in/bradgeisen',
    imageSrc: '/images/brad-geisen-about.png',
    imageAlt: 'Brad Geisen, founder of DealGapIQ and Foreclosure.com',
  },
}

export function getAuthor(slug: string): Author | undefined {
  return AUTHORS[slug]
}
