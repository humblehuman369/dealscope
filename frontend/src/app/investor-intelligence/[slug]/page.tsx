import { notFound } from 'next/navigation'
import { ArticleView } from '@/features/investor-intelligence/components/ArticleView'
import { CampaignView } from '@/features/investor-intelligence/components/CampaignView'
import { CategoryView } from '@/features/investor-intelligence/components/CategoryView'
import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import {
  ARTICLES,
  CAMPAIGN,
  CATEGORIES,
  articleJsonLd,
  campaignJsonLd,
  categoryJsonLd,
  getArticle,
  getCategory,
} from '@/lib/investor-intelligence'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return [
    ...CATEGORIES.filter((c) => c.slug !== 'markets').map((c) => ({ slug: c.slug })),
    { slug: CAMPAIGN.slug },
    ...ARTICLES.map((a) => ({ slug: a.slug })),
  ]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = getCategory(slug)
  if (category) {
    return iiMetadata({
      title: category.seoTitle,
      description: category.metaDescription,
      path: `/investor-intelligence/${category.slug}`,
    })
  }
  if (slug === CAMPAIGN.slug) {
    return iiMetadata({
      title: CAMPAIGN.seoTitle,
      description: CAMPAIGN.metaDescription,
      path: `/investor-intelligence/${CAMPAIGN.slug}`,
    })
  }
  const article = getArticle(slug)
  if (article) {
    return iiMetadata({
      title: article.seoTitle,
      description: article.metaDescription,
      path: `/investor-intelligence/${article.slug}`,
      type: 'article',
    })
  }
  return {}
}

export default async function IntelligenceSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const category = getCategory(slug)
  if (category && slug !== 'markets') {
    return (
      <>
        <JsonLd data={categoryJsonLd(category)} />
        <CategoryView category={category} />
      </>
    )
  }

  if (slug === CAMPAIGN.slug) {
    return (
      <>
        <JsonLd data={campaignJsonLd()} />
        <CampaignView />
      </>
    )
  }

  const article = getArticle(slug)
  if (article) {
    return (
      <>
        <JsonLd
          data={articleJsonLd(
            article,
            article.displayCategory ?? getCategory(article.category)?.label ?? article.category,
          )}
        />
        <ArticleView article={article} />
      </>
    )
  }

  notFound()
}
