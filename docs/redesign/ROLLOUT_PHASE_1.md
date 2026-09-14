# Phase 1 rollout

One page for the `workflow-v1` test. Env flag is already `NEXT_PUBLIC_WORKFLOW_V1=true` in production. The PostHog boolean flag `workflow-v1` decides who sees the new screens.

## Three flag branches

1. **Env off.** `NEXT_PUBLIC_WORKFLOW_V1` is not `true`. Old layout. PostHog is not read. Needs a redeploy to change.
2. **Env on + PostHog `true`.** New Discovery / Plan / Math / Work. Only an exact `true` counts.
3. **Env on + missing, `false`, a string, not loaded, load error, no consent, or ad-blocked.** Old layout.

A signed-out visitor always gets the old layout (the 20% set is signed-in email). A signed-in user who declined cookies never initializes posthog-js, gets the old layout, and is not in the test.

Signed-in users with no email are never identified and are not in the test. Count from the users table: unknown (no one-line production query from this session).

Before the cookie banner choice, PostHog does not initialize. The test covers only signed-in users who accepted cookies, in both groups.

**posthog-js does not load through a reverse proxy.** It talks to `us.i.posthog.com` (see `frontend/src/lib/posthog.ts` and the CSP in `frontend/next.config.js`). Visitors with ad blockers never load flags, get the old layout, and are not in the test.

## Kill switch

- Turn the PostHog flag off, or set every condition set to 0%. Takes effect on the **next page load**. No deploy. Brad loses V1 too if his email set is also at 0%.
- Turning the env flag off needs a **redeploy** and removes Brad’s access as well.

## Steps in order

1. **Brad’s account.** Keep the first condition set: person property `email` is one of Brad’s two addresses, 100% of that set. Walk Discovery → Math → Plan (Option 3, blend, Tune) → Work on production. Run the baseline test.
2. **Baseline.** Confirm `verdict_viewed`, `plan_built`, and `deal_started` in PostHog live events with `layout` and no street address.
3. **20% of signed-in users for two weeks.** Add a **second** condition set, listed **below** Brad’s email set: person property `email` is set, rolled out to 20%.
4. **100%.** When the exit rule holds.

## How to set the 20% in PostHog

On flag `workflow-v1`:

1. Leave Brad’s set as-is at the top (email is one of his two addresses, 100%).
2. Add a second condition set **under** it: person property `email` is set, 20% of that set.
3. Release. Do not replace Brad’s set with the 20% set.

Identify writes email in `$set` once per app mount of a signed-in session. A signed-in user whose person record has no email falls out of “email is set” and stays on the old layout.

## Two ratios (PostHog insights)

Build a funnel:

- Events: `verdict_viewed` → `plan_built` → `deal_started`
- Unique persons
- Last 14 days
- Breakdown: `layout` (`v1` vs `legacy`)

Read:

- `plan_built` per `verdict_viewed`
- `deal_started` per `plan_built`

**Directional, not like-for-like.** Old-layout `deal_started` is a plain DealVault save. V1 `deal_started` is a deliberate commit from the Plan page (Start working this deal). Treat the second ratio as a direction check, not a paired A/B of the same action.

## Weekly check

Session replays on Discovery and Plan, filtered to `layout = v1`. Look for blank pages, half-renders, and Tune / apply crashes. A V1 render error should fall back to the legacy layout for that page load and send `$exception` with `layout=v1` and the route.

## Exit rule

Move to 100% when:

- the `v1` group is not worse on either ratio, and
- no P0 bugs are open.

## Known blink

Rollout users may see the old page for a moment before the flag loads (including after identify). Phase 5 removes it by bootstrapping the flag server-side.
