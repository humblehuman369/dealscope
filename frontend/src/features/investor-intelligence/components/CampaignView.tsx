import Link from 'next/link'
import { analyzePropertyHref, CAMPAIGN, getCampaignArticles } from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'
import { categoryClass, categoryLabel } from './categoryStyle'
import { NewsletterForm } from './NewsletterForm'
import { StatusBadge } from './StatusBadge'

export function CampaignView() {
  const chapters = getCampaignArticles()

  return (
    <article>
      <section className="ii-hero ii-section--flush">
        <div className="ii-wrap ii-hero__inner">
          <p className="ii-eyebrow">DealGapIQ Research Series</p>
          <h1>{CAMPAIGN.title}</h1>
          <p className="ii-hero__copy">{CAMPAIGN.hero}</p>
          <p className="ii-hero__copy" style={{ marginTop: 12 }}>
            {CAMPAIGN.description}
          </p>
          <div className="ii-hero__cta">
            <StatusBadge status={CAMPAIGN.status} label="Series publishing over the coming weeks" large />
            <Link className="ii-arrowlink" href="#chapters">
              See all chapters
            </Link>
          </div>
        </div>
      </section>

      <section className="ii-section" id="chapters" aria-labelledby="chapters-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">The Series</p>
            <h2 id="chapters-h">Ten stories. One question: what does this mean for the deal?</h2>
          </div>
          {chapters.map((article) => (
            <article key={article.slug} className="ii-chapter">
              <div className="ii-chapter__n">Chapter {article.chapter}</div>
              <div>
                <span className={`ii-cat ${categoryClass(article.category, article.displayCategory)}`}>
                  {categoryLabel(article.category, article.displayCategory)}
                </span>
                <h3 style={{ fontSize: 22, margin: '8px 0 8px' }}>{article.headline}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 12px' }}>{article.summary}</p>
                <Link className="ii-soonlink" href={`/investor-intelligence/${article.slug}`}>
                  {article.status === 'published' ? 'Read Chapter' : 'Coming Soon'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ii-section ii-section--tint" id="newsletter">
        <div className="ii-wrap ii-newsgrid">
          <div>
            <p className="ii-eyebrow">{CAMPAIGN.title}</p>
            <h2>Get each chapter as it publishes</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
              Institutional pullback. The 350-home rule. Deal availability. Underwriting. Markets.
              One series.
            </p>
          </div>
          <NewsletterForm placement="campaign" />
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 16 }}>
            Understand the market. Then analyze the property.
          </h2>
          <AnalyzePropertyLink
            className="ii-btn ii-btn--primary"
            href={analyzePropertyHref('campaign', CAMPAIGN.slug)}
            placement="campaign"
            article={CAMPAIGN.slug}
          >
            Analyze a Property
          </AnalyzePropertyLink>
        </div>
      </section>
    </article>
  )
}
