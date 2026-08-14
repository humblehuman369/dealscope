import Link from 'next/link'
import type { Category } from '@/lib/investor-intelligence'
import {
  analyzePropertyHref,
  CATEGORY_RESEARCH,
  getArticlesByCategory,
} from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'
import { categoryClass } from './categoryStyle'
import { NewsletterForm } from './NewsletterForm'
import { StatusBadge } from './StatusBadge'

export function CategoryView({ category }: { category: Category }) {
  const articles = getArticlesByCategory(category.id)
  const research = CATEGORY_RESEARCH[category.id] ?? []

  return (
    <article>
      <section className="ii-hero ii-section--flush">
        <div className="ii-wrap ii-hero__inner">
          <p className={`ii-cat ${categoryClass(category.id)}`}>{category.label}</p>
          <h1 style={{ marginTop: 12 }}>{category.headline}</h1>
          <p className="ii-hero__copy">{category.summary}</p>
          <ul className="ii-tracklist" style={{ marginTop: 24 }}>
            {category.topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Latest Research</p>
            <h2>What we’re covering</h2>
          </div>
          <div className="ii-cards">
            {(articles.length > 0 ? articles : []).map((article) => (
              <article key={article.slug} className="ii-card">
                <h3>{article.headline}</h3>
                <p>{article.summary}</p>
                <div className="ii-card__foot">
                  <Link className="ii-soonlink" href={`/investor-intelligence/${article.slug}`}>
                    {article.status === 'published' ? 'Read Analysis' : 'Coming Soon'}
                  </Link>
                </div>
              </article>
            ))}
            {articles.length === 0 &&
              research.map((item) => (
                <article key={item.title} className="ii-card">
                  <h3>{item.title}</h3>
                  <div className="ii-card__foot">
                    <StatusBadge status="coming-soon" />
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      <section className="ii-section ii-section--tint" id="newsletter">
        <div className="ii-wrap ii-newsgrid">
          <div>
            <p className="ii-eyebrow">Stay ahead of this coverage</p>
            <h2>Get Investor Intelligence</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
              New {category.label.toLowerCase()} analysis, Deal Gap of the Week, and the numbers
              that change what you should pay.
            </p>
          </div>
          <NewsletterForm placement={`category-${category.slug}`} />
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 16 }}>
            Understand the market. Then analyze the property.
          </h2>
          <AnalyzePropertyLink
            className="ii-btn ii-btn--primary"
            href={analyzePropertyHref(`category-${category.slug}`)}
            placement={`category-${category.slug}`}
          >
            Analyze a Property
          </AnalyzePropertyLink>
        </div>
      </section>
    </article>
  )
}
