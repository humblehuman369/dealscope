# DealGapIQ (dealscope)

**Paste a US property address → a multi-source Discovery, four pre-built offer structures to close the gap, and a negotiation script for each path.**  
Same product powers **web** ([dealgapiq.com](https://dealgapiq.com)) and **iOS / Android** via [Capacitor](https://capacitorjs.com/): one React app in `frontend/`, not a separate mobile codebase.

## Tech stack

| Layer | Stack |
|--------|--------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind, React Query, Zustand |
| Backend | FastAPI, Python 3.12, PostgreSQL, Redis |
| Mobile shell | Capacitor (`frontend/ios/`, `frontend/android/`) loading the production web app |
| Ops | Vercel (frontend), Railway (typical API host), Sentry, RevenueCat (IAP) |

## Repository layout

```
backend/          # FastAPI app, calculators, property + analysis services
frontend/         # Next.js app, shared with Capacitor WebView
docs/             # Product, marketing, architecture, operations (see docs/README.md)
content/assets/   # Marketing / content assets (e.g. screenshots)
```

## Quick start (local)

**Prerequisites:** Node 18+, Python 3.12+, optional Docker.

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # add API keys
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` for production builds so Next.js rewrites target your public API (see `frontend/README.md`).

**Docker (all services):** from repo root, copy `backend/.env`, then `docker-compose up -d` (see [`docs/operations/DEPLOYMENT.md`](docs/operations/DEPLOYMENT.md)).

## Documentation

| Need | Start here |
|------|------------|
| Doc index | [`docs/README.md`](docs/README.md) |
| Positioning & voice | [`docs/marketing/POSITIONING.md`](docs/marketing/POSITIONING.md) |
| Four Paths (structures engine) | [`docs/feature-plans/FOUR_PATHS.md`](docs/feature-plans/FOUR_PATHS.md) |
| Deploy & CI/CD | [`docs/operations/DEPLOYMENT.md`](docs/operations/DEPLOYMENT.md) |
| Backend formulas & audits | [`docs/calculations/FORMULA_INVENTORY.md`](docs/calculations/FORMULA_INVENTORY.md) |
| Frontend architecture | [`frontend/README.md`](frontend/README.md) |

## API keys (development)

- **RentCast** — property / AVM / rent estimates ([developers.rentcast.io](https://developers.rentcast.io))
- **AXESSO** (or your Zillow-data provider) — supplemental listing / Zestimate-style fields

Exact variables live in `backend/.env.example`.

## License & disclaimer

MIT — see `LICENSE` if present. DealGapIQ is for informational analysis only; not financial, legal, or investment advice.
