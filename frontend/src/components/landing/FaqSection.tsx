import Link from 'next/link'
import { HOME_FAQ } from '@/content/home-faq'

const DISPLAY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), var(--font-inter), system-ui, sans-serif',
  fontWeight: 800,
  letterSpacing: '-0.04em',
}

/**
 * Home page FAQ. Every answer stays in the HTML (no accordion) so it is
 * readable without JavaScript and matches the `FAQPage` JSON-LD exactly.
 */
export function FaqSection() {
  return (
    <section
      id="faq"
      className="home-dark-wash border-t border-[var(--border-default)] bg-[var(--surface-section)] py-16"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <h2
          id="faq-heading"
          className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
          style={DISPLAY_STYLE}
        >
          What do real estate investors ask about DealGapIQ?
        </h2>
        <div className="home-dark-bloom mt-10">
        <div className="grid gap-8 md:grid-cols-2">
          {HOME_FAQ.map((item) => (
            <div
              key={item.question}
              className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
            >
              <h3 className="text-lg font-bold text-[var(--text-heading)]">{item.question}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-body)]">{item.answer}</p>
              {item.related ? (
                <p className="mt-3 text-sm">
                  <Link
                    href={item.related.href}
                    className="font-semibold text-[var(--accent-sky)] underline-offset-2 hover:underline"
                  >
                    {item.related.label}
                  </Link>
                </p>
              ) : null}
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  )
}
