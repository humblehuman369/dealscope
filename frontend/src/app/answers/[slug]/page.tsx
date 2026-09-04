import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { PROBLEM_PAGES, getProblemPage } from '@/lib/seo/problem-pages'
import { ProblemLandingPage } from '@/components/landing/ProblemLandingPage'
import { BRAND_OG_IMAGE } from '@/lib/brand'

export const dynamicParams = false

export function generateStaticParams() {
  return PROBLEM_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getProblemPage(slug)
  if (!page) return {}
  const path = `/answers/${slug}`
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: path },
    robots: INDEXABLE_ROBOTS,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: path,
      type: 'website',
      images: [BRAND_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle,
      description: page.metaDescription,
    },
  }
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getProblemPage(slug)
  if (!page) notFound()
  return <ProblemLandingPage page={page} />
}
