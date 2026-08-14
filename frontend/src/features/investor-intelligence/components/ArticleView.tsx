import Link from 'next/link'
import type { Article } from '@/lib/investor-intelligence'
import {
  analyzePropertyHref,
  CTA_COPY,
  getAuthor,
  getCategory,
  getRelatedArticles,
  iiAbsolute,
} from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'
import { categoryClass, categoryLabel } from './categoryStyle'
import { NewsletterForm } from './NewsletterForm'
import { ShareButtons } from './ShareButtons'
import { StatusBadge } from './StatusBadge'

function formatDate(iso?: string) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function ArticleView({ article }: { article: Article }) {
  const author = getAuthor(article.authorSlug)
  const category = getCategory(article.category)
  const related = getRelatedArticles(article)
  const url = iiAbsolute(`/investor-intelligence/${article.slug}`)
  const published = formatDate(article.publishDate)
  const updated = formatDate(article.updatedDate)
  const cta = CTA_COPY[article.ctaType]
  const ctaHref = cta.href(article.slug)

  return (
    <article className="ii-article">
      <p className={`ii-cat ${categoryClass(article.category, article.displayCategory)}`}>
        {categoryLabel(article.category, article.displayCategory)}
      </p>
      <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginTop: 12 }}>{article.headline}</h1>
      {article.subheadline && (
        <p style={{ fontSize: 20, color: 'var(--text-secondary)', marginTop: 14 }}>
          {article.subheadline}
        </p>
      )}
      <div className="ii-article__meta">
        {author && (
          <span>
            By{' '}
            <Link href={`/authors/${author.slug}`}>{author.name}</Link>
            {' / DealGapIQ Investor Intelligence'}
          </span>
        )}
        {published ? (
          <time dateTime={article.publishDate}>Published {published}</time>
        ) : (
          <span>Publishing soon</span>
        )}
        {updated && <time dateTime={article.updatedDate}>Updated {updated}</time>}
        <span>{article.readingMinutes} min read</span>
      </div>
      <ShareButtons url={url} title={article.headline} article={article.slug} />
      {article.status !== 'published' && (
        <div style={{ marginBottom: 24 }}>
          <StatusBadge status={article.status} label="Full Analysis Coming Soon" large />
        </div>
      )}

      {article.takeaways.length > 0 && (
        <div className="ii-takeaways">
          <h2>What Investors Need to Know</h2>
          <ul>
            {article.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {article.youtubeVideoId && (
        <div className="ii-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${article.youtubeVideoId}`}
            title={article.headline}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      <div className="ii-prose">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            {section.pullQuote && <p className="ii-pullquote">{section.pullQuote}</p>}
          </section>
        ))}
      </div>

      <div style={{ margin: '40px 0' }}>
        {article.ctaType === 'newsletter' ? (
          <Link className="ii-btn ii-btn--primary" href={ctaHref}>
            {cta.label}
          </Link>
        ) : article.ctaType === 'markets' ? (
          <Link className="ii-btn ii-btn--primary" href={ctaHref}>
            {cta.label}
          </Link>
        ) : (
          <AnalyzePropertyLink
            className="ii-btn ii-btn--primary"
            href={ctaHref}
            placement={`article-${article.ctaType}`}
            article={article.slug}
          >
            {cta.label}
          </AnalyzePropertyLink>
        )}
      </div>

      <div className="ii-sources">
        <h2>Sources & Methodology</h2>
        {article.sources.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Primary sources, report titles, data periods, and links will publish with the full
            analysis. DealGapIQ cites primary sources whenever they exist.
          </p>
        ) : (
          article.sources.map((s) => (
            <div className="ii-source" key={`${s.organization}-${s.reportTitle}`}>
              <strong>{s.organization}</strong>
              <span>
                {s.reportTitle}
                {s.publicationDate ? ` · ${s.publicationDate}` : ''}
                {s.dataPeriod ? ` · ${s.dataPeriod}` : ''}
              </span>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              )}
            </div>
          ))
        )}
        <p style={{ marginTop: 16 }}>
          <Link className="ii-arrowlink" href="/investor-intelligence/methodology">
            How we approach the data
          </Link>
        </p>
      </div>

      {related.length > 0 && (
        <div className="ii-sources">
          <h2>Related Intelligence</h2>
          <div className="ii-related">
            {related.map((rel) => (
              <Link key={rel.slug} href={`/investor-intelligence/${rel.slug}`}>
                <span className={`ii-cat ${categoryClass(rel.category, rel.displayCategory)}`}>
                  {categoryLabel(rel.category, rel.displayCategory)}
                </span>
                <h3>{rel.headline}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{rel.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {category && (
        <p style={{ marginTop: 28 }}>
          <Link className="ii-arrowlink" href={`/investor-intelligence/${category.slug}`}>
            More in {category.label}
          </Link>
        </p>
      )}

      {author && (
        <div className="ii-sources">
          <h2>About the Author</h2>
          <p>
            <Link href={`/authors/${author.slug}`}>{author.name}</Link> — {author.role}.{' '}
            {author.shortBio}
          </p>
        </div>
      )}

      <section className="ii-section" id="newsletter" style={{ borderTop: 'none', padding: '48px 0 0' }}>
        <h2 style={{ fontSize: 28, marginBottom: 16 }}>Get Investor Intelligence</h2>
        <NewsletterForm placement={`article-${article.slug}`} />
      </section>

      <p style={{ marginTop: 40 }}>
        <AnalyzePropertyLink
          className="ii-btn ii-btn--outline"
          href={analyzePropertyHref('article-footer', article.slug)}
          placement="article-footer"
          article={article.slug}
        >
          Analyze Your Own Property
        </AnalyzePropertyLink>
      </p>
    </article>
  )
}
