---
title: "DealGapIQ — App Launch & Growth Runbook"
subtitle: "Post-build execution: ship, list, activate, and optimize"
date: "June 2026"
---

# DealGapIQ — App Launch & Growth Runbook

**Scope:** What to do *after* the three net-new builds are complete and the launch blockers are resolved. Each step has a concrete action and a verification check so you can run it end-to-end without guesswork.

**The three builds (done):**

1. In-app review prompt — fires at the first verdict (native only).
2. Apple Smart App Banner — iOS Safari web banner, env-driven.
3. "Get the App" button + `/get-app` funnel page.

**The blockers (must be resolved before starting):**

- `NEXT_PUBLIC_APPLE_APP_ID` set in Vercel (activates the smart banner + iOS install link).
- `npx cap sync` run and new iOS/Android builds produced (activates the review plugin).
- Pricing made consistent everywhere — production is **$34.99/mo, $349.99/yr**.

---

## Phase 0 — Pre-Flight Verification (30 min)

Confirm the foundation is solid before anything ships.

- [ ] **Pricing is consistent.** Confirm $34.99 / $349.99 in App Store Connect, Play Console, Stripe, RevenueCat, and marketing copy. *Verify:* no reference to $39.99 remains.
- [ ] **Apple App ID is live in Vercel.** `NEXT_PUBLIC_APPLE_APP_ID` is set in Production env. *Verify:* after deploy, view-source on `dealgapiq.com` shows `<meta name="apple-itunes-app" content="app-id=...">`.
- [ ] **Native builds include the review plugin.** `npx cap sync` ran clean for both platforms. *Verify:* `frontend/ios/App/CapApp-SPM/Package.swift` (this project uses Swift Package Manager, not CocoaPods) and `frontend/android/capacitor.settings.gradle` both reference `in-app-review`.
- [ ] **Quality gates green.** *Verify:* `npm run typecheck`, `npm run lint`, `npm run theme:check`, `npm run build` all pass in `frontend/`.
- [ ] **Analytics events fire.** *Verify:* in PostHog you can see `verdict_viewed`, `get_app_clicked`, and (on a native build) `review_prompt_requested`.

---

## Phase 1 — Ship the Web Funnel (Day 1)

These go live the moment you deploy — no app store review needed.

- [ ] **Deploy `frontend/` to Vercel Production.** *Verify:* `/get-app` loads and shows the install card on desktop.
- [ ] **Test the smart banner on a real iPhone (Safari).** Visit `dealgapiq.com`. *Verify:* the native "Get / Open" banner appears at the top.
- [ ] **Test `/get-app` redirects.** Open on iPhone → App Store; on Android → Play Store; on desktop → both buttons. *Verify:* each platform lands on the correct destination.
- [ ] **Place the CTA where traffic lands.** Embed `<GetTheAppButton source="hero" />` in the homepage hero and footer (decide placement; it links to `/get-app`). *Verify:* button visible on web, hidden inside the app.

---

## Phase 2 — Ship the Native Apps (Days 1–3)

- [ ] **iOS:** `npm run cap:open:ios` → Xcode → **Product ▸ Archive** → upload to App Store Connect. *Verify:* build appears in TestFlight.
- [ ] **Android:** open Android Studio → build a **signed AAB** → upload to Play Console internal testing. *Verify:* build appears on the internal track.
- [ ] **Smoke-test on TestFlight + Play internal.** Run one full address → verdict. *Verify:* verdict renders and the app doesn't crash. (Apple's review sheet may not show in test builds — that's expected; it appears in production, throttled by the OS.)
- [ ] **Confirm IAP still works.** Buy/restore the monthly product in the test build. *Verify:* paywall shows real prices and unlocks Pro.

---

## Phase 3 — App Store Optimization Go-Live (Week 1)

**Source of truth = the asset pack in `frontend/public/app-store/`** (already
production-ready: 8 ordered screenshots, icon, feature graphics, and finalized
copy). All copy below is character-validated. Paste exactly.

### Apple — App Store Connect

- [ ] **App Name / Title (≤30):** `DealGapIQ: Real Estate Deals` (28). Full rationale + alternates: `connect/copy/keywords.md`.
- [ ] **Subtitle (≤30):** `Every US deal, pre-scored.` (26). Source: `connect/copy/subtitle.md`.
- [ ] **Keyword field (≤100):** `foreclosure,preforeclosure,auction,rental,flip,brrrr,wholesale,investor,roi,cashflow,arv,comps` (94). Source: `connect/copy/keywords.md`. *Verify:* no spaces after commas.
- [ ] **Promotional Text (≤170):** see `connect/copy/promotional-text.md` (investor's-lens primary).
- [ ] **App Icon:** `connect/icon-1024x1024-v2-fullbleed.png`.
- [ ] **Screenshots ×8 (6.9", 1290×2796):** upload `connect/screenshots/01–08-*.png` in numbered order. Rationale: `connect/README.md`.

### Google Play — Console

- [ ] **Title (≤30):** `DealGapIQ: Real Estate Deals`.
- [ ] **Short description (≤80):** `Every US listing pre-scored DEAL, MAYBE or PASS. See the Deal Gap in seconds.` (77). Source: `play-store/copy/description.md`.
- [ ] **Full description (≤4000):** paste from `play-store/copy/description.md` (keyword-weighted; pricing $34.99 / $349.99).
- [ ] **Feature graphic (1024×500):** `play-store/feature-graphic-1024x500-v5-discover-deals.png` (remove old promo video or recut — see `play-store/README.md`).

### Both stores

- [ ] **App Preview video (optional, high impact):** produce per `connect/copy/app-preview-video-brief.md`.
- [ ] **Generate the in-app icon size variants** from the 1024 icon and replace in the Xcode `AppIcon.appiconset` (so the home-screen icon matches the listing — see `connect/README.md`).
- [ ] **Submit for review.** *Verify:* status = "Waiting for Review" (Apple) / "In review" (Google).

---

## Phase 4 — Seed Reviews to 20–30 (Weeks 1–4)

Below ~4.0★ or <10 reviews, both paid and organic conversion are capped. Never incentivize — only prompt people who already love it.

- [ ] **Verify the in-app prompt fires** at the first verdict on a production build.
- [ ] **Personally ask the warm base** (founder network, beta users, early Pro subscribers) for an honest review — link straight to the store review page. *Do not* offer rewards.
- [ ] **Velocity target:** 5–8 reviews/week for 4 weeks → 20–30 total. *Verify:* rating ≥ 4.0★ before scaling paid.

---

## Phase 5 — Activate Organic Channels (Week 1, ongoing)

Point the founder's owned reach (LinkedIn, YouTube, podcasts) at the app — the highest-trust, zero-CAC channel.

- [ ] **Standardize the CTA** on every channel: *"Score any property in 60 seconds, free — get it at dealgapiq.com or search 'DealGapIQ' in the App Store."* (Link to `/get-app` on web; the smart banner/redirect handles mobile.)
- [ ] **Add the authority signature** to every bio/first comment: *"Brad Geisen — Founder of Foreclosure.com; built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac."*
- [ ] **Publish on cadence:** 3 LinkedIn / 1 YouTube / 1 podcast-or-repurpose per week, each built around a real (anonymized) Deal Gap example.
- [ ] *Verify:* `get_app_clicked` events show inbound traffic from owned channels (use `?utm_source=` links).

---

## Phase 6 — Launch Paid Acquisition (Week 2+, gated)

**Gate:** do not scale paid until new screenshots are live AND rating ≥ 10 reviews / ≥ 4.0★. Run discovery-budget only until then.

- [ ] **Apple Search Ads** (~$45/day total): Brand defense $5, Core discovery $20, Competitor conquesting $10, Search Match $10. Use a Custom Product Page with the Deal-Gap-led screenshot. *Verify:* CPI tracked per keyword.
- [ ] **Google App Campaign** ($25/day): supply 5 headlines, 5 descriptions, 6 screenshots, 1 portrait video, the icon. Switch bid goal to "first analysis completed" after ~30 installs. *Verify:* assets approved, campaign serving.
- [ ] **Apply guardrails:** pause any keyword > $8 CPI or > $60 cost-per-trial at the 7-day read; reallocate to winners.

---

## Phase 7 — Track & Optimize (Weekly, ongoing)

### KPI dashboard

| Metric | Source | 90-day target |
|---|---|---|
| Product page CVR (view→install) | ASC / Play Console | ≥ 35% (Apple), ≥ 25% (Play) |
| Paid CPI | ASA / Google Ads | ≤ $5 |
| Cost per trial-start | PostHog + ad spend | ≤ $40 |
| Avg rating ★ | ASC / Play | ≥ 4.3 |
| Review count | ASC / Play | 20–30 by day 30 |
| Web→store click CVR | PostHog (`get_app_clicked`) | ≥ 8% of mobile web |
| Install→first analysis | PostHog (`verdict_viewed`) | ≥ 60% |
| Trial→paid conversion | RevenueCat | ≥ 25% |

### Weekly loop (every Monday, 30 min)

1. **Pull:** impressions, taps, CVR, CPI, cost-per-trial by keyword/asset.
2. **Cut:** pause anything over the CPI guardrail or CVR < 2% after 1,000 impressions.
3. **Scale:** +20% budget on keywords with CPI < $5 and trial-start CVR above median.
4. **Test:** one creative change per week (one screenshot *or* one headline — never both).
5. **Promote:** ASA Search-Match and Google broad winners → dedicated exact campaigns.
6. **Read reviews:** mine user language → feed it back into captions and the Play description.

---

## Quick Command Reference (`frontend/`)

| Task | Command |
|---|---|
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Theme audit | `npm run theme:check` |
| Production build | `npm run build` |
| Capacitor sync | `npm run cap:sync` |
| Build static export + sync | `npm run cap:build` |
| Open iOS (Xcode) | `npm run cap:open:ios` |
| Open Android (Studio) | `npm run cap:open:android` |
| iOS live dev | `npm run cap:dev` |
| Android live dev | `npm run cap:dev:android` |

> Android Studio on external SSD: `export CAPACITOR_ANDROID_STUDIO_PATH="/Volumes/Extreme SSD/applications/Android Studio.app"` (add to `~/.zshrc`; the drive must be mounted).

---

## The One Thing That Matters Most

Fix what 100% of store visitors see — a **Deal-Gap-led title, subtitle, and first two screenshots** — and seed **20–30 honest reviews** before you scale paid. Everything else compounds off those two moves.
