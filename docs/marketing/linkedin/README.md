# LinkedIn publisher — operator runbook

Humans write and approve every post. The system publishes approved posts at
their scheduled time, attaches media, posts the first comment (the article
link), and records the result. **Nothing in this system generates copy.**

Dry run is the default. Nothing goes live until you flip
`LINKEDIN_PUBLISH_ENABLED=true` on Railway after watching a dry-run tick.

---

## Human-only setup (do these once)

1. Create a LinkedIn Developer app. Add the **Share on LinkedIn** and **Sign In
   with LinkedIn using OpenID Connect** products. Set the redirect URL to
   `http://localhost:8765/callback`.
2. Apply for the **Community Management API** if you want the company page to
   post. Until LinkedIn approves that, only `founder` rows can publish.
   Company rows stay in the queue and are skipped with a warning.
3. From `backend/`:

   ```bash
   python -m scripts.linkedin_oauth --account founder
   python -m scripts.linkedin_oauth --account company   # after step 2
   ```

   Paste the printed env lines into the Railway backend service. Leave
   `LINKEDIN_PUBLISH_ENABLED=false`.
4. Produce the screenshots and carousel PDFs the batch file lists (the batch
   markdown says which blog blocks to capture) into
   `docs/marketing/linkedin/assets/<batch>/`.
5. Import, preview two posts, approve, watch one dry-run tick in the Actions
   log, then set `LINKEDIN_PUBLISH_ENABLED=true`.

---

## Author a batch

1. Copy `batches/batch-01.yaml` (or start from the matching
   `BLOG_TO_LINKEDIN_BATCH_01.md`). Do not let anyone rewrite the post bodies.
2. Schema (times are local to the file’s `timezone`; import stores UTC):

   ```yaml
   batch: batch-02
   timezone: America/New_York
   posts:
     - key: post-01
       account: founder          # or company
       scheduled_at: "2026-09-21 07:45"
       media_type: image         # none | image | document
       media_path: assets/batch-02/post-01.png
       media_alt_text: "…"       # required for image
       document_title: "…"       # required for document
       first_comment: "https://dealgapiq.com/blog/<slug>?utm_source=linkedin&utm_medium=founder&utm_campaign=blog_distribution&utm_content=<slug>"
       body: |
         …
     - key: post-01-reshare
       account: company
       reshare_of_key: post-01
       scheduled_at: "2026-09-21 12:00"
       media_type: none
       first_comment: "https://dealgapiq.com/blog/<slug>?utm_source=linkedin&utm_medium=company_page&utm_campaign=blog_distribution&utm_content=<slug>"
       body: "One added line. No rewrite."
   ```

3. Rules the importer enforces:
   - Body ≤ 3,000 characters
   - Last line has at most 3 hashtags, all from the blueprint taxonomy
     (`#RealEstateInvesting`, `#PropTech`, `#InvestmentProperty`, `#BRRRR`,
     `#FixAndFlip`, `#CreativeFinance`, `#RentalProperty`, `#HouseHacking`,
     `#WholesalingRealEstate`, `#CashFlow`, `#DSCR`, `#HardMoneyLending`,
     `#PrivateLending`, `#RealEstateData`, `#DealGap`, `#DealGapIQ`)
   - `first_comment` includes `utm_source=linkedin`
   - Every `media_path` file exists (import lists every missing file and stops)
   - `reshare_of_key` resolves in the same batch

4. Drop PNG/PDF files into `assets/<batch>/`. No stock photos.

---

## Import

From `backend/`, with `DATABASE_URL` pointed at the target database:

```bash
python -m scripts.import_linkedin_batch ../docs/marketing/linkedin/batches/batch-01.yaml
```

The script prints a table of `inserted` / `updated` / `unchanged` /
`skipped_published`. Re-importing the same file is safe. Published rows are
never overwritten. New and updated rows land as `draft`.

Media bytes are copied into Postgres at import (`media_bytes` on the row).
Railway does not ship the `docs/` folder; the existing S3/R2 storage is not
used for this queue.

---

## Preview and approve

Use an admin session (cookie or `Authorization: Bearer`). Permission:
`admin:system`.

```bash
# List
curl -sS "$BACKEND_URL/api/v1/admin/linkedin/posts?batch=batch-01&status=draft" \
  -H "Authorization: Bearer $ADMIN_JWT"

# Inspect the exact Posts API body before approving
curl -sS "$BACKEND_URL/api/v1/admin/linkedin/posts/$ID/preview" \
  -H "Authorization: Bearer $ADMIN_JWT"

# Approve (required: status=approved AND approved_at set)
curl -sS -X POST "$BACKEND_URL/api/v1/admin/linkedin/posts/$ID/approve" \
  -H "Authorization: Bearer $ADMIN_JWT"

# Cancel
curl -sS -X POST "$BACKEND_URL/api/v1/admin/linkedin/posts/$ID/cancel" \
  -H "Authorization: Bearer $ADMIN_JWT"
```

Approve only after you have read the preview. The body publishes
byte-for-byte.

---

## Watch the workflow

`.github/workflows/cron-jobs.yml` calls `POST /api/v1/jobs/linkedin-publish`
every 30 minutes. It has its own concurrency group (`linkedin-publish`) so it
never overlaps itself.

The JSON response looks like:

```json
{
  "published": ["batch-01/post-01"],
  "skipped_waiting_parent": ["batch-01/post-01-reshare"],
  "failed": [],
  "dry_run": true,
  "token_warnings": []
}
```

- `dry_run: true` means LinkedIn was not called and rows stay `approved`.
- `skipped_waiting_parent` is a company reshare whose founder post is not
  published yet. It will go out on a later tick.
- The step fails only on HTTP errors or a non-empty `failed` list.

Watch one dry-run tick in the Actions log, then set
`LINKEDIN_PUBLISH_ENABLED=true` on Railway.

---

## When a comment fails

The post is already live. The row is `published` with `linkedin_post_urn` set
and `error` starting with `comment failed:`. The workflow step fails so you
notice.

Paste the `first_comment` URL under the live post yourself. Do not re-approve
the row — a row with a URN is never created a second time.

---

## Refresh tokens

Access tokens last ~60 days. Refresh tokens (~365 days) exist only if the
LinkedIn app has programmatic refresh enabled.

- If a refresh token is in Railway, the job renews the access token
  **in memory for that process only**. Re-run `linkedin_oauth.py` and paste
  the new lines into Railway before the next deploy/restart.
- If there is no refresh token, the job warns in the Actions log 14 days
  before `LINKEDIN_TOKEN_EXPIRES_AT_*` and fails with a plain message (not a
  stack trace) when the token is dead.

```bash
cd backend
python -m scripts.linkedin_oauth --account founder
# paste the printed LINKEDIN_FOUNDER_* lines into Railway
```

---

## Cadence (blueprint)

Founder profile: Mon–Fri, 7:30–8:30 a.m. ET. Company reshares of the marked
posts: 12:00 p.m. ET the same day. Two to three posts a week is the page
minimum; this batch is five founder posts a week for the first two weeks.
