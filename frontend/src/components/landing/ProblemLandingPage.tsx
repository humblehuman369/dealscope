/**
 * Server-rendered template for /answers/[slug]. One problem, one call to
 * action. Shape follows docs/marketing/DIRECT_RESPONSE_PLAYBOOK.md §4:
 * problem → agitate → next step, guarantee line, address input, three steps,
 * worked example, testimonials, FAQ, related links, sticky mobile CTA.
 */

import Link from 'next/link'
import { getBlogPost, type BlogPost } from '@/lib/content'
import { buildFaqJsonLd } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { GUARANTEE_LINE, getProblemPage, type ProblemPage } from '@/lib/seo/problem-pages'
import { AddressCtaForm } from '@/components/landing/AddressCtaForm'
import { HeroSampleResult } from '@/components/landing/HeroSampleResult'
import { MobileStickyCta } from '@/components/landing/MobileStickyCta'
import { SocialProof } from '@/components/landing/SocialProof'

const HERO_ID = 'answer-hero'

function buildJsonLd(page: ProblemPage) {
  const url = `${SITE_URL}/answers/${page.slug}`
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
          { '@type': 'ListItem', position: 2, name: 'Answers', item: `${SITE_URL}/answers` },
          { '@type': 'ListItem', position: 3, name: page.problem, item: url },
        ],
      },
      buildFaqJsonLd(page.faq),
    ],
  }
}

export async function ProblemLandingPage({ page }: { page: ProblemPage }) {
  const related = page.relatedSlugs.map(getProblemPage).filter((p): p is ProblemPage => p !== null)
  const posts = (await Promise.all(page.blogSlugs.map((s) => getBlogPost(s)))).filter(
    (p): p is BlogPost => p !== null,
  )
  const source = `answers:${page.slug}`

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
            <Link href="/answers" className="hover:underline">Answers</Link>
          </nav>

          <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center">
            <div>
              <h1
                className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl"
                style={{ color: 'var(--text-heading)' }}
              >
                {page.problem}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {page.agitate}
              </p>
              <p className="mt-4 max-w-2xl text-lg font-semibold" style={{ color: 'var(--text-body)' }}>
                {page.nextStep}
              </p>

              <div className="mt-8">
                <AddressCtaForm source={source} />
                <p className="address-cta__guarantee">{GUARANTEE_LINE}</p>
              </div>
            </div>

            <div>
              <HeroSampleResult />
              <p className="mt-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Sample verdict. Yours runs on the address you enter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-16" aria-labelledby="steps-heading">
        <div className="mx-auto max-w-5xl">
          <h2 id="steps-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            What happens next
          </h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-3">
            {page.steps.map((step, i) => (
              <li
                key={step.heading}
                className="rounded-2xl border p-5"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
              >
                <span
                  className="font-mono text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--accent-sky)' }}
                >
                  Step {i + 1}
                </span>
                <h3 className="mt-2 text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                  {step.heading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
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
        label="Run free verdict"
        href={`/discovery?source=${encodeURIComponent(source)}`}
        watchId={HERO_ID}
        source={source}
        sublabel={GUARANTEE_LINE}
      />
    </main>
  )
}
