/**
 * Server-rendered template for /for/[slug]: the persona listicle landing
 * page. Shape follows docs/marketing/LISTICLE_LANDING_PAGES.md: headline →
 * intro → address input, numbered reasons (persona reasons first), offer
 * block with a second address input, testimonials, FAQ, related links,
 * sticky mobile CTA. Same building blocks as ProblemLandingPage.
 */

import Link from 'next/link'
import { getBlogPost, type BlogPost } from '@/lib/content'
import { DIRECTORY_ACCESS_NOTE, PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY, PRO_TRIAL_DAYS } from '@/lib/planFeatures'
import { buildFaqJsonLd } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { resolveReasons, type PersonaPage } from '@/lib/seo/persona-pages'
import { getProblemPage, type ProblemPage } from '@/lib/seo/problem-pages'
import { AddressCtaForm } from '@/components/landing/AddressCtaForm'
import { HeroSampleResult } from '@/components/landing/HeroSampleResult'
import { MobileStickyCta } from '@/components/landing/MobileStickyCta'
import { SocialProof } from '@/components/landing/SocialProof'

const HERO_ID = 'for-hero'
const DISCOVERY_CTA = 'Run Free Discovery'
const DISCOVERY_GUARANTEE = 'Free Discovery. No signup. No card.'

function buildJsonLd(page: PersonaPage) {
  const url = `${SITE_URL}/for/${page.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: page.metaTitle,
        description: page.metaDescription,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#software` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'For investors', item: `${SITE_URL}/for` },
          { '@type': 'ListItem', position: 3, name: page.headline, item: url },
        ],
      },
      buildFaqJsonLd(page.faq),
    ],
  }
}

export async function ListicleLandingPage({ page }: { page: PersonaPage }) {
  const reasons = resolveReasons(page)
  const related = page.relatedAnswerSlugs.map(getProblemPage).filter((p): p is ProblemPage => p !== null)
  const posts = (await Promise.all(page.blogSlugs.map((s) => getBlogPost(s)))).filter(
    (p): p is BlogPost => p !== null,
  )
  const source = `for:${page.slug}`

  return (
    <main className="min-h-screen pb-28 md:pb-16" style={{ background: 'var(--surface-base)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(page)) }}
      />

      <section id={HERO_ID} className="px-4 pt-10 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span aria-hidden> / </span>
            <Link href="/for" className="hover:underline">For investors</Link>
          </nav>

          <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center">
            <div>
              <h1
                className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
                style={{ color: 'var(--text-heading)' }}
              >
                {page.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {page.intro}
              </p>

              <div className="mt-8">
                <AddressCtaForm source={source} buttonLabel={DISCOVERY_CTA} />
                <p className="address-cta__guarantee">{DISCOVERY_GUARANTEE}</p>
              </div>
            </div>

            <div>
              <HeroSampleResult />
              <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Sample Discovery. Yours runs on the address you enter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-16" aria-labelledby="reasons-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="reasons-heading" className="sr-only">
            The reasons
          </h2>
          <ol className="space-y-5">
            {reasons.map((reason, i) => (
              <li
                key={reason.id}
                className="flex gap-5 rounded-2xl border p-5 sm:p-6"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
              >
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 font-mono text-2xl font-black tabular-nums sm:text-3xl"
                  style={{ color: 'var(--accent-sky)' }}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold leading-snug" style={{ color: 'var(--text-heading)' }}>
                    {reason.heading}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {reason.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-14 sm:pb-16" aria-labelledby="offer-heading">
        <div
          className="mx-auto max-w-3xl rounded-3xl border p-6 sm:p-10"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
        >
          <h2 id="offer-heading" className="text-2xl font-extrabold sm:text-3xl" style={{ color: 'var(--text-heading)' }}>
            {page.offer.heading}
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {page.offer.body}
          </p>
          <div className="mt-6">
            <AddressCtaForm source={`${source}:offer`} buttonLabel={DISCOVERY_CTA} />
            <p className="address-cta__guarantee">{DISCOVERY_GUARANTEE}</p>
          </div>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Free accounts run ten analyses a month and save ten properties. Pro adds editable
            assumptions, comps, the Deal Maker worksheet, exports and the directories for{' '}
            {PRO_PRICE_MONTHLY}/month or {PRO_PRICE_ANNUAL}/year after a {PRO_TRIAL_DAYS}-day trial.{' '}
            {DIRECTORY_ACCESS_NOTE}{' '}
            <Link href="/pricing" className="font-medium hover:underline" style={{ color: 'var(--accent-sky)' }}>
              See pricing
            </Link>
          </p>
        </div>
      </section>

      <SocialProof compact />

      <section className="px-4 py-14 sm:py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Questions investors ask
          </h2>
          <dl className="mt-6 space-y-6">
            {page.faq.map((item) => (
              <div key={item.question}>
                <dt className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {item.question}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {(related.length > 0 || posts.length > 0) && (
        <section className="px-4 pb-14 sm:pb-16" aria-labelledby="related-heading">
          <div className="mx-auto grid max-w-3xl gap-10 sm:grid-cols-2">
            {related.length > 0 && (
              <div>
                <h2 id="related-heading" className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Related answers
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/answers/${r.slug}`} className="font-medium hover:underline" style={{ color: 'var(--accent-sky)' }}>
                        {r.problem}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {posts.length > 0 && (
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Go deeper
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {posts.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}`} className="font-medium hover:underline" style={{ color: 'var(--accent-sky)' }}>
                        {p.frontmatter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <MobileStickyCta
        label={DISCOVERY_CTA}
        href={`/discovery?source=${encodeURIComponent(source)}`}
        watchId={HERO_ID}
        source={source}
        sublabel={DISCOVERY_GUARANTEE}
      />
    </main>
  )
}
