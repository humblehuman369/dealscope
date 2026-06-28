import type { Metadata } from 'next'

/** Explicit allow for marketing / content URLs (helps merge with root defaults). */
export const INDEXABLE_ROBOTS: NonNullable<Metadata['robots']> = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
}

/** Prevent indexing while allowing link equity to flow via follow. */
export const NOINDEX_FOLLOW: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
}

export function noindexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: NOINDEX_FOLLOW,
  }
}

export function canonicalMetadata(
  canonicalPath: string,
  title: string,
  description: string,
  options?: { index?: boolean },
): Metadata {
  const index = options?.index !== false
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: index
      ? { index: true, follow: true }
      : NOINDEX_FOLLOW,
  }
}

export type FaqItem = { question: string; answer: string }

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildHowToJsonLd(options: {
  name: string
  description: string
  steps: { name: string; text: string }[]
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: options.name,
    description: options.description,
    url: options.url,
    step: options.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}
