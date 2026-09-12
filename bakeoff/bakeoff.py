"""
Property research model bake-off.

Runs the SAME research prompt, with the SAME search budget, across several
models, on a set of properties where a human already found the answer.
Scores each run on facts found, facts made up, cost, and time.

Usage:
    pip install anthropic openai
    export ANTHROPIC_API_KEY=...
    export OPENAI_API_KEY=...        # optional, for OpenAI rows in MODELS
    export PERPLEXITY_API_KEY=...    # optional, for Perplexity rows in MODELS
    python bakeoff.py properties.json --out results/

Each property in properties.json looks like:
    {
      "id": "river-hammock",
      "address": "2406 River Hammock Ln, Fort Pierce, FL 34981",
      "known": {                      # what DealGapIQ already shows
        "owner_names": "NATHANIEL MORRIS, PATRICIA B MORRIS",
        "owner_mailing_address": "6136 NW Kendra Ln, Port Saint Lucie, FL 34983",
        "listing_status": "OFF_MARKET",
        "is_pre_foreclosure": true,
        "is_absentee_owner": true
      },
      "case": "pre_foreclosure_offmarket_absentee",
      "answer_key": {                 # what a human found. Each is a fact + the strings that prove it
        "prior_agent_name":   ["Maysoon Mohd"],
        "prior_agent_phone":  ["772-971-6645", "7729716645", "(772) 971-6645"],
        "brokerage":          ["Star Realty"],
        "foreclosure_plaintiff": ["U.S. Bank", "US Bank", "RCF 2"],
        "listing_status_found": ["On Hold", "on-hold"],
        "prior_list_price":   ["565,000", "565000", "565K"],
        "clerk_phone":        ["772-462-6900", "7724626900"]
      },
      "must_not_claim": [             # things a model would only say if it made them up
        "auction date", "sold at auction", "judgment entered"
      ]
    }
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# ----------------------------------------------------------------------------
# Models under test. Price per million tokens (input, output) and per-search
# cost so we can put a dollar figure on every run. Update prices from each
# vendor's pricing page before you trust the cost column.
# Anthropic prices verified Sept 12 2026 at platform.claude.com/docs/en/about-claude/pricing
# ----------------------------------------------------------------------------
MODELS = [
    {"provider": "anthropic", "model": "claude-haiku-4-5-20251001", "in": 1.00, "out": 5.00, "search": 0.01},
    {"provider": "anthropic", "model": "claude-sonnet-5",           "in": 2.00, "out": 10.00, "search": 0.01},
    {"provider": "anthropic", "model": "claude-opus-5",             "in": 5.00, "out": 25.00, "search": 0.01},
    # Fill in current OpenAI / Perplexity model IDs and prices before enabling.
    # {"provider": "openai",     "model": "gpt-5-mini",  "in": 0.25, "out": 2.00, "search": 0.01},
    # {"provider": "perplexity", "model": "sonar-pro",   "in": 3.00, "out": 15.00, "search": 0.005},
]

MAX_SEARCHES = 10          # same cap for every model
MAX_OUTPUT_TOKENS = 4000
TIMEOUT_SECONDS = 180

# ----------------------------------------------------------------------------
# The one prompt every model gets. It names the targets per case instead of
# saying "find the owners," because that is the difference between River
# Hammock working and not working.
# ----------------------------------------------------------------------------
SYSTEM_PROMPT = """You are a research assistant for a real estate investor.
You are given a property and the facts a data platform already has.
Your job is to find the public facts that are MISSING so the investor knows who to call next.

Rules you must follow:
1. Use web search. Do not answer from memory. Every fact you report must come from a page you opened.
2. Report each fact with the URL it came from and mark it VERIFIED (a page stated it) or UNVERIFIED (you could not open a page that states it).
3. Never guess. If you cannot find something, say NOT FOUND. A wrong fact is worse than a missing one.
4. Do NOT look for or report personal phone numbers, personal emails, or social media profiles of private individuals (the owners). Business phone numbers for agents, brokerages, lenders, law firms, and county offices are fine.
5. Do not invent case numbers, auction dates, judgments, or sale results. Only report them if a court or official page shows them.

Respond ONLY with JSON in this exact shape, no prose before or after:
{
  "findings": [
    {"field": "<snake_case_name>", "value": "<the fact>", "status": "VERIFIED" | "UNVERIFIED", "source_url": "<url or null>", "note": "<one line>"}
  ],
  "not_found": ["<field>", ...],
  "best_next_call": {"who": "<name/role>", "phone": "<business phone or null>", "why": "<one line>"}
}
"""

CASE_TARGETS = {
    "pre_foreclosure_offmarket_absentee": """Targets to find, in priority order:
- prior_listing_agent_name, prior_listing_agent_phone, prior_brokerage (the last agent who listed this property; check Zillow, Redfin, Realtor.com, Homes.com, the brokerage site)
- prior_listing_status and prior_list_price (Withdrawn, Expired, On Hold, Cancelled, and the last asking price)
- foreclosure_plaintiff (the lender or trust that filed), foreclosure_filing_date, foreclosure_case_number
- foreclosure_attorney_firm and its business phone
- auction_date if one is scheduled on the county clerk or auction site
- county_clerk_records_phone and the records request email or URL for this county""",
    "offmarket_absentee": """Targets to find, in priority order:
- prior_listing_agent_name, prior_listing_agent_phone, prior_brokerage
- prior_listing_status, prior_list_price, and when it came off market
- any public record of a lien, code violation, tax delinquency, or probate tied to this address
- county_property_appraiser_phone""",
    "onmarket_stale": """Targets to find, in priority order:
- full price history across Zillow, Redfin, Realtor.com (every cut and date)
- days on market on each site (they often disagree)
- listing_agent_name, listing_agent_phone, brokerage
- how many other active listings the agent has (signal of attention)
- any prior expired or withdrawn listing of this same address""",
    "bank_owned": """Targets to find, in priority order:
- reo_listing_agent_name, phone, brokerage
- the bank or servicer that owns it and its REO department phone
- auction or bid deadline if on Auction.com, Hubzu, Xome, HomePath, HomeSteps
- the foreclosure case that produced the REO (plaintiff, case number)""",
}


def build_user_prompt(p: dict) -> str:
    known = "\n".join(f"- {k}: {v}" for k, v in p["known"].items())
    targets = CASE_TARGETS.get(p["case"], CASE_TARGETS["offmarket_absentee"])
    return f"""Property: {p['address']}
Case: {p['case']}

What the platform already knows:
{known}

{targets}

You may run up to {MAX_SEARCHES} searches. Start with the address in quotes plus the word "listing", then the address plus "foreclosure", then the owner names plus the county plus "foreclosure complaint"."""


# ----------------------------------------------------------------------------
# Providers. Each returns (text, usage_dict, elapsed_seconds).
# ----------------------------------------------------------------------------
def run_anthropic(model: str, system: str, user: str) -> tuple[str, dict, float]:
    import anthropic

    client = anthropic.Anthropic(timeout=TIMEOUT_SECONDS, max_retries=1)
    t0 = time.time()
    resp = client.messages.create(
        model=model,
        max_tokens=MAX_OUTPUT_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
        tools=[{
            "type": "web_search_20250305",   # basic tool works on every model incl. Haiku 4.5
            "name": "web_search",
            "max_uses": MAX_SEARCHES,
        }],
    )
    elapsed = time.time() - t0
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    u = resp.usage
    usage = {
        "input_tokens": u.input_tokens,
        "output_tokens": u.output_tokens,
        "searches": (u.server_tool_use.web_search_requests if getattr(u, "server_tool_use", None) else 0),
    }
    return text, usage, elapsed


def run_openai(model: str, system: str, user: str) -> tuple[str, dict, float]:
    # Responses API with the hosted web_search tool. Verify tool name and
    # usage field names against current OpenAI docs before relying on cost.
    from openai import OpenAI

    client = OpenAI(timeout=TIMEOUT_SECONDS)
    t0 = time.time()
    resp = client.responses.create(
        model=model,
        instructions=system,
        input=user,
        tools=[{"type": "web_search"}],
        max_output_tokens=MAX_OUTPUT_TOKENS,
    )
    elapsed = time.time() - t0
    text = resp.output_text
    searches = sum(1 for item in resp.output if getattr(item, "type", "") == "web_search_call")
    usage = {
        "input_tokens": resp.usage.input_tokens,
        "output_tokens": resp.usage.output_tokens,
        "searches": searches,
    }
    return text, usage, elapsed


def run_perplexity(model: str, system: str, user: str) -> tuple[str, dict, float]:
    # Perplexity is OpenAI-compatible and searches on every call by design.
    from openai import OpenAI

    client = OpenAI(api_key=os.environ["PERPLEXITY_API_KEY"], base_url="https://api.perplexity.ai", timeout=TIMEOUT_SECONDS)
    t0 = time.time()
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=MAX_OUTPUT_TOKENS,
    )
    elapsed = time.time() - t0
    text = resp.choices[0].message.content or ""
    usage = {
        "input_tokens": resp.usage.prompt_tokens,
        "output_tokens": resp.usage.completion_tokens,
        "searches": 1,  # billed per request, not per search
    }
    return text, usage, elapsed


RUNNERS = {"anthropic": run_anthropic, "openai": run_openai, "perplexity": run_perplexity}


# ----------------------------------------------------------------------------
# Scoring
# ----------------------------------------------------------------------------
@dataclass
class Score:
    found: list[str] = field(default_factory=list)
    missed: list[str] = field(default_factory=list)
    made_up: list[str] = field(default_factory=list)
    json_ok: bool = False
    verified_share: float = 0.0
    best_call_hit: bool = False


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def extract_json(text: str) -> dict | None:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
    return None


def score_run(text: str, p: dict) -> Score:
    s = Score()
    data = extract_json(text)
    s.json_ok = data is not None
    haystack = _norm(text)

    for fact, proofs in p["answer_key"].items():
        if any(_norm(proof) in haystack for proof in proofs):
            s.found.append(fact)
        else:
            s.missed.append(fact)

    for phrase in p.get("must_not_claim", []):
        # Only a problem if the model asserts it as VERIFIED with a value.
        if data:
            for f in data.get("findings", []):
                blob = _norm(json.dumps(f))
                if _norm(phrase) in blob and f.get("status") == "VERIFIED" and f.get("value"):
                    s.made_up.append(phrase)
                    break

    if data:
        findings = data.get("findings", [])
        if findings:
            s.verified_share = sum(1 for f in findings if f.get("status") == "VERIFIED") / len(findings)
        who = _norm(json.dumps(data.get("best_next_call", {})))
        agent = p["answer_key"].get("prior_agent_name") or p["answer_key"].get("listing_agent_name") or []
        s.best_call_hit = any(_norm(a) in who for a in agent)
    return s


def cost_usd(m: dict, usage: dict) -> float:
    return (usage["input_tokens"] / 1e6) * m["in"] + (usage["output_tokens"] / 1e6) * m["out"] + usage["searches"] * m["search"]


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("properties", help="properties.json")
    ap.add_argument("--out", default="results")
    ap.add_argument("--only", help="comma-separated model ids to run")
    ap.add_argument("--repeat", type=int, default=1, help="runs per model per property (use 2-3; search is noisy)")
    args = ap.parse_args()

    props = json.loads(Path(args.properties).read_text())
    out = Path(args.out)
    (out / "raw").mkdir(parents=True, exist_ok=True)
    models = [m for m in MODELS if not args.only or m["model"] in args.only.split(",")]

    rows = []
    for p in props:
        user = build_user_prompt(p)
        for m in models:
            for r in range(args.repeat):
                tag = f"{p['id']}__{m['model']}__{r}"
                print(f"running {tag} ...", flush=True)
                try:
                    text, usage, elapsed = RUNNERS[m["provider"]](m["model"], SYSTEM_PROMPT, user)
                except Exception as e:  # noqa: BLE001
                    print(f"  FAILED: {e}")
                    rows.append({"property": p["id"], "model": m["model"], "run": r, "error": str(e)[:200]})
                    continue
                (out / "raw" / f"{tag}.txt").write_text(text)
                sc = score_run(text, p)
                total = len(p["answer_key"])
                rows.append({
                    "property": p["id"],
                    "model": m["model"],
                    "run": r,
                    "found": len(sc.found),
                    "of": total,
                    "recall": round(len(sc.found) / total, 2) if total else 0,
                    "made_up": len(sc.made_up),
                    "best_call_hit": sc.best_call_hit,
                    "json_ok": sc.json_ok,
                    "verified_share": round(sc.verified_share, 2),
                    "searches": usage["searches"],
                    "in_tok": usage["input_tokens"],
                    "out_tok": usage["output_tokens"],
                    "cost_usd": round(cost_usd(m, usage), 4),
                    "seconds": round(elapsed, 1),
                    "missed": ";".join(sc.missed),
                    "error": "",
                })
                print(f"  found {len(sc.found)}/{total}  made_up={len(sc.made_up)}  ${cost_usd(m, usage):.3f}  {elapsed:.0f}s")

    keys = ["property", "model", "run", "found", "of", "recall", "made_up", "best_call_hit", "json_ok",
            "verified_share", "searches", "in_tok", "out_tok", "cost_usd", "seconds", "missed", "error"]
    with (out / "results.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in keys})

    # Summary per model
    lines = ["# Bake-off summary", "", "| model | avg recall | made-up facts | best-call hit rate | avg cost | avg seconds | failures |", "|---|---|---|---|---|---|---|"]
    for m in models:
        mr = [r for r in rows if r["model"] == m["model"] and not r.get("error")]
        fails = sum(1 for r in rows if r["model"] == m["model"] and r.get("error"))
        if not mr:
            lines.append(f"| {m['model']} | – | – | – | – | – | {fails} |")
            continue
        n = len(mr)
        lines.append(
            f"| {m['model']} | {sum(r['recall'] for r in mr)/n:.2f} | {sum(r['made_up'] for r in mr)} "
            f"| {sum(1 for r in mr if r['best_call_hit'])/n:.0%} | ${sum(r['cost_usd'] for r in mr)/n:.3f} "
            f"| {sum(r['seconds'] for r in mr)/n:.0f} | {fails} |"
        )
    lines += ["", "Recall = share of answer-key facts the model surfaced. Made-up = facts it marked VERIFIED that the key says it could not have found. Best-call = it named the right person to call first.",
              "", "Raw outputs are in raw/. Read the misses before trusting the numbers; string matching is strict."]
    (out / "summary.md").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("set ANTHROPIC_API_KEY")
    main()
