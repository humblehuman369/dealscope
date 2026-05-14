# Theme Surface Exceptions

Intentional non-token background colors that are **exempt** from the theme surface check.
Every entry must include a rationale and the file path.

## Allowlisted Token Definition Files

These files **define** the tokens and are excluded from the check script:

| File | Reason |
|------|--------|
| `src/app/globals.css` | Token source of truth |
| `src/theme/semantic-tokens.ts` | TypeScript token constants |
| `src/components/iq-verdict/verdict-design-tokens.ts` | Verdict-specific token constants |
| `src/app/api/report/route.ts` | Server-side PDF generation (fixed colors required) |
| `capacitor.config.ts` | Native splash screen configuration |
| `src/__tests__/theme-surfaces.test.ts` | Test file that asserts against forbidden patterns |
| `src/components/landing/DealGapIQHomepageV2.tsx` | Frozen legacy homepage variant — see "Intentional Non-Token Backgrounds" below |
| `src/components/ui/VideoModal.tsx` | Video letterbox `#000` — see "Intentional Non-Token Backgrounds" below |

## Intentional Non-Token Backgrounds

| File | Pattern | Rationale |
|------|---------|-----------|
| `src/app/globals.css` (`.pac-container`) | `#0f172a` | Google Places autocomplete dropdown -- third-party widget, cannot use CSS vars |
| `src/components/auth/LoginForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/auth/RegisterForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/auth/ForgotPasswordForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/landing/landing.css` | `#060d17` | Landing page deep background (below --surface-base layer) |
| `src/components/landing/DealGapIQHomepageV2.tsx` | `bg-black`, `border-[#1E2530]`, `border-[#14181F]` (~58 occurrences) | Frozen legacy homepage variant. V4 is production; V2 is reachable only via `?v=2` URL flag and exists as a rollback safety net. Hardcoded colors are intentional — visual fidelity must match what was last deployed so a rollback produces the expected look. Migrating to semantic tokens would shift the borders (e.g. `--border-default` is `#334155`, materially lighter than `#1E2530`). When V2 is no longer needed as a rollback target it should be deleted, not refactored. |
| `src/components/ui/VideoModal.tsx` | `background: '#000'` on the 16:9 player container | Standard video-player letterbox. Videos sit on solid black regardless of theme so frame dimensions render predictably across content. Functionally equivalent to the "Overlays: rgba(0,0,0,0.x) for modal backdrops" exception listed in the workspace theme rule. |

## How to Add an Exception

1. Add the file and pattern to this table with a clear rationale
2. If the check script is failing, add the file to the `ALLOWLIST_PATTERN` in `scripts/check-theme-surfaces.sh`
3. Get PR approval from the design owner
