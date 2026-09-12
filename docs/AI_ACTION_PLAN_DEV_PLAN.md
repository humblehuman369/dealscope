# AI Action Plan — Development Plan

Written September 12, 2026 against the `main` branch of `humblehuman369/dealscope`.

## What we are building

A button on any property that says "Plan my next move." When the user taps it, DealGapIQ takes what it already knows about the property, goes out and finds what is missing, and comes back with a short step-by-step plan for that exact property. The user can then push that plan into the deal's task list with one tap, and every task already has the name and phone number it needs.

The River Hammock test showed why this matters. The property page had the owner names and mailing address but no phone, so the investor was stuck. ChatGPT found the foreclosure filing, the lender, the old "On Hold" listing, the prior agent, and the clerk's phone number. One call to that agent opened the whole deal. The AI did not find anything secret. It found public things that were scattered, and it labeled what it could not confirm. That is the product.

## What the code already has

More is built than you might think. This is what the plan can lean on.

The property search already returns the fields we need to sort a property into a case. In `backend/app/schemas/property.py` the listing payload carries `listing_status`, `is_off_market`, `is_pre_foreclosure`, `is_foreclosure`, `is_bank_owned`, `is_auction`, `is_fsbo`, `days_on_market`, `price_history`, `listing_agent_name`, `listing_agent_phone`, `brokerage_name`, `owner_names`, `owner_mailing_address`, `is_absentee_owner`, and `owner_state`. RentCast fills the owner fields. Zillow fills the listing and agent fields.

Saved properties already have a stage. `PropertyStatus` in `models/saved_property.py` runs prospecting, pursuing, negotiating, under_contract, owned, passed, archived.

Tasks already exist. `models/task.py` is `property_tasks` with title, notes, due date, sort order, and completion. `services/task_service.py` has create, update, delete, reorder, and `seed_for_property`, which loads a template from `services/task_templates.py` based on stage. The frontend shows them in `components/deal/TasksPanel.tsx` on the deal page and `hooks/useTasks.ts` already calls the seed endpoint. This is the "Action Funnel" you described, and it is live.

Contacts already exist. `models/contact.py` is `property_contacts` with name, role, company, phone, email, and notes. Roles include seller, listing_agent, lender, attorney, and other. The plan can write straight into this table.

Claude is already wired in. `services/deal_memo_service.py`, `plan_narrative_service.py`, and `appraisal_narrative_service.py` all call Anthropic through `settings.ANTHROPIC_API_KEY`. The pattern to copy is in `plan_narrative_service.py`: lazy client, template fallback if the AI fails, and a cache key built from a hash of the inputs.

Pro gating already exists. `services/entitlements.py` resolves free, trial, or paid in one place. `services/analysis_metering.py` counts monthly analyses. Copy that pattern for a monthly plan count.

The Cash Buyer pipeline already proved the search-then-extract pattern. `directory_pipeline.py` and the Brave search runner in `~/IQ-Data` show how you ran thousands of searches and had a model pull structured facts out of pages. The research step here is the same idea run for one property.

## The problems the code review found

These are the things that will break or embarrass us if we skip them. Ranked by how much they matter.

**1. There is no background worker running.** The River Hammock research took ChatGPT 76 seconds. The Railway `Procfile` runs only `web: python start.py`. The arq worker in `tasks/arq_worker.py` exists on paper, but its `functions` list is empty and nothing starts it. The cron jobs in `routers/jobs.py` are HTTP endpoints hit from outside. So today the backend has no way to run a 60 to 120 second job and hand the result back later. If we run research inside the request, the browser and Vercel will time out and the user will see a spinner die. This is the first thing to fix. The plan below adds a real worker service on Railway.

**2. The AI calls are tuned for six seconds.** `plan_narrative_service.py` sets `AI_TIMEOUT_SECONDS = 6.0` and `max_retries=0`. That is right for a one-paragraph narrative and wrong for research. The research service needs its own client with a two to three minute timeout and its own retry rule. Do not reuse the narrative client.

**3. There is no web search anywhere in the backend.** Not one service passes `tools=` to Claude or calls Brave. The whole value of this feature is the search. We need to pick a search path and wire it in. Options are in Phase 2.

**4. Owner phone and email are always empty.** `OwnerInfo.tsx` prints "Unavailable" for phone and email, and the RentCast fields `owner_phone` and `owner_email` are never filled. ChatGPT refused to dig up the Morrises' personal phone, and it was right to. We should not have the AI scrape personal phone numbers off the open web. If you want owner phones, buy them from a skip-trace API with a proper permitted-use agreement (the Tracerfy and BatchData options you already priced) and label them as skip-traced. That is a separate, later phase. The first version gets the investor to the owner through the agent, the lender, the attorney, and the mail, which is exactly what worked on River Hammock.

**5. The task and contact tables do not know where a row came from.** `property_tasks` and `property_contacts` have no `source` column and no link to a plan. Once the AI writes ten tasks and three contacts, there is no way to tell them apart from ones the user typed, no way to show a "found by AI, unverified" badge, and no way to re-run the plan without making duplicates. Add `source` and `action_plan_id` columns to both tables.

**6. The seed endpoint appends, it does not merge.** `TaskService.seed_for_property` inserts the template every time it is called. If a user taps seed and then adds an AI plan, they get the stage template plus the AI plan on top. The plan writer needs a merge rule: skip a task if one with the same title is already open on that property.

**7. Nothing today records what is verified and what is not.** The best thing about the ChatGPT answer was the word "Unverified" next to the court status. Our no-fake-data rule means every fact the AI writes must carry a source URL and a verified or unverified flag, and the UI must show it. This has to be in the data shape from day one, not bolted on.

**8. Court sites block bots.** ChatGPT could not open the St. Lucie clerk's live docket or the auction site. We will hit the same wall. The AI cannot be the only path to court status. Phase 3 builds a county clerk table so the plan can always say "call the clerk at this number and ask for case 245000839" even when the site is blocked.

**9. Every re-run costs money.** A search plus a long Claude call will run somewhere around fifteen to fifty cents a plan. Two users looking at the same house should not pay twice. Cache the research result by parcel or by address plus ZIP for 30 days, and let a user refresh on purpose.

**10. The `plan_narrative_service` fallback is a template. This feature must fall back too.** If search is down or the AI times out, the plan still has to say something useful built only from the fields we already have. Every property case in Phase 3 gets a no-AI template first, then the AI makes it better.

## The build, in phases

Each phase ships on its own and is useful on its own.

### Phase 0. Case sorting and template plans. No AI yet. About one week.

Write `backend/app/services/action_plan/cases.py`. It takes the existing property payload and returns one case. The cases are: on-market, on-market stale (30 or more days or two or more price cuts), expired or on-hold, off-market absentee, off-market owner-occupied, pre-foreclosure, foreclosure or auction, bank-owned, and FSBO. Every case gets a short plan template in `action_plan/templates.py` written like the task templates that already exist: three to seven tasks, the user's voice, real due dates only where a deadline is real.

Add the migration. New table `action_plans` with id, saved_property_id, user_id, case, status (queued, researching, ready, failed), research JSON, plan JSON, cost cents, created and updated times. Add `source` (user, template, ai) and `action_plan_id` to `property_tasks` and `property_contacts`.

Add the endpoint `POST /api/v1/properties/saved/{id}/action-plan` that builds the template plan and returns it. Add `POST /action-plan/{id}/apply` that writes tasks and contacts with the merge rule from problem 6.

Add the button. On the discovery page and the deal page, next to the existing Save and task controls, a button labeled with copy you approve. It opens a slide-over that shows the case name, the facts we have, and the task list, with an Apply button.

Ship this. It is already better than what users have, and it costs nothing per use.

### Phase 1. The worker. About one week.

Add a second Railway service in the same project that runs `arq app.tasks.arq_worker.WorkerSettings`. Register a `run_action_plan_research` function. Point `REDIS_URL` at the Railway Redis you already use for cache. Change the create endpoint to enqueue and return the plan in `queued` status. Add `GET /action-plan/{id}` for polling. The frontend polls every three seconds and shows the step it is on: "Checking listing history," "Checking court records," "Writing your plan."

Test this with a fake job that sleeps 90 seconds before we spend a dollar on AI.

### Phase 2. The research step. Two to three weeks.

Write `action_plan/research.py`. It runs inside the worker. It takes the property payload and the case, and returns a fixed JSON shape: a list of findings, each with a field name, a value, a source URL, a verified flag, and a one-line note.

Search path. Use the Anthropic API with the built-in web search tool. It is the fastest path, it is what ChatGPT effectively did, and we already have the key. Set a new client with a 150 second timeout and one retry. Cap searches at ten per plan. Keep Brave as the fallback because you already own that runner and it is cheap.

What it looks for depends on the case. For off-market and pre-foreclosure it looks for the last listing and its agent, the "On Hold" or "Withdrawn" status, the foreclosure complaint, the plaintiff lender, the case number, the auction date, and public contact numbers for the brokerage and the clerk. For on-market stale it looks for price history and days on market across sites and the agent's other listings. For bank-owned it looks for the REO asset manager or listing broker. For every case it tells the model plainly what it may not do: no personal phone numbers, no personal emails, no social media profiles for private people, no guessing. The Anthropic model will follow that rule, and the rule keeps us clear of TCPA and privacy trouble.

Every finding is shown with its badge. Verified means a source page said it. Unverified means the model could not open the page. Never show a fact with no source.

Cache the research JSON by parcel number when we have one, else by normalized address, for 30 days. A "Refresh research" link re-runs it and counts against the user's monthly number.

### Phase 3. Reference tables. Runs alongside Phase 2.

Three small tables the plan can always fall back on, even when a site blocks us. County clerks: county, state, records phone, records email, records request URL. Start with the 67 Florida counties since that is where your users search first, then add the top 200 counties by foreclosure volume. Foreclosing lenders and trustees: name, REO or loss-mitigation phone, notes. Seed it from the plaintiffs that show up in research results, so it grows on its own. Foreclosure attorneys and trustees by state: firm, phone, the lenders they file for. These are public business numbers, not personal data.

The template plan for pre-foreclosure pulls from these tables so even the no-AI version says "Call St. Lucie County records at 772-462-6900 and ask for the case status."

### Phase 4. Plan writing and apply. About one week.

`action_plan/writer.py` takes the case, the known facts, the research findings, and the template, and asks Claude for the final plan as JSON: an opening summary in two or three sentences, the ordered tasks with who to call and what to ask, and the contacts to save. Use the `plan_narrative_service` pattern for the prompt and the JSON parse. If the AI fails, the template plan ships unchanged.

Apply writes tasks with `source=ai`, writes contacts with `source=ai` and the role the model picked, and puts the source URL and the verified flag in the notes field so it shows in TasksPanel without a UI change. Then it moves the property from prospecting to pursuing if the user agrees.

### Phase 5. Metering and money. A few days.

Add `action_plan` to the entitlement checks. Suggested rule to confirm: Starter gets one plan a month, Pro gets thirty. Record cost cents on every plan row so `/admin` can show real spend. Fire a `action_plan_run` event with case and plan tier through the existing analytics fan-out so it lands in GA4 and PostHog alongside `analysis_run`.

### Phase 6. Owner phones. Later, and only after legal review.

If you decide you want owner phone numbers, wire a skip-trace vendor behind its own endpoint, gate it to Pro, store the vendor and date with each number, and show a "Skip-traced on date" label. Keep it separate from the AI research so the AI never touches it.

## Files that change

Backend: new `app/services/action_plan/` package with `cases.py`, `templates.py`, `research.py`, `writer.py`, `apply.py`. New `app/models/action_plan.py`, `app/schemas/action_plan.py`, `app/routers/action_plans.py`. Edits to `app/models/task.py`, `app/models/contact.py`, `app/services/task_service.py` (merge rule), `app/services/entitlements.py`, `app/tasks/arq_worker.py`, `app/core/config.py` (research timeout, search caps, plan limits). One alembic migration for the new table and the two new columns. New Railway worker service and `Procfile` line for it.

Frontend: new `hooks/useActionPlan.ts`, new `components/deal/ActionPlanSlideOver.tsx`, a button in the discovery page and `TasksPanel.tsx`, source badges in the task and contact rows.

Tests: case sorting for all nine cases with real payload fixtures, the merge rule, a research parser test using the River Hammock findings as the fixture, the timeout fallback, and the entitlement gate.

## Order and rough time

Phase 0 first, one week, ships. Phase 1 next, one week. Phases 2 and 3 together, three weeks. Phase 4 one week. Phase 5 a few days. Roughly seven weeks to the full loop with one developer plus Claude Code. Phase 6 is not scheduled.

## Copy that needs your approval before build

The button label. The feature name. The words for the two badges. Suggestions: button "Plan my next move," feature "Deal Path," badges "Verified" and "Unverified." Per your rule, once you sign off, these are locked.
