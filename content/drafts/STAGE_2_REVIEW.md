# Stage 2 — Review Pack

Three publish-ready drafts for first-batch SEO content. Review the words, then approve / edit / drop. On approval, Stage 3 (social adaptations + visual briefs) follows immediately; Stage 4 (Next.js routes + RSS + Blotato wiring) ships the content live.

---

## Drafts in this batch

| ID | File | Type | Intent | Primary keyword | Words |
|---|---|---|---|---|---:|
| **G1** | [glossary/subject-to-financing.md](glossary/subject-to-financing.md) | Glossary | TOFU | subject to financing | ~1,500 |
| **F3** | [blog/lake-worth-teardown-four-offer-structures.md](blog/lake-worth-teardown-four-offer-structures.md) | Founder POV | Wedge / authority | how to make offer below asking | ~2,000 |
| **B4** | [blog/subject-to-pitch-script-template.md](blog/subject-to-pitch-script-template.md) | BOFU script | Conversion | subject to pitch script | ~1,800 |

---

## Brand voice checklist (applied to all 3)

- ✅ Hunt / close / structure verbs (no "evaluate," "consider," "explore")
- ✅ Dollar-numbered specificity (no "flexible structure" — actual figures)
- ✅ Investor is hero, DealGapIQ is partner ("DealGapIQ generates," "the verdict surfaces" — never "let us help you discover")
- ✅ One of the three motifs in each piece (G1: "every property has more leverage than the asking price suggests"; F3: "Stop scrolling…" + "That's where most tools stop. DealGapIQ keeps going" + "The price tag isn't the deal. The structure is"; B4: "The price tag isn't the deal. The structure is")
- ✅ "We analyze. You decide." disclosure footer on every piece
- ✅ Zero financial / legal / investment advice framing
- ✅ Zero wraparound or land-contract content (per legal hold)
- ✅ Zero magic-wand "every property is a deal" claims

## SEO meta (per piece)

### G1 — Subject-To Financing
- **URL:** `/glossary/subject-to-financing`
- **Title tag:** "What Is Subject-To Financing? A Plain-English Guide (2026)"
- **Meta description:** "Subject-To lets you take title to a house while the seller's existing loan stays in place. The 30-second definition, a real-numbers example, the risks, and when it actually pencils."
- **Schema:** `DefinedTerm`
- **Heading structure:** H1 + 8 H2s (definition / example / why seller agrees / risks / fit / pitch / how-DealGapIQ-models / FAQ)
- **FAQ block:** 5 Q&As targeting "People Also Ask" SERP feature

### F3 — Lake Worth Teardown
- **URL:** `/blog/lake-worth-teardown-four-offer-structures`
- **Title tag:** "The Lake Worth Teardown: 4 Offer Structures on One Listing"
- **Meta description:** "I ran a $457K Lake Worth listing through DealGapIQ. The math said no at standard terms. Here are the four offer structures that turn a -6.4% Deal Gap into a deal that closes."
- **Schema:** `BlogPosting` + `author: Brad Geisen`
- **Heading structure:** H1 + 8 H2s (verdict / 4 paths / which closes / pitch / what this is / run yours)

### B4 — Subject-To Pitch Script
- **URL:** `/blog/subject-to-pitch-script-template`
- **Title tag:** "Subject-To Pitch Script: 5-Part Template (Free, Editable)"
- **Meta description:** "The 5-part Subject-To pitch script that lands. Annotated template, three seller-type variants, and the three lines that kill the deal. Free. Edit, print, or email."
- **Schema:** `BlogPosting` + `HowTo` mixin (5 steps in the script structure)
- **Heading structure:** H1 + 7 H2s (why most fail / 5-part / annotated template / 3 variants / what not to say / when not to use / CTA)

---

## Internal linking matrix

Every piece links to every other piece in this batch. This creates a 3-page topic cluster from day one — Google reads the inbound links as a topical authority signal even before there are dozens of pages.

| From → To | G1 | F3 | B4 |
|---|:---:|:---:|:---:|
| **G1** | — | ✓ (in "How DealGapIQ models" section) | ✓ (in "The pitch in one paragraph" section) |
| **F3** | ✓ (in "Path 4 pitch script" section) | — | ✓ (in "The pitch script" section) |
| **B4** | ✓ (in "When NOT to use" section) | ✓ (in "When NOT to use" section) | — |

Forward-references to glossary terms not yet written (G2 Seller Carryback, G4 Morby Method, G8 Due-on-Sale) are included with anchor text — links go live as those pages publish, but the anchor text is correct from day one.

## Visual asset plan (per piece — for Stage 3 social adaptation)

| Piece | Hero image | Inline assets |
|---|---|---|
| **G1** | Diagram: "How a Subject-To purchase works" — seller's loan box stays in place, title arrow flips from seller to buyer, payment arrow goes from buyer to lender. Brand colors `#0465F2 → #0FA4E9`. |  Real-numbers comparison table screenshot from a DealGapIQ verdict (Conventional vs. Sub2 monthly payment). |
| **F3** | The Lake Worth four-card verdict screenshot Brad already provided. Crop tight per brand doc. | Strategy worksheet screenshot with Path 4 selected; Negotiation Playbook modal screenshot. |
| **B4** | Mock screenshot of the auto-generated pitch script in the Negotiation Playbook UI (real DealGapIQ asset). | Three small icons row: 🖨 ✉ 📋 — "Print · Email · Copy" (matches Section 3 of the homepage plan). |

**Do not use:** stock photos of investors, lifestyle imagery, generic real-estate clip art, "agent shaking hands" anything. Per brand doc: "Investors smell them."

---

## What changes after your approval

1. Drafts move from `content/drafts/` → `content/{blog,glossary}/` (the publish location, picked up by the Next.js MDX route in Stage 4).
2. **Stage 3 starts immediately:** I draft 3 social adaptations per piece (LinkedIn long, Twitter/X thread, YouTube description) = 9 social drafts. Once IG/TikTok/FB are connected in Blotato (per your "2 days" timeline), those platforms get added.
3. **Stage 4 is the build:** Next.js `/blog` and `/glossary/[term]` routes, the `feed.xml` RSS endpoint that Blotato reads, the QC checklist that runs pre-publish on every future piece.

---

## Open questions before approval

1. **Numbers in F3** — the Lake Worth teardown uses the figures from the homepage plan ($457,100 asking, −6.4% Deal Gap, $2,719 seller-carry 2nd, $3,556 verified rent). Are these real-from-DealGapIQ figures or were they illustrative in the marketing plan? If illustrative, I should re-run the verdict on the actual address before publish so the numbers are live, not retro-fitted.
2. **Author byline on F3** — the draft is signed *— Brad Geisen, founder, DealGapIQ.* Per Section 5b of the homepage plan, you had an open question about signing with name + credential. F3 is the test case: shipping it under your name lands harder. Confirm yes / change byline / leave to "DealGapIQ team."
3. **The $646,050 example in B4** — same question. The annotated script uses the homepage plan's pitch example. Real or illustrative? If illustrative, I'll either anonymize ("a recent $646K listing") or replace with the verified Lake Worth Path 4 example to keep one consistent property across F3 and B4.
4. **Glossary index page** — the footer `/glossary` link currently points to a static page. Want me to scope the glossary index (a list of all terms with one-line definitions, internally linking to each term page) as part of Stage 4? Recommended yes — it's the hub page for the whole topic cluster.

Approve, or send edits and I'll revise.
