# Cursor Build Instructions — Four Paths

This doc tells a Cursor agent (or a human) what's left to ship on Four Paths and how to onboard onto the codebase fast. It supersedes the original ticket-by-ticket build log — most of those tickets shipped between Apr 6 and Apr 29, 2026.

The canonical reference is [`THREE_PATHS_PLAN.md`](./THREE_PATHS_PLAN.md). Read that first. Section 0 of the plan has the per-ticket status snapshot.

---

## Block 0 — Kickoff (paste once at session start)

```
You are working on DealGapIQ Four Paths. Most of the original tickets shipped — read the status snapshot in section 0 of THREE_PATHS_PLAN.md before assuming anything is unbuilt. The filename says "THREE" but the canonical count is FOUR; see the naming note at the top of the plan.

REQUIRED READING (in order):
1. THREE_PATHS_PLAN.md sections 0-2 (status snapshot, product context, file map).
2. Run `git log --oneline -20` and `git status` to see current branch state.
3. List backend/app/services/deal_structures/templates/ and frontend/src/components/iq-verdict/ to confirm the file map matches the plan.

CRITICAL RULES (do not violate):
- Backend owns ALL financial calculations. The frontend renders pre-computed numbers.
- Templates are pure functions of StructureContext. No I/O, no DB reads, no datetime.now().
- Camel-case at the API boundary. Pydantic schemas use _to_camel alias generator.
- Diversity rule: the three single-lever paths must come from different families. Blended Plan (Path 4) may combine families.
- Honest gating: a template returns None when it cannot close the gap. Never pad with weak structures.
- Narrative ban list: do not use "amortize," "leverage," "DSCR," "NOI," "cash-on-cash," "cap rate" in narrative paragraphs. Cards may use them; narrative may not.
- Reuse existing utilities: estimate_income_value, calculate_buy_price, calculate_monthly_mortgage already exist. Do NOT re-implement.

WORKING STYLE:
- Small, focused commits — one ticket per commit when sensible; combining two small tickets that touch the same file in non-overlapping ways is acceptable if review context benefits.
- After each change: typecheck (`cd frontend && npx tsc --noEmit`) and lint (`cd backend && ruff check <touched files>`). Tests: `cd backend && venv/bin/python -m pytest tests/test_deal_structures_*.py tests/test_template_*.py -q`.
- If anything in the plan is ambiguous, STOP and ask before assuming. Never invent fields or change schemas without confirmation.
- Do not modify .env files, tokens, or anything in the .git directory.
- Never report a task complete without running the verification commands.

Confirm you've read the status snapshot and tell me which ticket you'll pick up first.
```

---

## What's actually left

### Engineering — unblocked

There is **no unblocked engineering work** on the Four Paths roadmap as of this writing. Every ticket the original plan called for is shipped, except the items listed below as quarantined or blocked.

If you want to keep momentum, look at adjacent surfaces (homepage rebuild per `HOMEPAGE_MARKETING_PLAN.md`, Strategy worksheet polish, etc.) — Four Paths itself is at a clean stopping point.

In the next release cycle, **remove the deprecated shims**:
- `frontend/src/components/iq-verdict/ThreePathsPanel.tsx` (re-exports `FourPathsPanel`)
- `select_three_paths` alias in `backend/app/services/deal_structures/selector.py`

### Engineering — blocked on you

These need product / partner action before engineering can proceed. None of them is started.

- **T8.5 — Public-records data partner.** Identify and integrate a source that returns the seller's existing loan type (FHA / VA / USDA / conventional) and balance. Candidates: BatchData, PropMix, ATTOM, DataTree. Affects: T3b accuracy, T9 fill rate. **Decide partner first.**
- **T3b — Real-data Sub2 enrichment.** Drop-in replacement for the heuristic balance/rate currently used. Trivial code change once T8.5 lands. Behind feature flag.
- **T16 — Affiliate hooks.** Monetize the attorney/lender disclaimer pages. Needs signed affiliate URLs from creative-finance attorney + Sub2-friendly lender partners. Engineering wiring is ~1 hour once URLs land.

### Quarantined — do not ship without legal review

- **T11 — Wraparound mortgage variant.** See [`THREE_PATHS_PLAN.md`](./THREE_PATHS_PLAN.md) Appendix A. Garn-St. Germain due-on-sale enforcement risk + Texas SB 43 (2021) wrap-licensing requirement. Do not surface wrap math to TX users without state-specific compliance language. Conditions to revisit are in the appendix.
- **Land-contract / contract-for-deed structures.** Same legal-review gating as wraparound. State-by-state legality patchwork.

---

## Verify (paste after any change)

```
VERIFICATION CHECK:

1. cd frontend && npx tsc --noEmit — must be clean.
2. cd backend && ruff check <touched files> — must be clean on your changes (pre-existing warnings are fine, do not introduce new ones).
3. cd backend && venv/bin/python -m pytest tests/test_deal_structures_*.py tests/test_template_*.py -q — all 105+ tests green.
4. git diff --stat to summarize what changed.
5. Confirm no .env, no node_modules, no .git, no DB credentials touched.
6. 3-line summary: what was built, where (file paths), what's verified.

If anything is red, STOP. Describe the issue and wait for direction.
```

---

## How to run the project

### Backend
- Python 3.12 venv at `/Users/bradgeisen/IQ-Data/dealscope/backend/venv`.
- Postgres required for the verdict endpoint (assumption_resolver reads from DB). `docker-compose.yml` at the repo root.
- Start: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000`.
- Ignore startup warnings about missing API keys (RentCast, Stripe, etc.) — not needed for Four Paths.

### Frontend
- `cd frontend && npm run dev` (Next.js + Turbopack on port 3000).
- Verdict page: `/verdict?address=...`.

### Quick synthetic engine test (no DB required)
```python
from app.services.deal_structures import compute_deal_structures
from app.services.deal_structures.context import StructureContext

ctx = StructureContext(
    list_price=410000, target_buy_price=360000, income_value=380000, deal_gap_pct=12.2,
    monthly_rent=2400, property_taxes_annual=4800, insurance_annual=1500,
    down_payment_pct=0.20, interest_rate=0.065, loan_term_years=30, closing_costs_pct=0.03,
    vacancy_rate=0.05, maintenance_pct=0.05, management_pct=0.08, capex_pct=0.05,
    utilities_annual=0, other_annual_expenses=0,
    is_listed=True, days_on_market=75, is_fsbo=False,
    is_foreclosure=False, is_bank_owned=False, market_temperature='cold',
)
result = compute_deal_structures(ctx)
print(result.has_paths, len(result.paths))
```

Expected: 4 paths (3 single-lever + 1 blended), narrative with 6 paragraphs.

---

## Troubleshooting

If Cursor invents a field, fakes a result, or claims something works without testing:
- Stop the task immediately.
- Ask: *"Summarize what you changed in this ticket and which decisions you made without explicit instruction."*
- Revert with `git restore .` if no work is worth keeping.
- Refine the ticket prompt — usually the issue is an ambiguous instruction. Add the missing detail and re-paste.

If Cursor insists on building something the status snapshot says is shipped, point it back to section 0 of `THREE_PATHS_PLAN.md`. The most common failure mode is an agent surveying a stale branch and concluding the work doesn't exist; the cure is `git fetch && git log origin/main --oneline -30`.

---

## What NOT to put in a Cursor session

- API keys, tokens, .env contents.
- Affiliate URLs or partner agreement details (T16 is blocked until those land).
- Personal information about Brad, customers, or beta testers.
- The marketing copy from `HOMEPAGE_MARKETING_PLAN.md` — Cursor doesn't need it for engineering work, and it bloats context.

---

*End of build instructions.*
