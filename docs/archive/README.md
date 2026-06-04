# Archive

Superseded, stray, or out-of-scope documents kept for history. **Nothing here is
current.** For live marketing/brand docs, start at
[`docs/marketing/MARKETING_RESOURCE_GUIDE.md`](../marketing/MARKETING_RESOURCE_GUIDE.md).

Archived June 2026 during a consolidation to a single source of truth per topic.

| Folder | Contents | Why archived | Replaced by |
|---|---|---|---|
| `brand/` | `BRAND_AND_STYLE_GUIDE.md` | Older code-derived theming contract; some values now stale (e.g. listed Inter as primary — it's Poppins). | [`marketing/BRAND_COLOR_AND_STYLE_GUIDE.md`](../marketing/BRAND_COLOR_AND_STYLE_GUIDE.md) (visual identity) + the `.cursor/rules/theme-surface-contract.mdc` rule (enforces the surface contract in code). |
| `design-prototypes/` | `verdictiq-style-*.html` (8 files) | Abandoned VerdictIQ design explorations (Bloomberg, fintech, neural, etc.). Referenced nowhere; contradict the locked design system. | The shipped design system (`globals.css`, `tailwind.config.js`). |
| `marketing-exports/` | `MARKETING_GUIDE.docx` | Stray/stale `.docx` export that lived at `docs/` root. | [`marketing/MARKETING_GUIDE.md`](../marketing/MARKETING_GUIDE.md) (live source). |
| `foreclosure-com/` | `MARKETING-REPORT.md`, `MARKETING-AUDIT.md` | Audits of **Foreclosure.com**, a different company — not DealGapIQ. Moved out of repo root. | N/A (separate subject). |

> To restore a file: `git mv docs/archive/<path> <original-location>`.
