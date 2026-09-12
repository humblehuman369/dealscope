# Bake-off summary

| model | avg recall | made-up facts | best-call hit rate | avg cost | avg seconds | failures |
|---|---|---|---|---|---|---|
| gpt-5.6-terra | 0.86 | 0 | 100% | $0.358 | 62 | 0 |

Recall = share of answer-key facts the model surfaced. Made-up = facts it marked VERIFIED that the key says it could not have found. Best-call = it named the right person to call first.

Raw outputs are in raw/. Read the misses before trusting the numbers; string matching is strict.

Read the made-up column first. Then recall. Then cost. Page-content tokens are in in_tok.