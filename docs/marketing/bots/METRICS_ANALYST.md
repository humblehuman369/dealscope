# Metrics Analyst — daily runbook

**Bot name:** `metrics-analyst` · **Routine:** `daily` · **Schedule:** 06:30 ET,
every day (after the `marketing-metrics` cron has run at 06:00 UTC).

Read [`README.md`](README.md) first. It holds the API contract, the run_id
protocol, and the list of things you may not do. This file is only the
sequence for this bot.

Your job: read yesterday's numbers off the dashboards that have no API yet,
store them as `bot_capture` snapshots, and write one brief that a busy founder
can act on from a phone in under two minutes.

---

## Inputs you hold

- `MARKETING_BOT_TOKEN` (env var on the bot VM).
- Browser sessions, read-only, for:
  - Meta Ads Manager — Business Manager user with the **Analyst** role only.
  - Google Ads — user with **Read only** access.
  - X — the DealGapIQ account's analytics page (`x.com/i/account_analytics`).
  - LinkedIn — founder profile analytics and the company page analytics.
- Nothing else. If a session has expired and needs a code from a phone, do not
  guess or request one; skip that platform, record it in the brief under
  `anomalies` as `"<platform> login expired"`, and finish the run.

---

## Sequence

### 0. Open the run

```bash
RUN=$(curl -sS -X POST "$BASE/api/v1/marketing/bot/runs" -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"bot_name":"metrics-analyst","routine":"daily"}' | jq -r .id)
```

### 1. Pull context

`GET /context`. From it you need:

- `metrics_28d` — the first-party funnel (PostHog, GSC) is already here. You
  do not capture those; you interpret them.
- `queue.linkedin` and `queue.x` — draft / approved counts for the brief's
  action list.
- `open_blog_prs` — blog drafts the Drafter opened as GitHub PRs, with the
  Vercel `preview_url` when the build has finished. These are open items for
  the human; merge is the approval.
- `latest_brief` — yesterday's brief. Do not repeat a recommendation that is
  still open unless the number behind it moved again.
- `warnings` — surface verbatim in the brief.

### 2. Capture yesterday from each dashboard

"Yesterday" is the previous calendar day in `America/New_York`. Set every
dashboard's date range to exactly that single day before reading. If a
platform only offers a 7-day view, read the daily breakdown table, not the
total.

| Platform | Channel | Metrics to read | Where |
|---|---|---|---|
| Meta Ads Manager | `meta_ads` | `spend`, `impressions`, `clicks`, `leads` | Campaigns tab, account level, columns: Amount spent, Impressions, Link clicks, Leads (or Results when objective is Leads) |
| Google Ads | `google_ads` | `spend`, `impressions`, `clicks`, `leads` | Overview → Campaigns table, account total row: Cost, Impr., Clicks, Conversions |
| X analytics | `x` | `impressions`, `engagements`, `followers` | Account analytics: Impressions, Engagements for the day; Followers is the current total |
| LinkedIn founder profile | `linkedin` | `impressions`, `engagements` | Analytics → Post impressions (day), Engagements (day) |
| LinkedIn company page | `linkedin` | `followers` | Page analytics → Followers total |

Rules while reading:

- Read the number, do not compute it. If the dashboard shows a rate (CTR,
  CPC) but not the count, skip the metric; the scorecard derives rates.
- `spend` in USD, no currency symbol, two decimals max.
- `followers` is a level, not a delta. Post the total shown today.
- LinkedIn `impressions` and `engagements` are the founder profile's. Company
  page post metrics are not captured until the company page starts posting;
  when it does, sum profile + page into one `linkedin` value and note the
  method in the brief.
- If a platform shows an account-level warning (payment failed, policy
  disapproval, campaign learning-limited), put the text under `anomalies`.
- Zero is a real number. If spend was $0 because the campaign was paused,
  post `0`. If the page would not load, post nothing for that metric.

Post the batch once:

```bash
curl -sS -X POST "$BASE/api/v1/marketing/bot/metrics" -H "$H" \
  -H 'Content-Type: application/json' -d @snapshots.json
```

Expect `{"inserted": n, "updated": m, "source": "bot_capture"}`. Any non-200
response: keep the JSON body for the run `error`, and continue to the brief
so the operator still gets a narrative.

### 3. Write the brief

Compare yesterday against the trailing 7-day average of the same metric from
`metrics_28d` plus what you captured. Call a move an anomaly only if it is
**> 25%** and the base is not trivially small (fewer than 10 units or under
$10 of spend is noise; say "too small to read" instead).

Body is markdown, three sections, in this order, in this length:

```markdown
## What moved
One paragraph, max 3 sentences. The single most important change first.

## Why
- 2 to 4 bullets. Each ties a number to a cause you can see (a post that ran,
  a creative fatiguing, a GSC post that started ranking). If you cannot see a
  cause, say "cause not visible from dashboards".

## Recommended actions
1. Exactly 3 items. Each one is a thing a human does today, in one line,
   with the number that justifies it.
```

Recommendations that involve money (pause / shift / raise a budget) are
phrased as recommendations. You cannot do them and must not imply you did.

`highlights`:

- `anomalies`: the > 25% moves, one string each, with both numbers:
  `"Meta CPC up 31% ($0.145 to $0.19)"`. Include login-expired and platform
  warning strings here too. Empty list is fine and preferred to padding.
- `recommendations`: the same 3 actions from the body, shortened to ≤ 60
  chars each so they fit a phone.
- `open_items`: one string per entry in `open_blog_prs`, with the link the
  human should open — the `preview_url` if present, otherwise the PR `url`:
  `"Blog draft: DSCR loan requirements — https://dealscope-git-bot-blog-dscr.vercel.app"`.
  The UI turns URLs in this list into links. Omit the key when there are no
  open PRs.

Always include a queue line in the actions when `queue.linkedin.draft > 0` or
`queue.x.draft > 0`: `"Approve or cancel N queued LinkedIn / M X drafts"`.

```bash
curl -sS -X POST "$BASE/api/v1/marketing/bot/briefs" -H "$H" \
  -H 'Content-Type: application/json' -d @brief.json
```

`409` means today's brief was already reviewed by a human (you are re-running
late). Do not overwrite; add the new information to tomorrow's brief.

### 4. Close the run

```bash
curl -sS -X PATCH "$BASE/api/v1/marketing/bot/runs/$RUN" -H "$H" \
  -H 'Content-Type: application/json' \
  -d '{"status":"succeeded","summary":"11 snapshots (meta, gads, x, li), 1 brief; skipped: none"}'
```

Use `failed` if the brief could not be written or more than one platform was
skipped. Name the platforms in `summary`; the operator reads this line on the
health panel without opening anything.

### 5. Message the operator

One line, plus the link. Example:

> Brief for Sep 4 is up: Meta CPC +31%, LinkedIn signups flat at 2/day, 2
> drafts waiting. https://dealgapiq.com/admin/marketing

---

## Voice for the brief

- Plain, specific, numeric. `POSITIONING.md` voice: no hype, no hedging
  filler, no "great news".
- Present tense for state, past for change: "Spend is $41. Clicks fell 18%."
- No adjectives about the business ("strong", "healthy"). The number is the
  adjective.
- Never invent context you did not see in a dashboard or in `context`.

---

## Failure handling

| Situation | Do |
|---|---|
| `GET /context` fails twice | Close run `failed`, error = response body. Stop. |
| One dashboard unreachable | Skip its metrics, note in `anomalies`, continue. |
| Two or more dashboards unreachable | Capture what you can, write the brief saying so, close run `failed`. |
| `POST /metrics` 422 | A snapshot has a bad channel/metric/value. Remove it, resend once, list the removed key in `summary`. |
| Any `409` | Stop retrying that write. It is a human's row now. |
| Two consecutive `5xx` | Close run `failed`. Stop. |
| Number looks impossible (10× yesterday) | Post it anyway — it is what the dashboard says — and flag it in `anomalies` as "verify: …". Do not "correct" it. |
