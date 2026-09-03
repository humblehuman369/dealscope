/**
 * Content QA for the Markdown blog. Run with `npm run content:check`.
 *
 * Fails (exit 1) when any blog post has:
 *   - frontmatter that fails the Zod schema (required fields for published
 *     posts, meta title/description length, slug must equal filename)
 *   - a hero image that is not in public/
 *   - an internal link (frontmatter `internal_links`, body markdown links, or
 *     `::cta{href=...}` directives) that resolves to no route or content slug
 *   - a body-level H1 (the page already renders the title as the H1)
 *
 * The same schema guards `next build`; this script exists so a broken post is
 * caught in CI before the build, with every problem listed at once.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { BlogFrontmatterError, parseBlogFrontmatter } from '@/lib/content-schema'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blog-categories'
import { US_STATES } from '@/lib/us-states'

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, 'content')
const APP_DIR = path.join(ROOT, 'src', 'app')
const PUBLIC_DIR = path.join(ROOT, 'public')

type Problem = { file: string; message: string }

const problems: Problem[] = []
function fail(file: string, message: string) {
  problems.push({ file, message })
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function listSlugs(folder: string): Promise<Set<string>> {
  const dir = path.join(CONTENT_DIR, folder)
  if (!(await exists(dir))) return new Set()
  const files = await fs.readdir(dir)
  return new Set(files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')))
}

/** Does src/app resolve this path to a page? Dynamic segments accept anything. */
async function routeExists(segments: string[], dir = APP_DIR): Promise<boolean> {
  if (segments.length === 0) {
    return (await exists(path.join(dir, 'page.tsx'))) || (await exists(path.join(dir, 'route.ts')))
  }
  const [head, ...rest] = segments
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    // Route groups `(name)` are transparent; dynamic `[x]` / `[...x]` match any segment.
    if (entry.name.startsWith('(')) {
      if (await routeExists(segments, path.join(dir, entry.name))) return true
    } else if (entry.name === head || entry.name.startsWith('[')) {
      if (entry.name.startsWith('[...')) return true
      if (await routeExists(rest, path.join(dir, entry.name))) return true
    }
  }
  return false
}

const MARKDOWN_LINK = /\]\((\/[^)\s]*)\)/g
const CTA_HREF = /::cta\[[^\]]*\]\{[^}]*href="(\/[^"]*)"/g

function collectBodyLinks(body: string): string[] {
  const links: string[] = []
  for (const match of body.matchAll(MARKDOWN_LINK)) links.push(match[1])
  for (const match of body.matchAll(CTA_HREF)) links.push(match[1])
  return links
}

function normalizeHref(raw: string): string {
  const noQuery = raw.split('?')[0].split('#')[0]
  const trimmed = noQuery.length > 1 ? noQuery.replace(/\/+$/, '') : noQuery
  return trimmed.trim().split(/\s+/)[0]
}

async function main() {
  const blogDir = path.join(CONTENT_DIR, 'blog')
  const files = (await fs.readdir(blogDir)).filter((f) => f.endsWith('.md')).sort()
  const [blogSlugs, glossarySlugs, iiSlugs] = await Promise.all([
    listSlugs('blog'),
    listSlugs('glossary'),
    listSlugs('investor-intelligence'),
  ])
  const stateSlugs = new Set(US_STATES.map((s) => s.slug))
  const categorySlugs = new Set<string>(BLOG_CATEGORY_SLUGS)
  const routeCache = new Map<string, boolean>()

  async function linkResolves(href: string): Promise<boolean> {
    const clean = normalizeHref(href)
    if (!clean.startsWith('/')) return true
    const segments = clean.split('/').filter(Boolean)
    const [first, second, third] = segments
    if (first === 'blog' && segments.length === 2) return blogSlugs.has(second)
    if (first === 'blog' && second === 'category' && segments.length === 3) return categorySlugs.has(third)
    if (first === 'glossary' && segments.length === 2) return glossarySlugs.has(second)
    if (first === 'investor-intelligence' && segments.length === 2) return iiSlugs.has(second)
    if (first === 'markets' && segments.length === 2) return stateSlugs.has(second)
    if (!routeCache.has(clean)) routeCache.set(clean, await routeExists(segments))
    return routeCache.get(clean) as boolean
  }

  let published = 0
  for (const file of files) {
    const raw = await fs.readFile(path.join(blogDir, file), 'utf8')
    const parsed = matter(raw)

    let fm: ReturnType<typeof parseBlogFrontmatter> | null = null
    try {
      fm = parseBlogFrontmatter(file, parsed.data)
    } catch (error) {
      fail(file, error instanceof BlogFrontmatterError ? error.message : String(error))
    }
    if (fm?.status === 'published') published += 1

    // When the schema rejects the post, still report the other problems from
    // the raw frontmatter so the author sees everything in one run.
    const rawData = parsed.data as Record<string, unknown>
    const heroImage = fm?.hero_image ?? (typeof rawData.hero_image === 'string' ? rawData.hero_image : undefined)
    const internalLinks =
      fm?.internal_links ??
      (Array.isArray(rawData.internal_links) ? rawData.internal_links.filter((l): l is string => typeof l === 'string') : [])

    if (heroImage?.startsWith('/')) {
      if (!(await exists(path.join(PUBLIC_DIR, heroImage)))) {
        fail(file, `hero_image not found in public/: ${heroImage}`)
      }
    }

    if (/^#\s/m.test(parsed.content)) {
      fail(file, 'body contains an H1 (`# ...`); the page renders the title as H1 — use H2 and below')
    }

    const links = new Set<string>([
      ...internalLinks.map(normalizeHref),
      ...collectBodyLinks(parsed.content).map(normalizeHref),
    ])
    for (const href of links) {
      if (!(await linkResolves(href))) fail(file, `internal link does not resolve: ${href}`)
    }
  }

  if (problems.length > 0) {
    console.error(`\ncontent:check found ${problems.length} problem(s) across ${files.length} post(s):\n`)
    for (const p of problems) console.error(`  ${p.file}: ${p.message}`)
    console.error('')
    process.exit(1)
  }
  process.stdout.write(`content:check OK — ${files.length} post(s), ${published} published, all links resolve.\n`)
}

main().catch((error) => {
  console.error('content:check crashed:', error)
  process.exit(1)
})
