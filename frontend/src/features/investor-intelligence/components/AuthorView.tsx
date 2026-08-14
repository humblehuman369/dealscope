import Link from 'next/link'
import { ARTICLES, getAuthor } from '@/lib/investor-intelligence'
import { categoryClass, categoryLabel } from './categoryStyle'

export function AuthorView() {
  const author = getAuthor('brad-geisen')
  if (!author) return null
  const latest = ARTICLES.slice(0, 8)

  return (
    <article>
      <section className="ii-hero ii-section--flush">
        <div className="ii-wrap">
          <p className="ii-eyebrow">DealGapIQ Investor Intelligence</p>
          <div className="ii-authorcard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={author.imageSrc} alt={author.imageAlt} width={160} height={160} />
            <div>
              <h1>{author.name}</h1>
              <p style={{ color: 'var(--accent-sky)', fontWeight: 600, marginTop: 8 }}>{author.role}</p>
              {author.bio.map((p) => (
                <p key={p.slice(0, 32)} style={{ color: 'var(--text-secondary)', marginTop: 14 }}>
                  {p}
                </p>
              ))}
              <ul className="ii-creds">
                {author.credentials.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <a
                className="ii-arrowlink"
                href={author.linkedin}
                target="_blank"
                rel="noopener noreferrer me"
              >
                Brad Geisen on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Latest Intelligence</p>
            <h2>Recent analysis</h2>
          </div>
          <div className="ii-cards">
            {latest.map((article) => (
              <article key={article.slug} className="ii-card">
                <span className={`ii-cat ${categoryClass(article.category, article.displayCategory)}`}>
                  {categoryLabel(article.category, article.displayCategory)}
                </span>
                <h3>{article.headline}</h3>
                <p>{article.excerpt}</p>
                <div className="ii-card__foot">
                  <Link className="ii-soonlink" href={`/investor-intelligence/${article.slug}`}>
                    {article.status === 'published' ? 'Read' : 'Coming Soon'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </article>
  )
}
