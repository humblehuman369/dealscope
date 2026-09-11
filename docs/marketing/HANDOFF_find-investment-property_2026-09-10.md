# Handoff: /for/find-investment-property paid launch (as of Sept 10, 2026)

Paste this into a new chat. It covers what was built, where things stand on each channel, and what is left to do. Repo is `/Users/bradgeisen/Projects/dealscope/` (Next.js frontend on Vercel, FastAPI backend on Railway). Nickname Humble; business name Brad Geisen.

## What was built

**Landing page** `https://dealgapiq.com/for/find-investment-property` (live, indexable). H1 "Find a deal of a lifetime." with the visible listicle heading "9 reasons investors hunt on Search & Discover instead of a listing site". Config lives in `frontend/src/lib/persona-pages.ts` (slug `find-investment-property`, `featureHero` block, `listicleHeading`), rendered by `frontend/src/components/landing/ListicleLandingPage.tsx`. Screenshots in `frontend/public/images/for/`. Spec: `docs/marketing/FIND_INVESTMENT_PROPERTY_LISTICLE.md`.

**Free-claim wording (agreed, do not change):** page guarantee "Free Discovery on any address. No signup. No card." with the note "A street address returns a Discovery. A city or ZIP opens the map; the full Search & Discover map and List Download are Pro." Ads use "Run any address free. No signup." Never type prices or limits into copy; they render from `frontend/src/lib/planFeatures.ts`. No competitor names in ads.

**Tracking:** PostHog project 463676, dashboard "Direct Response" 2063305, funnel DR-C for this page id 11691570. First-touch UTMs stored as `ft_utm_*`. Convention: ad set / campaign name = `utm_campaign` = `find-investment-property`; hooks via `utm_content=hookA/B/C`. Judge every channel by `ft_utm_source` in PostHog.

**Creatives** in `docs/marketing/assets/`: `fb-ad-not-for-sale-1080.png`, `reddit-ad-not-for-sale-1200x628.png`, `youtube-banner-2560x1440.png`, `reddit-banner-1920x384.jpg`. LinkedIn carousel batch-03 in `docs/marketing/linkedin/`.

**Latest code change (uncommitted as of this handoff):** `ListicleLandingPage.tsx` got an `inProse()` helper so the offer-block sentence reads "...2 discoveries per month and save up to 10 properties" (lowercase s) on all nine /for pages. Type check and persona-pages tests pass. The two banner images are also uncommitted. Commit and push; Vercel redeploys on push.

## Channel status

**Reddit Ads (live, waiting on schedule).** Account `jnsi8ufrrosb`, business `53f291b4-5086-408a-a624-b51b94bd7ead`, posts as u/DealGapIQ, postpaid on Mastercard ending 2381. Campaign `find-investment-property`, $10/day, three ads `reddit-hookA/B/C`, all three approved (Active). Ad group is scheduled to start 6:00 AM ET on Sept 11; until then status shows "Not delivering – schedule not started", which is expected. A stray auto-generated "Traffic Campaign 2026-09-10 02:43" was switched OFF (Reddit created it from the website when the first draft was lost); delete it from its three-dot menu if you want it gone. There is a $500 credit offer that pays after $500 spend by Sept 25; not reachable at $10/day. To do after 6 AM Sept 11: post the founder comment from `docs/marketing/reddit-ads/FIND_INVESTMENT_PROPERTY_REDDIT.md` on each ad so it is the top comment; reply to comments within 24 h. Note the built-in browser blocks ads.reddit.com; use the Claude in Chrome extension in Brave.

**Google Ads (built, paused, blocked on verification).** Account 694-011-4358 under admin@dealgapiq.com, Expert Mode, postpay on Mastercard ending 2381, New York time, USD. Campaign `find-investment-property` (ID 24241648261): Search only, US (people in), English, AI Max off, Maximize clicks with $2.50 max CPC, $15/day, 19 keywords exact+phrase, 21 campaign-level negatives, one RSA (12 headlines, first two pinned; 4 descriptions; final URL with google/cpc UTMs; path for/investors). Ad strength Average. Campaign is PAUSED on purpose. Ads show "Under review"; a "Page views" conversion goal exists but no Google tag is installed (the "Set up a Google tag" email is optional; PostHog is the scoreboard; if a tag is ever added it must sit behind the site's consent gate). Blockers before it can serve: (1) Google advertiser verification (Admin → Advertiser verification); (2) flip campaign from Paused to Enabled. Ad group is still named "Ad group 1" (cosmetic). A leftover "Drafts in progress: 1" from the signup wizard can be deleted. Full spec: `docs/marketing/google-ads/FIND_INVESTMENT_PROPERTY_SEARCH.md` and the Ads Editor CSV beside it.

**Meta / Instagram (built, paused, in Meta review as of Sept 10).** Ad account `act_1166086130583657`. Campaign `for-listicles` (Traffic) now holds ad set `find-investment-property`: $20/day, start Sept 11 06:00 ET, US, age 25-64 (WhatsApp unknown-age off), interests Real estate investing + Landlord only (BiggerPockets, Foreclosure, Rental property and Driving for dollars no longer exist as Meta interests; Wholesale only matches retail), goal landing page views, advertiser InvestIQ, LLC d/b/a DealGapIQ, Page DEAL GAP IQ + IG dealgapiq. Three ads hookA/B/C with the spec §3 copy on `fb-ad-not-for-sale-1080.png` (Brad kept the "Owner 27 yrs" pin), CTA Learn more, UTMs in the ad's Tracking URL-parameters field, every Advantage+ creative enhancement and AI image turned off. Published with the ad set OFF; Brad enables it once the ads are approved. Ad set `house-hackers` ($10/day, live Sept 5-10, $49.17 spent, 205 landing page views at $0.24) was paused Sept 10. Open question: the ad account's tracking dataset is pixel `1495916515917841`, not `1711337133308965`; confirm in Events Manager which dataset the site pixel and CAPI actually feed. The new CAPI token is in Railway (backend redeployed 1:57 PM ET Sept 10); a server event still has to be seen in the dataset Overview.

**YouTube.** Channel "Brad Geisen"; banner file delivered, upload it under Customization → Banner image, then add dealgapiq.com under Links.

## Rules that were agreed
Claude never enters card, password, or 2FA details and never clicks final Submit/Launch on payment pages; Brad does those. Campaigns land paused; Brad enables. Kill rule: 300 link clicks with verdict rate under 5% → pause and rewrite the title first. Scale rule: verdict→signup above site average two weeks running inherits killed budget. Weekly review: DR-C by `ft_utm_source`, each ad platform's dashboard, spend logged in `docs/marketing/spend.csv` with campaign `find-investment-property` and a `channel` column.

## Open items, shortest list
1. Commit and push the `inProse` fix and the two banners.
2. Sept 11 after 6 AM ET: pin founder comment on the three Reddit ads.
3. Google: complete advertiser verification, then enable the campaign.
4. Meta: confirm server (CAPI) events and the pixel ID question, then turn on `find-investment-property` once its ads are approved.
5. Upload YouTube banner and Reddit profile banner.
