import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { INDEXABLE_ROBOTS, NOINDEX_FOLLOW } from '@/lib/seo/metadata'
import { PERSONA_PAGES, getPersonaPage } from '@/lib/seo/persona-pages'
import { ListicleLandingPage } from '@/components/landing/ListicleLandingPage'

export const dynamicParams = false

export function generateStaticParams() {
  return PERSONA_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPersonaPage(slug)
  if (!page) return {}
  const path = `/for/${slug}`
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: path },
    // Ad landing pages stay out of the index until their persona content is
    // substantially unique; see the `indexable` flag in persona-pages.ts.
    robots: page.indexable ? INDEXABLE_ROBOTS : NOINDEX_FOLLOW,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: path,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
    },
  }
}

export default async function ForPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getPersonaPage(slug)
  if (!page) notFound()
  return <ListicleLandingPage page={page} />
}
