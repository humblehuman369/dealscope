# Intentional Platform Divergences

> Last updated: February 2026 (Phase 6 — Parity Maintenance)

This document catalogs **intentional, appropriate** differences between the frontend (Next.js) and mobile (React Native/Expo) codebases. These are NOT bugs — they are platform-specific adaptations.

## When reviewing PRs, do NOT flag these as parity violations.

---

## Infrastructure & Architecture

| Adaptation | Mobile Implementation | Frontend Equivalent | Rationale |
|---|---|---|---|
| Offline-first SQLite | `mobile/database/` | None (assumes online) | Mobile must work without connectivity |
| Expo Router navigation | Tab + Stack navigation | Next.js App Router | Platform-appropriate navigation patterns |
| AsyncStorage persistence | All Zustand stores persist via AsyncStorage | React Query cache | Mobile needs data survival across app kills |
| Offline sync queue | `mobile/services/syncManager.ts` | None | Queue mutations while offline, flush on reconnect |
| Network status monitoring | `mobile/hooks/useNetworkStatus.ts` | None | Mobile-specific connectivity detection |

## Authentication & Security

| Adaptation | Mobile Implementation | Frontend Equivalent | Rationale |
|---|---|---|---|
| Token storage | SecureStore (encrypted) | httpOnly cookies | Platform-appropriate secure storage |
| Biometric auth | `mobile/services/authService.ts` | None | TouchID/FaceID is mobile-native |
| Push notifications | `mobile/hooks/useRegisterPushToken.ts` | Not implemented | Mobile-specific engagement channel |

## Scanner & Hardware

| Adaptation | Mobile Implementation | Frontend Equivalent | Rationale |
|---|---|---|---|
| Property scanner | `mobile/components/scanner/` | Browser camera API | Native sensor fusion (magnetometer + GPS + tilt) |
| Scan cone parameters | 15° cone, 5m step, priority weighting | Simpler browser implementation | AR accuracy requires tighter mobile tuning |
| Deep linking | `mobile/hooks/useDeepLinking.ts` | Standard URL routing | Universal links vs. web URLs |

## UI & UX Adaptations

| Adaptation | Mobile Implementation | Frontend Equivalent | Rationale |
|---|---|---|---|
| Minimum font size | 13px minimum enforced | 10px+ allowed | Mobile readability on small screens |
| Touch targets | 44pt minimum (Apple HIG) | Varies | Mobile touch accuracy requirements |
| Animated splash | `mobile/components/AnimatedSplash.tsx` | Not needed | Native app launch experience |
| Offline banner | `mobile/components/OfflineBanner.tsx` | Not needed | Mobile connectivity awareness |
| Gesture navigation | Swipe-to-go-back, pull-to-refresh | Click-based navigation | Platform-native interaction patterns |
| Text hierarchy override | `textColors.dark` with WCAG mobile adjustments | CSS variables | Higher contrast needed on mobile screens |

## Data & State

| Adaptation | Mobile Implementation | Frontend Equivalent | Rationale |
|---|---|---|---|
| Query stale time | 5 min stale, 30 min GC | Varies by page | Longer cache for offline support |
| Retry with backoff | Exponential 1s-10s, 2 retries | Standard retry | Mobile networks are less reliable |
| Network mode | `offlineFirst` | `online` | Return cached data immediately on mobile |

## What IS a Parity Bug (flag these)

- Different financial calculation results for the same inputs
- Missing API endpoints or payload fields
- Type interface mismatches (different field names/types)
- Different scoring/grading thresholds
- Missing formatters or inconsistent formatting output
- Design token drift (colors, spacing, typography weights)
- Missing business logic (validations, calculations, transforms)

---

## Maintenance

When adding a new intentional divergence:
1. Add it to the appropriate table above
2. Include the file paths in both codebases
3. Explain the rationale
4. Update the "Last updated" date

When a divergence is no longer needed:
1. Remove it from this file
2. Align the codebases
3. Add a test fixture to prevent re-drift
