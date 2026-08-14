import { CategoryView } from '@/features/investor-intelligence/components/CategoryView'
import { JsonLd } from '@/features/investor-intelligence/components/JsonLd'
import { iiMetadata } from '@/features/investor-intelligence/metadata'
import { categoryJsonLd, getCategory } from '@/lib/investor-intelligence'

const category = getCategory('markets')!

export const metadata = iiMetadata({
  title: category.seoTitle,
  description: category.metaDescription,
  path: '/investor-intelligence/markets',
})

export default function MarketsCategoryPage() {
  return (
    <>
      <JsonLd data={categoryJsonLd(category)} />
      <CategoryView category={category} />
    </>
  )
}
