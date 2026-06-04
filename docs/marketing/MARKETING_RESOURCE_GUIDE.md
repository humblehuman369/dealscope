# DealGapIQ — Marketing Resource Guide (Internal Index)

> **Internal use only.** This is a map of the marketing document library — not the
> marketing content itself.
>
> **For outside partners:** hand them
> [`MARKETING_PLAYBOOK.md`](./MARKETING_PLAYBOOK.md) — it is self-contained (all
> copy, positioning, and guidance inline). No other files required.
>
> **Last updated:** June 2026 · **Owner:** Brad Geisen (brad@geisen.cc)

---

## Start here

| Need | Document |
|---|---|
| **External marketing partner / agency brief** | [`MARKETING_PLAYBOOK.md`](./MARKETING_PLAYBOOK.md) |
| **Visual identity (colors, fonts, components)** | [`BRAND_COLOR_AND_STYLE_GUIDE.md`](./BRAND_COLOR_AND_STYLE_GUIDE.md) |
| **LinkedIn page build (SEO, calendar, KPIs)** | [`LINKEDIN_COMPANY_PAGE_BLUEPRINT.md`](./LINKEDIN_COMPANY_PAGE_BLUEPRINT.md) |
| **LinkedIn asset specs (logo, banner, About copy)** | [`LINKEDIN_BRAND_STYLE_GUIDE.md`](./LINKEDIN_BRAND_STYLE_GUIDE.md) |

---

## Document library

### Primary (external-facing)
| Document | Purpose | Status |
|---|---|---|
| [`MARKETING_PLAYBOOK.md`](./MARKETING_PLAYBOOK.md) | **Canonical external asset** — self-contained copy bank, positioning, personas, voice, product language, channels, SEO, compliance | Canonical |
| [`MARKETING_PLAYBOOK.docx`](./MARKETING_PLAYBOOK.docx) | Word export of the playbook (regenerate after `.md` changes) | Export |
| [`BRAND_COLOR_AND_STYLE_GUIDE.md`](./BRAND_COLOR_AND_STYLE_GUIDE.md) | Visual identity only — colors, type, surfaces, components | Canonical |
| [`BRAND_COLOR_AND_STYLE_GUIDE.docx`](./BRAND_COLOR_AND_STYLE_GUIDE.docx) | Word export of brand guide | Export |

### Channel playbooks
| Document | Purpose | Status |
|---|---|---|
| [`LINKEDIN_COMPANY_PAGE_BLUEPRINT.md`](./LINKEDIN_COMPANY_PAGE_BLUEPRINT.md) | Manus-authored: SEO page setup, 3-month calendar, competitor analysis, KPI dashboard | Reference |
| [`LINKEDIN_BRAND_STYLE_GUIDE.md`](./LINKEDIN_BRAND_STYLE_GUIDE.md) | LinkedIn-specific brand kit and paste-ready About copy | Reference |

### Strategy and copy (internal / deep reference)
| Document | Purpose | Status |
|---|---|---|
| [`POSITIONING.md`](./POSITIONING.md) | Internal one-pager: moat, personas, content pillars, voice rules | Reference |
| [`MARKETING_GUIDE.md`](./MARKETING_GUIDE.md) | Full agency campaign guide — confidential; pricing internals, feature deep-dives | Confidential |
| [`DealGapIQ-Marketing-Guide.md`](./DealGapIQ-Marketing-Guide.md) | v2 copy bank (Hunt → Score → Close) — **content merged into playbook** | Superseded by playbook |
| [`LAUNCH_MARKETING_PLAN.md`](./LAUNCH_MARKETING_PLAN.md) | Zero-budget founder-led launch plan | Reference |
| [`HOMEPAGE_PLAN.md`](./HOMEPAGE_PLAN.md) | Homepage copy spec (Four Paths) | Reference |

### Research and artifacts
| Document | Purpose | Status |
|---|---|---|
| [`MARKET_ANALYSIS_AI_PROMPT.md`](./MARKET_ANALYSIS_AI_PROMPT.md) | Prompt for market analysis | Tool |
| [`dealgapiq-homepage-redesign-FRESH.html`](./dealgapiq-homepage-redesign-FRESH.html) | Homepage prototype | Artifact |
| `MARKET_ANALYSIS_RFP.docx` | Market analysis RFP | Artifact |

### Archive (superseded — do not use as source of truth)
| Location | Contents |
|---|---|
| [`../archive/`](../archive/README.md) | Old brand guide, design prototypes, Foreclosure.com audits, stray exports |

---

## Governance

1. **External copy lives in the playbook.** When messaging changes, edit
   `MARKETING_PLAYBOOK.md` first, then propagate to product/site docs as needed.
2. **Visual identity lives in the brand guide.** Do not duplicate color/type specs
   in marketing copy docs.
3. **Register new docs** by adding a row to the library table above.
4. **Mark status:** Canonical / Reference / Confidential / Export / Artifact / Tool /
   Superseded / Archive.
5. **Regenerate `.docx` exports** after material playbook or brand guide edits:
   ```bash
   cd docs/marketing
   pandoc MARKETING_PLAYBOOK.md -o MARKETING_PLAYBOOK.docx --from gfm --toc --toc-depth=2
   pandoc BRAND_COLOR_AND_STYLE_GUIDE.md -o BRAND_COLOR_AND_STYLE_GUIDE.docx --from gfm --toc --toc-depth=2
   ```

### Open decisions (track until closed)

- [ ] Confirm **free-tier analysis count** for public copy (docs historically said 3 and 5 per month)
- [ ] Confirm **paid-tier pricing** before adding specific dollar amounts to external materials
- [ ] Confirm **15 seconds** as the live speed claim across all product surfaces (retire any remaining "60 seconds" copy in the app/site)

---

## Changelog

| Date | Change |
|---|---|
| 2026-06 | Demoted this guide to internal index. Created self-contained `MARKETING_PLAYBOOK.md` as canonical external asset. |
| 2026-06 | Archived superseded docs → `docs/archive/`. Repointed brand guide references. |
| 2026-06 | v1 hub created (since superseded by this index + playbook split). |
