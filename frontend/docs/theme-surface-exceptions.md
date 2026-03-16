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

## Intentional Non-Token Backgrounds

| File | Pattern | Rationale |
|------|---------|-----------|
| `src/app/globals.css` (`.pac-container`) | `#0f172a` | Google Places autocomplete dropdown -- third-party widget, cannot use CSS vars |
| `src/components/auth/LoginForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/auth/RegisterForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/auth/ForgotPasswordForm.tsx` | `#103351`, `#15446c` | Auth form gradient accents (not container fills) |
| `src/components/landing/landing.css` | `#060d17` | Landing page deep background (below --surface-base layer) |

## How to Add an Exception

1. Add the file and pattern to this table with a clear rationale
2. If the check script is failing, add the file to the `ALLOWLIST_PATTERN` in `scripts/check-theme-surfaces.sh`
3. Get PR approval from the design owner
