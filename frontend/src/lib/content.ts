import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { parseBlogFrontmatter, type BlogFaq } from '@/lib/content-schema'
import type { BlogCategorySlug } from '@/lib/blog-categories'

const CONTENT_DIR = path.join(process.cwd(), 'content')

/** Average adult reading speed used for the computed `read_time` label. */
const WORDS_PER_MINUTE = 225

/** Larger than any realistic tag-overlap count so a category match always wins. */
const CATEGORY_MATCH_WEIGHT = 100

export type ContentFolder = 'blog' | 'glossary' | 'investor-intelligence'

export type Frontmatter = {
  title: string
  slug: string
  type?: string
  intent?: string
  primary_keyword?: string
  secondary_keywords?: string[]
  meta_title?: string
  meta_description?: string
  schema?: string
  status?: string
  author?: string
  date_published?: string
  date_modified?: string
  word_count_target?: number
  internal_links?: string[]
  category?: string
  tags?: string[]
  faq?: BlogFaq[]
  series?: string
  subtitle?: string
  hero_image?: string
  hero_alt?: string
  read_time?: string
  featured?: boolean
}

export type ContentFile = {
  slug: string
  frontmatter: Frontmatter
  content: string
}

export type BlogPost = ContentFile & {
  frontmatter: Frontmatter & {
    status: 'draft' | 'published'
    read_time: string
    word_count: number
  }
}

/** Drafts are visible locally so authors can preview them; never in a deployed build. */
function includeDrafts(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.CONTENT_INCLUDE_DRAFTS === '1'
}

export function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-|]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

export function readTimeLabel(wordCount: number): string {
  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))
  return `${minutes} min read`
}

async function readDir(folder: ContentFolder): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(CONTENT_DIR, folder))
    return files.filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
}

function parseGenericFile(file: string, raw: string): ContentFile {
  const slug = file.replace(/\.md$/, '')
  const parsed = matter(raw)
  const data = parsed.data as Partial<Frontmatter>
  return {
    slug,
    frontmatter: {
      title: data.title ?? slug,
      slug: data.slug ?? slug,
      type: data.type,
      intent: data.intent,
      primary_keyword: data.primary_keyword,
      secondary_keywords: data.secondary_keywords,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      schema: data.schema,
      status: data.status,
      author: data.author,
      date_published: data.date_published,
      date_modified: data.date_modified,
      word_count_target: data.word_count_target,
      internal_links: data.internal_links,
      category: data.category,
      tags: data.tags,
      faq: data.faq,
      series: data.series,
      subtitle: data.subtitle,
      hero_image: data.hero_image,
      hero_alt: data.hero_alt,
      read_time: data.read_time,
      featured: data.featured,
    },
    content: parsed.content,
  }
}

export function parseBlogFile(file: string, raw: string): BlogPost {
  const parsed = matter(raw)
  const fm = parseBlogFrontmatter(file, parsed.data)
  const wordCount = countWords(parsed.content)
  return {
    slug: fm.slug,
    frontmatter: {
      ...fm,
      read_time: readTimeLabel(wordCount),
      word_count: wordCount,
    },
    content: parsed.content,
  }
}

function parseFile(folder: ContentFolder, file: string, raw: string): ContentFile {
  return folder === 'blog' ? parseBlogFile(file, raw) : parseGenericFile(file, raw)
}

function dateValue(raw?: string): number {
  if (!raw) return 0
  const t = new Date(`${raw}T12:00:00Z`).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function sortByDateDesc<T extends ContentFile>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = dateValue(b.frontmatter.date_published) - dateValue(a.frontmatter.date_published)
    return diff !== 0 ? diff : a.frontmatter.title.localeCompare(b.frontmatter.title)
  })
}

function isVisible(item: ContentFile, folder: ContentFolder): boolean {
  if (folder !== 'blog') return true
  return item.frontmatter.status === 'published' || includeDrafts()
}

export async function getAllContent(folder: ContentFolder): Promise<ContentFile[]> {
  const files = await readDir(folder)
  const items = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(CONTENT_DIR, folder, file), 'utf-8')
      return parseFile(folder, file, raw)
    }),
  )
  const visible = items.filter((item) => isVisible(item, folder))
  if (folder === 'blog') return sortByDateDesc(visible)
  return visible.sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title))
}

export async function getContent(folder: ContentFolder, slug: string): Promise<ContentFile | null> {
  const filePath = path.join(CONTENT_DIR, folder, `${slug}.md`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const item = parseFile(folder, `${slug}.md`, raw)
    return isVisible(item, folder) ? item : null
  } catch (err) {
    // A malformed post must surface as a build error, not a 404.
    if (err instanceof Error && err.name === 'BlogFrontmatterError') throw err
    return null
  }
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return (await getAllContent('blog')) as BlogPost[]
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return (await getContent('blog', slug)) as BlogPost | null
}

export async function getPostsByCategory(category: BlogCategorySlug): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts()
  return posts.filter((p) => p.frontmatter.category === category)
}

/**
 * Rank candidates for a "related posts" rail: same category outranks any tag
 * overlap, each shared tag adds one point, ties fall back to recency.
 */
export function rankRelatedPosts<T extends ContentFile>(current: T, candidates: T[], limit = 3): T[] {
  const tags = new Set((current.frontmatter.tags ?? []).map((t) => t.toLowerCase()))
  const scored = candidates
    .filter((c) => c.slug !== current.slug)
    .map((c) => {
      let score = 0
      if (current.frontmatter.category && c.frontmatter.category === current.frontmatter.category) {
        score += CATEGORY_MATCH_WEIGHT
      }
      for (const tag of c.frontmatter.tags ?? []) {
        if (tags.has(tag.toLowerCase())) score += 1
      }
      return { post: c, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return dateValue(b.post.frontmatter.date_published) - dateValue(a.post.frontmatter.date_published)
    })
  return scored.slice(0, limit).map((s) => s.post)
}

export async function getRelatedPosts(slug: string, limit = 3): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts()
  const current = posts.find((p) => p.slug === slug)
  if (!current) return []
  return rankRelatedPosts(current, posts, limit)
}
