# DealGapIQ — Marketing Enhancement Plan (Cursor implementation)

> **Supplement to** `DealGapIQ_Marketing_Audit_2026-09-07.md`. The audit says what is wrong and why. This file says what to build, in what order, and how to know it is done.
>
> **How to use in Cursor:** open the repo root, paste the prompt in §0 into a new Composer/Agent session, and point it at this file. Work one task at a time. Each task ends with a checklist the agent must satisfy before moving on. Tasks marked **[founder]** need a human login and are not for the agent; the agent should print them as a TODO and skip.
>
> **Suggested location:** `docs/marketing/ENHANCEMENT_PLAN_2026-09.md`. Register it in `MARKETING_RESOURCE_GUIDE.md` when done.

---

## 0. Prompt for the agent

```
You are implementing docs/marketing/ENHANCEMENT_PLAN_2026-09.md.

Before writing any code, read in this order:
  docs/marketing/MARKETING_RESOURCE_GUIDE.md
  docs/marketing/POSITIONING.md
  docs/marketing/DIRECT_RESPONSE_PLAYBOOK.md
  docs/marketing/LISTICLE_LANDING_PAGES.md
  docs/marketing/LISTICLE_META_LAUNCH_KIT.md
  frontend/src/lib/attribution.ts
  frontend/src/lib/metaPixel.ts
  frontend/src/lib/seo/persona-pages.ts
  frontend/src/lib/seo/problem-pages.ts
  frontend/src/lib/planFeatures.ts

Rules:
- Work one task at a time, in the order listed. Do not skip ahead.
- Inspect real files before editing. Paths in the plan come from the docs
  and may have drifted; if a path is missing, search for the symbol, then
  update the plan with the real path.
- Never type a price, free-tier limit, or trial length into copy. Render
  from planFeatures.ts.
- Never add a claim that is not in DEALGAPIQ_FEATURE_AUDIT.md.
- Copy rules: no "evaluate/consider/explore/discover/let us help." No
  advice language. Guarantee line is exactly "Free verdict. No signup.
  No card." Sign-off is "Google Deal Gap IQ. Know what to offer."
- After each code task run: npm run typecheck, npm run test:run,
  npm run lint, npm run build (frontend); pytest (backend). Fix what
  breaks. Do not commit with red checks.
- Tasks tagged [founder] are not yours. Print them as a TODO and continue.
- Finish each task by updating the checklist in this file and adding a
  changelog row at the bottom.
```

---

## 1. Order of work

| Phase | Tasks | Why this order |
|---|---|---|
| A. Fix before spend | A1 – A6 | Cheap, and every later read depends on them |
| B. Product changes that raise conversion | B1 – B4 | Email capture and server-side events are the two biggest fixes in the audit |
| C. Campaign kits | C1 – C4 | Paste-ready values for Meta, Google, retargeting; adjusted budgets |
| D. Content and channels | D1 – D6 | Fills the empty "Aware" and "Retain" cells in the gap matrix |
| E. Measurement | E1 – E3 | Cost columns, attribution hardening, weekly report |

Phase A and B must be complete before the founder presses Publish in Ads Manager.

---

## Phase A — Fix before spend

### A1. Close the three open decisions and regenerate the playbook

**Goal:** `MARKETING_PLAYBOOK.md` stops saying "TBD" for facts that are settled everywhere else.

**Files:** `docs/marketing/MARKETING_PLAYBOOK.md`, `docs/marketing/MARKETING_RESOURCE_GUIDE.md`, `frontend/src/lib/planFeatures.ts` (read only).

**Steps**
1. Read `planFeatures.ts`. Note the exact values of the free analysis limit, saved-property limit, `PRO_PRICE_MONTHLY`, `PRO_PRICE_ANNUAL`, `PRO_TRIAL_DAYS`.
2. In the playbook, replace every "TBD" and "confirm before publishing" about free tier or pricing with the values from step 1. Places to check: the header block, §2, §5.7 "Cancel anytime" row, §15 "Never say," §16 cheat sheet, the closing italic note.
3. Add the guarantee line "Free verdict. No signup. No card." to §5.7 microcopy and to §13 as the line under every primary CTA.
4. Add the sign-off "Google Deal Gap IQ. Know what to offer." to §5.7 and §13.
5. In §1 golden rules, change rule 1 to: *Lead with the problem and the free verdict on acquisition surfaces (ads, landing pages). "Hunt. Score. Close." is the product tagline for brand surfaces (App Store, hero, bios).*
6. In `MARKETING_RESOURCE_GUIDE.md`, tick the three open decisions and add a changelog row.
7. Regenerate the docx with the pandoc command in the resource guide.

**Done when**
- [ ] `grep -n "TBD" docs/marketing/MARKETING_PLAYBOOK.md` returns nothing about pricing or limits
- [ ] Guarantee line and sign-off appear in §5.7 and §13
- [ ] `.docx` regenerated, resource guide changelog updated

---

### A2. Fix the Meta kit copy

**Goal:** Ad copy matches the page and does not use internal names as cold hooks.

**File:** `docs/marketing/LISTICLE_META_LAUNCH_KIT.md`

**Steps**
1. §2.3 shared fields: change Description from `Free Discovery. No signup. No card.` to `Free verdict. No signup. No card.`
2. Replace these headlines:

| Ad | Old | New | Chars |
|---|---|---|---|
| house-hackers-hookA | 8 reasons house hackers check first | Run the duplex before the pre-approval | 39 |
| house-hackers-hookB | You see what the rented units cover | What the other unit pays of your mortgage | 40 |
| out-of-state-investors-hookB | Run the address before you book the flight | Run the address. Then book the flight. | 37 |
| creative-finance-buyers-hookA | 8 reasons to run the Four Paths first | When the seller says no to the price | 36 |

3. Swap hook labels so the strongest headline is Hook A for `wholesalers` ("Your spread, in dollars") and `creative-finance-buyers` ("Three small asks that equal one big one"). Keep `utm_content` consistent with the new labels.
4. Add **Hook C** to every ad set. Identical across all four so it acts as a control:

| Field | Value |
|---|---|
| Ad name | `<slug>-hookC` |
| Headline | `Free verdict on any address. No signup.` (39) |
| Primary text | `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.` |
| URL | same as A/B with `utm_content=hookC` |

5. Add a note under §2.3: *If Hook C wins on verdict rate across two or more personas for two weeks, the listicle frame is not adding value for that persona. Move that persona's budget to its matching `/answers` page.*
6. §2.2 defaults: add a row `Special Ad Category fallback: if Meta forces Housing, keep the ad set live, switch Advantage+ audience On, remove interest stacks, and note the date in the changelog.`
7. Update §2.4 checklist: add `[ ] Description line reads "Free verdict. No signup. No card."` and `[ ] Hook C present on every ad set.`
8. Update the weekly review table (§2.5) to compare C against A and B.

**Done when**
- [ ] `grep -n "Discovery" LISTICLE_META_LAUNCH_KIT.md` returns nothing
- [ ] No headline over 40 characters (count them; add a comment with the count)
- [ ] Hook C block on all four ad sets, control note added

---

### A3. Rebudget the Meta test

**Goal:** Reach the kill threshold in weeks, not months.

**Files:** `LISTICLE_LANDING_PAGES.md` §5 and §7, `LISTICLE_META_LAUNCH_KIT.md` §2.2 and §5.

**Steps**
1. In `LISTICLE_LANDING_PAGES.md` §5 Budget, replace the four-at-$10 plan with: *Launch two ad sets at $20/day: `wholesalers` and `creative-finance-buyers`. Add `house-hackers` and `out-of-state-investors` when either launched set reaches 300 clicks or is paused by the kill rule. Retargeting ad set (§C3 of the enhancement plan) runs at $5/day from day one. Total starting spend $45/day.*
2. Add a line: *At $1–$3 CPC, $20/day yields 50–140 clicks a week; expect the 300-click read in 2–4 weeks per ad set.*
3. §7 Phasing: change "4 ad sets at $10/day" to "2 ad sets at $20/day + retargeting" and extend Phase 3 to weeks 4–8.
4. Add a **Spend cap** line: *First six weeks, all paid channels combined: $2,500. The Monday review stops spend at the cap regardless of results.*
5. Mirror the same changes in the kit §2.2 (daily budget $20) and §5 exit criteria.

**Done when**
- [ ] Both docs agree on 2 × $20 + $5 retargeting, cap $2,500, Phase 3 = weeks 4–8

---

### A4. Add the Google Search launch kit

**Goal:** Google Search has the same paste-ready kit Meta has.

**New file:** `docs/marketing/SEARCH_LAUNCH_KIT.md`. Register it in the resource guide.

**Steps**
1. Read `frontend/src/lib/seo/problem-pages.ts`. Pull the H1, agitate sentence, and slug for these four pages: `does-this-rental-cash-flow`, `what-should-i-offer-on-this-house`, `seller-wont-lower-the-price`, `should-i-wholesale-this-deal`.
2. Write the kit in the same shape as the Meta kit:
   - **Campaign:** name `answers-search`, Search only (no Display, no Search Partners), US, manual CPC or Maximize Clicks with a $5 cap for the first two weeks, then switch to Maximize Conversions once `verdict_viewed` (imported from GA4 or PostHog via a conversion action) has 30+ in a week.
   - **Ad groups:** one per page, named exactly the slug, $15/day each.
   - **Keywords:** per page, 5–10 exact and phrase match built from the problem phrasing and the persona variants in DR playbook §3. Write them out.
   - **Negatives (campaign level):** `jobs, salary, career, course, free download, template, excel, spreadsheet, license, exam, near me, for sale, zillow, redfin, realtor` plus every US state name. State names are negatives because `/markets/[state]` handles that intent organically.
   - **Ads (RSA):** Headline 1 = page H1 verbatim. Headline 2 = `Free verdict. No signup. No card.` Headline 3 = `15 seconds from address to answer`. Description 1 = the page's agitate sentence. Description 2 = `We analyze. You decide.` Pin H1 and H2 to positions 1 and 2.
   - **Final URL:** `https://dealgapiq.com/answers/<slug>?utm_source=google&utm_medium=cpc&utm_campaign=<slug>`. Auto-tagging on (keeps `gclid`).
   - **Kill rule:** 200 clicks and verdict rate under 6% → pause, rewrite H1 on the page first.
   - **Scale rule:** same as Meta.
3. Add a PostHog section: DR-C funnels already exist per `/answers` slug; add breakdown by `ft_utm_medium` so `cpc` reads separately from organic on the same page.
4. Add a "Before pressing Publish" checklist mirroring the Meta kit.

**Done when**
- [ ] File exists with all sections, keywords written out for four groups, negatives listed
- [ ] Row added to `MARKETING_RESOURCE_GUIDE.md` library table

---

### A5. LinkedIn Batch 01 amendments

**Goal:** Add the founder credential and one conversion post; stop relying on reshares.

**Files:** `docs/marketing/linkedin/BLOG_TO_LINKEDIN_BATCH_01.md`, `docs/marketing/linkedin/batches/batch-01.yaml`.

**Steps**
1. Inspect `batch-01.yaml` to learn the row schema (post text, scheduled time, image ref, comment link, reshare flag).
2. Edit Post 6 (Monday week 2) body: append before the hashtags: `Paste any address at dealgapiq.com and it shows both numbers free. No signup.` This is the batch's one conversion post.
3. Add **Post 11** for Saturday of week 2 (or replace Post 8 if the founder prefers ten posts): the credential post. Draft:

```
I built Foreclosure.com. Before that, HomePath for Fannie Mae and HomeSteps for Freddie Mac.

Thirty-five years of watching people buy houses off a number the seller chose.

The number that mattered was never on the listing. It was the price where the rent covers everything and there is still something left.

So that is what I built next. One address in. That number out. Free, in 15 seconds.

Google Deal Gap IQ. Know what to offer.

#RealEstateInvesting #DealGap
```
   Comment link: `/what-is-dealgapiq?utm_source=linkedin&utm_medium=founder&utm_campaign=blog_distribution&utm_content=founder-story`.
4. For the three **[reshare]** posts, replace the company-page reshare with a native company post: same image, same comment link with `utm_medium=company_page`, body = the existing one-line reshare copy plus the first two lines of the founder post. Update the YAML rows from reshare to native.
5. Add to the "Rules" section: *Cadence fallback: if a post is not approved by 06:00 ET, the publisher sends the most recent approved draft. If a substantive comment has no reply in 20 hours, the Content Drafter posts a holding reply that names a time.* Then add a corresponding note to `docs/marketing/bots/CONTENT_DRAFTER.md` (inspect first; add the behavior as a numbered rule, do not rewrite the file).
6. Re-run the batch validator (see `docs/marketing/linkedin/README.md` for the command) and fix any schema errors.

**Done when**
- [ ] Post 6 carries the CTA line; Post 11 exists; reshares converted to native
- [ ] Validator passes on `batch-01.yaml`
- [ ] Fallback rules documented in batch doc and CONTENT_DRAFTER.md

---

### A6. [founder] Login-gated items

Print as a TODO. Do not attempt.

- [ ] Pixel ID → `vercel env add NEXT_PUBLIC_META_PIXEL_ID production` → redeploy → verify `PageView` + `Lead` in Test Events
- [ ] Meta Business Settings → verify `dealgapiq.com` by DNS TXT
- [ ] `LINKEDIN_PUBLISH_ENABLED=true` on Railway
- [ ] Rename LinkedIn page to `DealGapIQ (Deal Gap IQ)`; update tagline and About closer
- [ ] Upload `/videos/what-is-dealgapiq.mp4` to YouTube with title *What is Deal Gap IQ? Free 15-second investment property verdict*
- [ ] Create Google Business Profile with `BRAND_SERP_LISTINGS.md` §1 values
- [ ] Defer: Crunchbase, Product Hunt, G2, Capterra (revisit at 10 reviews)

---

## Phase B — Product changes that raise conversion

### B1. "Email me this verdict" capture

**Goal:** Give people who run a free verdict a one-field way to stay reachable, without breaking "no signup."

**Files (inspect first):** the verdict result view under `frontend/src/app/discovery/` or `frontend/src/components/verdict/`; `frontend/src/lib/analytics` (or wherever `trackEvent` lives); a backend endpoint under `backend/app/api/v1/`; the transactional email sender (Resend is connected; find the existing client).

**Steps**
1. Find the component that renders the verdict card and the existing "save" or "sign up" prompt.
2. Add a `VerdictEmailCapture` component below the verdict card: one email input, one button `Email me this verdict`, helper text `One email. No account. Unsubscribe in one click.` No password. No checkbox beyond what consent law requires (inspect the existing consent pattern and reuse it).
3. Backend: `POST /api/v1/leads/verdict-email` with `{ email, property_id or address, ft_* attribution }`. Store in a `verdict_leads` table (email, address, source attribution JSON, created_at, consent flag). Dedupe on email + address.
4. Send one transactional email via Resend: subject `Your verdict for <address>`, body = the three numbers (Income Value, Target Buy, Deal Gap), a link back to the verdict, the guarantee line, and the sign-off. Footer: unsubscribe link, `We analyze. You decide.`
5. Fire `verdict_email_captured` through `trackEvent` so it carries `ft_*`.
6. Add a Resend contact with property `source = verdict_email` and `persona = <ft_landing_path slug>` so D5 can segment.
7. Tests: component renders, validation rejects bad emails, endpoint dedupes, event fires.

**Do not:** gate the verdict behind the email. Show the field after the verdict renders.

**Done when**
- [ ] Field visible on verdict view after render; works logged-out
- [ ] Email arrives with correct numbers and links
- [ ] `verdict_email_captured` appears in PostHog with `ft_utm_campaign`
- [ ] Added to `LISTICLE_LANDING_PAGES.md` §6 targets: *Email capture rate = `verdict_email_captured` ÷ `verdict_viewed`, target 15%*

---

### B2. Meta Conversions API (server-side events)

**Goal:** Meta sees `Lead` and `CompleteRegistration` even when the browser pixel is blocked or consent is declined.

**Files:** backend event hooks for `verdict_viewed` and `signup_completed` (find where these are emitted server-side or add emission points), new `backend/app/services/meta_capi.py`, settings for `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`.

**Steps**
1. Read Meta's Conversions API docs for the `/events` endpoint. Implement a small async client that posts `event_name`, `event_time`, `event_id`, `action_source=website`, `event_source_url`, and `user_data` (hashed email if known, `fbc` from the stored `fbclid`, `fbp` if the frontend forwards it, client IP and user agent).
2. Deduplicate against the browser pixel: the frontend must send the same `event_id` in both the pixel call and the API request that triggers the server event. Inspect `lib/metaPixel.ts` and add an `eventId` (UUID) to the four forwarded events; pass it to the backend on the calls that produce `verdict_viewed` and `signup_completed`.
3. Send `Lead` on `verdict_viewed` and `CompleteRegistration` on `signup_completed`. Add `StartTrial` and `Subscribe` on the Stripe/RevenueCat webhooks that already mark checkout events.
4. Respect consent: if the user declined analytics, still send the event with **no** hashed PII (only `fbc`/IP/UA if counsel allows), or drop it. Make this a config flag `META_CAPI_CONSENT_MODE = strict | minimal` defaulting to `strict`. Print a **[founder]** TODO: confirm with counsel which mode US visitors get.
5. Tests: client posts correct payload; dedupe id matches; consent mode honored; failures are logged, never raise to the user path.
6. Document in `LISTICLE_LANDING_PAGES.md` §6 caveats: replace the Phase 3 note with *CAPI shipped <date>; Meta reported conversions should now track PostHog within ~20%.*

**Done when**
- [ ] Test Events in Meta shows server events with matching `event_id` to browser events
- [ ] Consent mode flag exists and defaults to strict
- [ ] Docs updated

---

### B3. Stamp attribution on the account, not just the device

**Goal:** Signups from Meta's in-app browser keep their source.

**Files:** `frontend/src/lib/attribution.ts`, the signup form/action, backend user model and signup endpoint.

**Steps**
1. On signup, read `dgiq_first_touch_v1` from localStorage and any live `utm_*`/`gclid`/`fbclid` on the current URL. Send both in the signup payload.
2. Backend: add nullable columns (or a JSON column) `first_touch` on the user record. Write once; never overwrite.
3. Expose `ft_*` on server-emitted events for that user (feeds B2 and PostHog).
4. Also persist first touch in a first-party cookie (`SameSite=Lax`, 90 days) alongside localStorage, so Safari's 7-day localStorage cap is not the only store.
5. Test: signup with UTMs in URL but empty localStorage still records source.

**Done when**
- [ ] User record carries first touch after signup from a fresh in-app browser session
- [ ] DR-A "(none)" share for paid mediums falls after launch (check at week 2)

---

### B4. Persona-matched sample verdict card

**Goal:** Each `/for` page shows the strategy card that persona cares about.

**Files:** `frontend/src/lib/seo/persona-pages.ts`, `frontend/src/components/landing/ListicleLandingPage.tsx`, `HeroSampleResult` component.

**Steps**
1. Inspect `HeroSampleResult` to see which sample data it renders and whether it can take a `strategy` prop.
2. Add `sampleStrategy?: 'ltr' | 'str' | 'brrrr' | 'flip' | 'househack' | 'wholesale'` to the persona page config type. Set: house-hackers → househack; wholesalers → wholesale; brrrr-investors → brrrr; dscr-borrowers → ltr; creative-finance-buyers → ltr with the Four Paths panel expanded on the seller-carry path if the component supports it; others → ltr.
3. Render the matching card. Keep the "sample" label.
4. Extend the persona-pages test: every page has a valid `sampleStrategy`.

**Done when**
- [ ] `/for/wholesalers` shows the Wholesale card with MAO and spread; `/for/house-hackers` shows the House Hack card
- [ ] Tests green

---

## Phase C — Campaign kits

### C1. Meta kit: apply A2 and A3 (already done above). Verify.

- [ ] Re-read `LISTICLE_META_LAUNCH_KIT.md` top to bottom. Every value consistent with A2/A3.

### C2. Google kit: apply A4. Verify.

- [ ] `SEARCH_LAUNCH_KIT.md` has no placeholder text.

### C3. Retargeting ad set

**File:** `LISTICLE_META_LAUNCH_KIT.md`, new §2.6.

**Steps**
1. Add ad set `retarget-verdict-no-signup` inside campaign `for-listicles`:

| Field | Value |
|---|---|
| Audience | Custom audience: website visitors who fired `Lead` (verdict_viewed) in last 30 days, **excluding** `CompleteRegistration` in last 30 days. Second audience (union): visited URL contains `/for/` or `/answers/` in last 30 days. |
| Budget | $5/day |
| Optimization | Landing page views for week 1; `CompleteRegistration` once 50/week |
| Frequency cap | 3 per 7 days |
| Placements | Advantage+ |
| Destination | `https://dealgapiq.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=retarget&utm_content=save` (homepage is acceptable here; these visitors already saw the page) |

2. Two ads:

| Ad | Headline | Primary text |
|---|---|---|
| retarget-save | `Save the verdict you ran. Free account.` | `You ran an address. The numbers are still there. A free account keeps 10 saved properties so the next one is a comparison, not a memory.` |
| retarget-offer | `You have the number. Here is what to say.` | `Every verdict comes with four ways to close the gap and the script for each. Free account, no card. Pick the path and read it off the screen.` |

3. Note: audience sizes will be small at launch. Meta needs ~1,000 people to serve reliably; leave the ad set on and let it fill.

**Done when**
- [ ] §2.6 added; §2.4 checklist has `[ ] Retargeting ad set live with exclusion audience`

### C4. Weekly review template

**New file:** `docs/marketing/WEEKLY_PAID_REVIEW.md`. A Markdown table the Metrics Analyst bot fills every Monday.

Columns: channel, campaign/slug, hook, spend, clicks, sessions (DR-B), verdicts (DR-F), verdict rate, signups, signup rate, emails captured, cost per verdict, cost per signup, frequency (Meta), action (keep / kill / scale / rewrite). Below the table: cumulative spend versus the $2,500 cap and the four decision rules from the kits restated in one line each.

Update `docs/marketing/bots/METRICS_ANALYST.md` (inspect first) so the bot reads Meta spend and Google spend from a `docs/marketing/spend.csv` the founder updates weekly (columns: `week_start, channel, campaign, spend_usd`), joins to DR-F by campaign name, and writes the review file. If the bot cannot yet read ad platforms, the CSV is the interim source; say so in the doc.

**Done when**
- [ ] Template file exists; bot doc updated; `spend.csv` created with header row

---

## Phase D — Content and channels

### D1. Post-verdict email series (3 emails)

**Files:** Resend automation (via the Resend connector or dashboard; document steps), copy in `docs/marketing/email/POST_VERDICT_SERIES.md`.

Trigger: contact created with `source = verdict_email` (from B1). Exit: `signup_completed` or `checkout_completed` event for that email.

| # | Send | Subject | Body outline |
|---|---|---|---|
| 1 | Immediately | `Your verdict for <address>` | Sent by B1. |
| 2 | +2 days | `The number listing sites don't show you` | Income Value vs Target Buy in three sentences. The Deal Gap on their address. One line: "The gap is the negotiation." CTA: `See the four ways to close it` → their verdict URL. |
| 3 | +5 days | `When the seller says no to the price` | The blended-plan idea: 2% cut + seller second + verified rent. The script exists on their verdict. CTA: `Read the script` → verdict URL. Footer notes free account saves 10 properties. |

Rules: no advice language; sign-off on every email; unsubscribe on every email; plain text or minimal HTML.

**Done when**
- [ ] Copy file exists; automation created or paste-ready steps documented; exit condition set

### D2. Deal teardown series ("Four Paths Friday")

**Files:** `frontend/content/blog/` (new post template), `docs/marketing/linkedin/batches/batch-03.yaml` (new), `scripts/` (optional generator).

**Steps**
1. Create `docs/marketing/DEAL_TEARDOWN_TEMPLATE.md`: pick a public listing; run the verdict; screenshot the card and the Four Paths; write 400–600 words: the asking price, the three numbers, the gap, which path closes and why, what to say. Anonymize street number unless already public. Label all figures as this listing's numbers, not market stats.
2. Draft `batch-03.yaml`: four Friday posts (Oct 2, 9, 16, 23) using the template, each linking to its blog post with `utm_campaign=four_paths_friday`.
3. Add a 45-second screen-recording spec per teardown for Shorts/Reels (address typed by second 2, Deal Gap by second 6, Four Paths by second 20, sign-off card at the end). Founder records; agent writes the shot list.

**Done when**
- [ ] Template exists; batch-03 has four rows that validate; shot list per row

### D3. BiggerPockets forum runbook

**New file:** `docs/marketing/BIGGERPOCKETS_RUNBOOK.md`.

Contents: profile bio (use the founder short bio + sign-off, no link in body); target forums (Deal Analysis, Creative Financing, Wholesaling, House Hacking); cadence (five substantive replies a week, founder voice, math shown, no links for the first 30 days); what earns a link later (a reply where the verdict numbers are the answer, link to the `/answers` page not the homepage, `utm_source=biggerpockets&utm_medium=forum&utm_campaign=<slug>`); logging (a `bp-log.csv`: date, thread URL, persona, replied, link y/n); what not to do (never post a promo thread; never DM).

Also add a **[founder]** TODO: create the BP profile.

**Done when**
- [ ] Runbook exists; registered in resource guide

### D4. Wholesaler Facebook groups

Add a short section to `BIGGERPOCKETS_RUNBOOK.md` (rename file to `COMMUNITY_RUNBOOK.md`) covering the three largest wholesaling groups. Same rules as BP. Weekly cadence: two replies. **[founder]** joins the groups.

### D5. Founder video shot list

**New file:** `docs/marketing/FOUNDER_VIDEO_SHOTLIST.md`.

Five clips, phone camera, vertical, 20–90 seconds, no script beyond the beats:

1. Founder story (90s): Foreclosure.com → HomePath/HomeSteps → the number every buyer needed → built it → free → sign-off.
2. Wholesaler (30s): "A lead is an address and a phone number. Here is the spread before you call."
3. Creative finance (30s): "The seller said no to 6% off. Three smaller asks, same math."
4. House hacker (30s): "What the other unit pays of your mortgage, before the pre-approval."
5. Out-of-state (30s): "Run the shortlist from the couch. Then book the flight."

Each ends with the guarantee line spoken and the sign-off. Note the Meta ad slot each maps to (`<slug>-video` as Hook D once recorded). **[founder]** records.

### D6. Update the content gap matrix

Add the audit's gap matrix (§4.4) to `POSITIONING.md` as a new §3.1 "Where each persona meets us," and mark which cells D1–D5 fill. Keeps the plan and the positioning in one place.

---

## Phase E — Measurement

### E1. Cost columns in DR-F

PostHog cannot read ad spend. Document in `LISTICLE_META_LAUNCH_KIT.md` §3.3 that cost per verdict and cost per signup are computed in `WEEKLY_PAID_REVIEW.md` (C4) from `spend.csv` joined on campaign name. Add the email capture step (B1) as a fifth funnel step in DR-C and a column in DR-F (`countIf(event = 'verdict_email_captured') AS emails`).

### E2. Business KPI targets

Add to `DIRECT_RESPONSE_PLAYBOOK.md` §10 a second table:

| Metric | Definition | Target |
|---|---|---|
| Email capture rate | `verdict_email_captured` ÷ `verdict_viewed` | 15% |
| Signup → trial | `checkout_started` ÷ `signup_completed` (30-day window) | 15% |
| Trial → paid | `checkout_completed` ÷ `checkout_started` | 40% |
| Signup → paid | product of the two | 6% |
| Cost per paid (paid channels) | spend ÷ `checkout_completed` with `ft_utm_medium IN ('cpc','paid_social')` | under $200 by week 12 |

If `docs/posthog-north-star-funnel.md` already defines these, reconcile and link rather than duplicate.

### E3. Attribution QA script

**New file:** `scripts/attribution_qa.md` (manual) or `frontend/src/__tests__/attribution.e2e.test.ts` if Playwright exists.

Cases: (1) land on `/for/wholesalers?utm_campaign=wholesalers&fbclid=x`, run address, sign up → user record has `ft_utm_campaign=wholesalers`, `fbclid=x`. (2) Same in a fresh session with localStorage cleared between verdict and signup but UTMs in the signup URL → still attributed. (3) Decline consent → no PostHog events, CAPI in strict mode sends nothing with PII, verdict still renders. (4) Accept consent → pixel `Lead` and server `Lead` share `event_id`.

**Done when**
- [ ] All four cases pass and are documented

---

## Master checklist

| Task | Status | Blocker |
|---|---|---|
| A1 Playbook decisions closed | [x] | |
| A2 Meta kit copy fixed, Hook C | [x] | |
| A3 Rebudget + spend cap | [x] | |
| A4 Search launch kit | [x] | |
| A5 LinkedIn Batch 01 amendments | [x] | |
| A6 Founder login items | [ ] | founder |
| B1 Email-me-this-verdict | [x] | |
| B2 Conversions API | [x] | counsel on consent mode |
| B3 Account-level attribution | [x] | |
| B4 Persona sample card | [x] | |
| C3 Retargeting ad set | [x] | |
| C4 Weekly review + spend.csv | [x] | |
| D1 Post-verdict email series | [x] | Resend automation is paste-ready; founder creates it |
| D2 Deal teardown series | [x] | founder records video |
| D3/D4 Community runbook | [x] | founder creates profiles |
| D5 Founder video shot list | [x] | founder records |
| D6 Gap matrix in POSITIONING | [x] | |
| E1 DR-F email column + cost doc | [x] | |
| E2 Business KPI targets | [x] | |
| E3 Attribution QA | [x] | cases documented; run before Publish |

**Launch gate:** A1–A5, B1, B2, B3, C3 complete and A6 done by the founder. Then Publish.

---

## Changelog

| Date | Change |
|---|---|
| 2026-09-07 | v1. Created from the audit. |
| 2026-09-07 | Implemented A1–A5, B1–B4, C3–C4, D1–D6, E1–E3. A6 and recording/login items remain founder. CAPI default `strict`; counsel TODO on US mode. |
