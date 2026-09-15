# Evaluate the DealGapIQ Discovery redesign: typography and the sign-up path

You are picking up a focused evaluation of DealGapIQ's Discovery page. This is an assessment, not a build task. Do not write code, do not open PRs, do not change the flag. Produce an honest opinion and a recommendation. If a later step needs code, that is a separate chat.

Two questions, in this order. Question 1 (typography) is the main one.

## Context you already have

DealGapIQ scores a property in seconds and tells an investor whether the deal is worth pursuing. A workflow redesign ("workflow-v1") is live on dealgapiq.com behind a PostHog flag. The flag targets signed-in users by email, so a signed-out visitor gets the OLD Discovery, and a signed-in user gets the NEW one. Discovery is the only page a signed-out visitor can reach; Plan, Math, and Work sit behind the login. The project memory and the project files hold the full history — read them if you need it, but you do not need to re-derive the whole redesign to answer these two questions.

## What you have to work with

The owner is providing two screenshots in this chat:
1. The original Discovery page, logged out (old design).
2. The redesigned Discovery page, logged in (new design).

You also have the project files, including `BRAND_AND_STYLE_GUIDE.md` and `DealGapIQ_Redesign_Mockups.html` (the intended redesign), and the public repo `humblehuman369/dealscope`, which you can clone read-only to inspect the actual CSS, type tokens, and Tailwind config. The homepage and both Discovery layouts are live and public, so you may also inspect them directly if that helps.

## Question 1 — Typography and readability (the main ask)

The owner's read: the redesign's fonts are hard to read and look like a downgrade, and it feels worst coming from the homepage into Discovery. He wants an honest design opinion, not agreement.

Take the concern seriously — a redesign that reads as a downgrade, or that breaks visual continuity from the homepage, is a real and common failure — but reach your own verdict. You are allowed to tell him he is right, partly right, or wrong, as long as you ground it.

Do not judge from the screenshots' vibe alone. Determine the actual type system from the code, then compare it against what the screenshots render. Inspect at least:

- Font families, weights, sizes, line-heights, and letter-spacing for the old Discovery, the new Discovery, and the homepage. The type tokens live in the frontend's global CSS / Tailwind config and design-token file; grep for `font-family`, the `--font-*` variables, and the Tailwind `fontFamily` keys. Per the project notes the redesign moved to DM Sans app-wide and dropped a Poppins load, and the large dollar figures appear to render in a monospaced face — confirm the real families and settings rather than trusting that summary.
- Contrast. The app is a dark theme. Check the actual text colors against their backgrounds for the verdict sentence, the three numbers, the small labels ("Based on N of 5 sources", the source rows), and the call chip. Note anything that reads low-contrast at its rendered size.
- The monospace choice. If the numbers and some labels are monospaced, judge whether that helps (tabular, precise) or hurts (cramped, low x-height, clashes with a humanist body) at the sizes actually used, on both desktop and mobile.
- Homepage-to-Discovery continuity. This is the owner's sharpest complaint. Compare the homepage's typeface, size, and contrast to the redesigned Discovery's. If the homepage is more expressive or higher-contrast and Discovery drops to a smaller, flatter face, that discontinuity is likely the felt "downgrade." Say so plainly if that is what you find.
- Intended vs shipped. Compare the shipped type against `BRAND_AND_STYLE_GUIDE.md` and `DealGapIQ_Redesign_Mockups.html`. Did the fonts regress from what was designed, or is the design itself the problem?

Note also that the redesign passed an accessibility audit (Lighthouse a11y 100). That measures contrast-ratio thresholds and structure; it does not measure whether type is cramped, mismatched, or unpleasant. An a11y pass is not evidence that the typography is good. Do not treat it as such.

Deliver: a clear verdict (is it a downgrade, and where), the specific type problems ranked by how much they hurt readability or polish, and concrete fixes — actual family, weight, size, line-height, and color changes, not "make it cleaner." If some choices are fine, say which, so the owner does not over-correct.

## Question 2 — The sign-up path on Discovery

The redesign's stated purpose was a workflow that guides the user and makes the next step obvious. The person who needs that most is a signed-out visitor deciding whether to join. Two things undercut that, both found in the current code — verify them against the repo, then judge the product implication.

First, the flag only turns on for signed-in users, so the redesign never runs at the moment someone decides to sign up. The audience it was built to convert never sees it. Discovery is the only signed-out surface, so "guide the user to sign up" is almost entirely a signed-out-Discovery question, and that is exactly the surface the flag excludes.

Second, on the redesigned Discovery, signed out, there is no real sign-up CTA. The only account-related affordance is an email-capture box that reads "Save this verdict. Email me the numbers" with the note "One email. No account." (`components/verdict/VerdictEmailCapture.tsx`, slim variant, rendered in `app/discovery/page.tsx` under the v1 discovery tab when `!isAuthenticated`). The two prominent buttons on the verdict card, "Show the math" and "Build the plan," are identical signed-in or out (`components/discovery/VerdictCard.tsx`; `isAuthenticated` only toggles a one-time tip). "Build the plan" opens the Plan tab, where a signed-out user finally hits a blurred `AuthGate` ("Sign in to…", "Free account — no credit card required" — `components/auth/AuthGate.tsx`, gated by `worksheetUnlocked = isAuthenticated` in `StrategyWorkbench.tsx`). So the sign-up moment is one tab deep, behind a button that gives no hint a wall is coming, phrased as "sign in" rather than "create account."

For contrast, the OLD Discovery sells the account on the page a visitor lands on: "Show Me the Numbers / Try it Free · No signup needed · under 60 seconds," a "Now Prove It" section, and a "Create Free Account" gate after three analyses.

Deliver: confirm or correct those two observations, then judge how much they undercut activation and recommend a path. Cover whether the rollout should reach signed-out traffic at all (and how, given the flag targets by email and cannot match a signed-out person), and whether "Build the plan" should become the conversion moment with an explicit "create a free account to build your plan" prompt instead of a silent blurred wall. Flag the tension in the email-capture's "no account" line at the top of the funnel.

## How to answer

Be honest before agreeable. The owner is the founder; flattery costs him money. If his hypothesis is right, say so and show why. If it is wrong or overstated, say that too. Ground every claim in the actual fonts, colors, and code, or in the screenshots — not in taste asserted as fact. Keep opinions as opinions and evidence as evidence, and keep them separate. End with a short prioritized list of what to change first.
