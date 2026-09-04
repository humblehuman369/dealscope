# Grok Bot operators — shared contract

Two named Grok Bots run daily against the marketing bot API. This file is the
contract they both read at run time. Each bot also has its own runbook:

- [`METRICS_ANALYST.md`](METRICS_ANALYST.md) — 06:30 ET. Reads third-party
  dashboards, posts metric snapshots, writes the daily brief.
- [`CONTENT_DRAFTER.md`](CONTENT_DRAFTER.md) — 07:00 ET. Reads the brief and
  the blog inventory, queues LinkedIn drafts (and, weekly, a blog draft PR).

Both bots run on one shared cloud VM with one set of logins. Treat every
credential on that machine as available to every bot. That is why the bot
token is draft-only.

---

## The one rule

**Bots draft. Humans approve. Crons publish.**

The bot token (`X-Bot-Token`) can read context and create `draft` rows. It
cannot approve, cancel, edit, publish, or spend. Those actions live behind an
admin JWT at `/admin/marketing` and the bot never holds one. If a runbook step
would need any of them, the bot writes a recommendation into the brief instead
and stops.

## What a bot may not do

- Log in to, or hold, a Railway, Postgres, Vercel, LinkedIn OAuth, X OAuth,
  Stripe, or Resend credential. It holds `MARKETING_BOT_TOKEN`, a GitHub
  fine-grained token (Drafter only, branch + PR scope, this repo only), and
  read-only ad-platform logins.
- Change an ad budget, bid, audience, schedule, or creative state (pause /
  enable) on any platform. Read only. Recommend in the brief.
- Post, comment, like, follow, message, or connect on LinkedIn or X from the
  browser. Publishing goes through the queue and the official APIs.
- Approve, edit, or cancel any row in the queue. Approving your own draft
  through the admin UI counts.
- Push to `main`, merge a PR, or edit anything outside
  `frontend/content/blog/` on a branch.
- Fabricate a number. If a dashboard is unreachable, the metric is skipped
  and the brief says so. A missing metric renders as "—" in the scorecard;
  a made-up one renders as a fact.
- Make a claim that is not in the claims register
  (`docs/marketing/MARKETING_OVERVIEW.md`, "Appendix: Claims register").
  Customer counts, "trusted by" figures, testimonials, and guarantees are
  never available.
- Retry a write that returned `409`. A 409 means a human already acted on
  that row. Pick a new key or skip.
- Continue after two consecutive `5xx` responses from the API. Finish the run
  as `failed` with the error text and stop.

---

## Authentication

Every request carries the token header. Wrong or missing token returns `404`
(not 401), so a probe cannot tell the route exists.

```bash
BASE="https://dealscope-production.up.railway.app"   # Railway backend origin (same default as cron-jobs.yml)
H="X-Bot-Token: $MARKETING_BOT_TOKEN"
```

`503` means the token is not configured on the server. Stop and report.

---

## run_id protocol (mandatory)

Every run opens a `bot_runs` row first and closes it last. Every write in
between carries the returned `run_id`. This is the audit trail the operator
reads in **Bots & integrations** on `/admin/marketing`; a write without a
`run_id` is indistinguishable from an unauthorised one.

```bash
# 1. Open
RUN=$(curl -sS -X POST "$BASE/api/v1/marketing/bot/runs" -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"bot_name":"metrics-analyst","routine":"daily"}' | jq -r .id)

# 2. Every write includes it
#    {"run_id": "$RUN", ...}

# 3. Close — exactly once, status succeeded|failed
curl -sS -X PATCH "$BASE/api/v1/marketing/bot/runs/$RUN" -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"status":"succeeded","summary":"7 snapshots, 1 brief"}'
```

- `bot_name` is fixed per bot: `metrics-analyst` or `content-drafter`.
- `routine` is `daily`, or `weekly-blog` for the Drafter's blog run.
- `summary` is one line, ≤ 4,000 chars: counts of what was written, then
  anything skipped and why.
- On any unrecoverable error, close with `status: failed` and put the error
  text in `error`. Never leave a run in `running`; the health panel flags it.
- `PATCH` on an already-closed run returns `409`. Do not open a second run to
  "fix" it.

---

## API contract

Base path: `/api/v1/marketing/bot`. All bodies are JSON. Dates are
`YYYY-MM-DD`. Times inside `scheduled_at` are local to the batch `timezone`.

### `GET /context`

Everything needed to plan a day. Call it first; never scrape the site or the
repo for the same information.

```json
{
  "generated_at": "2026-09-04T10:30:00Z",
  "metrics_28d": [
    {"date": "2026-09-03", "channel": "linkedin", "metric": "signups",
     "value": 2, "source": "posthog", "captured_at": "..."}
  ],
  "queue": {"linkedin": {"draft": 2, "approved": 1, "published": 14},
            "x": {"draft": 1, "approved": 0, "published": 6}},
  "recent_linkedin_keys": ["bot-2026-09-03/dscr-check", "batch-02/post-04"],
  "recent_x_keys": ["bot-2026-09-03/dscr-check"],
  "latest_brief": {"date": "2026-09-03", "status": "reviewed", "body_md": "...",
                   "highlights": {"anomalies": [], "recommendations": []}},
  "blog_inventory": [
    {"title": "...", "url": "https://dealgapiq.com/blog/<slug>", "slug": "<slug>",
     "category": "financing", "published": "2026-08-20"}
  ],
  "open_blog_prs": [
    {"number": 12, "title": "Blog draft: DSCR loan requirements",
     "url": "https://github.com/humblehuman369/dealscope/pull/12",
     "branch": "bot/blog/dscr-loan-requirements", "slug": "dscr-loan-requirements",
     "draft": true, "author": "...", "preview_url": "https://...vercel.app",
     "updated_at": "2026-09-01T12:00:00Z"}
  ],
  "warnings": []
}
```

If `warnings` is non-empty (for example the blog feed or the GitHub PR list
could not be fetched), mention it in the brief and carry on with what is
present. `open_blog_prs` is every open PR on a `bot/blog/*` branch;
`preview_url` is null until Vercel reports the preview build green.

### `POST /runs` → 201, `PATCH /runs/{id}` → 200

See the run_id protocol above.

### `POST /metrics` → 200

Bulk upsert, 1–500 snapshots per call. `source` is forced to `bot_capture`
server-side regardless of what is sent. Re-sending the same
(date, channel, metric) overwrites the value, so re-running a day is safe.

```json
{
  "run_id": "<uuid>",
  "snapshots": [
    {"date": "2026-09-03", "channel": "meta_ads", "metric": "spend", "value": 41.20},
    {"date": "2026-09-03", "channel": "meta_ads", "metric": "impressions", "value": 18240},
    {"date": "2026-09-03", "channel": "meta_ads", "metric": "clicks", "value": 217},
    {"date": "2026-09-03", "channel": "meta_ads", "metric": "leads", "value": 6}
  ]
}
```

Response: `{"inserted": 3, "updated": 1, "source": "bot_capture"}`.

**Channels** (exact strings): `site`, `linkedin`, `x`, `blog_seo`,
`meta_ads`, `google_ads`.

**Metric names** the scorecard knows how to label. Anything else still
stores, but renders as its raw key:

| Metric | Meaning | Who writes it |
|---|---|---|
| `sessions` | pageview sessions attributed to the channel | cron (PostHog) |
| `signups`, `verdicts`, `activations`, `checkouts_started`, `paid_conversions` | funnel events by first-touch UTM | cron (PostHog) |
| `search_clicks`, `search_impressions` (channel `site`) | whole-site Search Console | cron (GSC) |
| `clicks`, `impressions` (channel `blog_seo`) | Search Console for `/blog/*` | cron (GSC) |
| `spend`, `impressions`, `clicks`, `leads` | ad platform daily totals | **Analyst** (`meta_ads`, `google_ads`) |
| `impressions`, `engagements`, `followers` | social analytics | **Analyst** (`linkedin`, `x`) |

Metric keys are lowercase `[a-z][a-z0-9_]*`, ≤ 64 chars. `value` must be a
finite number; `spend` is USD.

**Do not write** `sessions`, `signups`, `verdicts`, `activations`,
`checkouts_started`, `paid_conversions`, `search_*`, or `blog_seo` rows. Those
come from first-party APIs on the `marketing-metrics` cron and a bot-captured
copy would sit beside them with a different `source`, which is exactly the
confusion the source badge exists to prevent.

### `POST /briefs` → 201

One brief per date. Re-posting the same date overwrites it **while it is still
`draft`**. Once a human marks it reviewed the server returns `409`; do not
retry, write tomorrow's instead.

```json
{
  "run_id": "<uuid>",
  "date": "2026-09-04",
  "body_md": "## What moved\n...\n## Why\n...\n## Recommended actions\n1. ...",
  "highlights": {
    "anomalies": ["Meta CPC up 31% ($0.145 to $0.19)"],
    "recommendations": ["Pause creative-finance ad set", "Approve 2 queued posts"]
  }
}
```

`highlights` is a dict of string lists. The UI renders each key as a small
titled list above the markdown; keep to `anomalies` and `recommendations`
unless a runbook says otherwise. `body_md` ≤ 40,000 chars.

### `POST /linkedin-drafts` → 201

Text-only drafts. Same validation as a human YAML import
(`docs/marketing/linkedin/README.md`), so the same failures apply:

- `body` ≤ 3,000 chars.
- Last line: ≤ 3 hashtags, all from the taxonomy in the LinkedIn README.
- `first_comment` must contain `utm_source=linkedin`.
- `account` is `founder` or `company`.
- `key` is `[a-z0-9][a-z0-9-]*`, ≤ 120 chars, unique within the batch.
- `reshare_of_key` must resolve within the same batch.
- `batch` defaults to `bot-YYYY-MM-DD` and must start with `bot-`.
- No media. Media needs repo assets; if a post wants an image, say so in
  the brief for a human to attach after approval.

```json
{
  "run_id": "<uuid>",
  "batch": "bot-2026-09-04",
  "timezone": "America/New_York",
  "posts": [
    {
      "key": "dscr-rent-check",
      "account": "founder",
      "scheduled_at": "2026-09-08 07:45",
      "body": "…\n\n#DSCR #RentalProperty",
      "first_comment": "https://dealgapiq.com/blog/dscr-loan-requirements?utm_source=linkedin&utm_medium=founder&utm_campaign=bot&utm_content=dscr-loan-requirements"
    }
  ]
}
```

- `422` → `{"error": {"code": "VALIDATION_ERROR", "message": "..."}}` where
  `message` lists every failing post and rule. Fix the listed posts and
  resend the whole batch once. If it fails again, drop the offending posts,
  send the rest, and list the dropped keys in the run summary.
- `409` → same envelope; `message` names the `locked_keys`. A human already
  approved or edited a row with that key. Never resend it; choose a new key.

Rows land as `draft` with `created_by: bot:<bot_name>`. The publisher only
ever sees rows a human has approved.

### `POST /x-drafts` → 201

Same shape and same `422`/`409` behaviour as LinkedIn, with a `thread` (list
of 1–5 strings) instead of `body`/`account`/`first_comment`:

- Each post ≤ 280 **weighted** characters: every URL counts as 23 regardless
  of length (X wraps links in t.co). Count it that way before you send.
- Hashtags only on the last line of a post, ≤ 2, from the LinkedIn taxonomy.
- Any `dealgapiq.com` link must include `utm_source=x`.
- Put the link in the **last** post of the thread, not the head. Link-in-head
  posts are shown to fewer people.
- `key` rules and `batch` prefix are identical to LinkedIn. `recent_x_keys`
  in `/context` is the 28-day dedupe list.

```json
{
  "run_id": "<uuid>",
  "batch": "bot-2026-09-04",
  "timezone": "America/New_York",
  "posts": [
    {
      "key": "dscr-rent-check",
      "scheduled_at": "2026-09-08 09:00",
      "thread": [
        "Most DSCR denials are not about the borrower.\n\nThey are about one number the lender computes before reading the application.",
        "The 60-second version of that check, with the formula: https://dealgapiq.com/blog/dscr-loan-requirements?utm_source=x&utm_medium=social&utm_campaign=bot&utm_content=dscr-loan-requirements\n\n#DSCR"
      ]
    }
  ]
}
```

Threads publish head-first, each reply in order, on the `x-publish` cron
once a human approves the row. The admin UI shows the exact request bodies.

---

## Reading the UI you are writing into

Everything a bot writes appears on `/admin/marketing`:

- Snapshots → **Scorecard**, with an amber *bot capture* badge that tells the
  operator the number was read off a dashboard, not pulled from an API.
- Brief → **Briefs**, with a *Mark reviewed* button that locks it. Mondays
  also show a system-written *Weekly rollup* brief you did not author; do not
  try to overwrite it (`POST /briefs` only ever writes the daily kind).
- LinkedIn and X drafts → **Approval queue**, with Edit / Cancel / Approve.
- Runs → **Bots & integrations**, with last-run age and failure text.

When the run finishes, message the operator with the one-line summary and the
link `https://dealgapiq.com/admin/marketing`. Do not paste the brief into the
message; it is already in the UI.

---

## Rollout gates (Phase 2)

1. `LINKEDIN_PUBLISH_ENABLED` stays `false` on Railway for the first week.
   Approved rows are logged but never posted, so a bad approval costs nothing.
2. The operator reconciles bot-captured spend / impressions / clicks against
   the platform UI for each of the first 5 days. Any single metric off by more
   than 5% is a runbook fix, not a data fix; the bot re-runs the day.
3. Zero rows in `bot_runs` with `status: failed` for reasons the runbook should
   have caught, and zero drafts created without a `run_id`, before the flag is
   flipped.
4. After the week, the operator flips `LINKEDIN_PUBLISH_ENABLED=true`. The
   bots do not change.
