# Real Estate Analyst skills — internal cheat sheet

**Audience:** DealGapIQ team only (not public docs).  

**Install location:** `~/.claude/skills/` (orchestrator `realestate/`, sub-skills `realestate-*`). Agents: `~/.claude/agents/realestate-*.md`.  

**Calibration:** Before trusting dollar math vs production, read `~/.claude/skills/realestate/DEALGAPIQ_DEFAULTS.md` — mirrors `backend/app/core/defaults.py` + `backend/app/services/comps_calculator.py`. Tier 1 skills inject this at skill load time.

**PDF script:** `python3 ~/.claude/skills/realestate/scripts/generate_realestate_pdf.py` — requires `pip install reportlab` (smoke-tested with `--demo`).

**Source bundle (copy-from):** `/Users/bradgeisen/IQ-Data/Claude Skills/realestate-skills/` (keep in sync when upstream skills change).

---

## Commands (slash-style in Claude Code)

| Command | One-line use |
|---------|----------------|
| `/realestate analyze <address>` | Full 5-agent report + composite Property Score → `PROPERTY-ANALYSIS-*.md` |
| `/realestate quick <address>` | 60s gut-check scorecard, no files |
| `/realestate comps <address>` | Comp table + FMV + Comps Score → `PROPERTY-COMPS-*.md` |
| `/realestate rental <address>` | Rent comps + expense model + cap/CoC/DSCR scenarios → `PROPERTY-RENTAL-*.md` |
| `/realestate invest <address>` | Buy-hold / BRRRR / flip scenarios → `PROPERTY-INVEST-*.md` |
| `/realestate neighborhood <address>` | Schools, crime, walk score, demographics → `PROPERTY-NEIGHBORHOOD-*.md` |
| `/realestate flip <address>` | Rehab budget + ARV + flip score → `PROPERTY-FLIP-*.md` |
| `/realestate commercial <address>` | NOI / cap / leases (commercial) → `PROPERTY-COMMERCIAL-*.md` |
| `/realestate mortgage <price>` | Payments, affordability, rent vs buy → `PROPERTY-MORTGAGE.md` |
| `/realestate market <city/zip>` | Inventory, DOM, trends, classification → `PROPERTY-MARKET-*.md` |
| `/realestate compare <a1> <a2>` | Side-by-side winner per category → `PROPERTY-COMPARE.md` |
| `/realestate screen <criteria>` | Pipeline screens (cash-flow, appreciation, brrrr, first-time, str, custom) → `PROPERTY-SCREEN-*.md` |
| `/realestate listing <address>` | MLS-style copy (agent persona; lower priority for investor-first workflows) |
| `/realestate report-pdf` | Compile `PROPERTY-*.md` in cwd → `PROPERTY-REPORT.pdf` |

---

## Tiering (investor-first)

- **Tier 1 (calibrated):** analyze, quick, screen, neighborhood, market, comps, rental, invest — plus main orchestrator `realestate/SKILL.md`.
- **Tier 2:** flip, mortgage, compare, report-pdf, commercial — installed; use as needed.
- **Tier 3:** listing — optional.

---

## Smoke test checklist (manual in Claude)

After changing defaults or reinstalling skills:

1. Pick an address you already ran in DealGapIQ production.
2. Run `/realestate quick`, `/realestate analyze`, `/realestate screen cash-flow <city>`, `/realestate market <zip>`.
3. Run `python3 ~/.claude/skills/realestate/scripts/generate_realestate_pdf.py` after analysis files exist (or `--demo` for script-only check).
4. Spot-check cap rate / CoC / narrative tone vs app — large drift usually means calibration file outdated vs `defaults.py`.

**Automated check performed at install:** `generate_realestate_pdf.py --demo` exits 0 and builds a sample PDF.

---

## Disclaimer

Educational / internal research only. Not investment advice. WebSearch ≠ RentCast/Zillow APIs; do not paste raw skill output into client-facing materials without review.
