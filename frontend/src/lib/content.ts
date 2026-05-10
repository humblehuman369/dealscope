import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export type ContentFolder = 'blog' | 'glossary'

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
}

export type ContentFile = {
  slug: string
  frontmatter: Frontmatter
  content: string
}

async function readDir(folder: ContentFolder): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(CONTENT_DIR, folder))
    return files.filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
}

function parseFile(folder: ContentFolder, file: string, raw: string): ContentFile {
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
    },
    content: parsed.content,
  }
}

export async function getAllContent(folder: ContentFolder): Promise<ContentFile[]> {
  const files = await readDir(folder)
  const items = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(CONTENT_DIR, folder, file), 'utf-8')
      return parseFile(folder, file, raw)
    })
  )
  return items.sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title))
}

export async function getContent(folder: ContentFolder, slug: string): Promise<ContentFile | null> {
  const filePath = path.join(CONTENT_DIR, folder, `${slug}.md`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return parseFile(folder, `${slug}.md`, raw)
  } catch {
    return null
  }
}
