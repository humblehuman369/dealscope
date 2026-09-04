# Bot rollout — operator setup (Phase 2)

Everything in this file needs a human with account access. None of it is
code. Do the steps in order; each one is a precondition for the next. Budget
about 90 minutes for steps 1–6, then one calendar week for step 7.

Grok Bot facts this plan relies on (xAI docs, Aug 2026): bots are named
agents on one shared cloud computer per account; a **skill** is reusable
instructions, a **routine** is a schedule that runs a skill; routines run
while your laptop is closed; both bots see every login on the shared
computer. Manage routines from desktop (*View conversation details →
Routines*); the phone can pause/resume only.

---

## 1. Server: mint the bot token

On the Railway backend service:

```
MARKETING_BOT_TOKEN=<openssl rand -hex 32>
```

Keep `LINKEDIN_PUBLISH_ENABLED=false` and `X_PUBLISH_ENABLED=false`.
Redeploy. Confirm with an admin session that `/admin/marketing` → *Bots &
integrations* shows **Bot API token configured**.

So the brief and the admin UI can list open blog-draft PRs with their preview
links, add a **read-only** fine-grained GitHub token (this repository only,
*Pull requests: read* and *Commit statuses: read*). It is distinct from the
Drafter's write token in §3 and lives on Railway, never on the bot computer:

```
MARKETING_GITHUB_REPO=humblehuman369/dealscope
MARKETING_GITHUB_TOKEN=github_pat_...
```

For X publishing (Phase 3), create an app in the X Developer Console. X API
posting is pay-per-use (about $0.015 per post, $0.20 per post containing a
URL at the time of writing — confirm at developer.x.com and buy credits in the
console first), set *User authentication* to **Read and write**, generate the
access token for the DealGapIQ account, and add:

```
X_API_KEY=...            # "API Key" (OAuth 1.0a consumer key)
X_API_SECRET=...
X_ACCESS_TOKEN=...       # generated for the DealGapIQ account, Read and write
X_ACCESS_TOKEN_SECRET=...
```

The health panel shows *X publisher in dry run* until `X_PUBLISH_ENABLED` is
flipped; with the four keys missing it says so explicitly. Approved X rows
stay `approved` in dry run and the publish log records what would be sent.

Optional but recommended now, so the scorecard has first-party numbers to
compare against:

```
POSTHOG_PERSONAL_API_KEY=phx_...        # PostHog → Settings → Personal API keys, scope: query:read
POSTHOG_PROJECT_ID=12345
GSC_SERVICE_ACCOUNT_JSON=<one-line JSON of a GCP service account key>
GSC_SITE_URL=sc-domain:dealgapiq.com    # add the service account email as a Search Console user first
```

Trigger the pull once from GitHub → Actions → *Cron Jobs* → *Run workflow*
(`marketing-metrics`), and check the health panel shows `posthog` and `gsc`
under *Metric sources*.

## 2. Ad platforms: read-only users for the bot computer

Create a dedicated mailbox for the bots (e.g. `bots@dealgapiq.com`). Every
third-party login the bots use is this identity, never yours.

| Platform | Role to grant | Where |
|---|---|---|
| Meta Business Manager | **Analyst** on the ad account (no page or asset admin) | Business settings → Users → People → Add, then assign the ad account with *Analyst* |
| Google Ads | **Read only** | Tools → Access and security → Users → `+`, access level *Read only* |
| X | Sign in to the DealGapIQ account itself — X has no read-only sub-user. Mitigation: the bot never posts from the browser (runbook rule); all posting goes through the `x-publish` cron behind `X_PUBLISH_ENABLED`, so watch the account's posts during the dry-run week | x.com |
| LinkedIn founder profile | Same problem: LinkedIn has no analytics-only delegate for a personal profile. The Analyst signs in as you **only if** you accept that; the alternative is to skip founder impressions/engagements until the Community Management API is approved (Phase 4) | linkedin.com |
| LinkedIn company page | **Analyst** page role | Page → Settings → Manage admins → Add admin → *Analyst* |

2FA: choose an authenticator whose codes the bot computer can read (a
TOTP secret stored in the bot's password manager), or a session that does not
expire during the dry run. SMS codes to your phone will break every run.

## 3. GitHub: fine-grained token for the Drafter

GitHub → Settings → Developer settings → Fine-grained tokens:

- Resource owner: this repo's owner. Repository access: **only** this repo.
- Permissions: *Contents: Read and write*, *Pull requests: Read and write*.
  Nothing else (no Actions, no Workflows, no Administration).
- Expiry: 90 days. Put the date in a calendar; Phase 4 adds an alert.

Then in the repo: Settings → Branches → protect `main` (require PR, require
`content-check` status, no force push) if it is not already. This is what
makes "merge = approve" true.

## 4. Create the two bots

In Grok Bot, create:

| Name | Description to give it |
|---|---|
| **Metrics Analyst** | "Reads ad and social dashboards read-only, posts metric snapshots and a daily brief to the DealGapIQ marketing bot API. Never changes anything on a platform." |
| **Content Drafter** | "Drafts LinkedIn posts and weekly blog PRs for DealGapIQ from the daily brief. Draft-only; never approves, publishes, or merges." |

On the shared bot computer:

1. Clone this repo read-only (`git clone --depth 1`), or just sync
   `docs/marketing/` — the runbooks and voice docs are read at run time.
2. Set env vars in the bot computer's secret store, not in files in the repo:
   `MARKETING_BOT_TOKEN`, `BASE=https://dealscope-production.up.railway.app`,
   and for the Drafter only `GH_TOKEN` (the fine-grained token). Configure
   `gh auth login --with-token` once.
3. Sign in to each platform from step 2 in the bot computer's browser and
   confirm the sessions persist across a restart.

## 5. Teach and save the skills

Use **Teach a task** in a one-to-one conversation with each bot. Demonstrate
once, correct in plain language, save as a skill. Keep secrets off-screen
while recording.

**Metrics Analyst → skill "Daily marketing capture"**

Paste `METRICS_ANALYST.md` and `README.md` as the instructions. Demonstrate
the browser part once: open Meta Ads Manager, set the date to yesterday,
read the four columns; repeat for Google Ads and X analytics. Let the bot
write the `curl` calls itself from the runbook; check the first run's
`snapshots.json` by hand.

**Content Drafter → skill "Daily LinkedIn drafts"** and **skill "Weekly blog
PR"**

Paste `CONTENT_DRAFTER.md` and `README.md`. No browser demonstration is
needed; both skills are terminal + API. For the blog skill, demonstrate the
`gh pr create --draft` step once so the branch prefix and PR body template
are learned.

## 6. Create the routines

Ask each bot, in its own conversation, in these words (the six facts xAI's
docs require are all present):

> **Metrics Analyst:** Every day at 6:30 AM America/New_York, run the *Daily
> marketing capture* skill. Input: yesterday's numbers from Meta Ads Manager,
> Google Ads, X analytics, and LinkedIn analytics in the browser, plus
> `GET /api/v1/marketing/bot/context`. Expected result: snapshots posted, one
> brief posted, run closed, and a one-line message here with the link to
> https://dealgapiq.com/admin/marketing. Approval boundary: never change
> anything on any platform; never approve, edit, or cancel queue rows. If a
> dashboard is unavailable, skip it and say so in the brief; do not reuse
> yesterday's numbers.

> **Content Drafter:** Every weekday at 7:00 AM America/New_York, run the
> *Daily LinkedIn drafts* skill. Every Monday at 7:30 AM America/New_York,
> run the *Weekly blog PR* skill. Input: `GET /api/v1/marketing/bot/context`
> and the docs under docs/marketing/. Expected result: drafts posted as
> `draft` (or a draft PR), run closed, one-line message here with the admin
> link. Approval boundary: draft only; never approve, publish, merge, or push
> to main. If the queue already holds four or more drafts, or context is
> unavailable, do nothing and report it.

Run **Test run** on each routine while watching. A test run is a real run:
it will post real snapshots and real drafts to the live API. That is fine —
they land as `draft` and `bot_capture` — but do it against production with
`LINKEDIN_PUBLISH_ENABLED=false`, not with the flag on.

## 7. One-week dry run and reconciliation

Leave `LINKEDIN_PUBLISH_ENABLED=false` for 7 days. Each morning, in
`/admin/marketing`:

1. **Bots & integrations**: both bots show a run in the last 24 h with
   `succeeded`. Any `failed` → read the error, fix the runbook (not the
   data), and re-run the routine from desktop.
2. **Scorecard**, 7 d view: for `meta_ads` and `google_ads`, write the
   bot's `spend`, `impressions`, `clicks` next to the platform's own numbers
   for the same day. Use the table below. Anything off by > 5% is a runbook
   defect (wrong date range, wrong column, account vs campaign level); fix
   the instruction and have the bot re-run that day — the upsert overwrites.
3. **Daily brief**: read it, then *Mark reviewed*. Judge it on one question:
   would you have done one of the three actions? If not two days running,
   the brief's rules in `METRICS_ANALYST.md` need tightening.
4. **Approval queue**: read every bot draft against the voice rules. Approve
   the good ones (they will not publish; the flag is off), cancel the rest,
   and write down *why* each was cancelled. After the week, fold the
   recurring reasons into `CONTENT_DRAFTER.md`.

Reconciliation sheet (copy into a note, one row per day):

| Date | Platform | Metric | Bot value | Platform value | Δ % | Action |
|---|---|---|---|---|---|---|
| | | | | | | |

**Exit criteria** (all must hold before flipping the flag):

- 5 consecutive daily briefs, each reviewed.
- 0 rows in `bot_runs` whose failure the runbook should have prevented.
- 0 drafts in the queue with `created_by` starting `bot:` and no matching
  run (check the *Recent runs* list; every draft's batch date has a run).
- Reconciliation Δ within 5% on every captured metric for the last 3 days.
- No unexpected activity on the X or LinkedIn accounts during the week.

Then set `LINKEDIN_PUBLISH_ENABLED=true` on Railway, and `X_PUBLISH_ENABLED=true`
once the X keys are in place. The bots do not change; approved rows simply
start going out on the 30-minute publisher ticks.

## 8. Hardening (Phase 4): alerts and the weekly rollup

Two more cron jobs run without any bot involvement. Both are already in
`.github/workflows/cron-jobs.yml` and need only `CRON_SECRET`:

- **`marketing-alerts`** (daily 12:00 UTC) emails the addresses in
  `ADMIN_NOTIFICATION_EMAILS` when a bot missed its daily run, left a run
  open for 3h+, or failed; when a LinkedIn token is within 14 days of expiry;
  when `X_PUBLISH_ENABLED` is on without keys; or when a marketing cron is
  overdue. **No email on healthy days.** A bot that has never checked in is
  not alerted (it is a setup task, visible on the health panel). Set the
  variable on Railway:

  ```
  ADMIN_NOTIFICATION_EMAILS=you@dealgapiq.com,ops@dealgapiq.com
  ```

  Resend must already be configured (`RESEND_API_KEY`); it is the same
  sender the signup notifications use.

- **`marketing-weekly-rollup`** (Mondays 12:15 UTC) writes a `weekly` brief
  for that Monday next to the Analyst's daily one: every scorecard cell 7d vs
  prior 7d, published counts per channel, open blog PRs, and bot run totals.
  It appears in the *Briefs* panel with a *Weekly rollup* pill and has its own
  *Mark reviewed*.

The GitHub token expiry from §3 is **not** covered by the alert (GitHub does
not expose it to the token holder). Keep the calendar reminder.

## 9. Official ad APIs (Phase 4, replaces dashboard capture)

Apply now; both reviews take weeks. Until they land, the Analyst keeps
capturing `meta_ads` and `google_ads` from the dashboards as `bot_capture`.
Follow [`OFFICIAL_APIS.md`](OFFICIAL_APIS.md).
