import GithubSlugger from 'github-slugger'

export type Heading = {
  depth: 2 | 3
  text: string
  id: string
}

/** Strip inline markdown so the TOC label matches what rehype-slug hashes. */
function plainText(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\s+#+\s*$/, '')
    .trim()
}

/**
 * Extract H2/H3 headings with the same ids `rehype-slug` will assign, so the
 * server-rendered table of contents links resolve without a client pass.
 */
export function extractHeadings(markdown: string): Heading[] {
  const slugger = new GithubSlugger()
  const headings: Heading[] = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = /^(##|###)\s+(.+?)\s*$/.exec(line)
    if (!match) continue
    const text = plainText(match[2])
    if (!text) continue
    headings.push({ depth: match[1].length === 2 ? 2 : 3, text, id: slugger.slug(text) })
  }
  return headings
}
