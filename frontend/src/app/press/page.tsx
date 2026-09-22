import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { JsonLd } from '@/components/seo/JsonLd'
import { BRAND_ASSETS, BRAND_OG_IMAGE, LEGAL_ENTITY_DBA } from '@/lib/brand'
import {
  BUYER_COUNT,
  LENDER_COUNT,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PER_MONTH,
  SOURCE_COUNT,
  SPEED_CLAIM,
} from '@/lib/claims'
import {
  ANDROID_APPLICATION_ID,
  COMPANY_LINKEDIN_URL,
  FOUNDER_AMAZON_URL,
  FOUNDER_BOOK,
  FOUNDER_CREDENTIAL_LINE,
  FOUNDER_LINKEDIN_URL,
  FOUNDER_NAME,
  FOUNDER_TITLE,
  GOOGLE_PLAY_URL,
  HQ_CITY,
  IOS_APP_STORE_ID,
  IOS_APP_STORE_URL,
  LAUNCH_POST_SLUG,
  SITE_URL,
  STRATEGIES,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_E164,
} from '@/config/site'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { FOUNDER_IMAGE_PATH, FOUNDER_IMAGE_SQUARE_PATH, ORG_ID, WEBSITE_ID } from '@/lib/seo/site-schema'

const TITLE = 'DealGapIQ press kit and company facts'
const DESCRIPTION =
  'Approved facts, founder bio, logos and product screenshots for DealGapIQ, the real estate deal analysis tool from Foreclosure.com founder Brad Geisen.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/press' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/press',
    type: 'website',
    images: [BRAND_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const PRESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/press#page`,
  url: `${SITE_URL}/press`,
  name: TITLE,
  description: DESCRIPTION,
  about: { '@id': ORG_ID },
  publisher: { '@id': ORG_ID },
  isPartOf: { '@id': WEBSITE_ID },
}

const STRATEGY_LIST = STRATEGIES.map((s) => s.label).join(', ')

const FACT_SHEET: Array<{ label: string; value: React.ReactNode }> = [
  { label: 'Company', value: LEGAL_ENTITY_DBA },
  { label: 'Founder', value: `${FOUNDER_NAME}, ${FOUNDER_TITLE}, author of ${FOUNDER_BOOK}` },
  { label: 'Headquarters', value: `${HQ_CITY}, Florida` },
  { label: 'Beta launch', value: 'January 2026' },
  { label: 'Public launch', value: 'August 2026' },
  { label: 'Release cadence', value: 'Updates ship weekly' },
  { label: 'Strategies', value: `Six: ${STRATEGY_LIST}` },
  {
    label: 'Data sources',
    value: `${SOURCE_COUNT} valuation and listing sources today, including Zillow, Redfin, Realtor.com and RentCast, shown side by side; more planned`,
  },
  {
    label: 'Directories (Pro)',
    value: `${BUYER_COUNT} verified cash buyers; ${LENDER_COUNT} hard money lenders`,
  },
  {
    label: 'Pricing',
    value: `Free: $0, 3 discoveries a month, 3 saved properties, no card. Pro: ${PRO_MONTHLY_PRICE}/mo or $${PRO_YEARLY_PER_MONTH}/mo billed annually, 7-day trial, no card`,
  },
  {
    label: 'Platforms',
    value: (
      <>
        Web at{' '}
        <a href={SITE_URL} className="text-[var(--accent-sky)] underline">
          dealgapiq.com
        </a>
        ; iOS App Store ID{' '}
        <a href={IOS_APP_STORE_URL} className="text-[var(--accent-sky)] underline">
          {IOS_APP_STORE_ID}
        </a>
        ; Android on{' '}
        <a href={GOOGLE_PLAY_URL} className="text-[var(--accent-sky)] underline">
          Google Play
        </a>{' '}
        ({ANDROID_APPLICATION_ID})
      </>
    ),
  },
  {
    label: 'Profiles',
    value: (
      <>
        <a href={COMPANY_LINKEDIN_URL} className="text-[var(--accent-sky)] underline">
          DealGapIQ on LinkedIn
        </a>
        {' · '}
        <a href={FOUNDER_LINKEDIN_URL} className="text-[var(--accent-sky)] underline">
          Brad Geisen on LinkedIn
        </a>
        {' · '}
        <a href={FOUNDER_AMAZON_URL} className="text-[var(--accent-sky)] underline">
          {FOUNDER_BOOK} on Amazon
        </a>
      </>
    ),
  },
  {
    label: 'Contact',
    value: (
      <>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--accent-sky)] underline">
          {SUPPORT_EMAIL}
        </a>
        {' · '}
        <a href={`tel:${SUPPORT_PHONE_E164.replace(/-/g, '')}`} className="text-[var(--accent-sky)] underline">
          {SUPPORT_PHONE}
        </a>
      </>
    ),
  },
]

/** Founder headshots under `public/press/` (sources: Brad's press-assets pack). */
const HEADSHOT_PACK: Array<{ label: string; href: string; note: string }> = [
  { label: 'Headshot, white background', href: FOUNDER_IMAGE_PATH, note: 'JPG, 1600×1289' },
  { label: 'Headshot, white background, square', href: FOUNDER_IMAGE_SQUARE_PATH, note: 'JPG, 512×512' },
  { label: 'Headshot, blue background', href: '/press/brad-geisen-blue.jpg', note: 'JPG, 1600×1289' },
  { label: 'Headshot, blue background, square', href: '/press/brad-geisen-blue-512.jpg', note: 'JPG, 512×512' },
  { label: 'Headshot, black background', href: '/press/brad-geisen-black.png', note: 'PNG, 1024×1024' },
  { label: 'Headshot, transparent (navy suit)', href: '/press/brad-geisen-transparent-navy.png', note: 'PNG, 1024×1024, transparent' },
  { label: 'Headshot, transparent (gray suit)', href: '/press/brad-geisen-transparent-gray.png', note: 'PNG, 1024×1024, transparent' },
]

const LOGO_PACK: Array<{ label: string; href: string; note: string }> = [
  { label: 'Wordmark, light background', href: BRAND_ASSETS.logoOnLight, note: 'PNG, 1200×339, transparent' },
  { label: 'Wordmark, dark background', href: BRAND_ASSETS.logoOnDark, note: 'PNG, 1200×339, transparent' },
  { label: 'Mark, light background', href: BRAND_ASSETS.markOnLight, note: 'PNG, 512×512, transparent' },
  { label: 'Mark, dark background', href: BRAND_ASSETS.markOnDark, note: 'PNG, 512×512, transparent' },
  { label: 'App icon', href: BRAND_ASSETS.appIcon, note: 'PNG, 1024×1024' },
  { label: 'Open Graph share image', href: BRAND_OG_IMAGE.url, note: 'PNG, 1200×630' },
]

/** App Store screenshots already shipped under `public/app-store/`; 1290×2796. */
const SCREENSHOTS: Array<{ src: string; alt: string }> = [
  {
    src: '/app-store/connect/screenshots/01-hero-investors-lens.png',
    alt: 'DealGapIQ iOS app: a property viewed through the investor lens with the deal gap between list price and target buy price',
  },
  {
    src: '/app-store/connect/screenshots/03-verdict-three-cards.png',
    alt: 'DealGapIQ discovery verdict showing income value, target buy price and deal gap for one address',
  },
  {
    src: '/app-store/connect/screenshots/07-dealmaker-scenarios.png',
    alt: 'DealGapIQ offer worksheet with editable assumptions and the four paths to close the gap',
  },
]

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-4 text-xl font-bold text-[var(--text-heading)]">
      {children}
    </h2>
  )
}

export default function PressPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      <JsonLd data={PRESS_JSONLD} />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-medium text-[var(--accent-sky)] hover:underline">
          &larr; Back to DealGapIQ
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">
          DealGapIQ press kit
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--text-body)]">
          DealGapIQ, founded by Foreclosure.com founder Brad Geisen, publicly launched in August
          2026 as a free real estate deal analysis tool that shows investors the gap between a
          property&apos;s price and its investor value, and four ways to close it.
        </p>

        <div className="mt-12 space-y-14 text-[15px] leading-relaxed">
          <section aria-labelledby="press-facts">
            <SectionHeading id="press-facts">Fact sheet</SectionHeading>
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-[var(--border-default)]">
                  {FACT_SHEET.map((row) => (
                    <tr key={row.label} className="align-top">
                      <th
                        scope="row"
                        className="w-44 px-5 py-3 font-semibold text-[var(--text-heading)] sm:w-52"
                      >
                        {row.label}
                      </th>
                      <td className="px-5 py-3 text-[var(--text-body)]">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="press-founder">
            <SectionHeading id="press-founder">Founder bio</SectionHeading>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <Image
                src={FOUNDER_IMAGE_SQUARE_PATH}
                alt={`${FOUNDER_NAME}, ${FOUNDER_TITLE} of DealGapIQ`}
                width={512}
                height={512}
                sizes="160px"
                className="h-40 w-40 shrink-0 rounded-2xl border border-[var(--border-default)] object-cover"
              />
              <div>
                <p>
                  Brad Geisen is the Founder and CEO of DealGapIQ and the author of{' '}
                  <em>{FOUNDER_BOOK}</em>. {FOUNDER_CREDENTIAL_LINE}. Foreclosure.com still powers
                  BiggerPockets&apos; foreclosure search, and his GSE partnerships date to a 1991 HUD
                  pilot program.
                </p>
                <p className="mt-3">
                  DealGapIQ, made by InvestIQ LLC in Boca Raton, Florida, launched in beta in January
                  2026 and publicly in August 2026, and ships updates weekly. It shows investors the
                  gap between a property&apos;s asking price and the price at which it works for an
                  investor, then gives four offer structures to close that gap. It scores any U.S.
                  address against six strategies in {SPEED_CLAIM}. The free plan is $0 with no
                  credit card; Pro is {PRO_MONTHLY_PRICE} a month or ${PRO_YEARLY_PER_MONTH} a month
                  billed annually with a 7-day trial, and adds directories of {BUYER_COUNT} verified
                  cash buyers and {LENDER_COUNT} hard money lenders.
                </p>
              </div>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {HEADSHOT_PACK.map((asset) => (
                <li
                  key={asset.href}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-4"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-heading)]">{asset.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{asset.note}</div>
                  </div>
                  <a
                    href={asset.href}
                    download
                    className="shrink-0 text-sm font-semibold text-[var(--accent-sky)] underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="press-logos">
            <SectionHeading id="press-logos">Logo pack</SectionHeading>
            <ul className="grid gap-3 sm:grid-cols-2">
              {LOGO_PACK.map((asset) => (
                <li
                  key={asset.href}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-4"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-heading)]">{asset.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{asset.note}</div>
                  </div>
                  <a
                    href={asset.href}
                    download
                    className="shrink-0 text-sm font-semibold text-[var(--accent-sky)] underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Brand colors: black #000000, cyan #0EA5E9, white #FFFFFF. Write the name as one word,
              DealGapIQ.
            </p>
          </section>

          <section aria-labelledby="press-screenshots">
            <SectionHeading id="press-screenshots">Product screenshots</SectionHeading>
            <ul className="grid gap-4 sm:grid-cols-3">
              {SCREENSHOTS.map((shot) => (
                <li key={shot.src} className="flex flex-col gap-2">
                  <a href={shot.src} download className="block overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={1290}
                      height={2796}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="h-auto w-full"
                    />
                  </a>
                  <p className="text-xs text-[var(--text-muted)]">{shot.alt}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="press-contact">
            <SectionHeading id="press-contact">Press contact</SectionHeading>
            <p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[var(--accent-sky)] underline">
                {SUPPORT_EMAIL}
              </a>
              {' · '}
              <a href={`tel:${SUPPORT_PHONE_E164.replace(/-/g, '')}`} className="font-semibold text-[var(--accent-sky)] underline">
                {SUPPORT_PHONE}
              </a>
            </p>
            <p className="mt-3">
              Launch announcement:{' '}
              <Link href={`/blog/${LAUNCH_POST_SLUG}`} className="font-semibold text-[var(--accent-sky)] underline">
                DealGapIQ launches publicly: see the deal gap on any U.S. property
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
