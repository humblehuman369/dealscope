# Original data post — template (Phase 7)

Monthly. Brad supplies the numbers (task 7.1); the agent fills this template and hands it to Cursor as `frontend/content/blog/average-deal-gap-20-largest-us-markets-YYYY-MM.md`. **Never publish with a placeholder left in.** Every `{…}` below must be replaced by a number Brad pulled from DealGapIQ for the month, or the post does not ship.

## Inputs Brad supplies (paste into `GEO_LOG.md` first)

| Metro | Avg list price | Avg target buy price | Avg deal gap (%) |
| --- | --- | --- | --- |
| New York | | | |
| Los Angeles | | | |
| Chicago | | | |
| Dallas–Fort Worth | | | |
| Houston | | | |
| Washington, DC | | | |
| Philadelphia | | | |
| Miami | | | |
| Atlanta | | | |
| Boston | | | |
| Phoenix | | | |
| San Francisco | | | |
| Riverside–San Bernardino | | | |
| Detroit | | | |
| Seattle | | | |
| Minneapolis | | | |
| San Diego | | | |
| Tampa | | | |
| Denver | | | |
| Baltimore | | | |

Also: national average deal gap (%) for the month, the strategy and down-payment assumption used (e.g. long-term rental at 20% down), the sample size (number of discoveries), and the date range. The metro list is the 20 largest U.S. metros by population; confirm the list against the current Census estimate before the first post.

## Frontmatter (blog format; see `frontend/content/blog/dealgapiq-launches-publicly.md`)

```yaml
---
title: "Average deal gap in the 20 largest U.S. markets, {Month YYYY}"
slug: average-deal-gap-20-largest-us-markets-{yyyy}-{mm}
type: blog
intent: Data
primary_keyword: average deal gap
secondary_keywords:
  - deal gap by market
  - target buy price vs list price
  - real estate investment analysis data
meta_title: "Average Deal Gap, 20 Largest U.S. Markets ({Month YYYY})"
meta_description: "The average deal gap across the 20 largest U.S. metros was {national avg}% in {Month YYYY}. Widest: {metro}. Tightest: {metro}. Full table with list price and target buy price."
schema: BlogPosting
status: published
category: markets
tags:
  - deal-gap
  - data
  - markets
author: Brad Geisen
date_published: "{YYYY-MM-DD}"
date_modified: "{YYYY-MM-DD}"
internal_links:
  - /blog/what-is-the-deal-gap
  - /markets
  - /discovery
  - /blog/average-deal-gap-20-largest-us-markets-{previous yyyy}-{previous mm}
word_count_target: 500
---
```

The blog renderer already emits `BlogPosting` JSON-LD with `datePublished`, `dateModified`, author Brad Geisen and publisher DealGapIQ from this frontmatter (verified on the launch post), so no extra schema block is needed.

## Body (~500 words)

Opening sentence, plain words, the national number first:

> Across the 20 largest U.S. metros, the average deal gap in {Month YYYY} was {national avg}%: on a typical listing, the asking price sat {national avg}% above the price at which the property works for an investor.

One sentence on method: DealGapIQ discoveries run in {Month YYYY} ({sample size} addresses), scored as {strategy} at {down payment}% down. The deal gap is the difference between the list price and the target buy price; a negative gap means the ask is above the target.

Table (metro, average list price, average target buy price, average deal gap %), sorted widest gap to tightest.

Three short paragraphs:

1. **Widest gap: {metro}, {gap}%.** What that means for an offer there (Terms and Blend paths do more work; a price-only offer is unlikely to close alone).
2. **Tightest gap: {metro}, {gap}%.** What that means (a price offer alone is close; move quickly).
3. **What a wide spread means for an offer.** Same rule everywhere: the gap tells you which of the four paths plus a Blend (Price, Income, Terms, Equity) to lead with. Link to `/blog/what-is-the-deal-gap`.

Close with: link to the previous month's post (and, in the previous post, add a line linking forward to this one), and "Run a free discovery on any address in these markets: /discovery".

## Success check

Post live at `/blog/{slug}`; in `sitemap.xml`; Rich Results Test detects Article/BlogPosting; the number in the first sentence equals the national average row; previous month's post links to it. Log in `GEO_LOG.md`.
