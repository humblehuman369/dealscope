# InvestIQ Frontend

Next.js 16 web application for real estate investment analysis across 6 strategies.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev          # → http://localhost:3000

# Run tests
npm run test:run     # Single run
npm run test         # Watch mode
npm run test:coverage # With coverage report

# Lint & format
npm run lint         # ESLint (zero errors enforced)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting (CI)

# Type check
npm run typecheck    # tsc --noEmit
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5, strict mode |
| UI | React 18 + Tailwind CSS 3 |
| State (server) | React Query v5 (TanStack Query) |
| State (client) | Zustand 4 |
| Forms | React Hook Form + Zod validation |
| Maps | `@vis.gl/react-google-maps` |
| Charts | Recharts |
| Icons | Lucide React |
| Error Tracking | Sentry |
| Testing | Vitest + React Testing Library |
| Linting | ESLint 9 (flat config) + Prettier |

## Architecture Overview

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (fonts, providers, Toaster)
│   ├── providers.tsx       # QueryClient + ThemeProvider + AuthModal
│   ├── page.tsx            # Landing page (/)
│   ├── search/             # Property search
│   ├── property/[zpid]/    # Property detail
│   ├── deal-maker/[addr]/  # Financial analysis builder
│   ├── worksheet/[id]/[s]/ # Strategy worksheets
│   ├── saved-properties/   # User's saved properties
│   ├── search-history/     # Past searches
│   ├── admin/              # Admin panel
│   ├── profile/            # User profile & billing
│   ├── strategies/         # Strategy landing pages (Server Components)
│   ├── privacy/            # Privacy policy (Server Component)
│   └── terms/              # Terms of service (Server Component)
│
├── components/
│   ├── auth/               # AuthGuard, AuthModal
│   ├── deal-maker/         # DealMakerScreen, strategy calculators
│   ├── iq-verdict/         # Property verdict/analysis views
│   ├── landing/            # Homepage sections
│   ├── layout/             # CompactHeader, navigation
│   ├── price-checker/      # Price intelligence tools
│   ├── property/           # Property display components
│   ├── scanner/            # Property scanner
│   ├── strategies/         # Strategy page layout
│   ├── ui/                 # Reusable: DataBoundary, ConfirmDialog, etc.
│   └── worksheet/          # 6 strategy worksheet components
│
├── hooks/                  # Custom React hooks
│   ├── useSession.ts       # Auth session (React Query)
│   ├── useSavedProperties.ts # Saved properties CRUD (React Query)
│   ├── useSearchHistory.ts # Search history CRUD (React Query)
│   ├── useDebounce.ts      # Generic debounce
│   └── ...                 # Strategy calculators, device detection, etc.
│
├── stores/                 # Zustand stores
│   ├── index.ts            # Assumptions, property overrides, UI state
│   ├── dealMakerStore.ts   # Deal Maker persistence + computed metrics
│   └── worksheetStore.ts   # Worksheet calculations + backend sync
│
├── lib/                    # Utility libraries
│   ├── api-client.ts       # HTTP client (cookie auth, CSRF, refresh)
│   ├── api.ts              # Typed API endpoint wrappers
│   ├── env.ts              # Environment config
│   ├── validations/        # Zod schemas for forms
│   └── ...                 # Price utils, projections, geo calcs
│
├── types/                  # Shared TypeScript types
│   ├── savedProperty.ts
│   ├── proforma.ts
│   └── analytics.ts
│
└── __tests__/              # Test files (mirrors src/ structure)
```

## Key Architectural Decisions

### Authentication

- **Cookie-only auth** — tokens are in httpOnly cookies, never stored in JS
- **In-memory fallback** — bridges the gap between login and cookie propagation
- **CSRF double-submit** — `X-CSRF-Token` header on all mutating requests
- **AuthGuard component** — centralized auth gate for protected routes
- **Vercel proxy** — `/api/*` rewrites to backend, keeping cookies first-party

### Data Fetching

- **React Query** is the primary data layer for server state
  - Query keys follow a hierarchical factory pattern (`SAVED_PROPERTIES_KEYS`)
  - `keepPreviousData` prevents loading flashes on pagination
  - Optimistic mutations with rollback for deletes
- **Zustand** handles client-only state (assumptions, UI preferences)
- **No data fetching in useEffect** — all API calls go through React Query hooks or Zustand actions

### Rendering Strategy

- **Server Components** for static pages (strategies, legal, pricing)
- **Client Components** for interactive features (`'use client'` directive)
- **Dynamic imports** for heavy components (DealMaker, worksheets) — code split per-strategy
- **Self-hosted fonts** via `next/font/google` (zero external requests)

### Error Handling

- **Route-level** `error.tsx` boundaries for each major section
- **DataBoundary** component for consistent loading / error / empty states
- **Global error boundary** (`global-error.tsx`) as a last resort
- **Sentry integration** for production error tracking

### Security

- **Content Security Policy** — strict CSP with no `unsafe-eval`
- **X-Frame-Options: DENY** — clickjacking protection
- **X-Content-Type-Options: nosniff** — MIME sniffing prevention
- **Referrer-Policy: strict-origin-when-cross-origin**

## Design System

The app uses a **dark fintech theme** with these conventions:

- **Background**: True black (`#000000`) base
- **Surfaces**: `bg-white/[0.04]` with `border-white/[0.07]`
- **Accents**: `sky-400` (primary), `emerald-400` (positive), `red-400` (negative)
- **Text**: `slate-100` (primary), `slate-400` (secondary), `slate-500` (muted)
- **Font**: Inter (body), Source Sans 3 (logo)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Build-time | Backend URL for `next.config.js` rewrites (default: `http://localhost:8000`) |

The frontend uses **relative API paths** (`/api/v1/...`) at runtime. The `NEXT_PUBLIC_API_URL` is only used by the Next.js rewrite config to know where to proxy requests.

## Docker

```bash
# Production build
docker build -t investiq-frontend .

# Run production image
docker run -p 3000:3000 investiq-frontend

# Development via docker-compose (from repo root)
docker-compose up frontend
```

The Dockerfile uses a 3-stage build (deps → build → runner) with a non-root user for production security.

## Testing

Tests use **Vitest** with **React Testing Library** and **jsdom**. Test files live in `src/__tests__/` mirroring the source structure.

```bash
npm run test:run       # CI — single run, exit code
npm run test           # Dev — watch mode
npm run test:coverage  # Coverage report (text + JSON + HTML)
```

Current test coverage targets:
- `hooks/` and `lib/` modules for critical business logic
- `DataBoundary` and `AuthGuard` component behavior
- Auth validation schemas
- API client (CSRF, refresh, error handling)

## Deployment

The app deploys to **Vercel**. Key config:
- `output: 'standalone'` is disabled (Vercel handles this natively)
- API requests proxy through Vercel rewrites to the Railway backend
- Fonts are self-hosted — no external CDN dependencies at runtime
