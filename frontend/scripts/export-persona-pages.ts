/**
 * Print the /for persona pages as JSON so non-TypeScript tooling (the LinkedIn
 * carousel builder in scripts/build_listicle_carousels.py) reads the same
 * copy the pages render. Run from frontend/:
 *
 *   node --import tsx scripts/export-persona-pages.ts > /tmp/persona-pages.json
 */

import { PERSONA_PAGES, resolveReasons } from '@/lib/seo/persona-pages'

const out = PERSONA_PAGES.map((p) => ({
  slug: p.slug,
  headline: p.headline,
  intro: p.intro,
  offer: p.offer,
  reasons: resolveReasons(p).map((r) => ({ heading: r.heading, body: r.body })),
}))

process.stdout.write(JSON.stringify(out, null, 2))
