import { z } from 'zod'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blog-categories'

export const META_TITLE_MAX = 60
export const META_DESCRIPTION_MAX = 155

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()), 'Invalid date')

export const blogFaqSchema = z.object({
  question: z.string().min(8),
  answer: z.string().min(20),
})

export type BlogFaq = z.infer<typeof blogFaqSchema>

export const blogStatusSchema = z.enum(['draft', 'published'])

/**
 * Loose shape every blog file must satisfy. Field requirements tighten when
 * `status: published` (see `superRefine`) so a draft can be committed half-done
 * without breaking the build, but nothing incomplete can ship.
 */
export const blogFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case'),
    type: z.string().optional(),
    intent: z.string().optional(),
    primary_keyword: z.string().optional(),
    secondary_keywords: z.array(z.string()).optional(),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    schema: z.string().optional(),
    status: blogStatusSchema.default('draft'),
    author: z.string().optional(),
    date_published: isoDate.optional(),
    date_modified: isoDate.optional(),
    word_count_target: z.number().int().positive().optional(),
    internal_links: z.array(z.string()).optional(),
    category: z.enum(BLOG_CATEGORY_SLUGS).optional(),
    tags: z.array(z.string()).optional(),
    faq: z.array(blogFaqSchema).optional(),
    series: z.string().optional(),
    subtitle: z.string().optional(),
    hero_image: z.string().optional(),
    hero_alt: z.string().optional(),
    featured: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status !== 'published') return
    const required: Array<keyof typeof data> = [
      'meta_title',
      'meta_description',
      'primary_keyword',
      'category',
      'date_published',
      'author',
    ]
    for (const key of required) {
      if (data[key] === undefined || data[key] === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when status is "published"`,
        })
      }
    }
    if (data.meta_title && data.meta_title.length > META_TITLE_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meta_title'],
        message: `meta_title must be <= ${META_TITLE_MAX} characters (got ${data.meta_title.length})`,
      })
    }
    if (data.meta_description && data.meta_description.length > META_DESCRIPTION_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meta_description'],
        message: `meta_description must be <= ${META_DESCRIPTION_MAX} characters (got ${data.meta_description.length})`,
      })
    }
    if (data.hero_image && !data.hero_alt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hero_alt'],
        message: 'hero_alt is required when hero_image is set',
      })
    }
  })

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>

export class BlogFrontmatterError extends Error {
  constructor(file: string, issues: z.ZodIssue[]) {
    const detail = issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
    super(`Invalid blog frontmatter in ${file}:\n${detail}`)
    this.name = 'BlogFrontmatterError'
  }
}

/**
 * Parse and validate blog frontmatter. Throws `BlogFrontmatterError` so a bad
 * post fails `next build` (via generateStaticParams) instead of shipping.
 */
export function parseBlogFrontmatter(file: string, data: unknown): BlogFrontmatter {
  const result = blogFrontmatterSchema.safeParse(data)
  if (!result.success) throw new BlogFrontmatterError(file, result.error.issues)
  const expectedSlug = file.replace(/\.md$/, '')
  if (result.data.slug !== expectedSlug) {
    throw new BlogFrontmatterError(file, [
      {
        code: z.ZodIssueCode.custom,
        path: ['slug'],
        message: `slug "${result.data.slug}" must match filename "${expectedSlug}"`,
      },
    ])
  }
  return result.data
}
