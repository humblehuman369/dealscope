# Mobile Codebase Audit — GitHub Issue List

Complete audit of the `mobile/` codebase (DealGapIQ React Native / Expo). Output format: GitHub issues for logic, architecture, UX workflow, maintainability, and production readiness. Not a visual design critique.

---

## Resolved (implementation complete)

The following items from this audit were addressed in a single pass:

- **Phase 1:** Production `console.log` guarded in analyzing screen; Jest `setupFilesAfterEnv` typo fixed; dashboard uses `apiClient`; ThemeProvider renders with default theme while loading (no blank screen); error reporting (ErrorBoundary, Sentry) verified.
- **Phase 2:** Route-level auth guard for protected tabs (dashboard, portfolio, history, settings, map); `deal_maker_records` removed from sync status/clearCache and documented as online-only; `API_BASE_URL` centralized via `apiClient`; sync flow documented in `syncManager.ts`.
- **Phase 3:** Dashboard shows error state + Retry when queries fail; portfolio add-property has inline address validation; home nav waits for auth before showing protected CTAs (onboarding redirect timing).
- **Phase 4:** FlatList replaced with FlashList in history, photos, and profile state picker; dashboard error block has `accessibilityRole="alert"` and error message has `accessibilityLabel`.
- **Phase 5:** Store readiness checklist added at `docs/STORE_READINESS.md`; in-app links (help, privacy, terms, support) verified.

Manual steps still recommended: full VoiceOver/TalkBack pass, production build and OTA test on real devices, store listing metadata in App Store Connect and Play Console.

---

## ISSUE 1 (EPIC): Mobile Audit & Production Readiness

### Executive summary

The mobile app is an Expo (SDK 54) React Native app using expo-router, Zustand (persist + in-memory), React Query, expo-sqlite, and expo-secure-store. Architecture is generally clear: **context/** for auth and theme, **stores/** for persisted and UI state, **services/** for API and sync, **database/** for local SQLite and sync metadata. The codebase is production-oriented (Sentry, EAS, OTA, deep links, offline banner, error boundaries) but has gaps in route-level auth, test coverage, list performance, and consistency between API usage and local DB sync.

### Mobile health score: **6.5 / 10**

- **Strengths:** Auth (SecureStore, refresh mutex, MFA), offline-first React Query and sync queue, deep link sanitization, theme persistence, structured stores and types.
- **Gaps:** No global auth guard (protected screens rely on per-screen checks and API 401s), `deal_maker_records` table never synced from API, dashboard uses raw `fetch` instead of `apiClient`, console.log in production path, Jest typo, limited tests, ThemeProvider returns `null` during load (blank flash risk), some lists use FlatList instead of FlashList.

### Production readiness verdict: **CONDITIONAL YES**

- **Ship for beta/internal:** Yes, with known limitations (see phased plan).
- **Ship for public store:** Not until Phase 1–2 fixes and Phase 5 store-readiness are done (auth guard, crash/error hardening, accessibility, store metadata).

### Top mobile risks (ranked)

1. **No route-level auth guard** — Unauthenticated users can open any tab; protected content depends on 401 and per-screen redirects. Brief flash of dashboard/portfolio possible.
2. **Sync vs schema mismatch** — `deal_maker_records` exists in schema and `getSyncStatus`/`clearCache` reference it, but no sync job writes it from API; table is orphaned for sync.
3. **Inconsistent API layer** — `app/(tabs)/dashboard.tsx` uses raw `fetch` + `getAccessToken()` instead of `apiClient`; bypasses 401 retry/refresh and error parsing.
4. **Production logging** — `app/analyzing/[address].tsx` has `console.log` without `__DEV__` guard; other files have `console.warn`/`console.error` in non–dev paths (e.g. `lib/projections.ts`, `notificationService.ts`).
5. **ThemeProvider returns `null`** — While theme is loading, children do not render; combined with auth init can extend perceived startup time or blank screen.

### Platform parity assessment (iOS vs Android)

- **Parity:** Good. Single codebase; tab layout uses `Platform.OS` for safe area and keyboard; intent filters and associated domains configured for deep links; permissions and privacy manifests present.
- **iOS-specific:** `paddingBottom` and tab bar height use `Platform.OS === 'ios'`; ATS disabled only in non-production in app.config.
- **Android-specific:** `elevation` for OfflineBanner; APK vs AAB per profile. No major logic gaps found; test on both for keyboard, gestures, and background/foreground sync.

### Estimated effort to production

- **Phase 1 (bug/crash):** ~3–5 days  
- **Phase 2 (architecture/state):** ~5–7 days  
- **Phase 3 (UX/workflow):** ~3–5 days  
- **Phase 4 (performance/a11y):** ~5–7 days  
- **Phase 5 (store launch):** ~2–4 days  
- **Total (one engineer):** ~3–4 weeks to store-ready.

---

## ISSUE 2: Critical UI & Logic Bugs

### 1. ThemeProvider returns `null` before theme load — blank screen risk

- **Severity:** MEDIUM  
- **Area:** UI / startup  
- **Files:** `context/ThemeContext.tsx` (lines 167–169)  
- **Platform:** Both  
- **Why:** `if (!isLoaded) return null;` prevents any child (including root Stack) from rendering until AsyncStorage theme read completes. With slow storage or first launch, users see a blank screen after the animated splash.  
- **User-facing impact:** Possible extended blank screen or perception that the app is stuck.  
- **Fix:** Render children with a default theme (e.g. `system` or `light`) while `!isLoaded`, or show a minimal loading frame instead of `null`.

### 2. Production `console.log` in analyzing screen

- **Severity:** LOW  
- **Area:** UX / logging  
- **Files:** `app/analyzing/[address].tsx` (line 42)  
- **Platform:** Both  
- **Why:** `console.log('[IQ Analyzing] Screen mounted with params:', params);` runs in production; can leak PII (address, query params) and add noise.  
- **User-facing impact:** Minor; mainly hygiene and compliance.  
- **Fix:** Wrap in `if (__DEV__) { ... }` or remove.

### 3. Dashboard uses raw `fetch` instead of apiClient

- **Severity:** HIGH  
- **Area:** data / auth  
- **Files:** `app/(tabs)/dashboard.tsx` (lines 27–40)  
- **Platform:** Both  
- **Why:** `apiFetch` uses `fetch` + `getAccessToken()`. No 401 interceptor, no refresh mutex, no centralized error parsing. If token expires mid-session, dashboard requests fail without automatic refresh; user may see errors instead of transparent re-auth.  
- **User-facing impact:** Unexplained errors or empty dashboard after token expiry; inconsistent behavior vs other screens using `apiClient`.  
- **Fix:** Replace `apiFetch` with `api.get()` (or equivalent) from `services/apiClient.ts` so all requests go through the same interceptors.

### 4. No global auth guard — protected content visible until redirect/401

- **Severity:** HIGH  
- **Area:** auth / navigation  
- **Files:** `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/dashboard.tsx`, `app/(tabs)/portfolio.tsx`  
- **Platform:** Both  
- **Why:** Root and tabs layout do not redirect unauthenticated users. Dashboard and portfolio render first; dashboard then runs useQuery (which can 401); onboarding/profile redirect in `useEffect`. User can briefly see tab content or loading state before redirect.  
- **User-facing impact:** Confusing flash of dashboard/portfolio or error states for logged-out users; inconsistent “logged-out” experience.  
- **Fix:** Add an auth-aware layout or redirect in `app/(tabs)/_layout.tsx` (or a wrapper): if `!isAuthenticated && !isLoading`, redirect to `/auth/login` for protected tabs (dashboard, portfolio, history, etc.), or define a single “guest” shell and redirect only when hitting protected routes.

### 5. Sync manager: `deal_maker_records` table never populated by sync

- **Severity:** MEDIUM  
- **Area:** database / state  
- **Files:** `database/schema.ts`, `services/syncManager.ts`  
- **Platform:** Both  
- **Why:** Schema defines `deal_maker_records` and migrations; `getSyncStatus` and `clearCache` reference it. No `syncDealMakerRecords` (or equivalent) exists; only `saved_properties`, `search_history`, `documents`, `loi_history` are synced from API. Deal Maker data is only written via DealMaker store → API, not into local DB for offline.  
- **User-facing impact:** Offline or sync-status views may imply deal_maker data is cached when it is not; `clearCache` deletes from a table that sync never fills.  
- **Fix:** Either (a) add a sync path that pulls deal_maker records from API into `deal_maker_records`, or (b) stop including `deal_maker_records` in `getSyncStatus`/`clearCache` and document that Deal Maker is online-only until a sync job is implemented.

### 6. NetInfo subscription in AppContent not stored for cleanup

- **Severity:** LOW  
- **Area:** state / memory  
- **Files:** `app/_layout.tsx` (lines 166–185)  
- **Platform:** Both  
- **Why:** `useEffect` calls `NetInfo.addEventListener(...)` and returns `return unsubscribe;` but the variable is the result of `addEventListener`, which returns an unsubscribe function. So cleanup is correct. Double-check: the effect returns a function that is the unsubscribe — that’s correct. No bug here; leave as-is.  
- **User-facing impact:** None.  
- **Fix:** N/A (false positive; no change).

### 7. Jest config typo: `setupFilesAfterSetup` vs `setupFilesAfterEnv`

- **Severity:** LOW  
- **Area:** tests  
- **Files:** `jest.config.js` (line 5)  
- **Platform:** N/A (tooling)  
- **Why:** Option is spelled `setupFilesAfterSetup`; Jest expects `setupFilesAfterEnv`. Any file listed there would be ignored.  
- **User-facing impact:** None; only affects test setup.  
- **Fix:** Rename to `setupFilesAfterEnv` and add a setup file if needed.

---

## ISSUE 3: Mobile Architecture & Component Design

### Current architecture approach

- **Entry:** `app/_layout.tsx` — ErrorBoundary → QueryClient → Auth → Theme → SafeArea → GestureHandler → Stack (tabs + modals).  
- **Navigation:** Expo Router file-based; tabs in `app/(tabs)/_layout.tsx`; many fullScreenModal stack screens for flows (analyzing, verdict-iq, strategy-iq, property-details, onboarding, deal-gap, rehab, price-intel, worksheet, photos, search-history, learn, national-averages).  
- **State:** Auth and theme in **context/**; everything else in **stores/** (Zustand with persist for assumptions, property, dealMaker, worksheet; uiStore non-persisted).  
- **Data:** **services/** for API (apiClient, authService, syncManager, savedProperties, searchHistory, documents, loi, analytics, etc.); **database/** for SQLite (expo-sqlite) and sync; React Query for server cache and offline-first.  
- **Components:** **components/** grouped by feature (analytics, deal-maker, scanner, verdict-iq, strategy-iq, property, header, filters) with shared Skeleton, ErrorBoundary, OfflineBanner.

### Where it breaks down

1. **Auth vs rest of app:** No single place that defines “protected” vs “public” routes; each screen that needs auth does its own check and redirect.  
2. **Dashboard not using apiClient:** Duplicated API base URL and custom `fetch` in `dashboard.tsx` instead of shared client.  
3. **Sync vs stores:** SyncManager and SQLite are the source of truth for saved_properties, search_history, etc., while propertyStore (Zustand) holds “current property” and “recent searches” in AsyncStorage. Two sources for “saved” vs “recent” — acceptable but must be documented so future work doesn’t duplicate or conflict.  
4. **Heavy screens:** `app/profile/index.tsx`, `app/(tabs)/portfolio.tsx`, and strategy/verdict screens are large (many responsibilities); good candidates for splitting into smaller components or hooks.

### Relationship clarity (context / stores / hooks / services)

- **context/:** Auth (session, login, logout, MFA) and Theme (mode, colors). Used by layout and screens for guard and styling.  
- **stores/:** Persisted: assumptionsStore, propertyStore (current + recent searches), dealMakerStore, worksheetStore. Non-persisted: uiStore (strategy, toasts, panels).  
- **hooks/:** Thin wrappers over stores or services (e.g. useAuth, useTheme, useDatabase, useSavedProperties, useSearchHistory, useDeepLinking, useNetworkStatus, usePropertyAnalysis, useDealScore).  
- **services/:** Stateless API and sync (apiClient, authService, syncManager, savedPropertiesService, etc.).  
- **Clarity:** Generally good. Boundary that’s easy to blur: putting business logic in screens instead of stores/services (e.g. dashboard’s apiFetch in the screen file). Prefer moving such logic into a small dashboardService or into existing apiClient usage.

### Native module architecture (android/ & ios/)

- Expo managed workflow; no custom native modules found under `android/` or `ios/` beyond what Expo generates.  
- Plugins (expo-camera, expo-location, expo-sensors, expo-sqlite, expo-secure-store, expo-notifications, Sentry) are configured in `app.config.js`.  
- **Assessment:** Appropriate for the app; no custom native code to audit. If custom native code is added later, keep it behind a thin JS API and document thread/sync assumptions.

### Recommended target architecture

- Keep current split (context for auth/theme; stores for app state; services for API/DB; hooks for reuse).  
- Add a single **auth guard** at layout or route level for protected tabs/routes.  
- Standardize all API calls on **apiClient** (remove raw fetch from dashboard).  
- Either implement **deal_maker_records** sync or remove it from sync status/clearCache.  
- Extract **dashboard** (and other heavy screens) data-fetching into a hook or service and keep the screen as presentation + navigation.

### Component & folder boundary improvements

- **DELETE:** None critical; optional cleanup of unused exports in `components/analytics/index.ts`, `components/verdict-iq/index.ts`, `components/strategy-iq/index.ts` if any are dead.  
- **REFACTOR:** `app/(tabs)/dashboard.tsx` — use apiClient and optionally move fetch logic to `hooks/useDashboardData.ts` or `services/dashboardService.ts`.  
- **KEEP:** Clear separation of scanner, verdict-iq, strategy-iq, deal-maker, property; keep feature folders.  
- Consider a **screens/** or **features/** layer that re-exports from app routes for testing and reuse, if you add more integration tests.

---

## ISSUE 4: State Management & Data Flow Review

### State ownership (stores vs context)

- **Auth:** AuthContext owns user, isLoading, isAuthenticated, error; authService owns tokens (memory + SecureStore). Single ownership; no conflict.  
- **Theme:** ThemeContext owns mode and derived theme; AsyncStorage for persistence. Single ownership.  
- **Current property / recent searches:** propertyStore (Zustand persist). Used for “last viewed” and “recent searches” in UI; separate from SQLite “saved properties” and “search history” synced by syncManager.  
- **Deal Maker / Worksheet:** Per-property or per-property+strategy in Zustand with persist; backend is source of truth for calculations; store holds inputs and last snapshot.  
- **Problem:** No conflict, but “saved properties” can be read from (1) React Query + savedPropertiesService (server) or (2) syncManager.getCachedSavedProperties() (SQLite). Screens should be explicit about which source they use (e.g. “offline list” vs “server list”) to avoid confusion.

### Over-fetching or duplicated state

- **Dashboard:** Fetches stats, recent searches, saved properties, profile in parallel; each has its own staleTime. Acceptable; consider a single “dashboard” query that returns a DTO if the backend supports it to reduce round-trips.  
- **Recent searches:** In propertyStore (AsyncStorage) and possibly in search_history (SQLite) after sync. Two concepts: “local recent” (propertyStore) vs “synced search history” (DB). Document the distinction so UX copy and code stay aligned.

### Local DB sync and consistency

- **Pull:** syncManager syncs saved_properties, search_history, documents, loi_history from API to SQLite on reconnection and on demand.  
- **Push:** processOfflineQueue sends offline_queue items (saved_properties create/update/delete, scanned_properties → save) to API.  
- **deal_maker_records:** Table exists but is never filled by sync; only clearCache touches it. Inconsistent.  
- **Conflict handling:** last_modified_at used to avoid deleting locally modified rows on pull; no last-write-wins or merge logic in code — acceptable for current scope.

### Offline-first readiness

- **Good:** React Query defaultOptions: networkMode 'offlineFirst', refetchOnReconnect, gcTime 30 min; NetInfo wired to onlineManager; OfflineBanner; sync queue and reconnection flush.  
- **Gaps:** Deal Maker and Worksheet rely on API for calculations; no offline calculation path. Saved/property list can show cached SQLite data; individual property analysis requires network.

### Client ↔ server ↔ local-db flow clarity

- **Saved properties:** Create/update/delete can go to queue when offline; on reconnect, processOfflineQueue pushes to API; syncSavedProperties pulls from API into SQLite.  
- **Search history:** Synced pull-only (or push if you add it); local “recent” is propertyStore.  
- **Recommendation:** Add a one-line diagram or comment in `syncManager.ts` at the top describing “offline queue → push on reconnect; periodic/full sync pulls from API into SQLite” and which tables are push, pull, or both.

### State normalization

- No global normalized cache (e.g. Redux-style entities). React Query keys and Zustand stores are the main boundaries. For current app size this is fine. If the app grows, consider normalizing saved properties by id in one place (e.g. a small store or React Query cache) so multiple screens don’t refetch the same list.

---

## ISSUE 5: UX & Workflow Logic Review

### Intended user flows (inferred)

1. **Anonymous:** Open app → Home → Search or Scan → Analyzing → Verdict IQ → (optional) Strategy IQ, Deal Gap, Price Intel, Worksheet; History shows scans; prompt to log in to save.  
2. **Authenticated:** Same, plus onboarding (if not completed), DealHubIQ dashboard, Portfolio (local DB), Saved properties, Search history (synced), Profile, Settings.  
3. **Deep link:** Open URL → parseDeepLink → push to verdict-iq, property-details, deal-gap, etc.  
4. **Offline:** Use cached data; changes queued; banner shown; on reconnect, queue processed and sync runs.

### Where flows break or confuse

1. **No auth guard:** Logged-out user can open Dashboard or Portfolio tab and see loading/error or empty state before any redirect; feels broken.  
2. **Onboarding redirect:** Home runs `useEffect` that redirects to `/onboarding` when `user && isAuthenticated && !user.onboarding_completed`. If auth is still loading, user may see home briefly then redirect — acceptable but could be smoothed by not rendering protected CTA until auth is resolved.  
3. **Analyzing screen:** gestureEnabled: false so user can’t swipe back during analysis; good.  
4. **Worksheet route:** `/worksheet/[strategy]` — optional address in params; if missing, worksheet may not have a property context; confirm all entry points pass address when needed.

### Missing UX feedback (loading / empty / error / offline)

- **Loading:** Most list screens use ActivityIndicator or Skeleton; dashboard has loading state.  
- **Empty:** History, portfolio, search-history have ListEmptyComponent with copy and actions.  
- **Error:** ErrorBoundary (root and screen-level ScreenErrorFallback); React Query error states not consistently surfaced in UI (e.g. dashboard could show a toast or inline error when queries fail).  
- **Offline:** OfflineBanner; React Query serves cache. Some screens don’t explicitly say “showing cached data” — optional improvement.

### Form & interaction (mobile)

- **Haptics:** Used on login (success/error), scan, and some buttons; good.  
- **Keyboard:** KeyboardAvoidingView on login, register, and forms; could audit all input screens for keyboard dismissal and scroll.  
- **Touch targets:** Tab bar and main CTAs look adequate; no systematic min 44pt audit.  
- **Validation:** Auth (email/password, MFA) validated; other forms (e.g. profile, portfolio add) should be checked for required fields and inline errors.

### Navigation & gestures

- **Tabs:** swipeEnabled: false to avoid conflicting with sliders; good.  
- **Modals:** fullScreenModal with slide_from_right or fade; analyzing uses gestureEnabled: false.  
- **Deep links:** useDeepLinking pushes route; address params sanitized (length, chars, null bytes).  
- **Back:** No custom back handling that could trap the user; stack back works.

### Keyboard, scroll, input

- ScrollView/FlatList with keyboardShouldPersistTaps where relevant.  
- No global KeyboardAvoidingView; applied per screen.  
- Recommendation: On forms (e.g. profile edit, portfolio add), ensure focused input is visible and that “Done” or “Save” is reachable without closing keyboard if that’s the desired UX.

---

## ISSUE 6: Security, Auth & Mobile Data Risks

### Token / credential storage

- **Refresh token:** expo-secure-store (SecureStore) under `iq_refresh_token`.  
- **User data cache:** SecureStore `iq_user_data` (JSON).  
- **Access token:** In memory only; not persisted.  
- **Assessment:** Appropriate for mobile; SecureStore uses Keychain (iOS) and EncryptedSharedPreferences/Keystore (Android). No credentials in AsyncStorage.

### Local database encryption

- **expo-sqlite:** Default database file is not encrypted. Schema holds saved properties, search history, documents metadata, LOI, deal_maker_records, scanned/portfolio data.  
- **Risk:** On a rooted/jailbroken device or backup extraction, DB could be read. For many apps this is acceptable; if you need to protect PII in DB, consider SQLCipher or expo-sqlite with encryption.  
- **Recommendation:** Document that SQLite is unencrypted; if compliance requires it, add encryption or avoid storing highly sensitive fields in SQLite.

### API key / secret exposure

- **EXPO_PUBLIC_*:** Intended to be bundled; `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_APP_URL`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN` are documented in .env.example. API URL and web app URL are not secrets; Google Maps and Sentry DSN are sensitive but standard for client apps.  
- **Build:** SENTRY_AUTH_TOKEN and similar are EAS secrets (not in client bundle).  
- **Recommendation:** Ensure no server-side secrets or private API keys use EXPO_PUBLIC_*; keep Google Maps key restricted by app ID/signature in Google Cloud Console.

### Deep link security

- **useDeepLinking:** Address param sanitized (max length, strip null bytes and tags, allowlist of characters); invalid address redirects to home.  
- **Risk:** Open redirect not applicable (navigation is in-app). XSS not applicable (params not rendered as HTML).  
- **Recommendation:** If you add more query params (e.g. redirect_uri), validate and allowlist to avoid open redirect.

### Build configuration (android/ & ios/)

- **app.config.js:** No hardcoded secrets; env from EAS and .env.  
- **eas.json:** EXPO_PUBLIC_* and APP_ENV per profile; credentialsSource remote for production.  
- **Assessment:** No obvious secret leakage in repo; keys in env and EAS.

### Severity and exploit scenarios

- **High:** None identified; auth and token handling are solid.  
- **Medium:** Unencrypted SQLite if device is compromised; acceptable for many use cases.  
- **Low:** Client-bundled Maps/Sentry DSN; mitigate with key restrictions and Sentry rate limits.

---

## ISSUE 7: Spaghetti Code & Tech Debt Map

### Dead / unused

- **Components/hooks/stores:** No clearly dead files; some barrel exports in `components/analytics/index.ts`, `verdict-iq/index.ts`, `strategy-iq/index.ts` — verify all re-exports are used.  
- **Types:** `types/index.ts` re-exports from many files; ensure no orphaned types (e.g. from removed features).  
- **Assets:** Not audited file-by-file; recommend a pass to remove unused images/fonts.

### Duplication hotspots

- **API_BASE_URL:** Repeated in `apiClient.ts`, `defaults.ts`, `dashboard.tsx`, `strategy-iq/[address].tsx`, `parcelLookup.ts`, `analytics.ts`. Prefer a single `config` or `apiClient` import.  
- **Color/palette:** Some screens build local `c` or `dynamicStyles` from theme; theme/colors are centralized but not every screen uses theme tokens for every value.  
- **Format helpers:** formatCurrency, formatPercent, etc. live in services/analytics and utils/formatters; align so one canonical place for formatting.

### God components / overloaded screens

- **app/profile/index.tsx:** Very long; profile edit, state selection modals, settings. **REFACTOR:** Split into ProfileView, StatePickerModal, and smaller sections.  
- **app/(tabs)/portfolio.tsx:** Long; list, add modal, summary. **REFACTOR:** Extract AddPropertyModal and PortfolioSummary into components.  
- **app/strategy-iq/[address].tsx:** Large; **REFACTOR:** Extract hooks for data and PDF export, keep UI in smaller components.

### Categorization

| Item | Action | Notes |
|------|--------|--------|
| API_BASE_URL duplication | REFACTOR | Single source (e.g. apiClient or config). |
| dashboard.tsx apiFetch | REFACTOR | Use apiClient; optional service/hook. |
| deal_maker_records sync | REFACTOR or REWRITE | Add sync job or remove from sync status. |
| ThemeContext return null | REFACTOR | Render with default theme or loading frame. |
| profile/index.tsx | REFACTOR | Split into smaller components. |
| portfolio.tsx | REFACTOR | Extract modals and summary. |
| strategy-iq/[address].tsx | REFACTOR | Extract hooks and subcomponents. |
| analyzing console.log | DELETE | Remove or __DEV__ guard. |
| jest.config setupFilesAfterSetup | REFACTOR | Fix to setupFilesAfterEnv. |
| Unused barrel exports | KEEP or DELETE | Verify and remove if unused. |
| ErrorBoundary, OfflineBanner, syncManager, authService | KEEP | Core pieces; no change. |

---

## ISSUE 8: Production Readiness Gaps & Phased Plan

### Gaps identified

- Route-level auth guard missing.  
- Dashboard not using apiClient (401/refresh behavior).  
- deal_maker_records sync vs schema mismatch.  
- Production console.log in analyzing.  
- ThemeProvider blank while loading.  
- Jest config typo.  
- Limited test coverage (only a few __tests__ files).  
- Some lists use FlatList instead of FlashList (history, portfolio, photos, profile state list).  
- Accessibility: some labels present; no full VoiceOver/TalkBack pass.  
- No explicit “store listing” metadata checklist (privacy policy URL, support URL, etc.) in repo.

---

### PHASE 1 — Bug Fixes & Crash Stabilization

**Goals:** Fix production bugs and avoid crashes; ensure errors are reported and recoverable.

**Tasks:**

1. Remove or guard production `console.log` in `app/analyzing/[address].tsx`.  
2. Fix Jest `setupFilesAfterSetup` → `setupFilesAfterEnv` in `jest.config.js`.  
3. Replace dashboard raw `fetch` with `apiClient` (or shared API helper from apiClient).  
4. Ensure ErrorBoundary and ScreenErrorFallback are the only top-level error UI; verify Sentry is enabled in production and no PII in breadcrumbs.  
5. Optionally: ThemeContext render with default theme when `!isLoaded` to avoid blank screen.

**Files:** `app/analyzing/[address].tsx`, `jest.config.js`, `app/(tabs)/dashboard.tsx`, `context/ThemeContext.tsx`.

**Platform:** Both.

**Exit criteria:** No unguarded production logs; dashboard uses apiClient; Jest setup correct; app does not show extended blank screen on theme load.

---

### PHASE 2 — Architecture & State Cleanup

**Goals:** Align sync with schema; clarify auth and API usage.

**Tasks:**

1. Add route-level auth guard: in `app/(tabs)/_layout.tsx` or a HOC, if `!isAuthenticated && !isLoading` and current tab is protected (dashboard, portfolio, history, settings), redirect to `/auth/login`.  
2. Resolve deal_maker_records: either implement sync from API into `deal_maker_records` or remove it from `getSyncStatus` and `clearCache` and document.  
3. Centralize API_BASE_URL: export from apiClient (or a single config module) and use it everywhere instead of repeating `process.env.EXPO_PUBLIC_API_URL || '...'`.  
4. Document in syncManager.ts: short comment describing push (offline queue) vs pull (sync) and which tables are synced.

**Files:** `app/(tabs)/_layout.tsx`, `services/syncManager.ts`, `app/(tabs)/dashboard.tsx`, `services/defaults.ts`, `app/strategy-iq/[address].tsx`, `services/parcelLookup.ts`, `services/analytics.ts`.

**Platform:** Both.

**Exit criteria:** Protected tabs redirect when not authenticated; deal_maker_records either synced or removed from sync status; single source for API base URL; sync flow documented.

---

### PHASE 3 — UX & Workflow Hardening

**Goals:** Clear loading/error/empty and form behavior; smooth auth/onboarding.

**Tasks:**

1. Add explicit error state for dashboard when queries fail (toast or inline message + retry).  
2. Ensure all forms (profile, portfolio add, etc.) have validation and inline error messages.  
3. Review onboarding redirect timing so authenticated users don’t see a flash of home before onboarding.  
4. Optional: “Showing cached data” or similar when React Query serves stale data while offline.

**Files:** `app/(tabs)/dashboard.tsx`, `app/profile/index.tsx`, `app/(tabs)/portfolio.tsx`, `app/(tabs)/home.tsx`.

**Platform:** Both.

**Exit criteria:** Dashboard shows error + retry; forms validate; onboarding flow smooth.

---

### PHASE 4 — Performance, Accessibility & Platform Parity

**Goals:** Smoother lists; better a11y; confirm iOS and Android parity.

**Tasks:**

1. Replace FlatList with FlashList where lists can be long (history, portfolio, photos grid, profile state list) — already have @shopify/flash-list.  
2. Add accessibility labels and roles where missing (especially tab bar, main CTAs, form fields, error messages).  
3. Run VoiceOver (iOS) and TalkBack (Android) on main flows and fix focus order and labels.  
4. Confirm keyboard and scroll behavior on forms on both platforms.  
5. Optional: measure startup time and optimize if needed (e.g. defer non-critical init after first paint).

**Files:** `app/(tabs)/history.tsx`, `app/(tabs)/portfolio.tsx`, `app/photos/[zpid].tsx`, `app/profile/index.tsx`, `app/(tabs)/_layout.tsx`, and any screen with forms or primary actions.

**Platform:** iOS and Android separately.

**Exit criteria:** Long lists use FlashList; critical paths have a11y labels; no major a11y or keyboard issues on either platform.

---

### PHASE 5 — App Store / Play Store Launch Readiness

**Goals:** Store compliance and metadata; final checks.

**Tasks:**

1. Privacy policy and terms URLs: ensure they are correct in app (help, settings) and in store listing.  
2. App Store / Play Console: metadata (description, keywords, screenshots), support URL, privacy policy URL.  
3. Export compliance (ITSAppUsesNonExemptEncryption: false) already set; confirm for both stores.  
4. Test production build (EAS production profile) on real devices; test OTA update channel.  
5. Optional: Add a minimal “store readiness” checklist in repo (e.g. BUILDING.md or docs) with privacy/support URLs and versioning notes.

**Files:** `app.config.js`, `app/help.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `eas.json`, docs or BUILDING.md.

**Platform:** iOS and Android store consoles + real device builds.

**Exit criteria:** Store listings complete; production build and OTA tested; compliance and links verified.

---

*End of Mobile Audit — GitHub Issue List*
