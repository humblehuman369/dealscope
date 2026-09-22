# DealGapIQ — GEO/AEO home page and launch plan for Cursor

Repo: `/Users/bradgeisen/Projects/dealscope/` (Next.js, deployed on Vercel)
Goal: make dealgapiq.com quotable by Google AI Overviews, AI Mode, ChatGPT, Perplexity, Claude and Copilot, and give the official launch one clean set of facts across the site.
Date of plan: 21 September 2026

## Rules for the agent

Think first. Before each step, list the files you will touch and ask if anything is unclear.
Touch only what the step names. Do not refactor, restyle, or rename unrelated code.
Match the existing component and styling patterns in the repo.
Every step ends with the success check listed. Do not move on until it passes.
Do not invent facts. Every number and name below is approved. If a fact is missing, stop and ask.

## Approved facts (single source of truth)

Product name: DealGapIQ (one spelling, one capitalisation, everywhere)
Legal entity: InvestIQ LLC d/b/a DealGapIQ, Boca Raton, Florida
Founder: Brad Geisen, Founder and CEO, author of *The Deal Gap*
Credential line, exact order: "Founded Foreclosure.com, built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac"
Beta launch: January 2026. Public launch: August 2026. Updates ship weekly.
Strategies (6): long-term rental, short-term rental, BRRRR, fix and flip, house hack, wholesale
Offer paths: Price, Income, Terms, Equity, plus a Blend. The only approved phrase is "four paths plus a Blend". Never "four offer structures", "four ways", "four pre-built paths", or "the fourth blends the other three". Seller financing and subject-to sit in the Terms path.
Term ownership: Brad Geisen coined the term "deal gap"; it is the subject of his book *The Deal Gap*. Site copy may say so.
Valuation and listing sources: 5 today, including Zillow, Redfin, Realtor.com and RentCast, shown side by side; more sources planned. Use "5" everywhere; never "6".
Directories: 2,812 verified cash buyers; 484 hard money lenders (Pro only)
Free plan: $0, 3 discoveries a month, 3 saved properties, no card
Pro: $34.99/mo or $29.17/mo billed annually, 7-day trial, no card. $34.99 is final for web, iOS and Android. Replace every $39.99 you find.
Contact: support@dealgapiq.com, (866) 388-8222
iOS App Store ID: 6759636866
Worked example: 1014-16 N J St, Lake Worth, FL. List $457,100. Target buy $428,000 at 20% down. Deal gap -6.4%.

---

## Step 0 — Recon (no code changes)

Find and list:
1. The home page route and its section components (hero, founder, funding, "the gap is the deal", how it works, pricing, comparison table, trust, explore).
2. Where `<head>` metadata is set (`app/layout.tsx` or `pages/_app` / `next/head`).
3. Any existing JSON-LD or `<script type="application/ld+json">`.
4. The blog route and how posts are stored (MDX, CMS, or static).
5. The sitemap and robots config (`app/sitemap.ts`, `next-sitemap`, or static files).
6. Every occurrence of "Deal Maker", "DealMaker", "InvestIQ", "$39.99", "$34.99", "3 discoveries", "10 analyses", "offer structures", "four ways", "pre-built paths", "offer paths", "fourth blends".

Output a short report. Success check: the report lists file paths for items 1 to 6 and the grep results for item 6.

## Step 1 — Answer-first hero and visible date

Files: home page hero component only.

1. Keep the H1 "Find a Great Deal & How to Close It." or replace with "DealGapIQ: find the deal gap on any U.S. property and get four paths plus a Blend to close it". Ask which.
2. Replace the current lede sentence with this exact paragraph:

   > DealGapIQ is a real estate investment analysis tool that shows the gap between a property's asking price and the price at which it works for an investor, then gives four paths plus a Blend to close that gap. It analyzes six strategies across every U.S. market in under 60 seconds, starts free, and Pro costs $34.99 a month.

3. Directly under it, add a small line: `Updated {date}` rendered from a single constant `HOME_UPDATED_AT = "2026-09-21"` exported from one file (for example `src/config/site.ts`). Step 4 reuses it.
4. Keep the search box, the five chips, and the QR/Point & Scan block as they are.

Success check: page renders, H1 unchanged or approved, new paragraph is the first `<p>` after the H1, date shows, no layout shift on mobile at 375px.

## Step 2 — Key takeaways block

Files: new small component under the hero, or inside the hero component.

Add a plain list titled "Key takeaways" with these six lines (verbatim):

- The "deal gap" is the difference between the list price and the target buy price that makes a property pencil for a chosen strategy.
- DealGapIQ scores any address, on-market or off-market, against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale.
- Every analysis returns four paths plus a Blend to close the gap, each with an editable worksheet and a negotiation script.
- The free plan gives three discoveries a month with no card. Pro is $34.99 a month or $29.17 a month billed annually.
- Pro adds directories of 2,812 verified cash buyers and 484 hard money lenders, plus comps, Excel proformas and PDF reports.
- Built by Brad Geisen, who founded Foreclosure.com and whose team built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac.

Use a real `<ul>`. Success check: the list is in the DOM as `<ul><li>` (not divs), reads correctly in dark and light modes.

## Step 3 — Rewrite section headings and opening sentences

Files: the existing section components. Change headings and the first paragraph of each. Do not touch the interactive parts, the pricing cards, or the comparison table layout.

Change each H2 to a question and make the first sentence a direct answer. Order on the page becomes:

1. **What is DealGapIQ?**
   Opening: "DealGapIQ is a web and mobile tool that turns any property address into an investor analysis, a target buy price, and a set of ready-to-send offers. It is made by InvestIQ LLC in Boca Raton, Florida, launched in beta in January 2026 and publicly in August 2026, and ships updates weekly."

2. **What is a deal gap in real estate?**
   Opening: "A deal gap is the difference between what a seller is asking and the most an investor can pay and still hit their return target. If a house lists at $457,100 and the numbers say an investor should pay $428,000 at 20 percent down, the deal gap is 6.4 percent, or about $29,000."
   Reuse the existing Lake Worth example block below this.

3. **How does DealGapIQ analyze a deal in under 60 seconds?**
   Opening: "It runs three steps: search an address, see the deal gap, and get four paths plus a Blend. The whole analysis runs in under a minute."
   Reuse the existing three-step block.

4. **How do you close the gap between list price and target buy price?**
   Opening: "DealGapIQ gives four paths plus a Blend: Price, Income, Terms and Equity, and a Blend that combines them."
   Reuse the existing four-path block.

5. **Which investment strategies does DealGapIQ cover?**
   Opening: "Six: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale. Every discovery scores the property against all six."
   Add six links to the existing `/strategies/*` pages.

6. **How does DealGapIQ compare with DealCheck, PropStream and DealMachine?**
   Opening: "DealGapIQ is the only one of the four that reports a deal gap and target buy price, and the only one that ships four paths plus a Blend with negotiation scripts."
   Keep the existing comparison table. Add one row at the top named "Starting price" with: DealGapIQ "$34.99/mo, free tier"; Listing Sites "Free"; Investor Calculators "Free to ~$14/mo"; List & Mail Platforms "Subscription plus per-record fees". Add a footnote: "Third-party prices from public review sites, September 2026; check each vendor."

7. **How much does DealGapIQ cost?**
   Opening: "The free plan is $0 with no credit card. Pro is $34.99 a month, or $29.17 a month billed annually, with a 7-day trial that also needs no card."
   Reuse the pricing cards.

8. **Where do DealGapIQ's valuations and data come from?**
   Full text: "DealGapIQ pulls valuation, listing, property detail, and comparable sales data from five sources, including Zillow, Redfin, Realtor.com, and RentCast, and shows them side by side. More sources are planned. Investors can compare the valuation from each source and make their own market decision instead of trusting one number. A tight spread between sources means the market is easy to read. A wide spread tells you to check the comps yourself before you make an offer. Every number and every source is visible in the app. There are no hidden formulas."
   Fix the stat tiles and the comparison table: the page says "Data Sources 5 live" and the table says "Full (6 sources)". Change the table cell to "Full (5 sources)". Do not add "more planned" to the table; keep it in the section text only.

9. **Can DealGapIQ find cash buyers and hard money lenders?**
   Opening: "Yes. Pro includes a directory of 2,812 verified cash buyers and 484 hard money lenders, searchable by city, county, ZIP, state, strategy, and loan product."
   Reuse the Get Funding block.

10. **Who built DealGapIQ?**
    Opening: "DealGapIQ was built by Brad Geisen, who founded Foreclosure.com and whose company built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. His GSE partnerships date to a 1991 HUD pilot program."
    Move the founder block here, replace the "Sources" idea with a short list titled "Built by the founder": Foreclosure.com (still powers BiggerPockets' foreclosure search), HomePath.com, HomeSteps.com. Link the founder's name to `/about`.

Remove the testimonials block or move it below the FAQ. Testimonials are not quotable by engines and push the useful content down.

Success check: exactly one H1; H2s appear in the order above; each H2 is immediately followed by a `<p>`; all internal links resolve (no 404s); Lighthouse accessibility score does not drop.

## Step 4 — FAQ section

Files: new `FaqSection` component; new `src/content/home-faq.ts` exporting an array of `{question, answer}` so Step 5 can reuse it for schema.

Render as `<h2>Frequently asked questions</h2>` then `<h3>` per question with a `<p>` answer. No accordion that hides text from the DOM; if you use a disclosure element, keep the answer in the HTML.

Questions and answers (verbatim):

1. What is DealGapIQ? — DealGapIQ is a real estate investment analysis tool that shows the gap between a property's price and its investor value, then gives four paths plus a Blend to close it. It covers six strategies in every U.S. market and runs in under 60 seconds. It starts free.
2. What does "deal gap" mean? — The deal gap is the difference between the seller's asking price and the target buy price that makes the deal work for an investor. DealGapIQ reports it as a percentage and a dollar amount. A negative gap means the list price is above the target.
3. Is DealGapIQ free? — Yes, the free plan gives three discoveries a month, the full analysis, and negotiation scripts, with no credit card. Pro is $34.99 a month or $29.17 a month billed annually and comes with a 7-day trial.
4. Does DealGapIQ work for BRRRR and fix and flip? — Yes. Every discovery is scored against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale. Pro users can edit the assumptions for each.
5. How is DealGapIQ different from DealCheck? — DealCheck is a calculator that tells you whether a deal works at a given price. DealGapIQ tells you the price at which it works, how far the listing is from that price, and four paths plus a Blend to get there, including creative financing. DealCheck is cheaper; DealGapIQ includes buyer and lender directories.
6. Does DealGapIQ need a mailing list or motivated seller? — No. Any property qualifies. The tool finds the gap and the structure that closes it, so you can make an offer on a normal listing rather than mailing thousands of owners hoping one is distressed.
7. Does DealGapIQ cover my area? — DealGapIQ is live in every U.S. market. It surfaces foreclosures, pre-foreclosures, expired listings, absentee owners, and distressed sellers by address, city, or ZIP.
8. Is there a DealGapIQ app? — Yes. There is an iOS app (App Store ID 6759636866) and a Point & Scan feature that runs a discovery when you point your phone camera at a house. Scanning also works without the app installed.

Success check: eight `<h3>` questions in the DOM; text visible without JavaScript (check with `curl` or view-source).

## Step 5 — JSON-LD: Article, FAQPage, Organization, SoftwareApplication

Files: one new component `JsonLd.tsx` rendered in the home page (server component). Build the object in code from `site.ts` and `home-faq.ts` so it never drifts from the visible text.

Emit one `<script type="application/ld+json">` with an `@graph` containing:

- `Article`: headline = H1, `dateModified` = `HOME_UPDATED_AT`, `datePublished` = "2026-01-15" (beta go-live; ask Brad for the exact day), `author` = Person Brad Geisen with `url` `/about` and `sameAs` (LinkedIn, Amazon author page — ask for URLs), `publisher` = the Organization node.
- `Organization` `@id` `https://dealgapiq.com/#org`: name DealGapIQ, legalName InvestIQ LLC, `foundingDate` "2026-08", address Boca Raton FL US, telephone +1-866-388-8222, email support@dealgapiq.com, logo, `sameAs` [App Store URL for id6759636866, LinkedIn company page, Crunchbase URL when created].
- `SoftwareApplication`: name DealGapIQ, applicationCategory BusinessApplication, operatingSystem "Web, iOS", three `Offer` nodes (Free 0 USD; Pro monthly 34.99 USD; Pro annual 29.17 USD per month billed annually).
- `FAQPage`: `mainEntity` mapped from `home-faq.ts`.

Remove any older duplicate schema found in Step 0.

Success check: paste the rendered HTML into https://validator.schema.org and Google's Rich Results Test; zero errors; FAQ and Article detected.

## Step 6 — Entity and price consistency sweep

Files: everything the Step 0 grep found.

1. Standardise "DealMaker" (one word) everywhere, or "Deal Maker" everywhere. Ask which. Apply to nav, footer, page titles, and `/deal-maker` metadata.
2. Make the free-tier count match everywhere (site says 3 discoveries; some app files say 10 analyses). Ask which is true and fix the other.
3. Set the Pro price to $34.99/mo everywhere in this repo: web copy, pricing page, and any app paywall copy. Flag any `$39.99` or `39.99` left in files outside this repo (RevenueCat, App Store Connect, Google Play) in the PR description so Brad can change them by hand.
4. Offer-path wording: grep the repo for `offer structures`, `four ways`, `pre-built paths`, `offer paths`, `fourth blends` and `4 ways`. Replace every hit in web copy, app copy, schema and metadata with "four paths plus a Blend". Do not touch code identifiers.
5. Footer legal line stays "InvestIQ LLC d/b/a DealGapIQ" but the brand name in headings, titles and schema is only "DealGapIQ".

Success check: repeat the Step 0 grep; each term returns one consistent form. `grep -rEi "offer structures|four ways|pre-built paths|offer paths|fourth blends|4 ways" src app` returns nothing.

## Step 7 — Press page

Files: new route `/press` (`app/press/page.tsx`), assets under `public/press/`.

Content, in this order:
1. H1 "DealGapIQ press kit".
2. The launch sentence: "DealGapIQ, founded by Foreclosure.com founder Brad Geisen, publicly launched in August 2026 as a free real estate deal analysis tool that shows investors the gap between a property's price and its investor value, and four paths plus a Blend to close it."
3. Fact sheet table: company, founder, HQ, beta date, public launch date, strategies, data sources, directory counts, pricing, platforms, contact.
4. Founder bio (150 words) using the approved credential line, plus headshot download.
5. Logo pack links (light, dark, mark, OpenGraph image already in `/brand/`).
6. Three product screenshots with alt text.
7. Press contact: support@dealgapiq.com and phone.
8. Link to the launch announcement post (Step 8).

Add `/press` to the footer under Company. Set page title "DealGapIQ press kit and company facts" and a meta description. Include an `Organization` reference by `@id` only.

Success check: route renders, all downloads resolve, page is in the sitemap.

## Step 8 — Launch announcement post

Files: new blog post in the existing blog format.

Title: "DealGapIQ launches publicly: see the deal gap on any U.S. property"
Date: the announcement date Brad chooses (not August unless that is the chosen day).
Author: Brad Geisen.
Body (about 500 words, first person): why he built it after Foreclosure.com and HomePath; what a deal gap is (reuse the Lake Worth example); what is free and what is Pro; the beta-to-launch timeline; what ships next. End with a link to run a free discovery.
Include `Article` JSON-LD with `datePublished`, `dateModified`, author, publisher, using the same helper as Step 5.

Success check: post appears in the blog index and sitemap; Rich Results Test detects Article.

## Step 9 — Metadata, sitemap, robots

Files: metadata config, sitemap, robots.

1. Home `<title>`: "DealGapIQ: Real Estate Deal Analysis and Offer Tool for Investors". Meta description (under 155 chars): "See the gap between a property's price and its investor value, then get four paths plus a Blend to close it. Six strategies, every U.S. market, under 60 seconds. Free to start."
2. Add `article:modified_time` OG tag from `HOME_UPDATED_AT`.
3. Confirm `/press`, the launch post, `/about`, `/methodology`, all `/strategies/*` and `/what-is-dealgapiq` are in the sitemap with `lastmod`.
4. Confirm `robots.txt` allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Bingbot`, `CCBot`. Do not block them.
5. Fix the `google-site-verification` meta: it currently contains a URL instead of the verification token. Get the token from Search Console.

Success check: `curl -A "GPTBot" https://dealgapiq.com/` returns 200 with the full text; sitemap validates; Search Console shows the property verified.

## Step 10 — Verify and ship

1. Run the build; fix type errors only in files you touched.
2. Check the home page at 375px, 768px, 1280px in light and dark.
3. `curl https://dealgapiq.com/ | grep -c "<h2"` returns 11 (10 sections plus FAQ).
4. Rich Results Test on `/`, `/press`, and the launch post: no errors.
5. Open a PR titled "GEO/AEO home page, FAQ, schema, press kit, launch post". In the description, list every file touched and the two open questions Brad answered (free-tier count, DealMaker spelling).

---

## Steps 11 to 13 — Deal gap page, comparison pages, about page

See `docs/aeo-pages/README.md` (the dealgapiq-aeo-pages drop-in). Run after Step 10. Same rules.

## Not for Cursor (manual, after deploy)

These happen off-site and are listed so nothing is forgotten: paid press release on PR Newswire or Business Wire; founder LinkedIn post and short YouTube demo; Product Hunt launch; BiggerPockets forum and r/realestateinvesting posts; Crunchbase, Wikidata, G2 and Capterra listings; pitch TheClose, Baselane, RentalRealEstate, HonestCasa and the DealMachine blog to add DealGapIQ to their existing "best software" lists; update the App Store and Google Play descriptions with the August 2026 launch date and the same one-sentence description; podcast outreach.
