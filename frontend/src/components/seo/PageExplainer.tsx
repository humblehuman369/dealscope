import Link from 'next/link'

type Section = {
  heading: string
  body: string
}

interface PageExplainerProps {
  title: string
  intro: string
  sections: Section[]
  relatedLinks?: Array<{ href: string; label: string }>
}

export function PageExplainer({
  title,
  intro,
  sections,
  relatedLinks,
}: PageExplainerProps) {
  return (
    <section
      aria-labelledby="page-explainer-heading"
      className="border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-16"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="page-explainer-heading"
          className="text-2xl font-bold text-white mb-4"
        >
          {title}
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-400 mb-8">
          {intro}
        </p>

        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                {s.heading}
              </h3>
              <p className="text-[15px] leading-relaxed text-slate-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {relatedLinks && relatedLinks.length > 0 && (
          <div className="mt-10 pt-6 border-t border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Related
            </h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
