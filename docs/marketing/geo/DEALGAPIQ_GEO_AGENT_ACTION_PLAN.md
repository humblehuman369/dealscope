# DealGapIQ — GEO action plan for an AI agent

> **Repo note (22 September 2026).** Rule 6 below still says "four offer structures". That phrase was retired the same day this plan was written. The only approved phrase is **"four paths plus a Blend"** (see `docs/brand/content-source-of-truth.md` → "Paths to close the gap"). Every draft in this folder uses the corrected sentence:
>
> "DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four paths plus a Blend to close that gap. It analyzes six strategies across every U.S. market in under 60 seconds, starts free, and Pro costs $34.99 a month."
>
> Working files: `GEO_LOG.md`, `profiles/`, `press/`, `outreach/`, `data-posts/`, `measurement/` in this folder.

Companion to `CURSOR_GEO_LAUNCH_PLAN.md`. That file covers the code. This file covers everything else: outside profiles, press, outreach, original data, and measurement.
Owner: Brad Geisen. Agent: any browsing agent (Grok, Claude, ChatGPT agent, or a human assistant).
Date of plan: 22 September 2026

## Rules for the agent

1. Read the "Approved facts" block in `CURSOR_GEO_LAUNCH_PLAN.md` before any task. Use those facts and only those facts. Never guess a number, date, or URL.
2. Do not create accounts, pay for anything, or send email from Brad's name without a task marked HUMAN being done first by Brad.
3. Every task ends with a success check. Do not mark a task done until the check passes.
4. Log every action in `GEO_LOG.md` with the date, the task number, what was done, and the URL produced.
5. If a fact you need is missing, stop and ask Brad. Do not fill the gap.
6. Use one description everywhere. This is the sentence: "DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four offer structures to close that gap. It analyzes six strategies across every U.S. market in under 60 seconds, starts free, and Pro costs $34.99 a month."
7. Use one founder line everywhere: "Brad Geisen, Founder and CEO of DealGapIQ. Founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. Author of The Deal Gap."

## Fields to copy into every profile

Name: DealGapIQ
Legal name: InvestIQ LLC d/b/a DealGapIQ
Website: https://dealgapiq.com
HQ: Boca Raton, Florida, United States
Founder: Brad Geisen
Beta launch: January 2026
Public launch: August 2026
Category: Real estate investment software
Pricing: Free plan ($0, 3 discoveries a month, no card). Pro $34.99/mo or $29.17/mo billed annually, 7-day trial, no card.
Platforms: Web, iOS (App Store ID 6759636866)
Contact: support@dealgapiq.com, (866) 388-8222
Press kit: https://dealgapiq.com/press (live after Cursor Step 7)

---

## Phase 1 — Inputs Brad must supply (HUMAN, do first)

Brad answers these in `GEO_LOG.md` before the agent starts:
1. Free-tier count: 3 discoveries or 10 analyses?
2. Spelling: "DealMaker" or "Deal Maker"?
3. Exact beta go-live day in January 2026.
4. Brad's LinkedIn profile URL.
5. Amazon author page URL for The Deal Gap.
6. Launch announcement date for the blog post.
7. Headshot file and logo pack location.

Success check: all seven lines filled in.

## Phase 2 — Confirm the site is ready (agent, read-only)

Run after the Cursor PR is merged and deployed.
1. Open https://dealgapiq.com. Confirm the first paragraph under the H1 matches the approved sentence and an "Updated" date shows.
2. View page source. Count `<h2` tags. Expect 11. Confirm the FAQ text is in the HTML, not loaded by script.
3. Paste the home page URL into https://validator.schema.org and https://search.google.com/test/rich-results. Expect zero errors, with FAQPage and Article found.
4. Open https://dealgapiq.com/robots.txt. Confirm GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot and CCBot are not blocked.
5. Open https://dealgapiq.com/press and the launch post. Confirm both load and both are in https://dealgapiq.com/sitemap.xml.
6. Search the site for "$39.99". Expect zero hits.

Success check: all six pass. If any fails, write the failure in `GEO_LOG.md` and tell Brad which Cursor step to rerun.

## Phase 3 — App stores and billing (HUMAN)

1. App Store Connect: set Pro to $34.99/mo. Paste the approved description as the first paragraph of the listing. Add "Publicly launched August 2026."
2. Google Play Console: same price, same description, same launch date.
3. RevenueCat: change any $39.99 product to $34.99.
4. Give the agent the final App Store and Google Play URLs.

Success check: the agent opens both store pages and confirms price, description and launch date match the site.

## Phase 4 — Outside profiles (agent drafts, HUMAN submits)

For each site below, the agent fills every field from the "Fields to copy" block, saves the draft text in `profiles/<site>.md`, and Brad submits it. Sites that need Brad's login are marked.

1. LinkedIn company page (HUMAN login). Add the founder line and the description. Post the launch announcement as the first post.
2. Crunchbase (HUMAN login). Organization DealGapIQ, founder Brad Geisen, founded 2026, Boca Raton, category Real Estate and Software.
3. Product Hunt (HUMAN login). Launch on a Tuesday. Tagline under 60 characters: "See the deal gap on any U.S. property." First comment is the founder story in first person.
4. G2 and Capterra (HUMAN login). Category: Real Estate Investment Software. Use the description word for word.
5. Wikidata (agent can do). Create an item: instance of software, developer InvestIQ LLC, founder Brad Geisen, inception 2026-08, official website dealgapiq.com.
6. After each profile goes live, the agent adds its URL to the `sameAs` list in the site's Organization schema by opening a small PR, or hands the list to Cursor.

Success check: six live URLs in `GEO_LOG.md`, each showing the same description and price, and all six in `sameAs`.

## Phase 5 — Press and founder posts

1. Press release (HUMAN pays). The agent drafts it from the press page: launch sentence first, then the deal gap explanation with the Lake Worth example, then pricing, then the founder line, then contact. About 400 words. Brad submits to PR Newswire or Business Wire.
2. LinkedIn founder post (agent drafts, HUMAN posts). 150 words, first person, why the deal gap matters, link to a free discovery.
3. YouTube demo (HUMAN records). Five minutes: search an address, show the gap, show the four offer paths. The agent writes the title, description and chapter timestamps using the approved sentence.
4. Forum posts (agent drafts, HUMAN posts). One post each for the BiggerPockets forum and r/realestateinvesting. Rule: teach what a deal gap is using the Lake Worth numbers, mention DealGapIQ once at the end, and say plainly that Brad built it. No sales language.

Success check: four public URLs logged.

## Phase 6 — Get on the lists (agent researches and drafts, HUMAN sends)

1. For each target, the agent finds the exact page that lists real estate deal analysis tools and the editor's name or contact form. Targets: TheClose, Baselane, RentalRealEstate, HonestCasa, DealMachine blog. Add any site found in Phase 8 that AI engines cite.
2. Draft one email per target, under 120 words, using this shape: name the exact list page, say what DealGapIQ does in the approved sentence, say what makes it different in one line (it reports a deal gap and target buy price and ships offer structures and negotiation scripts), link the press kit, offer a free Pro login for the reviewer. Sign with the founder line.
3. Save drafts in `outreach/<site>.md`. Brad sends from support@dealgapiq.com or his own address.
4. Track replies in `GEO_LOG.md`. Follow up once after ten days if no reply.
5. Podcasts: the agent lists ten real estate investing podcasts that had a software founder as a guest in the last year, with the booking contact, and drafts one pitch built on the Foreclosure.com to DealGapIQ story.

Success check: five list emails and ten podcast pitches drafted; sends and replies logged.

## Phase 7 — Original data post (agent drafts, Brad supplies numbers)

1. Brad pulls from DealGapIQ the average deal gap for the 20 largest U.S. metros for the current month.
2. The agent writes a post titled "Average deal gap in the 20 largest U.S. markets, [Month Year]". Opening sentence states the national average in plain words. Then a table: metro, average list price, average target buy price, average deal gap as a percent. Then three short paragraphs on the widest gap, the tightest gap, and what a wide spread means for an offer. About 500 words.
3. Include Article JSON-LD with datePublished and dateModified, author Brad Geisen, publisher DealGapIQ.
4. Repeat every month. Keep the old posts and link the new one from the old.

Success check: post is live, in the sitemap, passes the Rich Results Test, and the number in the first sentence matches the table.

## Phase 8 — Comparison pages (agent drafts, Cursor builds)

1. Three pages: DealGapIQ vs DealCheck, DealGapIQ vs PropStream, DealGapIQ vs DealMachine.
2. Same format as the home page: question headings, direct first sentence, a table, and a footnote "Third-party prices from public review sites, [month year]; check each vendor."
3. The agent checks each competitor's public pricing page the day the draft is written and records the URL and date in the footnote source list.
4. The agent never invents a competitor feature. If unsure, leave it out.

Success check: three pages live, in the sitemap, each with exactly one H1 and Article schema.

## Phase 9 — Weekly measurement (agent, every Monday, forever)

1. Ask each of these engines the five prompts below and record every source they cite: ChatGPT, Perplexity, Claude, Google AI Mode, Grok.
2. Prompts, word for word:
   1. What is a deal gap in real estate?
   2. What is the best real estate deal analysis software?
   3. What are alternatives to DealCheck?
   4. How do I find the target buy price on an investment property?
   5. Is DealGapIQ any good?
3. Record in `measurement/YYYY-MM-DD.md` a table: engine, prompt, was DealGapIQ named (yes/no), sources cited.
4. Any cited site not already in Phase 6 goes on the outreach list.
5. Once a month, summarize the trend in `GEO_LOG.md`: how many of the 25 engine-prompt pairs named DealGapIQ.

Success check: a dated file every Monday. Target: DealGapIQ named in at least half of the 25 pairs within 90 days of the launch post.

## Phase 10 — Monthly upkeep (agent)

1. If any approved fact changes, update the site constants first, then every profile from Phase 4, then the app stores. Bump the home page "Updated" date.
2. Publish the new data post (Phase 7).
3. Rerun Phase 2 checks 1 through 6.
4. Re-check competitor prices on the comparison pages and update the footnote date.

Success check: the four items are logged with dates each month.

---

## Order of work

Phase 1 today. Phases 2 and 3 the day the Cursor PR deploys. Phase 4 and 5 the same week. Phase 6 and 7 the following week. Phase 8 the week after. Phase 9 starts the first Monday after the launch post and never stops. Phase 10 starts one month after launch.
