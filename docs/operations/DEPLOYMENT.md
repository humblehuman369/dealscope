# DealGapIQ — Deployment

This document combines the **hosting quick start** (Railway + Vercel and alternatives) with the **CI/CD and operations runbook** (merge, rollback, migrations, incidents). For day-to-day ops after go-live, start at [Standard deployment](#standard-deployment-via-cicd).

---

## Part A — Quick deploy (Railway + Vercel)

### Option 1: Railway (Backend) + Vercel (Frontend)

This is the fastest way to get live. Free tiers available for both.

#### Step 1: Deploy backend to Railway

1. Go to [railway.app](https://railway.app) and sign up with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select this repository.
3. Set the **`backend`** folder as the root directory.
4. In **Variables**, add (see also `backend/.env.example`):

```
APP_NAME=DealGapIQ
APP_VERSION=1.0.0
DEBUG=false

# RentCast API (https://app.rentcast.io/app/api)
RENTCAST_API_KEY=your_key_here
RENTCAST_URL=https://api.rentcast.io/v1

# AXESSO / Zillow data
AXESSO_API_KEY=your_key_here
AXESSO_URL=https://api.axesso.de/zil

# Security
SECRET_KEY=generate-with-openssl-rand-hex-32

# CORS - add your Vercel URL after deploying frontend
CORS_ORIGINS_STR=https://your-app.vercel.app,http://localhost:3000
```

5. After deployment, note the public API URL (e.g. `https://dealgapiq-api-production.up.railway.app`).

#### Step 2: Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. **Settings → Environment variables:** set `NEXT_PUBLIC_API_URL` to your Railway backend URL (used by Next.js rewrites; required for production builds).
4. Deploy. The app is available at your `*.vercel.app` URL (or custom domain).

#### Step 3: API keys (summary)

- **RentCast** — [rentcast.io](https://app.rentcast.io/app/api)
- **AXESSO (Zillow data)** — obtain key per your provider / RapidAPI subscription

---

### Alternative deployments (short)

| Option | Notes |
|--------|--------|
| **Render** | Backend: web service, `uvicorn app.main:app`. Frontend: static/Next per Render docs. |
| **Docker** | From repo root: `docker-compose up -d` (see `docker-compose.yml`). |
| **Fly.io** | `fly launch` in `backend/` and `frontend/` with appropriate secrets. |

Example Docker local run:

```bash
git clone <your-repo>
cd <repo-root>
cp backend/.env.example backend/.env
# Edit backend/.env with API keys
docker-compose up -d --build
# Frontend: http://localhost:3000  Backend: http://localhost:8000  Docs: http://localhost:8000/docs
```

---

### Production checklist (hosting)

**Security**

- [ ] Strong `SECRET_KEY` (`openssl rand -hex 32`)
- [ ] `CORS_ORIGINS` only your domains
- [ ] `DEBUG=false`
- [ ] HTTPS (automatic on Railway/Vercel)

**API keys**

- [ ] RentCast and AXESSO configured and within quota

---

### Smoke tests after deploy

```bash
curl https://your-api-url/health
```

Visit `https://your-app.vercel.app` and run a sample property flow.

API docs: `https://your-api-url/docs`

---

### Troubleshooting (hosting)

- **CORS** — Ensure `CORS_ORIGINS` includes the exact frontend origin (no trailing slash mismatch).
- **Frontend 404 to API** — Verify `NEXT_PUBLIC_API_URL` on Vercel matches the public Railway URL.
- **No property data** — Check API keys and provider limits in Railway logs.

---

### Cost ballpark (illustrative)

| Service | Notes |
|---------|--------|
| Railway / Vercel | Free tiers and paid plans vary; see provider pricing |
| RentCast / data APIs | Per provider plan |

---

## Part B — Standard deployment (via CI/CD)

### Prerequisites

- Access to Railway dashboard
- GitHub repo write access
- PostgreSQL connection string for production
- All required environment variables set (see `backend/.env.example`)

### Standard deployment (via CI/CD)

1. Create a PR from your feature branch to `main`
2. CI runs automatically (lint, test, security scan)
3. All checks must pass before merge
4. Merge the PR
5. Railway auto-deploys from `main`
6. Monitor logs in Railway dashboard for 5 minutes post-deploy

### Manual deployment (emergency)

```bash
railway login
railway up --detach
curl https://YOUR_APP.railway.app/health
curl https://YOUR_APP.railway.app/health/deep
```

### Pre-deployment checklist

- [ ] All tests passing locally (`pytest tests/ -v`)
- [ ] No new linter errors (`ruff check app/`)
- [ ] Database migrations tested locally
- [ ] Environment variables updated if needed
- [ ] Backup taken (see rollback section)

### Post-deployment verification

1. `/health` returns `"status": "healthy"`
2. `/health/deep` for external service connectivity
3. `/metrics` for Prometheus counters (if enabled)
4. Verify a test login works
5. Check Sentry for new errors (wait 5 min)

---

## Rollback procedure

### Quick rollback (Railway)

Use Railway dashboard: **Deployments** → previous successful deployment → **Redeploy**.

### Database rollback

```bash
./scripts/backup.sh
cd backend
alembic downgrade -1
alembic current
```

### Full rollback to specific version

```bash
alembic history
alembic downgrade <revision_id>
git revert HEAD
git push origin main
```

---

## Database migration procedure

### Before migration

```bash
./scripts/backup.sh "$DATABASE_URL"
cd backend
alembic history
alembic show head
```

### Run migration

```bash
cd backend
alembic upgrade head
alembic current
```

### If migration fails

```bash
alembic downgrade -1
psql "$DATABASE_URL" < backups/dealgapiq_YYYYMMDD_HHMMSS.sql
```

---

## Incident response checklist

1. **Acknowledge** — notify team / on-call channel
2. **Assess severity** — P1 service down / P2 degraded / P3 minor
3. **Investigate** — `/health/deep`, Sentry, Railway logs, `/metrics`
4. **Mitigate** — rollback if deploy caused regression
5. **Communicate** — status page / stakeholders
6. **Post-mortem** — within 48 hours for P1/P2

---

## Scaling guidelines

### Horizontal scaling (Railway)

- Railway can scale replicas; ensure Redis for shared state where applicable
- Suggested DB pool: `DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=20`

### When to scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| p99 latency | > 2s sustained | Add replica |
| CPU | > 80% sustained | Add replica |
| DB connections | > 25 active | Increase pool or read replica |
| Memory | > 85% | Increase container memory |
| Error rate | > 1% | Investigate before scaling |

---

## Environment variables reference

### Backend (`.env`)

See `backend/.env.example` for the authoritative list. Typical keys include:

- `APP_NAME`, `APP_VERSION`, `DEBUG`
- `RENTCAST_API_KEY`, `RENTCAST_URL`
- `AXESSO_API_KEY`, `AXESSO_URL`
- `SECRET_KEY`
- `CORS_ORIGINS_STR`
- `DATABASE_URL`, `REDIS_URL` as applicable

### Frontend (Vercel / `.env.local`)

- `NEXT_PUBLIC_API_URL` — public backend URL for Next.js rewrites (required on Vercel)

---

*Part A derived from the former root `DEPLOY.md`. Part B derived from `backend/docs/runbooks/deployment.md`.*
