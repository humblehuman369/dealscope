# DealGapIQ — UX & Retention Evaluation

**Date:** June 10, 2026
**Lens:** Conversion and retention for time-constrained, skeptical residential investors. ~5 seconds to earn attention; ambiguity kills trust in financial tooling.

---

## 1. First-Impression Summary (5-second test)

The landing page leads with a strong, specific promise — *"Stop scrolling listings. Start spotting real deals. Know what to offer."* — and an anonymous-first funnel (`/` → `/search` → `/discovery`) that delivers a verdict in **~2 clicks with no account**. This is genuinely better activation design than DealCheck or Mashvisor, both of which gate analysis behind signup.

The problem is what happens *after* the first verdict: the conversion and retention machinery is **built but disconnected**. Onboarding exists but nothing routes to it. Lifecycle emails exist but the scheduler migration is ambiguous. Push preferences exist with no device registration. A tour exists only as a spec document. The funnel leaks not from missing features but from unwired ones.

---

## 2. What Is Working Well

- **Anonymous-first Discovery** — first verdict before any signup friction; rare in this category.
- **Coherent paywall architecture** — `AuthGate` → `ProGate` → `UpgradeModal` with Stripe (web) / RevenueCat (Capacitor) branching; trial users get full Pro.
- **Cold-landing design** — `/discovery` without an address shows a guided entry (scan/search/map) instead of an error.
- **Trust surface** — methodology page, national averages, glossary, disclosures, founder section, comparison pages vs competitors.
- **Email infrastructure depth** — 20+ lifecycle templates (welcome, trial-ending, winback, digest, limit-reached, milestone) already written.
- **Deal pipeline** — Kanban + tasks + documents + budgets is a real workflow anchor competitors lack.

---

## 3. What Is Hurting Conversion (prioritized)

### P0 — Trust contradictions (cheap fixes, outsized damage)

| Issue | Evidence | Why it kills conversion |
|-------|----------|------------------------|
| `/help` claims **"free beta" with unlimited everything** while pricing sells 3 analyses/mo + $39.99 Pro | `frontend/src/app/help/page.tsx` | A prospect comparing pages concludes the company doesn't know its own offer — or worse, is bait-and-switching. |
| Register-with-Pro success screen says **"Your Pro trial is active until {date}"** but registration never starts a trial (trial begins at Stripe checkout) | `RegistrationContent.tsx`; `auth_service.register_user` | User believes they have Pro, hits a paywall, feels deceived at the most fragile trust moment. |
| Dashboard "Continue where you left off" banner shows a **hardcoded placeholder** ("123 Main St, Austin, TX") | `dashboard/page.tsx` | A fake personalization element on the daily-return surface signals an unfinished product. |

### P1 — Funnel leaks

| Issue | Evidence | Impact |
|-------|----------|--------|
| **Onboarding is orphaned.** 5-step investor profiling (`/onboarding`) is built, session exposes `needsOnboarding`, backend sends nudge emails — but no post-signup redirect exists anywhere. | `useSession.ts`; no router push to `/onboarding` | Personalization data (strategy, markets, financing) never collected → generic experience → weaker activation and no segmentation for lifecycle email. |
| **Limit-reached has no UI.** Backend enforces 3/mo and emails the user, but Discovery swallows the error (`.catch(() => {})`). The free user's highest-intent moment — hitting the limit — produces no in-app upgrade prompt. | `discovery/page.tsx:344` | The single best conversion trigger in a freemium funnel is silently discarded. |
| **UsageBar hidden on `/discovery` and `/strategy`** — the two pages where free users actually consume their quota. | `UsageBar.tsx` route exclusions | Users discover the limit by surprise instead of by countdown ("2 of 3 analyses left" is a proven upgrade nudge). |
| **No funnel instrumentation.** Vercel Analytics only, gated behind cookie consent `all`; no signup/checkout/verdict event chain, no identity stitching. | `AnalyticsAndConsent.tsx`, `eventTracking.ts` | The team cannot measure activation→trial→paid conversion today. Every roadmap bet is unmeasurable until this is fixed. |

### P2 — Retention gaps

| Mechanic | Status | Gap |
|----------|--------|-----|
| Price-change / deal alerts | Email template exists | No trigger pipeline; pref toggle is decorative |
| Push notifications | Backend Expo service + prefs UI | No `@capacitor/push-notifications` client wiring; toggles are dead controls |
| Weekly activity digest | Scheduled in deprecated APScheduler path | Verify the Arq/cron migration actually fires it in production |
| Guided workbench tour | `docs/tour-spec-v2.md` only | Largest documented onboarding investment with zero code |
| "Resume last deal" | Placeholder | Should be trivial from search history |
| Watchlist / market tracking | Absent | Strongest habitual-return mechanic in the category (PropStream, DealCheck both have alerts) |

---

## 4. Missed Opportunities

1. **The Four Paths engine is invisible until after a verdict.** The most differentiated feature in the product has no marketing surface, no shareable artifact, and no place in the hero narrative.
2. **Shareable Deal Gap card** — investors share deals constantly (partners, lenders, spouses). A public, branded verdict snapshot is zero-CAC acquisition.
3. **Trial-to-paid choreography is passive.** A 7-day trial with full Pro access but no structured "aha sequence" (day 1: first Deal Maker session; day 3: export a report; day 5: trial-ending email exists ✅) underuses the strong email infrastructure.
4. **Onboarding answers are monetization signals.** "Which strategies?" + "Which markets?" should drive default worksheet selection, alert subscriptions, and email content. Today the data goes nowhere.

---

## 5. Actionable Recommendations (ordered by impact ÷ effort)

| # | Recommendation | Effort | Expected effect |
|---|----------------|--------|-----------------|
| 1 | Fix the three trust contradictions (help copy, register trial claim, placeholder banner) | Hours | Removes active conversion damage |
| 2 | Surface limit-reached: handle the 402/limit error on Discovery with an inline upgrade modal; show UsageBar (or compact counter) on discovery/strategy | Days | Converts the highest-intent freemium moment |
| 3 | Wire `/onboarding` into post-signup routing (`needsOnboarding` already exists); pipe answers into defaults + email segmentation | Days | Activation + personalization foundation |
| 4 | Instrument the funnel: signup → verify → first verdict → trial start → paid, with user-ID stitching (PostHog or equivalent; Vercel Analytics is insufficient for funnels) | ~1 week | Makes every subsequent decision measurable |
| 5 | Ship the alert pipeline for saved properties (price change, status change) using the existing email template + saved-property data | 1–2 weeks | First true return-trigger; category table stakes |
| 6 | Implement the workbench tour from the existing spec, or delete the spec | ~1 week | Reduces time-to-first-insight for the Deal Maker, the stickiest Pro surface |
| 7 | Wire Capacitor push (`@capacitor/push-notifications` → existing Expo backend) or hide the dead toggles | ~1 week | Mobile retention channel; removes dead-control distrust |
| 8 | Build the shareable Deal Gap card (public read-only verdict snapshot with signup CTA) | 1–2 weeks | Organic acquisition loop |

---

## 6. The One Highest-Impact Change

**Close the freemium loop: make hitting the 3-analysis limit a designed, in-app conversion moment — visible countdown on Discovery/Strategy, a purposeful limit-reached screen with trial CTA, and server-side enforcement behind it (technical audit C2).**

Everything about this product funnels a free user toward their 4th analysis. Today that moment is: server blocks silently, frontend swallows the error, user sees nothing, an email maybe arrives later. It is simultaneously the largest revenue leak (limits bypassable) and the largest conversion leak (no upgrade moment) — and both halves are fixed by the same week of work.
