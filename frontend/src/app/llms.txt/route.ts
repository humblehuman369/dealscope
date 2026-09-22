import { NextResponse } from 'next/server'
import { getAllBlogPosts } from '@/lib/content'
import { buildLlmsTxt } from '@/lib/seo/llms-txt'

export const dynamic = 'force-static'

export async function GET() {
  const posts = await getAllBlogPosts()
  const blogLinks = posts.map((post) => ({
    href: `/blog/${post.slug}`,
    label: post.frontmatter.title,
  }))

  return new NextResponse(buildLlmsTxt(blogLinks), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}