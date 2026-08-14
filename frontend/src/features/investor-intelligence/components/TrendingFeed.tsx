'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ARTICLES, type CategoryId } from '@/lib/investor-intelligence'
import { categoryClass, categoryLabel } from './categoryStyle'

const FILTERS: { id: 'all' | CategoryId | 'policy'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'investor-trends', label: 'Investor Trends' },
  { id: 'policy', label: 'Housing Policy' },
  { id: 'finding-deals', label: 'Finding Deals' },
  { id: 'financing', label: 'Financing' },
  { id: 'markets', label: 'Market Intelligence' },
  { id: 'multifamily', label: 'Multifamily' },
]

export function TrendingFeed() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  const items = useMemo(() => {
    return ARTICLES.filter((a) => {
      if (filter === 'all') return true
      if (filter === 'policy') return a.displayCategory === 'Housing Policy'
      return a.category === filter
    })
  }, [filter])

  return (
    <section className="ii-section" id="latest" aria-labelledby="latest-h">
      <div className="ii-wrap">
        <div className="ii-sectionhead">
          <p className="ii-eyebrow">Latest Investor Intelligence</p>
          <h2 id="latest-h">Research. Data. Analysis. Property Math.</h2>
        </div>
        <div className="ii-filters" role="group" aria-label="Filter by category">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ii-feed">
          {items.map((article) => (
            <article key={article.slug} className="ii-feeditem">
              <div className="ii-feeditem__thumb" aria-hidden="true" />
              <div>
                <span className={`ii-cat ${categoryClass(article.category, article.displayCategory)}`}>
                  {categoryLabel(article.category, article.displayCategory)}
                </span>
                <h3>{article.headline}</h3>
                <p>{article.excerpt}</p>
                <Link className="ii-soonlink" href={`/investor-intelligence/${article.slug}`}>
                  {article.status === 'published' ? 'Read' : 'Coming Soon'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
