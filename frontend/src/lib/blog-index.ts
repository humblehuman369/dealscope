export const BLOG_INDEX_DESCRIPTION =
  'Real estate investment analysis, creative-finance teardowns, offer structures, and the pitch scripts that close the deal. Built for active investors who know the price tag is not the deal — the structure is.'

export const BLOG_INDEX_INTRO =
  'Deal teardowns, creative-finance breakdowns, financing comparisons, and the pitch scripts that close the gap.'

export function blogPageHref(page: number): string {
  return page <= 1 ? '/blog' : `/blog/page/${page}`
}
