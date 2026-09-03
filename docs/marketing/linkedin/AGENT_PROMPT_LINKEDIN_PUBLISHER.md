# Agent prompt: LinkedIn publishing pipeline for DealGapIQ

Paste everything below the line into a new Cursor agent chat (Grok or any model) with the `dealscope` repo open. The prompt is self-contained; the agent does not need this conversation.

---

You are implementing a LinkedIn publishing pipeline for DealGapIQ inside this monorepo (`backend/` is FastAPI + SQLAlchemy + Alembic + Postgres + Redis on Railway; `frontend/` is Next.js on Vercel). Work autonomously end to end. Do not ask permission for reversible steps. Stop only for the items listed under **Human-only setup**.

## Read these first, in this order

1. `AGENTS.md` (repo conventions; the `make test-backend` note matters)
2. `backend/app/routers/jobs.py` and `.github/workflows/cron-jobs.yml` (the cron-gated job pattern you will extend)
3. `backend/app/core/config.py` (`Settings`; every new env var MUST be declared here or pydantic-settings rejects the `.env`)
4. `backend/app/tasks/heartbeat.py` (`with_heartbeat`, surfaced at `GET /health/jobs`)
5. `docs/marketing/linkedin/BLOG_TO_LINKEDIN_BATCH_01.md` (the content you are shipping, and the posting rules it encodes)
6. `docs/marketing/LINKEDIN_COMPANY_PAGE_BLUEPRINT.md` §6 and §9 (hashtag taxonomy, cadence)
7. `docs/marketing/MARKETING_PLAYBOOK.md` around the UTM conventions (search `utm_source=linkedin`)

## What you are building

A queue-based publisher. Humans write and approve every post; the system publishes approved posts at their scheduled time to the right LinkedIn account, attaches the media, posts the first comment (the article link), and records the result. Nothing in this system generates copy.

### Architectural decisions (already made; do not reopen)

- **Trigger:** a new cron-gated endpoint `POST /api/v1/jobs/linkedin-publish` in `backend/app/routers/jobs.py`, authenticated exactly like the existing jobs (`X-Cron-Token` == `settings.CRON_SECRET`, 503 when unset). Add a job to `.github/workflows/cron-jobs.yml` that fires it **every 30 minutes** (`*/30 * * * *`) with its own `concurrency` group so it never overlaps the daily jobs or itself. Do not use the embedded APScheduler for this.
- **Storage:** a Postgres table via Alembic migration, not a file read at runtime. Railway does not have the docs folder.
- **Idempotency:** the job selects due rows with `SELECT ... FOR UPDATE SKIP LOCKED`, transitions `approved → publishing` in its own transaction before calling LinkedIn, then `publishing → published | failed`. A crash between the LinkedIn call and the status write must not produce a duplicate post on the next run: persist the LinkedIn post URN the moment the API returns it, before doing anything else.
- **Two accounts, one code path:** `founder` (Brad's personal profile, author `urn:li:person:{id}`) and `company` (the DealGapIQ page, author `urn:li:organization:{id}`). The row says which. Tokens are per account.
- **Dry run by default:** `LINKEDIN_PUBLISH_ENABLED=false` makes the job do everything except call LinkedIn's write endpoints, logging what it would have sent. Production stays in dry run until the human flips it.
- **Approval is explicit:** a row publishes only when `status='approved'` and `approved_at IS NOT NULL`. Imported rows land as `draft`.

### Data model (`linkedin_posts`)

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `batch` | text | e.g. `batch-01` |
| `key` | text | e.g. `batch-01/post-03`; unique; import is upsert-by-key so re-importing is safe |
| `account` | enum `founder`,`company` | |
| `scheduled_at` | timestamptz | stored UTC; batch files give ET, convert on import |
| `body` | text | ≤ 3,000 chars (LinkedIn limit); validate on import |
| `media_type` | enum `none`,`image`,`document` | |
| `media_path` | text nullable | repo-relative path to PNG/PDF under `docs/marketing/linkedin/assets/`; uploaded at publish time |
| `media_alt_text` | text nullable | required when `media_type='image'` |
| `document_title` | text nullable | required when `media_type='document'` (carousel title) |
| `first_comment` | text nullable | the UTM'd article link |
| `reshare_of_key` | text nullable | for company reshares: the founder post key; publish as a repost with `body` as the commentary |
| `status` | enum `draft`,`approved`,`publishing`,`published`,`failed`,`cancelled` | |
| `approved_by`, `approved_at` | text, timestamptz | |
| `linkedin_post_urn` | text nullable | from the `x-restli-id` response header |
| `linkedin_comment_urn` | text nullable | |
| `published_at` | timestamptz nullable | |
| `error` | text nullable | last failure, truncated to 2,000 chars |
| `attempts` | int default 0 | give up and mark `failed` after 3; never retry a row that has a `linkedin_post_urn` |
| `created_at`, `updated_at` | | |

Media files live in the repo under `docs/marketing/linkedin/assets/<batch>/`. Since Railway does not ship the docs folder, the import script uploads media bytes into the `media_bytes` column (bytea) at import time, or, if you judge that too heavy, into the existing object storage the backend already uses (check for an S3/R2/Blob client under `backend/app/services/` before adding one). Pick one, state which in the PR, and do not add a new storage provider.

### Batch file format

Create `docs/marketing/linkedin/batches/batch-01.yaml` by converting `BLOG_TO_LINKEDIN_BATCH_01.md` faithfully (no copy edits). Schema:

```yaml
batch: batch-01
timezone: America/New_York
posts:
  - key: post-01
    account: founder
    scheduled_at: "2026-09-08 07:45"
    media_type: image
    media_path: assets/batch-01/post-01-cashflow-table.png
    media_alt_text: "Monthly cash flow table for the $325K example: rent $2,600, NOI $1,614, cash flow $55"
    first_comment: "https://dealgapiq.com/blog/cash-flow-positive-rental-properties?utm_source=linkedin&utm_medium=founder&utm_campaign=blog_distribution&utm_content=cash-flow-positive-rental-properties"
    body: |
      ...
  - key: post-01-reshare
    account: company
    reshare_of_key: post-01
    scheduled_at: "2026-09-08 12:00"
    body: "The first thing Discovery does with any address is solve for this price."
```

Set the batch's dates to start the Monday after the PR merges; the human will adjust. Screenshots referenced by `media_path` do not exist yet; the import must fail loudly listing every missing asset rather than importing rows without media.

### Import and approval

- `backend/scripts/import_linkedin_batch.py <path.yaml>`: validates (body length, required media fields, UTM present in `first_comment`, `reshare_of_key` resolves, hashtags ≤ 3 and all from the blueprint taxonomy), upserts by `key`, prints a table of what changed. Never touches rows already `published`.
- Approval endpoint under the existing admin router (find it; reuse its auth dependency): `POST /api/v1/admin/linkedin/posts/{id}/approve`, `POST .../cancel`, `GET /api/v1/admin/linkedin/posts?batch=&status=`. No frontend UI in this task; the admin will use the API or a one-line curl. Record `approved_by` from the authenticated admin user.
- `GET /api/v1/admin/linkedin/posts/{id}/preview` returns the exact request body the publisher would send, so a human can inspect before approving.

### LinkedIn API integration (`backend/app/services/linkedin_publisher.py`)

Use `httpx.AsyncClient` (already a dependency). Verify every endpoint, header, and version against the current LinkedIn docs before writing code, because the Posts API is versioned and versions sunset after roughly a year. What to expect:

- Headers on every REST call: `Authorization: Bearer <token>`, `X-Restli-Protocol-Version: 2.0.0`, `LinkedIn-Version: <YYYYMM>` (pick the newest active version and make it a `Settings` value `LINKEDIN_API_VERSION`).
- **Create post:** `POST https://api.linkedin.com/rest/posts` with `author`, `commentary`, `visibility: PUBLIC`, `distribution.feedDistribution: MAIN_FEED`, `lifecycleState: PUBLISHED`, and `content.media` for image/document. Post URN comes back in the `x-restli-id` header.
- **Images:** `POST /rest/images?action=initializeUpload` → PUT the bytes to the returned `uploadUrl` → use the returned `urn:li:image:...`. Poll or trust per docs; images are usually available immediately, documents may need a short wait before the post referencing them succeeds.
- **Documents (PDF carousels):** `POST /rest/documents?action=initializeUpload`, same shape, `urn:li:document:...`, plus `content.media.title`.
- **Reposts:** `reshareContext.parent = <parent post urn>`; commentary is the added line. The company reshare rows depend on the founder row being `published` with a URN; if the parent is not yet published, skip the row this run (do not fail it).
- **First comment:** `POST /rest/socialActions/{urlencoded post urn}/comments` with `actor` (same URN as the author) and `message.text`. Do this in the same run, right after the post succeeds. If the comment fails, the post row is still `published`; store the comment error in `error` and surface it in the job response so a human can add the comment manually.
- **Scopes:** founder posting requires `w_member_social` (self-serve "Share on LinkedIn" product) and `openid profile` to fetch the person URN via `GET https://api.linkedin.com/v2/userinfo` (`sub`). Company posting requires `w_organization_social` via the Community Management API, which requires LinkedIn's Marketing Developer Platform approval; the human handles that application. Make the company account optional so the founder flow ships even if approval is pending.
- **Tokens:** access tokens last ~60 days; refresh tokens (~365 days) exist only for apps with programmatic refresh enabled. Store tokens in env vars (`LINKEDIN_FOUNDER_ACCESS_TOKEN`, `LINKEDIN_FOUNDER_REFRESH_TOKEN`, `LINKEDIN_FOUNDER_PERSON_URN`, `LINKEDIN_COMPANY_ACCESS_TOKEN`, `LINKEDIN_COMPANY_REFRESH_TOKEN`, `LINKEDIN_COMPANY_ORG_URN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_TOKEN_EXPIRES_AT_*`). Implement refresh when a refresh token is present; when it is not, have the job return a warning 14 days before expiry so it shows in the GitHub Actions log, and fail with a clear message (not a stack trace) when the token is dead. Do not store tokens in Postgres.
- **OAuth helper:** `backend/scripts/linkedin_oauth.py` runs the 3-legged flow locally (prints the auth URL, catches the redirect on `http://localhost:8765/callback`, exchanges the code, prints the env lines to paste into Railway). Both accounts, chosen by flag.
- Handle 429 by stopping the run and leaving remaining rows `approved` for the next tick. Never loop-retry inside a single run.

### Job behaviour (`POST /api/v1/jobs/linkedin-publish`)

1. Auth check as in the other jobs.
2. Load rows where `status='approved'` and `scheduled_at <= now()` and `attempts < 3`, ordered by `scheduled_at`, `FOR UPDATE SKIP LOCKED`, max 5 per run.
3. For each: transition to `publishing`, commit; upload media if any; create post; persist URN + `published`; post first comment; persist comment URN or comment error.
4. Wrap in `with_heartbeat("linkedin_publish", ...)` so it shows at `/health/jobs`.
5. Respond with `{published: [...keys], skipped_waiting_parent: [...], failed: [{key, error}], dry_run: bool, token_warnings: [...]}`. The workflow step prints this and exits non-zero only on `failed` rows or auth errors.

### Tests (required; `make test-db-up` then `make test-backend`)

- Import: valid batch upserts; missing asset fails with the list; hashtag outside taxonomy fails; re-import does not touch published rows.
- Job: publishes due approved rows only; ignores `draft`; respects `scheduled_at`; company reshare waits for parent URN; dry run makes zero outbound calls (mock `httpx`); a row with a URN but status `publishing` is repaired to `published` without a second create call; 429 stops the run and leaves rows `approved`; comment failure leaves post `published` with error recorded.
- Auth: wrong or missing `X-Cron-Token` → 401/503 identical to the existing jobs.
- Run `ruff` clean.

### Docs to update

- `AGENTS.md`: a short §13 "LinkedIn publisher" (the queue, the dry-run flag, the never-retry-a-row-with-a-URN invariant, where tokens live).
- `docs/marketing/linkedin/README.md`: the operator runbook — author a batch YAML, produce screenshots into `assets/`, import, preview, approve, watch the workflow run, what to do when a comment fails, how to refresh tokens.
- `.github/workflows/cron-jobs.yml` header comment: list the new secrets.

### Human-only setup (write these into the README; do not attempt them)

1. Create the LinkedIn Developer app, add the "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products, set redirect URL `http://localhost:8765/callback`.
2. Apply for the Community Management API for company-page posting; until approved, only `founder` rows can publish.
3. Run `linkedin_oauth.py` for each account; paste the printed env lines into Railway; set `LINKEDIN_PUBLISH_ENABLED=false` first.
4. Produce the screenshots and carousel PDFs the batch references (the batch MD says exactly which blog blocks to capture) into `docs/marketing/linkedin/assets/batch-01/`.
5. Import, preview two posts, approve, watch one dry-run tick in the Actions log, then flip `LINKEDIN_PUBLISH_ENABLED=true`.

### Hard constraints

- No copy generation, rewriting, or "improving" of post text anywhere in the code path. The body publishes byte-for-byte.
- No new third-party scheduler, queue, or SaaS (no Buffer/Hootsuite/Zapier). No new storage provider.
- Declare every new env var in `Settings` with a safe default so local dev and CI boot without them.
- Follow the existing job pattern's error style: structured JSON responses, no stack traces to the caller.
- Keep everything under `backend/`, `.github/workflows/`, and `docs/marketing/linkedin/`. No frontend changes.
- Commit in logical steps on a branch `feat/linkedin-publisher`; open a PR with a test plan. Do not merge.

### Definition of done

- `make test-backend` green including the new tests; `ruff` clean.
- `batch-01.yaml` imports in dry run against a local Postgres and the job endpoint returns a correct dry-run response for two approved rows.
- README runbook lets a non-engineer go from "batch file" to "post live" without reading code.
- PR description lists every LinkedIn endpoint and the `LinkedIn-Version` you verified, with doc links, so the next person knows what to re-verify when a version sunsets.
