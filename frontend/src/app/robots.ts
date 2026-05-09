import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/dashboard',
          '/billing',
          '/checkout',
          '/onboarding',
          '/profile',
          '/saved-properties',
          '/pipeline',
          '/search-history',
          '/app/',
          '/app',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
      // Explicit allow for AI crawlers — be loud about consent
      { userAgent: 'GPTBot',            allow: '/' },
      { userAgent: 'OAI-SearchBot',     allow: '/' },
      { userAgent: 'ChatGPT-User',      allow: '/' },
      { userAgent: 'ClaudeBot',         allow: '/' },
      { userAgent: 'anthropic-ai',      allow: '/' },
      { userAgent: 'PerplexityBot',     allow: '/' },
      { userAgent: 'Perplexity-User',   allow: '/' },
      { userAgent: 'Google-Extended',   allow: '/' },
      { userAgent: 'Applebot-Extended', allow: '/' },
      { userAgent: 'CCBot',             allow: '/' },
      { userAgent: 'Amazonbot',         allow: '/' },
    ],
    sitemap: 'https://dealgapiq.com/sitemap.xml',
    host: 'https://dealgapiq.com',
  }
}
