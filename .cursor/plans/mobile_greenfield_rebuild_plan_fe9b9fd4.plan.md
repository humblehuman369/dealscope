---
name: Mobile Greenfield Rebuild Plan
overview: A comprehensive development plan to rebuild the DealGapIQ mobile app from scratch, using the frontend web module as the architectural and functional reference. The plan covers frontend audit, mobile architecture, phased roadmap, and dependencies—with full visual and functional parity as the goal.
todos: []
isProject: false
---

# DealGapIQ Mobile Greenfield Rebuild — Comprehensive Development Plan

## Part 1: Frontend Module Audit

### 1.1 Screens, Components, and Routes

**Entry Points**

- Root layout: [frontend/src/app/layout.tsx](frontend/src/app/layout.tsx) — providers, fonts, global styles
- Providers: [frontend/src/app/providers.tsx](frontend/src/app/providers.tsx) — React Query, theme
- Layout wrapper: [frontend/src/components/LayoutWrapper.tsx](frontend/src/components/LayoutWrapper.tsx) — AppHeader + UsageBar

**Public Routes (No Auth)**


| Route                                   | Purpose                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `/`                                     | Homepage — Landing + camera scanner (DealGapIQHomepage, MobileScannerView) |
| `/login`                                | Login                                                                      |
| `/register`                             | Registration                                                               |
| `/forgot-password`                      | Password reset request                                                     |
| `/reset-password`                       | Password reset form                                                        |
| `/verify-email`                         | Email verification                                                         |
| `/pricing`                              | Pricing page                                                               |
| `/about`, `/help`, `/terms`, `/privacy` | Legal, support, product explainer                                          |


**Analysis Flow (Auth Optional)**


| Route                   | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `/analyzing`            | Loading state during property analysis (IQAnalyzingScreen, progressive profiling) |
| `/verdict`              | IQ Verdict — Deal score, strategy recommendations                                 |
| `/strategy`             | StrategyIQ — Financial breakdown, deep dive                                       |
| `/property/[zpid]`      | Property details                                                                  |
| `/price-intel`          | Price intelligence/comps                                                          |
| `/compare`              | Property comparison                                                               |
| `/deal-maker/[address]` | Deal Maker — Adjust assumptions                                                   |
| `/deal-gap`             | Standalone Deal Gap visualization                                                 |


**Protected Routes (Auth Required)**


| Route                        | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `/profile`                   | User profile (Account, Business, Investor, Preferences tabs) |
| `/billing`                   | Subscription management                                      |
| `/search-history`            | Property search history                                      |
| `/saved-properties`          | DealVaultIQ (saved properties)                               |
| `/onboarding`                | 5-step onboarding                                            |
| `/worksheet/[id]`            | Worksheet view                                               |
| `/worksheet/[id]/[strategy]` | Strategy-specific worksheet                                  |
| `/admin`                     | Admin dashboard (requireAdmin)                               |


**Strategy Pages**

- `/strategies/long-term-rental`, `/strategies/short-term-rental`, `/strategies/brrrr`, `/strategies/fix-flip`, `/strategies/house-hack`, `/strategies/wholesale`

**Other**

- `/national-averages`, `/rehab`, `/photos`, `/checkout/success`, `/checkout/cancel`

### 1.2 Complete User Flow

```mermaid
flowchart LR
    subgraph Landing
        Home[Home]
        Landing[Landing Page]
        Camera[Camera Scanner]
    end

    subgraph Auth
        Login[Login]
        Register[Register]
        Forgot[Forgot Password]
        Verify[Verify Email]
    end

    subgraph Analysis
        Search[Search / Address Input]
        Analyzing[Analyzing]
        Verdict[Verdict]
        Strategy[Strategy]
        DealMaker[Deal Maker]
    end

    subgraph Account
        Profile[Profile]
        Billing[Billing]
        History[Search History]
        Saved[Saved Properties]
    end

    Home --> Landing
    Home --> Camera
    Landing --> Search
    Camera --> Search
    Search --> Analyzing
    Analyzing --> Verdict
    Verdict --> Strategy
    Verdict --> DealMaker
    DealMaker --> Verdict

    Verdict --> Profile
    Verdict --> Billing
    Register --> Login
    Login --> Profile
    Profile --> Billing
```



**Primary flows**

1. **Property analysis**: Home → Search (address or camera) → Analyzing → Verdict → Strategy
2. **Auth**: Login/Register → Profile (optional onboarding)
3. **Deal Maker**: Verdict/Strategy → Deal Maker → back with updated params
4. **Subscription**: Billing → Stripe checkout → success/cancel

### 1.3 API Endpoints Consumed

**Auth** (`/api/v1/auth/`*)  

- `POST /login`, `POST /login/mfa`, `POST /register`, `POST /logout`, `POST /refresh`  
- `POST /forgot-password`, `POST /reset-password`, `POST /verify-email`  
- `GET /me`, `GET /sessions`, `DELETE /sessions/{id}`  
- `POST /mfa/setup`, `POST /mfa/verify`, `DELETE /mfa`  
- `GET /google` (OAuth)

**Properties** (`/api/v1/properties/`*)  

- `POST /search`, `GET /{id}`, `GET /demo/sample`  
- `GET /saved`, `POST /saved`, `DELETE /saved/{id}`, `GET /saved/check`  
- `GET /saved/{id}/deal-maker`, `PUT /saved/{id}/deal-maker`

**Analysis** (`/api/v1/analytics/`*, `/api/v1/analysis/`*)  

- `POST /analytics/calculate`, `GET /analytics/{id}/quick`  
- `POST /analysis/verdict`

**Worksheets** (`/api/v1/worksheet/`*)  

- `POST /ltr/calculate`, `/str/calculate`, `/brrrr/calculate`, `/flip/calculate`, `/househack/calculate`, `/wholesale/calculate`  
- `POST /deal-score`

**Assumptions** (`/api/v1/assumptions/`*, `/api/v1/defaults/`*)  

- `GET /assumptions/defaults`, `GET /defaults`, `GET /defaults/resolved`, `GET /defaults/market/{zip}`  
- `GET/PUT/DELETE /users/me/assumptions`

**Billing** (`/api/v1/billing/`*)  

- `POST /setup-intent`, `POST /checkout`, `POST /subscribe`, `POST /portal`  
- `GET /subscription`, `GET /usage`, `GET /plans`

**User** (`/api/v1/users/me/`*)  

- `GET/PUT/DELETE /me`, `GET/PATCH /profile`  
- `GET /onboarding`, `POST /onboarding/complete`

**Search History** (`/api/v1/search-history/`*)  

- `GET /`, `GET /stats`, `DELETE /{id}`, `DELETE /`

**Reports** (`/api/v1/reports/`*)  

- `GET /saved/{id}/excel`, `GET /property/{id}/{format}`  
- `POST /excel`, `POST /csv`

**Proforma** (`/api/v1/proforma/`*)  

- `GET /property/{id}`, `GET /property/{id}/excel`, `GET /property/{id}/pdf`

**Other**  

- `/comparison/{id}`, `POST /sensitivity/analyze`  
- `GET /photos`, `GET /market-data`, `GET /similar-sold`, `GET /similar-rent`  
- `POST /loi/generate`, `GET /loi/templates`, `GET/POST /loi/preferences`  
- `GET /documents`, `POST /documents`, `GET /documents/{id}/download`  
- Admin: `GET /admin/users`, `PATCH /admin/users/{id}`, `GET /admin/stats`, etc.

### 1.4 State Management


| Pattern      | Library               | Purpose                                         |
| ------------ | --------------------- | ----------------------------------------------- |
| Server state | React Query           | API data, caching, mutations                    |
| Client state | Zustand               | Assumptions, property UI, Deal Maker, worksheet |
| Form state   | React Hook Form + Zod | Auth forms                                      |
| Form state   | useState              | Profile, onboarding, Deal Maker local           |
| Theme        | React Context         | Theme (light only)                              |


**Stores** (from [frontend/src/stores/](frontend/src/stores/))  

- `useAssumptionsStore` — financing, operating, strategy assumptions (persisted)  
- `usePropertyStore` — current property, recent searches (persisted)  
- `useUIStore` — activeStrategy, showAssumptionsPanel | showDataProvenance  
- `useDealMakerStore` — deal-maker state, debounced auto-save  
- `useWorksheetStore` — worksheet state, debounced backend calc

**Caching**  

- Property search: 5 min TTL, shared Verdict/Strategy  
- Session: 5 min stale, 3.5 min refetch  
- Saved properties: 30s  
- Defaults: 5 min in-memory + localStorage fallback

### 1.5 Design System

**Colors** (from [frontend/src/app/globals.css](frontend/src/app/globals.css), [frontend/tailwind.config.js](frontend/tailwind.config.js))  

- Base: `#000000` (pure black)  
- Card: `#0C1220`  
- Panel: `#101828`  
- Text: `#F1F5F9` (heading), `#CBD5E1` (body), `#94A3B8` (secondary), `#7C8CA0` (label)  
- Accent: `#0EA5E9` (teal/sky)  
- Semantic: `#34d399` (green), `#f87171` (red), `#fbbf24` (gold)

**Typography**  

- Font: Inter (sans), Source Sans 3 (logo)  
- Display: 4.5rem / 3.75rem / 3rem / 2.25rem (700)  
- Body: 16px, 400  
- Financial: 14px, 600, tabular-nums

**Spacing**  

- 8px base: xs:4, sm:8, md:16, lg:24, xl:32, 2xl:48

**Card Glow**  

- Teal: `rgba(14,165,233,0.25)` border, `0 0 30px rgba(14,165,233,0.08)` shadow  
- Hover: `rgba(14,165,233,0.55)` border, stronger glow

**Components**  

- `.btn-primary`, `.btn-secondary`, `.card`, `.card-hover`, `.input`, `.badge-`*

### 1.6 Proprietary Metrics


| Metric            | Definition                         | Formula                                                                                             |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Income Value**  | Max price where cash flow = $0     | NOI / (LTV × Mortgage Constant)                                                                     |
| **Target Buy**    | Recommended purchase price         | Income Value × 0.95 (5% discount)                                                                   |
| **Deal Gap**      | Discount % from list to Target Buy | (List Price - Target Buy) / List Price × 100                                                        |
| **Verdict Score** | 0–100 composite deal quality       | (Deal Gap × 0.35) + (Return Quality × 0.30) + (Market Alignment × 0.20) + (Deal Probability × 0.15) |


**Deal Gap Zones**  

- Loss Zone: Buy > Income Value  
- High Risk: within 2%  
- Negotiate: 2–5%  
- Profit Zone: 5–12%  
- Deep Value: >12%

**Six Investment Strategies**

1. **Long-Term Rental (LTR)** — CoC primary, cap rate, DSCR
2. **Short-Term Rental (STR)** — CoC, ADR, occupancy, RevPAR
3. **BRRRR** — Cash recovery %, equity created, post-refi cash flow
4. **Fix & Flip** — Net profit, ROI, 70% rule
5. **House Hack** — Effective housing cost, savings, cost reduction %
6. **Wholesale** — Assignment fee, MAO, ROI on EMD

---

## Part 2: Mobile Architecture Plan

### 2.1 Tech Stack Recommendation

**Recommended: React Native + Expo (managed workflow)**


| Rationale       | Detail                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| Existing mobile | Current mobile uses Expo 54; greenfield rebuild can reuse patterns and ecosystem |
| Shared code     | Shared types via `@dealscope/shared`                                             |
| Backend support | Expo push tokens, device registration already in backend                         |
| OTA updates     | `eas update` for fast deploys                                                    |
| Build pipeline  | EAS Build for iOS/Android                                                        |


**Alternatives considered**

- **Flutter** — Different language, no shared types with frontend
- **Capacitor** — Web wrapper; weaker native UX and performance
- **Native** — Higher effort; not justified for this app

### 2.2 Project Structure (dealscope/mobile/)

```
mobile/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root layout, providers
│   ├── index.tsx           # Home (landing or redirect)
│   ├── (auth)/             # Auth group
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── reset-password.tsx
│   │   └── verify-email.tsx
│   ├── (tabs)/             # Main tab navigator
│   │   ├── _layout.tsx     # Tab bar: Verdict | Strategy | Property | Profile
│   │   ├── verdict.tsx
│   │   ├── strategy.tsx
│   │   ├── property.tsx
│   │   └── profile.tsx
│   ├── analyzing.tsx
│   ├── deal-maker/[address].tsx
│   ├── deal-gap.tsx
│   ├── pricing.tsx
│   ├── (protected)/        # Auth-required screens
│   │   ├── billing.tsx
│   │   ├── search-history.tsx
│   │   ├── saved-properties.tsx
│   │   ├── onboarding.tsx
│   │   └── worksheet/[id]/[strategy].tsx
│   └── ...
├── components/
│   ├── ui/                 # Shared UI primitives
│   ├── analytics/          # Verdict, Strategy, Deal Gap
│   ├── auth/
│   ├── property/
│   ├── billing/
│   └── ...
├── hooks/
├── services/               # API client, auth
├── stores/                 # Zustand
├── types/
├── constants/              # Design tokens
├── theme/
└── app.json
```

### 2.3 Frontend ↔ Mobile Component Mapping


| Frontend                                 | Mobile Equivalent                     |
| ---------------------------------------- | ------------------------------------- |
| `DealGapIQHomepage`                      | `LandingScreen` (home)                |
| `MobileScannerView`                      | `CameraScannerScreen` (expo-camera)   |
| `SearchPropertyModal`                    | `SearchModal` or inline address input |
| `IQAnalyzingScreen`                      | `AnalyzingScreen`                     |
| `VerdictIQCombined` / `VerdictIQPageNew` | `VerdictScreen`                       |
| `StrategyPageLayout`                     | `StrategyScreen`                      |
| `DealGapChart`                           | `DealGapChart` (React Native SVG)     |
| `InvestmentAnalysisNew`                  | `InvestmentAnalysis`                  |
| `StrategySelector`                       | `StrategySelector` (horizontal pills) |
| `DealMakerPage`                          | `DealMakerScreen`                     |
| `AppHeader`                              | `TabBar` + `Header`                   |
| `AuthGuard`                              | `AuthGuard` (redirect to login)       |
| `ProGate`                                | `ProGate`                             |
| `LoginForm`, `RegisterForm`              | `LoginForm`, `RegisterForm`           |
| `PricingContent`                         | `PricingScreen`                       |
| `Profile` tabs                           | `ProfileScreen` with tabs             |


### 2.4 Mobile-Specific Adaptations


| Aspect        | Web                          | Mobile                                         |
| ------------- | ---------------------------- | ---------------------------------------------- |
| Navigation    | Next.js App Router           | Expo Router (file-based)                       |
| Tabs          | AppHeader tabs               | Bottom tab bar                                 |
| Modals        | Modal overlay                | Full-screen or bottom sheet                    |
| Search        | Modal                        | Full-screen or inline                          |
| Address input | AddressAutocomplete (Google) | Same API + native keyboard                     |
| Camera        | Web `getUserMedia`           | expo-camera                                    |
| Charts        | Recharts                     | react-native-chart-kit or Victory              |
| Glow effects  | CSS box-shadow               | `react-native` shadow + `expo-linear-gradient` |
| Offline       | Optional                     | Offline queue + sync                           |


### 2.5 Shared API Layer

- **Shared:** `@dealscope/shared` — types, constants, strategy configs  
- **API client:** New `mobile/services/api.ts` with same endpoints as `/api/v1/`*  
- **Auth:** Bearer token in `Authorization` (backend supports both cookie and header)  
- **Base URL:** `EXPO_PUBLIC_API_URL` for mobile (no Next.js proxy)

**Mobile-specific APIs**

- `POST /api/v1/devices` — register device token (Expo push)  
- `DELETE /api/v1/devices` — unregister device  
- Search history: `search_source: "mobile"` in requests

---

## Part 3: Phased Development Roadmap

### Phase 1: Project Scaffolding, Auth, Navigation Shell (≈2–3 weeks)


| Task                                                     | Effort |
| -------------------------------------------------------- | ------ |
| Expo project init, `@dealscope/shared` link              | 1 day  |
| Design tokens (colors, typography, spacing)              | 1 day  |
| API client + auth (Bearer token, refresh)                | 2 days |
| Expo Router layout, auth group, protected group          | 2 days |
| Login, Register, Forgot Password, Reset Password screens | 3 days |
| AuthGuard, session persistence (SecureStore)             | 1 day  |
| Tab shell (Verdict, Strategy, Property, Profile)         | 3 days |
| Basic home/landing screen                                | 2 days |


### Phase 2: Core Feature Screens (≈4–5 weeks)


| Task                                                     | Effort |
| -------------------------------------------------------- | ------ |
| Address search (address input, autocomplete)             | 3 days |
| Property search API → Analyzing screen                   | 2 days |
| Verdict screen (score, price cards, strategy grid)       | 5 days |
| Strategy screen (strategy selector, financial breakdown) | 5 days |
| Deal Gap chart (price ladder)                            | 3 days |
| Deal Maker screen (sliders, metrics)                     | 4 days |
| Multi-strategy analysis (all 6 strategies)               | 4 days |
| Property details screen                                  | 3 days |


### Phase 3: Account, Subscription, Settings (≈3 weeks)


| Task                                                      | Effort |
| --------------------------------------------------------- | ------ |
| Profile screen (Account, Business, Investor, Preferences) | 4 days |
| Billing screen (subscription status, plans)               | 2 days |
| Stripe checkout (Starter free, Pro $29/$39)               | 3 days |
| Search history screen                                     | 2 days |
| Saved properties (DealVaultIQ)                            | 3 days |
| Onboarding flow (5 steps)                                 | 3 days |
| Settings (notifications, sessions)                        | 2 days |


### Phase 4: Polish, animations, offline, push (≈2–3 weeks)


| Task                                                         | Effort |
| ------------------------------------------------------------ | ------ |
| Card glow effects, animations                                | 3 days |
| Offline handling (queue, sync)                               | 4 days |
| Push notifications (expo-notifications, device registration) | 3 days |
| Camera scanner (point-and-scan)                              | 3 days |
| Loading states, error boundaries                             | 2 days |


### Phase 5: Testing, QA, App Store Prep (≈2–3 weeks)


| Task                                  | Effort |
| ------------------------------------- | ------ |
| Unit tests (critical flows)           | 3 days |
| E2E (Detox or Maestro)                | 3 days |
| QA (iOS + Android)                    | 5 days |
| App Store screenshots, metadata       | 2 days |
| EAS Submit, TestFlight, Play Internal | 2 days |


**Total estimated effort:** 13–17 weeks

---

## Part 4: Decisions & Dependencies

### 4.1 Third-Party Libraries


| Library                                      | Purpose            |
| -------------------------------------------- | ------------------ |
| `expo`                                       | Core runtime       |
| `expo-router`                                | File-based routing |
| `@tanstack/react-query`                      | Server state       |
| `zustand`                                    | Client state       |
| `axios`                                      | HTTP client        |
| `expo-secure-store`                          | Token storage      |
| `expo-camera`                                | Camera scanner     |
| `expo-location`                              | GPS                |
| `expo-notifications`                         | Push               |
| `react-native-svg`                           | Charts, icons      |
| `react-native-chart-kit` or `victory-native` | Charts             |
| `@stripe/stripe-react-native`                | Payments           |
| `@react-native-async-storage/async-storage`  | Persistence        |
| `@react-native-community/netinfo`            | Offline detection  |
| `@sentry/react-native`                       | Error tracking     |


### 4.2 Backend/API Changes


| Change        | Status                                        |
| ------------- | --------------------------------------------- |
| Bearer auth   | Supported (middleware checks `Authorization`) |
| Device tokens | `/api/v1/devices` exists                      |
| Search source | `search_source: "mobile"` supported           |
| CORS          | Backend must allow mobile origin if needed    |


### 4.3 Mobile-Specific UX Rethinking


| Feature             | UX Consideration                        |
| ------------------- | --------------------------------------- |
| Strategy selector   | Horizontal scroll pills instead of tabs |
| Deal Maker          | Sliders with haptic feedback            |
| Financial breakdown | Collapsible sections, swipe             |
| Property search     | Full-screen search with recent searches |
| Saved properties    | Swipe actions                           |


### 4.4 Platform Considerations


| iOS                | Android                          |
| ------------------ | -------------------------------- |
| Safe area handling | Safe area + status bar           |
| Haptics            | `expo-haptics`                   |
| Notch              | `react-native-safe-area-context` |
| Deep links         | `expo-linking`                   |
| Push               | APNs via Expo                    |
| Push               | FCM via Expo                     |


### 4.5 Shared Code Opportunities


| Shared               | Location                    |
| -------------------- | --------------------------- |
| Types                | `@dealscope/shared`         |
| Strategy configs     | `@dealscope/shared`         |
| Calculation formulas | `@dealscope/shared` (utils) |
| API types            | `@dealscope/shared`         |
| Validation schemas   | `@dealscope/shared` (Zod)   |


**Not shared** | Reason |
| UI components | React vs React Native |
| Routing | Next.js vs Expo Router |
| Styling | Tailwind vs StyleSheet |

---

## Summary

- **Frontend audit:** 40+ routes, 80+ API endpoints, Zustand + React Query, dark design system, 4 proprietary metrics, 6 strategies.
- **Mobile stack:** React Native + Expo (managed), Expo Router, same API layer.
- **Phased roadmap:** 5 phases, ~13–17 weeks total.
- **Parity:** Full visual and functional parity with web; mobile uses native patterns where appropriate.

