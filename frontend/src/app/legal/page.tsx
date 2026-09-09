import type { Metadata } from 'next'
import Link from 'next/link'

import { BRAND_OG_IMAGE, LEGAL_ENTITY_DBA, LEGAL_ENTITY_NAME } from '@/lib/brand'

import { PrintLegalPageButton } from './PrintLegalPageButton'

export const metadata: Metadata = {
  title: 'Legal entity — InvestIQ LLC d/b/a DealGapIQ',
  description:
    'DealGapIQ is a trade name of InvestIQ LLC. Legal operator, contact details, and public policies for the DealGapIQ website and applications.',
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Legal entity — InvestIQ LLC d/b/a DealGapIQ',
    description: 'DealGapIQ is a trade name of InvestIQ LLC.',
    url: '/legal',
    type: 'article',
    images: [BRAND_OG_IMAGE],
  },
}

export default function LegalEntityPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="print:hidden text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
        >
          &larr; Back to DealGapIQ
        </Link>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-heading)]">Legal entity</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: September 9, 2026</p>
          </div>
          <PrintLegalPageButton />
        </div>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-heading)]">Who operates DealGapIQ</h2>
            <p>
              DealGapIQ is a product and trade name of {LEGAL_ENTITY_NAME}. The same company
              operates the DealGapIQ website at{' '}
              <a href="https://dealgapiq.com" className="text-sky-400 underline">
                dealgapiq.com
              </a>
              , the DealGapIQ web application, and the DealGapIQ iOS and Android applications.
            </p>
            <p className="mt-3">
              Full legal identification:{' '}
              <strong className="text-[var(--text-heading)]">{LEGAL_ENTITY_DBA}</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-heading)]">Public details</h2>
            <dl className="space-y-2 text-[var(--text-secondary)]">
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Legal name</dt>
                <dd>{LEGAL_ENTITY_NAME}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Trade name / d/b/a</dt>
                <dd>DealGapIQ</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Website</dt>
                <dd>
                  <a href="https://dealgapiq.com" className="text-sky-400 underline">
                    https://dealgapiq.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Email</dt>
                <dd>
                  <a href="mailto:support@dealgapiq.com" className="text-sky-400 underline">
                    support@dealgapiq.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Phone</dt>
                <dd>
                  <a href="tel:+18663888222" className="text-sky-400 underline">
                    (866) 388-8222
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--text-heading)]">Governing law</dt>
                <dd>State of Florida, United States</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-heading)]">Policies</h2>
            <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
              <li>
                <Link href="/privacy" className="text-sky-400 underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sky-400 underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclosures" className="text-sky-400 underline">
                  Disclosures
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}
