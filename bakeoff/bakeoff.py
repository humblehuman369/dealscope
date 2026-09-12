"""
Property research model bake-off.

Runs the SAME research prompt production uses (backend
``action_plan/research.py``) across models, on properties where a human already
found the answer. Scores facts found, facts made up, cost, and time.

OpenAI uses the production Responses request shape minus ``background`` —
this script waits. Anthropic gets the same system prompt and find-lists.

Usage (from this directory, with the backend venv so imports resolve):

    export OPENAI_API_KEY=...
    export ANTHROPIC_API_KEY=...     # only if you run Anthropic rows
    ../backend/.venv/bin/python bakeoff.py properties.json --out results/

    # Smoke test on River Hammock with terra:
    ../backend/.venv/bin/python bakeoff.py properties.json --only gpt-5.6-terra --out results/

Each property in properties.json looks like:
    {
      "id": "river-hammock",
      "address": "2406 River Hammock Ln, Fort Pierce, FL 34981",
      "county": "St. Lucie",
      "state": "FL",
      "parcel": "not known",
      "known": { ... listing fields DealGapIQ already shows ... },
      "case": "pre_foreclosure",
      "answer_key": { "prior_agent_name": ["Maysoon Mohd"], ... },
      "must_not_claim": ["auction date", "sold at auction", "judgment entered"]
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

BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models.action_plan import ActionPlanCase
from app.services.action_plan.research import (
    SYSTEM_PROMPT,
    build_openai_request,
    build_property_prompt,
    count_web_searches,
    extract_output_text,
)

# Old harness case names → production ActionPlanCase.
CASE_ALIASES = {
    "pre_foreclosure_offmarket_absentee": ActionPlanCase.PRE_FORECLOSURE,
    "offmarket_absentee": ActionPlanCase.OFF_MARKET_ABSENTEE,
    "onmarket_stale": ActionPlanCase.ON_MARKET_STALE,
    "bank_owned": ActionPlanCase.BANK_OWNED,
}

# Prices checked Sept 12 2026 against the research doc / Anthropic pricing page.
# search is $10 / 1,000 web-search calls = $0.01. Page content tokens land in in_tok.
MODELS = [
    {"provider": "openai", "model": "gpt-5.6-terra", "in": 2.00, "out": 12.00, "search": 0.01},
    {"provider": "openai", "model": "gpt-5.6-luna", "in": 0.20, "out": 1.20, "search": 0.01},
    {"provider": "anthropic", "model": "claude-haiku-4-5-20251001", "in": 1.00, "out": 5.00, "search": 0.01},
    # Optional extras — not in the research-doc default run.
    # {"provider": "anthropic", "model": "claude-sonnet-5", "in": 2.00, "out": 10.00, "search": 0.01},
    # {"provider": "anthropic", "model": "claude-opus-5", "in": 5.00, "out": 25.00, "search": 0.01},
    # {"provider": "perplexity", "model": "sonar-pro", "in": 3.00, "out": 15.00, "search": 0.005},
]

MAX_SEARCHES = 12
MAX_OUTPUT_TOKENS = 4000
TIMEOUT_SECONDS = 240

ANTHROPIC_JSON_TAIL = """
Respond ONLY with JSON in this exact shape, no prose before or after:
{
  "findings": [
    {"field": "<snake_case_name>", "value": "<the fact>", "status": "VERIFIED" | "UNVERIFIED", "source_url": "<url or null>", "note": "<one line>"}
  ],
  "not_found": ["<field>", ...],
  "conflicts": [
    {"field": "<name>", "what_disagrees": "<both sides>", "which_i_trust": "<source>", "why": "<one line>"}
  ],
  "best_first_call": {"who": "<name>", "role": "<role>", "phone": "<business phone or null>", "why": "<one line>"}
}
"""


def resolve_case(raw: str) -> ActionPlanCase:
    if raw in CASE_ALIASES:
        return CASE_ALIASES[raw]
    return ActionPlanCase(raw)


def payload_from_property(p: dict) -> dict:
    known = dict(p.get("known") or {})
    names = known.get("owner_names")
    if isinstance(names, str):
        known["owner_names"] = [n.strip() for n in names.split(",") if n.strip()]
    return {
        "address": {
            "full_address": p["address"],
            "county": p.get("county"),
            "state": p.get("state") or known.get("owner_state"),
        },
        "details": {"parcel_id": p.get("parcel")},
        "listing": known,
    }


def build_user_prompt(p: dict) -> str:
    case = resolve_case(p["case"])
    return build_property_prompt(
        payload_from_property(p),
        case,
        address=p["address"],
        county=p.get("county"),
        state=p.get("state"),
        parcel=p.get("parcel"),
    )


def system_for(provider: str) -> str:
    if provider == "openai":
        return SYSTEM_PROMPT
    return SYSTEM_PROMPT + ANTHROPIC_JSON_TAIL


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
            "type": "web_search_20250305",
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
    """Same body as production ``build_openai_request``, without background mode."""
    import httpx

    api_key = os.environ.get("OPENAI_API_KEY") or ""
    if not api_key.strip():
        raise RuntimeError("OPENAI_API_KEY is not set")
    body = build_openai_request(
        system,
        user,
        model=model,
        background=False,
        max_tool_calls=MAX_SEARCHES,
    )
    t0 = time.time()
    with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
        response = client.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=body,
        )
        response.raise_for_status()
        payload = response.json()
    elapsed = time.time() - t0
    if not isinstance(payload, dict):
        raise RuntimeError("OpenAI response was not an object")
    text = extract_output_text(payload)
    usage_raw = payload.get("usage") if isinstance(payload.get("usage"), dict) else {}
    usage = {
        "input_tokens": int(usage_raw.get("input_tokens") or 0),
        "output_tokens": int(usage_raw.get("output_tokens") or 0),
        "searches": count_web_searches(payload.get("output")),
    }
    return text, usage, elapsed


def run_perplexity(model: str, system: str, user: str) -> tuple[str, dict, float]:
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
        "searches": 1,
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


def _best_call_blob(data: dict) -> str:
    blob = data.get("best_first_call") or data.get("best_next_call") or {}
    return _norm(json.dumps(blob))


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
        who = _best_call_blob(data)
        agent = p["answer_key"].get("prior_agent_name") or p["answer_key"].get("listing_agent_name") or []
        s.best_call_hit = any(_norm(a) in who for a in agent)
    return s


def cost_usd(m: dict, usage: dict) -> float:
    return (usage["input_tokens"] / 1e6) * m["in"] + (usage["output_tokens"] / 1e6) * m["out"] + usage["searches"] * m["search"]


def _require_keys(models: list[dict]) -> None:
    providers = {m["provider"] for m in models}
    missing: list[str] = []
    if "anthropic" in providers and not os.environ.get("ANTHROPIC_API_KEY"):
        missing.append("ANTHROPIC_API_KEY")
    if "openai" in providers and not os.environ.get("OPENAI_API_KEY"):
        missing.append("OPENAI_API_KEY")
    if "perplexity" in providers and not os.environ.get("PERPLEXITY_API_KEY"):
        missing.append("PERPLEXITY_API_KEY")
    if missing:
        sys.exit("set " + " and ".join(missing))


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
    if not models:
        sys.exit("no models selected")
    _require_keys(models)

    rows = []
    for p in props:
        user = build_user_prompt(p)
        for m in models:
            for r in range(args.repeat):
                tag = f"{p['id']}__{m['model']}__{r}"
                print(f"running {tag} ...", flush=True)
                try:
                    text, usage, elapsed = RUNNERS[m["provider"]](m["model"], system_for(m["provider"]), user)
                except Exception as e:
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

    lines = ["# Bake-off summary", "", "| model | avg recall | made-up facts | best-call hit rate | avg cost | avg seconds | failures |", "|---|---|---|---|---|---|---|"]
    for m in models:
        mr = [r for r in rows if r["model"] == m["model"] and not r.get("error")]
        fails = sum(1 for r in rows if r["model"] == m["model"] and r.get("error"))
        if not mr:
            lines.append(f"| {m['model']} | - | - | - | - | - | {fails} |")
            continue
        n = len(mr)
        lines.append(
            f"| {m['model']} | {sum(r['recall'] for r in mr)/n:.2f} | {sum(r['made_up'] for r in mr)} "
            f"| {sum(1 for r in mr if r['best_call_hit'])/n:.0%} | ${sum(r['cost_usd'] for r in mr)/n:.3f} "
            f"| {sum(r['seconds'] for r in mr)/n:.0f} | {fails} |"
        )
    lines += ["", "Recall = share of answer-key facts the model surfaced. Made-up = facts it marked VERIFIED that the key says it could not have found. Best-call = it named the right person to call first.",
              "", "Raw outputs are in raw/. Read the misses before trusting the numbers; string matching is strict.",
              "", "Read the made-up column first. Then recall. Then cost. Page-content tokens are in in_tok."]
    (out / "summary.md").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
