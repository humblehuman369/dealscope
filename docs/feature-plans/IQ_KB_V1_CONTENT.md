# IQ Knowledge Base — v1 Content

The locked Q&A content set for the "Ask IQ" chip on the Four Paths panel. This is the source content for [ACTIVATION_ARC.md](./ACTIVATION_ARC.md) Phase 3 / ticket C2 (`frontend/src/lib/iq/knowledgeBase.ts`).

> **Status:** ✅ Shipped (2026-05-07). Content is live in [`frontend/src/lib/iq/knowledgeBase.ts`](../../frontend/src/lib/iq/knowledgeBase.ts) and surfaced through the AskIQ chip on the Four Paths panel.

---

## Authoring constraints (do not violate)

Every Q&A in this file was written against these rules. Any edits or additions must hold the same line:

- **5th-grade reading level.** No jargon (banned: amortize, leverage, DSCR, NOI, cap rate, cash-on-cash). Where industry terms are unavoidable (Sub2, due-on-sale, contingency), explain them inline in plain words.
- **4–8 sentences per answer.** Long enough to be useful, short enough to scan in a modal.
- **Source attribution required.** Every answer ends with a single attribution line naming the reference document and section. This is what makes IQ feel curated rather than AI-generated. Do not drop the attribution in implementation.
- **No advisory voice.** Use *"investors do X"* / *"top mentors teach Y"*, not *"you should X"*. Same doctrine as the Four Paths narrative.
- **No predictive claims about seller psychology.** Phrasing is *"this works because…"* / *"sellers often respond by…"*, never *"the seller will accept this."*
- **Honest about risk.** Where a structure has real downsides (Sub2 due-on-sale, seller financing default risk), the answer says so. Trust comes from acknowledged friction, not glossed-over claims.

---

## Source documents

The three reference files synthesized for this content. All three live in the founder's iCloud Drive:

1. **Mastering the Art of the Deal: Advanced Negotiation Frameworks & Scripts** (PDF) — sections referenced as *"Mastering"*
2. **Residential Real Estate Investor Negotiation Framework** (DOCX) — sections referenced as *"Residential Framework"*
3. **real_estate_negotiation_wide_research.csv** — referenced as *"Wide Research"* when applicable

---

## Data shape (for `knowledgeBase.ts`)

Suggested TypeScript shape — implementer can adjust during C1, but the categories and IDs below should remain stable so telemetry events (`iq_question_viewed`) carry consistent identifiers across releases.

```ts
export type IQCategory =
  | 'creative_finance_intro'
  | 'objection_handling'
  | 'reading_the_seller'
  | 'tactics'

export interface IQAnswer {
  id: string                  // stable, e.g. 'sub2-not-shady'
  category: IQCategory
  question: string            // exactly as it appears in the chip list
  answer: string              // 4–8 sentences, may include light markdown
  source: string              // single-line attribution rendered below the answer
}
```

---

## Category 1 — Bringing up creative finance

### Q1 — `sub2-not-shady`

**Question:** How do I bring up Sub2 without sounding shady?

**Answer:** Don't lead with the term *Sub2* — that's industry jargon and it makes sellers nervous. Describe what would happen in plain words: *"I would take over your existing mortgage payments — your loan stays in your name unless we refinance later."* Be upfront about the risks. The bank can technically demand full repayment if they discover the transfer (the due-on-sale clause), and the seller's loan stays on their credit report until paid off. That honesty is what builds trust. End with: *"Because of those risks, I'd want everything in writing and reviewed by a real estate attorney before we move forward."*

**Source:** Residential Framework §5; Mastering §5.5

---

### Q2 — `seller-financing-not-salesy`

**Question:** How do I introduce seller financing without sounding salesy?

**Answer:** Don't pitch it cold. Connect it to something they already said. If they mentioned wanting steady income, retirement, or not needing all the cash up front, say: *"Based on what you said about not being in a rush, here's an idea — what if you acted as the bank on part of this?"* Then walk through real numbers: down payment now, monthly payments at a set rate, you handle taxes and maintenance. Mention that a third-party loan servicing company handles paperwork, so they don't chase payments. End with a soft check-in: *"How does that sit with you?"* — make it feel like a tailored solution, not a sales script.

**Source:** Mastering §3.3

---

### Q3 — `seller-never-heard-of-this`

**Question:** What if the seller has never heard of these structures?

**Answer:** Explain it like you're talking to a friend. Most people have heard of *"the seller carries the loan"* or *"owner financing"* — start there. Use a plain example: *"You'd basically be the bank for part of the price. I'd send you a payment every month, just like you'd get from a CD."* Tell them a third-party loan servicing company handles everything — statements, collection, year-end tax forms. Mention that you'd pay for a real estate attorney to draft the documents. The point is to make the unfamiliar feel safe, not to sound like an expert showing off.

**Source:** Mastering §3.3, §5.4

---

## Category 2 — Handling objections

### Q4 — `offer-too-low`

**Question:** What do I say when the seller says my offer is too low?

**Answer:** Don't argue. Don't defend the number right away. First, mirror back what they said: *"Too low?"* Then ask a question that gets to the real concern: *"Help me understand — is the issue the headline number, or is it the cash you walk away with at closing?"* That distinction matters a lot. If they need a certain amount of cash, you might reach their price by changing the structure — a small carry, a longer close. If it's the headline number itself, you know not to waste time on creative options. Find out what's actually driving the *"no"* before defending the *"yes."*

**Source:** Mastering §5.2; Residential Framework §9

---

### Q5 — `seller-wants-all-cash`

**Question:** What if the seller insists on all cash?

**Answer:** Reframe it as a choice, not an objection. Try: *"I get it — cash is straightforward. Here are two paths I can offer. Option 1 is cash today at $X — fast, certain, fewest contingencies. Option 2 is a higher price spread over time. Which one is closer to what you're trying to do?"* You're not pushing back on their preference; you're showing them the tradeoff between speed and price. Many sellers who say *"I need cash"* really mean *"I don't want complications."* Once they see Option 2 isn't actually complicated, they often consider it.

**Source:** Mastering §3.4 (Two-Company Strategy)

---

### Q6 — `another-offer-coming`

**Question:** What if they say they have another offer coming?

**Answer:** Don't compete on price right away. Try: *"That's good news — it means the market sees value here. What timeline is that buyer working with? Are they paying cash, or financing? Any inspection or appraisal contingencies?"* You're learning whether the other offer is real, and whether it's actually better than yours. Most competing offers in residential aren't apples-to-apples with a clean buyer. If the other side is financing with contingencies and a 60-day close, your faster, cleaner offer may still be the stronger one — even at a lower price.

**Source:** Mastering §4.2 (Aikido method); Residential Framework §8

---

## Category 3 — Reading the seller

### Q7 — `find-real-motivation`

**Question:** How do I figure out the seller's real motivation?

**Answer:** Ask before you talk price. The most useful opener: *"What's prompting the move — and what's your ideal timeline?"* The answer almost always tells you which of four things matters most: a deadline (job, divorce, foreclosure), a cash need (debt, downpayment on their next house), an emotional reason (inherited the property, raised kids there), or post-sale plans (retirement income, 1031 exchange). Structure your offer to solve their top one or two — not all four. Most sellers will tell you their real reason if you simply ask and stay quiet long enough to listen.

**Source:** Mastering §1.1; Residential Framework §1

---

### Q8 — `four-things-before-price`

**Question:** What should I learn about the seller before we talk price?

**Answer:** Top mentors teach four dimensions to diagnose. **Timeline urgency** — are they relocating, in pre-foreclosure, paying two mortgages? **Equity position** — what do they owe, and how much do they need to walk away with? **Emotional attachment** — is this an inherited home, a long-term family property, or just an asset to them? **Post-sale plans** — where are they going, and what do they need closing day to make happen? Once you know the top one or two, you can structure an offer that solves their actual problem instead of just bidding against their list price.

**Source:** Mastering §1.1, §6.2 (Smotherman framework)

---

### Q9 — `price-vs-terms-tradeoff`

**Question:** What's the price-vs-terms tradeoff and how do I bring it up?

**Answer:** It's the single most useful tool in real estate negotiation: price and terms are connected. If a seller wants their full asking price, you can usually get there if the terms support it — smaller down, lower rate, longer payment schedule. If they need all cash on closing day, the price has to drop because you're taking on more risk and bigger financing costs. Bring it up directly: *"I can pay $X if the terms are flexible. If you need all cash, my number has to be closer to $Y. Which matters more — the highest price, or the most cash on closing day?"* That single question often reframes the whole conversation.

**Source:** Residential Framework §4

---

## Category 4 — Tactics that work

### Q10 — `silence-after-offer`

**Question:** Why should I stay silent after I make my offer?

**Answer:** Silence forces the other side to respond first — and their response usually contains useful information. After you state the number, count to seven internally. Don't justify it. Don't soften it. Don't explain how you got there. The seller will fill the silence, and what they say will tell you whether the number is workable, what they're really worried about, or whether they're going to counter. If you rush to defend the offer, you signal uncertainty and give them ammunition to push back. The discipline of the pause is worth more than any clever script.

**Source:** Mastering §4.3 (derived from Chris Voss)

---

### Q11 — `non-round-number`

**Question:** When should I use a non-round number?

**Answer:** Always — when you want to signal that the number was calculated, not pulled from the air. An offer of $437,500 lands differently than $440,000. The round number sounds like guesswork or a starting position; the precise number sounds like math. Sellers sense the difference. Use it especially on price reductions and counter-offers: *"My number is $437,500 — that's based on the comps, the condition, and the closing timeline."* It costs you nothing and adds credibility, because round numbers feel arbitrary while specific ones feel deliberate.

**Source:** Mastering §5.6 (Lesix Agency framework)

---

### Q12 — `recap-email-24hr`

**Question:** What's the 24-hour recap email and why does it matter?

**Answer:** After every meaningful seller conversation, send a written recap within 24 hours. Cover what was discussed, what was agreed verbally, what's still open, and what happens next. Three reasons it matters. **Memory** — verbal agreements get forgotten; written ones don't. **Trust** — a clean recap signals professionalism and makes the seller comfortable continuing. **Momentum** — many deals stall because no one writes down the next step. Keep the recap short (under 200 words), don't oversell, and always include a line about attorney review if any creative finance was discussed.

**Source:** Residential Framework §11; Mastering §6.3

---

## Display order (recommended)

When the modal first opens, present the four categories in this order — it tracks the natural arc of a seller conversation from before the call through after:

1. **Reading the seller** (Q7, Q8, Q9) — pre-call diagnosis
2. **Bringing up creative finance** (Q1, Q2, Q3) — during the call, when introducing structures
3. **Handling objections** (Q4, Q5, Q6) — when the seller pushes back
4. **Tactics that work** (Q10, Q11, Q12) — discipline that runs across the whole conversation

Implementer is free to override this if user testing suggests a different mental model — it's a UX decision, not a content decision.

---

## Future expansion

Out of scope for v1 but worth tracking:

- **Custom (free-text) question** — explicitly retired from v1 per [ACTIVATION_ARC.md §9](./ACTIVATION_ARC.md#9-explicit-non-goals) (no freeform LLM). Revisit only after the curated set has 30+ days of engagement data and a clear signal that users want something not in the 12.
- **Property-context-aware answers** — e.g., when the user is viewing a Sub2 path card, reorder the modal so Sub2-related questions appear first. Implementable in C1 by passing the active path family to the modal as a hint.
- **Additional categories worth considering for v2** — *Walking away* (when to kill the deal), *Working with listing agents* (different dynamics than direct-to-seller), *Distressed seller conversations* (sensitivity and compliance considerations from Residential Framework §8 Scenario I).
