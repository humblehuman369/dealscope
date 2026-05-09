import type { MetadataRoute } from 'next'

const BASE = 'https://dealgapiq.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${BASE}/`,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/pricing`,           lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/about`,             lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/methodology`,       lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/what-is-dealgapiq`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/deal-gap`,          lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/strategies`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/verdict`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/strategy`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/deal-maker`,        lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`,              lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/glossary`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE}/help`,              lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/disclosures`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,           lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
