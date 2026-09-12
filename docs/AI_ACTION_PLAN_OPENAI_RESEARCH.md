# AI Action Plan — Research Step on OpenAI

Written September 12, 2026. This replaces Phases 1 and 2 of AI_ACTION_PLAN_DEV_PLAN.md. Everything else in that plan stands. Prices and request shapes below were checked against developers.openai.com on this date.

## The decision

The research step (find the missing facts about a property) runs on the OpenAI API with its built-in web search tool. The rest of the feature stays on Claude: sorting the property into a case, the no-AI template plans, writing the final plan, and pushing tasks and contacts into the deal.

Why OpenAI for this one step. In the hand test on River Hammock, ChatGPT found nine of ten answer-key facts, made nothing up, caught the conflict between Zillow and the MLS history, and refused to invent a case number when the page hid it. Claude Sonnet found five. Grok found eight but trusted two junk pages. Same prompt, same property. The API is the same models as ChatGPT, so this is the closest thing to what we saw.

Why not lock it in forever. One property is one property. The harness still runs. If Claude or Grok wins on twenty properties with the recipe prompt, the provider is a setting and we switch.

## What OpenAI gives us that changes the build

Three things, and the first one removes a whole phase of work.

**Background mode.** A Responses API call can be started with `background: true`. OpenAI runs the search loop on its side for as long as it takes, and we poll the response ID until it is done. That means the Railway worker in Phase 1 is no longer needed to ship this feature. The backend creates the background response, stores the response ID on the action plan row, and a cheap polling endpoint checks status. Phase 1 becomes half a day of work instead of a week. We can still add the worker later for other jobs.

**Domain filters.** The web search tool takes `filters.allowed_domains` (up to 100) or `filters.blocked_domains`. We use blocked domains, not allowed. Allowed would have hidden Trellis and Koolik, the two pages that broke River Hammock open, because nobody would have thought to list them. Blocked keeps out the pages that fooled Grok: people-search sites, business directories, and social media. That also enforces the no-personal-phone rule at the tool level, not just in the prompt.

**Structured output.** The Responses API accepts a JSON schema and the model must return exactly that shape. No more parsing prose. Every finding comes back with a field name, value, status, source URL, and note, or the request fails.

## Models and cost

Current lineup on the price page, per million tokens, standard tier:

gpt-5.6-luna at $0.20 in and $1.20 out. gpt-5.6-terra at $2 in and $12 out. gpt-5.6-sol at $4 in and $20 out on promo through at least November 21. gpt-6-astra at $10 in and $50 out.

Web search is $10 per thousand calls, plus the page content it pulls in is billed as input tokens at the model's rate.

A plan with ten searches pulls in roughly 40,000 tokens of page content and writes about 3,000 tokens of JSON. That works out to about 10 cents in search calls plus 12 cents in tokens on terra, so roughly 22 cents a plan. On luna it is about 11 cents, almost all of it the search calls. On sol about 35 cents.

Start the harness on terra and luna. Terra is the bet. Luna is the surprise candidate: if it finds the same facts and makes nothing up, it cuts the token cost by 90 percent, and the search calls cost the same either way. Sol is the fallback if terra makes things up. Astra is not worth testing for this; it is five times the price for a job that is about reading listing pages carefully, not deep reasoning.

Cache the research by parcel for 30 days. Two users on the same house cost one plan.

## The request

This is the shape the backend sends. Field names match the current docs.

```json
{
  "model": "gpt-5.6-terra",
  "background": true,
  "store": true,
  "reasoning": {"effort": "medium"},
  "instructions": "<SYSTEM PROMPT below>",
  "input": "<PROPERTY PROMPT below>",
  "tools": [{
    "type": "web_search",
    "search_context_size": "high",
    "filters": {
      "blocked_domains": [
        "spokeo.com", "whitepages.com", "truepeoplesearch.com", "fastpeoplesearch.com",
        "beenverified.com", "peoplefinders.com", "radaris.com", "intelius.com",
        "smallbusinessdb.com", "bizapedia.com", "facebook.com", "instagram.com",
        "linkedin.com", "x.com", "twitter.com", "tiktok.com", "reddit.com"
      ]
    }
  }],
  "max_tool_calls": 12,
  "text": {
    "format": {
      "type": "json_schema",
      "name": "property_research",
      "strict": true,
      "schema": { "...see schema below..." }
    }
  }
}
```

Then poll `GET /v1/responses/{id}` every five seconds until `status` is `completed`, `failed`, or `incomplete`. Read `output_text` for the JSON, and count items in `output` with `type: "web_search_call"` to record how many searches were billed. Keep `usage.input_tokens` and `usage.output_tokens` on the plan row for the cost column.

Set a hard stop of four minutes. If the response is still running, cancel it and ship the template plan.

## The schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["findings", "not_found", "best_first_call", "conflicts"],
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["field", "value", "status", "source_url", "note"],
        "properties": {
          "field": {"type": "string"},
          "value": {"type": "string"},
          "status": {"type": "string", "enum": ["VERIFIED", "UNVERIFIED"]},
          "source_url": {"type": ["string", "null"]},
          "note": {"type": "string"}
        }
      }
    },
    "not_found": {"type": "array", "items": {"type": "string"}},
    "conflicts": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["field", "what_disagrees", "which_i_trust", "why"],
        "properties": {
          "field": {"type": "string"},
          "what_disagrees": {"type": "string"},
          "which_i_trust": {"type": "string"},
          "why": {"type": "string"}
        }
      }
    },
    "best_first_call": {
      "type": "object",
      "additionalProperties": false,
      "required": ["who", "role", "phone", "why"],
      "properties": {
        "who": {"type": "string"},
        "role": {"type": "string"},
        "phone": {"type": ["string", "null"]},
        "why": {"type": "string"}
      }
    }
  }
}
```

The `conflicts` block is new. It exists because the best thing ChatGPT did on River Hammock was notice that Zillow said "removed 2024" while the MLS history said "expired June 2026," and explain which one it believed. We want that written down every time, so the plan can say "Zillow is stale on this one" to the investor.

## The system prompt

```
You are a research assistant for a real estate investor. You are given a property and the facts a data platform already has. Find the public facts that are MISSING so the investor knows who to call next.

How to search. Do not rely on one site. Listing history is scattered and Zillow hides old listings. Check the full MLS history on Compass, Movoto, Xome, Koolik, Trulia, and Redfin, and read the whole history table, not just the last row. A property can be listed, removed, relisted, and expire again under a different agent. The most recent agent is the one that matters most, but report every agent you find with the dates. For foreclosure filings, search the owner names plus the county plus "foreclosure" on trellis.law and unicourt.com, and search the county clerk's site. For agent and brokerage phones, use Realtor.com, Zillow agent pages, or the brokerage's own site. Do not use business directories.

Rules.
1. Every fact must come from a page you opened. Give the URL.
2. Mark a fact VERIFIED only if a page states it. Mark it UNVERIFIED if you believe it but could not open a page that says it.
3. If you cannot find something, put it in not_found. Do not guess. A wrong fact is worse than a missing one. Never invent a case number, a filing date, an auction date, a judgment, or a sale result.
4. Do not search for or report personal phone numbers, personal emails, home addresses other than the ones given, or social media of private individuals. Business numbers for agents, brokerages, lenders, law firms, and county offices are fine.
5. When two sources disagree, report both in conflicts and say which one you trust and why.
6. best_first_call is the one business contact most likely to know the current situation. Prefer the most recent listing agent. If there is none, prefer the county clerk.
```

## The property prompt

Built by the backend from the property payload and the case. One example, the pre-foreclosure off-market absentee case:

```
Property: {address}
County: {county}, {state}
Parcel: {parcel or "not known"}
Status: Off market. Pre-foreclosure flag is set. Owner mailing address differs from the property.
Owners of record: {owner_names}
Owner mailing address: {owner_mailing_address}
Last known listing data: {listing_agent_name, brokerage, list_price, days_on_market if any, else "none"}

Find, in this order:
1. Every agent who has listed this property, with brokerage and business phone, newest first. Flag which one is most recent.
2. The status, price, and dates of each listing cycle: Active, On Hold, Temp Off Market, Withdrawn, Expired, Cancelled, Sold.
3. The foreclosure case: plaintiff (lender or trust), filing date, case number, the law firm that filed it and its business phone, and the original lender and recording info from the complaint if the page shows it.
4. Any scheduled auction date on the county clerk's site or the county's auction site.
5. The county clerk's records phone number and records request email, from the clerk's own site.
```

The other cases (on-market stale, off-market absentee, bank-owned, FSBO) each get their own numbered list from CASE_TARGETS in the harness. Same system prompt for all.

## What the backend does with it

`action_plan/research.py` gets a `provider` setting with values `openai`, `anthropic`, `xai`. Only `openai` is built now. The function takes the property payload and case, sends the request above, returns the response ID. A second function takes a response ID, polls once, and returns either "still running" or the parsed JSON plus usage.

The action plan row stores `provider`, `provider_response_id`, `searches`, `input_tokens`, `output_tokens`, and `cost_cents`. The `/admin` page gets a line showing plans this month and total spend.

Findings are written to the plan as-is. When the user taps Apply, each finding with a phone becomes a contact with `source=ai`, the role from the field name, and the source URL and status in the notes. Each conflict becomes a note on the plan summary. Nothing marked UNVERIFIED becomes a task by itself; it becomes a "confirm this" task.

## Harness changes

The `run_openai` function in bakeoff.py gets the same request shape, minus background mode, since the script can wait. Add rows for gpt-5.6-terra and gpt-5.6-luna with the prices above. Set `search` to 0.01 and note that page content tokens land in `in_tok`, so the cost column is real.

Run twenty properties, two repeats, on terra, luna, and haiku-4-5 with the recipe prompt. Read the made-up column first. Then the recall column. Then cost.

## Order

Day 1. New OpenAI key in Railway env as OPENAI_API_KEY, spend limit set at $50 a month in the OpenAI dashboard so a bug cannot run away. Update bakeoff.py and run the smoke test on River Hammock with terra.

Days 2 to 4. Build the twenty-property answer key. Run the full harness. Pick the model.

Week 2. Build research.py against OpenAI with background mode and polling. Wire the create and poll endpoints. Phase 0 template plans should already be done by now so the UI has something to show while research runs.

Week 3. Phase 4 plan writer on Claude, Apply, metering. Ship behind a Pro gate.

The Railway worker moves to the backlog.
